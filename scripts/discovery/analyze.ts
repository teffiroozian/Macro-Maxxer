// Content analyzers for source discovery. Restaurant-independent.
//
// Each analyzer reports what a source *publishes*, never what it might imply.
// A nutrient counts as "values" only when numbers sit next to its label (or
// under a nutrition-table header, or under a nutrient key in JSON). A word in
// an ingredient list ("Whey Protein Concentrate") is only "mentioned".
import { ALL_NUTRIENTS, type NutrientKey } from "../pipeline/contracts";
import type { ContentAnalysis, FreshnessEvidence, NutrientSignal } from "./contracts";
import { NOTABLE_STATEMENTS, NUTRIENT_LABELS, nutrientForKey } from "./vocabulary";

// ── Building blocks ──────────────────────────────────────────────────────

export function emptyAnalysis(): ContentAnalysis {
  return {
    nutrients: Object.fromEntries(ALL_NUTRIENTS.map((key) => [key, { presence: "absent", count: 0 }])) as Record<NutrientKey, NutrientSignal>,
    menu: { items: 0, categories: 0, optionGroups: 0, selectionLimits: false, portions: false, allergens: false, ingredientDeclarations: false },
    freshness: [],
    embedded: [],
    statements: [],
  };
}

const PRESENCE_RANK = { absent: 0, mentioned: 1, values: 2 } as const;

function note(signal: NutrientSignal, presence: NutrientSignal["presence"], example?: string): void {
  signal.count += presence === "values" ? 1 : 0;
  if (PRESENCE_RANK[presence] > PRESENCE_RANK[signal.presence]) {
    signal.presence = presence;
    signal.example = example;
  } else if (!signal.example && example && presence === signal.presence) {
    signal.example = example;
  }
}

export function mergeAnalysis(into: ContentAnalysis, from: ContentAnalysis): ContentAnalysis {
  for (const key of ALL_NUTRIENTS) {
    const target = into.nutrients[key];
    const source = from.nutrients[key];
    const count = target.count + source.count;
    note(target, source.presence, source.example);
    target.count = count;
  }
  into.menu = {
    items: into.menu.items + from.menu.items,
    categories: into.menu.categories + from.menu.categories,
    optionGroups: into.menu.optionGroups + from.menu.optionGroups,
    selectionLimits: into.menu.selectionLimits || from.menu.selectionLimits,
    portions: into.menu.portions || from.menu.portions,
    allergens: into.menu.allergens || from.menu.allergens,
    ingredientDeclarations: into.menu.ingredientDeclarations || from.menu.ingredientDeclarations,
  };
  into.freshness.push(...from.freshness);
  into.embedded.push(...from.embedded);
  for (const statement of from.statements) if (!into.statements.some((known) => known.toLowerCase() === statement.toLowerCase())) into.statements.push(statement);
  into.title ??= from.title;
  return into;
}

export function nutrientsWithValues(analysis: ContentAnalysis): NutrientKey[] {
  return ALL_NUTRIENTS.filter((key) => analysis.nutrients[key].presence === "values");
}

// ── HTML ─────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#039": "'", rsquo: "'", lsquo: "'", ndash: "-", mdash: "-", trade: "™", reg: "®" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, code: string) => {
    const lower = code.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number(lower.slice(1)));
    return match;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|tr|li|h[1-6]|section|table|br)\s*>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\r]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export type ExtractedLink = { url: string; text: string; kind: "a" | "link" | "script" | "header" };

function absolute(href: string, base: string): string | undefined {
  const trimmed = decodeEntities(href.trim());
  if (!trimmed || /^(?:#|javascript:|mailto:|tel:|data:)/i.test(trimmed)) return undefined;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function extractLinks(html: string, baseUrl: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1];
    const url = href && absolute(href, baseUrl);
    if (url) links.push({ url, text: htmlToText(match[2]).slice(0, 120), kind: "a" });
  }
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1];
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1] ?? "";
    const url = href && absolute(href, baseUrl);
    if (url && /json|pdf/i.test(`${type} ${url}`) && !/oembed/i.test(`${type} ${url}`)) links.push({ url, text: type, kind: "link" });
  }
  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const url = absolute(match[1], baseUrl);
    if (url) links.push({ url, text: "", kind: "script" });
  }
  return links;
}

// RFC 8288 Link header, e.g. WordPress's <…/wp-json/wp/v2/pages/762>; rel="alternate"; type="application/json".
export function linksFromHeader(header: string | undefined, baseUrl: string): ExtractedLink[] {
  if (!header) return [];
  const links: ExtractedLink[] = [];
  for (const part of header.split(/,(?=\s*<)/)) {
    const match = /<([^>]+)>(.*)/.exec(part.trim());
    const url = match && absolute(match[1], baseUrl);
    if (url) links.push({ url, text: match[2].trim(), kind: "header" });
  }
  return links;
}

export type EmbeddedBlock = { kind: string; text: string };

export function extractEmbeddedJson(html: string): EmbeddedBlock[] {
  const blocks: EmbeddedBlock[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1];
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1]?.toLowerCase();
    const id = /\bid\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1];
    if (type === "application/ld+json") blocks.push({ kind: "json-ld", text: match[2] });
    else if (type === "application/json") blocks.push({ kind: id ?? "application/json", text: match[2] });
  }
  return blocks;
}

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const VISIBLE_UPDATED = new RegExp(`\\b(?:last\\s+)?(?:updated|revised|effective)(?:\\s+(?:on|as\\s+of))?:?\\s+((?:${MONTHS})\\.?,?\\s+(?:\\d{1,2},?\\s+)?\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\d{4}-\\d{2}-\\d{2})`, "gi");

export function toIsoDate(value: string): string | undefined {
  const cleaned = value.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const monthYear = new RegExp(`^(${MONTHS})\\.?\\s+(\\d{4})$`, "i").exec(cleaned);
  const parsed = Date.parse(monthYear ? `${monthYear[1]} 1 ${monthYear[2]} UTC` : /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(cleaned) ? `${cleaned}Z` : cleaned);
  if (Number.isNaN(parsed)) return undefined;
  const year = new Date(parsed).getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  return new Date(parsed).toISOString().slice(0, 10);
}

function htmlFreshness(html: string, text: string): FreshnessEvidence[] {
  const evidence: FreshnessEvidence[] = [];
  for (const property of ["article:modified_time", "og:updated_time", "last-modified", "dc.date.modified"]) {
    const pattern = new RegExp(`<meta[^>]+(?:property|name|http-equiv)=["']${property.replace(/[.:]/g, "\\$&")}["'][^>]*content=["']([^"']+)["']`, "i");
    const value = pattern.exec(html)?.[1];
    if (value) evidence.push({ value, from: `meta ${property}` });
  }
  for (const match of text.matchAll(VISIBLE_UPDATED)) evidence.push({ value: match[1], from: `page text "${match[0].trim()}"` });
  return evidence;
}

export type HtmlAnalysis = { analysis: ContentAnalysis; links: ExtractedLink[]; text: string };

export function analyzeHtml(html: string, baseUrl: string): HtmlAnalysis {
  const text = htmlToText(html);
  const analysis = analyzeText(text);
  analysis.title = htmlToText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "") || undefined;
  analysis.freshness.push(...htmlFreshness(html, text));
  for (const block of extractEmbeddedJson(html)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block.text);
    } catch {
      continue;
    }
    const embedded = analyzeJson(parsed);
    analysis.embedded.push({ kind: block.kind, bytes: block.text.length, nutrientsWithValues: nutrientsWithValues(embedded), items: embedded.menu.items });
    embedded.embedded = [];
    mergeAnalysis(analysis, embedded);
  }
  return { analysis, links: extractLinks(html, baseUrl), text };
}

// ── Plain text (pages, PDFs, CSVs) ───────────────────────────────────────

const VALUE_AFTER = /^\s*(?:\((?:g|mg|kcal|cal|grams?)\)|\[(?:g|mg|kcal)\])?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)(?!\s*%)(?!\d)/;
const VALUE_BEFORE = /(\d+(?:\.\d+)?)\s*(?:g|mg|kcal|cal|grams?)\s+(?:of\s+)?$/i;

type LabelHit = { nutrient: NutrientKey; index: number; label: string };

export function analyzeText(text: string): ContentAnalysis {
  const analysis = emptyAnalysis();
  const hits: LabelHit[] = [];
  for (const nutrient of ALL_NUTRIENTS) {
    for (const match of text.matchAll(NUTRIENT_LABELS[nutrient])) {
      hits.push({ nutrient, index: match.index ?? 0, label: match[0] });
      const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 24);
      const before = text.slice(Math.max(0, (match.index ?? 0) - 14), match.index ?? 0);
      const valued = VALUE_AFTER.test(after) || VALUE_BEFORE.test(before);
      const snippet = text.slice(Math.max(0, (match.index ?? 0) - 20), (match.index ?? 0) + match[0].length + 24).replace(/\s+/g, " ").trim();
      note(analysis.nutrients[nutrient], valued ? "values" : "mentioned", snippet);
    }
  }

  // Nutrition-table headers: "Calories | Total Fat (g) | … | Protein (g)"
  // followed by rows of numbers. A header needs a calorie label and at least
  // two other nutrient labels close together, in a document with many
  // numbers. Ingredient lists name nutrients but not calories.
  const numbers = text.match(/(?<![\w.])\d+(?:\.\d+)?(?![\w%])/g)?.length ?? 0;
  if (numbers >= 10) {
    hits.sort((a, b) => a.index - b.index);
    for (const anchor of hits.filter((hit) => hit.nutrient === "calories")) {
      const nearby = hits.filter((hit) => hit.index >= anchor.index - 200 && hit.index <= anchor.index + 250);
      const distinct = new Set(nearby.map((hit) => hit.nutrient));
      if (distinct.size < 3) continue;
      const header = text.slice(Math.max(0, anchor.index - 40), anchor.index + 160).replace(/\s+/g, " ").trim();
      for (const nutrient of distinct) note(analysis.nutrients[nutrient], "values", `table header: ${header}`);
    }
  }

  analysis.menu.portions = /\b(?:light|regular|extra)\b[\s\S]{0,40}\b(?:light|regular|extra)\b|\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|tbsp|cup|inch|-inch|")|\bper\s+(?:serving|tbsp|cup|slice)\b|\bquarter[\s-]cup\b/i.test(text);
  const allergenWords = text.match(/\b(?:milk|eggs?|soy|wheat|peanuts?|tree\s+nuts|sesame|fish|shellfish|gluten)\b/gi)?.length ?? 0;
  analysis.menu.allergens = /\ballergen/i.test(text) && allergenWords >= 5;
  analysis.menu.ingredientDeclarations = /\bingredients?\s*:|\b(?:contains\s+)?(?:2%|two percent)\s+or\s+less\b|\bless\s+than\s+2%/i.test(text);
  for (const pattern of NOTABLE_STATEMENTS) {
    const statement = pattern.exec(text)?.[0].replace(/\s+/g, " ").trim();
    if (statement && !analysis.statements.some((known) => known.toLowerCase() === statement.toLowerCase())) analysis.statements.push(statement);
  }
  return analysis;
}

// ── JSON ─────────────────────────────────────────────────────────────────

const norm = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
const ITEM_KEYS = new Set(["products", "items", "menuitems", "productlist"]);
const CATEGORY_KEYS = new Set(["categories", "menucategories", "sections", "menusections"]);
const GROUP_KEYS = new Set(["optiongroups", "modifiergroups", "modifiers", "customizations", "choicegroups", "addongroups"]);
const LIMIT_KEYS = new Set(["minselections", "maxselections", "minselect", "maxselect", "minchoices", "maxchoices", "minquantity", "maxquantity", "mandatory", "minimum", "maximum", "minimumselections", "maximumselections"]);
const PORTION_VALUE = /^(?:light|regular|extra|easy|double|small|medium|large|half|whole)\b/i;
const NAME_FIELDS = ["name", "label", "type", "nutrient", "key", "title"];
const VALUE_FIELDS = ["value", "amount", "quantity", "qty"];
const FRESHNESS_KEYS = new Set(["datemodified", "modifiedgmt", "modified", "updatedat", "lastupdated", "lastmodified"]);

const numeric = (value: unknown): value is number | string =>
  (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && /^\s*\d+(?:\.\d+)?\s*(?:g|mg|kcal|cal)?\s*$/i.test(value));

const isNamedObject = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value) && ["name", "title", "label", "displayname"].some((key) => Object.keys(value).some((k) => norm(k) === key));

export function analyzeJson(root: unknown): ContentAnalysis {
  const analysis = emptyAnalysis();
  const stack: unknown[] = [root];
  let visited = 0;
  while (stack.length > 0 && visited < 2_000_000) {
    const value = stack.pop();
    visited += 1;
    if (Array.isArray(value)) {
      for (const entry of value) if (entry && typeof entry === "object") stack.push(entry);
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;

    // { name: "Protein", value: 12 }
    const nameField = Object.keys(record).find((key) => NAME_FIELDS.includes(norm(key)) && typeof record[key] === "string");
    const valueField = Object.keys(record).find((key) => VALUE_FIELDS.includes(norm(key)));
    if (nameField && valueField) {
      const nutrient = nutrientForKey(String(record[nameField]));
      if (nutrient) note(analysis.nutrients[nutrient], numeric(record[valueField]) ? "values" : "mentioned", `${record[nameField]}: ${String(record[valueField])}`);
    }

    for (const [key, child] of Object.entries(record)) {
      const k = norm(key);
      const nutrient = nutrientForKey(key);
      if (nutrient && (child === null || typeof child !== "object")) {
        note(analysis.nutrients[nutrient], numeric(child) ? "values" : "mentioned", `${key}: ${String(child)}`);
      }
      if (Array.isArray(child)) {
        const named = child.filter(isNamedObject).length;
        if (ITEM_KEYS.has(k)) analysis.menu.items += named;
        else if (CATEGORY_KEYS.has(k)) analysis.menu.categories += named;
        else if (GROUP_KEYS.has(k)) analysis.menu.optionGroups += child.length;
        if ((k === "allergens" || k === "allergeninfo") && child.length > 0) analysis.menu.allergens = true;
        if (k === "ingredients" && child.length > 0) analysis.menu.ingredientDeclarations = true;
      } else if (typeof child === "string") {
        if (k === "ingredients" || k === "ingredientstatement") analysis.menu.ingredientDeclarations ||= child.trim().length > 0;
        if ((k === "name" || k === "label") && PORTION_VALUE.test(child)) analysis.menu.portions = true;
        if (FRESHNESS_KEYS.has(k) && toIsoDate(child)) analysis.freshness.push({ value: child, from: `json ${key}` });
      }
      if (LIMIT_KEYS.has(k) && (typeof child === "number" || typeof child === "boolean")) analysis.menu.selectionLimits = true;
      if (k === "servingsize" || k === "portion" || k === "size" || k === "sizes") analysis.menu.portions ||= child !== null && child !== "";
      if (child && typeof child === "object") stack.push(child);
    }
  }
  return analysis;
}

// URLs inside a JSON response (e.g. a WordPress media search's source_url).
// Absolute URLs, plus site-relative document paths ("/content/…/x.pdf",
// as CMS APIs such as AEM return them) resolved against base when given.
export function urlsInJson(root: unknown, base?: string): string[] {
  const urls = new Set<string>();
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (typeof value === "string") {
      if (/^https?:\/\/\S+$/.test(value)) urls.add(value);
      else if (base && /^\/[^\s/][^\s]*\.(?:pdf|csv|xlsx?)$/i.test(value)) urls.add(new URL(value, base).toString());
    } else if (value && typeof value === "object") {
      stack.push(...Object.values(value as Record<string, unknown>));
    }
  }
  return [...urls];
}

// ── JavaScript bundles ───────────────────────────────────────────────────

export type BundleAnalysis = {
  absoluteUrls: string[];
  apiHosts: string[];
  // Read-only looking API paths, e.g. "/v1/stores/${id}/menu".
  apiPaths: string[];
};

const UNSAFE_PATH = /basket|cart|checkout|payment|submit|order(?!ing)|login|auth|token|account|favorite|reward|promo|loyalty|password|signup|register|tip-amount|card|user|me\//i;
const MENU_PATH = /menu|nutrition|product|item|catalog/i;
const NOISE_HOST = /google|gstatic|facebook|sentry|heap|segment|hotjar|cookie|branch\.io|userway|doubleclick|cloudflare|jsdelivr|unpkg|placeholder|example\.com|localhost|amazonaws\.com|fonts\./i;

export function analyzeBundle(js: string): BundleAnalysis {
  const absoluteUrls = new Set<string>();
  for (const match of js.matchAll(/["'`](https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^"'`\s]*)?)["'`]/gi)) absoluteUrls.add(match[1]);
  const apiHosts = new Set<string>();
  for (const url of absoluteUrls) {
    const host = new URL(url).host;
    if (NOISE_HOST.test(host) || /^(?:dev|staging|sandbox|test)\./i.test(host)) continue;
    if (/(?:^|[.-])api[.-]|\/api\b|\/v\d+\b|graphql/i.test(url)) apiHosts.add(new URL(url).origin);
  }
  const apiPaths = new Set<string>();
  for (const match of js.matchAll(/["'`](\/(?:api\/)?v\d+(?:\.\d+)?\/[^"'`\s]{2,160})["'`]/g)) {
    if (MENU_PATH.test(match[1]) && !UNSAFE_PATH.test(match[1])) apiPaths.add(match[1]);
  }
  return { absoluteUrls: [...absoluteUrls], apiHosts: [...apiHosts], apiPaths: [...apiPaths] };
}

// ── robots.txt and sitemaps ──────────────────────────────────────────────

export type Robots = { disallow: string[]; allow: string[]; sitemaps: string[] };

export function parseRobots(text: string): Robots {
  const robots: Robots = { disallow: [], allow: [], sitemaps: [] };
  let applies = false;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "sitemap") {
      robots.sitemaps.push(value);
      continue;
    }
    if (field === "user-agent") {
      applies = lastWasAgent ? applies || value === "*" : value === "*";
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!applies) continue;
    if (field === "disallow" && value) robots.disallow.push(value);
    if (field === "allow" && value) robots.allow.push(value);
  }
  return robots;
}

function robotsPatternMatches(pattern: string, path: string): boolean {
  const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  return regex.test(path);
}

// Longest matching rule wins; Allow wins ties (RFC 9309).
export function robotsAllows(robots: Robots, url: string): boolean {
  const { pathname, search } = new URL(url);
  const path = `${pathname}${search}`;
  const longest = (rules: string[]) => Math.max(-1, ...rules.filter((rule) => robotsPatternMatches(rule, path)).map((rule) => rule.length));
  return longest(robots.allow) >= longest(robots.disallow);
}

export function parseSitemap(xml: string): { urls: string[]; sitemaps: string[] } {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => decodeEntities(match[1]));
  return /<sitemapindex\b/i.test(xml) ? { urls: [], sitemaps: locs } : { urls: locs, sitemaps: [] };
}

// ── Documents ────────────────────────────────────────────────────────────

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

export async function pdfText(body: Buffer, maxPages = 40): Promise<string> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJsModule;
  const task = pdfjs.getDocument({ data: new Uint8Array(body), verbosity: 0 });
  const document = await task.promise;
  const pages: string[] = [];
  for (let number = 1; number <= Math.min(document.numPages, maxPages); number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await task.destroy();
  return pages.join("\n");
}
