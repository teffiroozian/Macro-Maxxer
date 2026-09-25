import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";
import {
  addFinding,
  createValidationContext,
  findingTypeCounts,
  isObject,
  localDate,
  nonEmptyString,
  objectArray,
  parseJsonFile,
  setCheckDetails,
  stringArray,
  validateNutrition,
  type JsonObject,
} from "./shared";

const RAW_PATH = resolve("data/restaurants/mcdonalds/raw/menu.json");
const RESTAURANT_PATH = resolve("data/restaurants/mcdonalds/generated/restaurant.json");
const REPORT_PATH = resolve("data/restaurants/mcdonalds/validation/report.json");

const CHECK_NAMES = [
  "structure", "coverage", "identity", "names", "nutrition", "images_urls",
  "categories", "variants", "collections", "reconciliation", "filtered",
] as const;
type CheckName = (typeof CHECK_NAMES)[number];
const context = createValidationContext<CheckName>(CHECK_NAMES);

const normalizeName = (value: string): string => value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
const validId = (value: unknown): value is string => typeof value === "string" && /^mcd-item-\d+$/.test(value);
const validHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const validImage = (value: unknown): boolean => value === "none" || validHttpUrl(value);
const duplicates = (values: string[]): string[] => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const sourceGenerated = (record: JsonObject): JsonObject | undefined => isObject(record.source) && isObject(record.source.generated) ? record.source.generated : undefined;
const sourceMenu = (record: JsonObject): JsonObject | undefined => isObject(sourceGenerated(record)?.menu) ? sourceGenerated(record)?.menu as JsonObject : undefined;

function nutritionEquals(a: JsonObject, b: JsonObject): boolean {
  return ["calories", "protein", "carbs", "totalFat", "satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"]
    .every((field) => a[field] === b[field]);
}

function validateMacroPlausibility(nutrition: JsonObject, id: string, path: string): void {
  const maxima: Record<string, number> = { calories: 10000, protein: 1000, carbs: 1000, totalFat: 1000, satFat: 1000, transFat: 100, cholesterol: 10000, sodium: 50000, fiber: 500, sugars: 1000 };
  for (const [field, maximum] of Object.entries(maxima)) {
    if (!(field in nutrition)) continue;
    const value = nutrition[field];
    if (typeof value === "number" && value > maximum) addFinding(context, "error", "nutrition", "impossible_nutrition_value", `${path}.${field}=${value} exceeds ${maximum}.`, { recordIds: [id], path: `${path}.${field}` });
  }
}

async function main(): Promise<void> {
  const rawValue = await parseJsonFile(RAW_PATH, "McDonald's resolved menu", context, "structure");
  const restaurantValue = await parseJsonFile(RESTAURANT_PATH, "McDonald's generated restaurant", context, "structure");
  if (!isObject(rawValue) || !isObject(restaurantValue)) return finish();
  const rawItems = objectArray(rawValue.items) ?? [];
  const items = objectArray(restaurantValue.items) ?? [];
  const metadata = isObject(restaurantValue.importMetadata) ? restaurantValue.importMetadata : {};
  const skipped = objectArray(metadata.skipped) ?? [];
  if (!Array.isArray(rawValue.items) || !Array.isArray(restaurantValue.items)) addFinding(context, "error", "structure", "required_arrays_missing", "Raw and generated item arrays are required.");
  if (restaurantValue.hasBuildYourOwn !== false) addFinding(context, "error", "structure", "restaurant_flag_invalid", "hasBuildYourOwn must be false.");
  setCheckDetails(context, "structure", { rawItems: rawItems.length, items: items.length, variants: items.reduce((sum, item) => sum + (objectArray(item.variants)?.length ?? 0), 0) });

  const rawIds = rawItems.flatMap((item) => typeof item.itemId === "number" ? [item.itemId] : []);
  const generatedSourceIds = items.flatMap((item) => stringArray(sourceMenu(item)?.itemIds) ?? []).map(Number);
  const skippedIds = skipped.flatMap((record) => typeof record.itemId === "number" ? [record.itemId] : []);
  const classified = [...generatedSourceIds, ...skippedIds];
  const missingRaw = rawIds.filter((id) => !classified.includes(id));
  const extra = classified.filter((id) => !rawIds.includes(id));
  const multiplyClassified = duplicates(classified.map(String));
  if (missingRaw.length || extra.length || multiplyClassified.length) addFinding(context, "error", "coverage", "source_coverage_mismatch", `Coverage mismatch: ${missingRaw.length} missing, ${extra.length} extra, ${multiplyClassified.length} multiply classified.`, { recordIds: [...missingRaw, ...extra].map(String).concat(multiplyClassified) });
  setCheckDetails(context, "coverage", { raw: rawIds.length, generated: items.length, filtered: skipped.length, reconciled: !missingRaw.length && !extra.length && !multiplyClassified.length });

  const itemIds = items.flatMap((item) => validId(item.id) ? [item.id] : []);
  const variants = items.flatMap((item) => objectArray(item.variants) ?? []);
  const variantIds = variants.flatMap((variant) => validId(variant.id) ? [variant.id] : []);
  if (itemIds.length !== items.length) addFinding(context, "error", "identity", "invalid_item_id", "Every item ID must match mcd-item-{number}.");
  if (variantIds.length !== variants.length) addFinding(context, "error", "identity", "invalid_variant_id", "Every variant ID must match mcd-item-{number}.");
  const duplicateItemIds = duplicates(itemIds); const duplicateVariantIds = duplicates(variantIds);
  if (duplicateItemIds.length) addFinding(context, "error", "identity", "duplicate_item_ids", "Duplicate item IDs found.", { recordIds: duplicateItemIds });
  if (duplicateVariantIds.length) addFinding(context, "error", "identity", "duplicate_variant_ids", "Duplicate variant IDs found.", { recordIds: duplicateVariantIds });
  setCheckDetails(context, "identity", { uniqueItems: new Set(itemIds).size, uniqueVariants: new Set(variantIds).size });

  const names = new Map<string, string[]>();
  for (const item of items) { const id = nonEmptyString(item.id) ?? "unknown"; const name = nonEmptyString(item.name); if (!name) addFinding(context, "error", "names", "missing_display_name", `${id} lacks a display name.`, { recordIds: [id] }); else names.set(normalizeName(name), [...(names.get(normalizeName(name)) ?? []), id]); }
  const duplicateNames = [...names.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicateNames.length) addFinding(context, "error", "names", "duplicate_display_names", "Duplicate normalized display names found.", { recordIds: duplicateNames.flatMap(([, ids]) => ids) });
  setCheckDetails(context, "names", { duplicateGroups: duplicateNames.length });

  const itemIdSet = new Set(itemIds);
  for (const item of items) {
    const id = nonEmptyString(item.id) ?? "unknown";
    if (validateNutrition(item.nutrition, `items.${id}.nutrition`, id, context, "nutrition") && isObject(item.nutrition)) validateMacroPlausibility(item.nutrition, id, `items.${id}.nutrition`);
    if (!validImage(item.image)) addFinding(context, "error", "images_urls", "missing_or_malformed_image", `${id} lacks a valid image or explicit no-image marker.`, { recordIds: [id] });
    const productUrl = sourceMenu(item)?.productUrl;
    if (!validHttpUrl(productUrl)) addFinding(context, "error", "images_urls", "malformed_product_url", `${id} lacks a valid source product URL.`, { recordIds: [id] });
    const categories = stringArray(item.categories);
    if (!categories || !categories.length || categories.some((category) => !nonEmptyString(category)) || new Set(categories).size !== categories.length) addFinding(context, "error", "categories", "invalid_categories", `${id} has empty, invalid, or duplicate categories.`, { recordIds: [id] });
    const itemVariants = objectArray(item.variants) ?? [];
    if (itemVariants.length) {
      const defaultId = nonEmptyString(item.defaultVariantId);
      const defaultVariant = itemVariants.find((variant) => variant.id === defaultId);
      if (!defaultVariant) addFinding(context, "error", "variants", "broken_default_variant", `${id} has an invalid defaultVariantId.`, { recordIds: [id] });
      else if (isObject(item.nutrition) && isObject(defaultVariant.nutrition) && !nutritionEquals(item.nutrition, defaultVariant.nutrition)) addFinding(context, "error", "variants", "default_variant_nutrition_mismatch", `${id} nutrition does not match its default variant.`, { recordIds: [id, defaultId!] });
      const labels = itemVariants.flatMap((variant) => nonEmptyString(variant.label) ? [variant.label as string] : []);
      if (labels.length !== itemVariants.length || duplicates(labels).length) addFinding(context, "error", "variants", "invalid_variant_labels", `${id} has missing or duplicate variant labels.`, { recordIds: [id] });
      for (const variant of itemVariants) {
        const variantId = nonEmptyString(variant.id) ?? "unknown";
        if (variant.canonicalItemId !== id) addFinding(context, "error", "variants", "broken_variant_parent", `${variantId} does not point to parent ${id}.`, { recordIds: [id, variantId] });
        if (validateNutrition(variant.nutrition, `variants.${variantId}.nutrition`, variantId, context, "nutrition") && isObject(variant.nutrition)) validateMacroPlausibility(variant.nutrition, variantId, `variants.${variantId}.nutrition`);
        if (!validImage(variant.image)) addFinding(context, "error", "images_urls", "missing_or_malformed_variant_image", `${variantId} lacks a valid image or explicit no-image marker.`, { recordIds: [variantId] });
        if (JSON.stringify(variant.categories) !== JSON.stringify(item.categories)) addFinding(context, "error", "categories", "variant_category_mismatch", `${variantId} categories differ from ${id}.`, { recordIds: [id, variantId] });
      }
    } else if (item.defaultVariantId !== undefined) addFinding(context, "error", "variants", "default_without_variants", `${id} has defaultVariantId without variants.`, { recordIds: [id] });
    if (isObject(item.comboConfig)) {
      const refs = [item.comboConfig.entreeItemId, ...(stringArray(item.comboConfig.includedItemIds) ?? []), ...(stringArray(item.comboConfig.sideOptions) ?? []), ...(stringArray(item.comboConfig.drinkOptions) ?? [])].filter((value): value is string => typeof value === "string");
      const broken = refs.filter((ref) => !itemIdSet.has(ref));
      if (!nonEmptyString(item.comboConfig.entreeItemId) || broken.length) addFinding(context, "error", "collections", "broken_meal_reference", `${id} has an absent entree or broken meal references.`, { recordIds: [id, ...broken] });
    }
  }
  setCheckDetails(context, "nutrition", { itemPanels: items.length, variantPanels: variants.length });
  setCheckDetails(context, "images_urls", { itemImages: items.length, variantImages: variants.length, productUrls: items.length });
  setCheckDetails(context, "categories", { categoryCount: new Set(items.flatMap((item) => stringArray(item.categories) ?? [])).size });
  setCheckDetails(context, "variants", { variants: variants.length });
  setCheckDetails(context, "collections", { meals: items.filter((item) => isObject(item.comboConfig)).length });

  const unresolved = rawItems.filter((item) => typeof item.itemId !== "number" || !isObject(item.match) || !["matched", "manual_reconciliation"].includes(String(item.match.status)));
  if (unresolved.length) addFinding(context, "error", "reconciliation", "unresolved_source_records", `${unresolved.length} source records remain unresolved.`);
  const manualExceptions = objectArray(isObject(metadata.reconciliation) ? metadata.reconciliation.manualExceptions : undefined) ?? [];
  const mochaException = manualExceptions.some((record) => record.itemId === 202961 && nonEmptyString(record.reason));
  if (!mochaException) addFinding(context, "error", "reconciliation", "mocha_exception_missing", "The documented Mocha Latte exception is missing.");
  setCheckDetails(context, "reconciliation", { unresolved: unresolved.length, documentedManualExceptions: manualExceptions.length, mochaExceptionPreserved: mochaException });

  const expectedFilter = skipped.length === 1 && skipped[0].itemId === 200543 && skipped[0].reason === "merged_into_official_size_family_parent:200020";
  if (!expectedFilter) addFinding(context, "error", "filtered", "unexpected_filtered_records", `Expected only item 200543 to be merged into size-family parent 200020; found ${JSON.stringify(skipped)}.`);
  setCheckDetails(context, "filtered", { filtered: skipped.length, expectedCoffeeSizeMerge: expectedFilter });
  await finish();
}

async function finish(): Promise<void> {
  const report = { restaurant: "McDonald's", generatedAt: localDate(), valid: context.errors.length === 0, summary: { errors: context.errors.length, warnings: context.warnings.length, info: context.info.length, errorTypes: findingTypeCounts(context.errors), warningTypes: findingTypeCounts(context.warnings) }, checks: context.checks, errors: context.errors, warnings: context.warnings, info: context.info };
  await writeAtomically(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: "data/restaurants/mcdonalds/validation/report.json", valid: report.valid, summary: report.summary }, null, 2));
  if (!report.valid) process.exitCode = 1;
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
