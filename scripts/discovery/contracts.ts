// Source discovery contracts (Phase 2, "Build automated source discovery").
//
// Discovery answers one question for any restaurant before an adapter is
// written: which public, official sources exist, and which of the data the
// pipeline needs does each one actually publish? It never extracts menu
// records and never fills a gap. A nutrient no discovered source publishes is
// reported as missing, with the leads that could not be inspected.
import type { CoreNutrient, NutrientKey, SourceDescriptor, SourceKind } from "../pipeline/contracts";

export const DISCOVERY_VERSION = 1;

// ── What to look for ─────────────────────────────────────────────────────

export type DiscoveryTarget = {
  // Restaurant id used by the pipeline (data/restaurants/staging/<id>/).
  id: string;
  name: string;
  // Domains the restaurant itself operates. Subdomains are included.
  officialDomains: string[];
  // Hosts that serve the restaurant's own ordering system (they may sit on a
  // platform's domain, e.g. order.<brand>.olo.com). Checked before
  // officialDomains, so orders.<brand>.com is "ordering_system".
  orderingDomains?: string[];
  // Extra starting points (a known nutrition page, a store's ordering page).
  seeds?: string[];
  // Store ids to fill in endpoint templates. Ids seen in crawled ordering URLs
  // are added automatically. Standards §7 wants at least two sampled stores.
  storeIds?: string[];
  // Freshness window in days. May only be shorter than the 90-day default
  // (standards §2.3).
  freshnessDays?: number;
  // Saved responses to replay instead of fetching live (see fetchers.ts).
  replay?: ReplayConfig;
};

export type ReplayConfig = {
  // An evidence-manifest.json: { files: [{ path, source_url, sha256? }] }.
  manifest: string;
  // Manifest entries that are derived extracts, not raw responses.
  exclude?: string[];
  // ISO time to use when a saved response has no Date header.
  capturedAt?: string;
};

export type DiscoveryBudget = {
  maxRequests: number;
  maxDepth: number;
  maxBundlesPerHost: number;
  maxSitemapUrls: number;
};

export const DEFAULT_BUDGET: DiscoveryBudget = {
  maxRequests: 60,
  maxDepth: 2,
  maxBundlesPerHost: 8,
  maxSitemapUrls: 2000,
};

// ── Fetching ─────────────────────────────────────────────────────────────

export type FetchResult = {
  url: string;
  finalUrl: string;
  // 0 means no response (network error, robots, or not in the replay set).
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  retrievedAt: string;
  // Why there is no response, when status is 0.
  failure?: "network_error" | "network_blocked" | "blocked_by_robots" | "not_captured" | "too_large";
  failureDetail?: string;
};

// A page loaded in a real browser: the rendered HTML, plus the JSON
// responses the page itself requested (passive capture, GET only).
export type RenderResult = { page: FetchResult; responses: FetchResult[] };

export interface Fetcher {
  readonly mode: "live" | "replay";
  fetch(url: string, init?: { accept?: string }): Promise<FetchResult>;
  // Present when a browser is available (browser.ts). Used at Level 2 for
  // nutrition pages whose HTML holds no values.
  render?(url: string): Promise<RenderResult>;
}

// ── What was found ───────────────────────────────────────────────────────

export type Authority = SourceDescriptor["authority"];

export type Channel =
  | "official_html" // a restaurant web page
  | "browser_rendered" // a page rendered in a headless browser, plus the JSON it loaded
  | "embedded_json" // structured data inside a page (__NEXT_DATA__, JSON-LD, …)
  | "api_json" // a JSON endpoint
  | "official_document" // PDF / CSV / spreadsheet
  | "js_bundle" // inspected only for endpoints and platform fingerprints
  | "site_index" // robots.txt, sitemap
  | "unknown";

export type CandidateOutcome =
  | "inspected" // fetched and analyzed
  | "auth_required" // 401/403: not usable anonymously; no workaround attempted
  | "not_found"
  | "http_error"
  | "network_error"
  | "blocked_by_robots"
  | "not_captured" // replay mode: no saved response for this URL
  | "unparsed" // fetched, but this format is not analyzed (e.g. .xlsx)
  | "rejected_third_party" // never used for core macros (standards §2.2)
  | "skipped_budget"
  // Only used on leads: a nutrition page whose values load in the browser.
  | "client_rendered"
  // The network refused the request before it reached the site (egress
  // proxy, DNS, TLS, or a bot challenge). Says nothing about the source.
  | "network_blocked";

// "values": numeric values were found for the nutrient.
// "mentioned": the word appears (ingredient list, marketing copy), no values.
export type NutrientPresence = "values" | "mentioned" | "absent";

export type NutrientSignal = { presence: NutrientPresence; count: number; example?: string };

export type MenuSignals = {
  // Named products/items in structured data.
  items: number;
  categories: number;
  // Option/modifier groups and selection limits (customization rules).
  optionGroups: number;
  selectionLimits: boolean;
  // Light/Regular/Extra, sizes, serving units.
  portions: boolean;
  allergens: boolean;
  ingredientDeclarations: boolean;
};

export type FreshnessEvidence = { value: string; from: string };

export type ContentAnalysis = {
  nutrients: Record<NutrientKey, NutrientSignal>;
  menu: MenuSignals;
  freshness: FreshnessEvidence[];
  // Embedded structured-data blocks found in an HTML page.
  embedded: Array<{ kind: string; bytes: number; nutrientsWithValues: NutrientKey[]; items: number }>;
  // Notable statements, e.g. "additional nutrition available upon request".
  statements: string[];
  title?: string;
};

export type Candidate = {
  url: string;
  finalUrl?: string;
  channel: Channel;
  authority: Authority;
  outcome: CandidateOutcome;
  status?: number;
  contentType?: string;
  bytes?: number;
  sha256?: string;
  retrievedAt?: string;
  // Best "last updated" evidence, ISO date when it could be parsed.
  sourceUpdatedAt?: string;
  depth: number;
  // How this URL was found: "seed", "well-known", "robots", "sitemap",
  // "link:<url>", "header-link:<url>", "platform:<id>", "wordpress".
  discoveredBy: string;
  relevance: number;
  analysis?: ContentAnalysis;
  platforms?: string[];
  // Discovery level that found it.
  level?: 1 | 2 | 3;
  notes: string[];
};

export type PlatformHit = { id: string; name: string; evidence: string; foundIn: string };

// ── Coverage, gaps, and the report ───────────────────────────────────────

export type DataNeed =
  | NutrientKey
  | "catalog"
  | "customization"
  | "portions"
  | "allergens"
  | "ingredients";

export type Coverage = {
  need: DataNeed;
  // found: a current source publishes it.
  // needs_verification: only sources whose own "last updated" date is older
  //   than the freshness window publish it. Still valid evidence; verify it.
  // unverified: no inspected source has it, but the network blocked sources
  //   that might, so "missing" cannot be claimed.
  // missing: public sources were checked and none publishes it.
  status: "found" | "needs_verification" | "unverified" | "missing";
  // Usable official / ordering-system candidates that publish it.
  sources: string[];
  // Sources older than the freshness window that publish it. Candidates for
  // comparison, neither approved nor discarded.
  verificationSources?: string[];
};

// A lead is a source that could hold missing data but could not be inspected.
export type InformationRequest = {
  status: "draft_not_sent";
  missing: CoreNutrient[];
  contacts: string[];
  markdown: string;
};

export type Lead = { url: string; outcome: CandidateOutcome; reason: string };

export type Gap = {
  need: DataNeed;
  core: boolean;
  message: string;
  leads: Lead[];
};

export type ProposedSource = Pick<SourceDescriptor, "id" | "kind" | "authority" | "url" | "retrievedAt" | "sourceUpdatedAt" | "sha256"> & {
  provides: DataNeed[];
  stale: boolean;
  // Content last updated longer ago than the freshness window: verify first.
  verificationRequired?: boolean;
  // Newer sources publishing some of the same nutrients, to compare against.
  compareWith?: string[];
};

export type DiscoveryReport = {
  version: typeof DISCOVERY_VERSION;
  restaurant: { id: string; name: string };
  mode: Fetcher["mode"];
  runAt: string;
  budget: DiscoveryBudget & { requestsUsed: number };
  freshnessDays: number;
  storeIds: string[];
  platforms: PlatformHit[];
  candidates: Candidate[];
  coverage: Coverage[];
  gaps: Gap[];
  // Core macros all found from usable official/ordering sources?
  macrosReady: boolean;
  // Core nutrients found only in sources that need verification.
  verifyCore: CoreNutrient[];
  // Which levels ran: 1 automatic, 2 deeper investigation, 3 escalation.
  levels: Array<{ level: 1 | 2 | 3; reason: string; requests: number }>;
  // Level 3: a drafted information request. Never sent automatically.
  informationRequest?: InformationRequest;
  informationRequestTracking?: { status: "sent"; reportedBy: "owner" };
  missingCore: CoreNutrient[];
  proposedSources: ProposedSource[];
  // Compared with the previous discovery run, by URL and sha256.
  changes?: { added: string[]; removed: string[]; changed: string[]; unchanged: number };
  warnings: string[];
};

export const CHANNEL_SOURCE_KIND: Partial<Record<Channel, SourceKind>> = {
  official_html: "official_html",
  embedded_json: "ordering_structured_data",
  api_json: "public_api",
  official_document: "official_document",
};
