import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type {
  ComboMealConfig,
  IngredientNutritionContexts,
  IngredientRelationshipNutrition,
  IngredientItem,
  ItemVariant,
  MenuItem,
  RestaurantCustomizationRules,
  ServingType,
} from "../../types/menu";
import type { Nutrition } from "../../types/nutrition";
import { sanitizeDisplayName } from "../lib/display-name";
import { VERIFIED_NUTRITION_MAPPINGS } from "./chick-fil-a-nutrition-mappings";

const MENU_PATH = resolve("data/raw/chick-fil-a/menu.json");
const NUTRITION_PATH = resolve("data/raw/chick-fil-a/nutrition.csv");
const ORDERING_NUTRITION_PATH = resolve(
  "data/raw/chick-fil-a/ordering-nutrition.json",
);
const ORDERING_NUTRITION_SOURCE_PATH = resolve(
  "data/raw/chick-fil-a/ordering-nutrition-source.json",
);
const ANALYSIS_PATH = resolve("data/raw/chick-fil-a/match-analysis.json");
const OUTPUT_PATH = resolve("data/generated/chick-fil-a/restaurant.json");
const UNRESOLVED_PATH = resolve("data/generated/chick-fil-a/unresolved.json");

type RawValue = string | number | boolean | null | undefined;

interface RawMenuEntry {
  itemGroupId?: RawValue;
  retailModifiedItemId?: RawValue;
  name?: RawValue;
  tag?: RawValue;
  pin?: RawValue;
  itemType?: RawValue;
  itemClass?: RawValue;
  itemGroupType?: RawValue;
  dayPart?: RawValue;
  meal?: RawValue;
  dotComVisible?: RawValue;
  isSellable?: RawValue;
  disabled?: RawValue;
  status?: RawValue;
  modifierType?: RawValue;
  modifierTypeGrouping?: RawValue;
  hideNutrition?: RawValue;
  defaultTag?: RawValue;
  servingSize?: RawValue;
  variation?: RawValue;
  minimum?: RawValue;
  maximum?: RawValue;
  thirdPartyMinimum?: RawValue;
  desktopImage?: RawValue;
  mobileImage?: RawValue;
  webImage?: RawValue;
  pdpImages?: RawValue;
  // Chick-fil-A's own differentiator label for one sibling within a variant
  // group: a single-letter size code ("S"/"M"/"L"), readable count text
  // ("5 ct"), or — notably — the exact component-choice name for a "cheese
  // SKU" sibling group ("Pepper Jack", "American", "No Cheese"). Preferred
  // over parsing it back out of the full item name.
  qtySizeAbbreviation?: RawValue;
}

interface RawCategory {
  name?: RawValue;
  tag?: RawValue;
  description?: RawValue;
  items: RawMenuEntry[];
}

interface RawItemGroup {
  itemGroupId: RawValue;
  items: RawMenuEntry[];
}

interface RawMenu {
  source?: unknown;
  version?: unknown;
  categories: RawCategory[];
  itemGroups: RawItemGroup[];
  generated?: {
    menuApi?: { requestDate?: unknown; location?: unknown };
    menuPublishing?: { publishDate?: unknown; menuHashCode?: unknown };
  };
}

type NutritionRow = {
  source_id: string;
  categories: string;
  name: string;
  serving_size: string;
  calories: string;
  total_fat: string;
  saturated_fat: string;
  trans_fat: string;
  cholesterol: string;
  sodium: string;
  total_carbohydrates: string;
  dietary_fiber: string;
  sugars: string;
  protein: string;
};

interface OrderingNutritionItem {
  tag?: unknown;
  name?: unknown;
  retailModifiedItemId?: unknown;
  servingSize?: unknown;
  posNutritionCategory?: unknown;
  nutrition?: unknown;
}

interface OrderingNutritionResponse {
  items: OrderingNutritionItem[];
}

interface OrderingNutritionSourceMetadata {
  source?: unknown;
  retrieved?: unknown;
  locationId?: unknown;
}

interface OrderingNutritionMatch {
  item: OrderingNutritionItem;
  defaultModifiers: OrderingNutritionItem[];
  nutrition: Nutrition;
  rule: "ordering_retail_modified_item_id_and_tag";
  // The ordering UI can mark a record as hidden from the customer-facing
  // nutrition display even when the backend still publishes a real,
  // unambiguous nutrition payload for it. We preserve that flag as
  // provenance metadata, but it must never by itself block attaching
  // official nutrition (see the zero/placeholder guard below).
  menuHidesNutrition: boolean;
}

type MatchStatus =
  | "exact_match"
  | "normalized_match"
  | "variant_rule_match"
  | "multiple_identical_official_matches"
  | "variant_container"
  | "ambiguous"
  | "no_match";

interface MatchResult {
  status: MatchStatus;
  rule: string | null;
  rows: NutritionRow[];
  reason: string | null;
}

interface AnalysisRecord {
  menuRecordId: string;
  recordType: string;
  status: MatchStatus;
  rule: string | null;
  nutritionMatches: Array<{ source_id: string }>;
}

interface MatchAnalysis {
  totals: {
    relevantLogicalMenuRecords: number;
    nutritionRows: number;
    classification: Record<MatchStatus, { count: number }>;
  };
  records: AnalysisRecord[];
}

interface Occurrence {
  entry: RawMenuEntry;
  origin: "category" | "itemGroup";
  sourceIndex: number;
  categoryName?: string;
  categoryIndex?: number;
  categoryItemIndex?: number;
  containingItemGroupId?: string;
}

interface LogicalRecord {
  menuRecordId: string;
  itemClass: "ITEM" | "ITEM_GROUPING" | "MODIFIER";
  itemGroupId?: string;
  retailModifiedItemId?: string;
  identitySource?: "menu" | "ordering_nutrition";
  occurrences: Occurrence[];
  categories: Set<string>;
}

// Every generated record falls into exactly one runtime role. Only
// "standalone_product" is meant to render as a normal browseable Menu card;
// every other role stays out of standard browsing/search/ranking surfaces
// (via sourceOnly) while remaining resolvable for internal relationships
// (variant selectors, combo option resolution, customization, nutrition).
// This is assigned generically from source-graph structure (itemClass,
// itemGroupId membership, the meal/itemType flags) — never from item names.
type MenuRecordRole =
  | "standalone_product"
  | "variant_child"
  | "ingredient"
  | "modifier"
  | "structural"
  | "deferred_meal_container";

type SourceTrace = {
  provider: "Chick-fil-A";
  menu: {
    recordId: string;
    itemClass: LogicalRecord["itemClass"];
    retailModifiedItemId?: string;
    itemGroupId?: string;
    referencedItemGroupIds: string[];
    containingItemGroupIds: string[];
    names: string[];
    tags: string[];
    pins: string[];
    itemTypes: string[];
    sellable: boolean;
    role: MenuRecordRole;
    identitySource?: "menu" | "ordering_nutrition";
    // Every official Chick-fil-A menu section this record is directly
    // listed under (before Macro Maxxer collapses it to one primary browse
    // category) — preserved for provenance even though only one category
    // ends up on the generated MenuItem itself. See classifyPrimaryBrowseCategory.
    officialCategories: string[];
  };
  nutrition?: {
    nutritionSource: "standalone_nutrition" | "ordering_system";
    sourceId?: string;
    candidateSourceIds?: string[];
    name: string;
    categories: string[];
    servingSize: number | string | null;
    matchStatus:
      | Exclude<MatchStatus, "ambiguous" | "no_match" | "variant_container">
      | "ordering_source_match";
    matchRule: string;
    attached: boolean;
    attachmentReason: "safe_match" | "withheld_entree_only_from_meal_container";
    orderingSourceUrl?: string;
    orderingRetailModifiedItemId?: string;
    orderingTag?: string;
    orderingDefaultModifierSourceIds?: string[];
    orderingMenuHidesNutrition?: boolean;
    derivation?: {
      rule: "official_per_unit_nutrition_times_official_quantity";
      quantity: number;
      quantitySource: "qtySizeAbbreviation";
      perUnitRetailModifiedItemId: string;
      perUnitNutritionSourceIds: string[];
    };
  };
  nutritionResolution?:
    | {
        status: "variant_container";
        candidateSourceIds: string[];
        resolution: "nutrition_attached_to_child_variants";
      }
    | {
        status: "contextual_modifier";
        candidateSourceIds: string[];
        resolution: "nutrition_selected_by_parent_relationship";
      };
};

type GeneratedVariant = Omit<ItemVariant, "nutrition"> & {
  nutrition?: Nutrition;
  source: SourceTrace;
};

type GeneratedMenuItem = Omit<MenuItem, "nutrition" | "variants"> & {
  nutrition?: Nutrition;
  variants?: GeneratedVariant[];
  sourceOnly?: boolean;
  nutritionDerivedFromVariants?: boolean;
  source: SourceTrace;
};

type GeneratedIngredient = Omit<IngredientItem, "nutrition" | "variants"> & {
  nutrition?: Nutrition;
  variants?: GeneratedVariant[];
  nutritionResolvedByContext?: true;
  source: SourceTrace;
};

function stringValue(value: RawValue): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: RawValue): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nestedNumber(value: unknown, path: string[]): number | undefined {
  let current = value;
  for (const property of path) {
    if (!isJsonObject(current)) return undefined;
    current = current[property];
  }
  return typeof current === "number" && Number.isFinite(current)
    ? current
    : undefined;
}

function nestedString(value: unknown, path: string[]): string | undefined {
  let current = value;
  for (const property of path) {
    if (!isJsonObject(current)) return undefined;
    current = current[property];
  }
  return stringValue(current as RawValue);
}

function orderingSourceId(item: OrderingNutritionItem): string | undefined {
  const retailModifiedItemId = stringValue(
    item.retailModifiedItemId as RawValue,
  );
  const tag = stringValue(item.tag as RawValue);
  return retailModifiedItemId && tag
    ? `retailModifiedItemId:${retailModifiedItemId}|tag:${tag}`
    : undefined;
}

function orderingNutritionComponent(
  item: OrderingNutritionItem,
): Required<Nutrition> | undefined {
  const nutrition = item.nutrition;
  const values: Required<Nutrition> = {
    calories: nestedNumber(nutrition, ["calories", "total"]) as number,
    protein: nestedNumber(nutrition, ["protein", "amount", "count"]) as number,
    carbs: nestedNumber(nutrition, ["carbs", "amount", "count"]) as number,
    totalFat: nestedNumber(nutrition, ["fat", "total", "amount", "count"]) as number,
    satFat: nestedNumber(nutrition, ["fat", "saturatedFat", "amount", "count"]) as number,
    transFat: nestedNumber(nutrition, ["fat", "transFat", "amount", "count"]) as number,
    cholesterol: nestedNumber(nutrition, ["cholesterol", "amount", "count"]) as number,
    sodium: nestedNumber(nutrition, ["sodium", "amount", "count"]) as number,
    fiber: nestedNumber(nutrition, ["fiber", "amount", "count"]) as number,
    sugars: nestedNumber(nutrition, ["sugar", "amount", "count"]) as number,
  };
  return Object.values(values).every(
    (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
  )
    ? values
    : undefined;
}

function combineOrderingNutrition(
  items: OrderingNutritionItem[],
): Nutrition | undefined {
  const components = items.map(orderingNutritionComponent);
  if (components.some((component) => component === undefined)) return undefined;
  const nutritionFields = [
    "calories",
    "protein",
    "carbs",
    "totalFat",
    "satFat",
    "transFat",
    "cholesterol",
    "sodium",
    "fiber",
    "sugars",
  ] as const;
  return Object.fromEntries(
    nutritionFields.map((field) => [
      field,
      Number(
        components
          .reduce((total, component) => total + (component?.[field] ?? 0), 0)
          .toFixed(3),
      ),
    ]),
  ) as Required<Nutrition>;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("nutrition.csv ends inside a quoted field.");
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function readNutritionRows(text: string): NutritionRow[] {
  const [header, ...dataRows] = parseCsv(text);
  if (!header) throw new Error("nutrition.csv is empty.");

  const requiredColumns: Array<keyof NutritionRow> = [
    "source_id",
    "categories",
    "name",
    "serving_size",
    "calories",
    "total_fat",
    "saturated_fat",
    "trans_fat",
    "cholesterol",
    "sodium",
    "total_carbohydrates",
    "dietary_fiber",
    "sugars",
    "protein",
  ];
  const indexes = new Map(header.map((column, index) => [column, index]));

  for (const column of requiredColumns) {
    if (!indexes.has(column)) {
      throw new Error(`nutrition.csv is missing the ${column} column.`);
    }
  }

  return dataRows
    .filter((row) => row.some((field) => field !== ""))
    .map((row, rowIndex) => {
      const value = (column: keyof NutritionRow): string =>
        row[indexes.get(column) as number] ?? "";
      const record = Object.fromEntries(
        requiredColumns.map((column) => [column, value(column)]),
      ) as NutritionRow;
      if (!record.source_id || !record.name) {
        throw new Error(`nutrition.csv row ${rowIndex + 2} lacks an ID or name.`);
      }
      return record;
    });
}

// The single choke point for a record's user-facing display name — every
// `name`/`label` field shown to a Macro Maxxer user should route through
// this (or through deriveVariantLabel, which sanitizes internally), never
// read `namesFor(record)[0]` directly for display purposes.
function displayNameFor(record: LogicalRecord): string {
  return sanitizeDisplayName(namesFor(record)[0] ?? standardId(record));
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/<\/?sup\b[^>]*>/gi, "")
    .replace(/[®™℠]/g, "")
    .replace(/[’‘‛`´]/g, "'")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function nutritionPayloadSignature(row: NutritionRow): string {
  return JSON.stringify([
    row.serving_size,
    row.calories,
    row.total_fat,
    row.saturated_fat,
    row.trans_fat,
    row.cholesterol,
    row.sodium,
    row.total_carbohydrates,
    row.dietary_fiber,
    row.sugars,
    row.protein,
  ]);
}

function rowsHaveIdenticalUsableNutrition(rows: NutritionRow[]): boolean {
  return (
    rows.length > 1 &&
    new Set(rows.map(nutritionPayloadSignature)).size === 1
  );
}

function requiredNumber(value: string, label: string, sourceId: string): number {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isFinite(parsed)) {
    throw new Error(`Nutrition ${sourceId} has no valid ${label}.`);
  }
  return parsed;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toNutrition(row: NutritionRow): Nutrition {
  const nutrition: Nutrition = {
    calories: requiredNumber(row.calories, "calories", row.source_id),
    protein: requiredNumber(row.protein, "protein", row.source_id),
    carbs: requiredNumber(
      row.total_carbohydrates,
      "total carbohydrates",
      row.source_id,
    ),
    totalFat: requiredNumber(row.total_fat, "total fat", row.source_id),
  };
  const optionalFields: Array<[keyof Nutrition, string]> = [
    ["satFat", row.saturated_fat],
    ["transFat", row.trans_fat],
    ["cholesterol", row.cholesterol],
    ["sodium", row.sodium],
    ["fiber", row.dietary_fiber],
    ["sugars", row.sugars],
  ];
  for (const [field, rawValue] of optionalFields) {
    const value = optionalNumber(rawValue);
    if (value !== undefined) nutrition[field] = value;
  }
  return nutrition;
}

function buildLogicalRecords(menu: RawMenu): LogicalRecord[] {
  const records = new Map<string, LogicalRecord>();
  let sourceIndex = 0;

  const addOccurrence = (
    entry: RawMenuEntry,
    occurrence: Omit<Occurrence, "entry" | "sourceIndex">,
  ): void => {
    const itemClass = stringValue(entry.itemClass);
    const retailModifiedItemId = stringValue(entry.retailModifiedItemId);
    const itemGroupId = stringValue(entry.itemGroupId);
    let menuRecordId: string | undefined;

    if (itemClass === "ITEM_GROUPING" && occurrence.origin === "category") {
      if (itemGroupId) menuRecordId = `itemGroupId:${itemGroupId}`;
    } else if (
      (itemClass === "ITEM" || itemClass === "MODIFIER") &&
      retailModifiedItemId
    ) {
      menuRecordId = `retailModifiedItemId:${retailModifiedItemId}`;
    }
    if (!menuRecordId) return;

    const existing = records.get(menuRecordId);
    if (existing && existing.itemClass !== itemClass) {
      throw new Error(`${menuRecordId} occurs with conflicting item classes.`);
    }
    const record =
      existing ??
      ({
        menuRecordId,
        itemClass: itemClass as LogicalRecord["itemClass"],
        itemGroupId: itemClass === "ITEM_GROUPING" ? itemGroupId : undefined,
        retailModifiedItemId,
        occurrences: [],
        categories: new Set<string>(),
      } satisfies LogicalRecord);
    record.occurrences.push({ entry, sourceIndex, ...occurrence });
    if (occurrence.categoryName) record.categories.add(occurrence.categoryName);
    sourceIndex += 1;
    records.set(menuRecordId, record);
  };

  menu.categories.forEach((category, categoryIndex) => {
    const categoryName = stringValue(category.name) ?? `Category ${categoryIndex + 1}`;
    category.items.forEach((entry, categoryItemIndex) => {
      addOccurrence(entry, {
        origin: "category",
        categoryName,
        categoryIndex,
        categoryItemIndex,
      });
    });
  });

  menu.itemGroups.forEach((group) => {
    const containingItemGroupId = stringValue(group.itemGroupId);
    group.items.forEach((entry) => {
      const itemClass = stringValue(entry.itemClass);
      if (itemClass !== "ITEM" && itemClass !== "MODIFIER") return;
      addOccurrence(entry, {
        origin: "itemGroup",
        containingItemGroupId,
      });
    });
  });

  const groupById = new Map(
    menu.itemGroups.flatMap((group) => {
      const id = stringValue(group.itemGroupId);
      return id ? [[id, group] as const] : [];
    }),
  );

  const assignDescendantCategories = (
    itemGroupId: string,
    categoryName: string,
    visited: Set<string>,
  ): void => {
    if (visited.has(itemGroupId)) return;
    visited.add(itemGroupId);
    for (const entry of groupById.get(itemGroupId)?.items ?? []) {
      const itemClass = stringValue(entry.itemClass);
      if (itemClass === "ITEM") {
        const retailId = stringValue(entry.retailModifiedItemId);
        if (retailId) {
          records.get(`retailModifiedItemId:${retailId}`)?.categories.add(categoryName);
        }
      } else if (itemClass === "ITEM_GROUPING") {
        const childGroupId = stringValue(entry.itemGroupId);
        if (childGroupId) {
          records.get(`itemGroupId:${childGroupId}`)?.categories.add(categoryName);
          assignDescendantCategories(childGroupId, categoryName, visited);
        }
      }
    }
  };

  for (const category of menu.categories) {
    const categoryName = stringValue(category.name);
    if (!categoryName) continue;
    for (const entry of category.items) {
      if (stringValue(entry.itemClass) !== "ITEM_GROUPING") continue;
      // A meal container's own itemGroup subtree bundles its entree/side/
      // beverage OPTIONS purely so comboConfig can be built (see
      // collectMealRoles below) — being offered as a choice inside a meal
      // does not make that product a member of the meal's browse category
      // (Coffee offered inside a Breakfast meal is not itself "Breakfast").
      // Only a product's own direct category listing should establish
      // browse-category ownership, so meal containers are excluded from
      // this descendant-category walk entirely. This mirrors isMealRecord's
      // structural signal (entry.meal / itemType) rather than any name check.
      const isMealEntry =
        entry.meal === true || stringValue(entry.itemType)?.includes("MEAL") === true;
      if (isMealEntry) continue;
      const itemGroupId = stringValue(entry.itemGroupId);
      if (itemGroupId) {
        assignDescendantCategories(itemGroupId, categoryName, new Set());
      }
    }
  }

  return [...records.values()];
}

function namesFor(record: LogicalRecord): string[] {
  return unique(
    record.occurrences.flatMap((occurrence) => {
      const name = stringValue(occurrence.entry.name);
      return name ? [name] : [];
    }),
  );
}

function sourceValues(
  record: LogicalRecord,
  field: keyof RawMenuEntry,
): string[] {
  return unique(
    record.occurrences.flatMap((occurrence) => {
      const value = stringValue(occurrence.entry[field] as RawValue);
      return value ? [value] : [];
    }),
  );
}

function modifierSelectionRole(
  entry: RawMenuEntry,
): "included" | "available" | "unknown" {
  const modifierType = stringValue(entry.modifierType);
  if (
    modifierType === "DEFAULT" ||
    modifierType === "RECIPE" ||
    modifierType === "NO_REFUND_RECIPE"
  ) {
    return "included";
  }
  if (modifierType === "EXTRA") return "available";
  return "unknown";
}

function matchNutrition(
  record: LogicalRecord,
  exactRows: Map<string, NutritionRow[]>,
  normalizedRows: Map<string, NutritionRow[]>,
  nutritionById: Map<string, NutritionRow>,
  variantContainer: boolean,
): MatchResult {
  const verified = record.retailModifiedItemId
    ? VERIFIED_NUTRITION_MAPPINGS[record.retailModifiedItemId]
    : undefined;
  const verifiedRow = verified
    ? nutritionById.get(verified.nutritionSourceId)
    : undefined;
  if (verified && !verifiedRow) {
    throw new Error(
      `Verified mapping ${record.retailModifiedItemId} targets missing nutrition ID ${verified.nutritionSourceId}.`,
    );
  }
  const verifiedResult = (): MatchResult | undefined =>
    verified && verifiedRow
      ? {
          status: "variant_rule_match",
          rule: verified.rule,
          rows: [verifiedRow],
          reason: null,
        }
      : undefined;
  const exactCandidates = unique(
    namesFor(record).flatMap((name) => exactRows.get(name) ?? []),
  );
  if (exactCandidates.length === 1) {
    return {
      status: "exact_match",
      rule: "unique_exact_name",
      rows: exactCandidates,
      reason: null,
    };
  }
  if (exactCandidates.length > 1) {
    if (rowsHaveIdenticalUsableNutrition(exactCandidates)) {
      return {
        status: "multiple_identical_official_matches",
        rule: "multiple_exact_rows_identical_serving_and_nutrition",
        rows: exactCandidates,
        reason: "Multiple exact-name official rows share the same serving size and nutrition payload.",
      };
    }
    const verifiedExact = verifiedResult();
    if (
      verifiedExact &&
      exactCandidates.some((row) => row.source_id === verifiedExact.rows[0].source_id)
    ) {
      return verifiedExact;
    }
    if (variantContainer) {
      return {
        status: "variant_container",
        rule: "nutrition_attached_to_child_variants",
        rows: exactCandidates,
        reason: "This non-sellable family container has distinct child variants; no generic nutrition row is attached to the container.",
      };
    }
    return {
      status: "ambiguous",
      rule: "exact_name_multiple_targets",
      rows: exactCandidates,
      reason: "Exact name matching produced multiple nutrition source rows.",
    };
  }

  const normalizedCandidates = unique(
    namesFor(record).flatMap(
      (name) => normalizedRows.get(normalizeName(name)) ?? [],
    ),
  );
  if (normalizedCandidates.length === 1) {
    return {
      status: "normalized_match",
      rule: "safe_name_normalization",
      rows: normalizedCandidates,
      reason: null,
    };
  }
  if (normalizedCandidates.length > 1) {
    if (rowsHaveIdenticalUsableNutrition(normalizedCandidates)) {
      return {
        status: "multiple_identical_official_matches",
        rule: "multiple_normalized_rows_identical_serving_and_nutrition",
        rows: normalizedCandidates,
        reason: "Multiple safely normalized official rows share the same serving size and nutrition payload.",
      };
    }
    const verifiedNormalized = verifiedResult();
    if (
      verifiedNormalized &&
      normalizedCandidates.some(
        (row) => row.source_id === verifiedNormalized.rows[0].source_id,
      )
    ) {
      return verifiedNormalized;
    }
    if (variantContainer) {
      return {
        status: "variant_container",
        rule: "nutrition_attached_to_child_variants",
        rows: normalizedCandidates,
        reason: "This non-sellable family container has distinct child variants; no generic nutrition row is attached to the container.",
      };
    }
    return {
      status: "ambiguous",
      rule: "normalized_name_multiple_targets",
      rows: normalizedCandidates,
      reason: "Safe normalized-name matching produced multiple nutrition rows.",
    };
  }

  const verifiedFallback = verifiedResult();
  if (verifiedFallback) return verifiedFallback;

  return {
    status: "no_match",
    rule: null,
    rows: [],
    reason: "No unique exact, safe normalized, or source-ID-verified match exists.",
  };
}

function validateAgainstAnalysis(
  records: LogicalRecord[],
  matches: Map<string, MatchResult>,
  nutritionRows: NutritionRow[],
  analysis: MatchAnalysis,
): void {
  if (records.length !== analysis.totals.relevantLogicalMenuRecords) {
    throw new Error(
      `Importer found ${records.length} logical records; verified analysis expects ${analysis.totals.relevantLogicalMenuRecords}.`,
    );
  }
  if (nutritionRows.length !== analysis.totals.nutritionRows) {
    throw new Error(
      `Importer found ${nutritionRows.length} nutrition rows; verified analysis expects ${analysis.totals.nutritionRows}.`,
    );
  }

  const analysisById = new Map(
    analysis.records.map((record) => [record.menuRecordId, record]),
  );
  for (const record of records) {
    const expected = analysisById.get(record.menuRecordId);
    const actual = matches.get(record.menuRecordId);
    if (!expected || !actual) {
      throw new Error(`Verified match decision is missing for ${record.menuRecordId}.`);
    }
    const expectedIds = expected.nutritionMatches
      .map((row) => String(row.source_id))
      .sort();
    const actualIds = actual.rows.map((row) => row.source_id).sort();
    const expectedStatusMatches =
      expected.status === actual.status ||
      (expected.status === "ambiguous" &&
        actual.status === "multiple_identical_official_matches" &&
        rowsHaveIdenticalUsableNutrition(actual.rows)) ||
      (expected.status === "ambiguous" &&
        actual.status === "variant_rule_match" &&
        actual.rule === "verified_variant_source_identity") ||
      (expected.status === "ambiguous" && actual.status === "variant_container");
    const expectedIdsMatch =
      expected.status === "ambiguous" &&
      actual.status === "variant_rule_match" &&
      actual.rule === "verified_variant_source_identity"
        ? actualIds.length === 1 && expectedIds.includes(actualIds[0])
        : JSON.stringify(expectedIds) === JSON.stringify(actualIds);
    if (
      !expectedStatusMatches ||
      !expectedIdsMatch
    ) {
      throw new Error(
        `Matching drift for ${record.menuRecordId}: computed ${actual.status} [${actualIds.join(", ")}], expected ${expected.status} [${expectedIds.join(", ")}].`,
      );
    }
  }

  const identicalUpgradeCount = [...matches.values()].filter(
    (match) => match.status === "multiple_identical_official_matches",
  ).length;
  const verifiedAmbiguityUpgradeCount = records.filter((record) => {
    const expected = analysisById.get(record.menuRecordId);
    const actual = matches.get(record.menuRecordId);
    return expected?.status === "ambiguous" &&
      actual?.status === "variant_rule_match" &&
      actual.rule === "verified_variant_source_identity";
  }).length;
  const variantContainerCount = [...matches.values()].filter(
    (match) => match.status === "variant_container",
  ).length;
  const expectedCounts: Record<MatchStatus, number> = {
    exact_match: analysis.totals.classification.exact_match.count,
    normalized_match: analysis.totals.classification.normalized_match.count,
    variant_rule_match:
      analysis.totals.classification.variant_rule_match.count + verifiedAmbiguityUpgradeCount,
    multiple_identical_official_matches: identicalUpgradeCount,
    variant_container: variantContainerCount,
    ambiguous:
      analysis.totals.classification.ambiguous.count -
      identicalUpgradeCount -
      verifiedAmbiguityUpgradeCount -
      variantContainerCount,
    no_match: analysis.totals.classification.no_match.count,
  };
  for (const status of [
    "exact_match",
    "normalized_match",
    "variant_rule_match",
    "multiple_identical_official_matches",
    "variant_container",
    "ambiguous",
    "no_match",
  ] as const) {
    const count = [...matches.values()].filter((match) => match.status === status)
      .length;
    if (count !== expectedCounts[status]) {
      throw new Error(
        `${status} count ${count} differs from verified/derived count ${expectedCounts[status]}.`,
      );
    }
  }
}

function primaryOccurrence(record: LogicalRecord): Occurrence {
  const occurrence = record.occurrences[0];
  if (!occurrence) throw new Error(`${record.menuRecordId} has no occurrence.`);
  return occurrence;
}

function isIngredientRecord(record: LogicalRecord): boolean {
  return (
    record.itemClass === "MODIFIER" &&
    sourceValues(record, "itemType").every((itemType) => itemType === "INGREDIENTS")
  );
}

function standardId(record: LogicalRecord): string {
  if (record.itemClass === "ITEM_GROUPING") {
    return `cfa-group-${record.itemGroupId}`;
  }
  if (record.itemClass === "MODIFIER") {
    return `${isIngredientRecord(record) ? "cfa-modifier" : "cfa-addon"}-${record.retailModifiedItemId}`;
  }
  return `cfa-item-${record.retailModifiedItemId}`;
}

function imageFor(record: LogicalRecord): string {
  if (sourceValues(record, "tag").includes("HOT_SAUCE")) {
    for (const occurrence of record.occurrences) {
      const image = stringValue(occurrence.entry.mobileImage);
      if (image) return image;
    }
  }
  for (const field of [
    "desktopImage",
    "pdpImages",
    "webImage",
    "mobileImage",
  ] as const) {
    for (const occurrence of record.occurrences) {
      const image = stringValue(occurrence.entry[field]);
      if (image) return image;
    }
  }
  return "none";
}

// Generic (not product-specific) expansion for the handful of single-letter
// size codes Chick-fil-A's own qtySizeAbbreviation field uses. Any other
// value (a count like "5 ct", or a component-choice name like "Pepper
// Jack") already reads fine as-is and passes through unchanged.
const SIZE_ABBREVIATION_LABELS: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
  K: "Kids",
  C: "Cup",
  B: "Bowl",
};

function formatQtySizeAbbreviation(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (SIZE_ABBREVIATION_LABELS[upper]) return SIZE_ABBREVIATION_LABELS[upper];
  // "5 ct" / "8 ct" -> "5 Ct" / "8 Ct": capitalize the unit, keep the count.
  const countMatch = raw.trim().match(/^(\d+)\s*ct$/i);
  if (countMatch) return `${countMatch[1]} Ct`;
  // Anything else (a component-choice name like "Pepper Jack" or "No
  // Cheese") is already a clean, human-readable label straight from the
  // source — use it verbatim rather than guessing at further formatting.
  return raw.trim();
}

// Falls back to comparing a sibling's full name against the parent/logical
// product's name when the source has no qtySizeAbbreviation for this
// record, extracting only the token(s) that differ (e.g. "Small" out of
// "Small Chick-fil-A Waffle Potato Fries®" vs "Chick-fil-A Waffle Potato
// Fries®"). Never invoked for records that already have a source label.
function diffAgainstParentName(parentName: string, childName: string): string {
  const strip = (value: string) =>
    value
      .replace(/<[^>]+>/g, "")
      .replace(/[®™]/g, "")
      .trim();
  const parentTokens = strip(parentName).split(/\s+/).filter(Boolean);
  const childTokens = strip(childName).split(/\s+/).filter(Boolean);
  const parentCounts = new Map<string, number>();
  for (const token of parentTokens) {
    const key = token.toLowerCase();
    parentCounts.set(key, (parentCounts.get(key) ?? 0) + 1);
  }
  const remainder = childTokens.filter((token) => {
    const key = token.toLowerCase();
    const remaining = parentCounts.get(key) ?? 0;
    if (remaining > 0) {
      parentCounts.set(key, remaining - 1);
      return false;
    }
    return true;
  });
  return remainder.length > 0 ? remainder.join(" ") : strip(childName);
}

function displayNameTokens(value: string): string[] {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[®™]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function comparableToken(value: string): string {
  return normalizeName(value);
}

function singularComparableToken(value: string): string {
  const comparable = comparableToken(value);
  return comparable.length > 3 && comparable.endsWith("s")
    ? comparable.slice(0, -1)
    : comparable;
}

// Derive the visible labels from the entire sibling set, not just from each
// child versus its parent. This preserves a meaningful shared suffix when it
// is itself the choice ("Lemonade" / "Diet Lemonade"), while removing a
// repeated product-family suffix when it is not ("Coke Float" / "Sprite
// Float" -> "Coke" / "Sprite"). Official full names remain in source.menu.
function diffAcrossSiblingNames(childNames: string[], childIndex: number): string | undefined {
  if (childNames.length < 2) return undefined;
  const siblings = childNames.map(displayNameTokens);
  const shortestLength = Math.min(...siblings.map((tokens) => tokens.length));
  let commonPrefixLength = 0;
  while (
    commonPrefixLength < shortestLength &&
    siblings.every(
      (tokens) =>
        comparableToken(tokens[commonPrefixLength]) ===
        comparableToken(siblings[0][commonPrefixLength]),
    )
  ) {
    commonPrefixLength += 1;
  }
  // If one sibling is exactly the common prefix, retain its last word as the
  // base choice instead of reducing that sibling to an empty label.
  const prefixToStrip = siblings.some(
    (tokens) => tokens.length === commonPrefixLength,
  )
    ? Math.max(0, commonPrefixLength - 1)
    : commonPrefixLength;
  const remainders = siblings.map((tokens) => tokens.slice(prefixToStrip));
  const shortestRemainderLength = Math.min(
    ...remainders.map((tokens) => tokens.length),
  );
  let commonSuffixLength = 0;
  while (
    commonSuffixLength < shortestRemainderLength &&
    remainders.every((tokens) => {
      const index = tokens.length - commonSuffixLength - 1;
      const firstIndex = remainders[0].length - commonSuffixLength - 1;
      return (
        comparableToken(tokens[index]) ===
        comparableToken(remainders[0][firstIndex])
      );
    })
  ) {
    commonSuffixLength += 1;
  }
  // Strip a shared family suffix only when every sibling retains an actual
  // differentiator. If one sibling consists solely of that suffix, the
  // suffix is the base choice and must remain visible.
  const suffixToStrip = remainders.every(
    (tokens) => tokens.length > commonSuffixLength,
  )
    ? commonSuffixLength
    : 0;
  const tokens = remainders[childIndex]?.slice(
    0,
    suffixToStrip > 0 ? -suffixToStrip : undefined,
  );
  if (!tokens?.length) return undefined;
  let label = tokens.join(" ").replace(/^w\/\s*/i, "").trim();
  const substitution = /^(.+?)\s+w\/\s+(.+)$/i.exec(label);
  if (substitution) {
    const base = normalizeName(substitution[1]);
    const replacement = normalizeName(substitution[2]);
    if (replacement.endsWith(base)) label = substitution[2].trim();
  }
  return label || undefined;
}

// A genuine variant sibling's name always shares at least one meaningful
// token with its family's own name — a size ("Small Chick-fil-A Waffle
// Potato Fries" ~ "Chick-fil-A Waffle Potato Fries"), a flavor ("Caramel
// Iced Coffee" ~ "Iced Coffee"), or a cheese choice ("Spicy Deluxe Sandwich
// w/ Pepper Jack" ~ "Spicy Deluxe Sandwich"). Chick-fil-A's feed sometimes
// bundles an unrelated item into a family's itemGroup anyway (e.g. "Bag of
// Ice" listed as if it were one of the "Gallon Beverages" flavors) — zero
// name-token overlap is the generic signal that a listed child isn't really
// part of that product family at all.
function sharesNameTokenWithParent(parentName: string, childName: string): boolean {
  const strip = (value: string) =>
    value
      .replace(/<[^>]+>/g, "")
      .replace(/[®™]/g, "")
      .trim()
      .toLowerCase();
  const parentTokens = new Set(
    strip(parentName)
      .split(/\s+/)
      .filter(Boolean)
      .map(singularComparableToken),
  );
  const childTokens = strip(childName).split(/\s+/).filter(Boolean);
  return childTokens.some((token) => parentTokens.has(singularComparableToken(token)));
}

// Visible variant label: only the part that differentiates this sibling
// from the others (Small/Medium/Large, 5 Ct/8 Ct, Pepper Jack/American/...)
// rather than the full repeated product name. The full official name is
// preserved separately and unconditionally in source.menu.names — this only
// changes what's shown as the variant's display label.
//
// `trustSizeAbbreviation` is decided per GROUP, not per child: Chick-fil-A's
// feed sometimes stamps qtySizeAbbreviation "S" on exactly one sibling of an
// otherwise flavor-differentiated group (e.g. one of five Iced Coffee
// flavors) as a data quirk, not a real size dimension — if every sibling in
// the group used it as a real differentiator, every sibling would carry it.
// Only honor it when the WHOLE group agrees it's the group's differentiator;
// otherwise every sibling falls back to name-diffing for consistency, which
// correctly recovers the real flavor name in the stray-quirk case.
function deriveVariantLabel(
  parentName: string,
  child: LogicalRecord,
  trustSizeAbbreviation: boolean,
  siblingNames: string[],
  childIndex: number,
): string {
  const childName = namesFor(child)[0] ?? standardId(child);
  const qtySizeAbbreviation = sourceValues(child, "qtySizeAbbreviation")[0];
  if (trustSizeAbbreviation && qtySizeAbbreviation) {
    return sanitizeDisplayName(formatQtySizeAbbreviation(qtySizeAbbreviation));
  }
  return sanitizeDisplayName(
    diffAcrossSiblingNames(siblingNames, childIndex) ??
      diffAgainstParentName(parentName, childName),
  );
}

function displayNameForVariantFamily(
  record: LogicalRecord,
  variants: GeneratedVariant[],
): string {
  const displayName = displayNameFor(record);
  const tokens = displayNameTokens(displayName);
  const isCustomerVisibleOfficialParent = record.occurrences.some(
    (occurrence) =>
      occurrence.origin === "category" && occurrence.entry.dotComVisible === true,
  );
  if (
    !isCustomerVisibleOfficialParent ||
    tokens.length !== 1 ||
    !tokens[0].toLowerCase().endsWith("s")
  ) {
    return displayName;
  }
  const singular = tokens[0].slice(0, -1);
  const singularKey = singularComparableToken(singular);
  const everyChildUsesSingularFamilyName = variants.every((variant) =>
    variant.source.menu.names.some((name) =>
      displayNameTokens(name).some(
        (token) => singularComparableToken(token) === singularKey,
      ),
    ),
  );
  return everyChildUsesSingularFamilyName
    ? sanitizeDisplayName(singular)
    : displayName;
}

function servingTypeFor(record: LogicalRecord): ServingType {
  if (record.itemClass === "MODIFIER") return "addon";
  const itemTypes = sourceValues(record, "itemType");
  if (itemTypes.some((value) => value.includes("MEAL"))) return "combo";
  if (itemTypes.some((value) => value.includes("BEVERAGE"))) return "drink";
  if (itemTypes.some((value) => value.includes("SIDE"))) return "side";
  if (itemTypes.some((value) => value.includes("DESSERT"))) return "dessert";
  if (record.categories.has("Breakfast")) return "breakfast";
  if (itemTypes.some((value) => value.includes("ENTREE"))) return "entree";
  return "single";
}

function categoriesFor(record: LogicalRecord): string[] {
  if (record.categories.size > 0) return [...record.categories];
  const itemTypes = sourceValues(record, "itemType");
  if (itemTypes.includes("SAUCES")) return ["Sauces"];
  if (itemTypes.includes("DRESSINGS")) return ["Dressings"];
  if (itemTypes.includes("CONDIMENTS")) return ["Condiments"];
  if (itemTypes.includes("INGREDIENTS")) return ["Ingredients"];
  if (itemTypes.some((value) => value.includes("BEVERAGE"))) return ["Beverages"];
  if (itemTypes.some((value) => value.includes("SIDE"))) return ["Sides"];
  return ["Uncategorized"];
}

function directSellableCategoriesFor(record: LogicalRecord): string[] {
  return unique(
    record.occurrences.flatMap((occurrence) =>
      occurrence.origin === "category" &&
      occurrence.entry.isSellable === true &&
      occurrence.categoryName
        ? [occurrence.categoryName]
        : [],
    ),
  );
}

// Macro Maxxer's own standardized browse taxonomy for Chick-fil-A. Order
// here matches the desired sidebar order (kept in sync with
// data/menuCategoryConfig.ts's MENU_SECTION_ORDER, which actually drives
// sidebar sort — this array is the documentation/reference copy).
export const MACRO_MAXXER_CATEGORY_ORDER = [
  "Sandwiches",
  "Chicken",
  "Salads",
  "Wraps",
  "Breakfast",
  "Sides",
  "Coffee",
  "Beverages",
  "Treats",
  "Kids",
  "Sauces",
  "Dressings",
  "Condiments",
] as const;

// Chick-fil-A's own official menu exposes the same logical product under
// more than one section (Hash Browns lives in both Breakfast and Sides
// officially; several breakfast entrees also sit in a Breakfast meal
// grouping). Macro Maxxer needs exactly ONE primary browse category per
// standalone product so nothing renders twice in the Menu. This assigns
// that single category from generic signals already computed elsewhere
// (servingType, itemType, the record's own direct official category
// membership) wherever possible, falling back to name-pattern matching only
// for the handful of distinctions Chick-fil-A's raw graph does not encode
// structurally at all (there is no "Wraps" or "Nuggets & Strips" official
// category, and "Entrées" mixes sandwiches/wraps/nugget families together
// with no itemType-level split) — the same approach this file already used
// for Wrap/Sandwich detection before this taxonomy existed.
function primaryBrowseCategoryFor(record: LogicalRecord): string {
  const name = namesFor(record)[0] ?? record.menuRecordId;
  const itemTypes = sourceValues(record, "itemType");
  const officialCategories = new Set(categoriesFor(record));
  const servingType = servingTypeFor(record);

  if (officialCategories.has("Treats") || servingType === "dessert") {
    return "Treats";
  }
  if (officialCategories.has("Coffee")) {
    return "Coffee";
  }
  if (servingType === "drink") {
    return "Beverages";
  }
  if (officialCategories.has("Salads")) {
    return "Salads";
  }
  // Dipping-sauce packets and standalone bottled 8oz sauces are the same
  // kind of product at two different package sizes — one Sauces category
  // regardless of which package form produced this record.
  if (officialCategories.has("8oz Sauces") || itemTypes.includes("SAUCES")) {
    return "Sauces";
  }
  if (itemTypes.includes("DRESSINGS")) {
    return "Dressings";
  }
  if (itemTypes.includes("CONDIMENTS")) {
    return "Condiments";
  }
  if (servingType === "breakfast") {
    return "Breakfast";
  }
  if (officialCategories.has("Sides") || servingType === "side") {
    return "Sides";
  }
  if (/\bwraps?\b/i.test(name)) {
    return "Wraps";
  }
  if (/\bnuggets?\b/i.test(name) || /\bstrips?\b/i.test(name)) {
    return "Chicken";
  }
  if (servingType === "entree") {
    // Default bucket for lunch/dinner entrees that are not a wrap, salad,
    // or nugget/strip family: sandwiches, plus a small number of
    // genuinely-ambiguous standalone entree records (e.g. a bare "Waffle"
    // or "Gluten Free Bun" official entry) that don't cleanly name-match
    // any other bucket — see the importer report for the full list.
    return "Sandwiches";
  }
  return "Sides";
}

function informationalProteinFor(
  record: LogicalRecord,
): MenuItem["informationalIngredients"] | undefined {
  const tags = new Set(sourceValues(record, "tag"));
  const itemTypes = sourceValues(record, "itemType");
  if (!itemTypes.some((itemType) => itemType.includes("ENTREE"))) return undefined;

  const hasTag = (pattern: RegExp) => [...tags].some((tag) => pattern.test(tag));
  if (hasTag(/GRILLED_(?:CHICKEN|FILET)|EGG_WHITE_GRILL/)) {
    return [{ id: "cfa-modifier-1008156", label: "Grilled Chicken Filet" }];
  }
  if (hasTag(/SPICY_(?:CHICKEN|FILET|DELUXE)|BISCUIT_SPICY_CHICKEN/)) {
    return [{ id: "cfa-modifier-1008155", label: "Spicy Chicken Filet" }];
  }
  if (
    hasTag(
      /SANDWICH_CFA_CHICKEN|CFA_DELUXE_SANDWICH|CHICK_WAFFLES_(?:CFA_FILET|SDWCH_LCH)|BISCUIT_CHICKEN/,
    )
  ) {
    return [{ id: "cfa-modifier-1008154", label: "Chick-fil-A® Chicken Filet" }];
  }
  return undefined;
}

// A plain leaf ITEM (never wrapped in its own variant grouping) that is
// referenced NOWHERE in the raw graph beyond its own single official-category
// listing is not actually independently orderable — every genuine standalone
// entree/breakfast dish in this feed is referenced at least twice (its own
// category listing PLUS its own dedicated meal's entree slot). Bread/protein
// catalog leftovers like a bare "Waffle" or "Gluten Free Bun" ITEM record (as
// opposed to the real ingredient-role "Gluten Free Bun" MODIFIER used for bun
// swaps) only ever appear once. Scoped to itemType ENTREES + the Entrées/
// Breakfast official categories specifically, since some genuinely-standalone
// products in other categories (bottled drinks, 8oz sauces) are also only
// referenced once for unrelated reasons.
function isOrphanedEntreeComponent(record: LogicalRecord): boolean {
  if (record.itemClass !== "ITEM" || record.occurrences.length !== 1) return false;
  if (!sourceValues(record, "itemType").some((value) => value.includes("ENTREES"))) {
    return false;
  }
  const categories = categoriesFor(record);
  return categories.includes("Entrées") || categories.includes("Breakfast");
}

function isMealRecord(record: LogicalRecord): boolean {
  return record.occurrences.some(
    ({ entry }) =>
      entry.meal === true || stringValue(entry.itemType)?.includes("MEAL") === true,
  );
}

function isEntreeOnlyMealConflict(
  record: LogicalRecord,
  match: MatchResult,
): boolean {
  return (
    isMealRecord(record) &&
    match.rows.length === 1 &&
    /(?:entrée|entree) only/i.test(match.rows[0].categories)
  );
}

// Best-effort role from the record's own structural signals alone
// (itemClass, ingredient/modifier identity, meal flags). Two roles can only
// be known once the full item graph is assembled — a plain ITEM leaf that
// turns out to be referenced as another product's size/count/flavor variant
// ("variant_child"), and an ITEM_GROUPING that turns out to have 2+ real
// variant children ("standalone_product" rather than "structural") — those
// are corrected in a post-pass after all items are built (see
// finalizeRolesAndVisibility below).
// A small, explicit allowlist of Chick-fil-A's own internal `tag` values for
// records that are non-food/non-drink residue bundled into an otherwise
// normal browsing group — "Bag of Ice" (tag ICE_BAG_5_LB) is listed inside
// BOTH the "Gallon Beverages" family and a separate one-off "Ice Products"
// grouping, itemType "BEVERAGES", with no structural field that otherwise
// distinguishes it from a real bottled drink. This is a deliberate,
// narrowly-scoped Chick-fil-A-specific exception (see decision log) — not a
// generic rule — because no structural signal in the raw graph reliably
// separates "sellable but not a menu dish" residue like this from real
// products in general.
const NON_MENU_RESIDUE_TAGS = new Set(["ICE_BAG_5_LB"]);
function isNonMenuResidueRecord(record: LogicalRecord): boolean {
  return sourceValues(record, "tag").some((tag) => NON_MENU_RESIDUE_TAGS.has(tag));
}

// Chick-fil-A publishes these logical products as one official parent group
// whose child SKUs differ by the selected protein. The source has no generic
// field naming that axis, so the stable parent tag is the strongest available
// identity signal. Presentation remains generic: the children keep exact SKU
// nutrition/source identity but render as a named component choice.
const COMPONENT_CHOICE_GROUPS_BY_PARENT_TAG = new Map<string, { label: string }>([
  ["COBB_SALAD", { label: "Protein" }],
  ["SALAD_SPICY_SOUTHWEST", { label: "Protein" }],
  ["SALAD_MARKET", { label: "Protein" }],
  ["HBS_BURRITO", { label: "Protein" }],
  ["HASHBROWN_BOWL", { label: "Protein" }],
]);

function declaredComponentChoiceFor(
  record: LogicalRecord,
): { label: string } | undefined {
  return sourceValues(record, "tag")
    .map((tag) => COMPONENT_CHOICE_GROUPS_BY_PARENT_TAG.get(tag))
    .find((value) => value !== undefined);
}

function baseRoleFor(record: LogicalRecord): MenuRecordRole {
  if (isIngredientRecord(record)) return "ingredient";
  if (record.itemClass === "MODIFIER") return "modifier";
  if (record.itemClass === "ITEM_GROUPING" && isMealRecord(record)) {
    return "deferred_meal_container";
  }
  if (record.itemClass === "ITEM_GROUPING") return "structural";
  if (isOrphanedEntreeComponent(record) || isNonMenuResidueRecord(record)) return "structural";
  return "standalone_product";
}

function buildSourceTrace(
  record: LogicalRecord,
  match: MatchResult,
  orderingMatch: OrderingNutritionMatch | undefined,
  orderingSourceUrl: string,
): SourceTrace {
  const safeStatus =
    match.status === "exact_match" ||
    match.status === "normalized_match" ||
    match.status === "variant_rule_match" ||
    match.status === "multiple_identical_official_matches"
      ? match.status
      : undefined;
  const safeRow = safeStatus ? match.rows[0] : undefined;
  const entreeOnlyMealConflict = isEntreeOnlyMealConflict(record, match);
  const trace: SourceTrace = {
    provider: "Chick-fil-A",
    menu: {
      recordId: record.menuRecordId,
      itemClass: record.itemClass,
      ...(record.retailModifiedItemId
        ? { retailModifiedItemId: record.retailModifiedItemId }
        : {}),
      ...(record.itemGroupId ? { itemGroupId: record.itemGroupId } : {}),
      referencedItemGroupIds: unique(
        record.occurrences.flatMap(({ entry }) => {
          const id = stringValue(entry.itemGroupId);
          return id ? [id] : [];
        }),
      ),
      containingItemGroupIds: unique(
        record.occurrences.flatMap(({ containingItemGroupId }) =>
          containingItemGroupId ? [containingItemGroupId] : [],
        ),
      ),
      names: namesFor(record),
      tags: sourceValues(record, "tag"),
      pins: sourceValues(record, "pin"),
      itemTypes: sourceValues(record, "itemType"),
      sellable: record.occurrences.some(({ entry }) => entry.isSellable === true),
      role: baseRoleFor(record),
      identitySource: record.identitySource ?? "menu",
      officialCategories: categoriesFor(record),
    },
  };

  if (orderingMatch) {
    const item = orderingMatch.item;
    const sourceId = orderingSourceId(item);
    const tag = stringValue(item.tag as RawValue);
    const retailModifiedItemId = stringValue(
      item.retailModifiedItemId as RawValue,
    );
    if (!sourceId || !tag || !retailModifiedItemId) {
      throw new Error(
        `Ordering nutrition provenance is incomplete for ${record.menuRecordId}.`,
      );
    }
    trace.nutrition = {
      nutritionSource: "ordering_system",
      sourceId,
      name: stringValue(item.name as RawValue) ?? namesFor(record)[0] ?? sourceId,
      categories: stringValue(item.posNutritionCategory as RawValue)
        ? [stringValue(item.posNutritionCategory as RawValue) as string]
        : [],
      servingSize: stringValue(item.servingSize as RawValue) ?? null,
      matchStatus: "ordering_source_match",
      matchRule: orderingMatch.rule,
      attached: true,
      attachmentReason: "safe_match",
      orderingSourceUrl,
      orderingRetailModifiedItemId: retailModifiedItemId,
      orderingTag: tag,
      orderingDefaultModifierSourceIds: orderingMatch.defaultModifiers.map(
        (modifier) => orderingSourceId(modifier) as string,
      ),
      ...(orderingMatch.menuHidesNutrition
        ? { orderingMenuHidesNutrition: true }
        : {}),
    };
    return trace;
  }

  return {
    ...trace,
    ...(safeRow
      ? {
          nutrition: {
            nutritionSource: "standalone_nutrition" as const,
            ...(safeStatus === "multiple_identical_official_matches"
              ? { candidateSourceIds: match.rows.map((row) => row.source_id) }
              : { sourceId: safeRow.source_id }),
            name: safeRow.name,
            categories: safeRow.categories
              .split("|")
              .map((category) => category.trim())
              .filter(Boolean),
            servingSize: optionalNumber(safeRow.serving_size) ?? null,
            matchStatus: safeStatus as Exclude<
              MatchStatus,
              "ambiguous" | "no_match" | "variant_container"
            >,
            matchRule: match.rule as string,
            attached: !entreeOnlyMealConflict,
            attachmentReason: entreeOnlyMealConflict
              ? "withheld_entree_only_from_meal_container"
              : "safe_match",
          },
        }
      : {}),
    ...(match.status === "variant_container"
      ? {
          nutritionResolution: {
            status: "variant_container" as const,
            candidateSourceIds: match.rows.map((row) => row.source_id),
            resolution: "nutrition_attached_to_child_variants" as const,
          },
        }
      : {}),
  };
}

async function writeAtomically(path: string, contents: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(temporaryPath, contents, "utf8");
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const [
    menuText,
    nutritionText,
    orderingNutritionText,
    orderingNutritionSourceText,
    analysisText,
  ] = await Promise.all([
    readFile(MENU_PATH, "utf8"),
    readFile(NUTRITION_PATH, "utf8"),
    readFile(ORDERING_NUTRITION_PATH, "utf8"),
    readFile(ORDERING_NUTRITION_SOURCE_PATH, "utf8"),
    readFile(ANALYSIS_PATH, "utf8"),
  ]);
  const menu = JSON.parse(menuText) as RawMenu;
  const orderingNutrition = JSON.parse(
    orderingNutritionText,
  ) as OrderingNutritionResponse;
  const orderingNutritionSource = JSON.parse(
    orderingNutritionSourceText,
  ) as OrderingNutritionSourceMetadata;
  const analysis = JSON.parse(analysisText) as MatchAnalysis;
  if (!Array.isArray(menu.categories) || !Array.isArray(menu.itemGroups)) {
    throw new Error("menu.json does not contain categories and itemGroups arrays.");
  }
  if (!Array.isArray(analysis.records)) {
    throw new Error("match-analysis.json does not contain verified record decisions.");
  }
  if (!Array.isArray(orderingNutrition.items)) {
    throw new Error("ordering-nutrition.json does not contain an items array.");
  }
  const sidesCategoryIndex = menu.categories.findIndex(
    (category) => stringValue(category.name) === "Sides",
  );
  const orderingSourceUrl = stringValue(
    orderingNutritionSource.source as RawValue,
  );
  if (!orderingSourceUrl) {
    throw new Error(
      "ordering-nutrition-source.json does not contain the official source URL.",
    );
  }

  const nutritionRows = readNutritionRows(nutritionText);
  const nutritionById = new Map<string, NutritionRow>();
  for (const row of nutritionRows) {
    if (nutritionById.has(row.source_id)) {
      throw new Error(`nutrition.csv repeats source ID ${row.source_id}.`);
    }
    nutritionById.set(row.source_id, row);
  }
  const exactRows = new Map<string, NutritionRow[]>();
  const normalizedRows = new Map<string, NutritionRow[]>();
  for (const row of nutritionRows) {
    exactRows.set(row.name, [...(exactRows.get(row.name) ?? []), row]);
    const normalized = normalizeName(row.name);
    normalizedRows.set(normalized, [
      ...(normalizedRows.get(normalized) ?? []),
      row,
    ]);
  }

  const records = buildLogicalRecords(menu);
  const recordByRetailId = new Map(
    records.flatMap((record) =>
      record.retailModifiedItemId
        ? [[record.retailModifiedItemId, record] as const]
        : [],
    ),
  );
  const recordByGroupId = new Map(
    records.flatMap((record) =>
      record.itemGroupId ? [[record.itemGroupId, record] as const] : [],
    ),
  );
  const groupById = new Map(
    menu.itemGroups.flatMap((group) => {
      const id = stringValue(group.itemGroupId);
      return id ? [[id, group] as const] : [];
    }),
  );

  // `sidesCategoryIndex` lets a record that Macro Maxxer folds into Sides
  // from a DIFFERENT official category (Hash Browns is officially Breakfast
  // only; Macro Maxxer's single-primary-category rule puts it in Sides) sort
  // deliberately within the merged Sides list rather than landing at an
  // arbitrary position derived from its own (unrelated) official category
  // index. Everything actually listed directly under Chick-fil-A's own Sides
  // category keeps that category's real, unmodified official ordering.
  function defaultOrderFor(record: LogicalRecord): number {
    // Prefer a genuine occurrence directly under the raw "Sides" category
    // itself (found by category NAME, not "whichever category occurrence
    // comes first in the record's own occurrence list" — several real Sides
    // items, e.g. Fruit Cup, are officially dual-listed under Breakfast AND
    // Sides on the SAME record, and Breakfast happens to be scanned first).
    // This preserves Chick-fil-A's true Sides ordering for every item that
    // genuinely has one, regardless of what else it's also listed under.
    const ownSidesOccurrence = record.occurrences.find(
      (occurrence) => occurrence.origin === "category" && occurrence.categoryName === "Sides",
    );
    if (
      ownSidesOccurrence?.categoryIndex !== undefined &&
      ownSidesOccurrence.categoryItemIndex !== undefined
    ) {
      return ownSidesOccurrence.categoryIndex * 1_000 + ownSidesOccurrence.categoryItemIndex;
    }
    // A record with no direct category occurrence at all (only reachable via
    // an itemGroup — e.g. Kale Crunch Side's visible ITEM, whose own family
    // container is what's actually listed in the Sides category) inherits
    // its container's real Sides position instead of an arbitrary fallback.
    const containingSidesOccurrence = record.occurrences
      .flatMap(({ containingItemGroupId }) => {
        const container = containingItemGroupId
          ? recordByGroupId.get(containingItemGroupId)
          : undefined;
        return container
          ? container.occurrences.filter(
              (occurrence) =>
                occurrence.origin === "category" && occurrence.categoryName === "Sides",
            )
          : [];
      })
      .find(
        (occurrence) =>
          occurrence.categoryIndex !== undefined && occurrence.categoryItemIndex !== undefined,
      );
    if (
      containingSidesOccurrence?.categoryIndex !== undefined &&
      containingSidesOccurrence.categoryItemIndex !== undefined
    ) {
      return (
        containingSidesOccurrence.categoryIndex * 1_000 +
        containingSidesOccurrence.categoryItemIndex
      );
    }
    if (
      sidesCategoryIndex >= 0 &&
      !categoriesFor(record).includes("Sides") &&
      primaryBrowseCategoryFor(record) === "Sides"
    ) {
      // Trails the merged Sides list: this record has no official Sides
      // listing at all (e.g. Hash Browns, official Breakfast only) — it's
      // folded in purely by Macro Maxxer's single-primary-category decision,
      // a Macro Maxxer-specific addition to Sides rather than part of
      // Chick-fil-A's own Sides sequence, so it goes after that true
      // sequence rather than disturbing its relative order.
      return sidesCategoryIndex * 1_000 + 1_000;
    }
    const categoryOccurrence = record.occurrences.find(
      (occurrence) => occurrence.origin === "category",
    );
    if (
      categoryOccurrence?.categoryIndex !== undefined &&
      categoryOccurrence.categoryItemIndex !== undefined
    ) {
      return categoryOccurrence.categoryIndex * 1_000 + categoryOccurrence.categoryItemIndex;
    }
    return 100_000 + primaryOccurrence(record).sourceIndex;
  }

  const variantContainerGroupIds = new Set(
    records.flatMap((record) => {
      if (record.itemClass !== "ITEM_GROUPING" || !record.itemGroupId) return [];
      const childRetailIds = unique(
        (groupById.get(record.itemGroupId)?.items ?? []).flatMap((entry) => {
          if (stringValue(entry.itemClass) !== "ITEM") return [];
          const retailId = stringValue(entry.retailModifiedItemId);
          return retailId ? [retailId] : [];
        }),
      );
      const sellable = record.occurrences.some(({ entry }) => entry.isSellable === true);
      return !sellable && childRetailIds.length > 1 ? [record.itemGroupId] : [];
    }),
  );
  const matches = new Map(
    records.map((record) => [
      record.menuRecordId,
      matchNutrition(
        record,
        exactRows,
        normalizedRows,
        nutritionById,
        record.itemGroupId !== undefined && variantContainerGroupIds.has(record.itemGroupId),
      ),
    ]),
  );
  validateAgainstAnalysis(records, matches, nutritionRows, analysis);

  const orderingByRetailId = new Map<string, OrderingNutritionItem[]>();
  const orderingCompositeIds = new Set<string>();
  for (const [index, item] of orderingNutrition.items.entries()) {
    const sourceId = orderingSourceId(item);
    const retailModifiedItemId = stringValue(
      item.retailModifiedItemId as RawValue,
    );
    if (!sourceId || !retailModifiedItemId) {
      throw new Error(
        `ordering-nutrition.json item ${index} lacks retailModifiedItemId/tag identity.`,
      );
    }
    if (orderingCompositeIds.has(sourceId)) {
      throw new Error(`ordering-nutrition.json repeats source identity ${sourceId}.`);
    }
    orderingCompositeIds.add(sourceId);
    orderingByRetailId.set(retailModifiedItemId, [
      ...(orderingByRetailId.get(retailModifiedItemId) ?? []),
      item,
    ]);
  }

  const orderingItemForMenuEntry = (
    entry: RawMenuEntry,
  ): OrderingNutritionItem | undefined => {
    const retailModifiedItemId = stringValue(entry.retailModifiedItemId);
    const tag = stringValue(entry.tag);
    if (!retailModifiedItemId || !tag) return undefined;
    const candidates = (orderingByRetailId.get(retailModifiedItemId) ?? []).filter(
      (item) => stringValue(item.tag as RawValue) === tag,
    );
    return candidates.length === 1 ? candidates[0] : undefined;
  };

  const orderingCandidatesForRecord = (
    record: LogicalRecord,
  ): OrderingNutritionItem[] => {
    if (!record.retailModifiedItemId) return [];
    const tags = new Set(sourceValues(record, "tag"));
    return (orderingByRetailId.get(record.retailModifiedItemId) ?? []).filter(
      (item) => {
        const tag = stringValue(item.tag as RawValue);
        return tag !== undefined && tags.has(tag);
      },
    );
  };

  const orderingNutritionUnit = (
    item: OrderingNutritionItem,
  ): IngredientRelationshipNutrition | undefined => {
    const sourceId = orderingSourceId(item);
    const retailModifiedItemId = stringValue(
      item.retailModifiedItemId as RawValue,
    );
    const tag = stringValue(item.tag as RawValue);
    const nutrition = orderingNutritionComponent(item);
    if (!sourceId || !retailModifiedItemId || !tag || !nutrition) return undefined;
    const servingWeightAmount = nestedNumber(item.nutrition, [
      "weight",
      "servingSizeWeight",
      "amount",
      "count",
    ]);
    const servingWeightUnit = nestedString(item.nutrition, [
      "weight",
      "servingSizeWeight",
      "amount",
      "unit",
    ]);

    return {
      nutrition,
      source: {
        sourceType: "ordering_system",
        sourceId,
        sourceUrl: orderingSourceUrl,
        retailModifiedItemId,
        tag,
        servingWeight:
          servingWeightAmount !== undefined && servingWeightUnit
            ? { amount: servingWeightAmount, unit: servingWeightUnit }
            : null,
      },
    };
  };

  // A logical modifier remains one visible ingredient, but all of its current
  // menu-referenced ordering units are retained when relationship tags select
  // more than one official nutrition payload. Unreferenced/off-menu ordering
  // rows are intentionally excluded because their tags do not occur in menu.json.
  const contextualNutritionUnits = new Map<
    string,
    IngredientRelationshipNutrition[]
  >();
  for (const record of records) {
    const standaloneMatch = matches.get(record.menuRecordId);
    if (
      !standaloneMatch ||
      (standaloneMatch.status !== "no_match" &&
        standaloneMatch.status !== "ambiguous")
    ) {
      continue;
    }
    const menuTags = sourceValues(record, "tag");
    const units = orderingCandidatesForRecord(record).flatMap((item) => {
      const unit = orderingNutritionUnit(item);
      return unit ? [unit] : [];
    });
    const unitTags = new Set(units.map((unit) => unit.source.tag));
    if (
      units.length > 1 &&
      unitTags.size === units.length &&
      menuTags.every((tag) => unitTags.has(tag))
    ) {
      contextualNutritionUnits.set(record.menuRecordId, units);
    }
  }

  const contextualNutritionUnitForEntry = (
    entry: RawMenuEntry,
  ): IngredientRelationshipNutrition | undefined => {
    const retailModifiedItemId = stringValue(entry.retailModifiedItemId);
    const tag = stringValue(entry.tag);
    const record = retailModifiedItemId
      ? recordByRetailId.get(retailModifiedItemId)
      : undefined;
    if (!record || !tag) return undefined;
    return contextualNutritionUnits
      .get(record.menuRecordId)
      ?.find((unit) => unit.source.tag === tag);
  };

  const orderingMatchFor = (
    record: LogicalRecord,
    standaloneMatch: MatchResult,
  ): OrderingNutritionMatch | undefined => {
    if (
      standaloneMatch.status !== "no_match" &&
      standaloneMatch.status !== "ambiguous"
    ) {
      return undefined;
    }
    if (!record.retailModifiedItemId || isMealRecord(record)) {
      return undefined;
    }
    // "Hidden" is a UI-display flag from the ordering menu, not an absence
    // of official nutrition. It is preserved as provenance metadata below,
    // but only an all-zero/placeholder payload (checked once the full
    // combined nutrition is known) is treated as unsafe to attach.
    const menuHidesNutrition = record.occurrences.every(
      ({ entry }) => entry.hideNutrition === true,
    );

    const directCandidates = orderingCandidatesForRecord(record);
    if (directCandidates.length !== 1) return undefined;
    const item = directCandidates[0];
    if (!orderingNutritionComponent(item)) return undefined;

    const defaultModifiers: OrderingNutritionItem[] = [];
    if (record.itemClass === "ITEM") {
      const referencedRoots = unique(
        record.occurrences.flatMap(({ entry }) => {
          const id = stringValue(entry.itemGroupId);
          return id ? [id] : [];
        }),
      );
      const seenDefaultSources = new Set<string>();
      for (const rootId of referencedRoots) {
        for (const grouping of groupById.get(rootId)?.items ?? []) {
          if (stringValue(grouping.itemClass) !== "MODIFIER_GROUPING") continue;
          const targetId = stringValue(grouping.itemGroupId);
          if (!targetId) continue;
          for (const option of groupById.get(targetId)?.items ?? []) {
            if (
              stringValue(option.itemClass) !== "MODIFIER" ||
              stringValue(option.modifierType) !== "DEFAULT" ||
              option.hideNutrition === true
            ) {
              continue;
            }
            const defaultItem = orderingItemForMenuEntry(option);
            const defaultSourceId = defaultItem
              ? orderingSourceId(defaultItem)
              : undefined;
            if (
              !defaultItem ||
              !defaultSourceId ||
              !orderingNutritionComponent(defaultItem)
            ) {
              return undefined;
            }
            if (!seenDefaultSources.has(defaultSourceId)) {
              seenDefaultSources.add(defaultSourceId);
              defaultModifiers.push(defaultItem);
            }
          }
        }
      }
    }

    const nutrition = combineOrderingNutrition([item, ...defaultModifiers]);
    if (!nutrition) return undefined;
    // A menu-hidden record whose only official payload is an all-zero
    // placeholder is not a real, usable nutrition value — treat it the same
    // as "no official nutrition available" rather than attaching zeros.
    const isAllZero = Object.values(nutrition).every((value) => value === 0);
    if (menuHidesNutrition && isAllZero) return undefined;
    return {
      item,
      defaultModifiers,
      nutrition,
      rule: "ordering_retail_modified_item_id_and_tag",
      menuHidesNutrition,
    };
  };

  // A collected menu graph can omit one size SKU even though Chick-fil-A's
  // collected ordering-nutrition feed still publishes its exact retail id,
  // tag, name, and nutrition. Canonicalize such a record into an existing
  // size family only when all identity dimensions agree:
  //   1. the menu group already has 2+ explicitly size-labelled children;
  //   2. each child name reduces to the parent name after removing its size;
  //   3. the child tags share the same size-independent tag stem; and
  //   4. the ordering-only candidate has that same name and tag stem plus a
  //      new recognized size and an official nutrition payload.
  // This is cross-source identity reconciliation, not a fabricated option.
  const orderingOnlyVariantRecordsByGroupId = new Map<string, LogicalRecord[]>();
  const sizeLabelsByAbbreviation = Object.entries(SIZE_ABBREVIATION_LABELS).sort(
    (left, right) => right[1].length - left[1].length,
  );
  const sizeIdentityForName = (
    parentName: string,
    candidateName: string,
  ): { abbreviation: string; label: string } | undefined =>
    sizeLabelsByAbbreviation
      .map(([abbreviation, label]) => ({ abbreviation, label }))
      .find(({ label }) => {
        return (
          normalizeName(candidateName) === normalizeName(`${label} ${parentName}`) ||
          normalizeName(candidateName) === normalizeName(`${parentName} ${label}`)
        );
      });
  const sizeTagStem = (tag: string, label: string): string | undefined => {
    const suffix = label.toUpperCase().replace(/\s+/g, "_");
    return tag.endsWith(`_${suffix}`) ? tag.slice(0, -(suffix.length + 1)) : undefined;
  };
  const orderingSizeCandidatesByTagStem = new Map<
    string,
    Array<{ item: OrderingNutritionItem; abbreviation: string; label: string }>
  >();
  for (const item of orderingNutrition.items) {
    const tag = stringValue(item.tag as RawValue);
    if (!tag) continue;
    for (const [abbreviation, label] of sizeLabelsByAbbreviation) {
      const stem = sizeTagStem(tag, label);
      if (!stem) continue;
      orderingSizeCandidatesByTagStem.set(stem, [
        ...(orderingSizeCandidatesByTagStem.get(stem) ?? []),
        { item, abbreviation, label },
      ]);
      break;
    }
  }

  for (const parent of records.filter(
    (record) => record.itemClass === "ITEM_GROUPING" && record.itemGroupId,
  )) {
    const parentName = namesFor(parent)[0];
    const groupId = parent.itemGroupId;
    if (!parentName || !groupId) continue;
    const rawChildren = unique(
      (groupById.get(groupId)?.items ?? []).flatMap((entry) => {
        if (stringValue(entry.itemClass) !== "ITEM") return [];
        const retailId = stringValue(entry.retailModifiedItemId);
        const child = retailId ? recordByRetailId.get(retailId) : undefined;
        return child ? [child] : [];
      }),
    );
    if (rawChildren.length < 2) continue;

    const knownSizes = rawChildren.map((child) => {
      const abbreviation = sourceValues(child, "qtySizeAbbreviation")[0];
      const label = abbreviation
        ? SIZE_ABBREVIATION_LABELS[abbreviation.toUpperCase()]
        : undefined;
      const name = namesFor(child)[0];
      const tag = sourceValues(child, "tag")[0];
      return abbreviation && label && name && tag && sizeIdentityForName(parentName, name)
        ? { abbreviation, label, tag }
        : undefined;
    });
    if (knownSizes.some((value) => value === undefined)) continue;
    const tagStems = new Set(
      knownSizes.flatMap((value) => {
        const stem = value ? sizeTagStem(value.tag, value.label) : undefined;
        return stem ? [stem] : [];
      }),
    );
    if (tagStems.size !== 1) continue;
    const [tagStem] = [...tagStems];
    const knownLabels = new Set(knownSizes.flatMap((value) => (value ? [value.label] : [])));

    for (const indexedCandidate of orderingSizeCandidatesByTagStem.get(tagStem) ?? []) {
      const orderingItem = indexedCandidate.item;
      const retailId = stringValue(orderingItem.retailModifiedItemId as RawValue);
      const tag = stringValue(orderingItem.tag as RawValue);
      const name = stringValue(orderingItem.name as RawValue);
      if (!retailId || !tag || !name || recordByRetailId.has(retailId)) continue;
      const size = sizeIdentityForName(parentName, name);
      if (
        !size ||
        size.abbreviation !== indexedCandidate.abbreviation ||
        knownLabels.has(size.label) ||
        sizeTagStem(tag, size.label) !== tagStem ||
        !orderingNutritionComponent(orderingItem)
      ) {
        continue;
      }
      const childItemType = sourceValues(rawChildren[0], "itemType")[0];
      const syntheticEntry: RawMenuEntry = {
        tag,
        name,
        retailModifiedItemId: retailId,
        itemClass: "ITEM",
        itemType: childItemType,
        isSellable: false,
        qtySizeAbbreviation: size.abbreviation,
      };
      const syntheticRecord: LogicalRecord = {
        menuRecordId: `retailModifiedItemId:${retailId}`,
        itemClass: "ITEM",
        retailModifiedItemId: retailId,
        identitySource: "ordering_nutrition",
        occurrences: [
          {
            entry: syntheticEntry,
            origin: "itemGroup",
            containingItemGroupId: groupId,
            sourceIndex: 1_000_000 + records.length,
          },
        ],
        categories: new Set(categoriesFor(parent)),
      };
      records.push(syntheticRecord);
      recordByRetailId.set(retailId, syntheticRecord);
      matches.set(syntheticRecord.menuRecordId, {
        status: "no_match",
        rule: null,
        rows: [],
        reason: "ordering-only size SKU",
      });
      orderingOnlyVariantRecordsByGroupId.set(groupId, [
        ...(orderingOnlyVariantRecordsByGroupId.get(groupId) ?? []),
        syntheticRecord,
      ]);
      knownLabels.add(size.label);
    }
  }
  const orderingMatches = new Map<string, OrderingNutritionMatch>();
  for (const record of records) {
    const standaloneMatch = matches.get(record.menuRecordId);
    if (!standaloneMatch) continue;
    const orderingMatch = orderingMatchFor(record, standaloneMatch);
    if (orderingMatch) {
      orderingMatches.set(record.menuRecordId, orderingMatch);
    }
  }

  const analysisById = new Map(
    analysis.records.map((record) => [record.menuRecordId, record]),
  );
  const addonGroups: Record<
    string,
    { label: string; itemIds: string[]; maxPerItem?: number }
  > = {};
  const ingredientRules: NonNullable<
    RestaurantCustomizationRules["ingredientCategories"]
  > = {};
  const observedIngredientMaximum = new Map<string, number>();

  type GeneratedCustomization = {
    ingredients: string[];
    addonRefs: string[];
    customization?: GeneratedMenuItem["customization"];
    ingredientNutritionContexts?: IngredientNutritionContexts;
  };
  const customizationCache = new Map<string, GeneratedCustomization>();

  const customizationFor = (
    record: LogicalRecord,
  ): GeneratedCustomization => {
    const cached = customizationCache.get(record.menuRecordId);
    if (cached) return cached;

    const includedIngredients = new Set<string>();
    const addonRefs = new Set<string>();
    const ingredientNutritionContexts: IngredientNutritionContexts = {};
    const ingredientCategories: NonNullable<
      GeneratedMenuItem["customization"]
    >["ingredientCategories"] = [];
    const referencedRoots = unique(
      record.occurrences.flatMap(({ entry }) => {
        const id = stringValue(entry.itemGroupId);
        return id ? [id] : [];
      }),
    );

    for (const rootId of referencedRoots) {
      const root = groupById.get(rootId);
      root?.items.forEach((grouping, groupingIndex) => {
        if (stringValue(grouping.itemClass) !== "MODIFIER_GROUPING") return;
        const targetId = stringValue(grouping.itemGroupId);
        if (!targetId) return;
        const optionEntries = (groupById.get(targetId)?.items ?? []).flatMap(
          (option) => {
            if (stringValue(option.itemClass) !== "MODIFIER") return [];
            const retailId = stringValue(option.retailModifiedItemId);
            const optionRecord = retailId ? recordByRetailId.get(retailId) : undefined;
            return optionRecord ? [{ entry: option, record: optionRecord }] : [];
          },
        );
        const groupingTag = stringValue(grouping.tag);
        const supportsEntreeSauceCustomization =
          primaryBrowseCategoryFor(record) === "Sandwiches";
        const entreeSauceOptions = optionEntries.filter(({ entry }) =>
          groupingTag === "INDIVIDUAL_SAUCES" &&
          stringValue(entry.tag) === "HONEY_ROASTED_BBQ" &&
          supportsEntreeSauceCustomization,
        );
        const ingredientOptions = unique(
          [...optionEntries.filter(({ record: optionRecord }) => isIngredientRecord(optionRecord)), ...entreeSauceOptions]
            .map(({ record: optionRecord }) => standardId(optionRecord)),
        );
        const entreeSauceIds = new Set(entreeSauceOptions.map(({ record: optionRecord }) => standardId(optionRecord)));
        const addonOptions = unique(
          optionEntries
            .filter(({ record: optionRecord }) => !isIngredientRecord(optionRecord))
            .filter(({ record: optionRecord }) => !entreeSauceIds.has(standardId(optionRecord)))
            .map(({ record: optionRecord }) => standardId(optionRecord)),
        );
        const label = sanitizeDisplayName(
          stringValue(grouping.name) ?? `Modifier group ${targetId}`,
        );
        const maximum = numberValue(grouping.maximum);
        const minimum =
          numberValue(grouping.minimum) ?? numberValue(grouping.thirdPartyMinimum);

        if (ingredientOptions.length > 0) {
          // `label` (e.g. "Bread Carriers") is what the user sees on the
          // customization tab. It legitimately recurs across many items —
          // that's fine for display, but a restaurant-level max-quantity
          // rule needs a key that's actually unique per source grouping, so
          // `categoryId` (never shown to a user) carries the disambiguation
          // instead of leaking into the display name.
          const categoryId = `${label} [CFA ${rootId}:${groupingIndex}]`;
          ingredientCategories.push({
            name: label,
            id: categoryId,
            ingredients: ingredientOptions,
            allowNone: minimum === undefined || minimum === 0,
          });
          ingredientRules[categoryId] = {
            ...(maximum !== undefined ? { maxQuantity: maximum } : {}),
            allowNone: minimum === undefined || minimum === 0,
          };
          const normalizedIngredientOptions = new Set(ingredientOptions);
          const ingredientOptionEntries = optionEntries.filter(({ record: candidate }) =>
            normalizedIngredientOptions.has(standardId(candidate)),
          );
          const hasExplicitIncludedOption = ingredientOptionEntries.some(
            ({ entry }) => modifierSelectionRole(entry) === "included",
          );
          for (const { entry: optionEntry, record: optionRecord } of ingredientOptionEntries) {
            const id = standardId(optionRecord);
            if (maximum !== undefined && isIngredientRecord(optionRecord)) {
              observedIngredientMaximum.set(
                id,
                Math.max(observedIngredientMaximum.get(id) ?? 0, maximum),
              );
            }
            const groupDefaultTag = stringValue(grouping.defaultTag);
            const optionTag = stringValue(optionEntry.tag);
            const contextualNutrition = isIngredientRecord(optionRecord)
              ? contextualNutritionUnitForEntry(optionEntry)
              : undefined;
            if (contextualNutrition) {
              const existing = ingredientNutritionContexts[id];
              if (
                existing &&
                existing.source.sourceId !== contextualNutrition.source.sourceId
              ) {
                throw new Error(
                  `${record.menuRecordId} selects multiple contextual nutrition tags for ${id}.`,
                );
              }
              ingredientNutritionContexts[id] = contextualNutrition;
            }
            const isIncludedInThisContext =
              modifierSelectionRole(optionEntry) === "included" ||
              (!hasExplicitIncludedOption && groupDefaultTag !== undefined && optionTag === groupDefaultTag);
            if (isIncludedInThisContext) {
              includedIngredients.add(id);
            }
          }
        }

        if (addonOptions.length > 0) {
          const addonRef = `cfa-addon-group-${rootId}-${groupingIndex}-${targetId}`;
          addonGroups[addonRef] = {
            label,
            itemIds: addonOptions,
            ...(maximum !== undefined ? { maxPerItem: maximum } : {}),
          };
          addonRefs.add(addonRef);
        }
      });
    }

    const result: GeneratedCustomization = {
      ingredients: [...includedIngredients],
      addonRefs: [...addonRefs],
      ...(ingredientCategories.length > 0
        ? { customization: { ingredientCategories } }
        : {}),
      ...(Object.keys(ingredientNutritionContexts).length > 0
        ? { ingredientNutritionContexts }
        : {}),
    };
    customizationCache.set(record.menuRecordId, result);
    return result;
  };

  const officialNutritionFor = (record: LogicalRecord): Nutrition | undefined => {
    const match = matches.get(record.menuRecordId);
    if (!match) throw new Error(`Missing match result for ${record.menuRecordId}.`);
    const orderingMatch = orderingMatches.get(record.menuRecordId);
    if (orderingMatch) return orderingMatch.nutrition;
    return (match.rows.length === 1 || match.status === "multiple_identical_official_matches") &&
      match.status !== "ambiguous" &&
      match.status !== "no_match" &&
      !isEntreeOnlyMealConflict(record, match)
      ? toNutrition(match.rows[0])
      : undefined;
  };

  type QuantityPackDerivation = {
    nutrition: Nutrition;
    quantity: number;
    perUnitRecord: LogicalRecord;
    perUnitNutritionSourceIds: string[];
  };
  const quantityPackDerivations = new Map<string, QuantityPackDerivation>();
  const quantityFromRecord = (record: LogicalRecord): number | undefined => {
    const abbreviation = sourceValues(record, "qtySizeAbbreviation")[0];
    const match = abbreviation?.match(/^(\d+)\s*ct$/i);
    if (!match) return undefined;
    const quantity = Number(match[1]);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : undefined;
  };
  const nutritionSourceIdsFor = (record: LogicalRecord): string[] => {
    const orderingMatch = orderingMatches.get(record.menuRecordId);
    const orderingId = orderingMatch ? orderingSourceId(orderingMatch.item) : undefined;
    if (orderingId) return [orderingId];
    return matches.get(record.menuRecordId)?.rows.map((row) => row.source_id) ?? [];
  };
  const multiplyAdditiveNutrition = (
    nutrition: Nutrition,
    quantity: number,
  ): Nutrition =>
    Object.fromEntries(
      Object.entries(nutrition).map(([field, value]) => [
        field,
        Number((value * quantity).toFixed(3)),
      ]),
    ) as Nutrition;

  // A counted package can reuse a per-unit nutrition row in the official
  // feed. Derive the package total only when the official count is explicit,
  // a 1-count sibling exists, both records explicitly use the same per-unit
  // serving basis, and the published numeric payloads are identical. A real
  // pack-total row necessarily differs and is therefore never overridden.
  for (const group of menu.itemGroups) {
    const children = unique(
      group.items.flatMap((entry) => {
        if (stringValue(entry.itemClass) !== "ITEM") return [];
        const retailId = stringValue(entry.retailModifiedItemId);
        const child = retailId ? recordByRetailId.get(retailId) : undefined;
        return child && quantityFromRecord(child) ? [child] : [];
      }),
    );
    const perUnitRecord = children.find((child) => quantityFromRecord(child) === 1);
    const perUnitNutrition = perUnitRecord
      ? officialNutritionFor(perUnitRecord)
      : undefined;
    const perUnitServingBasis = perUnitRecord
      ? sourceValues(perUnitRecord, "servingSize")[0]
      : undefined;
    if (!perUnitRecord || !perUnitNutrition || !perUnitServingBasis) continue;
    for (const child of children) {
      const quantity = quantityFromRecord(child);
      const officialPackNutrition = officialNutritionFor(child);
      const packServingBasis = sourceValues(child, "servingSize")[0];
      if (
        !quantity ||
        quantity <= 1 ||
        !officialPackNutrition ||
        normalizeName(packServingBasis ?? "") !== normalizeName(perUnitServingBasis) ||
        !/^per\b/i.test(perUnitServingBasis) ||
        JSON.stringify(officialPackNutrition) !== JSON.stringify(perUnitNutrition)
      ) {
        continue;
      }
      quantityPackDerivations.set(child.menuRecordId, {
        nutrition: multiplyAdditiveNutrition(perUnitNutrition, quantity),
        quantity,
        perUnitRecord,
        perUnitNutritionSourceIds: nutritionSourceIdsFor(perUnitRecord),
      });
    }
  }

  const nutritionFor = (record: LogicalRecord): Nutrition | undefined =>
    quantityPackDerivations.get(record.menuRecordId)?.nutrition ??
    officialNutritionFor(record);

  const sourceFor = (record: LogicalRecord): SourceTrace => {
    const match = matches.get(record.menuRecordId);
    if (!match) throw new Error(`Missing match result for ${record.menuRecordId}.`);
    const trace = buildSourceTrace(
      record,
      match,
      orderingMatches.get(record.menuRecordId),
      orderingSourceUrl,
    );
    const contextualUnits = contextualNutritionUnits.get(record.menuRecordId);
    const resolvedTrace = contextualUnits
      ? {
          ...trace,
          nutritionResolution: {
            status: "contextual_modifier",
            candidateSourceIds: contextualUnits.map(
              (unit) => unit.source.sourceId,
            ),
            resolution: "nutrition_selected_by_parent_relationship",
          },
        }
      : trace;
    const quantityDerivation = quantityPackDerivations.get(record.menuRecordId);
    if (
      quantityDerivation &&
      resolvedTrace.nutrition &&
      quantityDerivation.perUnitRecord.retailModifiedItemId
    ) {
      resolvedTrace.nutrition.derivation = {
        rule: "official_per_unit_nutrition_times_official_quantity",
        quantity: quantityDerivation.quantity,
        quantitySource: "qtySizeAbbreviation",
        perUnitRetailModifiedItemId:
          quantityDerivation.perUnitRecord.retailModifiedItemId,
        perUnitNutritionSourceIds:
          quantityDerivation.perUnitNutritionSourceIds,
      };
    }
    return resolvedTrace;
  };

  const collectMealRoles = (
    rootId: string,
  ): { entree: string[]; side: string[]; beverage: string[] } => {
    const collected = {
      entree: new Set<string>(),
      side: new Set<string>(),
      beverage: new Set<string>(),
    };
    const visit = (
      groupId: string,
      inheritedRole: keyof typeof collected | undefined,
      visited: Set<string>,
    ): void => {
      const visitKey = `${groupId}:${inheritedRole ?? "none"}`;
      if (visited.has(visitKey)) return;
      visited.add(visitKey);
      for (const entry of groupById.get(groupId)?.items ?? []) {
        const itemClass = stringValue(entry.itemClass);
        if (itemClass === "MODIFIER" || itemClass === "MODIFIER_GROUPING") continue;
        const groupType = stringValue(entry.itemGroupType)?.toLocaleLowerCase();
        const itemType = stringValue(entry.itemType) ?? "";
        const explicitRole =
          groupType === "entree"
            ? "entree"
            : groupType === "side" || itemType.includes("SIDE")
              ? "side"
              : groupType === "beverage" || itemType.includes("BEVERAGE")
                ? "beverage"
                : undefined;
        const role = explicitRole ?? inheritedRole;
        if (itemClass === "ITEM") {
          const retailId = stringValue(entry.retailModifiedItemId);
          const itemRecord = retailId ? recordByRetailId.get(retailId) : undefined;
          if (role && itemRecord) collected[role].add(standardId(itemRecord));
        } else if (itemClass === "ITEM_GROUPING") {
          const childId = stringValue(entry.itemGroupId);
          if (childId) visit(childId, role, visited);
        }
      }
    };
    visit(rootId, undefined, new Set());
    return {
      entree: [...collected.entree],
      side: [...collected.side],
      beverage: [...collected.beverage],
    };
  };

  // An ITEM_GROUPING whose 2+ ITEM children are each referenced NOWHERE else
  // in the raw graph (not chosen as any meal's entree/side/beverage slot, not
  // listed directly in any category) is a catalog-only family listing (e.g.
  // "Filets", "Breakfast Proteins", "Breakfast Breads" — a reference list of
  // preparation styles other sandwiches informally offer, never an
  // independently orderable product itself), not a genuine product whose
  // sizes/counts/choices a customer picks from one product card. A real
  // variant family's children are always referenced at least twice (their own
  // family group PLUS at least one meal/side/beverage slot elsewhere) — see
  // isOrphanedEntreeComponent for the equivalent leaf-ITEM case.
  function isOrphanedFamilyGrouping(record: LogicalRecord): boolean {
    if (record.itemClass !== "ITEM_GROUPING" || !record.itemGroupId || isMealRecord(record)) {
      return false;
    }
    const childRecords = unique(
      (groupById.get(record.itemGroupId)?.items ?? []).flatMap((entry) => {
        if (stringValue(entry.itemClass) !== "ITEM") return [];
        const retailId = stringValue(entry.retailModifiedItemId);
        const child = retailId ? recordByRetailId.get(retailId) : undefined;
        return child ? [child] : [];
      }),
    );
    const parentName = namesFor(record)[0];
    const directCategoryEntry = record.occurrences.find(
      (occurrence) => occurrence.origin === "category",
    )?.entry;
    const defaultTag = directCategoryEntry
      ? stringValue(directCategoryEntry.defaultTag)
      : undefined;
    const parentNameStem = parentName ? normalizeName(parentName) : undefined;
    const parentFamilyTokens = new Set(
      parentName ? displayNameTokens(parentName).map(singularComparableToken) : [],
    );
    const childrenShareInflectedFamilyName =
      directCategoryEntry?.dotComVisible === true &&
      parentFamilyTokens.size > 0 &&
      childRecords.every((child) =>
        namesFor(child).some((name) => {
          const childTokens = new Set(
            displayNameTokens(name).map(singularComparableToken),
          );
          return [...parentFamilyTokens].every((token) => childTokens.has(token));
        }),
      );
    // A category-listed parent whose official defaultTag selects one of its
    // children and whose complete parent-name stem is retained by every
    // child is a coherent logical product family, even if those children do
    // not appear elsewhere in the graph. This distinguishes Cobb Salad ->
    // "Cobb Salad w/ ..." from catalog lists such as Breakfast Proteins ->
    // "Sausage Patty" without relying on display-name equality for dedupe.
    const isCoherentLogicalProductFamily = Boolean(
      parentNameStem &&
        defaultTag &&
        childRecords.some((child) => sourceValues(child, "tag").includes(defaultTag)) &&
        (childRecords.every((child) =>
          namesFor(child).some((name) => normalizeName(name).includes(parentNameStem)),
        ) ||
          childrenShareInflectedFamilyName),
    );
    return (
      childRecords.length >= 2 &&
      !isCoherentLogicalProductFamily &&
      childRecords.every((child) => child.occurrences.length === 1)
    );
  }

  // Some Chick-fil-A groupings mix real products with explicitly identified
  // non-menu residue. Promoting one of those containers would make the
  // residue reachable again through the parent's variant picker even after
  // the leaf record itself is sourceOnly. Keep the entire mixed container as
  // structural provenance instead; its children remain available for source
  // relationships, but neither the group nor the residue becomes a normal
  // browse/search/quick-add product.
  function containsNonMenuResidue(record: LogicalRecord): boolean {
    if (record.itemClass !== "ITEM_GROUPING" || !record.itemGroupId) return false;
    return (groupById.get(record.itemGroupId)?.items ?? []).some((entry) => {
      if (stringValue(entry.itemClass) !== "ITEM") return false;
      const retailId = stringValue(entry.retailModifiedItemId);
      const child = retailId ? recordByRetailId.get(retailId) : undefined;
      return child ? isNonMenuResidueRecord(child) : false;
    });
  }

  const variantsFor = (record: LogicalRecord): GeneratedVariant[] => {
    if (record.itemClass !== "ITEM_GROUPING" || isMealRecord(record)) return [];
    const rootId = record.itemGroupId;
    if (!rootId) return [];
    const parentName = namesFor(record)[0] ?? "";
    const childRecords = unique([
      ...(groupById.get(rootId)?.items ?? []).flatMap((entry) => {
        if (stringValue(entry.itemClass) !== "ITEM") return [];
        const retailId = stringValue(entry.retailModifiedItemId);
        const child = retailId ? recordByRetailId.get(retailId) : undefined;
        if (!child) return [];
        // Exclude a listed "child" that shares no name token with the family
        // at all — it isn't really a size/count/flavor/component member of
        // this product (see sharesNameTokenWithParent).
        const childName = namesFor(child)[0];
        if (childName && !sharesNameTokenWithParent(parentName, childName)) return [];
        return [child];
      }),
      ...(orderingOnlyVariantRecordsByGroupId.get(rootId) ?? []),
    ]);
    if (childRecords.length < 2) return [];
    // Only trust qtySizeAbbreviation as this group's real differentiator when
    // EVERY sibling carries it — see deriveVariantLabel for why a single
    // stray value must not be trusted.
    const trustSizeAbbreviation = childRecords.every(
      (child) => sourceValues(child, "qtySizeAbbreviation")[0] !== undefined,
    );
    const siblingNames = childRecords.map(
      (child) => namesFor(child)[0] ?? standardId(child),
    );
    return childRecords.map((child, childIndex) => {
      const nutrition = nutritionFor(child);
      const customization = customizationFor(child);
      return {
        id: standardId(child),
        label: deriveVariantLabel(
          namesFor(record)[0] ?? "",
          child,
          trustSizeAbbreviation,
          siblingNames,
          childIndex,
        ),
        image: imageFor(child),
        // A variant is one SKU inside the parent's single logical browse
        // product, so it inherits that product's one primary category. A
        // child's incidental source relationship must not make the same
        // card appear in a second section or distort category counts.
        categories: [primaryBrowseCategoryFor(record)],
        servingType: servingTypeFor(child),
        ...(nutrition ? { nutrition } : {}),
        ...(customization.ingredientNutritionContexts
          ? {
              ingredientNutritionContexts:
                customization.ingredientNutritionContexts,
            }
          : {}),
        source: sourceFor(child),
      };
    });
  };

  // Real ingredient/modifier records indexed by their own normalized name
  // (trailing "cheese"/whitespace stripped), used to recognize when a
  // variant sibling group's differentiator is actually a component/
  // ingredient choice (e.g. a cheese swap) rather than a size/count/portion
  // difference — see detectComponentChoiceGroup.
  function normalizeComponentToken(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\bcheese\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const ingredientRecordsByNormalizedName = new Map<string, LogicalRecord>();
  for (const record of records) {
    if (!isIngredientRecord(record)) continue;
    for (const name of namesFor(record)) {
      const key = normalizeComponentToken(name);
      if (key && !ingredientRecordsByNormalizedName.has(key)) {
        ingredientRecordsByNormalizedName.set(key, record);
      }
    }
  }

  function titleCaseWord(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function detectComponentChoiceGroup(
    variants: GeneratedVariant[],
  ): { label: string; matchedIngredientIds: Set<string> } | null {
    if (variants.length < 2) return null;
    const matchedIngredientRecords: LogicalRecord[] = [];
    let nullOptionRemainder: string | null = null;
    for (const variant of variants) {
      const label = variant.label.trim();
      const noMatch = /^no\s+(.+)$/i.exec(label);
      if (noMatch) {
        nullOptionRemainder = noMatch[1].trim();
        continue;
      }
      const ingredientRecord = ingredientRecordsByNormalizedName.get(
        normalizeComponentToken(label),
      );
      if (!ingredientRecord) return null;
      matchedIngredientRecords.push(ingredientRecord);
    }
    if (matchedIngredientRecords.length === 0) return null;
    // Cross-reference the matched ingredients' own full names to find their
    // shared trailing word (every real cheese ingredient ends in "Cheese")
    // — that becomes the customization group's display label.
    const trailingWordCounts = new Map<string, number>();
    for (const ingredientRecord of matchedIngredientRecords) {
      for (const name of namesFor(ingredientRecord)) {
        const words = name.trim().split(/\s+/);
        const last = words[words.length - 1];
        if (last) trailingWordCounts.set(last, (trailingWordCounts.get(last) ?? 0) + 1);
      }
    }
    let label: string | undefined;
    let bestCount = 0;
    for (const [word, count] of trailingWordCounts) {
      if (count > bestCount) {
        bestCount = count;
        label = word;
      }
    }
    label = label ?? (nullOptionRemainder ? titleCaseWord(nullOptionRemainder) : undefined);
    if (!label) return null;
    return {
      label,
      matchedIngredientIds: new Set(matchedIngredientRecords.map((r) => standardId(r))),
    };
  }

  function canonicalComponentChoiceVariants(
    variants: GeneratedVariant[],
  ): GeneratedVariant[] {
    const labels = new Set(variants.map((variant) => variant.label.trim().toLowerCase()));
    return variants
      .filter((variant) => {
        const secondaryState = /^(.*?)\s+-\s+no\s+.+$/i.exec(variant.label.trim());
        // A child such as "w/ Nuggets - no hash browns" is the same protein
        // choice plus a second customization state when a sibling "w/
        // Nuggets" exists in the same official parent group. It remains
        // source-retained but must not become another Protein option.
        return !secondaryState || !labels.has(secondaryState[1].trim().toLowerCase());
      })
      .map((variant) => ({
        ...variant,
        label: variant.label.replace(/^w\/\s*/i, "").trim(),
      }));
  }

  function matchedCustomizationIdsForComponent(
    customization: GeneratedCustomization | undefined,
    componentLabel: string,
  ): Set<string> {
    const normalizedLabel = componentLabel.toLowerCase();
    return new Set(
      customization?.customization?.ingredientCategories?.flatMap((category) =>
        category.name.toLowerCase().includes(normalizedLabel)
          ? category.ingredients
          : [],
      ) ?? [],
    );
  }

  const menuItems: GeneratedMenuItem[] = [];
  const pendingIngredientRecords: LogicalRecord[] = [];
  for (const record of records) {
    if (isIngredientRecord(record)) {
      pendingIngredientRecords.push(record);
      continue;
    }
    const primary = primaryOccurrence(record).entry;
    const matchResult = matches.get(record.menuRecordId);
    if (!matchResult) throw new Error(`Missing match result for ${record.menuRecordId}.`);
    const matchNutritionValue = nutritionFor(record);
    const declaredComponentChoice = declaredComponentChoiceFor(record);
    const allVariants = variantsFor(record);
    const variants = declaredComponentChoice
      ? canonicalComponentChoiceVariants(allVariants)
      : allVariants;
    const customization = record.itemClass === "ITEM" ? customizationFor(record) : undefined;
    const sourceTrace = sourceFor(record);
    let comboConfig: ComboMealConfig | undefined;
    if (record.itemClass === "ITEM_GROUPING" && record.itemGroupId && isMealRecord(record)) {
      const roles = collectMealRoles(record.itemGroupId);
      if (roles.entree.length === 1 || roles.side.length > 0 || roles.beverage.length > 0) {
        comboConfig = {
          ...(roles.entree.length === 1 ? { entreeItemId: roles.entree[0] } : {}),
          ...(roles.side.length > 0 ? { sideOptions: roles.side } : {}),
          ...(roles.beverage.length > 0 ? { drinkOptions: roles.beverage } : {}),
        };
      }
    }
    const defaultTag = stringValue(primary.defaultTag);
    const defaultVariant = defaultTag
      ? variants.find((variant) => variant.source.menu.tags.includes(defaultTag))
      : undefined;
    const resolvedDefaultVariant = defaultVariant ?? variants[0];

    // A variant-container parent (ITEM_GROUPING) never gets its own
    // customization/ingredients from customizationFor above (that only runs
    // for itemClass ITEM), even though it's the card that's actually
    // rendered — only its individual variant children carry that data
    // today. Inherit the DEFAULT variant's own customization onto the
    // parent so bread/pickle/etc. options keep working normally on the
    // rendered card, matching what selecting that variant would show.
    const defaultVariantRecord =
      resolvedDefaultVariant?.source.menu.retailModifiedItemId
        ? recordByRetailId.get(resolvedDefaultVariant.source.menu.retailModifiedItemId)
        : undefined;
    const inheritedCustomization =
      !customization && variants.length > 0 && defaultVariantRecord
        ? customizationFor(defaultVariantRecord)
        : undefined;

    // Component-choice detection (generic, not cheese-specific): a variant
    // group where every sibling's differentiator label is itself the name
    // of a real ingredient/modifier elsewhere in the menu (optionally with
    // one "No <ingredient>" null option) represents a single-component
    // choice — e.g. Pepper Jack/American/Colby Jack/No Cheese — rather than
    // a genuine size/count/portion variant. Such a group still uses the
    // exact same accurate variants[] mechanism (full official nutrition and
    // source identity per choice), it's just labeled for the UI as a named
    // customization group instead of a plain size/portion selector, and its
    // matched ingredient ids are excluded from the inherited ingredient
    // customization list so the choice isn't offered twice.
    const componentChoice =
      variants.length > 1 && !isMealRecord(record)
        ? declaredComponentChoice
          ? {
              label: declaredComponentChoice.label,
              matchedIngredientIds: matchedCustomizationIdsForComponent(
                inheritedCustomization,
                declaredComponentChoice.label,
              ),
            }
          : detectComponentChoiceGroup(variants)
        : null;
    const filteredCustomization =
      inheritedCustomization && componentChoice
        ? {
            ingredients: inheritedCustomization.ingredients.filter(
              (id) => !componentChoice.matchedIngredientIds.has(id),
            ),
            addonRefs: inheritedCustomization.addonRefs.filter(
              (id) => !componentChoice.matchedIngredientIds.has(id),
            ),
            ingredientNutritionContexts: inheritedCustomization.ingredientNutritionContexts,
            customization: inheritedCustomization.customization
              ? {
                  ingredientCategories: (
                    inheritedCustomization.customization.ingredientCategories ?? []
                  )
                    .map((category) => ({
                      ...category,
                      ingredients: normalizeName(category.name) === "extra salad proteins"
                        ? category.ingredients
                        : category.ingredients.filter(
                            (id) => !componentChoice.matchedIngredientIds.has(id),
                          ),
                    }))
                    .filter((category) => category.ingredients.length > 0),
                }
              : undefined,
          }
        : inheritedCustomization;
    const effectiveCustomization = customization ?? filteredCustomization;
    const proteinExtraByVariantId = Object.fromEntries(
      variants.flatMap((variant) => {
        const retailId = variant.source.menu.retailModifiedItemId;
        const childRecord = retailId ? recordByRetailId.get(retailId) : undefined;
        if (!childRecord) return [];
        const extraId = customizationFor(childRecord).customization?.ingredientCategories
          ?.find((category) => normalizeName(category.name) === "extra salad proteins")
          ?.ingredients[0];
        return extraId ? [[variant.id, extraId]] : [];
      }),
    ) as Record<string, string>;
    const proteinExtraIds = unique(Object.values(proteinExtraByVariantId));
    const effectiveCustomizationWithProteinExtras =
      effectiveCustomization && proteinExtraIds.length > 0
        ? (() => {
            const categories =
              effectiveCustomization.customization?.ingredientCategories ?? [];
            const existingExtraCategory = categories.find(
              (category) =>
                normalizeName(category.name) === "extra salad proteins",
            );
            return {
              ...effectiveCustomization,
              ingredients: unique([
                ...effectiveCustomization.ingredients,
                ...proteinExtraIds,
              ]),
              customization: {
                ingredientCategories: [
                  ...categories.filter(
                    (category) =>
                      normalizeName(category.name) !== "extra salad proteins",
                  ),
                  {
                    name: existingExtraCategory?.name ?? "Extra Salad Proteins",
                    id:
                      existingExtraCategory?.id ??
                      `Extra Salad Proteins [CFA ${record.itemGroupId ?? record.menuRecordId}]`,
                    ingredients: proteinExtraIds,
                    allowNone: true,
                  },
                ],
              },
            };
          })()
        : effectiveCustomization;

    // Role/visibility resolution (structural, not name-based):
    //  - A meal container (Meals / Kid's Meals / Family Style Meals) is kept
    //    for its relationship data but deferred from normal browsing for now.
    //  - An ITEM_GROUPING with 2+ real ITEM children (see variantsFor) is a
    //    genuine logical product whose sizes/counts/flavors are folded in as
    //    `variants` — it IS the browseable card, even though the raw graph
    //    never marks the grouping node itself directly "isSellable" (only
    //    its individual size/count children carry that flag) — UNLESS that
    //    grouping is itself an orphaned catalog-only family listing (see
    //    isOrphanedFamilyGrouping), in which case it stays structural even
    //    though it technically has 2+ children.
    //  - A leaf ITEM referenced nowhere beyond its own single listing (see
    //    isOrphanedEntreeComponent) is a catalog component, not a dish.
    //  - Everything else keeps the previous sellable-based default. Records
    //    that turn out to be someone else's variant child are corrected in
    //    the post-pass below once every item's `variants` list is known.
    const isDeferredMealContainer = sourceTrace.menu.role === "deferred_meal_container";
    const isOrphanedFamily = isOrphanedFamilyGrouping(record);
    const isResidueContainer = containsNonMenuResidue(record);
    const isOrphanedComponent =
      isOrphanedFamily ||
      isResidueContainer ||
      isOrphanedEntreeComponent(record) ||
      isNonMenuResidueRecord(record);
    const isVariantContainerProduct =
      variants.length > 0 &&
      !isDeferredMealContainer &&
      !isOrphanedFamily &&
      !isResidueContainer;
    if (isVariantContainerProduct) {
      sourceTrace.menu.role = "standalone_product";
    }
    const sourceOnly = isDeferredMealContainer || isOrphanedComponent
      ? true
      : isVariantContainerProduct
        ? false
        : !sourceTrace.menu.sellable;

    menuItems.push({
      id: standardId(record),
      name:
        variants.length > 0
          ? displayNameForVariantFamily(record, variants)
          : displayNameFor(record),
      image: imageFor(record),
      categories: [primaryBrowseCategoryFor(record)],
      servingType: servingTypeFor(record),
      defaultOrder: defaultOrderFor(record),
      ...(sourceValues(record, "status").includes("LTF")
        ? { status: "limited-time" as const }
        : {}),
      ...(matchNutritionValue ? { nutrition: matchNutritionValue } : {}),
      ...(variants.length > 0
        ? {
            variants,
            defaultVariantId: (defaultVariant ?? variants[0]).id,
          }
        : {}),
      ...(comboConfig ? { comboConfig } : {}),
      ...(componentChoice
        ? {
            variantGroupKind: "component" as const,
            variantGroupLabel: componentChoice.label,
            // A cheese-style component choice is a customization decision,
            // not a size/count product variant — it should never render as
            // a dropdown on the Menu card or as a segmented control next to
            // the hero photo (both read as "this is a different SKU/size").
            // The runtime instead surfaces it inside the item's
            // customization/details area (see ItemRouteModal's
            // showVariantsInDetails), while still using the exact same
            // full-nutrition variant-swap mechanism under the hood.
            hideVariantSelector: true,
          }
        : {}),
      ...(effectiveCustomizationWithProteinExtras?.ingredients.length
        ? { ingredients: effectiveCustomizationWithProteinExtras.ingredients }
        : {}),
      ...(informationalProteinFor(record)
        ? { informationalIngredients: informationalProteinFor(record) }
        : {}),
      ...(Object.keys(proteinExtraByVariantId).length > 0
        ? { proteinExtraByVariantId }
        : {}),
      ...(effectiveCustomizationWithProteinExtras?.addonRefs.length
        ? { addonRefs: effectiveCustomizationWithProteinExtras.addonRefs }
        : {}),
      ...(effectiveCustomizationWithProteinExtras?.customization
        ? { customization: effectiveCustomizationWithProteinExtras.customization }
        : {}),
      ...(effectiveCustomizationWithProteinExtras?.ingredientNutritionContexts
        ? {
            ingredientNutritionContexts:
              effectiveCustomizationWithProteinExtras.ingredientNutritionContexts,
          }
        : {}),
      ...(record.itemClass === "MODIFIER" ? { addonEligible: true } : {}),
      ...(sourceOnly ? { sourceOnly: true } : {}),
      ...(matchResult.status === "variant_container"
        ? { nutritionDerivedFromVariants: true }
        : {}),
      source: sourceTrace,
    });
  }

  // Sauce, dressing, and condiment modifiers are real user-facing portions even though
  // they also remain reusable inside entree/salad customization. Promote
  // those taxonomy records to standalone browse products. Independently
  // sellable 8oz bottles remain their own browse records beside the dipping
  // portions, preserving each official package identity and nutrition.
  for (const item of menuItems) {
    const itemTypes = new Set(item.source.menu.itemTypes);
    const isBrowseableSauceOrDressing =
      item.source.menu.itemClass === "MODIFIER" &&
      (itemTypes.has("SAUCES") ||
        itemTypes.has("DRESSINGS") ||
        itemTypes.has("CONDIMENTS")) &&
      item.nutrition !== undefined;
    if (!isBrowseableSauceOrDressing) continue;
    delete item.sourceOnly;
    item.source.menu.role = "standalone_product";
  }

  // Present everyday dipping portions before separately sold bottles while
  // preserving Chick-fil-A's source order inside each package tier.
  const sauceBrowseItems = menuItems.filter((item) =>
    item.categories.includes("Sauces"),
  );
  const sauceOrderBase = Math.min(
    ...sauceBrowseItems.map((item) => item.defaultOrder),
  );
  const saucePackageTier = (item: GeneratedMenuItem): number =>
    item.source.menu.itemTypes.includes("SAUCES")
      ? 0
      : item.source.menu.officialCategories.includes("8oz Sauces")
        ? 1
        : 2;
  sauceBrowseItems
    .sort(
      (left, right) =>
        saucePackageTier(left) - saucePackageTier(right) ||
        left.defaultOrder - right.defaultOrder,
    )
    .forEach((item, index) => {
      item.defaultOrder = sauceOrderBase + index;
    });

  // Post-pass: a record that is folded into another item's `variants` list
  // is a variant CHILD (e.g. Small/Large Hash Browns folded under the
  // "Hash Browns" logical product) — it must never also render as its own
  // independent Menu card, regardless of its own raw isSellable flag. This
  // can only be determined once every item's `variants` array has been
  // built, so it runs as a pass over the finished list rather than inline.
  const variantChildIds = new Set(
    menuItems.flatMap((item) => {
      const visibleVariantIds = (item.variants ?? [])
        .map((variant) => variant.id)
        .filter((variantId) => variantId !== item.id);
      const groupId = item.source.menu.itemGroupId;
      if (
        item.sourceOnly ||
        item.source.menu.role !== "standalone_product" ||
        !groupId
      ) {
        return visibleVariantIds;
      }
      // Every ITEM directly owned by a promoted logical-product group is an
      // internal SKU/customization state, even when it is intentionally not
      // one of the visible selectors (e.g. scramble "Nuggets - no hash
      // browns" is Protein=Nuggets plus a separate ingredient removal).
      const groupedChildIds = (groupById.get(groupId)?.items ?? []).flatMap((entry) => {
        if (stringValue(entry.itemClass) !== "ITEM") return [];
        const retailId = stringValue(entry.retailModifiedItemId);
        return retailId ? [`cfa-item-${retailId}`] : [];
      });
      return [...visibleVariantIds, ...groupedChildIds];
    }),
  );
  for (const item of menuItems) {
    if (variantChildIds.has(item.id)) {
      item.sourceOnly = true;
      item.source.menu.role = "variant_child";
    }
  }

  // Post-pass: Chick-fil-A can publish the same real-world product through
  // multiple category/group occurrences with different itemGroupIds — e.g.
  // the identical "Cream Cold Brew" listed once under a Coffee navigational
  // grouping and again under Beverages, each with its own itemGroupId. Merge
  // browse identity only from strong official evidence: the parent source
  // tag AND the complete set of child retailModifiedItemIds must match.
  // Display name alone is never a canonical identity key, and the primary
  // category is deliberately NOT part of the identity key — two occurrences
  // of the same product are expected to differ by category (that's the
  // whole reason Chick-fil-A lists it twice); requiring category equality
  // here would make this dedup unable to catch exactly that case. The
  // retained record keeps its own original primary browse category so the
  // renderer cannot surface that one logical identity in multiple sections.
  // Official category relationships remain intact in source metadata on the
  // retained and source-only records.
  const visibleGroupsByCanonicalIdentity = new Map<string, GeneratedMenuItem[]>();
  for (const item of menuItems) {
    if (
      item.sourceOnly ||
      item.categories.length === 0 ||
      item.source.menu.itemClass !== "ITEM_GROUPING" ||
      !item.variants?.length ||
      item.source.menu.tags.length === 0
    ) {
      continue;
    }
    const memberRetailIds = item.variants
      .flatMap((variant) =>
        variant.source.menu.retailModifiedItemId
          ? [variant.source.menu.retailModifiedItemId]
          : [],
      )
      .sort();
    if (memberRetailIds.length !== item.variants.length) continue;
    const key = `${[...item.source.menu.tags].sort().join(",")}|${memberRetailIds.join(",")}`;
    visibleGroupsByCanonicalIdentity.set(key, [
      ...(visibleGroupsByCanonicalIdentity.get(key) ?? []),
      item,
    ]);
  }
  for (const group of visibleGroupsByCanonicalIdentity.values()) {
    if (group.length < 2) continue;
    const [preferred, ...duplicates] = group;
    for (const item of duplicates) {
      item.sourceOnly = true;
      item.source.menu.role = "structural";
    }
  }

  // Post-pass: emit a deferred meal-container record for every entree that
  // structurally has one, not just the ones whose meal-container group
  // happened to get its own top-level category listing (and therefore its
  // own LogicalRecord going through the per-record generation above — see
  // e.g. the Chicken & Waffles limited-time items). Chick-fil-A's raw menu
  // graph (menu.itemGroups, indexed as groupById) is exhaustive — it also
  // contains meal-container groups (e.g. "Chick-fil-A® Deluxe w/ American
  // Meal") that are only ever referenced *nested* inside another structure,
  // never listed as their own category entry, so no LogicalRecord/menuItem
  // was ever created for them. Their entree/side/beverage roles are still
  // fully resolvable with the exact same generic collectMealRoles used
  // above; a group only needs to structurally look like a meal (exactly one
  // entree role plus a side and/or beverage role) to qualify — no name
  // matching, no reliance on an external "meal" tag/flag. The emitted record
  // matches the exact shape/role ("deferred_meal_container", sourceOnly,
  // servingType "combo") already used for the meal groups that DO get their
  // own top-level listing, so it needs no special-casing anywhere else in
  // the pipeline or at runtime.
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
  // Each one pushed below has no corresponding LogicalRecord (that's exactly
  // why it needed this post-pass — see comment below), so the top-level id
  // count invariant a few hundred lines down needs to allow for exactly this
  // many extra generated ids.
  let syntheticMealContainerCount = 0;
  const syntheticMealContainerIds: Array<{ id: string; groupId: string; name: string; categories: string[] }> = [];
  const descriptiveGroupEntryById = new Map<string, RawMenuEntry>();
  for (const entry of [
    ...menu.categories.flatMap((category) => category.items),
    ...menu.itemGroups.flatMap((group) => group.items),
  ]) {
    if (stringValue(entry.itemClass) !== "ITEM_GROUPING") continue;
    const groupId = stringValue(entry.itemGroupId);
    if (groupId && !descriptiveGroupEntryById.has(groupId)) {
      descriptiveGroupEntryById.set(groupId, entry);
    }
  }
  for (const groupId of groupById.keys()) {
    if (recordByGroupId.has(groupId)) continue; // already promoted through the normal per-record path above
    const roles = collectMealRoles(groupId);
    if (roles.entree.length !== 1 || (roles.side.length === 0 && roles.beverage.length === 0)) {
      continue;
    }
    const entreeItemId = roles.entree[0];
    // The resolved entree id can itself be a variant child folded into a
    // parent's `variants[]` (e.g. a cheese choice on the Deluxe Sandwich) —
    // in that case the browsable card is the parent container, so the combo
    // relationship should point at it instead. Side/drink options don't vary
    // by cheese choice, so any one qualifying variant's meal data is correct
    // for the whole family.
    const directTarget = menuItemById.get(entreeItemId);
    const target =
      directTarget && !directTarget.sourceOnly
        ? directTarget
        : menuItems.find(
            (item) => !item.sourceOnly && item.variants?.some((variant) => variant.id === entreeItemId),
          );
    if (!target) continue;
    const alreadyLinked = menuItems.some((item) => item.comboConfig?.entreeItemId === target.id);
    if (alreadyLinked) continue;
    const descriptiveEntry = descriptiveGroupEntryById.get(groupId);
    const rawName = (descriptiveEntry && stringValue(descriptiveEntry.name)) ?? `${target.name} Meal`;
    const name = sanitizeDisplayName(rawName);
    const tag = descriptiveEntry && stringValue(descriptiveEntry.tag);
    const pin = descriptiveEntry && stringValue(descriptiveEntry.pin);
    menuItems.push({
      id: `cfa-mealgroup-${groupId}`,
      name,
      image: target.image,
      categories: target.categories,
      servingType: "combo",
      sourceOnly: true,
      defaultOrder: 5000,
      comboConfig: {
        entreeItemId: target.id,
        ...(roles.side.length > 0 ? { sideOptions: roles.side } : {}),
        ...(roles.beverage.length > 0 ? { drinkOptions: roles.beverage } : {}),
      },
      source: {
        provider: "Chick-fil-A",
        menu: {
          recordId: `itemGroupId:${groupId}`,
          itemClass: "ITEM_GROUPING",
          itemGroupId: groupId,
          referencedItemGroupIds: [groupId],
          containingItemGroupIds: [],
          names: [rawName],
          tags: tag ? [tag] : [],
          pins: pin ? [pin] : [],
          itemTypes: ["MEALS_GROUP"],
          sellable: true,
          role: "deferred_meal_container",
          identitySource: "menu",
          officialCategories: target.categories,
        },
      },
    });
    syntheticMealContainerCount += 1;
    syntheticMealContainerIds.push({
      id: `cfa-mealgroup-${groupId}`,
      groupId,
      name: rawName,
      categories: target.categories,
    });
  }

  const ingredients: GeneratedIngredient[] = pendingIngredientRecords.map(
    (record) => {
      const nutrition = nutritionFor(record);
      const contextualUnits = contextualNutritionUnits.get(record.menuRecordId);
      const id = standardId(record);
      return {
        id,
        name: displayNameFor(record),
        image: imageFor(record),
        categories: categoriesFor(record),
        ...(nutrition ? { nutrition } : {}),
        ...(contextualUnits
          ? {
              contextualNutritionUnits: contextualUnits,
              nutritionResolvedByContext: true as const,
            }
          : {}),
        maxQuantity: Math.max(observedIngredientMaximum.get(id) ?? 1, 1),
        defaultOrder: defaultOrderFor(record),
        source: sourceFor(record),
      };
    },
  );

  const standardIdForEntry = (entry: RawMenuEntry): string | undefined => {
    const itemClass = stringValue(entry.itemClass);
    if (itemClass === "ITEM" || itemClass === "MODIFIER") {
      const retailId = stringValue(entry.retailModifiedItemId);
      const record = retailId ? recordByRetailId.get(retailId) : undefined;
      return record ? standardId(record) : undefined;
    }
    if (itemClass === "ITEM_GROUPING") {
      const groupId = stringValue(entry.itemGroupId);
      const record = groupId ? recordByGroupId.get(groupId) : undefined;
      return record ? standardId(record) : undefined;
    }
    return undefined;
  };

  const sourceRelationships = {
    categoryRoots: menu.categories.map((category, categoryIndex) => ({
      sourceCategoryIndex: categoryIndex,
      name: stringValue(category.name) ?? `Category ${categoryIndex + 1}`,
      tag: stringValue(category.tag) ?? null,
      itemIds: category.items.flatMap((entry) => {
        const id = standardIdForEntry(entry);
        return id ? [id] : [];
      }),
    })),
    itemGroups: menu.itemGroups.map((group) => ({
      sourceItemGroupId: stringValue(group.itemGroupId),
      options: group.items.map((entry, optionIndex) => ({
        optionIndex,
        name: stringValue(entry.name) ?? null,
        tag: stringValue(entry.tag) ?? null,
        itemClass: stringValue(entry.itemClass) ?? null,
        itemType: stringValue(entry.itemType) ?? null,
        itemGroupType: stringValue(entry.itemGroupType) ?? null,
        retailModifiedItemId: stringValue(entry.retailModifiedItemId) ?? null,
        referencedItemGroupId: stringValue(entry.itemGroupId) ?? null,
        standardizedRecordId: standardIdForEntry(entry) ?? null,
        minimum: numberValue(entry.minimum) ?? null,
        maximum: numberValue(entry.maximum) ?? null,
        thirdPartyMinimum: numberValue(entry.thirdPartyMinimum) ?? null,
        modifierType: stringValue(entry.modifierType) ?? null,
        modifierTypeGrouping: stringValue(entry.modifierTypeGrouping) ?? null,
        defaultTag: stringValue(entry.defaultTag) ?? null,
        modifierNutritionUnit:
          contextualNutritionUnitForEntry(entry) ?? null,
        selectionRole:
          stringValue(entry.itemClass) === "MODIFIER"
            ? modifierSelectionRole(entry)
            : null,
      })),
    })),
  };
  const modifierSelectionRoleCounts = sourceRelationships.itemGroups
    .flatMap((group) => group.options)
    .reduce(
      (counts, option) => {
        if (option.selectionRole) counts[option.selectionRole] += 1;
        return counts;
      },
      { included: 0, available: 0, unknown: 0 },
    );

  const unresolvedRecords = records.flatMap((record) => {
    const match = matches.get(record.menuRecordId);
    if (!match) {
      return [];
    }
    if (
      orderingMatches.has(record.menuRecordId) ||
      contextualNutritionUnits.has(record.menuRecordId)
    ) {
      return [];
    }
    const scopeConflict = isEntreeOnlyMealConflict(record, match);
    if (match.status !== "ambiguous" && match.status !== "no_match" && !scopeConflict) {
      return [];
    }
    const expected = analysisById.get(record.menuRecordId);
    const identicalDuplicatePayloads =
      match.rows.length > 1 &&
      new Set(match.rows.map(nutritionPayloadSignature)).size === 1;
    const orderingCandidates = orderingCandidatesForRecord(record);
    const orderingDetails = isMealRecord(record)
      ? "The ordering source represents this as a dynamic meal/container; no fixed nutrition payload is safe to attach."
      : record.occurrences.every(({ entry }) => entry.hideNutrition === true)
        ? "The ordering menu explicitly hides nutrition for this record."
        : !record.retailModifiedItemId
          ? "This structural menu record has no retailModifiedItemId for ordering-source identity."
          : orderingCandidates.length === 0
            ? "The ordering nutrition feed has no row matching this record's retailModifiedItemId and menu tag."
            : orderingCandidates.length > 1
              ? "The ordering feed has multiple tag-specific rows with different portion nutrition for this logical record; one record-level value would be unsafe."
              : "The ordering record exists, but its complete default nutrition composition could not be resolved safely."
    const unresolvedReason = scopeConflict
      ? "entree_only_nutrition_for_meal_container"
      : match.status === "no_match"
        ? "no_nutrition_match"
        : identicalDuplicatePayloads
          ? "multiple_identical_name_matches"
          : "multiple_conflicting_matches";
    return [
      {
        menuRecordId: record.menuRecordId,
        standardizedRecordId: standardId(record),
        recordType: expected?.recordType ?? "unknown",
        itemClass: record.itemClass,
        names: namesFor(record),
        categories: categoriesFor(record),
        retailModifiedItemId: record.retailModifiedItemId ?? null,
        itemGroupId: record.itemGroupId ?? null,
        status: "unresolved",
        matchStatus: match.status,
        rule: match.rule,
        reason: unresolvedReason,
        details: scopeConflict
          ? "The matching row is explicitly scoped to entrée-only nutrition and cannot be attached to a meal container."
          : `${match.reason ?? "No safe standalone nutrition match exists."} ${orderingDetails}`,
        candidateNutritionRows: match.rows.map((row) => ({
          sourceId: row.source_id,
          name: row.name,
          categories: row.categories.split("|").map((value) => value.trim()),
          servingSize: optionalNumber(row.serving_size) ?? null,
          nutrition: toNutrition(row),
        })),
        candidateRowsHaveIdenticalNutrition: identicalDuplicatePayloads,
        orderingCandidateNutritionRows: orderingCandidates.flatMap((item) => {
          const nutrition = orderingNutritionComponent(item);
          const sourceId = orderingSourceId(item);
          return nutrition && sourceId
            ? [{
                sourceId,
                name: stringValue(item.name as RawValue) ?? sourceId,
                servingSize: stringValue(item.servingSize as RawValue) ?? null,
                nutrition,
              }]
            : [];
        }),
      },
    ];
  });

  // Synthetic meal-container records (see the post-pass above) have no
  // backing LogicalRecord, so they never went through nutrition matching —
  // but they still correctly have no nutrition (they're a relationship
  // container, not a sellable dish), so they need the same "reported as
  // unresolved" treatment every other no-nutrition record gets.
  const syntheticUnresolvedRecords = syntheticMealContainerIds.map(({ id, groupId, name, categories }) => ({
    menuRecordId: `itemGroupId:${groupId}`,
    standardizedRecordId: id,
    recordType: "main_menu",
    itemClass: "ITEM_GROUPING" as const,
    names: [name],
    categories,
    retailModifiedItemId: null,
    itemGroupId: groupId,
    status: "unresolved" as const,
    matchStatus: "no_match" as const,
    rule: null,
    reason: "no_nutrition_match",
    details:
      "The ordering source represents this as a dynamic meal/container; no fixed nutrition payload is safe to attach.",
    candidateNutritionRows: [],
    candidateRowsHaveIdenticalNutrition: false,
    orderingCandidateNutritionRows: [],
  }));

  const allTopLevelIds = [...menuItems.map((item) => item.id), ...ingredients.map((item) => item.id)];
  if (new Set(allTopLevelIds).size !== allTopLevelIds.length) {
    throw new Error("Generated output contains duplicate top-level logical IDs.");
  }
  if (allTopLevelIds.length !== records.length + syntheticMealContainerCount) {
    throw new Error(
      `Generated ${allTopLevelIds.length} logical records from ${records.length} source records ` +
        `(expected ${records.length} + ${syntheticMealContainerCount} synthetic meal containers).`,
    );
  }
  const menuItemIds = new Set(menuItems.map((item) => item.id));
  const ingredientIds = new Set(ingredients.map((item) => item.id));
  for (const [ref, group] of Object.entries(addonGroups)) {
    for (const itemId of group.itemIds) {
      if (!menuItemIds.has(itemId)) {
        throw new Error(`Addon group ${ref} references missing menu item ${itemId}.`);
      }
    }
  }
  for (const item of menuItems) {
    for (const ingredientId of item.ingredients ?? []) {
      if (!ingredientIds.has(ingredientId) && !menuItemIds.has(ingredientId)) {
        throw new Error(`${item.id} references missing ingredient ${ingredientId}.`);
      }
    }
    for (const ref of item.addonRefs ?? []) {
      if (!addonGroups[ref]) throw new Error(`${item.id} references missing addon group ${ref}.`);
    }
    for (const optionId of [
      ...(item.comboConfig?.sideOptions ?? []),
      ...(item.comboConfig?.drinkOptions ?? []),
      ...(item.comboConfig?.entreeItemId ? [item.comboConfig.entreeItemId] : []),
    ]) {
      if (!menuItemIds.has(optionId)) {
        throw new Error(`${item.id} combo references missing item ${optionId}.`);
      }
    }
  }

  const generatedFrom = {
    menuRequestDate:
      typeof menu.generated?.menuApi?.requestDate === "string"
        ? menu.generated.menuApi.requestDate
        : null,
    menuPublishDate:
      typeof menu.generated?.menuPublishing?.publishDate === "string"
        ? menu.generated.menuPublishing.publishDate
        : null,
    menuHashCode:
      typeof menu.generated?.menuPublishing?.menuHashCode === "string"
        ? menu.generated.menuPublishing.menuHashCode
        : null,
  };
  const classification = Object.fromEntries(
    ([
      "exact_match",
      "normalized_match",
      "variant_rule_match",
      "multiple_identical_official_matches",
      "variant_container",
      "ambiguous",
      "no_match",
    ] as const).map((status) => [
      status,
      [...matches.values()].filter((match) => match.status === status).length,
    ]),
  );
  const nutritionAttached = records.filter(
    (record) => nutritionFor(record) !== undefined,
  ).length;
  const contextualNutritionResolved = contextualNutritionUnits.size;
  const nutritionResolved = nutritionAttached + contextualNutritionResolved;
  const orderingNutritionAttached = orderingMatches.size;
  const standaloneNutritionAttached = nutritionAttached - orderingNutritionAttached;
  const allUnresolvedRecords = [...unresolvedRecords, ...syntheticUnresolvedRecords];
  const unresolvedReasons = Object.fromEntries(
    unique(allUnresolvedRecords.map((record) => record.reason)).map((reason) => [
      reason,
      allUnresolvedRecords.filter((record) => record.reason === reason).length,
    ]),
  );
  const currentUserFacingRecords = records.filter(
    (record) =>
      (record.itemClass === "ITEM" || record.itemClass === "ITEM_GROUPING") &&
      directSellableCategoriesFor(record).length > 0 &&
      record.occurrences.some(({ entry }) => entry.isSellable === true),
  );
  const runtimeVisibleItems: Array<Record<string, unknown>> = [];
  const runtimeCustomizationItems: Array<Record<string, unknown>> = [];
  const runtimeDeferredItems: Array<Record<string, unknown>> = [];
  for (const record of currentUserFacingRecords) {
    const id = standardId(record);
    const generatedItem = menuItems.find((item) => item.id === id);
    // A directly sellable source SKU may now be folded beneath a canonical
    // package/flavor parent (for example an 8oz sauce bottle). Its generated
    // sourceOnly role is authoritative for runtime exposure.
    if (generatedItem?.sourceOnly === true) continue;
    const name = displayNameFor(record);
    const sourceTrace = sourceFor(record);
    const directCategories = directSellableCategoriesFor(record);
    if (isMealRecord(record)) {
      runtimeDeferredItems.push({
        itemId: id,
        name,
        decision:
          directCategories.some((category) => /kid/i.test(category))
            ? "defer_kids_meal"
            : directCategories.some((category) => /family/i.test(category))
              ? "defer_family_style_meal"
              : "defer_standard_meal",
        reason: "Meal containers are outside the approved runtime-integration scope.",
      });
      continue;
    }
    if (record.itemClass !== "ITEM") {
      runtimeDeferredItems.push({
        itemId: id,
        name,
        decision: "defer_runtime_model",
        reason: "Only source ITEM records fit the current visible-item model.",
      });
      continue;
    }
    const nutrition = nutritionFor(record);
    if (!nutrition) {
      runtimeDeferredItems.push({
        itemId: id,
        name,
        decision: "defer_unresolved_nutrition",
        reason: "No safe current official nutrition is attached.",
      });
      continue;
    }
    if (sourceValues(record, "tag").includes("GLUTENFREE_BUN_ENTREE")) {
      runtimeCustomizationItems.push({
        itemId: id,
        name,
        exposure: "customization_only",
        categories: ["Ingredients", "Buns"],
        servingType: "addon",
        rankingEligible: false,
        nutritionSource: sourceTrace.nutrition?.nutritionSource ?? null,
        sourceRecordId: record.menuRecordId,
        reason:
          "The official item is sellable, but production already models buns as customization ingredients rather than standalone cards.",
      });
      continue;
    }
    if (isOrphanedEntreeComponent(record) || isOrphanedFamilyGrouping(record)) {
      runtimeDeferredItems.push({
        itemId: id,
        name,
        decision: "defer_structural_component",
        reason:
          "This is a catalog-only component/family record (see MenuRecordRole \"structural\"): never chosen through any real ordering path in the raw graph, so it is not an independently orderable dish despite being marked isSellable.",
      });
      continue;
    }
    const mappingServingType = servingTypeFor(record);
    const mappingCategory = primaryBrowseCategoryFor(record);
    runtimeVisibleItems.push({
      itemId: id,
      name,
      exposure: "menu_item",
      categories: [mappingCategory],
      servingType: mappingServingType,
      rankingEligible: !["addon", "dessert"].includes(mappingServingType),
      defaultOrder: defaultOrderFor(record),
      nutritionSource: sourceTrace.nutrition?.nutritionSource ?? null,
      sourceRecordId: record.menuRecordId,
    });
  }
  const runtimeIntegration = {
    status: "prepared_not_promoted",
    policy: {
      currentSellableNonMealItems: "include",
      kidsMeals: "defer",
      standardMeals: "defer",
      familyStyleMeals: "defer",
      nonSellableAndStructuralRecords: "exclude_from_visibility",
      unresolvedNutrition: "defer",
      productionNutritionFallback: false,
    },
    visibleItems: runtimeVisibleItems,
    customizationItems: runtimeCustomizationItems,
    deferredItems: runtimeDeferredItems,
    summary: {
      visibleItems: runtimeVisibleItems.length,
      customizationItems: runtimeCustomizationItems.length,
      deferredItems: runtimeDeferredItems.length,
      excludedNonSellableOrStructuralRecords:
        records.length - currentUserFacingRecords.length,
    },
  };
  const restaurantOutput = {
    hasBuildYourOwn: false,
    items: menuItems,
    ingredients,
    addonGroups,
    customizationRules: {
      ingredientCategories: ingredientRules,
    } satisfies RestaurantCustomizationRules,
    importMetadata: {
      restaurant: "Chick-fil-A",
      sources: {
        menu: "data/raw/chick-fil-a/menu.json",
        nutrition: "data/raw/chick-fil-a/nutrition.csv",
        orderingNutrition: "data/raw/chick-fil-a/ordering-nutrition.json",
        verifiedMatchingAnalysis: "data/raw/chick-fil-a/match-analysis.json",
      },
      generatedFrom,
      logicalRecordCounts: {
        total: records.length + syntheticMealContainerCount,
        menuItems: menuItems.length,
        ingredients: ingredients.length,
      },
      nutritionMatches: classification,
      nutritionAttachment: {
        attached: nutritionResolved,
        standaloneNutrition: standaloneNutritionAttached,
        orderingSystem: orderingNutritionAttached,
        contextualOrderingSystem: contextualNutritionResolved,
        withheldOrUnmatched: records.length - nutritionResolved + syntheticMealContainerCount,
      },
      orderingNutritionFallback: {
        sourceRecords: orderingNutrition.items.length,
        matchedByRetailModifiedItemIdAndTag: orderingNutritionAttached,
        dynamicMealContainersExcluded: true,
        defaultModifierRule:
          "Only explicit modifierType DEFAULT records are added; recipe ingredients remain in the base item nutrition.",
        contextualModifierRule:
          "When one modifier retailModifiedItemId has multiple current menu-referenced ordering tags, the parent relationship selects the matching official nutrition unit by tag.",
      },
      customizationInterpretation: {
        contextualModifierRoles: modifierSelectionRoleCounts,
        includedModifierTypes: ["DEFAULT", "RECIPE", "NO_REFUND_RECIPE"],
        availableModifierTypes: ["EXTRA"],
        groupDefaultTagApplied: true,
        effectiveMinimumUsesThirdPartyFallback: true,
      },
      schemaCompatibility: {
        runtimeReady: unresolvedRecords.length === 0,
        nutritionPolicy:
          "Context-dependent modifiers resolve nutrition from the parent relationship; other unresolved records omit nutrition and zero values are never synthesized.",
        extensions: [
          "Per-record source trace metadata",
          "Full sourceRelationships graph",
          "Context-specific ingredient nutrition selected by parent relationship tag",
          "Optional nutrition on unresolved leaf records",
        ],
      },
    },
    sourceRelationships,
    runtimeIntegration,
  };
  const unresolvedOutput = {
    restaurant: "Chick-fil-A",
    sources: restaurantOutput.importMetadata.sources,
    generatedFrom,
    policy: {
      order: [
        "unique exact name",
        "unique conservative normalized name",
        "source-ID-keyed verified mapping",
        "multiple exact/normalized candidates with identical serving size and nutrition",
        "non-sellable variant container with nutrition attached only to distinct child variants",
        "ordering-system retailModifiedItemId plus tag identity, including explicit DEFAULT modifiers",
        "unresolved",
      ],
      fuzzyMatching: false,
      duplicateNutritionNames:
        "Duplicate-name targets attach shared nutrition only when every candidate has the same serving size and identical nutrition; all candidate source IDs remain in provenance.",
      missingNutrition:
        "The restaurant artifact omits nutrition when neither official source resolves safely, and never copies historical production nutrition.",
    },
    summary: {
      logicalRecords: records.length + syntheticMealContainerCount,
      nutritionRows: nutritionRows.length,
      orderingNutritionRows: orderingNutrition.items.length,
      ...classification,
      ordering_source_match: orderingNutritionAttached,
      contextual_ordering_source_match: contextualNutritionResolved,
      nutritionAttached: nutritionResolved,
      unresolved: unresolvedRecords.length + syntheticUnresolvedRecords.length,
      unresolvedReasons,
    },
    schemaLimitations: [
      "Unresolved non-contextual leaf records still omit nutrition even though the production MenuItem and IngredientItem types require it.",
      "The production schema cannot represent arbitrary nested source choice groups, contextual min/max rules, modifier pricing, or all source IDs directly.",
      "The full source graph is retained in restaurant.json.sourceRelationships; the generated artifact must not replace production data while unresolved nutrition remains.",
    ],
    records: [...unresolvedRecords, ...syntheticUnresolvedRecords],
  };

  await Promise.all([
    writeAtomically(OUTPUT_PATH, `${JSON.stringify(restaurantOutput, null, 2)}\n`),
    writeAtomically(UNRESOLVED_PATH, `${JSON.stringify(unresolvedOutput, null, 2)}\n`),
  ]);

  console.log(
    JSON.stringify(
      {
        output: "data/generated/chick-fil-a/restaurant.json",
        unresolvedOutput: "data/generated/chick-fil-a/unresolved.json",
        logicalRecords: records.length + syntheticMealContainerCount,
        menuItems: menuItems.length,
        ingredients: ingredients.length,
        nutritionRows: nutritionRows.length,
        orderingNutritionRows: orderingNutrition.items.length,
        matches: classification,
        orderingSystemMatches: orderingNutritionAttached,
        contextualOrderingSystemMatches: contextualNutritionResolved,
        nutritionAttached: nutritionResolved,
        unresolved: unresolvedRecords.length + syntheticUnresolvedRecords.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
