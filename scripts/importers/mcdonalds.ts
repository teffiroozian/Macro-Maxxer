import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ComboMealConfig, ItemVariant, MenuItem, RestaurantMenu, ServingType } from "../../types/menu";
import type { Nutrition } from "../../types/nutrition";
import { writeAtomically } from "../lib/write-atomically";

const MENU_SOURCE = "data/restaurants/mcdonalds/raw/menu.json";
const DETAILS_SOURCE = "data/restaurants/mcdonalds/raw/item-details.json";
const CATALOG_SOURCE = "data/restaurants/mcdonalds/raw/item-list-catalog.json";
const METADATA_SOURCE = "data/restaurants/mcdonalds/raw/source-metadata.json";
const OUTPUT_PATH = resolve("data/restaurants/mcdonalds/generated/restaurant.json");

type JsonObject = Record<string, unknown>;

type RawMenuItem = {
  itemId: number;
  name: string;
  category: string;
  categories: string[];
  productUrl: string;
  imageUrl: string;
  discoveredFrom: string[];
  match: { status: string; candidateCount: number; candidates: Array<{ itemId: number; reasons: string[] }> };
};

type RawMenu = { capturedAt: string; items: RawMenuItem[] };
type RawDetails = Record<string, { item: JsonObject }>;
type RawCatalog = { items: JsonObject[] };
type RawMetadata = { manualReconciliations?: Array<{ productUrl: string; itemId: number; reason: string }> };

type McDonaldsSource = {
  provider: "McDonald's";
  menu: {
    itemIds: string[];
    itemType: string;
    itemCategory: string;
    role: "standalone_product" | "meal";
    officialCategories: string[];
    productUrl: string;
    shortName: string | null;
    componentItemIds: string[];
    reconciliationStatus: string;
    reconciliationReasons: string[];
    manualReconciliation: string | null;
  };
  nutrition: {
    method: "official_us_dna_item_details" | "sum_official_meal_components";
    sourceItemId: string;
    componentItemIds?: string[];
  };
};

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function itemId(id: number): string {
  return `mcd-item-${id}`;
}

function normalizedDisplayName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

function nutritionFor(item: JsonObject): Nutrition | undefined {
  const facts = new Map<string, number>();
  const nutrients = array(object(item.nutrient_facts)?.nutrient);
  for (const value of nutrients) {
    const nutrient = object(value);
    const key = stringValue(nutrient?.nutrient_name_id);
    const amount = numberValue(nutrient?.value);
    if (key && amount !== undefined) facts.set(key, amount);
  }
  const calories = facts.get("calories");
  const protein = facts.get("protein");
  const carbs = facts.get("carbohydrate");
  const totalFat = facts.get("fat");
  if ([calories, protein, carbs, totalFat].some((value) => value === undefined)) return undefined;
  return {
    calories: calories!,
    protein: protein!,
    carbs: carbs!,
    totalFat: totalFat!,
    ...(facts.has("saturated_fat") ? { satFat: facts.get("saturated_fat")! } : {}),
    ...(facts.has("trans_fat") ? { transFat: facts.get("trans_fat")! } : {}),
    ...(facts.has("cholesterol") ? { cholesterol: facts.get("cholesterol")! } : {}),
    ...(facts.has("sodium") ? { sodium: facts.get("sodium")! } : {}),
    ...(facts.has("fibre") ? { fiber: facts.get("fibre")! } : {}),
    ...(facts.has("sugars") ? { sugars: facts.get("sugars")! } : {}),
  };
}

function servingTypeFor(menuItem: RawMenuItem): ServingType {
  const text = `${menuItem.category} ${menuItem.categories.join(" ")} ${menuItem.name} ${menuItem.productUrl}`.toLowerCase();
  if (menuItem.productUrl.includes("/meal/") || /\bmeal\b/.test(text)) return text.includes("happy meal") ? "kids" : "combo";
  if (/sauce|condiment|packet|honey\b/.test(text)) return "addon";
  if (/drink|mccafé|coffee|latte|cappuccino|mocha|tea|smoothie|shake|juice|lemonade|coke|sprite|fanta|dr pepper|refresher|energizer/.test(text)) return "drink";
  if (/sweets|treats|dessert|mcflurry|sundae|cone|pie/.test(text)) return "dessert";
  if (/fries|sides/.test(text)) return "side";
  if (/breakfast|biscuit|mcgriddle|mcmuffin|hotcake|burrito|bagel/.test(text)) return "breakfast";
  if (/nugget|strip/.test(text)) return "shareable";
  return "entree";
}

function relatedSizeItems(item: JsonObject): JsonObject[] {
  const relationTypes = array(object(item.relation_types)?.relation_type);
  const sizeRelation = relationTypes.map(object).find((relation) => stringValue(relation?.type)?.toLowerCase() === "size");
  return array(object(sizeRelation?.related_items)?.related_item).map(object).filter((entry): entry is JsonObject => Boolean(entry));
}

function componentIds(item: JsonObject): number[] {
  return array(object(item.components)?.component)
    .map((entry) => numberValue(object(entry)?.id))
    .filter((id): id is number => id !== undefined);
}

function nutritionOrComponents(
  item: JsonObject,
  catalogById: Map<number, JsonObject>,
): { nutrition?: Nutrition; componentIds: number[]; derived: boolean } {
  const direct = nutritionFor(item);
  const components = componentIds(item);
  if (direct) return { nutrition: direct, componentIds: components, derived: false };
  if (!components.length) return { componentIds: components, derived: false };
  const componentNutrition = components.map((id) => catalogById.get(id)).map((record) => record && nutritionFor(record));
  if (componentNutrition.some((value) => !value)) return { componentIds: components, derived: true };
  const rows = componentNutrition as Nutrition[];
  const sum = (field: keyof Nutrition): number => rows.reduce((total, row) => total + (typeof row[field] === "number" ? row[field] : 0), 0);
  return {
    componentIds: components,
    derived: true,
    nutrition: {
      calories: sum("calories"),
      protein: sum("protein"),
      carbs: sum("carbs"),
      totalFat: sum("totalFat"),
      satFat: sum("satFat"),
      transFat: sum("transFat"),
      cholesterol: sum("cholesterol"),
      sodium: sum("sodium"),
      fiber: sum("fiber"),
      sugars: sum("sugars"),
    },
  };
}

function variantFor(
  related: JsonObject,
  catalogById: Map<number, JsonObject>,
  fallbackImage: string,
  categories: string[],
  servingType: ServingType,
  canonicalId: string,
): ItemVariant | undefined {
  const id = numberValue(related.id);
  if (id === undefined) return undefined;
  const sourceItem = catalogById.get(id);
  if (!sourceItem) return undefined;
  const nutrition = nutritionFor(sourceItem);
  if (!nutrition) return undefined;
  return {
    id: itemId(id),
    label: stringValue(related.label) ?? stringValue(related.abbr_label) ?? String(id),
    image: fallbackImage,
    nutrition,
    categories,
    servingType,
    canonicalItemId: canonicalId,
    source: { menu: { tags: [], pins: [] } },
  };
}

async function main(): Promise<void> {
  const [menu, details, catalog, metadata] = await Promise.all([
    readFile(resolve(MENU_SOURCE), "utf8").then((value) => JSON.parse(value) as RawMenu),
    readFile(resolve(DETAILS_SOURCE), "utf8").then((value) => JSON.parse(value) as RawDetails),
    readFile(resolve(CATALOG_SOURCE), "utf8").then((value) => JSON.parse(value) as RawCatalog),
    readFile(resolve(METADATA_SOURCE), "utf8").then((value) => JSON.parse(value) as RawMetadata),
  ]);

  const catalogById = new Map<number, JsonObject>();
  for (const record of catalog.items) {
    const id = numberValue(record.id ?? record.item_id);
    if (id !== undefined) catalogById.set(id, record);
  }
  for (const [id, wrapper] of Object.entries(details)) catalogById.set(Number(id), wrapper.item);

  const menuIds = new Set(menu.items.map((entry) => entry.itemId));
  const canonicalByMenuId = new Map<number, number>();
  const sizeFamilyParentByMenuId = new Map<number, number>();
  const familyCategories = new Map<number, string[]>();
  for (const entry of menu.items) {
    const sourceItem = details[String(entry.itemId)]?.item;
    const family = sourceItem ? relatedSizeItems(sourceItem) : [];
    if (!family.length) {
      canonicalByMenuId.set(entry.itemId, entry.itemId);
      continue;
    }
    const defaultId = numberValue(family.find((related) => related.is_default === true)?.id);
    const familyMenuIds = family
      .map((related) => numberValue(related.id))
      .filter((id): id is number => id !== undefined && menuIds.has(id));
    const sameNameFamilyMenuIds = familyMenuIds.filter((id) => {
      const relatedMenuEntry = menu.items.find((candidate) => candidate.itemId === id);
      return relatedMenuEntry && normalizedDisplayName(relatedMenuEntry.name) === normalizedDisplayName(entry.name);
    });
    const canonicalId = defaultId !== undefined && sameNameFamilyMenuIds.includes(defaultId)
      ? defaultId
      : sameNameFamilyMenuIds[0] ?? entry.itemId;
    for (const id of sameNameFamilyMenuIds) canonicalByMenuId.set(id, canonicalId);
    const sizeFamilyParentId = defaultId !== undefined && menuIds.has(defaultId)
      ? defaultId
      : familyMenuIds[0] ?? entry.itemId;
    for (const id of familyMenuIds) sizeFamilyParentByMenuId.set(id, sizeFamilyParentId);
  }
  for (const entry of menu.items) {
    const canonicalId = canonicalByMenuId.get(entry.itemId) ?? entry.itemId;
    familyCategories.set(canonicalId, [...new Set([...(familyCategories.get(canonicalId) ?? []), ...entry.categories])]);
  }
  const generatedIds = new Set(menu.items
    .filter((entry) => (canonicalByMenuId.get(entry.itemId) ?? entry.itemId) === entry.itemId)
    .map((entry) => entry.itemId));
  const variantOwnerById = new Map<number, number>();
  for (const entry of menu.items) {
    const sourceItem = details[String(entry.itemId)]?.item;
    if (!sourceItem) continue;
    for (const related of relatedSizeItems(sourceItem)) {
      const relatedId = numberValue(related.id);
      if (relatedId !== undefined) variantOwnerById.set(relatedId, sizeFamilyParentByMenuId.get(entry.itemId) ?? entry.itemId);
    }
  }
  const manualById = new Map((metadata.manualReconciliations ?? []).map((entry) => [entry.itemId, entry.reason]));
  const warnings: string[] = [];
  const skipped: Array<{ itemId: number; name: string; reason: string }> = [];
  const items: MenuItem[] = [];

  for (const [index, entry] of menu.items.entries()) {
    const canonicalId = canonicalByMenuId.get(entry.itemId) ?? entry.itemId;
    if (canonicalId !== entry.itemId) {
      skipped.push({
        itemId: entry.itemId,
        name: entry.name,
        reason: `merged_into_official_size_family_parent:${canonicalId}`,
      });
      continue;
    }
    const sourceItem = details[String(entry.itemId)]?.item;
    if (!sourceItem) {
      skipped.push({ itemId: entry.itemId, name: entry.name, reason: "missing_item_details" });
      continue;
    }
    const nutritionResult = nutritionOrComponents(sourceItem, catalogById);
    const nutrition = nutritionResult.nutrition;
    if (!nutrition) {
      skipped.push({ itemId: entry.itemId, name: entry.name, reason: "missing_core_nutrition" });
      continue;
    }
    const servingType = servingTypeFor(entry);
    const categories = familyCategories.get(entry.itemId) ?? entry.categories;
    const components = nutritionResult.componentIds;
    const ownsSizeFamily = (sizeFamilyParentByMenuId.get(entry.itemId) ?? entry.itemId) === entry.itemId;
    const variants = (ownsSizeFamily ? relatedSizeItems(sourceItem) : [])
      .map((related) => variantFor(related, catalogById, entry.imageUrl, categories, servingType, itemId(entry.itemId)))
      .filter((variant): variant is ItemVariant => Boolean(variant));
    const missingVariantIds = (ownsSizeFamily ? relatedSizeItems(sourceItem) : [])
      .map((related) => numberValue(related.id))
      .filter((id): id is number => id !== undefined && !variants.some((variant) => variant.id === itemId(id)));
    if (missingVariantIds.length) warnings.push(`${entry.itemId}: omitted unresolved size variants ${missingVariantIds.join(", ")}`);

    let comboConfig: ComboMealConfig | undefined;
    if (servingType === "combo" || servingType === "kids") {
      const resolvable = [...new Set(components
        .map((id) => generatedIds.has(id) ? id : variantOwnerById.get(id))
        .filter((id): id is number => id !== undefined))];
      if (resolvable.length) {
        comboConfig = {
          entreeItemId: itemId(resolvable[0]),
          ...(resolvable.length > 1 ? { includedItemIds: resolvable.slice(1).map(itemId) } : {}),
        };
      } else {
        warnings.push(`${entry.itemId}: meal components do not resolve to generated menu items`);
      }
    }

    const source: McDonaldsSource = {
      provider: "McDonald's",
      menu: {
        itemIds: [String(entry.itemId)],
        itemType: stringValue(sourceItem.item_type) ?? "Core Item",
        itemCategory: entry.category,
        role: servingType === "combo" || servingType === "kids" ? "meal" : "standalone_product",
        officialCategories: categories,
        productUrl: entry.productUrl,
        shortName: stringValue(sourceItem.short_name) ?? null,
        componentItemIds: components.map(String),
        reconciliationStatus: entry.match.status,
        reconciliationReasons: entry.match.candidates.find((candidate) => candidate.itemId === entry.itemId)?.reasons ?? [],
        manualReconciliation: manualById.get(entry.itemId) ?? null,
      },
      nutrition: nutritionResult.derived
        ? {
            method: "sum_official_meal_components",
            sourceItemId: String(entry.itemId),
            componentItemIds: components.map(String),
          }
        : { method: "official_us_dna_item_details", sourceItemId: String(entry.itemId) },
    };

    items.push({
      id: itemId(entry.itemId),
      name: entry.name,
      image: entry.imageUrl,
      categories,
      servingType,
      ...(comboConfig ? { comboConfig } : {}),
      nutrition,
      source: { menu: { tags: [], pins: [] }, generated: source },
      ...(variants.length > 1
        ? {
            variants,
            defaultVariantId: variants.find((variant) => variant.id === itemId(entry.itemId))?.id ??
              variants.find((variant) => {
                const related = relatedSizeItems(sourceItem).find((value) => itemId(numberValue(value.id)!) === variant.id);
                return related?.is_default === true;
              })?.id ?? variants[0].id,
          }
        : {}),
      addonEligible: ["entree", "shareable"].includes(servingType),
      defaultOrder: index,
      ...(entry.name.toLowerCase().startsWith("new ") ? { status: "new" as const } : {}),
      ...(/limited time/i.test(entry.name) ? { status: "limited-time" as const } : {}),
    });
  }

  const categoryCount = new Set(items.flatMap((item) => item.categories)).size;
  const variantCount = items.reduce((sum, item) => sum + (item.variants?.length ?? 0), 0);
  const missingNutritionCount = items.filter((item) => !item.nutrition).length;
  const missingImageCount = items.filter((item) => !item.image).length;
  const duplicateIds = [...new Set(items.map((item) => item.id).filter((id, index, ids) => ids.indexOf(id) !== index))];
  const names = new Map<string, string[]>();
  for (const item of items) {
    const key = normalizedDisplayName(item.name);
    names.set(key, [...(names.get(key) ?? []), item.id]);
  }
  const duplicateNames = [...names.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([name, ids]) => ({ name, ids }));

  const output: RestaurantMenu & { importMetadata: JsonObject } = {
    hasBuildYourOwn: false,
    items,
    importMetadata: {
      restaurant: "McDonald's",
      sources: { menu: MENU_SOURCE, itemDetails: DETAILS_SOURCE, itemListCatalog: CATALOG_SOURCE, metadata: METADATA_SOURCE },
      generatedFrom: menu.capturedAt,
      sourceRecordCount: menu.items.length,
      generatedItemCount: items.length,
      variantRecordCount: variantCount,
      categoryCount,
      skipped,
      warnings,
      reconciliation: {
        allMenuRecordsResolved: menu.items.every((entry) => entry.itemId !== null),
        manualExceptions: metadata.manualReconciliations ?? [],
      },
    },
  };

  await writeAtomically(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({
    output: "data/restaurants/mcdonalds/generated/restaurant.json",
    sourceRecords: menu.items.length,
    generatedItems: items.length,
    variantRecords: variantCount,
    categoryCount,
    missingNutritionCount,
    missingImageCount,
    duplicateIds,
    duplicateNames,
    skipped,
    warnings,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
