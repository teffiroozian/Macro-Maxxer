// Extraction contracts (Phase 2, "Implement API/JSON, official-file, and
// browser extraction").
//
// Extraction reads the sources Step 1 discovery proposed and turns each one
// into structured records, with full provenance, without interpreting them.
// It never joins sources, never resolves conflicts and never fills a gap:
// those are normalization and validation (later Phase 2 tasks). A value the
// source does not print is absent, a value the source prints but that is not
// a clean number keeps its raw text and is flagged, and every record says
// which source, which locator inside it, and when it was retrieved.
import type { CoreNutrient, NutrientKey, PartialNutrition, ServingBasis, SourceDescriptor } from "../pipeline/contracts";
import type { Channel, DataNeed } from "../discovery/contracts";

export const EXTRACTION_VERSION = 1;

// How the source was read. Mirrors discovery channels the extractor handles.
export type ExtractionMethod =
  | "api_json" // a JSON endpoint fetched anonymously
  | "embedded_json" // structured data inside a page (__NEXT_DATA__, JSON-LD, …)
  | "official_html" // an HTML nutrition table or row layout
  | "official_document" // PDF / CSV
  | "browser_rendered"; // a page rendered in a browser, plus the JSON it loaded

export const CHANNEL_METHOD: Partial<Record<Channel, ExtractionMethod>> = {
  api_json: "api_json",
  embedded_json: "embedded_json",
  official_html: "official_html",
  official_document: "official_document",
  browser_rendered: "browser_rendered",
};

// Freshness per standards §2.3: older than the window is "needs_verification".
// It is valid evidence to compare against, never approved or discarded here.
export type Freshness = "current" | "needs_verification" | "unknown_date";

export type Provenance = {
  sourceId: string;
  url: string;
  method: ExtractionMethod;
  retrievedAt: string;
  sha256?: string;
  // Where in the source: a JSON path ("menu.0.products.3"), a PDF
  // "page 2 · row 14", or an HTML "section Sauce · row 3".
  locator: string;
  // For JSON, the source's own id for the record.
  sourceRecordId?: string;
};

// A cell the source printed that is not a clean number ("< 1", "10w", "—").
export type UncleanValue = { nutrient: NutrientKey; raw: string; parsed?: number };

export type ExtractedNutrition = {
  // Only clean, published numbers. Absent = not printed. Never zero-filled.
  values: PartialNutrition;
  // The source's own text for every nutrient it printed, verbatim.
  raw: Partial<Record<NutrientKey, string>>;
  unclean: UncleanValue[];
  // Core nutrients this record does not publish.
  missingCore: CoreNutrient[];
  basis?: ServingBasis;
  // "320-640" style ranges are kept as text and flagged, not averaged.
  ranges?: Partial<Record<NutrientKey, [number, number]>>;
};

export type RecordKind =
  | "menu_item" // a product on the menu
  | "variant" // a size/crust/format of an item
  | "option_group" // a customization group with its selection limits
  | "option" // a choice inside a group (ingredient, add-on, preparation)
  | "portion" // light / regular / extra of an option
  | "nutrition_row" // a row of a published nutrition table not tied to the catalog
  | "ingredient_declaration"; // a component's published ingredient list and allergen marks

export type ExtractedRecord = {
  // Stable within one extraction: "<sourceId>#<locator>".
  id: string;
  kind: RecordKind;
  name: string;
  // Parent record (variant → item, group → item/option, option → group).
  parentId?: string;
  category?: string;
  description?: string;
  // Portion or serving text as printed ("4 oz", "1 slice", "Regular").
  servingText?: string;
  nutrition?: ExtractedNutrition;
  customization?: {
    minSelections: number | null;
    maxSelections: number | null;
    isDefault?: boolean;
    isAvailable?: boolean;
    hidden?: boolean;
  };
  allergens?: string[];
  ingredientsText?: string;
  provenance: Provenance;
  // "needs_verification" (stale source), "unclean_value", "range_value",
  // "name_carried_forward", "unavailable", …
  flags: string[];
};

export type SourceStatus =
  | "extracted"
  | "empty" // read fine, but no extractor recognized any records
  | "auth_required" // 401/403: never worked around
  | "network_blocked"
  | "not_captured" // replay: no saved response
  | "http_error"
  | "unsupported"; // e.g. a spreadsheet

export type SourceExtraction = {
  source: SourceDescriptor;
  method: ExtractionMethod;
  status: SourceStatus;
  statusDetail?: string;
  freshness: Freshness;
  ageDays?: number;
  // Discovery says this source is a stale comparison candidate.
  verificationRequired: boolean;
  // Which extractor recognized the content ("pdf-table", "json-menu:koala", …).
  extractors: string[];
  records: ExtractedRecord[];
  counts: Record<RecordKind, number>;
  // Records with a value for each nutrient.
  nutrientCounts: Partial<Record<NutrientKey, number>>;
  warnings: string[];
};

export type NeedCoverage = {
  need: DataNeed;
  // extracted: at least one current source yielded records for it.
  // needs_verification: only stale sources did.
  // not_extracted: discovery found it, extraction produced nothing.
  // unavailable: no source yielded it (discovery missing / blocked / auth).
  status: "extracted" | "needs_verification" | "not_extracted" | "unavailable";
  records: number;
  sources: string[];
  // What discovery reported for this need, for comparison.
  discoveryStatus?: string;
};

export type ExtractionReport = {
  version: typeof EXTRACTION_VERSION;
  restaurant: { id: string; name: string };
  mode: "live" | "replay";
  runAt: string;
  discovery: { runAt: string; mode: string; file: string };
  freshnessDays: number;
  sources: SourceExtraction[];
  // Sources discovery listed but extraction did not read, and why.
  skipped: Array<{ url: string; reason: string }>;
  coverage: NeedCoverage[];
  limitations: string[];
};
