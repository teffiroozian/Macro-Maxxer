import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";
import {
  OPTIONAL_NUTRITION_FIELDS,
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

const RAW_PATH = resolve("data/restaurants/starbucks/raw/menu.json");
const RESTAURANT_PATH = resolve("data/restaurants/starbucks/generated/restaurant.json");
const UNRESOLVED_PATH = resolve("data/restaurants/starbucks/generated/unresolved.json");
const REPORT_PATH = resolve("data/restaurants/starbucks/validation/report.json");

const CHECK_NAMES = [
  "structure",
  "coverage",
  "identity",
  "categories",
  "defaults",
  "nutrition",
  "sku_sizes",
  "provenance",
  "unresolved",
  "filtered",
] as const;
type CheckName = (typeof CHECK_NAMES)[number];

const context = createValidationContext<CheckName>(CHECK_NAMES);
const identityKey = (productNumber: unknown, formCode: unknown): string | undefined =>
  typeof productNumber === "number" && nonEmptyString(formCode)
    ? `${productNumber}|${nonEmptyString(formCode)?.toLocaleLowerCase("en-US")}`
    : undefined;

function sourceMenu(record: JsonObject): JsonObject | undefined {
  return isObject(record.source) && isObject(record.source.menu) ? record.source.menu : undefined;
}

function sourceNutrition(record: JsonObject): JsonObject | undefined {
  return isObject(record.source) && isObject(record.source.nutrition) ? record.source.nutrition : undefined;
}

function nutritionEqual(a: JsonObject | undefined, b: JsonObject | undefined): boolean {
  if (!a || !b) return false;
  return ["calories", "protein", "carbs", "totalFat", ...OPTIONAL_NUTRITION_FIELDS].every(
    (field) => a[field] === b[field],
  );
}

function addDuplicateErrors(values: string[], kind: "item" | "variant" | "sku"): void {
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  if (duplicates.length > 0) {
    addFinding(context, "error", kind === "sku" ? "sku_sizes" : "identity", `duplicate_${kind}_identity`, `Duplicate ${kind} identities found: ${duplicates.join(", ")}.`, { recordIds: duplicates });
  }
}

async function main(): Promise<void> {
  const rawValue = await parseJsonFile(RAW_PATH, "Starbucks raw menu", context, "structure");
  const restaurantValue = await parseJsonFile(RESTAURANT_PATH, "Starbucks generated restaurant", context, "structure");
  const unresolvedValue = await parseJsonFile(UNRESOLVED_PATH, "Starbucks unresolved output", context, "structure");
  if (!isObject(rawValue) || !isObject(restaurantValue) || !isObject(unresolvedValue)) {
    await finish();
    return;
  }

  const rawResponses = objectArray(rawValue.responses) ?? [];
  const items = objectArray(restaurantValue.items) ?? [];
  const unresolved = objectArray(unresolvedValue.records) ?? [];
  const filtered = objectArray(unresolvedValue.filteredRecords) ?? [];
  if (!Array.isArray(rawValue.responses) || !Array.isArray(restaurantValue.items) || !Array.isArray(unresolvedValue.records) || !Array.isArray(unresolvedValue.filteredRecords)) {
    addFinding(context, "error", "structure", "required_arrays_missing", "Raw responses, generated items, unresolved records, and filtered records must all be arrays.");
  }
  setCheckDetails(context, "structure", { rawResponses: rawResponses.length, items: items.length, unresolved: unresolved.length, filtered: filtered.length });

  const rawKeys: string[] = [];
  for (const response of rawResponses) {
    const key = identityKey(response.productNumber, response.form);
    if (key) rawKeys.push(key);
    else addFinding(context, "error", "coverage", "raw_identity_invalid", "A raw response lacks a valid productNumber/form identity.");
  }
  const itemKeys = items.flatMap((item) => {
    const key = identityKey(sourceMenu(item)?.productNumber, sourceMenu(item)?.formCode);
    return key ? [key] : [];
  });
  const unresolvedKeys = unresolved.flatMap((record) => {
    const key = identityKey(record.productNumber, record.formCode);
    return key ? [key] : [];
  });
  const filteredKeys = filtered.flatMap((record) => {
    const key = identityKey(record.productNumber, record.formCode);
    return key ? [key] : [];
  });
  const classifiedKeys = [...itemKeys, ...unresolvedKeys, ...filteredKeys];
  const missing = rawKeys.filter((key) => !classifiedKeys.includes(key));
  const extra = classifiedKeys.filter((key) => !rawKeys.includes(key));
  const multiplyClassified = [...new Set(classifiedKeys.filter((key, index) => classifiedKeys.indexOf(key) !== index))];
  if (new Set(rawKeys).size !== rawKeys.length) addFinding(context, "error", "coverage", "duplicate_raw_product_form", "Raw product/form identities are not unique.");
  if (missing.length || extra.length || multiplyClassified.length) addFinding(context, "error", "coverage", "product_form_reconciliation_failed", `Coverage mismatch: ${missing.length} missing, ${extra.length} extra, ${multiplyClassified.length} multiply classified.`, { recordIds: [...missing, ...extra, ...multiplyClassified] });
  setCheckDetails(context, "coverage", { rawProductForms: rawKeys.length, imported: itemKeys.length, unresolved: unresolvedKeys.length, filtered: filteredKeys.length, reconciled: missing.length === 0 && extra.length === 0 && multiplyClassified.length === 0 });

  const itemIds = items.flatMap((item) => nonEmptyString(item.id) ? [item.id as string] : []);
  const variants = items.flatMap((item) => objectArray(item.variants) ?? []);
  const variantIds = variants.flatMap((variant) => nonEmptyString(variant.id) ? [variant.id as string] : []);
  if (itemIds.length !== items.length) addFinding(context, "error", "identity", "item_id_missing", "Every item must have a non-empty ID.");
  if (variantIds.length !== variants.length) addFinding(context, "error", "identity", "variant_id_missing", "Every variant must have a non-empty ID.");
  addDuplicateErrors(itemIds, "item");
  addDuplicateErrors(variantIds, "variant");
  setCheckDetails(context, "identity", { uniqueItemIds: new Set(itemIds).size, uniqueVariantIds: new Set(variantIds).size });

  for (const item of items) {
    const id = nonEmptyString(item.id) ?? "unknown";
    const categories = stringArray(item.categories);
    if (!categories || categories.length !== 1 || !nonEmptyString(categories[0])) addFinding(context, "error", "categories", "primary_category_invalid", `${id} must have exactly one non-empty primary browse category.`, { recordIds: [id] });
    const itemVariants = objectArray(item.variants) ?? [];
    const defaultId = nonEmptyString(item.defaultVariantId);
    const defaultVariant = itemVariants.find((variant) => variant.id === defaultId);
    if (!defaultId || !defaultVariant) addFinding(context, "error", "defaults", "default_variant_invalid", `${id} has no valid defaultVariantId.`, { recordIds: [id] });
    else if (!nutritionEqual(isObject(item.nutrition) ? item.nutrition : undefined, isObject(defaultVariant.nutrition) ? defaultVariant.nutrition : undefined)) addFinding(context, "error", "defaults", "parent_default_nutrition_mismatch", `${id} parent nutrition differs from its default variant.`, { recordIds: [id, defaultId] });
    validateNutrition(item.nutrition, `items.${id}.nutrition`, id, context, "nutrition");
    for (const variant of itemVariants) {
      const variantId = nonEmptyString(variant.id) ?? `${id}:unknown`;
      validateNutrition(variant.nutrition, `variants.${variantId}.nutrition`, variantId, context, "nutrition");
      const variantCategories = stringArray(variant.categories);
      if (!variantCategories || variantCategories.length !== 1 || variantCategories[0] !== categories?.[0]) addFinding(context, "error", "categories", "variant_primary_category_mismatch", `${variantId} must share its parent's one primary category.`, { recordIds: [id, variantId] });
    }
  }
  setCheckDetails(context, "categories", { itemsWithOnePrimaryCategory: items.filter((item) => stringArray(item.categories)?.length === 1).length });
  setCheckDetails(context, "defaults", { items: items.length, validDefaults: items.filter((item) => (objectArray(item.variants) ?? []).some((variant) => variant.id === item.defaultVariantId)).length });
  setCheckDetails(context, "nutrition", { itemPanels: items.length, variantPanels: variants.length, requiredSupportedFields: ["calories", "protein", "carbs", "totalFat", ...OPTIONAL_NUTRITION_FIELDS] });

  const skus: string[] = [];
  for (const item of items) {
    const labels: string[] = [];
    for (const variant of objectArray(item.variants) ?? []) {
      const sku = nonEmptyString(sourceNutrition(variant)?.sku);
      const label = nonEmptyString(variant.label);
      if (!sku || !label) addFinding(context, "error", "sku_sizes", "sku_or_size_missing", `${nonEmptyString(variant.id) ?? "unknown"} lacks SKU provenance or a size label.`);
      if (sku) skus.push(sku);
      if (label) labels.push(label);
    }
    if (new Set(labels).size !== labels.length) addFinding(context, "error", "sku_sizes", "duplicate_size_within_item", `${nonEmptyString(item.id) ?? "unknown"} has duplicate size labels.`);
  }
  addDuplicateErrors(skus, "sku");
  setCheckDetails(context, "sku_sizes", { variants: variants.length, uniqueSkus: new Set(skus).size });

  for (const record of [...items, ...variants]) {
    const id = nonEmptyString(record.id) ?? "unknown";
    const menu = sourceMenu(record);
    const nutrition = sourceNutrition(record);
    if (!isObject(record.source) || record.source.provider !== "Starbucks" || !menu || !identityKey(menu.productNumber, menu.formCode) || !stringArray(menu.officialCategoryPaths)?.length || nutrition?.method !== "official_us_ordering_api_size_panel" || !nonEmptyString(nutrition.sku)) {
      addFinding(context, "error", "provenance", "provenance_incomplete", `${id} lacks complete Starbucks menu/category/nutrition provenance.`, { recordIds: [id] });
    }
  }
  setCheckDetails(context, "provenance", { checkedRecords: items.length + variants.length });

  const unresolvedCounts = unresolved.reduce<Record<string, number>>((counts, record) => {
    const form = nonEmptyString(record.formCode) ?? "invalid";
    counts[form] = (counts[form] ?? 0) + 1;
    if (record.reason !== "missing_standard_nutrition") addFinding(context, "error", "unresolved", "unexpected_unresolved_reason", `Unexpected unresolved reason for ${form}.`);
    return counts;
  }, {});
  if (unresolved.length !== 21 || unresolvedCounts["Whole-Bean"] !== 16 || unresolvedCounts.VIA !== 5 || Object.keys(unresolvedCounts).some((form) => !["Whole-Bean", "VIA"].includes(form))) addFinding(context, "error", "unresolved", "unexpected_unresolved_set", `Expected only 16 Whole-Bean and 5 VIA unresolved records; found ${JSON.stringify(unresolvedCounts)}.`);
  setCheckDetails(context, "unresolved", { total: unresolved.length, byForm: unresolvedCounts });

  const bag = filtered.filter((record) => record.productNumber === 2121746 && record.formCode === "Single" && record.sku === "11061285" && record.reason === "non_food_merchandise");
  const bagUnresolved = unresolved.filter((record) => record.productNumber === 2121746);
  if (filtered.length !== 1 || bag.length !== 1 || bagUnresolved.length !== 0) addFinding(context, "error", "filtered", "shopping_bag_filter_invalid", `Small Shopping Bag must be the sole filtered non-food record and absent from unresolved nutrition.`);
  setCheckDetails(context, "filtered", { filteredRecords: filtered.length, shoppingBagFiltered: bag.length === 1, shoppingBagUnresolved: bagUnresolved.length });

  await finish();
}

async function finish(): Promise<void> {
  const report = {
    restaurant: "Starbucks",
    generatedAt: localDate(),
    valid: context.errors.length === 0,
    summary: { errors: context.errors.length, warnings: context.warnings.length, info: context.info.length, errorTypes: findingTypeCounts(context.errors), warningTypes: findingTypeCounts(context.warnings) },
    checks: context.checks,
    errors: context.errors,
    warnings: context.warnings,
    info: context.info,
  };
  await writeAtomically(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: "data/restaurants/starbucks/validation/report.json", valid: report.valid, summary: report.summary }, null, 2));
  if (!report.valid) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
