// Extraction orchestrator. Restaurant-independent.
//
// Input: a Step 1 discovery report and a Fetcher (live, replay, or with a
// browser). For every source discovery proposed, including stale sources it
// marked for verification, it fetches the source once and runs every
// extractor that recognises the content:
//
//   PDF                    → pdf-table
//   CSV                    → csv-table
//   JSON                   → json-menu (and HTML inside WordPress "content")
//   HTML                   → embedded JSON (json-menu) + html tables / rows
//   browser (client page)  → the rendered HTML as above, plus JSON responses
//                            the page loaded from approved hosts
//
// Sources discovery could not use (login or subscription key required,
// third-party) are listed as skipped with the reason. Nothing is worked
// around and nothing outside the discovered official hosts is requested.
import { CORE_NUTRIENTS, type NutrientKey, type SourceDescriptor } from "../pipeline/contracts";
import { sha256 } from "../discovery/fetchers";
import { analyzeHtml, toIsoDate } from "../discovery/analyze";
import type { DataNeed, DiscoveryReport, FetchResult, Fetcher, ProposedSource } from "../discovery/contracts";
import {
  EXTRACTION_VERSION,
  type ExtractedRecord,
  type ExtractionMethod,
  type ExtractionReport,
  type Freshness,
  type NeedCoverage,
  type Provenance,
  type RecordKind,
  type SourceExtraction,
  type SourceStatus,
} from "./contracts";
import { extractCsv, extractPdfTables, readPdf } from "./extractors/document";
import { extractHtmlNutrition } from "./extractors/html";
import { embeddedPayloads, extractJsonMenu } from "./extractors/json-menu";

export type ExtractOptions = {
  runAt?: string;
  discoveryFile?: string;
  // Extra official URLs to read, e.g. a page a person found by hand. They
  // must be on a host discovery already treats as official.
  extraSources?: Array<{ url: string; note?: string }>;
};

const KINDS: RecordKind[] = ["menu_item", "variant", "option_group", "option", "portion", "nutrition_row", "ingredient_declaration"];
const DAY = 86_400_000;

function freshnessOf(source: Pick<SourceDescriptor, "sourceUpdatedAt">, runAt: string, days: number): { freshness: Freshness; ageDays?: number } {
  if (!source.sourceUpdatedAt) return { freshness: "unknown_date" };
  const updated = Date.parse(source.sourceUpdatedAt);
  if (Number.isNaN(updated)) return { freshness: "unknown_date" };
  const ageDays = Math.floor((Date.parse(runAt) - updated) / DAY);
  return { freshness: ageDays > days ? "needs_verification" : "current", ageDays };
}

const contentType = (result: FetchResult) => String(result.headers["content-type"] ?? "").toLowerCase();
const looksJson = (result: FetchResult) => contentType(result).includes("json") || /^\s*[[{]/.test(result.body.subarray(0, 64).toString("utf8"));
const looksPdf = (result: FetchResult) => contentType(result).includes("pdf") || result.body.subarray(0, 5).toString("latin1") === "%PDF-";
const looksCsv = (result: FetchResult) => contentType(result).includes("csv") || /\.csv(?:$|\?)/i.test(result.url);
const looksSpreadsheet = (result: FetchResult) => /spreadsheet|excel/.test(contentType(result)) || /\.xlsx?(?:$|\?)/i.test(result.url);

function statusFor(result: FetchResult): { status: SourceStatus; detail?: string } | undefined {
  if (result.status === 0) {
    if (result.failure === "not_captured") return { status: "not_captured", detail: result.failureDetail };
    return { status: "network_blocked", detail: `${result.failure ?? "no response"}${result.failureDetail ? `: ${result.failureDetail}` : ""}` };
  }
  if (result.status === 401 || result.status === 403) return { status: "auth_required", detail: `HTTP ${result.status}. Not worked around.` };
  if (result.status >= 400) return { status: "http_error", detail: `HTTP ${result.status}` };
  return undefined;
}

// Runs every extractor that recognises one response.
async function extractResponse(result: FetchResult, base: Omit<Provenance, "locator" | "url" | "retrievedAt" | "sha256" | "method">, method: ExtractionMethod): Promise<{ records: ExtractedRecord[]; extractors: string[]; warnings: string[] }> {
  const provenance = { ...base, url: result.finalUrl || result.url, retrievedAt: result.retrievedAt, sha256: sha256(result.body), method };
  const warnings: string[] = [];
  if (looksPdf(result)) {
    const records = extractPdfTables(await readPdf(result.body), { ...provenance, method: "official_document" });
    return { records, extractors: records.length ? ["pdf-table"] : [], warnings };
  }
  if (looksCsv(result)) {
    const records = extractCsv(result.body.toString("utf8"), { ...provenance, method: "official_document" });
    return { records, extractors: records.length ? ["csv-table"] : [], warnings };
  }
  if (looksJson(result)) {
    let json: unknown;
    try {
      json = JSON.parse(result.body.toString("utf8"));
    } catch {
      return { records: [], extractors: [], warnings: ["Response says JSON but does not parse."] };
    }
    const records = extractJsonMenu(json as never, provenance);
    const extractors = records.length ? ["json-menu"] : [];
    // WordPress pages carry their HTML in content.rendered.
    const rendered = (json as { content?: { rendered?: unknown } })?.content?.rendered;
    if (typeof rendered === "string") {
      const html = extractHtmlNutrition(rendered, provenance);
      records.push(...html.records);
      extractors.push(...html.extractors.map((name) => `wordpress:${name}`));
    }
    return { records, extractors, warnings };
  }
  const html = result.body.toString("utf8");
  const records: ExtractedRecord[] = [];
  const extractors: string[] = [];
  embeddedPayloads(html).forEach((payload, index) => {
    const found = extractJsonMenu(payload.json as never, { ...provenance, sourceId: `${base.sourceId}~${payload.kind}${index ? index : ""}`, method: "embedded_json" });
    if (found.length) {
      records.push(...found);
      extractors.push(`embedded:${payload.kind}`);
    }
  });
  const tables = extractHtmlNutrition(html, provenance);
  records.push(...tables.records);
  extractors.push(...tables.extractors);
  return { records, extractors, warnings };
}

function methodFor(proposed: Pick<ProposedSource, "kind">): ExtractionMethod {
  switch (proposed.kind) {
    case "ordering_structured_data":
      return "embedded_json";
    case "public_api":
      return "api_json";
    case "official_document":
      return "official_document";
    default:
      return "official_html";
  }
}

function summarize(records: ExtractedRecord[]) {
  const counts = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as Record<RecordKind, number>;
  const nutrientCounts: Partial<Record<NutrientKey, number>> = {};
  for (const record of records) {
    counts[record.kind] += 1;
    for (const nutrient of Object.keys(record.nutrition?.values ?? {}) as NutrientKey[]) nutrientCounts[nutrient] = (nutrientCounts[nutrient] ?? 0) + 1;
  }
  return { counts, nutrientCounts };
}

async function extractSource(
  fetcher: Fetcher,
  initial: SourceDescriptor,
  method: ExtractionMethod,
  context: {
    runAt: string;
    freshnessDays: number;
    verificationRequired: boolean;
    browser: boolean;
    seenResponses: Set<string>;
    isOfficialBrowserJson: (url: string) => boolean;
  },
): Promise<SourceExtraction> {
  const warnings: string[] = [];
  let descriptor = initial;
  let result: FetchResult;
  let responses: FetchResult[] = [];
  let usedMethod = method;
  if (context.browser && fetcher.render) {
    const rendered = await fetcher.render(descriptor.url);
    result = rendered.page;
    responses = rendered.responses;
    usedMethod = "browser_rendered";
  } else {
    result = await fetcher.fetch(descriptor.url);
  }
  // A source discovery did not date (an extra URL): read the page's own
  // "last updated" evidence the way discovery does.
  if (!descriptor.sourceUpdatedAt && result.status === 200 && !looksJson(result) && !looksPdf(result)) {
    const dates = analyzeHtml(result.body.toString("utf8"), result.url)
      .analysis.freshness.map((evidence) => toIsoDate(evidence.value))
      .filter((value): value is string => Boolean(value))
      .sort();
    if (dates.length) descriptor = { ...descriptor, sourceUpdatedAt: dates[dates.length - 1] };
  }
  const fresh = freshnessOf(descriptor, context.runAt, context.freshnessDays);
  const base = {
    source: { ...descriptor, retrievedAt: result.retrievedAt || descriptor.retrievedAt, ...(result.body.length ? { sha256: sha256(result.body) } : {}) },
    method: usedMethod,
    ...fresh,
    verificationRequired: context.verificationRequired || fresh.freshness === "needs_verification",
  };
  const failed = statusFor(result);
  if (failed) {
    return { ...base, status: failed.status, ...(failed.detail ? { statusDetail: failed.detail } : {}), extractors: [], records: [], ...summarize([]), warnings };
  }
  if (looksSpreadsheet(result)) {
    return { ...base, status: "unsupported", statusDetail: "Spreadsheet; not parsed yet (mini-phase 2.1i). Review by hand.", extractors: [], records: [], ...summarize([]), warnings };
  }
  if (descriptor.sha256 && base.source.sha256 && descriptor.sha256 !== base.source.sha256) warnings.push("Content changed since discovery (sha256 differs).");

  const primary = await extractResponse(result, { sourceId: descriptor.id }, usedMethod === "browser_rendered" ? "browser_rendered" : method);
  const records = [...primary.records];
  const extractors = [...primary.extractors];
  warnings.push(...primary.warnings);
  for (const [index, response] of responses.entries()) {
    if (response.status !== 200) continue;
    // A page can load JSON from analytics vendors and other third parties.
    // Filter before deduplication so an unrelated copy cannot mask the official response.
    if (!context.isOfficialBrowserJson(response.url) || !context.isOfficialBrowserJson(response.finalUrl)) continue;
    // Calculator pages often load the same menu JSON; read each body once.
    const bodyHash = sha256(response.body);
    if (context.seenResponses.has(bodyHash)) continue;
    context.seenResponses.add(bodyHash);
    const found = await extractResponse(response, { sourceId: `${descriptor.id}~xhr${index + 1}` }, "browser_rendered");
    if (found.records.length) {
      // JSON the official page requested by itself (Tef, Nov 18: keep it,
      // flagged). We never call such an endpoint directly.
      for (const record of found.records) record.flags.push("passive_capture");
      records.push(...found.records);
      extractors.push(...found.extractors.map((name) => `browser-json:${name}`));
    }
  }
  if (base.verificationRequired) for (const record of records) if (!record.flags.includes("needs_verification")) record.flags.push("needs_verification");
  const { counts, nutrientCounts } = summarize(records);
  return {
    ...base,
    status: records.length ? "extracted" : "empty",
    ...(records.length ? {} : { statusDetail: "Fetched, but no extractor recognised menu or nutrition records in it." }),
    extractors: [...new Set(extractors)],
    records,
    counts,
    nutrientCounts,
    warnings,
  };
}

// ── Coverage ─────────────────────────────────────────────────────────────

const NEEDS: DataNeed[] = ["calories", "protein", "carbs", "totalFat", "satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars", "catalog", "customization", "portions", "allergens", "ingredients"];

function recordsFor(need: DataNeed, source: SourceExtraction): number {
  const records = source.records;
  switch (need) {
    case "catalog":
      return source.counts.menu_item;
    case "customization":
      return source.counts.option_group;
    case "portions":
      return records.filter((record) => record.kind === "portion" || record.servingText).length;
    case "allergens":
      return records.filter((record) => record.allergens?.length).length;
    case "ingredients":
      return records.filter((record) => record.ingredientsText).length;
    default:
      return source.nutrientCounts[need as NutrientKey] ?? 0;
  }
}

function coverageFor(sources: SourceExtraction[], discovery: DiscoveryReport): NeedCoverage[] {
  return NEEDS.map((need) => {
    const yielding = sources.filter((source) => recordsFor(need, source) > 0);
    const current = yielding.filter((source) => !source.verificationRequired);
    const discovered = discovery.coverage.find((entry) => entry.need === need);
    const status: NeedCoverage["status"] = current.length
      ? "extracted"
      : yielding.length
        ? "needs_verification"
        : discovered && (discovered.status === "found" || discovered.status === "needs_verification")
          ? "not_extracted"
          : "unavailable";
    return {
      need,
      status,
      records: yielding.reduce((sum, source) => sum + recordsFor(need, source), 0),
      sources: yielding.map((source) => source.source.id),
      ...(discovered ? { discoveryStatus: discovered.status } : {}),
    };
  });
}

// ── Entry point ──────────────────────────────────────────────────────────

export async function extractFromDiscovery(discovery: DiscoveryReport, fetcher: Fetcher, options: ExtractOptions = {}): Promise<ExtractionReport> {
  const runAt = options.runAt ?? new Date().toISOString();
  const freshnessDays = discovery.freshnessDays;
  const sources: SourceExtraction[] = [];
  const skipped: ExtractionReport["skipped"] = [];
  const done = new Set<string>();
  const key = (url: string) => url.replace(/\/+$/, "").replace(/^https?:\/\//, "");

  const verificationUrls = new Set(discovery.coverage.flatMap((entry) => entry.verificationSources ?? []).map(key));
  const candidateByUrl = new Map(discovery.candidates.map((candidate) => [key(candidate.url), candidate]));
  const passiveParents = new Map(discovery.candidates.flatMap((candidate) =>
    candidate.channel === "api_json" && candidate.discoveredBy.startsWith("browser:")
      ? [[key(candidate.url), candidate.discoveredBy.slice("browser:".length)] as const]
      : []));
  const requiredBrowserPages = new Set<string>();

  const plan: Array<{ descriptor: SourceDescriptor; method: ExtractionMethod; verificationRequired: boolean; browser: boolean }> = [];
  for (const proposed of discovery.proposedSources) {
    const { provides: _provides, stale: _stale, verificationRequired, compareWith: _compare, ...descriptor } = proposed;
    const candidate = candidateByUrl.get(key(proposed.url));
    const passiveParent = passiveParents.get(key(proposed.url));
    if (passiveParent) {
      requiredBrowserPages.add(passiveParent);
      skipped.push({ url: proposed.url, reason: "Passive browser source. Collected only from its parent page." });
      continue;
    }
    plan.push({
      descriptor,
      method: methodFor(proposed),
      verificationRequired: Boolean(verificationRequired) || verificationUrls.has(key(proposed.url)),
      browser: candidate?.channel === "browser_rendered",
    });
  }
  // Pages whose values only load in a browser.
  for (const candidate of discovery.candidates) {
    if (candidate.outcome !== "client_rendered" && !(candidate.channel === "browser_rendered" && candidate.outcome === "inspected")) continue;
    if (plan.some((entry) => key(entry.descriptor.url) === key(candidate.url))) continue;
    plan.push({
      descriptor: { id: `${discovery.restaurant.id}:browser:${key(candidate.url).replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}`, kind: "browser_observation", authority: candidate.authority, url: candidate.url, retrievedAt: candidate.retrievedAt ?? runAt, ...(candidate.sourceUpdatedAt ? { sourceUpdatedAt: candidate.sourceUpdatedAt } : {}) },
      method: "browser_rendered",
      verificationRequired: false,
      browser: true,
    });
  }
  for (const page of requiredBrowserPages) {
    const url = `${page.split("#", 1)[0]}#rendered`;
    if (plan.some((entry) => key(entry.descriptor.url) === key(url))) continue;
    const parent = candidateByUrl.get(key(page));
    if (!parent || parent.authority === "third_party") continue;
    plan.push({
      descriptor: { id: `${discovery.restaurant.id}:browser-parent:${sha256(Buffer.from(url)).slice(0, 16)}`,
        kind: "browser_observation", authority: parent.authority, url, retrievedAt: parent.retrievedAt ?? runAt },
      method: "browser_rendered", verificationRequired: false, browser: true,
    });
  }
  const officialHosts = new Set(discovery.candidates.filter((candidate) => candidate.authority !== "third_party").map((candidate) => new URL(candidate.url).hostname));
  for (const extra of options.extraSources ?? []) {
    if (passiveParents.has(key(extra.url))) {
      skipped.push({ url: extra.url, reason: "Passive browser source. Direct extraction is disabled." });
      continue;
    }
    const host = new URL(extra.url).hostname;
    if (![...officialHosts].some((official) => host === official || host.endsWith(`.${official.replace(/^www\./, "")}`))) {
      skipped.push({ url: extra.url, reason: `Not on a host discovery treats as official (${host}).` });
      continue;
    }
    plan.push({
      descriptor: { id: `${discovery.restaurant.id}:extra:${key(extra.url).replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}`, kind: /\.(?:pdf|csv)(?:$|\?)/i.test(extra.url) ? "official_document" : "official_html", authority: "official", url: extra.url, retrievedAt: runAt, ...(extra.note ? { notes: extra.note } : {}) },
      method: /\.(?:pdf|csv)(?:$|\?)/i.test(extra.url) ? "official_document" : "official_html",
      verificationRequired: false,
      browser: false,
    });
  }

  const browserJsonHosts = new Set(discovery.candidates
    .filter((candidate) => candidate.authority !== "third_party" && candidate.channel !== "official_document")
    .map((candidate) => new URL(candidate.url).host));
  const isOfficialBrowserJson = (url: string) => {
    const parsed = new URL(url);
    const candidate = candidateByUrl.get(key(url));
    return ["http:", "https:"].includes(parsed.protocol) &&
      candidate?.authority !== "third_party" && browserJsonHosts.has(parsed.host);
  };
  const seenResponses = new Set<string>();
  for (const entry of plan) {
    if (done.has(key(entry.descriptor.url))) continue;
    done.add(key(entry.descriptor.url));
    if (entry.browser && !fetcher.render) {
      skipped.push({ url: entry.descriptor.url, reason: "Values load in the browser; run with --browser (live) to read them." });
      continue;
    }
    const extraction = await extractSource(fetcher, entry.descriptor, entry.method, { runAt, freshnessDays, verificationRequired: entry.verificationRequired, browser: entry.browser, seenResponses, isOfficialBrowserJson });
    // A stale source's sourceUpdatedAt is only known after the fetch for
    // extra sources; carry discovery's date when there is one.
    sources.push(extraction);
  }
  for (const candidate of discovery.candidates) {
    if (candidate.outcome === "auth_required" || candidate.outcome === "rejected_third_party") skipped.push({ url: candidate.url, reason: candidate.outcome === "auth_required" ? "Requires login or a key. Not worked around." : "Third-party source; never used for core macros." });
  }

  const coverage = coverageFor(sources, discovery);
  const limitations: string[] = [];
  const missingCore = CORE_NUTRIENTS.filter((nutrient) => coverage.find((entry) => entry.need === nutrient)?.status === "unavailable" || coverage.find((entry) => entry.need === nutrient)?.status === "not_extracted");
  if (missingCore.length) limitations.push(`No extracted source publishes ${missingCore.join(", ")}. These stay empty; they are never estimated.`);
  const verifyCore = CORE_NUTRIENTS.filter((nutrient) => coverage.find((entry) => entry.need === nutrient)?.status === "needs_verification");
  if (verifyCore.length) limitations.push(`${verifyCore.join(", ")} come only from sources older than ${freshnessDays} days. Every such record is flagged needs_verification and must not be approved automatically.`);
  if (discovery.mode === "replay" || fetcher.mode === "replay") limitations.push("Replay run: sources are the saved evidence, not a live fetch. A live run is needed before these records count as current.");
  for (const source of sources) if (source.status !== "extracted") limitations.push(`${source.source.url}: ${source.status}${source.statusDetail ? ` (${source.statusDetail})` : ""}.`);
  const ingredients = coverage.find((entry) => entry.need === "ingredients")?.status;
  if (ingredients === "not_extracted" || ingredients === "unavailable") limitations.push("No ingredient declarations were recognised in the sources read.");

  return {
    version: EXTRACTION_VERSION,
    restaurant: discovery.restaurant,
    mode: fetcher.mode,
    runAt,
    discovery: { runAt: discovery.runAt, mode: discovery.mode, file: options.discoveryFile ?? "discovery.json" },
    freshnessDays,
    sources,
    skipped,
    coverage,
    limitations,
  };
}
