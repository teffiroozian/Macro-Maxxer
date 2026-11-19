// Automated source discovery for any restaurant.
//
// Starting from a restaurant's domains (and optional seeds), discovery:
//   1. reads robots.txt and sitemaps, and tries a few well-known paths;
//   2. crawls official pages in order of relevance (nutrition > allergen >
//      menu > ordering), within a request budget and depth limit;
//   3. analyzes every response for what it publishes: nutrients with values,
//      catalog, customization rules, portions, allergens, ingredients, and
//      "last updated" evidence; looks inside embedded page data;
//   4. follows links to official documents (PDF/CSV), even on another host;
//   5. fingerprints the ordering/website platform from pages and JS bundles
//      and makes one anonymous GET to that platform's known read-only
//      endpoints for up to three sampled stores;
//   6. reports coverage per data need, and every gap with the leads that
//      could not be inspected.
//
// It never logs in, never uses third-party data for core macros (standards
// §2.2), and never fills a gap: a nutrient no usable source publishes is
// "missing".
import { ALL_NUTRIENTS, CORE_NUTRIENTS, type CoreNutrient } from "../pipeline/contracts";
import {
  nutrientsWithValues,
  analyzeBundle,
  analyzeHtml,
  analyzeJson,
  analyzeText,
  linksFromHeader,
  parseRobots,
  parseSitemap,
  pdfText,
  toIsoDate,
  urlsInJson,
  type ExtractedLink,
} from "./analyze";
import {
  CHANNEL_SOURCE_KIND,
  DEFAULT_BUDGET,
  DISCOVERY_VERSION,
  type Authority,
  type Candidate,
  type CandidateOutcome,
  type Channel,
  type ContentAnalysis,
  type Coverage,
  type DataNeed,
  type DiscoveryBudget,
  type DiscoveryReport,
  type DiscoveryTarget,
  type FetchResult,
  type Fetcher,
  type Gap,
  type Lead,
  type PlatformHit,
  type ProposedSource,
} from "./contracts";
import { sha256 } from "./fetchers";
import { PLATFORMS, PLATFORM_API_HOSTS, detectPlatforms, type Platform } from "./platforms";
import { DOCUMENT_EXTENSION, WELL_KNOWN_PATHS, relevance } from "./vocabulary";

export const DEFAULT_FRESHNESS_DAYS = 90;
const MAX_SAMPLED_STORES = 3;

export type DiscoverOptions = {
  budget?: Partial<DiscoveryBudget>;
  now?: string;
  previous?: DiscoveryReport;
};

type QueueItem = {
  url: string;
  depth: number;
  discoveredBy: string;
  relevance: number;
  authority: Authority;
  accept?: string;
  channelHint?: Channel;
};

const hostIn = (host: string, domains: string[] = []) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));

export function urlKey(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.host = parsed.host.toLowerCase();
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) parsed.pathname = parsed.pathname.slice(0, -1);
  return parsed.toString();
}

export function authorityOf(url: string, target: DiscoveryTarget): Authority {
  const host = new URL(url).host.toLowerCase();
  if (hostIn(host, target.orderingDomains) || PLATFORM_API_HOSTS.has(host)) return "ordering_system";
  if (hostIn(host, target.officialDomains)) return "official";
  return "third_party";
}

// Hosts that serve files for other sites: CDNs, object storage, asset services.
const FILE_HOST = /(?:^|[.-])(?:cdn|static|assets?|media|files?|uploads?|content|images?)[0-9]*[.-]|cloudfront\.net$|amazonaws\.com$|akamaihd\.net$|azureedge\.net$|blob\.core\.windows\.net$|googleusercontent\.com$|storage\.googleapis\.com$|ctfassets\.net$|cloudinary\.com$|imgix\.net$|squarespace-cdn\.com$|wixstatic\.com$|hubspotusercontent[^.]*\.net$|bynder\.com$|widen\.net$|issuu\.com$/i;
export const isFileHost = (host: string) => FILE_HOST.test(host);

const STORE_ID_IN_URL = /\/(?:store|stores|location|locations|restaurant|restaurants)\/(\d{2,})(?:\/|$|\?)/i;
const BUNDLE_WORTH_READING = /(?:_app|main|app|store|menu|pages\/)[^/]*\.js(?:$|\?)/i;

function channelFor(result: FetchResult, hint?: Channel): Channel {
  const type = (result.headers["content-type"] ?? "").toLowerCase();
  const path = new URL(result.finalUrl || result.url).pathname.toLowerCase();
  if (path.endsWith("/robots.txt") || /sitemap[^/]*\.xml$/.test(path) || (type.includes("xml") && path.includes("sitemap"))) return "site_index";
  if (type.includes("pdf") || DOCUMENT_EXTENSION.test(path) || type.includes("csv") || type.includes("spreadsheet")) return "official_document";
  if (type.includes("javascript") || path.endsWith(".js")) return "js_bundle";
  if (type.includes("json")) return "api_json";
  if (type.includes("html")) return "official_html";
  return hint ?? "unknown";
}

function outcomeFor(result: FetchResult): CandidateOutcome {
  if (result.status === 0) {
    if (result.failure === "blocked_by_robots") return "blocked_by_robots";
    if (result.failure === "not_captured") return "not_captured";
    if (result.failure === "network_blocked") return "network_blocked";
    return "network_error";
  }
  if (result.status === 401 || result.status === 403) return "auth_required";
  if (result.status === 404 || result.status === 410) return "not_found";
  if (result.status >= 400) return "http_error";
  return "inspected";
}

function latestDate(analysis: ContentAnalysis | undefined, headers: Record<string, string>): string | undefined {
  const evidence = [...(analysis?.freshness ?? [])];
  if (headers["last-modified"]) evidence.push({ value: headers["last-modified"], from: "header last-modified" });
  const dates = evidence.map((evidence) => toIsoDate(evidence.value)).filter((date): date is string => Boolean(date));
  return dates.sort().at(-1);
}

const isUsable = (candidate: Candidate) =>
  candidate.outcome === "inspected" && candidate.authority !== "third_party" && candidate.analysis !== undefined && candidate.channel !== "js_bundle" && candidate.channel !== "site_index";

export function provides(candidate: Candidate): DataNeed[] {
  if (!isUsable(candidate) || !candidate.analysis) return [];
  const { nutrients, menu } = candidate.analysis;
  const needs: DataNeed[] = ALL_NUTRIENTS.filter((key) => nutrients[key].presence === "values");
  if (menu.items > 0) needs.push("catalog");
  if (menu.optionGroups > 0 && menu.selectionLimits) needs.push("customization");
  if (menu.portions) needs.push("portions");
  if (menu.allergens) needs.push("allergens");
  if (menu.ingredientDeclarations) needs.push("ingredients");
  return needs;
}

const LEAD_REASON: Partial<Record<CandidateOutcome, string>> = {
  auth_required: "needs authorization; no workaround attempted",
  not_captured: "not in the saved responses; run discovery live to inspect it",
  unparsed: "fetched, but this file format is not analyzed yet; review it by hand",
  network_error: "could not be reached",
  http_error: "returned a server error",
  blocked_by_robots: "disallowed by robots.txt; not fetched",
  skipped_budget: "not fetched: request budget used up",
  network_blocked: "the network refused the request before it reached the site; says nothing about the source",
};

// Level 2 tries these extra paths on every official domain.
const DEEPER_PATHS = ["/faq", "/faqs", "/nutrition-guide", "/nutritional-information", "/nutrition-calculator", "/contact", "/contact-us"];
const CONTACT_PATH = /\/(?:contact(?:-us)?|guest-?(?:relations|services|feedback)|customer-?(?:care|service)|support|feedback)(?:\/|$)/i;
const MAILTO = /mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;

// A site that serves several countries under /<country>/<lang-country>/ paths
// (mcdonalds.com/us/en-us/, /gb/en-gb/, ...). When the seeds name a country,
// pages for other countries are another market's menu and are not crawled.
const MARKET_PATH = /^\/([a-z]{2})\/([a-z]{2})-([a-z]{2})(?:\/|$)/i;
export function marketOf(url: string): string | undefined {
  try {
    const match = MARKET_PATH.exec(new URL(url).pathname);
    return match && match[1].toLowerCase() === match[3].toLowerCase() ? match[1].toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

export async function discoverSources(target: DiscoveryTarget, fetcher: Fetcher, options: DiscoverOptions = {}): Promise<DiscoveryReport> {
  const budget: DiscoveryBudget = { ...DEFAULT_BUDGET, ...options.budget };
  const runAt = options.now ?? new Date().toISOString();
  const warnings: string[] = [];
  const freshnessDays = Math.min(target.freshnessDays ?? DEFAULT_FRESHNESS_DAYS, DEFAULT_FRESHNESS_DAYS);
  if ((target.freshnessDays ?? 0) > DEFAULT_FRESHNESS_DAYS) warnings.push(`freshnessDays ${target.freshnessDays} is longer than the ${DEFAULT_FRESHNESS_DAYS}-day limit (standards §2.3); using ${DEFAULT_FRESHNESS_DAYS}.`);

  const queue: QueueItem[] = [];
  const seen = new Set<string>();
  const candidates = new Map<string, Candidate>();
  const platforms = new Map<string, PlatformHit>();
  const platformOrigins = new Map<string, Set<string>>();
  const storeIds = new Set(target.storeIds ?? []);
  const bundlesPerHost = new Map<string, number>();
  let requestsUsed = 0;
  // Nutrition pages whose HTML holds no values, with API hosts seen for them.
  const clientRenderedPages = new Map<string, string[]>();
  // Sitemap URLs too weak for Level 1 (relevance 3–5), kept for Level 2.
  const deferredSitemapUrls: string[] = [];
  const contacts = new Set<string>();
  let level: 1 | 2 | 3 = 1;
  const seedMarkets = new Set((target.seeds ?? []).map(marketOf).filter((m): m is string => Boolean(m)));
  let otherMarketSkipped = 0;

  const enqueue = (url: string, item: Omit<QueueItem, "url" | "authority"> & { authority?: Authority }) => {
    let key: string;
    try {
      key = urlKey(url);
    } catch {
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    const market = seedMarkets.size ? marketOf(url) : undefined;
    if (market && !seedMarkets.has(market)) {
      otherMarketSkipped += 1;
      return;
    }
    const authority = item.authority ?? authorityOf(url, target);
    if (authority === "third_party") {
      if (item.relevance >= 6) {
        candidates.set(key, {
          url,
          channel: DOCUMENT_EXTENSION.test(url) ? "official_document" : "unknown",
          authority,
          outcome: "rejected_third_party",
          depth: item.depth,
          discoveredBy: item.discoveredBy,
          relevance: item.relevance,
          notes: ["Third-party source: never used for core macros (standards §2.2). Not fetched."],
        });
      }
      return;
    }
    queue.push({ ...item, url, authority });
  };

  const notePlatform = (platform: Platform, evidence: string, foundIn: string, named?: string) => {
    if (!platforms.has(platform.id)) platforms.set(platform.id, { id: platform.id, name: platform.name, evidence, foundIn });
    const origin = named ?? new URL(foundIn).origin;
    if (authorityOf(origin, target) !== "third_party") {
      const origins = platformOrigins.get(platform.id) ?? new Set<string>();
      origins.add(origin);
      platformOrigins.set(platform.id, origins);
    }
  };

  const schedulePlatformProbes = () => {
    const sampled = [...storeIds].slice(0, MAX_SAMPLED_STORES);
    for (const hit of platforms.values()) {
      const platform = PLATFORMS.find((entry) => entry.id === hit.id);
      for (const endpoint of platform?.endpoints ?? []) {
        const origins = endpoint.template.includes("{origin}") ? [...(platformOrigins.get(hit.id) ?? [])] : [""];
        const stores = endpoint.template.includes("{storeId}") ? sampled : [""];
        for (const origin of origins) {
          for (const store of stores) {
            const url = endpoint.template.replace("{origin}", origin).replace("{storeId}", encodeURIComponent(store));
            enqueue(url, { depth: 1, discoveredBy: `platform:${hit.id} (${endpoint.purpose})`, relevance: 7, accept: endpoint.accept, channelHint: "api_json" });
          }
        }
      }
    }
  };

  const followLinks = (links: ExtractedLink[], page: QueueItem, pageAuthority: Authority, pageCandidate: Candidate) => {
    for (const link of links) {
      const storeId = STORE_ID_IN_URL.exec(link.url)?.[1];
      if (storeId && authorityOf(link.url, target) === "ordering_system") storeIds.add(storeId);
      const linkHost = new URL(link.url).host;
      if (link.kind === "script") {
        const pageHost = new URL(page.url).host;
        const count = bundlesPerHost.get(pageHost) ?? 0;
        // Same host, or another host the restaurant runs (e.g. a CDN subdomain).
        if ((linkHost !== pageHost && authorityOf(link.url, target) === "third_party") || !BUNDLE_WORTH_READING.test(link.url) || count >= budget.maxBundlesPerHost) continue;
        const clientRendered = page.relevance >= 6 && pageCandidate.analysis !== undefined && nutrientsWithValues(pageCandidate.analysis).length === 0;
        if (pageAuthority !== "ordering_system" && !clientRendered && !(pageCandidate.analysis?.embedded.some((block) => block.items > 0) ?? false)) continue;
        bundlesPerHost.set(pageHost, count + 1);
        enqueue(link.url, { depth: page.depth + 1, discoveredBy: `script:${page.url}`, relevance: 4, channelHint: "js_bundle" });
        continue;
      }
      const score = relevance(link.url, link.text);
      if (link.kind === "header") {
        if (/json/i.test(link.text)) enqueue(link.url, { depth: page.depth + 1, discoveredBy: `header-link:${page.url}`, relevance: Math.max(page.relevance - 1, 3), accept: "application/json", channelHint: "api_json" });
        continue;
      }
      if (DOCUMENT_EXTENSION.test(link.url)) {
        // A document an official page links to is official when a file host or
        // CDN serves it. A document on another organization's site (a charity,
        // a standards body) stays third-party and is never used for macros.
        const offDomain = authorityOf(link.url, target) === "third_party";
        const authority = pageAuthority !== "third_party" && offDomain && isFileHost(new URL(link.url).hostname) ? pageAuthority : undefined;
        enqueue(link.url, { depth: page.depth + 1, discoveredBy: `link:${page.url}`, relevance: score + 2, authority, channelHint: "official_document" });
        if (authority) pageCandidate.notes.push(`Links to an off-domain document treated as official: ${link.url}`);
        continue;
      }
      if (page.depth + 1 > budget.maxDepth) continue;
      if (score >= 2 || (score >= 6 && authorityOf(link.url, target) === "third_party")) enqueue(link.url, { depth: page.depth + 1, discoveredBy: `link:${page.url}`, relevance: score });
    }
  };

  // ── Seeds ──
  for (const seed of target.seeds ?? []) enqueue(seed, { depth: 0, discoveredBy: "seed", relevance: 10 });
  for (const domain of [...target.officialDomains, ...(target.orderingDomains ?? [])]) {
    const origin = `https://${domain}`;
    enqueue(`${origin}/robots.txt`, { depth: 0, discoveredBy: "well-known", relevance: 9, accept: "text/plain", channelHint: "site_index" });
    if (!hostIn(domain, target.orderingDomains)) {
      for (const path of WELL_KNOWN_PATHS.filter((entry) => entry !== "/robots.txt")) enqueue(`${origin}${path}`, { depth: 0, discoveredBy: "well-known", relevance: relevance(path) + 1 });
    }
  }

  // ── Crawl ──
  const crawl = async (maxRequests: number, maxDepth: number) => {
  budget.maxDepth = maxDepth;
  while (queue.length > 0 && requestsUsed < maxRequests) {
    queue.sort((a, b) => b.relevance - a.relevance || a.depth - b.depth);
    const item = queue.shift()!;
    const seenStore = item.authority === "ordering_system" ? STORE_ID_IN_URL.exec(item.url)?.[1] : undefined;
    if (seenStore) storeIds.add(seenStore);
    const result = await fetcher.fetch(item.url, { accept: item.accept });
    requestsUsed += 1;
    const outcome = outcomeFor(result);
    const channel = result.status === 0 ? (item.channelHint ?? (DOCUMENT_EXTENSION.test(item.url) ? "official_document" : "unknown")) : channelFor(result, item.channelHint);
    const candidate: Candidate = {
      url: item.url,
      finalUrl: result.finalUrl !== item.url ? result.finalUrl : undefined,
      channel,
      authority: item.authority,
      outcome,
      status: result.status || undefined,
      contentType: result.headers["content-type"],
      bytes: result.body.length || undefined,
      sha256: result.body.length > 0 ? sha256(result.body) : undefined,
      retrievedAt: result.status ? result.retrievedAt : undefined,
      depth: item.depth,
      discoveredBy: item.discoveredBy,
      relevance: item.relevance,
      level,
      notes: result.failureDetail ? [result.failureDetail] : [],
    };
    candidates.set(urlKey(item.url), candidate);
    if (result.status === 401 || result.status === 403) candidate.notes.push(`HTTP ${result.status}: not readable anonymously.`);
    if (outcome !== "inspected") {
      schedulePlatformProbes();
      continue;
    }

    const body = result.body;
    const pageUrl = result.finalUrl || item.url;
    try {
      if (channel === "site_index") {
        const text = body.toString("utf8");
        if (pageUrl.endsWith("/robots.txt")) {
          const robots = parseRobots(text);
          for (const sitemap of robots.sitemaps) enqueue(sitemap, { depth: item.depth + 1, discoveredBy: `robots:${item.url}`, relevance: 5, channelHint: "site_index" });
          if (robots.sitemaps.length === 0) enqueue(new URL("/sitemap.xml", pageUrl).toString(), { depth: item.depth + 1, discoveredBy: "well-known", relevance: 4, channelHint: "site_index" });
          if (robots.disallow.length > 0) candidate.notes.push(`${robots.disallow.length} disallow rule(s) honored in live mode.`);
        } else {
          const sitemap = parseSitemap(text);
          for (const nested of sitemap.sitemaps) enqueue(nested, { depth: item.depth, discoveredBy: `sitemap:${item.url}`, relevance: /page|nutrition|menu/i.test(nested) ? 5 : 3, channelHint: "site_index" });
          for (const url of sitemap.urls.slice(0, budget.maxSitemapUrls)) {
            const score = relevance(url);
            if (score >= 6) enqueue(url, { depth: 1, discoveredBy: `sitemap:${item.url}`, relevance: score });
            else if (score >= 3 || CONTACT_PATH.test(new URL(url).pathname)) deferredSitemapUrls.push(url);
          }
          candidate.notes.push(`${sitemap.urls.length} URL(s), ${sitemap.sitemaps.length} nested sitemap(s).`);
        }
      } else if (channel === "official_html") {
        const html = body.toString("utf8");
        const { analysis, links } = analyzeHtml(html, pageUrl);
        candidate.analysis = analysis;
        for (const match of html.matchAll(MAILTO)) contacts.add(`mailto:${match[1].toLowerCase()}`);
        if (CONTACT_PATH.test(new URL(pageUrl).pathname)) contacts.add(pageUrl);
        for (const link of links) if (link.kind === "a" && CONTACT_PATH.test(new URL(link.url).pathname) && authorityOf(link.url, target) !== "third_party") contacts.add(urlKey(link.url));
        if (item.relevance >= 6 && nutrientsWithValues(analysis).length === 0) {
          const hosts = analyzeBundle(html).apiHosts;
          candidate.notes.push(`Nutrition-related page without nutrient values in its HTML; it may render in the browser${hosts.length > 0 ? ` from ${hosts.join(", ")}` : ""}.`);
          clientRenderedPages.set(urlKey(candidate.url), hosts);
        }
        if (analysis.embedded.some((block) => block.items > 0 || block.nutrientsWithValues.length > 0)) candidate.channel = "embedded_json";
        for (const { platform, evidence, origin } of detectPlatforms(`${html}\n${result.headers.link ?? ""}`)) notePlatform(platform, evidence, pageUrl, origin);
        followLinks([...linksFromHeader(result.headers.link, pageUrl), ...links], item, item.authority, candidate);
      } else if (channel === "api_json") {
        const json = JSON.parse(body.toString("utf8")) as unknown;
        candidate.analysis = analyzeJson(json);
        for (const url of urlsInJson(json, pageUrl)) {
          const score = relevance(url);
          if (DOCUMENT_EXTENSION.test(url) || score >= 6) {
            const authority = DOCUMENT_EXTENSION.test(url) && authorityOf(url, target) === "third_party" ? item.authority : undefined;
            enqueue(url, { depth: item.depth + 1, discoveredBy: `json:${item.url}`, relevance: score + (DOCUMENT_EXTENSION.test(url) ? 2 : 0), authority });
          }
        }
      } else if (channel === "official_document") {
        const type = (result.headers["content-type"] ?? "").toLowerCase();
        if (type.includes("pdf") || /\.pdf(?:$|\?)/i.test(pageUrl)) {
          candidate.analysis = analyzeText(await pdfText(body));
        } else if (type.includes("csv") || type.startsWith("text/") || /\.csv(?:$|\?)/i.test(pageUrl)) {
          candidate.analysis = analyzeText(body.toString("utf8"));
        } else {
          candidate.outcome = "unparsed";
          candidate.notes.push("Spreadsheet/Word documents are not analyzed yet. Review by hand.");
        }
      } else if (channel === "js_bundle") {
        const js = body.toString("utf8");
        const bundle = analyzeBundle(js);
        for (const { platform, evidence, origin } of detectPlatforms(js)) notePlatform(platform, evidence, pageUrl, origin);
        const parent = item.discoveredBy.startsWith("script:") ? item.discoveredBy.slice(7) : undefined;
        if (parent && clientRenderedPages.has(urlKey(parent)) ) clientRenderedPages.get(urlKey(parent))!.push(...bundle.apiHosts);
        if (bundle.apiHosts.length > 0) candidate.notes.push(`API hosts referenced: ${bundle.apiHosts.join(", ")}`);
        if (bundle.apiPaths.length > 0) candidate.notes.push(`Read-only-looking API paths (not probed): ${bundle.apiPaths.slice(0, 10).join(", ")}`);
      } else {
        candidate.analysis = analyzeText(body.toString("utf8"));
      }
    } catch (error) {
      candidate.outcome = "unparsed";
      candidate.notes.push(`Could not analyze: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (candidate.analysis) candidate.sourceUpdatedAt = latestDate(candidate.analysis, result.headers);
    const pagePlatforms = [...platforms.values()].filter((hit) => hit.foundIn === pageUrl).map((hit) => hit.id);
    if (pagePlatforms.length > 0) candidate.platforms = pagePlatforms;
    schedulePlatformProbes();
  }
  };

  // ── Coverage ──
  const needs: DataNeed[] = [...ALL_NUTRIENTS, "catalog", "customization", "portions", "allergens", "ingredients"];
  const ageDays = (iso?: string) => (iso ? Math.floor((Date.parse(runAt) - Date.parse(iso)) / 86_400_000) : undefined);
  // Older than the freshness window by its own "last updated" date. Such a
  // source stays valid evidence: it triggers verification, never rejection.
  // Whether newer data supersedes it can only be decided per item and portion
  // in validation, so discovery lists newer sources to compare with.
  const needsVerification = (candidate: Candidate) => (ageDays(candidate.sourceUpdatedAt) ?? 0) > freshnessDays;
  const isLead = (candidate: Candidate) =>
    Boolean(LEAD_REASON[candidate.outcome]) &&
    // Guessed paths (well-known, level-2) that were never answered are not
    // evidence either way.
    !(/^(?:well-known|level-2$)/.test(candidate.discoveredBy) && (candidate.outcome === "not_captured" || candidate.outcome === "network_blocked")) &&
    (candidate.relevance >= 6 || candidate.channel === "api_json" || candidate.channel === "official_document");
  const evaluate = () => {
    const all = [...candidates.values()];
    const blockedLeads = all.filter((candidate) => isLead(candidate) && (candidate.outcome === "network_blocked" || candidate.outcome === "not_captured"));
    const coverage: Coverage[] = needs.map((need) => {
      const publishing = all.filter((candidate) => provides(candidate).includes(need));
      const sources = publishing.filter((candidate) => !needsVerification(candidate)).map((candidate) => candidate.url);
      const verificationSources = publishing.filter(needsVerification).map((candidate) => candidate.url);
      const status: Coverage["status"] = sources.length > 0 ? "found" : verificationSources.length > 0 ? "needs_verification" : blockedLeads.length > 0 ? "unverified" : "missing";
      return { need, status, sources, ...(verificationSources.length > 0 ? { verificationSources } : {}) };
    });
    const coreStatus = (status: Coverage["status"]) => CORE_NUTRIENTS.filter((nutrient) => coverage.find((entry) => entry.need === nutrient)?.status === status) as CoreNutrient[];
    return { all, coverage, missingCore: coreStatus("missing"), unverifiedCore: coreStatus("unverified"), verifyCore: coreStatus("needs_verification") };
  };

  const levels: DiscoveryReport["levels"] = [];
  let before = requestsUsed;
  await crawl(budget.maxRequests, budget.maxDepth);
  levels.push({ level: 1, reason: "Automatic discovery of official sources.", requests: requestsUsed - before });

  // ── Level 2: deeper investigation when core data is missing ──
  let state = evaluate();
  const short = [...state.missingCore, ...state.unverifiedCore, ...state.verifyCore];
  if (short.length > 0) {
    level = 2;
    before = requestsUsed;
    for (const domain of target.officialDomains) for (const path of DEEPER_PATHS) enqueue(`https://${domain}${path}`, { depth: 1, discoveredBy: "level-2", relevance: relevance(path) + 1 });
    for (const url of deferredSitemapUrls) enqueue(url, { depth: 1, discoveredBy: "level-2 sitemap", relevance: Math.max(relevance(url), 3) });
    for (const candidate of candidates.values()) if (candidate.outcome === "skipped_budget") candidates.delete(urlKey(candidate.url));
    for (const item of queue) item.relevance = Math.max(item.relevance, 3);
    await crawl(budget.maxRequests * 2, budget.maxDepth + 1);
    if (fetcher.render) {
      for (const [key, hosts] of clientRenderedPages) {
        if (requestsUsed >= budget.maxRequests * 2 + 10) break;
        const pageCandidate = candidates.get(key);
        if (!pageCandidate) continue;
        const rendered = await fetcher.render(pageCandidate.finalUrl ?? pageCandidate.url);
        requestsUsed += 1;
        const renderKey = `${key}#rendered`;
        const renderCandidate: Candidate = {
          url: `${pageCandidate.url}#rendered`,
          channel: "browser_rendered",
          authority: pageCandidate.authority,
          outcome: outcomeFor(rendered.page),
          status: rendered.page.status || undefined,
          bytes: rendered.page.body.length || undefined,
          sha256: rendered.page.body.length > 0 ? sha256(rendered.page.body) : undefined,
          retrievedAt: rendered.page.status ? rendered.page.retrievedAt : undefined,
          depth: pageCandidate.depth,
          discoveredBy: `browser:${pageCandidate.url}`,
          relevance: pageCandidate.relevance,
          level: 2,
          notes: rendered.page.failureDetail ? [rendered.page.failureDetail] : ["Rendered in a headless browser; passive load, no interaction."],
        };
        if (renderCandidate.outcome === "inspected") {
          renderCandidate.analysis = analyzeHtml(rendered.page.body.toString("utf8"), rendered.page.finalUrl).analysis;
          renderCandidate.sourceUpdatedAt = latestDate(renderCandidate.analysis, rendered.page.headers);
          clientRenderedPages.delete(key);
          if (nutrientsWithValues(renderCandidate.analysis).length === 0 && rendered.responses.length === 0) clientRenderedPages.set(key, hosts);
        }
        candidates.set(renderKey, renderCandidate);
        for (const response of rendered.responses) {
          const authority = authorityOf(response.url, target);
          if (authority === "third_party") continue;
          let analysis: ContentAnalysis | undefined;
          try {
            const json = JSON.parse(response.body.toString("utf8")) as unknown;
            analysis = analyzeJson(json);
            // Documents the page's own data points to (e.g. a CMS nutrition PDF).
            for (const url of urlsInJson(json, response.url)) {
              if (!DOCUMENT_EXTENSION.test(url) && relevance(url) < 6) continue;
              const docAuthority = DOCUMENT_EXTENSION.test(url) && authorityOf(url, target) === "third_party" ? authority : undefined;
              enqueue(url, { depth: pageCandidate.depth + 1, discoveredBy: `json:${response.url}`, relevance: relevance(url) + (DOCUMENT_EXTENSION.test(url) ? 2 : 0), authority: docAuthority });
            }
          } catch {
            continue;
          }
          candidates.set(urlKey(response.url), {
            url: response.url,
            channel: "api_json",
            authority,
            outcome: outcomeFor(response),
            status: response.status,
            contentType: response.headers["content-type"],
            bytes: response.body.length,
            sha256: sha256(response.body),
            retrievedAt: response.retrievedAt,
            sourceUpdatedAt: latestDate(analysis, response.headers),
            depth: pageCandidate.depth + 1,
            discoveredBy: `browser:${pageCandidate.url}`,
            relevance: 7,
            level: 2,
            analysis,
            notes: ["JSON the page requested itself while rendering (GET)."],
          });
        }
      }
    }
    // Fetch what the rendered pages' data pointed to.
    if (queue.length > 0) await crawl(budget.maxRequests * 2 + 20, budget.maxDepth + 2);
    levels.push({ level: 2, reason: `Core nutrients not covered by current sources after Level 1: ${short.join(", ")}.`, requests: requestsUsed - before });
    state = evaluate();
  }
  budget.maxRequests = Math.max(budget.maxRequests, requestsUsed);

  if (queue.length > 0) {
    warnings.push(`Request budget (${budget.maxRequests}) used up with ${queue.length} URL(s) still queued.`);
    for (const item of queue.filter((entry) => entry.relevance >= 6)) {
      candidates.set(urlKey(item.url), { url: item.url, channel: item.channelHint ?? "unknown", authority: item.authority, outcome: "skipped_budget", depth: item.depth, discoveredBy: item.discoveredBy, relevance: item.relevance, notes: [] });
    }
  }

  // ── Gaps ──
  const { coverage, missingCore, unverifiedCore, verifyCore } = evaluate();
  const all = [...candidates.values()];
  const statements = [...new Set(all.filter(isUsable).flatMap((candidate) => candidate.analysis?.statements ?? []))];
  const leads: Lead[] = all
    .filter(isLead)
    .map((candidate) => ({ url: candidate.url, outcome: candidate.outcome, reason: LEAD_REASON[candidate.outcome]! }));
  for (const [url, hosts] of clientRenderedPages) {
    const unique = [...new Set(hosts)];
    leads.push({ url, outcome: "client_rendered", reason: `nutrition page renders in the browser${unique.length > 0 ? `; its data likely comes from ${unique.join(", ")}` : ""}. ${fetcher.render ? "Browser rendering found no nutrient values or JSON" : "Needs browser rendering (run with --browser); not probed"}` });
  }
  const gaps: Gap[] = coverage
    .filter((entry) => entry.status !== "found")
    .map((entry) => {
      const core = (CORE_NUTRIENTS as readonly string[]).includes(entry.need);
      const nutrient = (ALL_NUTRIENTS as readonly string[]).includes(entry.need);
      const searched = all.filter(isUsable).length;
      let message: string;
      if (entry.status === "needs_verification") {
        const dated = (entry.verificationSources ?? []).map((url) => `${url} (last updated ${all.find((candidate) => candidate.url === url)?.sourceUpdatedAt})`);
        message = `Only official source(s) older than ${freshnessDays} days publish ${entry.need}: ${dated.join("; ")}. Valid evidence, kept for comparison; verify it is current before use. Not approved and not discarded.`;
      } else if (entry.status === "unverified") {
        message = `No inspected source publishes ${entry.need}, but the network blocked or did not capture sources that might. Cannot be called missing until those are checked.`;
      } else {
        message = nutrient
          ? `No usable official or ordering-system source publishes ${entry.need} values (${searched} source(s) inspected). It stays missing; it is never estimated.`
          : `No usable source shows ${entry.need} (${searched} source(s) inspected).`;
      }
      if (core && statements.length > 0) message += ` Official statement: "${statements[0]}"`;
      return { need: entry.need, core, message, leads: nutrient || entry.need === "catalog" || entry.need === "customization" ? leads : [] };
    });

  // ── Level 3: escalation when public sources are exhausted ──
  let informationRequest: DiscoveryReport["informationRequest"];
  const unresolved = [...missingCore, ...unverifiedCore] as CoreNutrient[];
  if (unresolved.length > 0 || verifyCore.length > 0) {
    level = 3;
    const asked = [...new Set([...unresolved, ...verifyCore])] as CoreNutrient[];
    const reason = unverifiedCore.length > 0 && missingCore.length === 0
      ? `Network-blocked sources must be checked first (${unverifiedCore.join(", ")} unverified); request drafted in case they hold nothing.`
      : `Public official sources checked; ${asked.join(", ")} not available from a current source.`;
    levels.push({ level: 3, reason, requests: 0 });
    informationRequest = {
      status: "draft_not_sent",
      missing: asked,
      contacts: [...contacts].sort(),
      markdown: renderInformationRequest(target.name, asked, verifyCore, coverage, all.filter(isUsable), statements, [...contacts].sort(), runAt),
    };
  }

  // ── Proposed source declarations for the adapter ──
  const proposedSources: ProposedSource[] = all
    .filter((candidate) => provides(candidate).length > 0)
    .map((candidate) => {
      const url = new URL(candidate.url);
      const kind = candidate.channel === "embedded_json" && candidate.authority === "official" ? "official_html" : (CHANNEL_SOURCE_KIND[candidate.channel] ?? "official_html");
      const age = ageDays(candidate.retrievedAt);
      return {
        id: `${target.id}:${`${url.host}${url.pathname}`.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`,
        kind,
        authority: candidate.authority,
        url: candidate.url,
        retrievedAt: candidate.retrievedAt ?? runAt,
        sourceUpdatedAt: candidate.sourceUpdatedAt,
        sha256: candidate.sha256,
        provides: provides(candidate),
        stale: age !== undefined && age > freshnessDays,
        ...(needsVerification(candidate)
          ? {
              verificationRequired: true,
              compareWith: all
                .filter((other) => other !== candidate && isUsable(other) && !needsVerification(other) && provides(other).some((need) => provides(candidate).includes(need) && (ALL_NUTRIENTS as readonly string[]).includes(need)))
                .map((other) => other.url),
            }
          : {}),
      };
    })
    .sort((a, b) => (a.authority === b.authority ? 0 : a.authority === "ordering_system" ? -1 : 1));

  // ── Warnings ──
  if (fetcher.mode === "replay") {
    const times = all.map((candidate) => candidate.retrievedAt).filter((time): time is string => Boolean(time)).sort();
    warnings.push(`Replay mode: answers come from saved responses${times[0] ? ` captured ${times[0].slice(0, 10)}` : ""}. URLs that were never saved are "not_captured", not missing. Run live before relying on this report.`);
  }
  if (storeIds.size < 2) warnings.push(`Only ${storeIds.size} store id(s) known. Standards §7 need at least two sampled locations; add storeIds to the target.`);
  const stale = proposedSources.filter((source) => source.stale);
  if (stale.length > 0) warnings.push(`${stale.length} source(s) were retrieved more than ${freshnessDays} days ago and must be re-collected before publishing (standards §2.3).`);
  const thirdParty = all.filter((candidate) => candidate.outcome === "rejected_third_party").length;
  const toVerify = proposedSources.filter((source) => source.verificationRequired).length;
  if (toVerify > 0) warnings.push(`${toVerify} source(s) were last updated more than ${freshnessDays} days ago. They stay valid evidence and need verification; compare them with newer sources item by item and portion by portion before use.`);
  const networkBlocked = all.filter((candidate) => candidate.outcome === "network_blocked");
  if (networkBlocked.length > 0) warnings.push(`${networkBlocked.length} request(s) were refused by the network, not the site (${[...new Set(networkBlocked.map((c) => c.notes[0]?.split(":")[0]))].join(", ")}). This run is not proof of what those sources publish.`);
  if (thirdParty > 0) warnings.push(`${thirdParty} third-party nutrition link(s) were found and rejected. They are never used for core macros.`);
  if (otherMarketSkipped > 0) warnings.push(`${otherMarketSkipped} page(s) for other countries (not ${[...seedMarkets].join(", ")}) were skipped; they describe another market's menu.`);

  let changes: DiscoveryReport["changes"];
  if (options.previous) {
    const before = new Map(options.previous.candidates.filter((c) => c.sha256).map((c) => [urlKey(c.url), c.sha256!]));
    const after = new Map(all.filter((c) => c.sha256).map((c) => [urlKey(c.url), c.sha256!]));
    changes = {
      added: [...after.keys()].filter((key) => !before.has(key)),
      removed: [...before.keys()].filter((key) => !after.has(key)),
      changed: [...after.keys()].filter((key) => before.has(key) && before.get(key) !== after.get(key)),
      unchanged: [...after.keys()].filter((key) => before.get(key) === after.get(key)).length,
    };
  }

  const order: Record<CandidateOutcome, number> = { network_blocked: 6, client_rendered: 0, inspected: 0, auth_required: 1, unparsed: 2, not_captured: 3, skipped_budget: 4, blocked_by_robots: 5, network_error: 6, http_error: 7, not_found: 8, rejected_third_party: 9 };
  return {
    version: DISCOVERY_VERSION,
    restaurant: { id: target.id, name: target.name },
    mode: fetcher.mode,
    runAt,
    budget: { ...budget, requestsUsed },
    freshnessDays,
    storeIds: [...storeIds],
    platforms: [...platforms.values()],
    candidates: all.sort((a, b) => order[a.outcome] - order[b.outcome] || b.relevance - a.relevance || a.url.localeCompare(b.url)),
    coverage,
    gaps,
    macrosReady: CORE_NUTRIENTS.every((nutrient) => coverage.find((entry) => entry.need === nutrient)?.status === "found"),
    verifyCore,
    levels,
    ...(informationRequest ? { informationRequest } : {}),
    missingCore,
    proposedSources,
    changes,
    warnings,
  };
}

// A draft for the restaurant's guest relations team. Never sent by discovery.
export function renderInformationRequest(
  name: string,
  missing: CoreNutrient[],
  verify: CoreNutrient[],
  coverage: Coverage[],
  checked: Candidate[],
  statements: string[],
  contacts: string[],
  runAt: string,
): string {
  const label: Record<string, string> = { calories: "calories", protein: "protein (g)", carbs: "total carbohydrates (g)", totalFat: "total fat (g)" };
  const lines = [
    `# Nutrition information request: ${name}`,
    "",
    `> DRAFT, NOT SENT. Prepared by source discovery on ${runAt.slice(0, 10)}. Review and send only with the project owner's approval.`,
    "",
    `**Contacts found on official pages:** ${contacts.length > 0 ? contacts.join(", ") : "none found; use the restaurant's guest relations form"}`,
    "",
    "## Message",
    "",
    "Hello,",
    "",
    `We maintain a nutrition guide that lists ${name} menu items. Your published nutrition information does not include ${missing.filter((n) => !verify.includes(n)).map((n) => label[n]).join(", ") || "current values for every nutrient we need"}${verify.length > 0 ? `, and the only official source we found for ${verify.map((n) => label[n]).join(", ")} is older than 90 days` : ""}.`,
    "",
    "Could you share your current nutrition information for the full menu (each item, ingredient and topping, with portion sizes), including calories, protein, total carbohydrates and total fat? A PDF or spreadsheet is ideal. Please also tell us the date the data was last updated.",
    "",
    "Thank you.",
    "",
    "## Evidence for the reviewer",
    "",
    ...coverage.filter((entry) => (missing as string[]).includes(entry.need)).map((entry) => `- ${entry.need}: ${entry.status}${entry.verificationSources ? ` (older sources: ${entry.verificationSources.join(", ")})` : ""}`),
    ...(statements.length > 0 ? ["", "Official statements:", ...statements.map((statement) => `- "${statement}"`)] : []),
    "",
    `Sources checked (${checked.length}):`,
    ...checked.slice(0, 30).map((candidate) => `- ${candidate.url}${candidate.sourceUpdatedAt ? ` (updated ${candidate.sourceUpdatedAt})` : ""}`),
    "",
  ];
  return lines.join("\n");
}
