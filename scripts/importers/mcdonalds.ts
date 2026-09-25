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

type PromotedFamily = { parentId: number; name: string; categories: string[]; productUrl: string; sizes: Array<[number, string]>; familyFallbackItemId?: number; servingType?: ServingType; sourceOnly?: boolean };

// The national public menu omits some regional and seasonal SKUs used by
// ordering. These reviewed groupings retain official DNA IDs and nutrition.
const REVIEWED_SIZE_FAMILIES: Record<number, Array<[number, string]>> = {
  204386: [[204386, "3 piece"], [204385, "4 piece"]],
  203957: [[203957, "Small"], [203958, "Medium"], [203962, "Large"]],
  204586: [[204586, "Small"], [204585, "Medium"], [204584, "Large"]],
  204589: [[204589, "Small"], [204588, "Medium"], [204587, "Large"]],
  204623: [[204623, "Small"], [204622, "Medium"], [204621, "Large"]],
  204205: [[204205, "Small"], [204210, "Medium"], [204199, "Large"]],
  200123: [[200123, "Small"], [200602, "Medium"], [200601, "Large"]],
  204219: [[204219, "Small"], [204203, "Medium"], [204217, "Large"]],
  201038: [[201038, "Small"], [201459, "Medium"], [201074, "Large"]],
  204189: [[204189, "Small"], [200336, "Medium"], [200335, "Large"]],
  204208: [[204208, "Small"], [204191, "Medium"], [204183, "Large"]],
  204209: [[204209, "Small"], [204216, "Medium"], [204184, "Large"]],
  200610: [[200610, "National"], [201352, "California"]],
};

const PROMOTED_FAMILIES: PromotedFamily[] = [
  { parentId: 200169, name: "Hot Mustard Sauce", categories: ["Sauces & Condiments"], productUrl: "https://www.mcdonalds.com/us/en-us/full-menu.html", sizes: [[200169, "Packet"]], servingType: "addon", sourceOnly: true },
  { parentId: 201677, name: "Coca-Cola® (Small) No Ice", categories: ["Drinks", "Soft Drinks"], productUrl: "https://www.mcdonalds.com/us/en-us/product/coca-cola-small.html", sizes: [[201677, "Small No Ice"]], servingType: "drink", sourceOnly: true },
  { parentId: 204268, name: "Cheeseburger (Second Included)", categories: ["Burgers"], productUrl: "https://www.mcdonalds.com/us/en-us/product/cheeseburger.html", sizes: [[204268, "Included"]], servingType: "entree", sourceOnly: true },
  { parentId: 204339, name: "Sausage Burrito (Second Included)", categories: ["Breakfast"], productUrl: "https://www.mcdonalds.com/us/en-us/product/sausage-burrito.html", sizes: [[204339, "Included"]], servingType: "breakfast", sourceOnly: true },
  { parentId: 204408, name: "Ranch Snack Wrap (Second Included)", categories: ["Snack Wraps"], productUrl: "https://www.mcdonalds.com/us/en-us/product/ranch-snack-wrap.html", sizes: [[204408, "Included"]], servingType: "entree", sourceOnly: true },
  { parentId: 204407, name: "Spicy Snack Wrap (Second Included)", categories: ["Snack Wraps"], productUrl: "https://www.mcdonalds.com/us/en-us/product/spicy-snack-wrap.html", sizes: [[204407, "Included"]], servingType: "entree", sourceOnly: true },
  { parentId: 203057, name: "Fanta® Orange", categories: ["Drinks", "Soft Drinks"], productUrl: "https://www.mcdonalds.com/us/en-us/product/fanta-orange-small.html", sizes: [[203057, "Small"], [203058, "Medium"], [203063, "Large"]], familyFallbackItemId: 204716 },
  { parentId: 200614, name: "Diet Dr Pepper®", categories: ["Drinks", "Soft Drinks"], productUrl: "https://www.mcdonalds.com/us/en-us/product/diet-dr-pepper-small.html", sizes: [[200614, "Small"], [200645, "Medium"], [200644, "Large"]], familyFallbackItemId: 200613 },
  { parentId: 204484, name: "Red Bull®", categories: ["Drinks"], productUrl: "https://www.mcdonalds.com/us/en-us/product/red-bull.html", sizes: [[204484, "Can"]], familyFallbackItemId: 204498 },
  { parentId: 204702, name: "Red Bull Zero®", categories: ["Drinks"], productUrl: "https://www.mcdonalds.com/us/en-us/product/red-bull-zero.html", sizes: [[204702, "Can"]], familyFallbackItemId: 204688 },
  { parentId: 203967, name: "Unsweetened Tea Lemonade", categories: ["Drinks", "Iced Tea & Lemonade"], productUrl: "https://www.mcdonalds.com/us/en-us/product/unsweetened-tea-lemonade.html", sizes: [[203967, "Small"], [203965, "Medium"], [203963, "Large"]], familyFallbackItemId: 203957 },
  { parentId: 203964, name: "Sweet Tea Lemonade", categories: ["Drinks", "Iced Tea & Lemonade"], productUrl: "https://www.mcdonalds.com/us/en-us/product/sweet-tea-lemonade.html", sizes: [[203964, "Small"], [203966, "Medium"], [203961, "Large"]], familyFallbackItemId: 203957 },
  { parentId: 200591, name: "McCafé® Iced Sugar Free Vanilla Coffee", categories: ["McCafé®"], productUrl: "https://www.mcdonalds.com/us/en-us/product/iced-sugar-free-vanilla-coffee-small.html", sizes: [[200591, "Small"], [200590, "Medium"], [200589, "Large"]], familyFallbackItemId: 204219 },
  { parentId: 200223, name: "McCafé® Iced French Vanilla Latte", categories: ["McCafé®", "Latte"], productUrl: "https://www.mcdonalds.com/us/en-us/product/iced-french-vanilla-latte-small.html", sizes: [[200223, "Small"], [200209, "Medium"], [200201, "Large"]], familyFallbackItemId: 204209 },
  { parentId: 200333, name: "McCafé® Iced Sugar Free Vanilla Latte", categories: ["McCafé®", "Latte"], productUrl: "https://www.mcdonalds.com/us/en-us/product/iced-sugar-free-vanilla-latte-small.html", sizes: [[200333, "Small"], [200227, "Medium"], [200225, "Large"]], familyFallbackItemId: 200223 },
  { parentId: 200706, name: "McCafé® Sugar Free Vanilla Latte", categories: ["McCafé®", "Latte"], productUrl: "https://www.mcdonalds.com/us/en-us/product/sugar-free-vanilla-latte-small.html", sizes: [[200706, "Small"], [200707, "Medium"], [200708, "Large"]], familyFallbackItemId: 204209 },
  { parentId: 200390, name: "McCafé® Sugar Free Vanilla Cappuccino", categories: ["McCafé®", "Cappuccino"], productUrl: "https://www.mcdonalds.com/us/en-us/product/sugar-free-vanilla-cappuccino-small.html", sizes: [[200390, "Small"], [200389, "Medium"], [200388, "Large"]], familyFallbackItemId: 200186 },
  { parentId: 204695, name: "McCafé® Caramel Apple Pie Frappé", categories: ["McCafé®"], productUrl: "https://www.mcdonalds.com/us/en-us/product/caramel-apple-pie-frappe-small.html", sizes: [[204695, "Small"], [204687, "Medium"], [204689, "Large"]], familyFallbackItemId: 200149 },
  { parentId: 204697, name: "McCafé® Caramel Apple Pie Latte", categories: ["McCafé®", "Latte"], productUrl: "https://www.mcdonalds.com/us/en-us/product/caramel-apple-pie-latte-small.html", sizes: [[204697, "Small"], [204685, "Medium"], [204700, "Large"]], familyFallbackItemId: 204208 },
  { parentId: 204693, name: "McCafé® Caramel Apple Pie Iced Coffee", categories: ["McCafé®"], productUrl: "https://www.mcdonalds.com/us/en-us/product/caramel-apple-pie-iced-coffee-small.html", sizes: [[204693, "Small"], [204698, "Medium"], [204690, "Large"]], familyFallbackItemId: 204205 },
  { parentId: 204691, name: "McCafé® Iced Caramel Apple Pie Latte", categories: ["McCafé®", "Latte"], productUrl: "https://www.mcdonalds.com/us/en-us/product/iced-caramel-apple-pie-latte-small.html", sizes: [[204691, "Small"], [204699, "Medium"], [204692, "Large"]], familyFallbackItemId: 204189 },
];

// Some official meal records list their components in side/drink-first order,
// so component position alone cannot identify the entree. Keep the reviewed
// corrections scoped to meal/entree pairs established by the captured meal
// records; unresolved components continue to be ignored rather than guessed.
const REVIEWED_MEAL_ENTREE_IDS: Record<number, number> = {
  200714: 200307, // Sausage, Egg & Cheese McGriddles Meal
  200715: 200304, // Bacon, Egg & Cheese McGriddles Meal
  200717: 200306, // Sausage McGriddles Meal
  204534: 203410, // Bacon Quarter Pounder with Cheese Meal
  204535: 200765, // Quarter Pounder with Cheese Deluxe Meal
  204558: 200424, // Bacon, Egg & Cheese Bagel Meal
  200723: 200300, // Bacon, Egg & Cheese Biscuit Meal
  200724: 200161, // Sausage McMuffin with Egg Meal
  200731: 200302, // Sausage Biscuit with Egg Meal
  200739: 200298, // Egg McMuffin Meal
  200716: 200267, // Sausage Burrito Meal
  204559: 200145, // Steak, Egg & Cheese Bagel Meal
  204409: 204401, // 2 Ranch Snack Wraps Meal
  204410: 204402, // 2 Spicy Snack Wraps Meal
};

type McDonaldsSource = {
  provider: "McDonald's";
  menu: {
    itemIds: string[];
    itemType: string;
    itemCategory: string;
    role: "standalone_product" | "meal";
    officialCategories: string[];
    productUrl: string;
    originalName: string;
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
    image: catalogImage(sourceItem) ?? fallbackImage,
    nutrition,
    categories,
    servingType,
    canonicalItemId: canonicalId,
    source: { menu: { tags: [], pins: [] } },
  };
}

function catalogImage(item: JsonObject): string | undefined {
  const hero = object(item.attach_item_hero_image);
  const file = stringValue(hero?.url) ?? stringValue(hero?.image_name);
  if (!file) return undefined;
  if (/^https:\/\//i.test(file)) return encodeURI(file);
  const asset = file.split("/").at(-1)!.replace(/\.[a-z0-9]+$/i, "");
  // The DNA feed mixes current Scene7 asset IDs with retired filenames such
  // as h-mcdonalds-*. Turning retired filenames into Scene7 URLs yields 403s.
  // Only current DAM-style IDs are safe to normalize onto the Scene7 host.
  if (!/^(?:DC_|\d{4}(?:XX|\d{2})_)/.test(asset)) return undefined;
  return `https://s7d1.scene7.com/is/image/mcdonalds/${asset}:nutrition-calculator-tile?fmt=png-alpha`;
}

function reviewedVariants(sizes: Array<[number, string]>, catalogById: Map<number, JsonObject>, image: string, categories: string[], canonicalId: string): ItemVariant[] {
  return sizes.flatMap(([id, label]) => {
    const record = catalogById.get(id);
    const nutrition = record && nutritionFor(record);
    return nutrition ? [{ id: itemId(id), label, image: catalogImage(record) ?? image, nutrition, categories, servingType: "drink" as const, canonicalItemId: canonicalId, source: { menu: { tags: [], pins: [] } } }] : [];
  });
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
    const reviewedSizes = REVIEWED_SIZE_FAMILIES[entry.itemId];
    const variants = reviewedSizes
      ? reviewedVariants(reviewedSizes, catalogById, entry.imageUrl, categories, itemId(entry.itemId))
      : (ownsSizeFamily ? relatedSizeItems(sourceItem) : [])
        .map((related) => variantFor(related, catalogById, entry.imageUrl, categories, servingType, itemId(entry.itemId)))
        .filter((variant): variant is ItemVariant => Boolean(variant));
    const expectedVariantIds = reviewedSizes?.map(([id]) => id) ?? (ownsSizeFamily ? relatedSizeItems(sourceItem) : [])
      .map((related) => numberValue(related.id)).filter((id): id is number => id !== undefined);
    const missingVariantIds = expectedVariantIds.filter((id) => !variants.some((variant) => variant.id === itemId(id)));
    if (missingVariantIds.length) warnings.push(`${entry.itemId}: omitted unresolved size variants ${missingVariantIds.join(", ")}`);

    let comboConfig: ComboMealConfig | undefined;
    if (servingType === "combo" || servingType === "kids") {
      const resolvable = [...new Set(components
        .map((id) => generatedIds.has(id) ? id : variantOwnerById.get(id))
        .filter((id): id is number => id !== undefined))];
      const reviewedEntreeId = REVIEWED_MEAL_ENTREE_IDS[entry.itemId];
      const entreeId = reviewedEntreeId ?? resolvable[0];
      if (entreeId !== undefined && generatedIds.has(entreeId)) {
        comboConfig = {
          entreeItemId: itemId(entreeId),
          ...(resolvable.some((id) => id !== entreeId)
            ? { includedItemIds: resolvable.filter((id) => id !== entreeId).map(itemId) }
            : {}),
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
        originalName: entry.name,
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

  for (const family of PROMOTED_FAMILIES) {
    if (items.some((item) => item.id === itemId(family.parentId))) continue;
    const sourceItem = catalogById.get(family.parentId);
    const nutrition = sourceItem && nutritionFor(sourceItem);
    if (!sourceItem || !nutrition) { warnings.push(`${family.parentId}: reviewed promoted family lacks official nutrition`); continue; }
    const familyFallbackImage = family.familyFallbackItemId
      ? items.find((item) => item.id === itemId(family.familyFallbackItemId!))?.image
      : undefined;
    // An explicit missing image is preferable to showing an unrelated product.
    const image = catalogImage(sourceItem) ?? familyFallbackImage ?? "none";
    const variants = reviewedVariants(family.sizes, catalogById, image, family.categories, itemId(family.parentId));
    items.push({
      id: itemId(family.parentId), name: family.name, image, categories: family.categories, servingType: family.servingType ?? "drink",
      nutrition, addonEligible: false, defaultOrder: items.length,
      ...(family.sourceOnly ? { sourceOnly: true } : {}),
      ...(variants.length > 1 ? { variants, defaultVariantId: itemId(family.parentId) } : {}),
      source: { menu: { tags: [], pins: [] }, generated: {
        provider: "McDonald's", menu: { itemIds: [], itemType: "Core Item", itemCategory: family.categories[0], role: "standalone_product", officialCategories: family.categories, productUrl: family.productUrl, originalName: family.name, shortName: stringValue(sourceItem.short_name) ?? null, componentItemIds: componentIds(sourceItem).map(String), reconciliationStatus: "manual_reconciliation", reconciliationReasons: ["reviewed_official_dna_catalog_family"], manualReconciliation: "Promoted from official DNA catalog for ordering-menu reuse." },
        nutrition: { method: "official_us_dna_item_details", sourceItemId: String(family.parentId) },
      } },
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
