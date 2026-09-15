import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ItemVariant, MenuItem, RestaurantMenu, ServingType } from "../../types/menu";
import type { Nutrition } from "../../types/nutrition";
import { sanitizeDisplayName } from "../lib/display-name";
import { normalizeName } from "../lib/normalize-name";
import { writeAtomically } from "../lib/write-atomically";

const MENU_SOURCE = "data/restaurants/starbucks/raw/menu.json";
const MENU_PATH = resolve(MENU_SOURCE);
const OUTPUT_PATH = resolve("data/restaurants/starbucks/generated/restaurant.json");
const UNRESOLVED_PATH = resolve("data/restaurants/starbucks/generated/unresolved.json");

type RawNutritionFact = {
  id?: string;
  value?: number | null;
  subfacts?: RawNutritionFact[];
};

type RawNutrition = {
  servingSize?: { displayValue?: string };
  calories?: { displayValue?: number | string };
  additionalFacts?: RawNutritionFact[];
};

type RawSize = {
  name: string;
  sizeCode?: string;
  sku: string;
  nutrition?: RawNutrition;
};

type RawDetailProduct = {
  productNumber: number;
  formCode: string;
  productType: string;
  name: string;
  description?: string;
  imageURL?: string;
  inCatalog?: boolean;
  sizes: RawSize[];
};

type RawResponse = {
  productNumber: number;
  form: string;
  retrievedAt: string;
  response: { products?: RawDetailProduct[] };
};

type RawCatalogProduct = {
  productNumber: number;
  formCode: string;
  name: string;
  displayOrder: number;
  availability?: string;
  defaultSize?: { sku?: string; displayName?: string };
};

type RawCategory = {
  name: string;
  displayOrder: number;
  products?: RawCatalogProduct[];
  children?: RawCategory[];
};

type RawStarbucksMenu = {
  schemaVersion: number;
  region: string;
  menuSha256: string;
  responses: RawResponse[];
  failures: unknown[];
  updatedAt: string;
  menu: { menus: RawCategory[] };
  provenance: {
    menuEndpoint: string;
    productEndpointTemplate: string;
    menuRetrievedAt: string;
    detailRetrievedAtRange?: { earliest?: string; latest?: string };
  };
};

type CatalogOccurrence = {
  product: RawCatalogProduct;
  path: string[];
  orderPath: number[];
};

type StarbucksSourceTrace = {
  provider: "Starbucks";
  menu: {
    productNumber: number;
    formCode: string;
    productType: string;
    catalogName: string;
    officialCategoryPaths: string[];
    role: "standalone_product";
  };
  nutrition: {
    method: "official_us_ordering_api_size_panel";
    sku: string;
    sizeName: string;
    servingSize: string | null;
  };
};

type GeneratedVariant = Omit<ItemVariant, "source"> & { source: StarbucksSourceTrace };
type GeneratedMenuItem = Omit<MenuItem, "variants" | "source"> & {
  variants: GeneratedVariant[];
  source: StarbucksSourceTrace;
};

type UnresolvedRecord = {
  productNumber: number;
  formCode: string;
  sku: string;
  productName: string;
  sizeName: string;
  reason: "missing_standard_nutrition" | "invalid_standard_nutrition";
  details: string;
};

type FilteredRecord = {
  productNumber: number;
  formCode: string;
  sku: string;
  productName: string;
  sizeName: string;
  reason: "non_food_merchandise";
  details: string;
};

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function identityKey(productNumber: number, formCode: string): string {
  return `${productNumber}|${normalizeName(formCode)}`;
}

function flattenCatalog(categories: RawCategory[]): CatalogOccurrence[] {
  const occurrences: CatalogOccurrence[] = [];
  const visit = (category: RawCategory, path: string[], orderPath: number[]): void => {
    const nextPath = [...path, category.name];
    const nextOrderPath = [...orderPath, category.displayOrder];
    for (const product of category.products ?? []) {
      occurrences.push({ product, path: nextPath, orderPath: [...nextOrderPath, product.displayOrder] });
    }
    for (const child of category.children ?? []) visit(child, nextPath, nextOrderPath);
  };
  for (const category of categories) visit(category, [], []);
  return occurrences;
}

function factIndex(nutrition: RawNutrition): Map<string, number> {
  const result = new Map<string, number>();
  const visit = (fact: RawNutritionFact): void => {
    if (fact.id && typeof fact.value === "number" && Number.isFinite(fact.value)) {
      result.set(fact.id, fact.value);
    }
    for (const child of fact.subfacts ?? []) visit(child);
  };
  for (const fact of nutrition.additionalFacts ?? []) visit(fact);
  return result;
}

function nutritionFor(raw: RawNutrition | undefined): Nutrition | undefined {
  if (!raw) return undefined;
  const rawCalories = raw.calories?.displayValue;
  const calories = typeof rawCalories === "number" ? rawCalories : Number(rawCalories);
  const facts = factIndex(raw);
  const protein = facts.get("protein");
  const carbs = facts.get("totalCarbs");
  const totalFat = facts.get("totalFat");
  if (![calories, protein, carbs, totalFat].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)) {
    return undefined;
  }
  const result: Nutrition = { calories, protein: protein as number, carbs: carbs as number, totalFat: totalFat as number };
  const optionalFacts: Array<[keyof Nutrition, string]> = [
    ["satFat", "saturatedFat"],
    ["transFat", "transFat"],
    ["cholesterol", "cholesterol"],
    ["sodium", "sodium"],
    ["fiber", "dietaryFiber"],
    ["sugars", "sugars"],
  ];
  for (const [field, sourceId] of optionalFacts) {
    const value = facts.get(sourceId);
    if (value !== undefined && Number.isFinite(value) && value >= 0) result[field] = value;
  }
  return result;
}

function usableCategoryOccurrences(occurrences: CatalogOccurrence[]): CatalogOccurrence[] {
  const normal = occurrences.filter(({ path }) => path[0] !== "The Latest");
  return normal.length > 0 ? normal : occurrences;
}

function primaryOccurrenceFor(occurrences: CatalogOccurrence[]): CatalogOccurrence {
  return [...usableCategoryOccurrences(occurrences)].sort((a, b) => compareOrderPath(a.orderPath, b.orderPath))[0];
}

function primaryBrowseCategory(product: RawDetailProduct, occurrences: CatalogOccurrence[]): string {
  // Starbucks lists Avocado Spread beneath every food family it can accompany.
  // It is a condiment product, not seven separate breakfast/lunch products.
  if (product.productNumber === 2122257 && normalizeName(product.formCode) === "single") return "Snacks";

  const paths = usableCategoryOccurrences(occurrences).map(({ path }) => path);
  const groupRules: Array<[string, (path: string[]) => boolean]> = [
    ["Protein Drinks", (path) => path[0] === "Protein"],
    ["Hot Coffee & Espresso", (path) => path[0] === "Coffee & Espresso" && path[1] === "Hot Coffee & Espresso"],
    ["Cold Coffee & Espresso", (path) => path[0] === "Coffee & Espresso" && path[1] === "Cold Coffee & Espresso"],
    ["Frappuccino", (path) => path[0] === "Frappuccino® Blended Beverage"],
    ["Tea & Chai", (path) => path[0] === "Tea" && path[1] !== "Matcha"],
    ["Matcha", (path) => path[0] === "Tea" && path[1] === "Matcha"],
    ["Refreshers", (path) => path[0] === "Refreshment"],
    ["Other Drinks", (path) => path[0] === "Other Sips"],
    ["Breakfast", (path) => path[0] === "Food" && path[1] === "Breakfast"],
    ["Bakery & Treats", (path) => path[0] === "Food" && (path[1] === "Bakery" || path[1] === "Treats")],
    ["Lunch", (path) => path[0] === "Food" && path[1] === "Lunch"],
    ["Snacks", (path) => path[0] === "Food" && path[1] === "Snacks"],
  ];
  const category = groupRules.find(([, matches]) => paths.some(matches))?.[0];
  if (!category) {
    throw new Error(`No Starbucks top-level browse category maps ${product.productNumber}/${product.formCode}.`);
  }
  return category;
}

function servingTypeFor(product: RawDetailProduct, occurrences: CatalogOccurrence[]): ServingType {
  if (product.productNumber === 2122257 && normalizeName(product.formCode) === "single") return "addon";
  if (product.productType.toLowerCase() === "beverages") return "drink";
  if (product.productType.toLowerCase() !== "food") return "single";
  const segments = new Set(usableCategoryOccurrences(occurrences).flatMap(({ path }) => path));
  if (segments.has("Breakfast")) return "breakfast";
  if (segments.has("Treats") || segments.has("Bakery")) return "dessert";
  if (segments.has("Lunch")) return "entree";
  return "single";
}

function compareOrderPath(a: number[], b: number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? Number.MAX_SAFE_INTEGER) - (b[index] ?? Number.MAX_SAFE_INTEGER);
    if (difference !== 0) return difference;
  }
  return 0;
}

function sourceTrace(
  product: RawDetailProduct,
  size: RawSize,
  categoryPaths: string[],
): StarbucksSourceTrace {
  return {
    provider: "Starbucks",
    menu: {
      productNumber: product.productNumber,
      formCode: product.formCode,
      productType: product.productType,
      catalogName: product.name,
      officialCategoryPaths: categoryPaths,
      role: "standalone_product",
    },
    nutrition: {
      method: "official_us_ordering_api_size_panel",
      sku: size.sku,
      sizeName: size.name,
      servingSize: size.nutrition?.servingSize?.displayValue?.trim() || null,
    },
  };
}

async function main(): Promise<void> {
  const raw = JSON.parse(await readFile(MENU_PATH, "utf8")) as RawStarbucksMenu;
  if (raw.region !== "US") throw new Error(`Expected Starbucks US data, received region ${raw.region}.`);
  if (raw.failures.length > 0) throw new Error(`Starbucks snapshot contains ${raw.failures.length} collection failures.`);

  const catalogOccurrences = flattenCatalog(raw.menu.menus);
  const occurrencesByIdentity = new Map<string, CatalogOccurrence[]>();
  for (const occurrence of catalogOccurrences) {
    const key = identityKey(occurrence.product.productNumber, occurrence.product.formCode);
    occurrencesByIdentity.set(key, [...(occurrencesByIdentity.get(key) ?? []), occurrence]);
  }

  const responseByIdentity = new Map<string, { response: RawResponse; product: RawDetailProduct }>();
  for (const response of raw.responses) {
    if (response.response.products?.length !== 1) {
      throw new Error(`Expected one detail product for ${response.productNumber}/${response.form}.`);
    }
    const product = response.response.products[0];
    const key = identityKey(response.productNumber, response.form);
    if (responseByIdentity.has(key)) throw new Error(`Duplicate detail response for ${key}.`);
    if (identityKey(product.productNumber, product.formCode) !== key) {
      throw new Error(`Detail response identity mismatch for ${key}.`);
    }
    responseByIdentity.set(key, { response, product });
  }

  const missingDetails = [...occurrencesByIdentity.keys()].filter((key) => !responseByIdentity.has(key));
  const unlistedDetails = [...responseByIdentity.keys()].filter((key) => !occurrencesByIdentity.has(key));
  if (missingDetails.length > 0 || unlistedDetails.length > 0) {
    throw new Error(`Catalog/detail identity mismatch: ${missingDetails.length} missing and ${unlistedDetails.length} unlisted.`);
  }

  const items: GeneratedMenuItem[] = [];
  const unresolved: UnresolvedRecord[] = [];
  const filtered: FilteredRecord[] = [];
  const seenSkus = new Set<string>();

  for (const [key, { product }] of responseByIdentity) {
    const occurrences = occurrencesByIdentity.get(key) as CatalogOccurrence[];
    const categoryPaths = unique(occurrences.map(({ path }) => path.join(" > ")));
    const resolvedVariants: GeneratedVariant[] = [];

    for (const size of product.sizes) {
      if (!size.sku || seenSkus.has(size.sku)) throw new Error(`Missing or duplicate Starbucks SKU for ${key}/${size.name}.`);
      seenSkus.add(size.sku);
      if (product.productNumber === 2121746 && normalizeName(product.formCode) === "single") {
        filtered.push({
          productNumber: product.productNumber,
          formCode: product.formCode,
          sku: size.sku,
          productName: product.name,
          sizeName: size.name,
          reason: "non_food_merchandise",
          details: "Official catalog shopping-bag merchandise is not an edible menu item and is excluded before nutrition resolution.",
        });
        continue;
      }
      const nutrition = nutritionFor(size.nutrition);
      if (!nutrition) {
        unresolved.push({
          productNumber: product.productNumber,
          formCode: product.formCode,
          sku: size.sku,
          productName: product.name,
          sizeName: size.name,
          reason: size.nutrition ? "invalid_standard_nutrition" : "missing_standard_nutrition",
          details: size.nutrition
            ? "The official US size panel does not contain all four required standard macro fields."
            : "The official US ordering response does not publish a standard nutrition panel for this size.",
        });
        continue;
      }
      resolvedVariants.push({
        id: `starbucks-sku-${size.sku}`,
        label: sanitizeDisplayName(size.name),
        categories: [primaryBrowseCategory(product, occurrences)],
        servingType: servingTypeFor(product, occurrences),
        nutrition,
        source: sourceTrace(product, size, categoryPaths),
      });
    }

    if (resolvedVariants.length === 0) continue;
    const catalogDefaultSkus = unique(occurrences.flatMap(({ product: entry }) => entry.defaultSize?.sku ? [entry.defaultSize.sku] : []));
    if (catalogDefaultSkus.length > 1) throw new Error(`Conflicting default SKUs for ${key}: ${catalogDefaultSkus.join(", ")}.`);
    const defaultSku = catalogDefaultSkus[0];
    const defaultVariant = resolvedVariants.find((variant) => variant.id === `starbucks-sku-${defaultSku}`);
    if (!defaultSku || !defaultVariant) throw new Error(`No resolved default-size SKU for ${key}.`);
    const primaryOccurrence = primaryOccurrenceFor(occurrences);

    items.push({
      id: `starbucks-${product.productNumber}-${slugify(product.formCode)}`,
      name: sanitizeDisplayName(product.name),
      image: product.imageURL ?? "none",
      categories: [primaryBrowseCategory(product, occurrences)],
      servingType: servingTypeFor(product, occurrences),
      nutrition: defaultVariant.nutrition,
      variants: resolvedVariants,
      defaultVariantId: defaultVariant.id,
      defaultOrder: primaryOccurrence?.orderPath.reduce((value, part) => value * 1_000 + part, 0) ?? items.length,
      source: defaultVariant.source,
    });
  }

  items.sort((a, b) => a.defaultOrder - b.defaultOrder || a.name.localeCompare(b.name));
  items.forEach((item, index) => { item.defaultOrder = index + 1; });

  const restaurantOutput: RestaurantMenu & Record<string, unknown> = {
    items: items as unknown as MenuItem[],
    importMetadata: {
      restaurant: "Starbucks",
      region: raw.region,
      schemaVersion: raw.schemaVersion,
      source: MENU_SOURCE,
      menuSha256: raw.menuSha256,
      menuEndpoint: raw.provenance.menuEndpoint,
      productEndpointTemplate: raw.provenance.productEndpointTemplate,
      menuRetrievedAt: raw.provenance.menuRetrievedAt,
      detailRetrievedAtRange: raw.provenance.detailRetrievedAtRange ?? null,
      snapshotUpdatedAt: raw.updatedAt,
      policy: "Official standard US size nutrition only; customization and recipe data are intentionally ignored in v1.",
      counts: {
        catalogProductForms: occurrencesByIdentity.size,
        importedItems: items.length,
        unresolvedSizes: unresolved.length,
        filteredNonFoodMerchandise: filtered.length,
      },
    },
  };
  const unresolvedOutput = {
    restaurant: "Starbucks",
    region: raw.region,
    source: MENU_SOURCE,
    policy: "Sizes without complete official US standard nutrition are omitted; nutrition is never inferred or calculated. Non-food merchandise is filtered before nutrition resolution.",
    summary: {
      catalogProductForms: occurrencesByIdentity.size,
      importedItems: items.length,
      unresolved: unresolved.length,
      filteredNonFoodMerchandise: filtered.length,
    },
    records: unresolved,
    filteredRecords: filtered,
  };

  await Promise.all([
    writeAtomically(OUTPUT_PATH, `${JSON.stringify(restaurantOutput, null, 2)}\n`),
    writeAtomically(UNRESOLVED_PATH, `${JSON.stringify(unresolvedOutput, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ output: OUTPUT_PATH, unresolvedOutput: UNRESOLVED_PATH, items: items.length, unresolved: unresolved.length, filtered: filtered.length }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
