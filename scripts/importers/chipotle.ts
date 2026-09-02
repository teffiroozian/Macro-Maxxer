import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  IngredientItem,
  ItemVariant,
  MenuItem,
  RestaurantAddonGroups,
  RestaurantCustomizationRules,
} from "../../types/menu";
import type { BuilderEntreeOption, RestaurantBuilderConfig } from "../../types/builder";
import type { Nutrition } from "../../types/nutrition";
import { sanitizeDisplayName } from "../lib/display-name";
import { normalizeName } from "../lib/normalize-name";
import { writeAtomically } from "../lib/write-atomically";
import {
  CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE,
  CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE,
  CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE,
  CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID,
  CHIPOTLE_PDF_KNOWN_UNMATCHED_NAMES,
  CHIPOTLE_PDF_NAME_ALIASES,
  CHIPOTLE_SALAD_IMPLICIT_BASE,
  CHIPOTLE_TACO_TORTILLA_NUTRITION_BY_CONTEXT,
} from "./chipotle-nutrition-mappings";

const CALCULATOR_MENU_PATH = resolve("data/raw/chipotle/calculator-menu.json");
const MENU_METADATA_PATH = resolve("data/raw/chipotle/menu-metadata.json");
const MENU_METADATA_NUTRITION_PATH = resolve("data/raw/chipotle/menu-metadata-nutrition.json");
const NUTRITION_PATH = resolve("data/raw/chipotle/nutrition.json");
const ONLINE_MEALS_PATH = resolve("data/raw/chipotle/online-meals.json");
const OUTPUT_PATH = resolve("data/generated/chipotle/restaurant.json");
const UNRESOLVED_PATH = resolve("data/generated/chipotle/unresolved.json");

// --------------------------------------------------------------------------
// Raw source shapes (data/raw/chipotle/*.json)
// --------------------------------------------------------------------------

type RawContent = {
  itemType: string;
  itemId: string;
  itemName: string;
  unitPrice?: number;
  unitCount?: number;
  pricingReferenceItemId?: string | null;
  contentGroupName?: string;
  defaultContent?: boolean;
  isItemAvailable?: boolean;
};

type RawContentGroup = {
  contentGroupName: string;
  minQuantity: number;
  maxQuantity: number;
};

type RawEntree = {
  itemCategory: string;
  itemType: string;
  itemId: string;
  itemName: string;
  primaryFillingName?: string;
  unitPrice: number;
  maxContents?: number;
  maxCustomizations?: number;
  maxOnTheSideCustomizations?: number;
  maxExtras?: number;
  maxHalfs?: number;
  maxExtrasPlusHalfs?: number;
  isItemAvailable?: boolean;
  contentGroups?: RawContentGroup[];
  contents?: RawContent[];
};

type RawFlatItem = {
  itemCategory: string;
  itemType: string;
  itemId: string;
  itemName: string;
  unitPrice: number;
  maxQuantity?: number;
  isItemAvailable?: boolean;
};

type RawCalculatorMenu = {
  restaurantId: number;
  entrees: RawEntree[];
  sides: RawFlatItem[];
  drinks: RawFlatItem[];
  nonFoodItems: RawFlatItem[];
};

type RawMetadataNutritionField = { name: string; value: string; unit: string };
type RawMetadataItem = {
  thumbnailUrl?: string;
  groupName?: string;
  nutrition: RawMetadataNutritionField[];
};
type RawMenuMetadataGroupItem = { menuItemId: string; sortOrder: number };
type RawMenuMetadataGroup = { menuItemType?: string; items?: RawMenuMetadataGroupItem[] };
type RawMenuMetadataItemSection = { name: string; items?: RawMenuMetadataGroupItem[] };
type RawMenuMetadata = {
  items: Record<string, RawMetadataItem>;
  groups?: RawMenuMetadataGroup[];
  // Keyed by content-group name (e.g. "RiceContentGroup", "Toppings",
  // "PremiumContentGroup") — each section is the live calculator/ordering
  // UI's own official display order for every selectable item within it.
  itemSections?: Record<string, RawMenuMetadataItemSection>;
};

type RawLiveNutrition = {
  tcal: number;
  prot: number;
  carb: number;
  tfat: number;
  satu: number;
  tran: number;
  sodi: number;
  fibe: number;
  suga: number;
};
type RawLiveNutritionItem = {
  nutrition?: Partial<RawLiveNutrition>;
  portion?: { value: number; unit: string };
};
type RawMenuMetadataNutrition = { items: Record<string, RawLiveNutritionItem> };

type RawNutritionField = { raw: string; value: number | null };
type RawNutritionRecord = {
  name: string;
  section: "adult" | "kids";
  page: number;
  portion: { raw: string; amount: number; unit: string };
  calories: RawNutritionField;
  totalFat: RawNutritionField;
  saturatedFat: RawNutritionField;
  transFat: RawNutritionField;
  cholesterol: RawNutritionField;
  sodium: RawNutritionField;
  carbohydrates: RawNutritionField;
  dietaryFiber: RawNutritionField;
  sugar: RawNutritionField;
  protein: RawNutritionField;
};
type RawNutritionFile = { restaurant: string; records: RawNutritionRecord[] };

type RawOnlineMealContent = {
  itemId: string;
  itemName: string;
  quantity: number;
  customizationId?: number;
  customizationName?: string | null;
};
type RawOnlineMealEntree = {
  itemId: string;
  itemName: string;
  quantity: number;
  contents: RawOnlineMealContent[];
} | null;
type RawOnlineMealSide = { itemId: string; itemName: string; quantity: number };
type RawOnlineMeal = {
  mealId: string;
  mealName: string;
  mealType: string;
  mealPrice: number;
  calories: string;
  dietaryTags?: string[];
  entree: RawOnlineMealEntree;
  sides: RawOnlineMealSide[];
  drinks: RawOnlineMealSide[];
};

// --------------------------------------------------------------------------
// Generated record shapes
// --------------------------------------------------------------------------

type NutritionMethod =
  | "live_full_nutrition"
  | "pdf_exact_name"
  | "pdf_alias_name"
  | "pdf_portion_disambiguated"
  | "pdf_per_unit_override"
  | "manual_verification"
  | "approved_equivalent_official_record"
  | "approved_portion_scaling"
  | "structural_zero_choice"
  | "composed_from_components";

type SourceTrace = {
  provider: "Chipotle";
  restaurantId: number;
  menu: {
    itemIds: string[];
    itemType: string | null;
    itemCategory: string | null;
    contentGroupName?: string | null;
    buildBaseItemId?: string;
    role:
      | "standalone_product"
      | "build_container"
      | "selectable_component"
      | "structural"
      | "preconfigured_meal";
    defaultContent?: boolean;
  };
  nutrition?: {
    method: NutritionMethod;
    pdfName?: string | null;
    pdfSection?: "adult" | "kids" | null;
    liveItemId?: string | null;
    livePortion?: string | null;
    liveValidation?: "accepted" | "rejected" | null;
    metadataCalories?: number | null;
    metadataPortion?: string | null;
    note?: string;
  };
};

type GeneratedVariant = Omit<ItemVariant, "nutrition" | "source"> & {
  nutrition?: Nutrition;
  source?: SourceTrace;
};

type GeneratedMenuItem = Omit<MenuItem, "nutrition" | "variants" | "source"> & {
  nutrition?: Nutrition;
  variants?: GeneratedVariant[];
  source: SourceTrace;
};

type GeneratedIngredient = Omit<IngredientItem, "nutrition" | "variants" | "source"> & {
  nutrition?: Nutrition;
  variants?: GeneratedVariant[];
  source: SourceTrace;
};

type UnresolvedReason =
  | "missing_full_nutrition"
  | "ambiguous_pdf_match"
  | "conflicting_source_values"
  | "unsupported_preconfigured_meal"
  | "ambiguous_context"
  | "missing_required_relationship"
  | "unknown_source_semantics";

type UnresolvedRecord = {
  standardizedRecordId: string;
  name: string;
  recordType: string;
  sourceItemIds: string[];
  reason: UnresolvedReason;
  details: string;
};

// --------------------------------------------------------------------------
// Small utilities
// --------------------------------------------------------------------------

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function addNutrition(...parts: Array<Nutrition | undefined>): Nutrition | undefined {
  const present = parts.filter((part): part is Nutrition => part !== undefined);
  if (present.length === 0) return undefined;
  if (present.length !== parts.length) return undefined;
  const optionalFields = ["satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"] as const;
  const result: Nutrition = {
    calories: round3(present.reduce((sum, n) => sum + n.calories, 0)),
    protein: round3(present.reduce((sum, n) => sum + n.protein, 0)),
    carbs: round3(present.reduce((sum, n) => sum + n.carbs, 0)),
    totalFat: round3(present.reduce((sum, n) => sum + n.totalFat, 0)),
  };
  for (const field of optionalFields) {
    if (present.every((n) => n[field] !== undefined)) {
      result[field] = round3(present.reduce((sum, n) => sum + (n[field] ?? 0), 0));
    }
  }
  return result;
}

function scaleNutrition(nutrition: Nutrition, multiplier: number): Nutrition {
  const optionalFields = ["satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"] as const;
  const result: Nutrition = {
    calories: round3(nutrition.calories * multiplier),
    protein: round3(nutrition.protein * multiplier),
    carbs: round3(nutrition.carbs * multiplier),
    totalFat: round3(nutrition.totalFat * multiplier),
  };
  for (const field of optionalFields) {
    if (nutrition[field] !== undefined) result[field] = round3((nutrition[field] as number) * multiplier);
  }
  return result;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

// --------------------------------------------------------------------------
// menu-metadata.json (Calories + Portion only)
// --------------------------------------------------------------------------

type MetadataPartial = { calories: number; portionAmount: number; portionUnit: string; portionRaw: string };

function metadataPartialFor(metadata: RawMenuMetadata, itemId: string): MetadataPartial | undefined {
  const item = metadata.items[itemId];
  if (!item) return undefined;
  const calories = item.nutrition.find((field) => field.name === "Calories");
  const portion = item.nutrition.find((field) => field.name === "Portion");
  if (!calories || !portion) return undefined;
  const caloriesValue = Number(calories.value);
  const portionAmount = Number(portion.value);
  if (!Number.isFinite(caloriesValue) || !Number.isFinite(portionAmount)) return undefined;
  return {
    calories: caloriesValue,
    portionAmount,
    portionUnit: portion.unit,
    portionRaw: `${portion.value}${portion.unit}`,
  };
}

// --------------------------------------------------------------------------
// menu-metadata-nutrition.json (current official live full nutrition)
// --------------------------------------------------------------------------

const LIVE_REQUIRED_FIELDS = ["tcal", "prot", "carb", "tfat", "satu", "tran", "sodi", "fibe", "suga"] as const;

type LiveNutritionAssessment = {
  item?: RawLiveNutritionItem;
  nutrition?: Nutrition;
  portionRaw?: string;
  rejection?: string;
};

function assessLiveNutrition(file: RawMenuMetadataNutrition, itemId: string): LiveNutritionAssessment {
  const item = file.items[itemId];
  if (!item) return { rejection: "no live full-nutrition record exists" };
  const values = item.nutrition;
  if (!values) return { item, rejection: "live record has no nutrition object" };
  const missing = LIVE_REQUIRED_FIELDS.filter((field) => !Number.isFinite(values[field]));
  if (missing.length > 0) return { item, rejection: `live record is missing numeric fields: ${missing.join(", ")}` };

  const n = values as RawLiveNutrition;
  const portionRaw = item.portion ? `${item.portion.value}${item.portion.unit}` : undefined;
  if (!item.portion || !Number.isFinite(item.portion.value)) {
    return { item, portionRaw, rejection: "live record has no usable portion" };
  }
  if (item.portion.value === 0) {
    return { item, portionRaw, rejection: "live record has a placeholder 0 portion" };
  }
  if (n.tcal > 0 && n.prot === 0 && n.carb === 0 && n.tfat === 0 && n.sodi === 0) {
    return { item, portionRaw, rejection: "live record has nonzero calories with zeroed protein/carbs/fat/sodium" };
  }

  // This row repeats the sane 2oz macro panel while claiming 160 calories
  // and 4oz. The sibling 4oz row (CMG-5414) has the correctly doubled panel,
  // so accepting CMG-5413 would silently preserve an internally conflicting
  // duplicate-context value.
  if (itemId === "CMG-5413") {
    return {
      item,
      portionRaw,
      rejection: "live 4oz/160cal sauce row repeats the 2oz macro panel and conflicts with sane sibling CMG-5414",
    };
  }

  // Calories are label-rounded, and fiber/sugar handling can move the macro
  // estimate modestly. A very large gap still catches duplicated or partial
  // panels without pretending the estimate itself is authoritative.
  const macroCalories = n.prot * 4 + n.carb * 4 + n.tfat * 9;
  if (n.tcal > 0 && Math.abs(n.tcal - macroCalories) > Math.max(50, n.tcal * 0.35)) {
    return {
      item,
      portionRaw,
      rejection: `live calorie value (${n.tcal}) is internally implausible for its macro panel (~${round3(macroCalories)} calories)`,
    };
  }

  return {
    item,
    portionRaw,
    nutrition: {
      calories: n.tcal,
      protein: n.prot,
      carbs: n.carb,
      totalFat: n.tfat,
      satFat: n.satu,
      transFat: n.tran,
      sodium: n.sodi,
      fiber: n.fibe,
      sugars: n.suga,
    },
  };
}

// --------------------------------------------------------------------------
// nutrition.json (official PDF) matching
// --------------------------------------------------------------------------

function pdfRecordSignature(record: RawNutritionRecord): string {
  return JSON.stringify([record.name, record.section, record.portion.raw, record.calories.value]);
}

function buildPdfIndex(file: RawNutritionFile): Map<string, RawNutritionRecord[]> {
  const seenSignatures = new Set<string>();
  const index = new Map<string, RawNutritionRecord[]>();
  for (const record of file.records) {
    const signature = pdfRecordSignature(record);
    if (seenSignatures.has(signature)) continue; // page2/page3 verbatim duplicate
    seenSignatures.add(signature);
    const key = `${record.section}|${normalizeName(record.name)}`;
    index.set(key, [...(index.get(key) ?? []), record]);
  }
  return index;
}

function nutritionFromPdfRow(row: RawNutritionRecord): Nutrition {
  const nutrition: Nutrition = {
    calories: row.calories.value ?? 0,
    protein: row.protein.value ?? 0,
    carbs: row.carbohydrates.value ?? 0,
    totalFat: row.totalFat.value ?? 0,
  };
  if (row.saturatedFat.value !== null) nutrition.satFat = row.saturatedFat.value;
  if (row.transFat.value !== null) nutrition.transFat = row.transFat.value;
  if (row.cholesterol.value !== null) nutrition.cholesterol = row.cholesterol.value;
  if (row.sodium.value !== null) nutrition.sodium = row.sodium.value;
  if (row.dietaryFiber.value !== null) nutrition.fiber = row.dietaryFiber.value;
  if (row.sugar.value !== null) nutrition.sugars = row.sugar.value;
  return nutrition;
}

type PdfMatch = {
  row: RawNutritionRecord;
  method: NutritionMethod;
  note?: string;
};

// Conservative matcher: exact/alias name + section, disambiguated by portion
// amount only when a name+section pair has more than one published size.
// Never guesses across sections (adult vs kids) and never picks between
// multiple same-portion candidates.
function matchPdf(
  index: Map<string, RawNutritionRecord[]>,
  name: string,
  section: "adult" | "kids",
  portionAmountHint?: number,
  caloriesHint?: number,
): PdfMatch | undefined {
  if (CHIPOTLE_PDF_KNOWN_UNMATCHED_NAMES.has(name)) return undefined;
  const candidates: Array<{ name: string; method: NutritionMethod }> = [
    { name, method: "pdf_exact_name" },
    ...(CHIPOTLE_PDF_NAME_ALIASES[name]
      ? [{ name: CHIPOTLE_PDF_NAME_ALIASES[name], method: "pdf_alias_name" as const }]
      : []),
  ];
  for (const candidate of candidates) {
    const rows = index.get(`${section}|${normalizeName(candidate.name)}`);
    if (!rows || rows.length === 0) continue;
    if (rows.length === 1) {
      // A single candidate row: require calorie agreement, the reliable
      // signal. Chipotle's own metadata "Portion" field can disagree with
      // the PDF's portion label for the exact same real product (Fresh
      // Tomato Salsa / Roasted Chili-Corn Salsa report 3.5oz vs the PDF's
      // 4oz at an identical, exactly-matching calorie value — source-
      // analysis.md §3/§6 documents this as a known unit-label quirk, not a
      // true product mismatch) — so portion disagreement alone must not
      // block an otherwise exact calorie match. A genuine quantity mismatch
      // (e.g. a single Taco's much smaller protein portion vs the standard
      // 4oz protein row) always shows up as a real calorie mismatch instead.
      if (caloriesHint === undefined || rows[0].calories.value === caloriesHint) {
        return { row: rows[0], method: candidate.method };
      }
      continue;
    }
    // Multiple candidate rows for this name+section (distinct sizes/flavors,
    // e.g. Sprite 22 vs 32 fl oz): portion is the reliable discriminator.
    if (portionAmountHint !== undefined) {
      const portionMatches = rows.filter((row) => row.portion.amount === portionAmountHint);
      if (portionMatches.length === 1) {
        return { row: portionMatches[0], method: "pdf_portion_disambiguated" };
      }
    }
  }
  return undefined;
}

// Guacamole and Queso Blanco each publish three PDF rows by portion size
// (topping/entree ~2-4oz, side, large) under distinct suffixed names. This
// resolves the live 2/4/8oz variant to the matching suffixed PDF row.
function matchSizedPdfRow(
  index: Map<string, RawNutritionRecord[]>,
  baseName: "Guacamole" | "Queso Blanco",
  portionAmount: number,
  caloriesHint?: number,
): PdfMatch | undefined {
  const suffixByAmount: Record<string, Record<number, string>> = {
    Guacamole: { 2: "Guacamole", 4: "Guacamole (topping/side)", 8: "Guacamole (large)" },
    "Queso Blanco": { 1: "Queso Blanco", 2: "Queso Blanco (entreé)", 4: "Queso Blanco (side)", 8: "Queso Blanco (large)" },
  };
  const pdfName = suffixByAmount[baseName]?.[portionAmount];
  if (!pdfName) return undefined;
  const rows = index.get(`adult|${normalizeName(pdfName)}`) ?? index.get(`kids|${normalizeName(pdfName)}`);
  if (!rows || rows.length !== 1) return undefined;
  if (caloriesHint !== undefined && rows[0].calories.value !== caloriesHint) return undefined;
  return { row: rows[0], method: "pdf_portion_disambiguated" };
}

// --------------------------------------------------------------------------
// Ingredient category classification (generic name-pattern rules — Chipotle's
// own itemType field lumps nearly everything as "Toppings", so a finer,
// restaurant-agnostic browse/customization category is derived from name
// patterns instead, the same fallback approach Chick-fil-A's importer uses
// for its own coarse itemType values).
// --------------------------------------------------------------------------

function categoryForIngredientName(name: string): string {
  if (/salsa/i.test(name)) return "Salsas";
  if (/guacamole/i.test(name)) return "Guacamole";
  if (/queso/i.test(name)) return "Queso";
  if (/sour cream/i.test(name)) return "Sour Cream";
  if (/cheese/i.test(name)) return "Cheese";
  if (/lettuce/i.test(name)) return "Lettuce";
  if (/vinaigrette/i.test(name)) return "Dressing";
  if (/fajita veg/i.test(name)) return "Fajita Veggies";
  if (/cilantro lime sauce/i.test(name)) return "Sauces";
  if (/rice/i.test(name)) return "Rice";
  if (/beans/i.test(name)) return "Beans";
  if (/tortilla/i.test(name)) return "Tortillas";
  return "Toppings";
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const [calculatorMenu, menuMetadata, liveNutritionFile, nutritionFile, onlineMeals] = await Promise.all([
    readJson<RawCalculatorMenu>(CALCULATOR_MENU_PATH),
    readJson<RawMenuMetadata>(MENU_METADATA_PATH),
    readJson<RawMenuMetadataNutrition>(MENU_METADATA_NUTRITION_PATH),
    readJson<RawNutritionFile>(NUTRITION_PATH),
    readJson<RawOnlineMeal[]>(ONLINE_MEALS_PATH),
  ]);

  const pdfIndex = buildPdfIndex(nutritionFile);
  const restaurantId = calculatorMenu.restaurantId;

  // menu-metadata.json's per-meal-type groups (Bowl, Burrito, Tacos, ...)
  // each list their preconfigured entree ids with an official sortOrder —
  // this is the current live Chipotle UI's own display order (verified
  // against chipotle.com: Pollo Asado, Chicken, Steak, Beef Barbacoa,
  // Carnitas, Sofritas, then Veggie/Guacamole/Queso Blanco/Cheese Only).
  // Every entree id appears in exactly one group, so a flat search across
  // all groups resolves the official order for any protein/context entree.
  const officialSortOrderByEntreeId = new Map<string, number>();
  for (const group of menuMetadata.groups ?? []) {
    for (const item of group.items ?? []) {
      officialSortOrderByEntreeId.set(item.menuItemId, item.sortOrder);
    }
  }
  function officialEntreeSortOrder(itemId: string): number | undefined {
    return officialSortOrderByEntreeId.get(itemId);
  }

  // menu-metadata.json's top-level itemSections is the live calculator's
  // own per-content-group display order (e.g. section "Toppings" put
  // Cilantro Lime Sauce, then Guacamole, then Fresh Tomato Salsa, Roasted
  // Chili-Corn, Tomatillo-Green, Tomatillo-Red, ... — verified directly
  // against chipotle.com; the raw per-entree `contents` array order that
  // was previously used for this does NOT reliably match it). Every raw
  // content record already carries its own contentGroupName identifying
  // which section it belongs to for that occurrence — a small number of
  // itemTypes (adult "Toppings", the Burrito "Double Wrap" Option) have an
  // empty contentGroupName in the source, where the itemType name itself is
  // the matching section key (both "Toppings" and "Option" exist as
  // sections). Using the content's own group name/type is what keeps this
  // correct automatically as future menu refreshes/LTOs change section
  // contents, rather than hardcoding a fixed id-to-order table.
  const itemSectionOrderByKey = new Map<string, Map<string, number>>();
  for (const [sectionKey, section] of Object.entries(menuMetadata.itemSections ?? {})) {
    const byItemId = new Map<string, number>();
    for (const item of section.items ?? []) {
      byItemId.set(item.menuItemId, item.sortOrder);
    }
    itemSectionOrderByKey.set(sectionKey, byItemId);
  }
  // menuMetadata.itemSections' own "Toppings" section order has been
  // manually checked against the live chipotle.com ordering UI twice now
  // and found wrong both times (it does not match the actual rendered
  // topping order) — this explicit list is the verified-correct one and
  // takes priority over the itemSections-derived value for exactly these
  // shared topping ids, wherever they appear (Bowl/Burrito/Salad/Tacos/
  // Kids-BYO all resolve the same underlying generated ingredient record,
  // so one override here is reflected everywhere the ingredient is shown).
  // Rice/Beans/Tortillas and all other sections still use the itemSections
  // lookup below, which has not been reported wrong.
  const VERIFIED_TOPPING_ORDER_BY_ITEM_ID: Record<string, number> = {
    "CMG-5412": 1, // Cilantro Lime Sauce
    "CMG-1029": 2, // Queso Blanco
    "CMG-1001": 3, // Guacamole
    "CMG-5201": 4, // Fresh Tomato Salsa
    "CMG-5202": 5, // Roasted Chili-Corn Salsa
    "CMG-5353": 6, // Chipotle-Honey Vinaigrette
    "CMG-5203": 7, // Tomatillo-Green Chili Salsa
    "CMG-5204": 8, // Tomatillo-Red Chili Salsa
    "CMG-5251": 9, // Sour Cream
    "CMG-5101": 10, // Fajita Veggies
    "CMG-5252": 11, // Cheese
    "CMG-5351": 12, // Romaine Lettuce
  };
  function officialContentSortOrder(content: RawContent): number | undefined {
    const verifiedOrder = VERIFIED_TOPPING_ORDER_BY_ITEM_ID[content.itemId];
    if (verifiedOrder !== undefined) return verifiedOrder;
    const sectionKey = content.contentGroupName || content.itemType;
    return itemSectionOrderByKey.get(sectionKey)?.get(content.itemId);
  }

  const unresolved: UnresolvedRecord[] = [];
  const generatedItems: GeneratedMenuItem[] = [];
  const generatedIngredients: GeneratedIngredient[] = [];
  const generatedIngredientIds = new Set<string>();

  function pushUnresolved(record: UnresolvedRecord): void {
    unresolved.push(record);
  }

  function pdfMatchFor(
    name: string,
    section: "adult" | "kids",
    portionAmountHint: number | undefined,
    caloriesHint: number | undefined,
  ): PdfMatch | undefined {
    const sizedMatch =
      /guacamole/i.test(name) || /queso blanco/i.test(name)
        ? matchSizedPdfRow(
            pdfIndex,
            /guacamole/i.test(name) ? "Guacamole" : "Queso Blanco",
            portionAmountHint ?? -1,
            caloriesHint,
          )
        : undefined;
    return sizedMatch ?? matchPdf(pdfIndex, name, section, portionAmountHint, caloriesHint);
  }

  function directNutrition(
    itemId: string,
    name: string,
    section: "adult" | "kids",
  ): { nutrition?: Nutrition; trace?: SourceTrace["nutrition"]; liveRejection?: string } {
    const metadata = metadataPartialFor(menuMetadata, itemId);
    const live = assessLiveNutrition(liveNutritionFile, itemId);
    if (live.nutrition) {
      const match = pdfMatchFor(name, section, live.item?.portion?.value, live.nutrition.calories);
      const nutrition = { ...live.nutrition };
      if (match?.row.cholesterol.value !== null && match?.row.cholesterol.value !== undefined) {
        nutrition.cholesterol = match.row.cholesterol.value;
      }
      return {
        nutrition,
        trace: {
          method: "live_full_nutrition",
          liveItemId: itemId,
          livePortion: live.portionRaw ?? null,
          liveValidation: "accepted",
          pdfName: match?.row.name ?? null,
          pdfSection: match?.row.section ?? null,
          metadataCalories: metadata?.calories ?? live.nutrition.calories,
          metadataPortion: metadata?.portionRaw ?? live.portionRaw ?? null,
          note: match?.row.cholesterol.value !== null && match?.row.cholesterol.value !== undefined
            ? "Current live full nutrition is authoritative; cholesterol is preserved from the confidently corresponding official PDF row because the live endpoint omits cholesterol."
            : "Current live full nutrition is authoritative; cholesterol remains unavailable because the live endpoint omits it and no confident corresponding PDF row exists.",
        },
      };
    }

    const match = pdfMatchFor(name, section, metadata?.portionAmount, metadata?.calories);
    if (match) {
      return {
        nutrition: nutritionFromPdfRow(match.row),
        trace: {
          method: match.method,
          pdfName: match.row.name,
          pdfSection: match.row.section,
          liveItemId: live.item ? itemId : null,
          livePortion: live.portionRaw ?? null,
          liveValidation: live.item ? "rejected" : null,
          metadataCalories: metadata?.calories ?? null,
          metadataPortion: metadata?.portionRaw ?? null,
          note: live.item ? `Live full-nutrition row was rejected: ${live.rejection}. Official PDF fallback used.` : undefined,
        },
        liveRejection: live.rejection,
      };
    }
    return { liveRejection: live.rejection };
  }

  type DerivedNutrition = { nutrition: Nutrition; trace: NonNullable<SourceTrace["nutrition"]> };

  const LARGE_SALSA_RULES: Readonly<Record<string, { baseId: string; baseName: string; basePortion: number; targetPortion: number }>> = {
    "CMG-5400": { baseId: "CMG-5203", baseName: "Tomatillo-Green Chili Salsa", basePortion: 2, targetPortion: 6 },
    "CMG-1049": { baseId: "CMG-5203", baseName: "Tomatillo-Green Chili Salsa", basePortion: 2, targetPortion: 6 },
    "CMG-1047": { baseId: "CMG-5201", baseName: "Fresh Tomato Salsa", basePortion: 4, targetPortion: 6 },
    "CMG-5398": { baseId: "CMG-5201", baseName: "Fresh Tomato Salsa", basePortion: 4, targetPortion: 6 },
    "CMG-1048": { baseId: "CMG-5202", baseName: "Roasted Chili-Corn Salsa", basePortion: 4, targetPortion: 6 },
    "CMG-5399": { baseId: "CMG-5202", baseName: "Roasted Chili-Corn Salsa", basePortion: 4, targetPortion: 6 },
    "CMG-1050": { baseId: "CMG-5204", baseName: "Tomatillo-Red Chili Salsa", basePortion: 2, targetPortion: 6 },
    "CMG-5500": { baseId: "CMG-5204", baseName: "Tomatillo-Red Chili Salsa", basePortion: 2, targetPortion: 6 },
  };

  function deriveLargeSalsa(itemId: string): DerivedNutrition | undefined {
    const rule = LARGE_SALSA_RULES[itemId];
    if (!rule) return undefined;
    const base = directNutrition(rule.baseId, rule.baseName, "adult");
    if (!base.nutrition) return undefined;
    const nutrition = scaleNutrition(base.nutrition, rule.targetPortion / rule.basePortion);
    const live = liveNutritionFile.items[itemId]?.nutrition;
    if (Number.isFinite(live?.tcal)) nutrition.calories = live!.tcal!;
    return {
      nutrition,
      trace: {
        method: "approved_portion_scaling",
        liveItemId: itemId,
        livePortion: `${rule.targetPortion}oz`,
        liveValidation: "rejected",
        metadataCalories: Number.isFinite(live?.tcal) ? live!.tcal! : null,
        metadataPortion: `${rule.targetPortion}oz`,
        note: `Approved large-salsa rule: scaled trusted ${rule.baseName} (${rule.baseId}) nutrition from its published ${rule.basePortion}oz reference portion to ${rule.targetPortion}oz. Preserved Chipotle's explicit live calorie value; the large row's zeroed macro panel was rejected. Fresh Tomato and Roasted Chili-Corn use the official PDF's 4oz reference portion because the live 3.5oz label is a documented portion-label quirk.`,
      },
    };
  }

  const COMPOSED_SIDE_COMPONENTS: Readonly<Record<string, ReadonlyArray<{ itemId: string; name: string }>>> = {
    "CMG-5369": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-5398", name: "Large Fresh Tomato Salsa" },
    ],
    "CMG-5370": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-5400", name: "Large Tomatillo-Green Chili Salsa" },
    ],
    "CMG-5371": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-5500", name: "Large Tomatillo-Red Chili Salsa" },
    ],
    "CMG-5372": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-5399", name: "Large Roasted Chili-Corn Salsa" },
    ],
    "CMG-5364": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-1001", name: "Guacamole" },
    ],
    "CMG-5365": [
      { itemId: "CMG-5362", name: "Chili Lime Chips" },
      { itemId: "CMG-1030", name: "Side of Queso Blanco" },
    ],
    "CMG-5366": [
      { itemId: "CMG-5363", name: "Large Chili Lime Chips" },
      { itemId: "CMG-1025", name: "Large Side of Guacamole" },
    ],
    "CMG-5367": [
      { itemId: "CMG-5363", name: "Large Chili Lime Chips" },
      { itemId: "CMG-1031", name: "Large Side of Queso Blanco" },
    ],
  };

  function deriveComposedSide(itemId: string): DerivedNutrition | undefined {
    const components = COMPOSED_SIDE_COMPONENTS[itemId];
    if (!components) return undefined;
    const resolved = components.map((component) => {
      const scaled = deriveLargeSalsa(component.itemId);
      return scaled?.nutrition ?? directNutrition(component.itemId, component.name, "adult").nutrition;
    });
    const nutrition = addNutrition(...resolved);
    if (!nutrition) return undefined;
    const publishedCalories = liveNutritionFile.items[itemId]?.nutrition?.tcal;
    if (Number.isFinite(publishedCalories) && Math.abs(nutrition.calories - publishedCalories!) <= 10) {
      nutrition.calories = publishedCalories!;
    }
    return {
      nutrition,
      trace: {
        method: "composed_from_components",
        liveItemId: itemId,
        livePortion: liveNutritionFile.items[itemId]?.portion
          ? `${liveNutritionFile.items[itemId]!.portion!.value}${liveNutritionFile.items[itemId]!.portion!.unit}`
          : null,
        liveValidation: "rejected",
        metadataCalories: Number.isFinite(publishedCalories) ? publishedCalories! : null,
        note: `Approved chips-and-dip composition: rejected the combination row's zeroed macro panel and summed ${components.map((component) => `${component.name} (${component.itemId})`).join(" + ")}. A published combination calorie value is preserved only when it is within 10 calories of the component sum.`,
      },
    };
  }

  function deriveEquivalentOfficialPanel(itemId: string): DerivedNutrition | undefined {
    if (itemId !== "CMG-5413") return undefined;
    const equivalent = directNutrition("CMG-5414", "Cilantro Lime Sauce", "adult");
    if (!equivalent.nutrition) return undefined;
    const broken = assessLiveNutrition(liveNutritionFile, itemId);
    return {
      nutrition: equivalent.nutrition,
      trace: {
        method: "approved_equivalent_official_record",
        liveItemId: itemId,
        livePortion: broken.portionRaw ?? "4oz",
        liveValidation: "rejected",
        metadataCalories: 160,
        metadataPortion: "4oz",
        note: "Approved record-specific resolution from import-decisions.md §9: CMG-5413 remains the ordering/source identity, but its internally inconsistent repeated 2oz macro panel is rejected. Nutrition comes from equivalent sane official 4oz/160cal Cilantro Lime Sauce record CMG-5414; no values are inferred from CMG-5413's broken macros.",
      },
    };
  }

  function ingredientNutrition(
    itemId: string,
    name: string,
    section: "adult" | "kids",
    recordIdForUnresolved: string,
  ): { nutrition?: Nutrition; trace: SourceTrace["nutrition"] } {
    const metadata = metadataPartialFor(menuMetadata, itemId);
    const direct = directNutrition(itemId, name, section);
    if (direct.nutrition) return { nutrition: direct.nutrition, trace: direct.trace };
    const derived = deriveEquivalentOfficialPanel(itemId) ?? deriveLargeSalsa(itemId) ?? deriveComposedSide(itemId);
    if (derived) return derived;
    const live = assessLiveNutrition(liveNutritionFile, itemId);
    pushUnresolved({
      standardizedRecordId: recordIdForUnresolved,
      name,
      recordType: "ingredient",
      sourceItemIds: [itemId],
      reason: "missing_full_nutrition",
      details: `${live.item ? `Live full-nutrition row rejected: ${live.rejection}. ` : `No live full-nutrition row exists for ${itemId}. `}${
        metadata
          ? `No official PDF nutrition row matched "${name}" (${section} section, metadata ${metadata.calories}cal/${metadata.portionRaw}), and no approved composition/scaling rule applies.`
          : `No official PDF nutrition row matched "${name}" (${section} section), menu-metadata.json has no Calories/Portion entry, and no approved composition/scaling rule applies.`
      }`,
    });
    return {
      trace: metadata
        ? {
            method: "live_full_nutrition",
            liveItemId: live.item ? itemId : null,
            livePortion: live.portionRaw ?? null,
            liveValidation: live.item ? "rejected" : null,
            pdfName: null,
            pdfSection: null,
            metadataCalories: metadata.calories,
            metadataPortion: metadata.portionRaw,
            note: live.rejection,
          }
        : undefined,
    };
  }

  const FOUNTAIN_FLAVOR_CANDIDATES = [
    "Coca-Cola Classic",
    "Diet Coke",
    "Diet Coke, Caffeine Free",
    "Coca-Cola Zero",
    "Coca Cola Life",
    "Sprite",
    "Fanta Orange",
    "Dr. Pepper",
    "Diet Dr. Pepper",
    "Mountain Dew",
    "Diet Mountain Dew",
    "Mello Yello",
    "Pibb Xtra",
    "Barq's Root Beer",
    "Mug Root Beer",
    "Pepsi",
    "Diet Pepsi",
    "Sierra Mist",
    "Crush Orange",
    "Powerade Mountain Berry Blast",
    "Chipotle Iced Tea",
    "Chipotle Sweet Iced Tea",
    "Lipton Raspberry Brisk Iced Tea",
  ];

  function buildKidsFountainVariants(itemId: string): { variants: GeneratedVariant[]; missingFlavors: string[] } {
    const variants: GeneratedVariant[] = [];
    const missingFlavors: string[] = [];
    for (const flavorName of FOUNTAIN_FLAVOR_CANDIDATES) {
      const rows = pdfIndex.get(`adult|${normalizeName(flavorName)}`) ?? [];
      const sourceRow = rows.find((row) => row.portion.amount === 22) ?? rows.find((row) => row.portion.amount === 32);
      if (!sourceRow || sourceRow.calories.value === null) {
        missingFlavors.push(flavorName);
        pushUnresolved({
          standardizedRecordId: `chipotle-fountain-16-fl-oz-${slugify(flavorName)}`,
          name: `16 fl oz ${flavorName}`,
          recordType: "fountain_flavor_variant",
          sourceItemIds: [itemId],
          reason: "missing_full_nutrition",
          details: `No valid official 22fl oz or 32fl oz PDF nutrition row exists for ${flavorName}; only this flavor remains unresolved under generic Kids fountain container ${itemId}.`,
        });
        continue;
      }
      const factor = 16 / sourceRow.portion.amount;
      variants.push({
        id: `chipotle-fountain-16-fl-oz-${slugify(flavorName)}`,
        label: flavorName,
        categories: ["Beverages"],
        nutrition: scaleNutrition(nutritionFromPdfRow(sourceRow), factor),
        source: {
          provider: "Chipotle",
          restaurantId,
          menu: { itemIds: [itemId], itemType: "Beverage", itemCategory: "Content", role: "selectable_component" },
          nutrition: {
            method: "approved_portion_scaling",
            pdfName: sourceRow.name,
            pdfSection: sourceRow.section,
            liveItemId: itemId,
            livePortion: "16fl oz",
            liveValidation: "rejected",
            metadataCalories: metadataPartialFor(menuMetadata, itemId)?.calories ?? null,
            metadataPortion: metadataPartialFor(menuMetadata, itemId)?.portionRaw ?? "16fl oz",
            note: `Approved Kids fountain rule from import-decisions.md §10: ${itemId} is the generic 16fl-oz ordering parent. ${flavorName} nutrition is the official ${sourceRow.portion.amount}fl-oz PDF flavor row scaled by 16/${sourceRow.portion.amount} (${round3(factor)}). The generic 220cal/zero-carbohydrate live placeholder is rejected; no flavor-specific CMG id is invented.`,
          },
        },
      });
    }
    return { variants, missingFlavors };
  }

  // ------------------------------------------------------------------------
  // Canonical selectable-component ingredients (Rice, Beans, Toppings,
  // Salsas, Cheese, Sour Cream, Guacamole, Queso, Vinaigrette, Lettuce,
  // Fajita Veggies, Tortillas, Options/Addons) — deduplicated by itemId
  // across every active (non-catering) entree's contents[].
  // ------------------------------------------------------------------------

  const ACTIVE_ENTREE_TYPES = new Set(["Burrito", "Bowl", "Salad", "Quesadilla", "Tacos", "KidsBYO", "KidsQuesadilla"]);
  const activeEntrees = calculatorMenu.entrees.filter((entree) => ACTIVE_ENTREE_TYPES.has(entree.itemType));
  const cateringEntrees = calculatorMenu.entrees.filter((entree) => !ACTIVE_ENTREE_TYPES.has(entree.itemType));

  for (const entree of cateringEntrees) {
    pushUnresolved({
      standardizedRecordId: `chipotle-${slugify(entree.itemId)}`,
      name: entree.itemName,
      recordType: "catering_entree",
      sourceItemIds: [entree.itemId],
      reason: "unsupported_preconfigured_meal",
      details:
        `${entree.itemName} (${entree.itemType}) uses the catering/large-format ingredient namespace (CMG-537x/539x-style ids), which this first-pass importer deliberately does not model to avoid conflating it with the individual-order ingredient namespace (see data/review/chipotle/source-analysis.md §10.C). Preserved here as unresolved rather than imported.`,
    });
  }

  const contentIdsByType = new Map<string, Set<string>>();
  const rawContentById = new Map<string, RawContent>();
  for (const entree of activeEntrees) {
    for (const content of entree.contents ?? []) {
      if (content.itemType === "HalfPortion" || content.itemType === "ExtraPortion") continue;
      if (!rawContentById.has(content.itemId)) rawContentById.set(content.itemId, content);
      const set = contentIdsByType.get(content.itemType) ?? new Set<string>();
      set.add(content.itemId);
      contentIdsByType.set(content.itemType, set);
    }
  }

  // "No X" placeholder selections (0-cal null choices within a content
  // group) are not real ingredients — they mark that a category allows
  // "none selected" rather than becoming their own generated record.
  function isNullSelection(itemId: string, name: string): boolean {
    if (!/^no /i.test(name)) return false;
    const metadata = metadataPartialFor(menuMetadata, itemId);
    return metadata?.calories === 0;
  }

  for (const [itemType, ids] of contentIdsByType) {
    if (itemType === "Tortillas") continue; // handled specially below (taco-tortilla PDF override + kids/adult context)
    // Falls back to first-occurrence position only if a content id is ever
    // missing from menuMetadata.itemSections (shouldn't happen in practice).
    for (const [orderWithinType, itemId] of [...ids].entries()) {
      const content = rawContentById.get(itemId);
      if (!content) continue;
      if (isNullSelection(itemId, content.itemName)) continue;
      const id = `chipotle-${slugify(itemId)}`;
      if (generatedIngredientIds.has(id)) continue;
      generatedIngredientIds.add(id);
      const officialOrder = officialContentSortOrder(content) ?? orderWithinType;
      if (itemId === "CMG-5551") {
        const { variants } = buildKidsFountainVariants(itemId);
        generatedIngredients.push({
          id,
          name: sanitizeDisplayName(content.itemName),
          categories: ["Beverages"],
          nutrition: undefined,
          variants,
          defaultVariantId: variants[0]?.id,
          maxQuantity: 1,
          defaultOrder: officialOrder,
          source: {
            provider: "Chipotle",
            restaurantId,
            menu: { itemIds: [itemId], itemType, itemCategory: "Content", role: "selectable_component" },
            nutrition: {
              method: "approved_portion_scaling",
              liveItemId: itemId,
              livePortion: "16fl oz",
              liveValidation: "rejected",
              metadataCalories: metadataPartialFor(menuMetadata, itemId)?.calories ?? null,
              metadataPortion: metadataPartialFor(menuMetadata, itemId)?.portionRaw ?? "16fl oz",
              note: `Generic Kids 16fl-oz ordering container with ${variants.length} flavor-specific variants derived under import-decisions.md §10. The live 220cal/zero-carbohydrate placeholder is never used as flavor nutrition; each variant carries its own official PDF flavor-row provenance and scaling factor.`,
            },
          },
        });
        continue;
      }
      const category =
        content.itemType === "Side"
          ? "Kids Side"
          : content.itemType === "Beverage"
            ? "Kids Drink"
            : categoryForIngredientName(content.itemName);
      const { nutrition, trace } = ingredientNutrition(itemId, content.itemName, "adult", id);
      generatedIngredients.push({
        id,
        name: sanitizeDisplayName(content.itemName),
        categories: [category],
        nutrition,
        maxQuantity: 1,
        defaultOrder: officialOrder,
        source: {
          provider: "Chipotle",
          restaurantId,
          menu: { itemIds: [itemId], itemType, itemCategory: "Content", role: "selectable_component" },
          nutrition: trace,
        },
      });
    }
  }

  function ingredientIdFor(itemId: string): string {
    return `chipotle-${slugify(itemId)}`;
  }

  // ------------------------------------------------------------------------
  // Taco tortillas have distinct official single- and three-tortilla panels.
  // CMG-5501/CMG-5503 remain the ordering identities in both contexts, while
  // each generated context record carries its own direct nutrition rather
  // than multiplying rounded values from the other context.
  // ------------------------------------------------------------------------

  type TortillaKey = "soft_flour" | "crispy_corn";
  const TORTILLA_KEY_BY_ITEM_ID: Record<string, TortillaKey> = { "CMG-5501": "soft_flour", "CMG-5503": "crispy_corn" };

  function tortillaIngredientId(key: TortillaKey, contextSuffix: string): string {
    return `chipotle-tortilla-${key === "soft_flour" ? "soft-flour" : "crispy-corn"}-${contextSuffix}`;
  }

  for (const [tortillaOrder, [key, def]] of (
    Object.entries(CHIPOTLE_TACO_TORTILLA_NUTRITION_BY_CONTEXT) as Array<
      [TortillaKey, (typeof CHIPOTLE_TACO_TORTILLA_NUTRITION_BY_CONTEXT)[TortillaKey]]
    >
  ).entries()) {
    // TortillaContentGroup's own official order (menu-metadata.json) puts
    // Crispy Corn before Soft Flour for the adult Taco context.
    const tortillaContent = rawContentById.get(def.sourceItemId);
    const officialTortillaOrder =
      (tortillaContent ? officialContentSortOrder(tortillaContent) : undefined) ?? tortillaOrder;
    const singleId = tortillaIngredientId(key, "taco");
    const trioId = tortillaIngredientId(key, "tacos-3");
    generatedIngredients.push({
      id: singleId,
      name: sanitizeDisplayName(def.label),
      categories: ["Tortillas"],
      nutrition: def.single,
      maxQuantity: 1,
      defaultOrder: officialTortillaOrder,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: { itemIds: [def.sourceItemId], itemType: "Tortillas", itemCategory: "Content", role: "selectable_component" },
        nutrition: {
          method: "manual_verification",
          pdfName: def.label,
          pdfSection: "adult",
          note: `Single Taco uses its explicit official one-tortilla context nutrition. ${def.sourceItemId} remains the source/selection identity; no value is derived from the three-tortilla context.`,
        },
      },
    });
    generatedIngredients.push({
      id: trioId,
      name: sanitizeDisplayName(def.label),
      categories: ["Tortillas"],
      nutrition: def.trio,
      maxQuantity: 1,
      defaultOrder: officialTortillaOrder,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: { itemIds: [def.sourceItemId], itemType: "Tortillas", itemCategory: "Content", role: "selectable_component" },
        nutrition: {
          method: "live_full_nutrition",
          liveItemId: def.sourceItemId,
          livePortion: def.trioPortion,
          liveValidation: "accepted",
          metadataCalories: def.trio.calories,
          metadataPortion: def.trioPortion,
          pdfName: def.label,
          pdfSection: "adult",
          note: `Tacos(3) uses ${def.sourceItemId}'s explicit official three-tortilla context nutrition. No value is calculated from the single-tortilla context.`,
        },
      },
    });
  }

  // Kids-BYO tortillas (CMG-5403/5404) use the official kids 2 ea panels,
  // while Kids-Quesadilla tortilla (CMG-5401) keeps its direct captured 1oz
  // panel. Each generated record is already one complete selectable serving.
  // Their official order also comes from TortillaContentGroup, where
  // Kids-BYO's own pair is Soft then Crispy — genuinely different from the
  // adult Taco pair above, preserved since each context has its own ids.
  for (const kidsTortillaId of ["CMG-5403", "CMG-5404", "CMG-5401"]) {
    if (!rawContentById.has(kidsTortillaId)) continue;
    const content = rawContentById.get(kidsTortillaId)!;
    const id = ingredientIdFor(kidsTortillaId);
    if (generatedIngredientIds.has(id)) continue;
    generatedIngredientIds.add(id);
    const kidsByoNutrition =
      CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID[kidsTortillaId];
    const resolved = kidsByoNutrition
      ? {
          nutrition: kidsByoNutrition.nutrition,
          trace: {
            method: "pdf_portion_disambiguated" as const,
            pdfName: kidsByoNutrition.pdfName,
            pdfSection: "kids" as const,
            liveItemId: kidsTortillaId,
            note: `${content.itemName} is one selectable Kids Build Your Own serving containing two tortillas. Its direct official kids 2 ea panel is used as-is and must not be multiplied again at runtime.`,
          },
        }
      : ingredientNutrition(kidsTortillaId, content.itemName, "kids", id);
    generatedIngredients.push({
      id,
      name: sanitizeDisplayName(content.itemName),
      categories: ["Tortillas"],
      nutrition: resolved.nutrition,
      maxQuantity: 1,
      defaultOrder: officialContentSortOrder(content) ?? 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: { itemIds: [kidsTortillaId], itemType: "Tortillas", itemCategory: "Content", role: "selectable_component" },
        nutrition: resolved.trace,
      },
    });
  }

  // The source graph has two required format bases with official nutrition
  // but no dedicated CMG child identity: an adult Burrito's tortilla and a
  // Salad's Supergreens mix. They were already used when composing the
  // generated container totals; emitting them as generated ingredient
  // records also makes that composition addressable by presets and the
  // runtime builder. These are format-level records, not hand-authored
  // per-meal ingredient lists.
  const burritoBaseTortillaId = "chipotle-cmg-4026-burrito-base";
  generatedIngredientIds.add(burritoBaseTortillaId);
  generatedIngredients.push({
    id: burritoBaseTortillaId,
    name: "Tortilla",
    categories: ["Included Ingredients"],
    nutrition: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.nutrition,
    maxQuantity: 1,
    defaultOrder: 0,
    source: {
      provider: "Chipotle",
      restaurantId,
      menu: {
        itemIds: ["CMG-4026"],
        itemType: "IncludedBase",
        itemCategory: "Burrito",
        role: "selectable_component",
      },
      nutrition: {
        method: "approved_equivalent_official_record",
        pdfName: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.pdfName,
        pdfSection: "adult",
        note: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.note,
      },
    },
  });

  const saladSupergreensBaseId = "chipotle-salad-supergreens-base";
  generatedIngredientIds.add(saladSupergreensBaseId);
  generatedIngredients.push({
    id: saladSupergreensBaseId,
    name: CHIPOTLE_SALAD_IMPLICIT_BASE.label,
    categories: ["Included Ingredients"],
    nutrition: CHIPOTLE_SALAD_IMPLICIT_BASE.nutrition,
    maxQuantity: 1,
    defaultOrder: 0,
    source: {
      provider: "Chipotle",
      restaurantId,
      menu: {
        itemIds: activeEntrees
          .filter((entree) => entree.itemType === "Salad")
          .map((entree) => entree.itemId),
        itemType: "IncludedBase",
        itemCategory: "Salad",
        role: "selectable_component",
      },
      nutrition: {
        method: "pdf_exact_name",
        pdfName: CHIPOTLE_SALAD_IMPLICIT_BASE.pdfName,
        pdfSection: "adult",
        note: CHIPOTLE_SALAD_IMPLICIT_BASE.note,
      },
    },
  });

  // ------------------------------------------------------------------------
  // Protein registry: canonical per-protein ingredient with Half/Normal/Extra
  // ItemVariant siblings in the standard context. Current direct live values
  // win; the approved 0.5x/2x rule is limited to the five core proteins and
  // requires both an explicit pricingReferenceItemId relationship and a live
  // calorie value that validates the ratio.
  // ------------------------------------------------------------------------

  type ProteinContext = "standard" | "taco-single" | "taco-trio" | "kids-byo" | "kids-quesadilla";

  function formatGroupFor(entree: RawEntree): ProteinContext | "catering" | null {
    switch (entree.itemType) {
      case "Burrito":
      case "Bowl":
      case "Salad":
      case "Quesadilla":
        return "standard";
      case "Tacos":
        return /\(3\)$/.test(entree.itemName) ? "taco-trio" : "taco-single";
      case "KidsBYO":
        return "kids-byo";
      case "KidsQuesadilla":
        return "kids-quesadilla";
      case "BYOProtein":
      case "BYOChips":
        return "catering";
      default:
        return null;
    }
  }

  // "Cheese Only" is the no-additional-protein form of the already-included
  // Quesadilla cheese base (adult and kids), not a selectable extra portion.
  const proteinNames = unique(
    activeEntrees.flatMap((entree) =>
      entree.primaryFillingName && entree.primaryFillingName !== "Cheese Only" ? [entree.primaryFillingName] : [],
    ),
  );

  const proteinIngredientIdByContext = new Map<string, string>(); // `${proteinSlug}|${context}` -> ingredient id
  const CORE_SCALABLE_PROTEINS = new Set(["Chicken", "Steak", "Carnitas", "Beef Barbacoa", "Sofritas"]);

  function proteinNutrition(
    entree: RawEntree,
    proteinName: string,
    section: "adult" | "kids",
    recordIdForUnresolved: string,
  ): { nutrition?: Nutrition; trace: SourceTrace["nutrition"] } {
    if (proteinName === "Veggie") {
      return {
        nutrition: { calories: 0, protein: 0, carbs: 0, totalFat: 0, satFat: 0, transFat: 0, sodium: 0, fiber: 0, sugars: 0 },
        trace: {
          method: "structural_zero_choice",
          liveItemId: entree.itemId,
          liveValidation: "rejected",
          note: "Veggie entree identity is an explicit structural no-protein choice. Its real default guacamole/fajita-vegetable nutrition is represented by content components, so the 0oz/0cal entree identity is not treated as missing protein nutrition.",
        },
      };
    }
    return ingredientNutrition(entree.itemId, proteinName, section, recordIdForUnresolved);
  }

  for (const proteinName of proteinNames) {
    const proteinSlug = slugify(proteinName);
    const entreesForProtein = activeEntrees.filter((entree) => entree.primaryFillingName === proteinName);

    const standardEntrees = entreesForProtein.filter((entree) => formatGroupFor(entree) === "standard");
    if (standardEntrees.length > 0) {
      const primary = standardEntrees[0];
      const { nutrition, trace } = proteinNutrition(primary, proteinName, "adult", `chipotle-protein-${proteinSlug}`);
      const variants: GeneratedVariant[] = [
        {
          id: `chipotle-protein-${proteinSlug}-normal`,
          label: "Normal",
          categories: [],
          nutrition,
          source: {
            provider: "Chipotle",
            restaurantId,
            menu: { itemIds: [primary.itemId], itemType: primary.itemType, itemCategory: "Entree", role: "selectable_component" },
            nutrition: trace,
          },
        },
      ];
      const standardIds = new Set(standardEntrees.map((entree) => entree.itemId));
      // Half/Extra swap records for THIS protein are not necessarily listed
      // within this protein's OWN entrees — e.g. "Half Chicken" never
      // appears inside any Chicken entree's own contents (self-halving your
      // base protein isn't offered), only inside sibling proteins' entrees
      // as a mix-in option (e.g. Steak Burrito's own contents include "Half
      // Chicken"). pricingReferenceItemId still correctly identifies which
      // protein/format the swap belongs to regardless of which entree
      // contains it, so the search must span every standard-format entree
      // (any protein), not just this protein's own family.
      const allStandardFormatContents = activeEntrees
        .filter((entree) => formatGroupFor(entree) === "standard")
        .flatMap((entree) => entree.contents ?? []);
      const halfContent = allStandardFormatContents.find(
        (content) => content.itemType === "HalfPortion" && standardIds.has(content.pricingReferenceItemId ?? ""),
      );
      const extraContent = allStandardFormatContents.find(
        (content) => content.itemType === "ExtraPortion" && standardIds.has(content.pricingReferenceItemId ?? ""),
      );
      for (const [content, label] of [
        [halfContent, "Half"],
        [extraContent, "Extra"],
      ] as const) {
        if (!content) continue;
        const metadataForPortion = metadataPartialFor(menuMetadata, content.itemId);
        const direct = directNutrition(content.itemId, content.itemName, "adult");
        const multiplier = label === "Half" ? 0.5 : 2;
        const liveCalories = liveNutritionFile.items[content.itemId]?.nutrition?.tcal;
        const relationshipIsExplicit = standardIds.has(content.pricingReferenceItemId ?? "");
        const coreScaleIsValidated =
          CORE_SCALABLE_PROTEINS.has(proteinName) &&
          relationshipIsExplicit &&
          nutrition !== undefined &&
          Number.isFinite(liveCalories) &&
          Math.abs(liveCalories! - nutrition.calories * multiplier) < 0.001;
        const standardPollo = assessLiveNutrition(liveNutritionFile, "CMG-11");
        const kidsPollo = assessLiveNutrition(liveNutritionFile, "CMG-3013");
        const tacoPollo = assessLiveNutrition(liveNutritionFile, "CMG-1212");
        const polloHalfScaleIsApproved =
          proteinName === "Pollo Asado" &&
          label === "Half" &&
          content.itemId === "CMG-5609" &&
          relationshipIsExplicit &&
          nutrition !== undefined &&
          standardPollo.nutrition?.calories === 180 &&
          standardPollo.item?.portion?.value === 4 &&
          kidsPollo.nutrition?.calories === 90 &&
          kidsPollo.item?.portion?.value === 2 &&
          tacoPollo.nutrition?.calories === 60 &&
          tacoPollo.item?.portion?.value === 1.3;
        const approvedScaleIsValidated = coreScaleIsValidated || polloHalfScaleIsApproved;
        const variantNutrition = direct.nutrition ?? (approvedScaleIsValidated ? scaleNutrition(nutrition!, multiplier) : undefined);
        const variantTrace: SourceTrace["nutrition"] = direct.trace ??
          (approvedScaleIsValidated
            ? {
                method: "approved_portion_scaling",
                liveItemId: content.itemId,
                livePortion: liveNutritionFile.items[content.itemId]?.portion
                  ? `${liveNutritionFile.items[content.itemId]!.portion!.value}${liveNutritionFile.items[content.itemId]!.portion!.unit}`
                  : null,
                liveValidation: liveNutritionFile.items[content.itemId] ? "rejected" : null,
                metadataCalories: Number.isFinite(liveCalories) ? liveCalories! : variantNutrition?.calories ?? null,
                metadataPortion: metadataForPortion?.portionRaw ?? null,
                note: polloHalfScaleIsApproved
                  ? "Approved record-specific Pollo Asado resolution from import-decisions.md §8: CMG-5609 is 0.5x the trusted official standard 4oz Pollo Asado panel. Its explicit HalfPortion/pricingReferenceItemId relationship is corroborated by direct official 180cal/4oz standard, 90cal/2oz Kids, and 60cal/1.3oz single-Taco records. CMG-5609 has no direct nutrition record; this does not authorize scaling unrelated LTOs."
                  : `Approved core-protein ${label} rule: ${multiplier}x the trusted Normal ${proteinName} panel. Applied only because ${content.itemId}.pricingReferenceItemId explicitly points to this protein family and the live ${liveCalories}cal value validates the ${multiplier}x ratio; the live row's zeroed macros/0oz portion were rejected.`,
              }
            : {
                method: "live_full_nutrition",
                liveItemId: liveNutritionFile.items[content.itemId] ? content.itemId : null,
                livePortion: liveNutritionFile.items[content.itemId]?.portion
                  ? `${liveNutritionFile.items[content.itemId]!.portion!.value}${liveNutritionFile.items[content.itemId]!.portion!.unit}`
                  : null,
                liveValidation: liveNutritionFile.items[content.itemId] ? "rejected" : null,
                metadataCalories: metadataForPortion?.calories ?? null,
                metadataPortion: metadataForPortion?.portionRaw ?? null,
                note: direct.liveRejection,
              });
        const variantId = `chipotle-protein-${proteinSlug}-${label.toLowerCase()}`;
        variants.push({
          id: variantId,
          label,
          categories: [],
          nutrition: variantNutrition,
          source: {
            provider: "Chipotle",
            restaurantId,
            menu: {
              itemIds: [content.itemId],
              itemType: content.itemType,
              itemCategory: "Content",
              role: "selectable_component",
            },
            nutrition: variantTrace,
          },
        });
        if (!variantNutrition) {
          pushUnresolved({
            standardizedRecordId: variantId,
            name: content.itemName,
            recordType: "protein_portion_variant",
            sourceItemIds: [content.itemId],
            reason: "missing_full_nutrition",
            details: `${direct.liveRejection ?? `No live full-nutrition record exists for ${content.itemId}`}. ${
              metadataForPortion
                ? `Current Calories/Portion metadata is ${metadataForPortion.calories}cal/${metadataForPortion.portionRaw}.`
                : "No Calories/Portion metadata record exists either."
            } No official PDF row matches this portion, and the approved core-protein ${label} scaling rule does not apply to ${proteinName} without validating live evidence.`,
          });
        }
      }
      const proteinIngredientId = `chipotle-protein-${proteinSlug}`;
      proteinIngredientIdByContext.set(`${proteinSlug}|standard`, proteinIngredientId);
      generatedIngredients.push({
        id: proteinIngredientId,
        name: sanitizeDisplayName(proteinName),
        categories: ["Proteins"],
        nutrition: undefined,
        variants: variants as ItemVariant[] as unknown as GeneratedVariant[],
        defaultVariantId: `chipotle-protein-${proteinSlug}-normal`,
        maxQuantity: 1,
        // Standard context always resolves via the Burrito entree (the
        // first "standard"-format entree for every protein, per the raw
        // source's own entree ordering) — its official menu-metadata.json
        // group sortOrder is the live Chipotle UI's actual protein order.
        defaultOrder: officialEntreeSortOrder(primary.itemId) ?? 0,
        // Veggie is a structural no-protein identity (0cal/0g placeholder;
        // its real default nutrition lives on guac/fajita-veggie toppings,
        // see proteinNutrition above) — kept for source fidelity/provenance
        // but never a real selectable protein, so it's hidden from every
        // ingredient-facing UI surface without removing the record itself.
        hideFromIngredientView: proteinName === "Veggie" ? true : undefined,
        source: {
          provider: "Chipotle",
          restaurantId,
          menu: {
            itemIds: standardEntrees.map((entree) => entree.itemId),
            itemType: "Protein",
            itemCategory: "Content",
            role: "selectable_component",
          },
          nutrition: trace,
        },
      });
      // The variant-level nutrition lives on the variants themselves; the
      // parent ingredient record's own top-level nutrition is intentionally
      // left undefined (nutritionDerivedFromVariants-style container),
      // mirroring the Chick-fil-A variant-container convention.
      const parent = generatedIngredients[generatedIngredients.length - 1];
      (parent.variants as GeneratedVariant[])[0].nutrition = nutrition;
    }

    for (const [context, suffix] of [
      ["taco-single", "taco"],
      ["taco-trio", "tacos-3"],
      ["kids-byo", "kids-byo"],
      ["kids-quesadilla", "kids-quesadilla"],
    ] as const) {
      const entree = entreesForProtein.find((candidate) => formatGroupFor(candidate) === context);
      if (!entree) continue;
      const section: "adult" | "kids" = context === "kids-byo" || context === "kids-quesadilla" ? "kids" : "adult";
      const id = `chipotle-protein-${proteinSlug}-${suffix}`;
      const { nutrition, trace } = proteinNutrition(entree, proteinName, section, id);
      proteinIngredientIdByContext.set(`${proteinSlug}|${context}`, id);
      generatedIngredients.push({
        id,
        name: sanitizeDisplayName(proteinName),
        categories: ["Proteins"],
        nutrition,
        maxQuantity: 1,
        // Each context (taco, tacos-3, kids-byo, kids-quesadilla) has its
        // own official group in menu-metadata.json with its own sortOrder —
        // e.g. Kids-Quesadilla places Guacamole before Sofritas while
        // Kids-BYO places it after, a genuine context-specific difference
        // preserved here since each context already has its own protein id.
        defaultOrder: officialEntreeSortOrder(entree.itemId) ?? 0,
        // See the standard-context Veggie note above — same structural
        // no-protein identity, hidden from ingredient UI in every context.
        hideFromIngredientView: proteinName === "Veggie" ? true : undefined,
        source: {
          provider: "Chipotle",
          restaurantId,
          menu: { itemIds: [entree.itemId], itemType: entree.itemType, itemCategory: "Entree", role: "selectable_component" },
          nutrition: trace,
        },
      });
    }
  }

  // Note: "Guacamole" and "Queso Blanco" appear as primaryFillingName on
  // Kids-Build-Your-Own-only entrees (CMG-3007, CMG-3011) with no adult
  // equivalent — the proteinNames/entreesForProtein loop above already
  // covers them generically (they simply have no "standard"/taco/kids-
  // quesadilla context, only "kids-byo"), so no separate handling is needed.

  // ------------------------------------------------------------------------
  // Build containers
  // ------------------------------------------------------------------------

  type IngredientCategoryRuleEntry = { minQuantity?: number; maxQuantity?: number; allowNone?: boolean };
  type IngredientCategoryDef = { name: string; id: string; ingredients: string[]; allowNone: boolean };
  const customizationRules: Record<string, IngredientCategoryRuleEntry> = {};

  function contentGroupCategoryLabel(itemType: string, contentGroupName: string | undefined): string {
    if (contentGroupName === "RiceContentGroup") return "Rice";
    if (contentGroupName === "BeansContentGroup") return "Beans";
    if (contentGroupName === "TortillaContentGroup") return "Tortillas";
    if (contentGroupName === "ToppingsContentGroup" || contentGroupName === "OptionContentGroup") return "Toppings";
    if (contentGroupName === "PremiumContentGroup") return "Addons";
    if (itemType === "Rice") return "Rice";
    if (itemType === "Beans") return "Beans";
    if (itemType === "Tortillas") return "Tortillas";
    if (contentGroupName === "DipContentGroup") return "Dips";
    if (contentGroupName === "AddonContentGroup") return "Addons";
    if (contentGroupName === "FillingsContentGroup") return "Fillings";
    if (contentGroupName === "SideContentGroup") return "Kids Side";
    if (contentGroupName === "DrinkContentGroup") return "Kids Drink";
    if (itemType === "Option" || itemType === "Options") return "Toppings";
    return "Toppings";
  }

  function buildIngredientCategoriesFor(
    entree: RawEntree,
    context: ProteinContext,
  ): { categories: IngredientCategoryDef[]; defaultIngredientIds: string[] } {
    const byLabel = new Map<string, { ingredients: string[]; allowNone: boolean }>();
    const defaultIngredientIds: string[] = [];
    for (const content of entree.contents ?? []) {
      if (content.itemType === "HalfPortion" || content.itemType === "ExtraPortion" || content.itemType === "Option") continue;
      if (isNullSelection(content.itemId, content.itemName)) {
        const label = contentGroupCategoryLabel(content.itemType, content.contentGroupName);
        const bucket = byLabel.get(label) ?? { ingredients: [], allowNone: false };
        bucket.allowNone = true;
        byLabel.set(label, bucket);
        continue;
      }
      const label = contentGroupCategoryLabel(content.itemType, content.contentGroupName);
      const isKidsTortilla = ["CMG-5401", "CMG-5403", "CMG-5404"].includes(content.itemId);
      const ingredientId =
        content.itemType === "Tortillas" && TORTILLA_KEY_BY_ITEM_ID[content.itemId]
          ? tortillaIngredientId(
              TORTILLA_KEY_BY_ITEM_ID[content.itemId],
              context === "taco-trio" ? "tacos-3" : "taco",
            )
          : isKidsTortilla
            ? ingredientIdFor(content.itemId)
            : ingredientIdFor(content.itemId);
      if (!generatedIngredientIds.has(ingredientId) && !isKidsTortilla && content.itemType !== "Tortillas") continue;
      const bucket = byLabel.get(label) ?? { ingredients: [], allowNone: false };
      bucket.ingredients.push(ingredientId);
      byLabel.set(label, bucket);
      if (content.defaultContent) defaultIngredientIds.push(ingredientId);
    }
    for (const group of entree.contentGroups ?? []) {
      const label = contentGroupCategoryLabel("", group.contentGroupName);
      const bucket = byLabel.get(label);
      if (bucket && group.minQuantity === 0) bucket.allowNone = true;
      const categoryId = `${slugify(entree.itemType)}-${slugify(label)}`;
      customizationRules[categoryId] = {
        minQuantity: group.minQuantity,
        maxQuantity: group.maxQuantity < 0 ? 999 : group.maxQuantity,
        allowNone: bucket?.allowNone ?? group.minQuantity === 0,
      };
      const existingRule: IngredientCategoryRuleEntry = customizationRules[label] ?? {};
      customizationRules[label] = {
        ...existingRule,
        maxQuantity: Math.max(existingRule.maxQuantity ?? 0, group.maxQuantity < 0 ? 999 : group.maxQuantity),
        minQuantity: Math.max(existingRule.minQuantity ?? 0, group.minQuantity),
        allowNone: (existingRule.allowNone ?? true) && group.minQuantity === 0,
      };
    }
    const categories = [...byLabel.entries()].map(([name, value]) => ({
      name,
      id: `${slugify(entree.itemType)}-${slugify(name)}`,
      ingredients: unique(value.ingredients),
      allowNone: value.allowNone,
    }));
    return { categories, defaultIngredientIds };
  }

  function proteinCategoryFor(context: ProteinContext, extraKidsProteins: string[] = []): { name: string; ingredients: string[]; allowNone: boolean } {
    const ingredients = proteinNames.flatMap((proteinName) => {
      const slug = slugify(proteinName);
      const id = proteinIngredientIdByContext.get(`${slug}|${context}`);
      return id ? [id] : [];
    });
    for (const extra of extraKidsProteins) {
      const id = proteinIngredientIdByContext.get(`${slugify(extra)}|kids-byo`);
      if (id) ingredients.push(id);
    }
    return { name: "Protein", ingredients: unique(ingredients), allowNone: false };
  }

  const builderEntreeOptions: Record<string, BuilderEntreeOption> = {};

  function buildStandardContainer(
    itemType: "Burrito" | "Bowl" | "Salad" | "Quesadilla",
    id: string,
    label: string,
    category: string,
  ): void {
    const representative = activeEntrees.find((entree) => entree.itemType === itemType);
    if (!representative) return;
    const { categories, defaultIngredientIds } = buildIngredientCategoriesFor(representative, "standard");
    const proteinCategory = {
      ...proteinCategoryFor("standard"),
      // The verified Cheese Quesadilla base is a complete no-added-protein
      // build; "Cheese Only" is represented by selecting no extra filling.
      allowNone: itemType === "Quesadilla",
    };
    const allCategories = [proteinCategory, ...categories];

    let baseNutrition: Nutrition | undefined;
    const compositionNotes: string[] = [];
    if (itemType === "Salad") {
      baseNutrition = CHIPOTLE_SALAD_IMPLICIT_BASE.nutrition;
      compositionNotes.push(CHIPOTLE_SALAD_IMPLICIT_BASE.note);
    } else if (itemType === "Quesadilla") {
      const base = CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE;
      baseNutrition = addNutrition(
        scaleNutrition(base.tortillaPerUnitNutrition, base.tortillaCount),
        scaleNutrition(base.cheesePerUnitNutrition, base.cheesePortionCount),
      );
      compositionNotes.push(base.note);
    } else if (itemType === "Burrito") {
      baseNutrition = CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.nutrition;
      compositionNotes.push(CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.note);
    }

    const defaultProteinId = proteinIngredientIdByContext.get(`${slugify("Chicken")}|standard`);
    const defaultProteinNutrition = defaultProteinId
      ? generatedIngredients.find((ingredient) => ingredient.id === defaultProteinId)?.variants?.find((v) => v.id.endsWith("-normal"))?.nutrition
      : undefined;
    const defaultContentNutrition = defaultIngredientIds
      .map((ingredientId) => generatedIngredients.find((ingredient) => ingredient.id === ingredientId)?.nutrition)
      .filter((n): n is Nutrition => n !== undefined);
    const composedDefault = addNutrition(
      ...[baseNutrition, defaultProteinNutrition, ...defaultContentNutrition].filter((part): part is Nutrition => part !== undefined),
    );

    generatedItems.push({
      id,
      name: label,
      image: "none",
      categories: [category],
      servingType: "entree",
      nutrition: composedDefault ?? defaultProteinNutrition,
      ingredients: unique([...(defaultProteinId ? [defaultProteinId] : []), ...defaultIngredientIds]),
      customization: { ingredientCategories: allCategories as NonNullable<MenuItem["customization"]>["ingredientCategories"] },
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: activeEntrees.filter((e) => e.itemType === itemType).map((e) => e.itemId),
          itemType,
          itemCategory: "Entree",
          role: "build_container",
        },
        nutrition: composedDefault
          ? {
              method: "composed_from_components",
              note:
                compositionNotes.join(" ") ||
                "Bowl default/base nutrition is composed from the default Chicken protein only because this format has no implicit base and the source publishes no default rice, beans, or topping selections. It is a build starting state, not a claim that the protein-only entree source is a finished customized meal.",
            }
          : undefined,
      },
    });

    builderEntreeOptions[slugify(label)] = {
      id,
      label,
      image: "none",
      includedIngredientIds: defaultIngredientIds,
    };
  }

  buildStandardContainer("Burrito", "chipotle-burrito", "Burrito", "Burrito");
  buildStandardContainer("Bowl", "chipotle-bowl", "Bowl", "Bowl");
  buildStandardContainer("Salad", "chipotle-salad", "Salad", "Salad");
  buildStandardContainer("Quesadilla", "chipotle-quesadilla", "Quesadilla", "Quesadilla");

  function buildTacoContainer(context: "taco-single" | "taco-trio", id: string, label: string, tortillaSuffix: "taco" | "tacos-3"): void {
    const representative = activeEntrees.find((entree) => entree.itemType === "Tacos" && formatGroupFor(entree) === context);
    if (!representative) return;
    const { categories } = buildIngredientCategoriesFor(representative, context);
    const proteinCategory = proteinCategoryFor(context);
    const tortillaCategory = {
      name: "Tortilla",
      id: `${tortillaSuffix}-tortilla`,
      ingredients: (["soft_flour", "crispy_corn"] as const).map((key) => tortillaIngredientId(key, tortillaSuffix)),
      allowNone: false,
    };
    const tortillaSourceGroup = representative.contentGroups?.find((group) => group.contentGroupName === "TortillaContentGroup");
    if (tortillaSourceGroup) {
      customizationRules[tortillaCategory.id] = {
        minQuantity: tortillaSourceGroup.minQuantity,
        maxQuantity: tortillaSourceGroup.maxQuantity < 0 ? 999 : tortillaSourceGroup.maxQuantity,
        allowNone: false,
      };
    }
    const allCategories = [proteinCategory, tortillaCategory, ...categories.filter((c) => c.name !== "Tortillas")];

    const defaultProteinId = proteinIngredientIdByContext.get(`${slugify("Chicken")}|${context}`);
    const defaultProteinNutrition = defaultProteinId
      ? generatedIngredients.find((ingredient) => ingredient.id === defaultProteinId)?.nutrition
      : undefined;
    const defaultTortillaId = tortillaIngredientId("soft_flour", tortillaSuffix);
    const defaultTortillaNutrition = generatedIngredients.find((ingredient) => ingredient.id === defaultTortillaId)?.nutrition;
    const composedDefault = addNutrition(defaultProteinNutrition, defaultTortillaNutrition);
    if (!composedDefault) {
      pushUnresolved({
        standardizedRecordId: id,
        name: label,
        recordType: "build_container",
        sourceItemIds: activeEntrees.filter((e) => e.itemType === "Tacos" && formatGroupFor(e) === context).map((e) => e.itemId),
        reason: "missing_full_nutrition",
        details: `${label}'s default composed nutrition (Chicken protein + tortilla) is unavailable because the default Chicken protein in this container context has no matching official PDF row at this portion (see the corresponding protein ingredient's own unresolved entry) — the container's own top-level nutrition is intentionally omitted rather than showing an inaccurate zero value.`,
      });
    }

    generatedItems.push({
      id,
      name: label,
      image: "none",
      categories: ["Tacos"],
      servingType: "entree",
      nutrition: composedDefault,
      ingredients: unique([...(defaultProteinId ? [defaultProteinId] : []), defaultTortillaId]),
      customization: { ingredientCategories: allCategories as NonNullable<MenuItem["customization"]>["ingredientCategories"] },
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: activeEntrees.filter((e) => e.itemType === "Tacos" && formatGroupFor(e) === context).map((e) => e.itemId),
          itemType: "Tacos",
          itemCategory: "Entree",
          role: "build_container",
        },
        nutrition: composedDefault
          ? {
              method: "composed_from_components",
              note: `${context === "taco-trio" ? "Tacos(3)" : "Single Taco"} nutrition = protein + (${context === "taco-trio" ? "3x" : "1x"}) selected tortilla per import-decisions.md §5.`,
            }
          : undefined,
      },
    });
    builderEntreeOptions[slugify(label)] = { id, label, image: "none", includedIngredientIds: [] };
  }

  buildTacoContainer("taco-single", "chipotle-taco", "Taco", "taco");
  buildTacoContainer("taco-trio", "chipotle-tacos-3", "Tacos (3)", "tacos-3");

  function buildKidsByo(): void {
    const representative = activeEntrees.find((entree) => entree.itemType === "KidsBYO");
    if (!representative) return;
    const { categories, defaultIngredientIds } = buildIngredientCategoriesFor(representative, "kids-byo");
    const proteinCategory = proteinCategoryFor("kids-byo", ["Guacamole", "Queso Blanco"]);
    const allCategories = [proteinCategory, ...categories];
    const defaultProteinId = proteinIngredientIdByContext.get(`${slugify("Chicken")}|kids-byo`);
    const defaultProteinNutrition = defaultProteinId
      ? generatedIngredients.find((ingredient) => ingredient.id === defaultProteinId)?.nutrition
      : undefined;
    const defaultContentNutrition = defaultIngredientIds
      .map((ingredientId) => generatedIngredients.find((ingredient) => ingredient.id === ingredientId)?.nutrition)
      .filter((n): n is Nutrition => n !== undefined);
    const composedDefault = addNutrition(defaultProteinNutrition, ...defaultContentNutrition);
    generatedItems.push({
      id: "chipotle-kids-build-your-own",
      name: "Kids Build Your Own",
      image: "none",
      categories: ["Kids"],
      servingType: "kids",
      nutrition: composedDefault ?? defaultProteinNutrition,
      ingredients: unique([...(defaultProteinId ? [defaultProteinId] : []), ...defaultIngredientIds]),
      customization: { ingredientCategories: allCategories as NonNullable<MenuItem["customization"]>["ingredientCategories"] },
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: activeEntrees.filter((e) => e.itemType === "KidsBYO").map((e) => e.itemId),
          itemType: "KidsBYO",
          itemCategory: "Entree",
          role: "build_container",
        },
        nutrition: composedDefault
          ? {
              method: "composed_from_components",
              note: "Kids Build Your Own starting nutrition is composed from the default kids Chicken portion plus any explicitly defaulted source components. Required side, drink, tortilla, and option choices remain selectable components and are not mistaken for protein-only entree source nutrition.",
            }
          : undefined,
      },
    });
    builderEntreeOptions["kids-build-your-own"] = {
      id: "chipotle-kids-build-your-own",
      label: "Kids Build Your Own",
      image: "none",
      includedIngredientIds: defaultIngredientIds,
    };
  }
  buildKidsByo();

  function buildKidsQuesadilla(): void {
    const representative = activeEntrees.find((entree) => entree.itemType === "KidsQuesadilla");
    if (!representative) return;
    const { categories, defaultIngredientIds } = buildIngredientCategoriesFor(representative, "kids-quesadilla");
    const proteinCategory = { ...proteinCategoryFor("kids-quesadilla"), allowNone: true };
    const allCategories = [proteinCategory, ...categories];
    const defaultProteinId = proteinIngredientIdByContext.get(`${slugify("Chicken")}|kids-quesadilla`);
    const defaultProteinNutrition = defaultProteinId
      ? generatedIngredients.find((ingredient) => ingredient.id === defaultProteinId)?.nutrition
      : undefined;
    const base = CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE;
    const baseNutrition = addNutrition(
      scaleNutrition(base.tortillaPerUnitNutrition, base.tortillaCount),
      scaleNutrition(base.cheesePerUnitNutrition, base.cheesePortionCount),
    );
    // CMG-5401 remains in the required/default ingredient relationship for
    // ordering provenance, but its nutrition is already included in the
    // verified base above and must not be counted a second time.
    const defaultContentNutrition = defaultIngredientIds
      .filter((ingredientId) => ingredientId !== ingredientIdFor(base.tortillaPerUnitSourceItemId))
      .map((ingredientId) => generatedIngredients.find((ingredient) => ingredient.id === ingredientId)?.nutrition)
      .filter((n): n is Nutrition => n !== undefined);
    const composedDefault = addNutrition(baseNutrition, defaultProteinNutrition, ...defaultContentNutrition);
    generatedItems.push({
      id: "chipotle-kids-quesadilla",
      name: "Kids Quesadilla",
      image: "none",
      categories: ["Kids"],
      servingType: "kids",
      nutrition: composedDefault ?? defaultProteinNutrition,
      ingredients: unique([...(defaultProteinId ? [defaultProteinId] : []), ...defaultIngredientIds]),
      customization: { ingredientCategories: allCategories as NonNullable<MenuItem["customization"]>["ingredientCategories"] },
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: activeEntrees.filter((e) => e.itemType === "KidsQuesadilla").map((e) => e.itemId),
          itemType: "KidsQuesadilla",
          itemCategory: "Entree",
          role: "build_container",
        },
        nutrition: composedDefault ? { method: "composed_from_components", note: base.note } : undefined,
      },
    });
    builderEntreeOptions["kids-quesadilla"] = {
      id: "chipotle-kids-quesadilla",
      label: "Kids Quesadilla",
      image: "none",
      includedIngredientIds: defaultIngredientIds,
    };
  }
  buildKidsQuesadilla();

  // ------------------------------------------------------------------------
  // Standalone sides
  // ------------------------------------------------------------------------

  function canonicalSignature(item: RawFlatItem): string {
    return JSON.stringify([normalizeName(item.itemName), item.itemType, item.unitPrice]);
  }

  function dedupeFlatItems(items: RawFlatItem[]): Map<string, RawFlatItem[]> {
    const bySignature = new Map<string, RawFlatItem[]>();
    for (const item of items) {
      const signature = canonicalSignature(item);
      bySignature.set(signature, [...(bySignature.get(signature) ?? []), item]);
    }
    return bySignature;
  }

  function preferredDuplicateIdentity(group: RawFlatItem[]): RawFlatItem {
    return [...group].sort((a, b) => {
      const assessmentA = assessLiveNutrition(liveNutritionFile, a.itemId);
      const assessmentB = assessLiveNutrition(liveNutritionFile, b.itemId);
      const scoreA = (assessmentA.nutrition ? 2 : 0) + ((assessmentA.item?.portion?.value ?? 0) > 0 ? 1 : 0);
      const scoreB = (assessmentB.nutrition ? 2 : 0) + ((assessmentB.item?.portion?.value ?? 0) > 0 ? 1 : 0);
      return scoreB - scoreA;
    })[0];
  }

  function withDuplicateIdentityNote(
    trace: SourceTrace["nutrition"],
    primary: RawFlatItem,
    group: RawFlatItem[],
  ): SourceTrace["nutrition"] {
    if (!trace || group.length < 2) return trace;
    return {
      ...trace,
      note: `${trace.note ? `${trace.note} ` : ""}Canonicalized equivalent source identities ${group.map((entry) => entry.itemId).join(", ")}; ${primary.itemId} was selected as the nutrition identity because it has the best non-placeholder live portion/panel. All source IDs remain in menu provenance.`,
    };
  }

  const sideGroups = dedupeFlatItems(calculatorMenu.sides);
  for (const group of sideGroups.values()) {
    const primary = preferredDuplicateIdentity(group);
    const id = `chipotle-${slugify(primary.itemId)}`;
    const section: "adult" | "kids" = "adult";
    const { nutrition, trace } = ingredientNutrition(primary.itemId, primary.itemName, section, id);
    generatedItems.push({
      id,
      name: sanitizeDisplayName(primary.itemName),
      image: "none",
      categories: ["Sides"],
      servingType: "side",
      nutrition,
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: group.map((entry) => entry.itemId),
          itemType: primary.itemType,
          itemCategory: "Side",
          role: "standalone_product",
        },
        nutrition: nutrition ? withDuplicateIdentityNote(trace, primary, group) : undefined,
      },
    });
  }

  // ------------------------------------------------------------------------
  // Standalone drinks (fountain flavors modeled per import-decisions.md §2)
  // ------------------------------------------------------------------------

  function buildFountainDrink(itemId: string, sizeLabel: string, portionAmount: number): void {
    const flatItem = calculatorMenu.drinks.find((drink) => drink.itemId === itemId);
    if (!flatItem) return;
    const variants: GeneratedVariant[] = [];
    for (const flavorName of FOUNTAIN_FLAVOR_CANDIDATES) {
      const rows = pdfIndex.get(`adult|${normalizeName(flavorName)}`);
      const row = rows?.find((candidate) => candidate.portion.amount === portionAmount);
      if (!row) continue;
      variants.push({
        id: `chipotle-fountain-${slugify(sizeLabel)}-${slugify(flavorName)}`,
        label: flavorName,
        categories: ["Beverages"],
        nutrition: nutritionFromPdfRow(row),
        source: {
          provider: "Chipotle",
          restaurantId,
          menu: { itemIds: [itemId], itemType: flatItem.itemType, itemCategory: "Drink", role: "standalone_product" },
          nutrition: {
            method: "pdf_exact_name",
            pdfName: row.name,
            pdfSection: row.section,
            metadataCalories: metadataPartialFor(menuMetadata, itemId)?.calories ?? null,
            metadataPortion: `${portionAmount}fl oz`,
            note: `${sizeLabel} ${flavorName} variant uses the exact official PDF flavor-and-size row while retaining generic ordering/container identity ${itemId}; no flavor-specific CMG id is invented and the generic cup placeholder is not used as flavor nutrition.`,
          },
        },
      });
    }
    generatedItems.push({
      id: `chipotle-fountain-${slugify(sizeLabel)}`,
      name: `Fountain Drink (${sizeLabel})`,
      image: "none",
      categories: ["Beverages"],
      servingType: "drink",
      nutrition: variants[0]?.nutrition,
      variants: variants.length > 0 ? variants : undefined,
      defaultVariantId: variants[0]?.id,
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: { itemIds: [itemId], itemType: flatItem.itemType, itemCategory: "Drink", role: "standalone_product" },
        nutrition: {
          method: "pdf_exact_name",
          note: `Chipotle live ordering only exposes a generic ${sizeLabel} Soda/Iced Tea cup (${itemId}) with no flavor-specific id (import-decisions.md §2). Each variant here pairs that generic ordering/container identity with a specific official-PDF flavor nutrition row — the generic metadata placeholder value is never used as a specific flavor's nutrition.`,
        },
      },
    });
    if (variants.length === 0) {
      pushUnresolved({
        standardizedRecordId: `chipotle-fountain-${slugify(sizeLabel)}`,
        name: `Fountain Drink (${sizeLabel})`,
        recordType: "build_container",
        sourceItemIds: [itemId],
        reason: "missing_full_nutrition",
        details: `No official PDF fountain-flavor row matched the ${portionAmount}fl oz portion.`,
      });
    }
  }
  buildFountainDrink("CMG-2001", "22 fl oz", 22);
  buildFountainDrink("CMG-2002", "32 fl oz", 32);

  const drinkGroups = dedupeFlatItems(calculatorMenu.drinks.filter((drink) => drink.itemType !== "Soda"));
  for (const group of drinkGroups.values()) {
    const primary = preferredDuplicateIdentity(group);
    const id = `chipotle-${slugify(primary.itemId)}`;
    const { nutrition, trace } = ingredientNutrition(primary.itemId, primary.itemName, "adult", id);
    generatedItems.push({
      id,
      name: sanitizeDisplayName(primary.itemName),
      image: "none",
      categories: ["Beverages"],
      servingType: "drink",
      nutrition,
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: group.map((entry) => entry.itemId),
          itemType: primary.itemType,
          itemCategory: "Drink",
          role: "standalone_product",
        },
        nutrition: nutrition ? withDuplicateIdentityNote(trace, primary, group) : undefined,
      },
    });
  }

  // Kids-specific sides/drinks content ids (already picked up by the generic
  // content-dedup pass above via contentIdsByType, categorized "Kids Side" /
  // "Kids Drink"). No additional handling needed here.

  // ------------------------------------------------------------------------
  // Non-food items (structural, never browseable)
  // ------------------------------------------------------------------------

  for (const nonFood of calculatorMenu.nonFoodItems) {
    generatedItems.push({
      id: `chipotle-${slugify(nonFood.itemId)}`,
      name: sanitizeDisplayName(nonFood.itemName),
      image: "none",
      categories: ["Non-Food"],
      servingType: "side",
      nutrition: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
      sourceOnly: true,
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: { itemIds: [nonFood.itemId], itemType: nonFood.itemType, itemCategory: "NonFood", role: "structural" },
      },
    });
  }

  // ------------------------------------------------------------------------
  // Online meals (preconfigured/curated builds)
  // ------------------------------------------------------------------------

  function generatedBuildBaseItemId(entree: RawEntree): string | undefined {
    if (entree.itemType === "Burrito") return "chipotle-burrito";
    if (entree.itemType === "Bowl") return "chipotle-bowl";
    if (entree.itemType === "Salad") return "chipotle-salad";
    if (entree.itemType === "Quesadilla") return "chipotle-quesadilla";
    if (entree.itemType === "KidsBYO") return "chipotle-kids-build-your-own";
    if (entree.itemType === "KidsQuesadilla") return "chipotle-kids-quesadilla";
    if (entree.itemType === "Tacos") {
      return formatGroupFor(entree) === "taco-trio"
        ? "chipotle-tacos-3"
        : "chipotle-taco";
    }
    return undefined;
  }

  function effectiveGeneratedIngredientNutrition(
    ingredient: GeneratedIngredient,
  ): Nutrition | undefined {
    return (
      ingredient.nutrition ??
      ingredient.variants?.find(
        (variant) => variant.id === ingredient.defaultVariantId,
      )?.nutrition ??
      ingredient.variants?.[0]?.nutrition
    );
  }

  function portionSuffix(value: string | null | undefined): "light" | "extra" | undefined {
    const normalized = value?.trim().toLowerCase();
    return normalized === "light" || normalized === "extra"
      ? normalized
      : undefined;
  }

  type ResolvedMealComponent = {
    id: string;
    entry: string;
    nutrition: Nutrition;
  };

  function resolvedMealIngredient(
    itemId: string,
    customizationName: string | null | undefined,
    entreeContext: ProteinContext,
  ): ResolvedMealComponent | undefined {
    const tortillaKey = TORTILLA_KEY_BY_ITEM_ID[itemId];
    if (tortillaKey) {
      const suffix = entreeContext === "taco-trio" ? "tacos-3" : "taco";
      const id = tortillaIngredientId(tortillaKey, suffix);
      const ingredient = generatedIngredients.find((candidate) => candidate.id === id);
      const nutrition = ingredient && effectiveGeneratedIngredientNutrition(ingredient);
      return nutrition ? { id, entry: id, nutrition } : undefined;
    }

    // Half/Extra protein source identities are variants on the generated
    // context-specific protein parent. A preset selects that one parent at
    // the corresponding portion; it must not add a second protein record on
    // top of the base entree's normal protein.
    for (const ingredient of generatedIngredients) {
      if (!ingredient.categories.some((category) => category === "Proteins")) continue;
      const variant = ingredient.variants?.find((candidate) =>
        candidate.source?.menu.itemIds.includes(itemId),
      );
      if (!variant?.nutrition) continue;
      const portion = variant.label.trim().toLowerCase();
      if (portion !== "half" && portion !== "extra") continue;
      return {
        id: ingredient.id,
        entry: `${ingredient.id}:${portion === "half" ? "light" : "extra"}`,
        nutrition: variant.nutrition,
      };
    }

    const ingredient = generatedIngredients.find((candidate) =>
      candidate.source.menu.itemIds.includes(itemId),
    );
    if (ingredient) {
      const baseNutrition = effectiveGeneratedIngredientNutrition(ingredient);
      if (!baseNutrition) return undefined;
      const portion = portionSuffix(customizationName);
      const multiplier = portion === "light" ? 0.5 : portion === "extra" ? 2 : 1;
      return {
        id: ingredient.id,
        entry: portion ? `${ingredient.id}:${portion}` : ingredient.id,
        nutrition: scaleNutrition(baseNutrition, multiplier),
      };
    }

    // A curated meal can include a separately purchasable side. Keep the
    // canonical generated item identity here; the runtime adapter projects
    // any such referenced record into the ingredient catalog without
    // copying its nutrition or provenance.
    const item = generatedItems.find((candidate) =>
      candidate.source.menu.itemIds.includes(itemId),
    );
    if (!item?.nutrition) return undefined;
    const portion = portionSuffix(customizationName);
    const multiplier = portion === "light" ? 0.5 : portion === "extra" ? 2 : 1;
    return {
      id: item.id,
      entry: portion ? `${item.id}:${portion}` : item.id,
      nutrition: scaleNutrition(item.nutrition, multiplier),
    };
  }

  function mealSignature(meal: RawOnlineMeal): string {
    return JSON.stringify([
      meal.entree?.itemId ?? null,
      (meal.entree?.contents ?? []).map((c) => [c.itemId, c.quantity]).sort(),
      meal.sides.map((s) => s.itemId).sort(),
      meal.drinks.map((d) => d.itemId).sort(),
      meal.mealPrice,
    ]);
  }

  const mealsBySignature = new Map<string, RawOnlineMeal[]>();
  for (const meal of onlineMeals) {
    mealsBySignature.set(mealSignature(meal), [...(mealsBySignature.get(mealSignature(meal)) ?? []), meal]);
  }

  const CATERING_NAMESPACE_TYPES = new Set(["BuildYourOwn"]);

  for (const group of mealsBySignature.values()) {
    const primary = group[0];
    const id = `chipotle-meal-${slugify(primary.mealId)}`;
    if (CATERING_NAMESPACE_TYPES.has(primary.mealType) || !primary.entree) {
      pushUnresolved({
        standardizedRecordId: id,
        name: primary.mealName,
        recordType: "preconfigured_meal",
        sourceItemIds: group.map((meal) => meal.mealId),
        reason: "unsupported_preconfigured_meal",
        details: !primary.entree
          ? `"${primary.mealName}" is an entree:null meal (its entire product is a single sides[] entry) — not modeled by this first-pass importer.`
          : `"${primary.mealName}" (mealType ${primary.mealType}) uses the catering/BuildYourOwn ingredient namespace, deliberately excluded from this first pass (see source-analysis.md §10.C).`,
      });
      continue;
    }
    const sourceEntree = activeEntrees.find(
      (entree) => entree.itemId === primary.entree!.itemId,
    );
    const entreeContext = sourceEntree && formatGroupFor(sourceEntree);
    const buildBaseItemId = sourceEntree
      ? generatedBuildBaseItemId(sourceEntree)
      : undefined;
    if (!sourceEntree || !entreeContext || entreeContext === "catering" || !buildBaseItemId) {
      pushUnresolved({
        standardizedRecordId: id,
        name: primary.mealName,
        recordType: "preconfigured_meal",
        sourceItemIds: group.map((meal) => meal.mealId),
        reason: "ambiguous_context",
        details: `"${primary.mealName}" uses base entree ${primary.entree.itemId}, which could not be mapped to a supported generated builder context.`,
      });
      continue;
    }

    const resolvedById = new Map<string, ResolvedMealComponent>();
    const addResolved = (component: ResolvedMealComponent) => {
      resolvedById.set(component.id, component);
    };

    const baseProteinId = sourceEntree.primaryFillingName
      ? proteinIngredientIdByContext.get(
          `${slugify(sourceEntree.primaryFillingName)}|${entreeContext}`,
        )
      : undefined;
    if (baseProteinId) {
      const protein = generatedIngredients.find(
        (ingredient) => ingredient.id === baseProteinId,
      );
      const nutrition = protein && effectiveGeneratedIngredientNutrition(protein);
      if (nutrition) addResolved({ id: baseProteinId, entry: baseProteinId, nutrition });
    }

    // Format-level included bases come from the same verified mappings used
    // by the generated build containers. Explicit source contents overwrite
    // these by id below, so the Kids Quesadilla tortilla is never duplicated.
    const includedBaseIds =
      sourceEntree.itemType === "Burrito"
        ? [burritoBaseTortillaId]
        : sourceEntree.itemType === "Salad"
          ? [saladSupergreensBaseId]
          : sourceEntree.itemType === "KidsQuesadilla"
            ? [ingredientIdFor("CMG-5401"), ingredientIdFor("CMG-5252")]
            : [];
    for (const baseId of includedBaseIds) {
      const ingredient = generatedIngredients.find((candidate) => candidate.id === baseId);
      const nutrition = ingredient && effectiveGeneratedIngredientNutrition(ingredient);
      if (nutrition) addResolved({ id: baseId, entry: baseId, nutrition });
    }

    const rawComponents = [
      ...primary.entree.contents,
      ...primary.sides,
      ...primary.drinks,
    ];
    const missing: RawOnlineMealContent[] = [];
    for (const content of rawComponents) {
      const nullContent = rawContentById.get(content.itemId);
      if (nullContent && isNullSelection(content.itemId, nullContent.itemName)) continue;
      const resolved = resolvedMealIngredient(
        content.itemId,
        "customizationName" in content &&
          typeof content.customizationName === "string"
          ? content.customizationName
          : undefined,
        entreeContext,
      );
      if (!resolved) {
        missing.push(content);
        continue;
      }
      const tacoContextMultiplier =
        entreeContext === "taco-single" &&
        !resolved.id.toLowerCase().endsWith("-taco")
          ? 1 / 3
          : 1;
      addResolved({
        ...resolved,
        nutrition: scaleNutrition(
          resolved.nutrition,
          content.quantity * tacoContextMultiplier,
        ),
      });
    }
    if (missing.length > 0 || resolvedById.size === 0) {
      pushUnresolved({
        standardizedRecordId: id,
        name: primary.mealName,
        recordType: "preconfigured_meal",
        sourceItemIds: group.map((meal) => meal.mealId),
        reason: "missing_required_relationship",
        details: `"${primary.mealName}" could not map component identity/identities ${missing.map((entry) => entry.itemId).join(", ")} into the generated ${buildBaseItemId} ingredient context.`,
      });
      continue;
    }

    const resolvedComponents = [...resolvedById.values()];
    const composed = addNutrition(...resolvedComponents.map((entry) => entry.nutrition));
    generatedItems.push({
      id,
      name: primary.mealName,
      image: "none",
      categories: ["Preconfigured Meals"],
      servingType: "combo",
      nutrition: composed,
      ingredients: resolvedComponents.map((component) => component.entry),
      defaultOrder: 0,
      source: {
        provider: "Chipotle",
        restaurantId,
        menu: {
          itemIds: group.map((meal) => meal.mealId),
          itemType: primary.mealType,
          itemCategory: "OnlineMeal",
          role: "preconfigured_meal",
          buildBaseItemId,
        },
        nutrition: {
          method: "composed_from_components",
          note:
            group.length > 1
              ? `${group.length} online-meals.json records share this exact composition/price (mealIds: ${group.map((meal) => meal.mealId).join(", ")}) tagged under different mealTypes; canonicalized to one generated record rather than importing duplicates.`
              : `Resolved base entree ${primary.entree.itemId} into generated build ${buildBaseItemId} and composed its ${resolvedComponents.length} generated ingredient component(s), preserving source portion variants and quantities. The source's free-text calories field ("${primary.calories}") is preserved as provenance only, not used as the computed value.`,
        },
      },
    });
  }

  // ------------------------------------------------------------------------
  // Assemble output
  // ------------------------------------------------------------------------

  const allIds = [...generatedItems.map((item) => item.id), ...generatedIngredients.map((item) => item.id)];
  if (new Set(allIds).size !== allIds.length) {
    const counts = new Map<string, number>();
    for (const id of allIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
    throw new Error(`Generated output contains duplicate top-level logical IDs: ${duplicates.join(", ")}`);
  }
  const knownIds = new Set(allIds);
  const referenceErrors: string[] = [];
  for (const item of generatedItems) {
    for (const ingredientEntry of item.ingredients ?? []) {
      const ingredientId = ingredientEntry.split(":", 1)[0];
      if (!knownIds.has(ingredientId)) referenceErrors.push(`${item.id}.ingredients references missing id ${ingredientId}`);
    }
    for (const category of item.customization?.ingredientCategories ?? []) {
      for (const ingredientId of category.ingredients) {
        if (!knownIds.has(ingredientId)) {
          referenceErrors.push(`${item.id}.customization.ingredientCategories[${category.name}] references missing id ${ingredientId}`);
        }
      }
    }
  }
  for (const [entreeKey, option] of Object.entries(builderEntreeOptions)) {
    if (!knownIds.has(option.id)) referenceErrors.push(`builderConfig.entreeOptions.${entreeKey} references missing id ${option.id}`);
    for (const ingredientId of option.includedIngredientIds ?? []) {
      if (!knownIds.has(ingredientId)) {
        referenceErrors.push(`builderConfig.entreeOptions.${entreeKey}.includedIngredientIds references missing id ${ingredientId}`);
      }
    }
  }
  if (referenceErrors.length > 0) {
    throw new Error(`Generated output contains broken references:\n${referenceErrors.join("\n")}`);
  }

  const builderConfig: RestaurantBuilderConfig = {
    entreeOptions: builderEntreeOptions,
    categoryMaxSelections: Object.fromEntries(
      Object.entries(customizationRules).map(([name, rule]) => [name, rule.maxQuantity ?? 999]),
    ),
  };

  const addonGroups: RestaurantAddonGroups = {};

  const unresolvedByReason = Object.fromEntries(
    unique(unresolved.map((record) => record.reason)).map((reason) => [
      reason,
      unresolved.filter((record) => record.reason === reason).length,
    ]),
  );

  const restaurantOutput = {
    hasBuildYourOwn: true,
    items: generatedItems,
    ingredients: generatedIngredients,
    addonGroups,
    customizationRules: { ingredientCategories: customizationRules } satisfies RestaurantCustomizationRules,
    builderConfig,
    importMetadata: {
      restaurant: "Chipotle",
      restaurantId,
      sources: {
        calculatorMenu: "data/raw/chipotle/calculator-menu.json",
        menuMetadata: "data/raw/chipotle/menu-metadata.json",
        menuMetadataNutrition: "data/raw/chipotle/menu-metadata-nutrition.json",
        nutrition: "data/raw/chipotle/nutrition.json",
        onlineMeals: "data/raw/chipotle/online-meals.json",
      },
      note:
        "menu-rules.json was deliberately not read by this importer: source-analysis.md §4 confirms calculator-menu.json already carries identical build-rule fields (maxContents, contentGroups, defaultContent, etc.) for every id in its own restaurant-scoped universe, and menu-rules.json/menu-metadata.json are template/national-catalog sources that must never expand restaurant-469 availability beyond calculator-menu.json (import-decisions.md §1).",
      logicalRecordCounts: {
        total: generatedItems.length + generatedIngredients.length,
        menuItems: generatedItems.length,
        ingredients: generatedIngredients.length,
        buildContainers: generatedItems.filter((item) => item.source.menu.role === "build_container").length,
        selectableComponents: generatedIngredients.length,
        standaloneSidesAndDrinks: generatedItems.filter(
          (item) => item.source.menu.role === "standalone_product" && item.categories.some((c) => c === "Sides" || c === "Beverages"),
        ).length,
        preconfiguredMeals: generatedItems.filter((item) => item.source.menu.role === "preconfigured_meal").length,
      },
      nutritionAttachment: {
        withFullNutrition:
          generatedItems.filter((item) => item.nutrition !== undefined).length +
          generatedIngredients.filter((item) => item.nutrition !== undefined || (item.variants?.some((v) => v.nutrition !== undefined) ?? false)).length,
        unresolved: unresolved.length,
        unresolvedByReason,
      },
    },
    runtimeIntegration: {
      status: "prepared_not_promoted",
      note: "This generated dataset is NOT wired into data/restaurants/chipotle.json or the runtime app. See data/generated/chipotle/unresolved.json for review items before any runtime integration is considered.",
    },
  };

  const unresolvedOutput = {
    restaurant: "Chipotle",
    restaurantId,
    sources: restaurantOutput.importMetadata.sources,
    policy: {
      order: [
        "current live full-nutrition record when complete and internally sane",
        "official PDF exact/alias name + section match",
        "portion-disambiguated PDF match (multiple sizes for one name)",
        "documented approved composition/scaling/manual-verification resolution",
        "unresolved",
      ],
      fuzzyMatching: false,
      missingNutrition:
        "Incomplete, zeroed, zero-portion, or internally conflicting live panels are rejected. When no sane live panel, official PDF row, or approved explicit composition/scaling rule applies, full macro nutrition is omitted rather than partially filled or guessed.",
    },
    summary: {
      logicalRecords: generatedItems.length + generatedIngredients.length,
      unresolved: unresolved.length,
      unresolvedByReason,
    },
    schemaLimitations: [
      "IngredientCategoryRule gained an optional minQuantity field for this import (e.g. Quesadilla's DipContentGroup requires 1-3 dips); the rest of the enforcement UX for a required-selection category is not built here since runtime wiring is out of scope for this pass.",
      "The generic ItemVariant/IngredientItem schema has no first-class 'same ingredient, different container-context nutrition' relationship (Chick-fil-A's IngredientRelationshipNutrition type is itself shaped around Chick-fil-A's specific retailModifiedItemId/tag ordering-source fields) — modeled here instead as separate generated ingredient records per (protein, format context), which stays faithful to the distinct source ids/nutrition Chipotle actually publishes per context.",
    ],
    records: unresolved,
  };

  await Promise.all([
    writeAtomically(OUTPUT_PATH, `${JSON.stringify(restaurantOutput, null, 2)}\n`),
    writeAtomically(UNRESOLVED_PATH, `${JSON.stringify(unresolvedOutput, null, 2)}\n`),
  ]);

  console.log(
    JSON.stringify(
      {
        output: "data/generated/chipotle/restaurant.json",
        unresolvedOutput: "data/generated/chipotle/unresolved.json",
        menuItems: generatedItems.length,
        ingredients: generatedIngredients.length,
        unresolved: unresolved.length,
        unresolvedByReason,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
