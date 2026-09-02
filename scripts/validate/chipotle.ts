import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";
import {
  CORE_NUTRITION_FIELDS,
  OPTIONAL_NUTRITION_FIELDS,
  addFinding,
  createValidationContext,
  findingTypeCounts,
  isObject,
  localDate,
  nonEmptyString,
  objectArray,
  parseJsonFile,
  requireObjectArray,
  requireStringArray,
  setCheckDetails,
  stringArray,
  type JsonObject,
} from "./shared";

const RESTAURANT_PATH = resolve("data/generated/chipotle/restaurant.json");
const UNRESOLVED_PATH = resolve("data/generated/chipotle/unresolved.json");
const CALCULATOR_PATH = resolve("data/raw/chipotle/calculator-menu.json");
const LIVE_NUTRITION_PATH = resolve("data/raw/chipotle/menu-metadata-nutrition.json");
const PDF_NUTRITION_PATH = resolve("data/raw/chipotle/nutrition.json");
const ONLINE_MEALS_PATH = resolve("data/raw/chipotle/online-meals.json");
const DECISIONS_PATH = resolve("data/review/chipotle/import-decisions.md");
const REPORT_PATH = resolve("data/validation/chipotle/report.json");

const CHECK_NAMES = [
  "structure",
  "active_menu",
  "nutrition",
  "provenance",
  "relationships",
  "build_containers",
  "special_cases",
  "fountain_drinks",
  "sides_combinations",
  "duplicate_identities",
  "kids",
  "visibility",
  "unresolved",
  "cross_record_sanity",
] as const;
type CheckName = (typeof CHECK_NAMES)[number];

const VALID_SERVING_TYPES = new Set(["addon", "breakfast", "combo", "dessert", "drink", "entree", "kids", "shareable", "side", "single"]);
const VALID_NUTRITION_METHODS = new Set([
  "live_full_nutrition",
  "pdf_exact_name",
  "pdf_alias_name",
  "pdf_portion_disambiguated",
  "pdf_per_unit_override",
  "manual_verification",
  "approved_equivalent_official_record",
  "approved_portion_scaling",
  "structural_zero_choice",
  "composed_from_components",
]);
const DERIVED_METHODS = new Set([
  "pdf_per_unit_override",
  "manual_verification",
  "approved_equivalent_official_record",
  "approved_portion_scaling",
  "structural_zero_choice",
  "composed_from_components",
]);
const BUILD_CONTAINER_IDS = [
  "chipotle-burrito",
  "chipotle-bowl",
  "chipotle-salad",
  "chipotle-taco",
  "chipotle-tacos-3",
  "chipotle-quesadilla",
  "chipotle-kids-build-your-own",
  "chipotle-kids-quesadilla",
] as const;
const COMBO_IDS = ["CMG-5369", "CMG-5370", "CMG-5371", "CMG-5372", "CMG-5364", "CMG-5365", "CMG-5366", "CMG-5367"];
const LARGE_SALSA_GROUPS = [
  ["CMG-5400", "CMG-1049"],
  ["CMG-1047", "CMG-5398"],
  ["CMG-1048", "CMG-5399"],
  ["CMG-1050", "CMG-5500"],
] as const;
const EXPECTED_POLLO_CONSUMER_IDS = ["CMG-11", "CMG-113", "CMG-311", "CMG-412", "CMG-1212", "CMG-211", "CMG-3013", "CMG-3111", "CMG-1141", "CMG-5609", "CMG-1110"];

type RecordEntry = { id: string; kind: "menuItem" | "ingredient"; value: JsonObject; path: string };

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sourceFor(value: JsonObject): JsonObject | undefined {
  return isObject(value.source) ? value.source : undefined;
}

function menuTraceFor(value: JsonObject): JsonObject | undefined {
  const source = sourceFor(value);
  return source && isObject(source.menu) ? source.menu : undefined;
}

function nutritionTraceFor(value: JsonObject): JsonObject | undefined {
  const source = sourceFor(value);
  return source && isObject(source.nutrition) ? source.nutrition : undefined;
}

function nutritionFor(value: JsonObject): JsonObject | undefined {
  return isObject(value.nutrition) ? value.nutrition : undefined;
}

function variantsFor(value: JsonObject): JsonObject[] {
  return objectArray(value.variants) ?? [];
}

function approximatelyEqual(a: number | undefined, b: number | undefined, tolerance = 0.001): boolean {
  return a !== undefined && b !== undefined && Math.abs(a - b) <= tolerance;
}

function scaledNutritionMatches(actual: JsonObject, source: JsonObject, factor: number): boolean {
  for (const field of [...CORE_NUTRITION_FIELDS, ...OPTIONAL_NUTRITION_FIELDS]) {
    const sourceValue = numberValue(source[field]);
    const actualValue = numberValue(actual[field]);
    if (sourceValue === undefined) {
      if (actualValue !== undefined) return false;
    } else if (!approximatelyEqual(actualValue, Number((sourceValue * factor).toFixed(3)))) {
      return false;
    }
  }
  return true;
}

function nutritionMatches(actual: JsonObject | undefined, expected: JsonObject, tolerance = 0.001): boolean {
  if (!actual) return false;
  return [...CORE_NUTRITION_FIELDS, ...OPTIONAL_NUTRITION_FIELDS].every((field) => {
    const expectedValue = numberValue(expected[field]);
    const actualValue = numberValue(actual[field]);
    return expectedValue === undefined ? actualValue === undefined : approximatelyEqual(actualValue, expectedValue, tolerance);
  });
}

function nutritionContainsExpected(actual: JsonObject | undefined, expected: JsonObject, tolerance = 0.001): boolean {
  if (!actual) return false;
  return [...CORE_NUTRITION_FIELDS, ...OPTIONAL_NUTRITION_FIELDS].every((field) => {
    const expectedValue = numberValue(expected[field]);
    return expectedValue === undefined || approximatelyEqual(numberValue(actual[field]), expectedValue, tolerance);
  });
}

function rawNutritionFromPdf(row: JsonObject): JsonObject | undefined {
  const field = (name: string): number | undefined => {
    const value = isObject(row[name]) ? row[name].value : undefined;
    return value === null ? undefined : numberValue(value);
  };
  const calories = field("calories");
  if (calories === undefined) return undefined;
  const nutrition: JsonObject = {
    calories,
    protein: field("protein") ?? 0,
    carbs: field("carbohydrates") ?? 0,
    totalFat: field("totalFat") ?? 0,
  };
  for (const [sourceName, targetName] of [
    ["saturatedFat", "satFat"],
    ["transFat", "transFat"],
    ["cholesterol", "cholesterol"],
    ["sodium", "sodium"],
    ["dietaryFiber", "fiber"],
    ["sugar", "sugars"],
  ] as const) {
    const value = field(sourceName);
    if (value !== undefined) nutrition[targetName] = value;
  }
  return nutrition;
}

function rawLiveNutrition(item: JsonObject | undefined): JsonObject | undefined {
  const source = item && isObject(item.nutrition) ? item.nutrition : undefined;
  if (!source) return undefined;
  const mapping = { calories: "tcal", protein: "prot", carbs: "carb", totalFat: "tfat", satFat: "satu", transFat: "tran", sodium: "sodi", fiber: "fibe", sugars: "suga" } as const;
  const result: JsonObject = {};
  for (const [target, raw] of Object.entries(mapping)) {
    const value = numberValue(source[raw]);
    if (value === undefined) return undefined;
    result[target] = value;
  }
  return result;
}

async function main(): Promise<void> {
  const context = createValidationContext<CheckName>(CHECK_NAMES);
  const [restaurantValue, unresolvedValue, calculatorValue, liveValue, pdfValue, onlineMealsValue, decisions] = await Promise.all([
    parseJsonFile(RESTAURANT_PATH, "Chipotle restaurant.json", context, "structure"),
    parseJsonFile(UNRESOLVED_PATH, "Chipotle unresolved.json", context, "structure"),
    parseJsonFile(CALCULATOR_PATH, "Chipotle calculator-menu.json", context, "structure"),
    parseJsonFile(LIVE_NUTRITION_PATH, "Chipotle menu-metadata-nutrition.json", context, "structure"),
    parseJsonFile(PDF_NUTRITION_PATH, "Chipotle nutrition.json", context, "structure"),
    parseJsonFile(ONLINE_MEALS_PATH, "Chipotle online-meals.json", context, "structure"),
    readFile(DECISIONS_PATH, "utf8").catch(() => ""),
  ]);

  const restaurant = isObject(restaurantValue) ? restaurantValue : {};
  const unresolved = isObject(unresolvedValue) ? unresolvedValue : {};
  const calculator = isObject(calculatorValue) ? calculatorValue : {};
  const liveFile = isObject(liveValue) ? liveValue : {};
  const pdfFile = isObject(pdfValue) ? pdfValue : {};
  const onlineMeals = objectArray(onlineMealsValue) ?? [];

  if (restaurant.hasBuildYourOwn !== true) addFinding(context, "error", "structure", "build_your_own_flag_invalid", "restaurant.hasBuildYourOwn must be true.");
  if (!isObject(restaurant.addonGroups) || !isObject(restaurant.customizationRules) || !isObject(restaurant.builderConfig)) {
    addFinding(context, "error", "structure", "restaurant_schema_section_missing", "addonGroups, customizationRules, and builderConfig must be objects.");
  }
  const importMetadata = isObject(restaurant.importMetadata) ? restaurant.importMetadata : undefined;
  if (!importMetadata || !isObject(importMetadata.sources) || numberValue(importMetadata.restaurantId) !== 469) {
    addFinding(context, "error", "structure", "import_metadata_invalid", "restaurant.importMetadata must identify restaurant 469 and its source files.");
  }
  const runtimeIntegration = isObject(restaurant.runtimeIntegration) ? restaurant.runtimeIntegration : undefined;
  if (runtimeIntegration?.status !== "prepared_not_promoted") {
    addFinding(context, "error", "visibility", "runtime_status_invalid", "Chipotle must remain prepared_not_promoted until runtime wiring is explicitly approved.");
  }

  const menuItems = requireObjectArray(restaurant.items, "restaurant.items", context, "structure");
  const ingredients = requireObjectArray(restaurant.ingredients, "restaurant.ingredients", context, "structure");
  const unresolvedRecords = requireObjectArray(unresolved.records, "unresolved.records", context, "structure");
  const entries: RecordEntry[] = [
    ...menuItems.map((value, index) => ({ id: nonEmptyString(value.id) ?? `missing-item-${index}`, kind: "menuItem" as const, value, path: `restaurant.items[${index}]` })),
    ...ingredients.map((value, index) => ({ id: nonEmptyString(value.id) ?? `missing-ingredient-${index}`, kind: "ingredient" as const, value, path: `restaurant.ingredients[${index}]` })),
  ];
  const entriesById = new Map<string, RecordEntry>();
  const variantIds = new Set<string>();
  let variantCount = 0;
  let nutritionUnitCount = 0;
  let provenanceUnitCount = 0;
  let nutritionCoveredRecords = 0;

  for (const entry of entries) {
    const { id, kind, value, path } = entry;
    if (!nonEmptyString(value.id)) addFinding(context, "error", "structure", "record_id_missing", `${path}.id must be non-empty.`, { path: `${path}.id` });
    if (entriesById.has(id)) addFinding(context, "error", "structure", "duplicate_logical_id", `${id} is duplicated.`, { recordIds: [id] });
    else entriesById.set(id, entry);
    if (!nonEmptyString(value.name)) addFinding(context, "error", "structure", "record_name_missing", `${id} has no name.`, { recordIds: [id] });
    requireStringArray(value.categories, `${path}.categories`, context, "structure", false);
    if (kind === "menuItem") {
      if (!VALID_SERVING_TYPES.has(nonEmptyString(value.servingType) ?? "")) addFinding(context, "error", "structure", "serving_type_invalid", `${id} has an invalid servingType.`, { recordIds: [id] });
      if (numberValue(value.defaultOrder) === undefined) addFinding(context, "error", "structure", "default_order_invalid", `${id}.defaultOrder must be finite.`, { recordIds: [id] });
    } else if ((numberValue(value.maxQuantity) ?? 0) <= 0) {
      addFinding(context, "error", "structure", "ingredient_quantity_invalid", `${id}.maxQuantity must be positive.`, { recordIds: [id] });
    }

    const menuTrace = menuTraceFor(value);
    const sourceIds = menuTrace ? requireStringArray(menuTrace.itemIds, `${path}.source.menu.itemIds`, context, "provenance", false) : [];
    if (!menuTrace || sourceFor(value)?.provider !== "Chipotle" || numberValue(sourceFor(value)?.restaurantId) !== 469) {
      addFinding(context, "error", "provenance", "source_trace_invalid", `${id} must trace to Chipotle restaurant 469.`, { recordIds: [id] });
    }
    if (new Set(sourceIds).size !== sourceIds.length) addFinding(context, "error", "provenance", "duplicate_source_id_in_trace", `${id} repeats source item IDs.`, { recordIds: [id] });

    const role = nonEmptyString(menuTrace?.role);
    const topNutrition = nutritionFor(value);
    const variants = variantsFor(value);
    if (topNutrition) {
      validateGeneratedNutrition(topNutrition, `${path}.nutrition`, id, value, context);
      nutritionUnitCount += 1;
      if (role === "structural" || hasValidNutritionTrace(value, id, context)) provenanceUnitCount += 1;
    }
    let variantsWithNutrition = 0;
    for (const [variantIndex, variant] of variants.entries()) {
      variantCount += 1;
      const variantId = nonEmptyString(variant.id);
      if (!variantId || variantIds.has(variantId) || entriesById.has(variantId)) {
        addFinding(context, "error", "structure", "variant_id_invalid_or_duplicate", `${id} has a missing or duplicate variant ID.`, { recordIds: [id], path: `${path}.variants[${variantIndex}].id` });
      } else variantIds.add(variantId);
      if (!nonEmptyString(variant.label)) addFinding(context, "error", "structure", "variant_label_missing", `${variantId ?? id} has no label.`, { recordIds: [id] });
      requireStringArray(variant.categories, `${path}.variants[${variantIndex}].categories`, context, "structure");
      const variantNutrition = nutritionFor(variant);
      if (!variantNutrition) {
        addFinding(context, "error", "nutrition", "variant_nutrition_missing", `${variantId ?? id} has no nutrition.`, { recordIds: [variantId ?? id] });
      } else {
        variantsWithNutrition += 1;
        nutritionUnitCount += 1;
        validateGeneratedNutrition(variantNutrition, `${path}.variants[${variantIndex}].nutrition`, variantId ?? id, variant, context);
        if (hasValidNutritionTrace(variant, variantId ?? id, context)) provenanceUnitCount += 1;
      }
    }
    const defaultVariantId = nonEmptyString(value.defaultVariantId);
    if (variants.length > 0 && (!defaultVariantId || !variants.some((variant) => variant.id === defaultVariantId))) {
      addFinding(context, "error", "relationships", "default_variant_reference_invalid", `${id} has variants but no valid defaultVariantId.`, { recordIds: [id] });
    }
    if (topNutrition || (variants.length > 0 && variantsWithNutrition === variants.length) || role === "structural") nutritionCoveredRecords += 1;
    else addFinding(context, "error", "nutrition", "supported_record_nutrition_missing", `${id} has neither full nutrition nor fully nutrition-bearing variants.`, { recordIds: [id] });
  }

  setCheckDetails(context, "structure", { menuItems: menuItems.length, ingredients: ingredients.length, totalRecords: entries.length, variants: variantCount, uniqueLogicalIds: entriesById.size });
  setCheckDetails(context, "nutrition", { coveredRecords: nutritionCoveredRecords, totalRecords: entries.length, coveragePercent: Number((nutritionCoveredRecords / Math.max(entries.length, 1) * 100).toFixed(2)), nutritionUnits: nutritionUnitCount });
  setCheckDetails(context, "provenance", { nutritionUnits: nutritionUnitCount, tracedNutritionUnits: provenanceUnitCount, coveragePercent: Number((provenanceUnitCount / Math.max(nutritionUnitCount, 1) * 100).toFixed(2)) });

  validateReferences(restaurant, entriesById, context);
  validateActiveMenu(calculator, onlineMeals, entries, context);
  validateBuildContainers(calculator, entriesById, restaurant, context);
  validateSpecialCases(entriesById, decisions, context);
  validateFountains(entriesById, pdfFile, context);
  validateSidesAndDuplicates(calculator, liveFile, entries, context);
  validateKids(entriesById, liveFile, context);
  validateVisibility(entries, context);
  validateUnresolved(unresolvedRecords, context);

  addFinding(context, "info", "fountain_drinks", "fountain_portfolio_not_enumerated_by_ordering_source", "The generic fountain ordering records do not enumerate dispenser flavors; generated variants intentionally cover every approved official PDF candidate, including both beverage portfolios.");
  addFinding(context, "info", "fountain_drinks", "derived_fountain_rounding_review", "Kids 16oz flavor nutrition preserves exact proportional scaling to three decimals. Confirm the eventual UI display-rounding policy before runtime promotion.");

  const report = {
    restaurant: "Chipotle",
    validatedAt: localDate(),
    inputs: {
      restaurant: "data/generated/chipotle/restaurant.json",
      unresolved: "data/generated/chipotle/unresolved.json",
      calculatorMenu: "data/raw/chipotle/calculator-menu.json",
      liveNutrition: "data/raw/chipotle/menu-metadata-nutrition.json",
      pdfNutrition: "data/raw/chipotle/nutrition.json",
      onlineMeals: "data/raw/chipotle/online-meals.json",
      decisions: "data/review/chipotle/import-decisions.md",
    },
    valid: context.errors.length === 0,
    summary: {
      records: entries.length,
      menuItems: menuItems.length,
      ingredients: ingredients.length,
      variants: variantCount,
      nutritionCoveragePercent: context.checks.nutrition.details.coveragePercent,
      provenanceCoveragePercent: context.checks.provenance.details.coveragePercent,
      errors: context.errors.length,
      warnings: context.warnings.length,
      informational: context.info.length,
      humanReviewRecommendations: context.info.length,
      errorTypes: findingTypeCounts(context.errors),
      warningTypes: findingTypeCounts(context.warnings),
      informationalTypes: findingTypeCounts(context.info),
    },
    checks: context.checks,
    errors: context.errors,
    warnings: context.warnings,
    informational: context.info,
    humanReviewRecommendations: context.info.map((finding) => finding.message),
  };
  await writeAtomically(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: "data/validation/chipotle/report.json", valid: report.valid, summary: report.summary }, null, 2));
  if (!report.valid) process.exitCode = 1;

  function validateGeneratedNutrition(
    nutrition: JsonObject,
    path: string,
    id: string,
    record: JsonObject,
    validationContext: typeof context,
  ): void {
    for (const field of CORE_NUTRITION_FIELDS) {
      const value = numberValue(nutrition[field]);
      if (value === undefined || value < 0) addFinding(validationContext, "error", "nutrition", value === undefined ? "nutrition_value_invalid" : "negative_nutrition", `${path}.${field} must be finite and non-negative.`, { recordIds: [id], path: `${path}.${field}` });
    }
    for (const field of OPTIONAL_NUTRITION_FIELDS) {
      if (!(field in nutrition)) continue;
      const value = numberValue(nutrition[field]);
      if (value === undefined || value < 0) addFinding(validationContext, "error", "nutrition", value === undefined ? "nutrition_value_invalid" : "negative_nutrition", `${path}.${field} must be finite and non-negative.`, { recordIds: [id], path: `${path}.${field}` });
    }
    const calories = numberValue(nutrition.calories) ?? 0;
    const coreMacros = [numberValue(nutrition.protein) ?? 0, numberValue(nutrition.carbs) ?? 0, numberValue(nutrition.totalFat) ?? 0];
    const sodium = numberValue(nutrition.sodium) ?? 0;
    if (calories > 0 && coreMacros.every((value) => value === 0) && sodium === 0) addFinding(validationContext, "error", "nutrition", "placeholder_panel_attached", `${id} attaches a nonzero-calorie all-zero macro panel.`, { recordIds: [id] });
    if (calories === 0 && coreMacros.some((value) => value > 0)) addFinding(validationContext, "error", "nutrition", "zero_calorie_macro_conflict", `${id} has zero calories with positive macros.`, { recordIds: [id] });
    const trace = nutritionTraceFor(record);
    if (trace?.liveValidation === "rejected" && trace.method === "live_full_nutrition") addFinding(validationContext, "error", "nutrition", "rejected_live_panel_attached", `${id} presents a rejected live panel as direct full nutrition.`, { recordIds: [id] });
  }

  function hasValidNutritionTrace(record: JsonObject, id: string, validationContext: typeof context): boolean {
    const trace = nutritionTraceFor(record);
    const method = nonEmptyString(trace?.method);
    if (!trace || !method || !VALID_NUTRITION_METHODS.has(method)) {
      addFinding(validationContext, "error", "provenance", "nutrition_trace_missing_or_invalid", `${id} has nutrition without a recognized source method.`, { recordIds: [id] });
      return false;
    }
    if (DERIVED_METHODS.has(method) && !nonEmptyString(trace.note)) {
      addFinding(validationContext, "error", "provenance", "derived_nutrition_note_missing", `${id} has derived nutrition without a derivation note.`, { recordIds: [id] });
      return false;
    }
    if (method === "live_full_nutrition" && trace.liveValidation !== "accepted") {
      addFinding(validationContext, "error", "provenance", "live_nutrition_acceptance_missing", `${id} claims direct live nutrition without accepted validation provenance.`, { recordIds: [id] });
      return false;
    }
    return true;
  }
}

function validateReferences(
  restaurant: JsonObject,
  entriesById: Map<string, RecordEntry>,
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const ingredientIds = new Set([...entriesById.values()].filter((entry) => entry.kind === "ingredient").map((entry) => entry.id));
  let references = 0;
  for (const entry of entriesById.values()) {
    if (entry.kind !== "menuItem") continue;
    const direct = entry.value.ingredients === undefined ? [] : requireStringArray(entry.value.ingredients, `${entry.path}.ingredients`, context, "relationships");
    for (const ingredientEntry of direct) {
      const id = ingredientEntry.split(":", 1)[0];
      references += 1;
      if (!entriesById.has(id)) addFinding(context, "error", "relationships", "broken_ingredient_reference", `${entry.id} references missing composition record ${id}.`, { recordIds: [entry.id, id] });
    }
    const customization = isObject(entry.value.customization) ? entry.value.customization : undefined;
    for (const category of objectArray(customization?.ingredientCategories) ?? []) {
      const ids = requireStringArray(category.ingredients, `${entry.path}.customization.ingredients`, context, "relationships", false);
      if (!nonEmptyString(category.name) || typeof category.allowNone !== "boolean") addFinding(context, "error", "relationships", "customization_category_invalid", `${entry.id} has a malformed customization category.`, { recordIds: [entry.id] });
      if (new Set(ids).size !== ids.length) addFinding(context, "error", "relationships", "duplicate_customization_reference", `${entry.id} repeats an ingredient in a customization category.`, { recordIds: [entry.id] });
      for (const id of ids) {
        references += 1;
        if (!ingredientIds.has(id)) addFinding(context, "error", "relationships", "broken_customization_reference", `${entry.id} references missing customization ingredient ${id}.`, { recordIds: [entry.id, id] });
      }
    }
  }
  const builder = isObject(restaurant.builderConfig) ? restaurant.builderConfig : {};
  const entreeOptions = isObject(builder.entreeOptions) ? builder.entreeOptions : {};
  for (const [key, value] of Object.entries(entreeOptions)) {
    if (!isObject(value)) continue;
    const id = nonEmptyString(value.id);
    if (!id || !entriesById.has(id)) addFinding(context, "error", "relationships", "broken_builder_entree_reference", `builderConfig.entreeOptions.${key} references a missing item.`, { recordIds: id ? [id] : undefined });
    for (const ingredientId of stringArray(value.includedIngredientIds) ?? []) if (!ingredientIds.has(ingredientId)) addFinding(context, "error", "relationships", "broken_builder_default_reference", `${key} references missing included ingredient ${ingredientId}.`, { recordIds: [ingredientId] });
  }
  setCheckDetails(context, "relationships", { ingredientReferences: references, builderEntreeOptions: Object.keys(entreeOptions).length });
}

function validateActiveMenu(
  calculator: JsonObject,
  onlineMeals: JsonObject[],
  entries: RecordEntry[],
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const calculatorIds = new Set<string>();
  for (const section of ["entrees", "sides", "drinks", "nonFoodItems"] as const) {
    for (const record of objectArray(calculator[section]) ?? []) {
      const id = nonEmptyString(record.itemId);
      if (id) calculatorIds.add(id);
      for (const content of objectArray(record.contents) ?? []) {
        const contentId = nonEmptyString(content.itemId);
        if (contentId) calculatorIds.add(contentId);
      }
    }
  }
  const onlineIds = new Set(onlineMeals.flatMap((meal) => nonEmptyString(meal.mealId) ? [nonEmptyString(meal.mealId)!] : []));
  const generatedSourceIds = new Set<string>();
  for (const entry of entries) {
    const objects = [entry.value, ...variantsFor(entry.value)];
    for (const object of objects) {
      for (const sourceId of stringArray(menuTraceFor(object)?.itemIds) ?? []) {
        generatedSourceIds.add(sourceId);
        if (!calculatorIds.has(sourceId) && !onlineIds.has(sourceId)) addFinding(context, "error", "active_menu", "inactive_or_metadata_only_source_leak", `${entry.id} traces to ${sourceId}, which is absent from the restaurant-469 calculator and online-meal source universes.`, { recordIds: [entry.id, sourceId] });
      }
    }
  }
  const generatedText = JSON.stringify(entries.map((entry) => entry.value));
  if (/Chipotle Honey Chicken/i.test(generatedText)) addFinding(context, "error", "active_menu", "inactive_honey_chicken_present", "Inactive Chipotle Honey Chicken appears in generated consumer data.");
  const missingPollo = EXPECTED_POLLO_CONSUMER_IDS.filter((id) => !generatedSourceIds.has(id));
  if (missingPollo.length > 0) addFinding(context, "error", "active_menu", "pollo_context_missing", `Supported Pollo Asado contexts are missing: ${missingPollo.join(", ")}.`, { recordIds: missingPollo });
  setCheckDetails(context, "active_menu", { calculatorSourceIds: calculatorIds.size, onlineMealIds: onlineIds.size, generatedSourceIds: generatedSourceIds.size, polloConsumerContexts: EXPECTED_POLLO_CONSUMER_IDS.length, missingPolloContexts: missingPollo });
}

function validateBuildContainers(
  calculator: JsonObject,
  entriesById: Map<string, RecordEntry>,
  restaurant: JsonObject,
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const typeById: Record<string, string> = {
    "chipotle-burrito": "Burrito", "chipotle-bowl": "Bowl", "chipotle-salad": "Salad", "chipotle-taco": "Tacos", "chipotle-tacos-3": "Tacos", "chipotle-quesadilla": "Quesadilla", "chipotle-kids-build-your-own": "KidsBYO", "chipotle-kids-quesadilla": "KidsQuesadilla",
  };
  const groupLabel = (name: string, itemType: string): string => {
    if (name === "TortillaContentGroup" && itemType === "Tacos") return "Tortilla";
    return ({ RiceContentGroup: "Rice", BeansContentGroup: "Beans", DipContentGroup: "Dips", FillingsContentGroup: "Fillings", AddonContentGroup: "Addons", SideContentGroup: "Kids Side", DrinkContentGroup: "Kids Drink", TortillaContentGroup: "Tortillas", ToppingsContentGroup: "Toppings", PremiumContentGroup: "Addons", OptionContentGroup: "Toppings" })[name] ?? name;
  };
  const rules = isObject(restaurant.customizationRules) && isObject(restaurant.customizationRules.ingredientCategories) ? restaurant.customizationRules.ingredientCategories : {};
  let validated = 0;
  for (const id of BUILD_CONTAINER_IDS) {
    const entry = entriesById.get(id);
    if (!entry) {
      addFinding(context, "error", "build_containers", "build_container_missing", `${id} is missing.`, { recordIds: [id] });
      continue;
    }
    validated += 1;
    if (menuTraceFor(entry.value)?.role !== "build_container" || menuTraceFor(entry.value)?.itemType !== typeById[id]) addFinding(context, "error", "build_containers", "build_container_trace_invalid", `${id} has an invalid build-container source trace.`, { recordIds: [id] });
    const categories = objectArray(isObject(entry.value.customization) ? entry.value.customization.ingredientCategories : undefined) ?? [];
    const categoryByName = new Map(categories.map((category) => [nonEmptyString(category.name) ?? "", category]));
    if (!categoryByName.has("Protein")) addFinding(context, "error", "build_containers", "protein_group_missing", `${id} has no Protein group.`, { recordIds: [id] });
    const rawEntrees = (objectArray(calculator.entrees) ?? []).filter((entree) => entree.itemType === typeById[id] && (typeById[id] !== "Tacos" || (id === "chipotle-tacos-3") === /\(3\)$/.test(nonEmptyString(entree.itemName) ?? "")));
    const representative = rawEntrees[0];
    for (const rawGroup of objectArray(representative?.contentGroups) ?? []) {
      const rawName = nonEmptyString(rawGroup.contentGroupName) ?? "";
      const label = groupLabel(rawName, typeById[id]);
      const generated = categoryByName.get(label);
      if (!generated) {
        addFinding(context, "error", "build_containers", "required_source_group_missing", `${id} omits source group ${rawName}/${label}.`, { recordIds: [id] });
        continue;
      }
      const contents = objectArray(representative?.contents) ?? [];
      const hasExplicitNull = contents.some((content) => content.contentGroupName === rawName && /^no /i.test(nonEmptyString(content.itemName) ?? ""));
      const expectedAllowNone = numberValue(rawGroup.minQuantity) === 0 || hasExplicitNull;
      if (generated.allowNone !== expectedAllowNone) addFinding(context, "error", "build_containers", "group_allow_none_mismatch", `${id} ${label}.allowNone=${String(generated.allowNone)} does not reflect source minQuantity/null-choice semantics (${expectedAllowNone}).`, { recordIds: [id] });
      const categoryId = nonEmptyString(generated.id);
      const rule = categoryId && isObject(rules[categoryId]) ? rules[categoryId] : undefined;
      const expectedMax = numberValue(rawGroup.maxQuantity) === -1 ? 999 : numberValue(rawGroup.maxQuantity);
      if (!rule || numberValue(rule.maxQuantity) !== expectedMax) addFinding(context, "error", "build_containers", "group_max_rule_mismatch", `${id} ${label} lacks the source-backed maxQuantity ${expectedMax}.`, { recordIds: [id] });
    }
    const defaultSourceIds = (objectArray(representative?.contents) ?? []).filter((content) => content.defaultContent === true).flatMap((content) => nonEmptyString(content.itemId) ? [nonEmptyString(content.itemId)!] : []);
    const generatedIngredientIds = stringArray(entry.value.ingredients) ?? [];
    for (const sourceId of defaultSourceIds) {
      if (![...entriesById.values()].some((candidate) => candidate.kind === "ingredient" && generatedIngredientIds.includes(candidate.id) && (stringArray(menuTraceFor(candidate.value)?.itemIds) ?? []).includes(sourceId))) addFinding(context, "error", "build_containers", "default_component_missing", `${id} omits default source component ${sourceId}.`, { recordIds: [id, sourceId] });
    }
    const trace = nutritionTraceFor(entry.value);
    if (!nutritionFor(entry.value) || trace?.method !== "composed_from_components") addFinding(context, "error", "build_containers", "container_nutrition_not_composed", `${id} must expose documented composed default/base nutrition, not an untraced protein-only entree value.`, { recordIds: [id] });
  }
  setCheckDetails(context, "build_containers", { expected: BUILD_CONTAINER_IDS.length, validated });
}

function validateSpecialCases(
  entriesById: Map<string, RecordEntry>,
  decisions: string,
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  for (const required of ["## 3. Salad base", "## 4. Adult Quesadilla base", "## 5. Taco tortillas", "## 6. Adult tortilla", "## 7. Kids Quesadilla", "## 8. Half Pollo", "## 9. Side of Cilantro", "## 10. Kids 16oz"]) {
    if (!decisions.includes(required)) addFinding(context, "error", "special_cases", "decision_log_entry_missing", `Decision log is missing ${required}.`);
  }
  const nutrition = (id: string): JsonObject | undefined => nutritionFor(entriesById.get(id)?.value ?? {});
  const variant = (id: string, variantId: string): JsonObject | undefined => variantsFor(entriesById.get(id)?.value ?? {}).find((value) => value.id === variantId);
  const expected: Record<string, JsonObject> = {
    "chipotle-burrito": { calories: 500, protein: 40, carbs: 50, totalFat: 16, satFat: 3.5, cholesterol: 125, sodium: 910, fiber: 3, sugars: 0 },
    "chipotle-salad": { calories: 415, protein: 34, carbs: 21, totalFat: 23, satFat: 5.5, sodium: 1175, fiber: 3, sugars: 13 },
    "chipotle-quesadilla": { calories: 830, protein: 58, carbs: 53, totalFat: 40, satFat: 18.5, cholesterol: 215, sodium: 1480, fiber: 3, sugars: 0 },
    "chipotle-kids-quesadilla": { calories: 280, protein: 23, carbs: 14, totalFat: 13.5, satFat: 6.5, cholesterol: 95, sodium: 500, sugars: 0 },
    "chipotle-taco": { calories: 143, protein: 12.7, carbs: 13, totalFat: 5.3, satFat: 1, transFat: 0, sodium: 263.3, fiber: 0, sugars: 0 },
    "chipotle-tacos-3": { calories: 430, protein: 39, carbs: 40, totalFat: 15, satFat: 3.5, transFat: 0, sodium: 790, fiber: 2, sugars: 0 },
  };
  for (const [id, panel] of Object.entries(expected)) if (!nutritionMatches(nutrition(id), panel)) addFinding(context, "error", "special_cases", "approved_container_nutrition_mismatch", `${id} no longer matches its approved default/base composition.`, { recordIds: [id] });
  const coreNames = ["chicken", "steak", "carnitas", "beef-barbacoa", "sofritas"];
  for (const name of coreNames) {
    const parentId = `chipotle-protein-${name}`;
    const normal = nutritionFor(variant(parentId, `${parentId}-normal`) ?? {});
    const half = nutritionFor(variant(parentId, `${parentId}-half`) ?? {});
    const extra = nutritionFor(variant(parentId, `${parentId}-extra`) ?? {});
    if (!normal || !half || !extra || !scaledNutritionMatches(half, normal, 0.5) || !scaledNutritionMatches(extra, normal, 2)) addFinding(context, "error", "special_cases", "core_portion_scaling_mismatch", `${parentId} Half/Extra do not follow approved scaling.`, { recordIds: [parentId] });
  }
  const polloParent = "chipotle-protein-pollo-asado";
  const polloNormal = nutritionFor(variant(polloParent, `${polloParent}-normal`) ?? {});
  const polloHalf = variant(polloParent, `${polloParent}-half`);
  const polloExtra = variant(polloParent, `${polloParent}-extra`);
  if (!polloNormal || !polloHalf || !scaledNutritionMatches(nutritionFor(polloHalf) ?? {}, polloNormal, 0.5) || nutritionTraceFor(polloHalf)?.method !== "approved_portion_scaling") addFinding(context, "error", "special_cases", "half_pollo_rule_invalid", "CMG-5609 Half Pollo Asado does not preserve its approved record-specific derivation.", { recordIds: ["CMG-5609"] });
  if (numberValue(nutritionFor(polloExtra ?? {})?.calories) !== 200 || nutritionTraceFor(polloExtra ?? {})?.method !== "live_full_nutrition") addFinding(context, "error", "special_cases", "extra_pollo_direct_value_invalid", "Extra Pollo Asado must preserve its direct 200cal live value.", { recordIds: ["CMG-1110"] });
  const sauce = entriesById.get("chipotle-cmg-5413")?.value;
  if (!nutritionMatches(nutritionFor(sauce ?? {}), { calories: 160, protein: 4, carbs: 6, totalFat: 12, satFat: 9, transFat: 0, sodium: 600, fiber: 2, sugars: 4 }) || nutritionTraceFor(sauce ?? {})?.method !== "approved_equivalent_official_record") addFinding(context, "error", "special_cases", "cilantro_lime_equivalent_invalid", "CMG-5413 does not use the approved sane CMG-5414-equivalent panel.", { recordIds: ["CMG-5413"] });
  for (const id of ["chipotle-protein-veggie", "chipotle-protein-veggie-taco", "chipotle-protein-veggie-tacos-3"]) {
    const value = entriesById.get(id)?.value;
    const panels = nutritionFor(value ?? {}) ? [value!] : variantsFor(value ?? {});
    if (panels.some((panel) => numberValue(nutritionFor(panel)?.calories) !== 0 || nutritionTraceFor(panel)?.method !== "structural_zero_choice") && nutritionTraceFor(value ?? {})?.method !== "structural_zero_choice") addFinding(context, "error", "special_cases", "structural_veggie_invalid", `${id} is not a structural zero-protein choice.`, { recordIds: [id] });
  }
  setCheckDetails(context, "special_cases", { approvedContainerCompositions: Object.keys(expected).length, coreScaledProteinFamilies: coreNames.length, halfPollo: "validated", extraPollo: "direct_live_validated", cilantroLime5413: "equivalent_official_validated", veggie: "structural_validated" });
}

function validateFountains(
  entriesById: Map<string, RecordEntry>,
  pdfFile: JsonObject,
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const pdfRows = objectArray(pdfFile.records) ?? [];
  const byName = new Map<string, JsonObject[]>();
  for (const row of pdfRows.filter((row) => row.section === "adult")) {
    const name = nonEmptyString(row.name);
    if (name) byName.set(name, [...(byName.get(name) ?? []), row]);
  }
  const definitions = [
    { id: "chipotle-fountain-22-fl-oz", sourceId: "CMG-2001", size: 22, kind: "menuItem" },
    { id: "chipotle-fountain-32-fl-oz", sourceId: "CMG-2002", size: 32, kind: "menuItem" },
    { id: "chipotle-cmg-5551", sourceId: "CMG-5551", size: 16, kind: "ingredient" },
  ];
  const labelSets: string[][] = [];
  let validatedVariants = 0;
  for (const def of definitions) {
    const entry = entriesById.get(def.id);
    if (!entry || entry.kind !== def.kind) {
      addFinding(context, "error", "fountain_drinks", "fountain_container_missing", `${def.id} is missing or has the wrong record kind.`, { recordIds: [def.id] });
      continue;
    }
    if (!(stringArray(menuTraceFor(entry.value)?.itemIds) ?? []).includes(def.sourceId)) addFinding(context, "error", "fountain_drinks", "fountain_container_source_invalid", `${def.id} does not preserve generic source ${def.sourceId}.`, { recordIds: [def.id] });
    const variants = variantsFor(entry.value);
    labelSets.push(variants.flatMap((variant) => nonEmptyString(variant.label) ? [nonEmptyString(variant.label)!] : []).sort());
    for (const variant of variants) {
      const label = nonEmptyString(variant.label) ?? "";
      const rows = byName.get(label) ?? [];
      const sourceRow = def.size === 16 ? rows.find((row) => isObject(row.portion) && row.portion.amount === 22) ?? rows.find((row) => isObject(row.portion) && row.portion.amount === 32) : rows.find((row) => isObject(row.portion) && row.portion.amount === def.size);
      const sourcePanel = sourceRow ? rawNutritionFromPdf(sourceRow) : undefined;
      const actualPanel = nutritionFor(variant);
      const sourceSize = sourceRow && isObject(sourceRow.portion) ? numberValue(sourceRow.portion.amount) : undefined;
      if (!sourcePanel || !actualPanel || !sourceSize || !scaledNutritionMatches(actualPanel, sourcePanel, def.size / sourceSize)) addFinding(context, "error", "fountain_drinks", "fountain_flavor_nutrition_mismatch", `${def.id}/${label} does not match its official PDF flavor-size derivation.`, { recordIds: [def.id] });
      const sourceIds = stringArray(menuTraceFor(variant)?.itemIds) ?? [];
      if (sourceIds.length !== 1 || sourceIds[0] !== def.sourceId || sourceIds.some((id) => id !== def.sourceId)) addFinding(context, "error", "fountain_drinks", "invented_or_missing_fountain_source_id", `${def.id}/${label} must retain only generic source ${def.sourceId}.`, { recordIds: [def.id] });
      if (def.size === 16) {
        const note = nonEmptyString(nutritionTraceFor(variant)?.note) ?? "";
        if (!note.includes(`16/${sourceSize}`) || nutritionTraceFor(variant)?.liveValidation !== "rejected") addFinding(context, "error", "fountain_drinks", "kids_fountain_provenance_invalid", `${label} lacks generic parent, source size, factor, or placeholder-rejection provenance.`, { recordIds: [def.id] });
      }
      validatedVariants += 1;
    }
  }
  if (labelSets.length === 3 && (JSON.stringify(labelSets[0]) !== JSON.stringify(labelSets[1]) || JSON.stringify(labelSets[0]) !== JSON.stringify(labelSets[2]))) addFinding(context, "error", "fountain_drinks", "fountain_flavor_sets_differ", "16oz, 22oz, and 32oz fountain flavor sets differ unexpectedly.");
  setCheckDetails(context, "fountain_drinks", { containers: definitions.length, flavorVariants: validatedVariants, kids16ozVariants: variantsFor(entriesById.get("chipotle-cmg-5551")?.value ?? {}).length, unresolvedFlavors: context.errors.filter((finding) => finding.code === "fountain_flavor_nutrition_mismatch").length });
}

function validateSidesAndDuplicates(
  calculator: JsonObject,
  liveFile: JsonObject,
  entries: RecordEntry[],
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const findBySource = (sourceId: string): RecordEntry[] => entries.filter((entry) => (stringArray(menuTraceFor(entry.value)?.itemIds) ?? []).includes(sourceId));
  for (const id of COMBO_IDS) {
    const matches = findBySource(id);
    const panel = nutritionFor(matches[0]?.value ?? {});
    if (matches.length !== 1 || nutritionTraceFor(matches[0]?.value ?? {})?.method !== "composed_from_components" || !panel || (numberValue(panel.calories) ?? 0) <= 0 || [panel.protein, panel.carbs, panel.totalFat, panel.sodium].every((value) => numberValue(value) === 0)) addFinding(context, "error", "sides_combinations", "chips_combo_invalid", `${id} is not one component-composed, non-placeholder product.`, { recordIds: [id] });
  }
  for (const id of ["CMG-5362", "CMG-5363"]) {
    const entry = findBySource(id)[0];
    if (!entry || nutritionTraceFor(entry.value)?.method !== "live_full_nutrition" || !nutritionFor(entry.value)) addFinding(context, "error", "sides_combinations", "chili_lime_chips_direct_invalid", `${id} must retain sane direct live nutrition.`, { recordIds: [id] });
  }
  const liveItems = isObject(liveFile.items) ? liveFile.items : {};
  for (const group of LARGE_SALSA_GROUPS) {
    const matches = entries.filter((entry) => group.some((id) => (stringArray(menuTraceFor(entry.value)?.itemIds) ?? []).includes(id)));
    if (matches.length !== 1 || !group.every((id) => (stringArray(menuTraceFor(matches[0]?.value ?? {})?.itemIds) ?? []).includes(id)) || nutritionTraceFor(matches[0]?.value ?? {})?.method !== "approved_portion_scaling") addFinding(context, "error", "duplicate_identities", "large_salsa_canonicalization_invalid", `Large salsa identities ${group.join(", ")} were not canonicalized with approved scaling.`, { recordIds: [...group] });
    const selected = nonEmptyString(nutritionTraceFor(matches[0]?.value ?? {})?.liveItemId);
    const portion = selected && isObject(liveItems[selected]) && isObject(liveItems[selected].portion) ? numberValue(liveItems[selected].portion.value) : undefined;
    if (!selected || (portion ?? 0) <= 0) addFinding(context, "error", "duplicate_identities", "placeholder_duplicate_selected", `${group.join(", ")} did not prefer a real nonzero portion identity.`, { recordIds: [...group] });
  }
  const sideGroups = new Map<string, string[]>();
  for (const side of objectArray(calculator.sides) ?? []) {
    const signature = JSON.stringify([side.itemName, side.itemType, side.unitPrice]);
    const id = nonEmptyString(side.itemId);
    if (id) sideGroups.set(signature, [...(sideGroups.get(signature) ?? []), id]);
  }
  const duplicateGroups = [...sideGroups.values()].filter((ids) => ids.length > 1);
  for (const group of duplicateGroups) {
    const matches = entries.filter((entry) => group.some((id) => (stringArray(menuTraceFor(entry.value)?.itemIds) ?? []).includes(id)));
    if (matches.length !== 1 || !group.every((id) => (stringArray(menuTraceFor(matches[0]?.value ?? {})?.itemIds) ?? []).includes(id))) addFinding(context, "error", "duplicate_identities", "duplicate_source_product_not_canonicalized", `${group.join(", ")} do not map to exactly one user-facing product with all IDs preserved.`, { recordIds: group });
  }
  setCheckDetails(context, "sides_combinations", { chipsDipCombinations: COMBO_IDS.length, directChiliLimeChips: 2 });
  setCheckDetails(context, "duplicate_identities", { duplicateSourceGroups: duplicateGroups.length, largeSalsaGroups: LARGE_SALSA_GROUPS.length });
}

function validateKids(
  entriesById: Map<string, RecordEntry>,
  liveFile: JsonObject,
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const liveItems = isObject(liveFile.items) ? liveFile.items : {};
  const sourceIds = ["CMG-3002", "CMG-3003", "CMG-3004", "CMG-3005", "CMG-3006", "CMG-3013", "CMG-3102", "CMG-3103", "CMG-3104", "CMG-3105", "CMG-3111", "CMG-5401", "CMG-1401", "CMG-1402", "CMG-5552", "CMG-5553", "CMG-5554"];
  const allEntries = [...entriesById.values()];
  let matched = 0;
  for (const sourceId of sourceIds) {
    const entry = allEntries.find((candidate) => {
      const ids = stringArray(menuTraceFor(candidate.value)?.itemIds) ?? [];
      return candidate.kind === "ingredient" && ids.length === 1 && ids[0] === sourceId;
    });
    const live = rawLiveNutrition(isObject(liveItems[sourceId]) ? liveItems[sourceId] : undefined);
    const generated = entry && nutritionFor(entry.value);
    if (!entry || !live || !generated || !nutritionContainsExpected(generated, live)) addFinding(context, "error", "kids", "kids_direct_nutrition_mismatch", `${sourceId} does not preserve its kids-specific direct live nutrition.`, { recordIds: [sourceId] });
    else matched += 1;
  }
  const kidsByoTortillas: Record<string, JsonObject> = {
    "CMG-5403": { calories: 130, protein: 2, carbs: 19, totalFat: 6 },
    "CMG-5404": { calories: 170, protein: 5, carbs: 27, totalFat: 5 },
  };
  for (const [sourceId, expected] of Object.entries(kidsByoTortillas)) {
    const entry = allEntries.find((candidate) => {
      const ids = stringArray(menuTraceFor(candidate.value)?.itemIds) ?? [];
      return candidate.kind === "ingredient" && ids.length === 1 && ids[0] === sourceId;
    });
    const generated = entry && nutritionFor(entry.value);
    if (!entry || !nutritionContainsExpected(generated, expected)) {
      addFinding(context, "error", "kids", "kids_context_nutrition_mismatch", `${sourceId} does not preserve its authoritative two-tortilla Kids BYO panel.`, { recordIds: [sourceId] });
    } else {
      matched += 1;
    }
  }
  const kidsFountain = entriesById.get("chipotle-cmg-5551");
  if (!kidsFountain || variantsFor(kidsFountain.value).length === 0) addFinding(context, "error", "kids", "kids_fountain_variants_missing", "Kids 16oz fountain container has no flavors.", { recordIds: ["CMG-5551"] });
  setCheckDetails(context, "kids", { directKidsSourceRecords: sourceIds.length + Object.keys(kidsByoTortillas).length, matchedDirectKidsRecords: matched, kidsFountainVariants: variantsFor(kidsFountain?.value ?? {}).length });
}

function validateVisibility(
  entries: RecordEntry[],
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  let structural = 0;
  let standalone = 0;
  for (const entry of entries) {
    const role = nonEmptyString(menuTraceFor(entry.value)?.role);
    if (role === "structural") {
      structural += 1;
      const panel = nutritionFor(entry.value);
      if (entry.value.sourceOnly !== true || entry.kind !== "menuItem" || numberValue(panel?.calories) !== 0) addFinding(context, "error", "visibility", "structural_record_visible_or_foodlike", `${entry.id} structural record is not hidden/source-only zero nutrition.`, { recordIds: [entry.id] });
    }
    if (role === "standalone_product") {
      standalone += 1;
      if (entry.value.sourceOnly === true && !(stringArray(entry.value.categories) ?? []).includes("Non-Food")) addFinding(context, "error", "visibility", "standalone_food_hidden", `${entry.id} is an intended standalone food/drink but is sourceOnly.`, { recordIds: [entry.id] });
    }
  }
  setCheckDetails(context, "visibility", { structuralSourceOnlyRecords: structural, standaloneProducts: standalone });
}

function validateUnresolved(
  records: JsonObject[],
  context: ReturnType<typeof createValidationContext<CheckName>>,
): void {
  const categories = { cateringCalculator: 0, onlineBuildYourOwn: 0, proteinCups: 0 };
  for (const record of records) {
    const id = nonEmptyString(record.standardizedRecordId) ?? "unknown";
    const reason = nonEmptyString(record.reason);
    const name = nonEmptyString(record.name) ?? id;
    const sourceIds = stringArray(record.sourceItemIds) ?? [];
    const isCateringCalculator = record.recordType === "catering_entree" && sourceIds.every((sourceId) => sourceId.startsWith("CMG-"));
    const isProteinCup = record.recordType === "preconfigured_meal" && /^High Protein Cup - /i.test(name);
    const isOnlineBuild = record.recordType === "preconfigured_meal" && !isProteinCup && (name.startsWith("Build-Your-Own") || name === "2 Large Chips & 3 Large Sides");
    if (reason !== "unsupported_preconfigured_meal" || (!isCateringCalculator && !isProteinCup && !isOnlineBuild)) {
      addFinding(context, "error", "unresolved", "unexpected_actionable_unresolved", `${id}/${name} is not an approved deferred catering or protein-cup record.`, { recordIds: [id, ...sourceIds] });
      continue;
    }
    if (isCateringCalculator) categories.cateringCalculator += 1;
    else if (isProteinCup) categories.proteinCups += 1;
    else categories.onlineBuildYourOwn += 1;
    addFinding(context, "warning", "unresolved", "expected_deferred_unresolved", `${name} is intentionally deferred and does not block consumer-menu validation.`, { recordIds: [id, ...sourceIds] });
  }
  if (records.length !== 13 || categories.cateringCalculator !== 7 || categories.onlineBuildYourOwn !== 4 || categories.proteinCups !== 2) addFinding(context, "error", "unresolved", "deferred_unresolved_set_changed", `Expected 13 deferred records (7 calculator catering, 4 online BuildYourOwn, 2 protein cups); found ${records.length} (${categories.cateringCalculator}/${categories.onlineBuildYourOwn}/${categories.proteinCups}).`);
  setCheckDetails(context, "unresolved", { total: records.length, reasons: { unsupported_preconfigured_meal: records.filter((record) => record.reason === "unsupported_preconfigured_meal").length }, deferredCategories: categories, actionable: context.errors.filter((finding) => finding.check === "unresolved").length });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
