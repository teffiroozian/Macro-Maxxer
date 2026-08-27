import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { sanitizeDisplayName } from "../lib/display-name";

const RESTAURANT_PATH = resolve("data/generated/chick-fil-a/restaurant.json");
const UNRESOLVED_PATH = resolve("data/generated/chick-fil-a/unresolved.json");
const REPORT_PATH = resolve("data/validation/chick-fil-a/report.json");

const VALID_SERVING_TYPES = new Set([
  "addon",
  "breakfast",
  "combo",
  "dessert",
  "drink",
  "entree",
  "kids",
  "shareable",
  "side",
  "single",
]);
const CORE_NUTRITION_FIELDS = ["calories", "protein", "carbs", "totalFat"];
const OPTIONAL_NUTRITION_FIELDS = [
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
];
const RECOGNIZED_UNRESOLVED_REASONS = new Set([
  "no_nutrition_match",
  "multiple_conflicting_matches",
  "entree_only_nutrition_for_meal_container",
]);

type JsonObject = Record<string, unknown>;
type Severity = "error" | "warning";
type CheckName =
  | "structure"
  | "identity"
  | "categories"
  | "relationships"
  | "combos"
  | "nutrition"
  | "unresolved"
  | "traceability"
  | "schema_limitations";

interface Finding {
  severity: Severity;
  check: CheckName;
  code: string;
  message: string;
  affectedCount?: number;
  recordIds?: string[];
  path?: string;
}

interface RecordInfo {
  id: string;
  kind: "menuItem" | "ingredient";
  value: JsonObject;
  sourceMenu?: JsonObject;
  hasNutrition: boolean;
  hasResolvedNutrition: boolean;
}

interface ValidationContext {
  errors: Finding[];
  warnings: Finding[];
  checks: Record<
    CheckName,
    {
      passed: boolean;
      errors: number;
      warnings: number;
      details: Record<string, unknown>;
    }
  >;
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function objectArray(value: unknown): JsonObject[] | undefined {
  return Array.isArray(value) && value.every(isObject) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : undefined;
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createContext(): ValidationContext {
  const checkNames: CheckName[] = [
    "structure",
    "identity",
    "categories",
    "relationships",
    "combos",
    "nutrition",
    "unresolved",
    "traceability",
    "schema_limitations",
  ];
  return {
    errors: [],
    warnings: [],
    checks: Object.fromEntries(
      checkNames.map((name) => [
        name,
        { passed: true, errors: 0, warnings: 0, details: {} },
      ]),
    ) as ValidationContext["checks"],
  };
}

function addFinding(
  context: ValidationContext,
  severity: Severity,
  check: CheckName,
  code: string,
  message: string,
  options: Pick<Finding, "affectedCount" | "recordIds" | "path"> = {},
): void {
  const finding: Finding = { severity, check, code, message, ...options };
  context[severity === "error" ? "errors" : "warnings"].push(finding);
  const checkSummary = context.checks[check];
  if (severity === "error") {
    checkSummary.errors += 1;
    checkSummary.passed = false;
  } else {
    checkSummary.warnings += 1;
  }
}

function setCheckDetails(
  context: ValidationContext,
  check: CheckName,
  details: Record<string, unknown>,
): void {
  Object.assign(context.checks[check].details, details);
}

function sampleIds(ids: Iterable<string>, limit = 25): string[] {
  return unique(ids).slice(0, limit);
}

async function parseJsonFile(
  path: string,
  label: string,
  context: ValidationContext,
): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    addFinding(
      context,
      "error",
      "structure",
      "generated_file_unreadable",
      `${label} could not be read: ${error instanceof Error ? error.message : String(error)}`,
      { path },
    );
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    addFinding(
      context,
      "error",
      "structure",
      "generated_json_invalid",
      `${label} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { path },
    );
    return null;
  }
}

function requireObjectArray(
  value: unknown,
  path: string,
  context: ValidationContext,
): JsonObject[] {
  const array = objectArray(value);
  if (!array) {
    addFinding(
      context,
      "error",
      "structure",
      "required_object_array_invalid",
      `${path} must be an array of objects.`,
      { path },
    );
    return [];
  }
  return array;
}

function requireStringArray(
  value: unknown,
  path: string,
  context: ValidationContext,
  allowEmpty = true,
): string[] {
  const array = stringArray(value);
  if (!array || (!allowEmpty && array.length === 0)) {
    addFinding(
      context,
      "error",
      "structure",
      "required_string_array_invalid",
      `${path} must be ${allowEmpty ? "an" : "a non-empty"} array of strings.`,
      { path },
    );
    return [];
  }
  return array;
}

function validateNutrition(
  nutrition: unknown,
  path: string,
  recordId: string,
  context: ValidationContext,
  suspiciousZeroMacroIds: Set<string>,
): boolean {
  if (nutrition === undefined) return false;
  if (!isObject(nutrition)) {
    addFinding(
      context,
      "error",
      "nutrition",
      "nutrition_object_invalid",
      `${path} must be an object when present.`,
      { recordIds: [recordId], path },
    );
    return true;
  }

  for (const field of CORE_NUTRITION_FIELDS) {
    const value = nutrition[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addFinding(
        context,
        "error",
        "nutrition",
        "required_nutrition_value_invalid",
        `${path}.${field} must be a finite number.`,
        { recordIds: [recordId], path: `${path}.${field}` },
      );
    } else if (value < 0) {
      addFinding(
        context,
        "error",
        "nutrition",
        "negative_nutrition_value",
        `${path}.${field} must not be negative.`,
        { recordIds: [recordId], path: `${path}.${field}` },
      );
    }
  }

  for (const field of OPTIONAL_NUTRITION_FIELDS) {
    if (!(field in nutrition)) continue;
    const value = nutrition[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      addFinding(
        context,
        "error",
        "nutrition",
        "optional_nutrition_value_invalid",
        `${path}.${field} must be a finite number when present.`,
        { recordIds: [recordId], path: `${path}.${field}` },
      );
    } else if (value < 0) {
      addFinding(
        context,
        "error",
        "nutrition",
        "negative_nutrition_value",
        `${path}.${field} must not be negative.`,
        { recordIds: [recordId], path: `${path}.${field}` },
      );
    }
  }

  const calories = nutrition.calories;
  const macros = [nutrition.protein, nutrition.carbs, nutrition.totalFat];
  if (
    calories === 0 &&
    macros.some((value) => typeof value === "number" && value > 0)
  ) {
    suspiciousZeroMacroIds.add(recordId);
  }
  return true;
}

function validateIngredientRelationshipNutrition(
  value: unknown,
  path: string,
  recordId: string,
  context: ValidationContext,
  suspiciousZeroMacroIds: Set<string>,
): JsonObject | undefined {
  if (!isObject(value)) {
    addFinding(
      context,
      "error",
      "nutrition",
      "contextual_nutrition_unit_invalid",
      `${path} must be an object.`,
      { recordIds: [recordId], path },
    );
    return undefined;
  }
  validateNutrition(
    value.nutrition,
    `${path}.nutrition`,
    recordId,
    context,
    suspiciousZeroMacroIds,
  );
  const source = isObject(value.source) ? value.source : undefined;
  const retailModifiedItemId = nonEmptyString(source?.retailModifiedItemId);
  const tag = nonEmptyString(source?.tag);
  const expectedSourceId =
    retailModifiedItemId && tag
      ? `retailModifiedItemId:${retailModifiedItemId}|tag:${tag}`
      : undefined;
  const servingWeight = source?.servingWeight;
  const servingWeightValid =
    servingWeight === null ||
    (isObject(servingWeight) &&
      typeof servingWeight.amount === "number" &&
      Number.isFinite(servingWeight.amount) &&
      servingWeight.amount >= 0 &&
      Boolean(nonEmptyString(servingWeight.unit)));
  if (
    !source ||
    source.sourceType !== "ordering_system" ||
    !nonEmptyString(source.sourceUrl)?.startsWith(
      "https://order.api.my.chick-fil-a.com/",
    ) ||
    !retailModifiedItemId ||
    !tag ||
    nonEmptyString(source.sourceId) !== expectedSourceId ||
    !servingWeightValid
  ) {
    addFinding(
      context,
      "error",
      "traceability",
      "contextual_nutrition_source_invalid",
      `${path}.source must preserve the official ordering source identity, tag, URL, and serving weight.`,
      { recordIds: [recordId], path: `${path}.source` },
    );
  }
  return source;
}

function nutritionSignature(candidate: JsonObject): string {
  return JSON.stringify({
    servingSize: candidate.servingSize,
    nutrition: candidate.nutrition,
  });
}

function numberSummary(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
  const context = createContext();
  const [restaurantValue, unresolvedValue] = await Promise.all([
    parseJsonFile(RESTAURANT_PATH, "restaurant.json", context),
    parseJsonFile(UNRESOLVED_PATH, "unresolved.json", context),
  ]);

  const restaurant = isObject(restaurantValue) ? restaurantValue : undefined;
  const unresolved = isObject(unresolvedValue) ? unresolvedValue : undefined;
  if (restaurantValue !== null && !restaurant) {
    addFinding(
      context,
      "error",
      "structure",
      "restaurant_root_invalid",
      "restaurant.json must contain a top-level object.",
      { path: RESTAURANT_PATH },
    );
  }
  if (unresolvedValue !== null && !unresolved) {
    addFinding(
      context,
      "error",
      "structure",
      "unresolved_root_invalid",
      "unresolved.json must contain a top-level object.",
      { path: UNRESOLVED_PATH },
    );
  }

  const menuItems = restaurant
    ? requireObjectArray(restaurant.items, "restaurant.items", context)
    : [];
  const ingredients = restaurant
    ? requireObjectArray(restaurant.ingredients, "restaurant.ingredients", context)
    : [];
  const unresolvedRecords = unresolved
    ? requireObjectArray(unresolved.records, "unresolved.records", context)
    : [];
  const allRecordObjects = [
    ...menuItems.map((value) => ({ value, kind: "menuItem" as const })),
    ...ingredients.map((value) => ({ value, kind: "ingredient" as const })),
  ];

  const recordsById = new Map<string, RecordInfo>();
  const menuItemsById = new Map<string, RecordInfo>();
  const ingredientsById = new Map<string, RecordInfo>();
  const sourceRecordIds = new Map<string, string>();
  const retailSourceIds = new Map<string, string>();
  const groupingSourceIds = new Map<string, string>();
  const missingNutritionIds = new Set<string>();
  const suspiciousZeroMacroIds = new Set<string>();
  const attachedNutritionSourceCounts = {
    standalone_nutrition: 0,
    ordering_system: 0,
  };
  let contextualNutritionRecordCount = 0;

  allRecordObjects.forEach(({ value, kind }, index) => {
    const collectionPath = kind === "menuItem" ? "items" : "ingredients";
    const path = `restaurant.${collectionPath}[${index}]`;
    const id = nonEmptyString(value.id);
    if (!id) {
      addFinding(
        context,
        "error",
        "identity",
        "record_id_missing",
        `${path}.id must be a non-empty string.`,
        { path: `${path}.id` },
      );
      return;
    }
    if (recordsById.has(id)) {
      addFinding(
        context,
        "error",
        "identity",
        "duplicate_logical_id",
        `Logical record ID ${id} occurs more than once.`,
        { recordIds: [id], path: `${path}.id` },
      );
      return;
    }

    const name = nonEmptyString(value.name);
    if (!name) {
      addFinding(
        context,
        "error",
        "structure",
        "record_name_missing",
        `${path}.name must be a non-empty string.`,
        { recordIds: [id], path: `${path}.name` },
      );
    }
    requireStringArray(value.categories, `${path}.categories`, context, false);
    if (kind === "menuItem") {
      const servingType = nonEmptyString(value.servingType);
      if (!servingType || !VALID_SERVING_TYPES.has(servingType)) {
        addFinding(
          context,
          "error",
          "structure",
          "serving_type_invalid",
          `${path}.servingType is missing or unsupported.`,
          { recordIds: [id], path: `${path}.servingType` },
        );
      }
      if (
        typeof value.defaultOrder !== "number" ||
        !Number.isFinite(value.defaultOrder)
      ) {
        addFinding(
          context,
          "error",
          "structure",
          "default_order_invalid",
          `${path}.defaultOrder must be a finite number.`,
          { recordIds: [id], path: `${path}.defaultOrder` },
        );
      }
    } else {
      if (
        typeof value.maxQuantity !== "number" ||
        !Number.isFinite(value.maxQuantity) ||
        value.maxQuantity < 1
      ) {
        addFinding(
          context,
          "error",
          "structure",
          "ingredient_max_quantity_invalid",
          `${path}.maxQuantity must be a positive finite number.`,
          { recordIds: [id], path: `${path}.maxQuantity` },
        );
      }
    }

    const hasNutrition = validateNutrition(
      value.nutrition,
      `${path}.nutrition`,
      id,
      context,
      suspiciousZeroMacroIds,
    );
    const contextualUnits = value.contextualNutritionUnits === undefined
      ? []
      : requireObjectArray(
          value.contextualNutritionUnits,
          `${path}.contextualNutritionUnits`,
          context,
        );
    const contextualSources = contextualUnits.flatMap((unit, unitIndex) => {
      const source = validateIngredientRelationshipNutrition(
        unit,
        `${path}.contextualNutritionUnits[${unitIndex}]`,
        id,
        context,
        suspiciousZeroMacroIds,
      );
      return source ? [source] : [];
    });
    const hasContextualNutrition = contextualUnits.length > 1;
    if (hasContextualNutrition) contextualNutritionRecordCount += 1;
    if (
      (hasContextualNutrition &&
        (kind !== "ingredient" ||
          hasNutrition ||
          value.nutritionResolvedByContext !== true)) ||
      (!hasContextualNutrition && value.nutritionResolvedByContext === true)
    ) {
      addFinding(
        context,
        "error",
        "nutrition",
        "contextual_nutrition_resolution_invalid",
        `${id} contextual nutrition must be a nutrition-withheld ingredient with multiple official units and an explicit resolution flag.`,
        { recordIds: [id], path },
      );
    }
    const contextualTags = contextualSources.flatMap((source) => {
      const tag = nonEmptyString(source.tag);
      return tag ? [tag] : [];
    });
    if (new Set(contextualTags).size !== contextualTags.length) {
      addFinding(
        context,
        "error",
        "identity",
        "duplicate_contextual_nutrition_tag",
        `${id} repeats a contextual nutrition source tag.`,
        { recordIds: [id], path: `${path}.contextualNutritionUnits` },
      );
    }
    const hasResolvedNutrition = hasNutrition || hasContextualNutrition;
    if (!hasResolvedNutrition) missingNutritionIds.add(id);

    const source = isObject(value.source) ? value.source : undefined;
    const sourceMenu = source && isObject(source.menu) ? source.menu : undefined;
    if (!source || !sourceMenu) {
      addFinding(
        context,
        "error",
        "traceability",
        "source_trace_missing",
        `${path}.source.menu is required for generated Chick-fil-A records.`,
        { recordIds: [id], path: `${path}.source` },
      );
    } else {
      if (source.provider !== "Chick-fil-A") {
        addFinding(
          context,
          "error",
          "traceability",
          "source_provider_invalid",
          `${path}.source.provider must be Chick-fil-A.`,
          { recordIds: [id], path: `${path}.source.provider` },
        );
      }
      const sourceRecordId = nonEmptyString(sourceMenu.recordId);
      const itemClass = nonEmptyString(sourceMenu.itemClass);
      const retailModifiedItemId = nonEmptyString(
        sourceMenu.retailModifiedItemId,
      );
      const itemGroupId = nonEmptyString(sourceMenu.itemGroupId);
      if (kind === "menuItem") {
        // sourceOnly is no longer a direct mirror of the raw graph's
        // isSellable flag — it reflects the record's runtime role, which can
        // legitimately disagree with isSellable in two structural cases:
        //  - a variant-container product (e.g. "Hash Browns" with Small/
        //    Large variants folded in) is the real browseable card even
        //    though the raw graph only marks its individual size/count
        //    children directly "sellable", never the grouping node itself;
        //  - a deferred meal container (Meals / Kid's Meals / Family Style
        //    Meals) is marked isSellable in the raw graph but intentionally
        //    hidden from browsing for now, and a variant CHILD is marked
        //    isSellable in the raw graph but hidden because it is folded
        //    into its parent's `variants` instead;
        //  - a "structural" record can also be marked isSellable in the raw
        //    graph despite being hidden: an orphaned catalog-only component
        //    (e.g. a bare "Waffle"/"Gluten Free Bun" ITEM, or the "Filets"/
        //    "Breakfast Proteins"/"Breakfast Breads" family listings) that is
        //    never actually chosen through any real ordering path (see
        //    isOrphanedEntreeComponent / isOrphanedFamilyGrouping in the
        //    importer) is intentionally kept out of Menu even though the raw
        //    graph's isSellable flag says otherwise.
        // See MenuRecordRole in the importer for the full role model.
        const role = nonEmptyString(sourceMenu.role);
        const isVariantContainerProduct =
          role === "standalone_product" &&
          sourceMenu.sellable === false &&
          Array.isArray(value.variants) &&
          value.variants.length > 1;
        const itemTypes = stringArray(sourceMenu.itemTypes) ?? [];
        const isBrowseableSauceOrDressingModifier =
          role === "standalone_product" &&
          sourceMenu.itemClass === "MODIFIER" &&
          itemTypes.some((itemType) =>
            itemType === "SAUCES" ||
            itemType === "DRESSINGS" ||
            itemType === "CONDIMENTS",
          );
        const isDeferredOrVariantChild =
          role === "deferred_meal_container" ||
          role === "variant_child" ||
          role === "structural";

        if (
          sourceMenu.sellable === false &&
          value.sourceOnly !== true &&
          !isVariantContainerProduct &&
          !isBrowseableSauceOrDressingModifier
        ) {
          addFinding(
            context,
            "error",
            "structure",
            "non_sellable_record_not_source_only",
            `${id} is non-sellable in the official graph and must be marked sourceOnly.`,
            { recordIds: [id] },
          );
        } else if (
          sourceMenu.sellable === true &&
          value.sourceOnly === true &&
          !isDeferredOrVariantChild
        ) {
          addFinding(
            context,
            "error",
            "structure",
            "sellable_record_marked_source_only",
            `${id} is sellable in the official graph but is marked sourceOnly.`,
            { recordIds: [id] },
          );
        }
        if (value.nutritionDerivedFromVariants === true) {
          const variants = Array.isArray(value.variants) ? value.variants : [];
          const nutritionResolution = isObject(source.nutritionResolution)
            ? source.nutritionResolution
            : undefined;
          // A multi-variant container with no aggregate nutrition of its own
          // (e.g. "Iced Coffee" with 5 size/flavor variants, each with its
          // own nutrition) is a legitimate standalone product — one browse
          // card whose nutrition comes from the selected variant, exactly
          // like "Hash Browns" (Small/Large). It is no longer required to be
          // sourceOnly; what must still hold is that it genuinely has no own
          // nutrition match, has 2+ variants, and each variant's own
          // nutrition provenance is intact.
          if (
            hasNutrition ||
            variants.length < 2 ||
            nutritionResolution?.status !== "variant_container"
          ) {
            addFinding(
              context,
              "error",
              "nutrition",
              "variant_container_nutrition_invalid",
              `${id} must be a multi-variant container with no own nutrition and child-level nutrition provenance.`,
              { recordIds: [id] },
            );
          }
        }
      }
      if (!sourceRecordId || !itemClass) {
        addFinding(
          context,
          "error",
          "traceability",
          "source_identity_missing",
          `${path}.source.menu must include recordId and itemClass.`,
          { recordIds: [id], path: `${path}.source.menu` },
        );
      } else {
        const previous = sourceRecordIds.get(sourceRecordId);
        if (previous) {
          addFinding(
            context,
            "error",
            "identity",
            "duplicate_source_record",
            `Source record ${sourceRecordId} maps to both ${previous} and ${id}.`,
            { recordIds: [previous, id] },
          );
        } else {
          sourceRecordIds.set(sourceRecordId, id);
        }
        if (itemClass === "ITEM" || itemClass === "MODIFIER") {
          if (!retailModifiedItemId) {
            addFinding(
              context,
              "error",
              "traceability",
              "retail_source_id_missing",
              `${id} is a ${itemClass} but has no retailModifiedItemId.`,
              { recordIds: [id] },
            );
          } else {
            if (sourceRecordId !== `retailModifiedItemId:${retailModifiedItemId}`) {
              addFinding(
                context,
                "error",
                "traceability",
                "source_record_id_inconsistent",
                `${id} has inconsistent retail source identity metadata.`,
                { recordIds: [id] },
              );
            }
            const previous = retailSourceIds.get(retailModifiedItemId);
            if (previous) {
              addFinding(
                context,
                "error",
                "identity",
                "duplicate_retail_source_id",
                `retailModifiedItemId ${retailModifiedItemId} maps to both ${previous} and ${id}.`,
                { recordIds: [previous, id] },
              );
            } else {
              retailSourceIds.set(retailModifiedItemId, id);
            }
          }
        } else if (itemClass === "ITEM_GROUPING") {
          if (!itemGroupId) {
            addFinding(
              context,
              "error",
              "traceability",
              "group_source_id_missing",
              `${id} is an ITEM_GROUPING but has no itemGroupId.`,
              { recordIds: [id] },
            );
          } else {
            if (sourceRecordId !== `itemGroupId:${itemGroupId}`) {
              addFinding(
                context,
                "error",
                "traceability",
                "source_record_id_inconsistent",
                `${id} has inconsistent grouping source identity metadata.`,
                { recordIds: [id] },
              );
            }
            const previous = groupingSourceIds.get(itemGroupId);
            if (previous) {
              addFinding(
                context,
                "error",
                "identity",
                "duplicate_group_source_id",
                `itemGroupId ${itemGroupId} maps to both ${previous} and ${id}.`,
                { recordIds: [previous, id] },
              );
            } else {
              groupingSourceIds.set(itemGroupId, id);
            }
          }
        } else {
          addFinding(
            context,
            "error",
            "traceability",
            "source_item_class_invalid",
            `${id} has unsupported source itemClass ${itemClass}.`,
            { recordIds: [id] },
          );
        }

        const sourceNames = stringArray(sourceMenu.names);
        const isSingularizedOfficialFamilyName = Boolean(
          name &&
            sourceNames?.some((sourceName) => {
              const sanitized = sanitizeDisplayName(sourceName);
              return (
                sanitized.toLocaleLowerCase().endsWith("s") &&
                sanitized.slice(0, -1) === name
              );
            }),
        );
        if (
          !sourceNames ||
          (name &&
            !isSingularizedOfficialFamilyName &&
            !sourceNames.some((sourceName) => sanitizeDisplayName(sourceName) === name))
        ) {
          addFinding(
            context,
            "error",
            "traceability",
            "source_name_inconsistent",
            `${id} is not traceable to its generated name through source.menu.names.`,
            { recordIds: [id] },
          );
        }
      }

      const sourceNutrition = isObject(source.nutrition)
        ? source.nutrition
        : undefined;
      if (hasNutrition && !sourceNutrition) {
        addFinding(
          context,
          "error",
          "traceability",
          "nutrition_source_trace_missing",
          `${id} has attached nutrition without source nutrition trace metadata.`,
          { recordIds: [id] },
        );
      }
      if (sourceNutrition) {
        const attached = sourceNutrition.attached;
        const nutritionSource = nonEmptyString(sourceNutrition.nutritionSource);
        if (
          nutritionSource !== "standalone_nutrition" &&
          nutritionSource !== "ordering_system"
        ) {
          addFinding(
            context,
            "error",
            "traceability",
            "nutrition_source_kind_invalid",
            `${id} source nutrition trace must identify standalone_nutrition or ordering_system.`,
            { recordIds: [id] },
          );
        } else if (attached === true) {
          attachedNutritionSourceCounts[nutritionSource] += 1;
        }
        if (typeof attached !== "boolean") {
          addFinding(
            context,
            "error",
            "traceability",
            "nutrition_attachment_flag_invalid",
            `${id} source nutrition trace must include a boolean attached flag.`,
            { recordIds: [id] },
          );
        } else if (attached !== hasNutrition) {
          addFinding(
            context,
            "error",
            "unresolved",
            "nutrition_attachment_inconsistent",
            `${id} nutrition presence disagrees with source.nutrition.attached.`,
            { recordIds: [id] },
          );
        }
        const nutritionMatchStatus = nonEmptyString(sourceNutrition.matchStatus);
        if (nutritionSource === "ordering_system") {
          const orderingRetailModifiedItemId = nonEmptyString(
            sourceNutrition.orderingRetailModifiedItemId,
          );
          const orderingTag = nonEmptyString(sourceNutrition.orderingTag);
          const orderingSourceUrl = nonEmptyString(
            sourceNutrition.orderingSourceUrl,
          );
          const sourceTags = stringArray(sourceMenu?.tags) ?? [];
          const expectedSourceId =
            orderingRetailModifiedItemId && orderingTag
              ? `retailModifiedItemId:${orderingRetailModifiedItemId}|tag:${orderingTag}`
              : undefined;
          if (
            nutritionMatchStatus !== "ordering_source_match" ||
            !orderingRetailModifiedItemId ||
            orderingRetailModifiedItemId !==
              nonEmptyString(sourceMenu?.retailModifiedItemId) ||
            !orderingTag ||
            !sourceTags.includes(orderingTag) ||
            !orderingSourceUrl?.startsWith(
              "https://order.api.my.chick-fil-a.com/",
            ) ||
            nonEmptyString(sourceNutrition.sourceId) !== expectedSourceId ||
            !Array.isArray(sourceNutrition.orderingDefaultModifierSourceIds)
          ) {
            addFinding(
              context,
              "error",
              "traceability",
              "ordering_nutrition_identity_invalid",
              `${id} ordering-system nutrition trace is not aligned to its menu retailModifiedItemId/tag identity.`,
              { recordIds: [id] },
            );
          }
        } else if (nutritionSource === "standalone_nutrition" &&
          nutritionMatchStatus === "ordering_source_match") {
          addFinding(
            context,
            "error",
            "traceability",
            "standalone_nutrition_status_invalid",
            `${id} standalone nutrition cannot use ordering_source_match status.`,
            { recordIds: [id] },
          );
        }
        if (nutritionMatchStatus === "multiple_identical_official_matches") {
          const candidateSourceIds = stringArray(sourceNutrition.candidateSourceIds);
          if (!candidateSourceIds || candidateSourceIds.length < 2) {
            addFinding(
              context,
              "error",
              "traceability",
              "nutrition_candidate_source_ids_missing",
              `${id} identical-multiple nutrition trace must preserve every candidate source ID.`,
              { recordIds: [id] },
            );
          }
        } else if (!nonEmptyString(sourceNutrition.sourceId)) {
          addFinding(
            context,
            "error",
            "traceability",
            "nutrition_source_id_missing",
            `${id} source nutrition trace has no sourceId.`,
            { recordIds: [id] },
          );
        }
      }

      if (hasContextualNutrition) {
        const nutritionResolution = isObject(source.nutritionResolution)
          ? source.nutritionResolution
          : undefined;
        const sourceRetailModifiedItemId = nonEmptyString(
          sourceMenu.retailModifiedItemId,
        );
        const candidateSourceIds = stringArray(
          nutritionResolution?.candidateSourceIds,
        );
        const actualSourceIds = contextualSources.flatMap((unitSource) => {
          const sourceId = nonEmptyString(unitSource.sourceId);
          return sourceId ? [sourceId] : [];
        });
        if (
          nutritionResolution?.status !== "contextual_modifier" ||
          nutritionResolution?.resolution !==
            "nutrition_selected_by_parent_relationship" ||
          !candidateSourceIds ||
          candidateSourceIds.length !== actualSourceIds.length ||
          !actualSourceIds.every((sourceId) =>
            candidateSourceIds.includes(sourceId),
          ) ||
          contextualSources.some(
            (unitSource) =>
              nonEmptyString(unitSource.retailModifiedItemId) !==
              sourceRetailModifiedItemId,
          )
        ) {
          addFinding(
            context,
            "error",
            "traceability",
            "contextual_nutrition_resolution_trace_invalid",
            `${id} contextual units do not agree with its source identity and nutrition-resolution trace.`,
            { recordIds: [id], path: `${path}.source.nutritionResolution` },
          );
        }
      }
    }

    const info: RecordInfo = {
      id,
      kind,
      value,
      sourceMenu,
      hasNutrition,
      hasResolvedNutrition,
    };
    recordsById.set(id, info);
    (kind === "menuItem" ? menuItemsById : ingredientsById).set(id, info);
  });

  setCheckDetails(context, "structure", {
    menuItems: menuItems.length,
    ingredients: ingredients.length,
    totalRecords: recordsById.size,
  });
  setCheckDetails(context, "identity", {
    uniqueLogicalIds: recordsById.size,
    uniqueSourceRecords: sourceRecordIds.size,
    uniqueRetailModifiedItemIds: retailSourceIds.size,
    uniqueCategoryFacingItemGroupIds: groupingSourceIds.size,
  });

  const sourceRelationships = restaurant && isObject(restaurant.sourceRelationships)
    ? restaurant.sourceRelationships
    : undefined;
  if (restaurant && !sourceRelationships) {
    addFinding(
      context,
      "error",
      "traceability",
      "source_relationship_graph_missing",
      "restaurant.sourceRelationships is required to preserve the Chick-fil-A graph.",
      { path: "restaurant.sourceRelationships" },
    );
  }
  const categoryRoots = sourceRelationships
    ? requireObjectArray(
        sourceRelationships.categoryRoots,
        "restaurant.sourceRelationships.categoryRoots",
        context,
      )
    : [];
  const sourceItemGroups = sourceRelationships
    ? requireObjectArray(
        sourceRelationships.itemGroups,
        "restaurant.sourceRelationships.itemGroups",
        context,
      )
    : [];

  const categoryRootIds = new Map<string, string>();
  const categoryRootNames = new Set<string>();
  const runtimeReferencedMenuIds = new Set<string>();
  categoryRoots.forEach((root, index) => {
    const path = `restaurant.sourceRelationships.categoryRoots[${index}]`;
    const sourceCategoryIndex =
      typeof root.sourceCategoryIndex === "number" &&
      Number.isInteger(root.sourceCategoryIndex)
        ? String(root.sourceCategoryIndex)
        : undefined;
    const name = nonEmptyString(root.name);
    if (!sourceCategoryIndex || !name) {
      addFinding(
        context,
        "error",
        "categories",
        "category_root_identity_invalid",
        `${path} must have an integer sourceCategoryIndex and non-empty name.`,
        { path },
      );
      return;
    }
    const previous = categoryRootIds.get(sourceCategoryIndex);
    if (previous) {
      addFinding(
        context,
        "error",
        "categories",
        "duplicate_category_id",
        `Category source index ${sourceCategoryIndex} is used by ${previous} and ${name}.`,
        { path },
      );
    } else {
      categoryRootIds.set(sourceCategoryIndex, name);
    }
    categoryRootNames.add(name);
    const itemIds = requireStringArray(root.itemIds, `${path}.itemIds`, context);
    if (new Set(itemIds).size !== itemIds.length) {
      addFinding(
        context,
        "error",
        "categories",
        "duplicate_category_item_reference",
        `${name} contains duplicate item references.`,
        { path: `${path}.itemIds` },
      );
    }
    for (const itemId of itemIds) {
      const target = menuItemsById.get(itemId);
      if (!target) {
        addFinding(
          context,
          "error",
          "categories",
          "broken_category_item_reference",
          `${name} references missing menu item ${itemId}.`,
          { recordIds: [itemId], path: `${path}.itemIds` },
        );
      } else {
        runtimeReferencedMenuIds.add(itemId);
        // Macro Maxxer collapses each product to a single standardized
        // primaryBrowseCategory (item.categories), which intentionally can
        // differ from any given official Chick-fil-A section it's rooted
        // under here (e.g. Hash Browns is officially under Breakfast but
        // browses under Sides) — see primaryBrowseCategoryFor. The official
        // relationship itself is what must stay intact, and it is preserved
        // verbatim in source.menu.officialCategories, so check membership
        // there instead of against the browse-facing categories field.
        const targetSource = isObject(target.value.source) ? target.value.source : undefined;
        const targetSourceMenu =
          targetSource && isObject(targetSource.menu) ? targetSource.menu : undefined;
        const officialCategories = stringArray(targetSourceMenu?.officialCategories) ?? [];
        if (!officialCategories.includes(name)) {
          addFinding(
            context,
            "error",
            "categories",
            "category_membership_inconsistent",
            `${itemId} is listed under ${name} but its source.menu.officialCategories does not include that category label.`,
            { recordIds: [itemId], path: `${path}.itemIds` },
          );
        }
      }
    }
  });
  setCheckDetails(context, "categories", {
    categoryRoots: categoryRoots.length,
    uniqueCategoryIds: categoryRootIds.size,
    categoryFacingRecords: runtimeReferencedMenuIds.size,
  });

  const sourceGroupsById = new Map<string, JsonObject>();
  let sourceOptionCount = 0;
  let contextualConstraintCount = 0;
  sourceItemGroups.forEach((group, groupIndex) => {
    const path = `restaurant.sourceRelationships.itemGroups[${groupIndex}]`;
    const groupId = nonEmptyString(group.sourceItemGroupId);
    if (!groupId) {
      addFinding(
        context,
        "error",
        "traceability",
        "source_group_id_missing",
        `${path}.sourceItemGroupId must be a non-empty string.`,
        { path },
      );
      return;
    }
    if (sourceGroupsById.has(groupId)) {
      addFinding(
        context,
        "error",
        "identity",
        "duplicate_source_item_group",
        `Source item group ${groupId} occurs more than once.`,
        { path },
      );
    } else {
      sourceGroupsById.set(groupId, group);
    }
    const options = requireObjectArray(group.options, `${path}.options`, context);
    sourceOptionCount += options.length;
    const optionIndexes = new Set<number>();
    options.forEach((option, optionArrayIndex) => {
      const optionPath = `${path}.options[${optionArrayIndex}]`;
      const optionIndex = option.optionIndex;
      if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex)) {
        addFinding(
          context,
          "error",
          "traceability",
          "source_option_index_invalid",
          `${optionPath}.optionIndex must be an integer.`,
          { path: `${optionPath}.optionIndex` },
        );
      } else if (optionIndexes.has(optionIndex)) {
        addFinding(
          context,
          "error",
          "identity",
          "duplicate_source_option_index",
          `Source group ${groupId} repeats option index ${optionIndex}.`,
          { path: optionPath },
        );
      } else {
        optionIndexes.add(optionIndex);
      }

      const minimum = option.minimum;
      const maximum = option.maximum;
      for (const [field, value] of [
        ["minimum", minimum],
        ["maximum", maximum],
      ] as const) {
        if (
          value !== null &&
          (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        ) {
          addFinding(
            context,
            "error",
            "relationships",
            "source_constraint_invalid",
            `${optionPath}.${field} must be null or a non-negative finite number.`,
            { path: `${optionPath}.${field}` },
          );
        }
      }
      if (minimum !== null || maximum !== null) contextualConstraintCount += 1;
      if (
        typeof minimum === "number" &&
        typeof maximum === "number" &&
        minimum > maximum
      ) {
        addFinding(
          context,
          "error",
          "relationships",
          "source_constraint_range_invalid",
          `${optionPath} has minimum greater than maximum.`,
          { path: optionPath },
        );
      }

      const standardizedRecordId = nonEmptyString(option.standardizedRecordId);
      if (option.standardizedRecordId !== null && !standardizedRecordId) {
        addFinding(
          context,
          "error",
          "traceability",
          "source_standardized_reference_invalid",
          `${optionPath}.standardizedRecordId must be null or a non-empty string.`,
          { path: `${optionPath}.standardizedRecordId` },
        );
      } else if (standardizedRecordId) {
        const target = recordsById.get(standardizedRecordId);
        if (!target) {
          addFinding(
            context,
            "error",
            "relationships",
            "broken_source_standardized_reference",
            `${optionPath} references missing standardized record ${standardizedRecordId}.`,
            { recordIds: [standardizedRecordId], path: optionPath },
          );
        } else {
          const retailModifiedItemId = nonEmptyString(option.retailModifiedItemId);
          const referencedItemGroupId = nonEmptyString(option.referencedItemGroupId);
          if (
            retailModifiedItemId &&
            target.sourceMenu?.retailModifiedItemId !== retailModifiedItemId
          ) {
            addFinding(
              context,
              "error",
              "traceability",
              "source_option_identity_inconsistent",
              `${standardizedRecordId} does not retain option retailModifiedItemId ${retailModifiedItemId}.`,
              { recordIds: [standardizedRecordId], path: optionPath },
            );
          }
          if (
            nonEmptyString(option.itemClass) === "ITEM_GROUPING" &&
            referencedItemGroupId &&
            target.sourceMenu?.itemGroupId !== referencedItemGroupId
          ) {
            addFinding(
              context,
              "error",
              "traceability",
              "source_option_identity_inconsistent",
              `${standardizedRecordId} does not retain option itemGroupId ${referencedItemGroupId}.`,
              { recordIds: [standardizedRecordId], path: optionPath },
            );
          }
        }
      }

      if (option.modifierNutritionUnit !== null) {
        const unitSource = validateIngredientRelationshipNutrition(
          option.modifierNutritionUnit,
          `${optionPath}.modifierNutritionUnit`,
          standardizedRecordId ?? `source-group-${groupId}`,
          context,
          suspiciousZeroMacroIds,
        );
        const target = standardizedRecordId
          ? ingredientsById.get(standardizedRecordId)
          : undefined;
        const sourceId = nonEmptyString(unitSource?.sourceId);
        const targetHasUnit = target
          ? (objectArray(target.value.contextualNutritionUnits) ?? []).some(
              (unit) => {
                const source = isObject(unit.source) ? unit.source : undefined;
                return nonEmptyString(source?.sourceId) === sourceId;
              },
            )
          : false;
        if (
          !target ||
          !sourceId ||
          !targetHasUnit ||
          nonEmptyString(unitSource?.retailModifiedItemId) !==
            nonEmptyString(option.retailModifiedItemId) ||
          nonEmptyString(unitSource?.tag) !== nonEmptyString(option.tag)
        ) {
          addFinding(
            context,
            "error",
            "traceability",
            "source_option_contextual_nutrition_invalid",
            `${optionPath}.modifierNutritionUnit does not match its modifier relationship identity.`,
            {
              ...(standardizedRecordId
                ? { recordIds: [standardizedRecordId] }
                : {}),
              path: `${optionPath}.modifierNutritionUnit`,
            },
          );
        }
      }
    });
  });

  sourceItemGroups.forEach((group, groupIndex) => {
    const options = objectArray(group.options) ?? [];
    options.forEach((option, optionIndex) => {
      const referencedGroupId = nonEmptyString(option.referencedItemGroupId);
      if (referencedGroupId && !sourceGroupsById.has(referencedGroupId)) {
        addFinding(
          context,
          "error",
          "relationships",
          "broken_nested_source_group_reference",
          `Source relationship group ${nonEmptyString(group.sourceItemGroupId) ?? groupIndex} option ${optionIndex} references missing group ${referencedGroupId}.`,
          { path: `restaurant.sourceRelationships.itemGroups[${groupIndex}].options[${optionIndex}]` },
        );
      }
    });
  });

  for (const record of recordsById.values()) {
    const referencedGroups = stringArray(record.sourceMenu?.referencedItemGroupIds) ?? [];
    const containingGroups = stringArray(record.sourceMenu?.containingItemGroupIds) ?? [];
    for (const groupId of [...referencedGroups, ...containingGroups]) {
      if (!sourceGroupsById.has(groupId)) {
        addFinding(
          context,
          "error",
          "traceability",
          "record_source_group_reference_broken",
          `${record.id} source trace references missing item group ${groupId}.`,
          { recordIds: [record.id] },
        );
      }
    }
  }
  setCheckDetails(context, "traceability", {
    sourceItemGroups: sourceGroupsById.size,
    sourceOptions: sourceOptionCount,
    contextualConstraintOptions: contextualConstraintCount,
  });

  const addonGroups = restaurant && isObject(restaurant.addonGroups)
    ? restaurant.addonGroups
    : undefined;
  if (restaurant && !addonGroups) {
    addFinding(
      context,
      "error",
      "relationships",
      "addon_groups_invalid",
      "restaurant.addonGroups must be an object.",
      { path: "restaurant.addonGroups" },
    );
  }
  const addonGroupKeys = new Set(Object.keys(addonGroups ?? {}));
  let addonReferenceCount = 0;
  for (const [ref, rawGroup] of Object.entries(addonGroups ?? {})) {
    if (!isObject(rawGroup)) {
      addFinding(
        context,
        "error",
        "relationships",
        "addon_group_invalid",
        `Addon group ${ref} must be an object.`,
        { path: `restaurant.addonGroups.${ref}` },
      );
      continue;
    }
    if (!nonEmptyString(rawGroup.label)) {
      addFinding(
        context,
        "error",
        "relationships",
        "addon_group_label_missing",
        `Addon group ${ref} has no label.`,
        { path: `restaurant.addonGroups.${ref}.label` },
      );
    }
    const itemIds = requireStringArray(
      rawGroup.itemIds,
      `restaurant.addonGroups.${ref}.itemIds`,
      context,
      false,
    );
    addonReferenceCount += itemIds.length;
    if (new Set(itemIds).size !== itemIds.length) {
      addFinding(
        context,
        "error",
        "relationships",
        "duplicate_addon_item_reference",
        `Addon group ${ref} contains duplicate item IDs.`,
        { path: `restaurant.addonGroups.${ref}.itemIds` },
      );
    }
    for (const itemId of itemIds) {
      const target = menuItemsById.get(itemId);
      if (!target) {
        addFinding(
          context,
          "error",
          "relationships",
          "broken_addon_item_reference",
          `Addon group ${ref} references missing menu item ${itemId}.`,
          { recordIds: [itemId] },
        );
      } else {
        runtimeReferencedMenuIds.add(itemId);
        if (target.value.addonEligible !== true || target.value.servingType !== "addon") {
          addFinding(
            context,
            "error",
            "relationships",
            "addon_target_type_invalid",
            `${itemId} is referenced as an addon but is not an addon-eligible addon item.`,
            { recordIds: [itemId] },
          );
        }
      }
    }
    if (
      rawGroup.maxPerItem !== undefined &&
      (typeof rawGroup.maxPerItem !== "number" ||
        !Number.isFinite(rawGroup.maxPerItem) ||
        rawGroup.maxPerItem < 0)
    ) {
      addFinding(
        context,
        "error",
        "relationships",
        "addon_maximum_invalid",
        `Addon group ${ref}.maxPerItem must be a non-negative finite number.`,
        { path: `restaurant.addonGroups.${ref}.maxPerItem` },
      );
    }
  }

  const customizationRules = restaurant && isObject(restaurant.customizationRules)
    ? restaurant.customizationRules
    : undefined;
  const ingredientCategoryRules = customizationRules && isObject(customizationRules.ingredientCategories)
    ? customizationRules.ingredientCategories
    : {};
  if (restaurant && !customizationRules) {
    addFinding(
      context,
      "error",
      "relationships",
      "customization_rules_invalid",
      "restaurant.customizationRules must be an object.",
      { path: "restaurant.customizationRules" },
    );
  }
  for (const [name, rawRule] of Object.entries(ingredientCategoryRules)) {
    if (!isObject(rawRule)) {
      addFinding(
        context,
        "error",
        "relationships",
        "ingredient_category_rule_invalid",
        `Customization rule ${name} must be an object.`,
        { path: `restaurant.customizationRules.ingredientCategories.${name}` },
      );
      continue;
    }
    if (
      rawRule.maxQuantity !== undefined &&
      (typeof rawRule.maxQuantity !== "number" ||
        !Number.isFinite(rawRule.maxQuantity) ||
        rawRule.maxQuantity < 0)
    ) {
      addFinding(
        context,
        "error",
        "relationships",
        "ingredient_category_maximum_invalid",
        `Customization rule ${name}.maxQuantity must be non-negative when present.`,
        { path: `restaurant.customizationRules.ingredientCategories.${name}.maxQuantity` },
      );
    }
    if (rawRule.allowNone !== undefined && typeof rawRule.allowNone !== "boolean") {
      addFinding(
        context,
        "error",
        "relationships",
        "ingredient_category_allow_none_invalid",
        `Customization rule ${name}.allowNone must be boolean when present.`,
        { path: `restaurant.customizationRules.ingredientCategories.${name}.allowNone` },
      );
    }
  }

  let ingredientReferenceCount = 0;
  let contextualNutritionRelationshipCount = 0;
  let variantReferenceCount = 0;
  let comboReferenceCount = 0;
  const combosWithoutRuntimeEntree = new Set<string>();
  const comboIds = new Set<string>();
  const selectedContextualNutritionUnits = new Set<string>();
  const isValidIngredientTarget = (ingredientId: string): boolean =>
    ingredientsById.has(ingredientId) ||
    menuItemsById.get(ingredientId)?.value.ingredientEligible === true;

  const validateIngredientNutritionContexts = (
    value: unknown,
    path: string,
    parentId: string,
  ): void => {
    if (value === undefined) return;
    if (!isObject(value)) {
      addFinding(
        context,
        "error",
        "relationships",
        "ingredient_nutrition_contexts_invalid",
        `${path} must be an object keyed by ingredient ID.`,
        { recordIds: [parentId], path },
      );
      return;
    }
    for (const [ingredientId, unit] of Object.entries(value)) {
      contextualNutritionRelationshipCount += 1;
      const unitSource = validateIngredientRelationshipNutrition(
        unit,
        `${path}.${ingredientId}`,
        parentId,
        context,
        suspiciousZeroMacroIds,
      );
      const ingredient = ingredientsById.get(ingredientId);
      const sourceId = nonEmptyString(unitSource?.sourceId);
      const targetUnits = ingredient
        ? objectArray(ingredient.value.contextualNutritionUnits) ?? []
        : [];
      const matchingTargetUnit = targetUnits.find((targetUnit) => {
        const targetSource = isObject(targetUnit.source)
          ? targetUnit.source
          : undefined;
        return nonEmptyString(targetSource?.sourceId) === sourceId;
      });
      if (
        !ingredient ||
        !sourceId ||
        !matchingTargetUnit ||
        nonEmptyString(unitSource?.retailModifiedItemId) !==
          nonEmptyString(ingredient.sourceMenu?.retailModifiedItemId) ||
        !(stringArray(ingredient.sourceMenu?.tags) ?? []).includes(
          nonEmptyString(unitSource?.tag) ?? "",
        )
      ) {
        addFinding(
          context,
          "error",
          "relationships",
          "ingredient_nutrition_context_reference_invalid",
          `${parentId} does not select a preserved official contextual unit for ${ingredientId}.`,
          { recordIds: [parentId, ingredientId], path: `${path}.${ingredientId}` },
        );
      } else {
        selectedContextualNutritionUnits.add(`${ingredientId}|${sourceId}`);
      }
    }
  };

  for (const item of menuItemsById.values()) {
    const path = `restaurant.items.${item.id}`;
    const ingredientIds = item.value.ingredients === undefined
      ? []
      : requireStringArray(item.value.ingredients, `${path}.ingredients`, context);
    ingredientReferenceCount += ingredientIds.length;
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      addFinding(
        context,
        "error",
        "relationships",
        "duplicate_ingredient_reference",
        `${item.id} contains duplicate ingredient IDs.`,
        { recordIds: [item.id] },
      );
    }
    for (const ingredientId of ingredientIds) {
      if (!isValidIngredientTarget(ingredientId)) {
        addFinding(
          context,
          "error",
          "relationships",
          "broken_ingredient_reference",
          `${item.id} references missing ingredient ${ingredientId}.`,
          { recordIds: [item.id, ingredientId] },
        );
      }
    }
    validateIngredientNutritionContexts(
      item.value.ingredientNutritionContexts,
      `${path}.ingredientNutritionContexts`,
      item.id,
    );

    const addonRefs = item.value.addonRefs === undefined
      ? []
      : requireStringArray(item.value.addonRefs, `${path}.addonRefs`, context);
    for (const ref of addonRefs) {
      if (!addonGroupKeys.has(ref)) {
        addFinding(
          context,
          "error",
          "relationships",
          "broken_addon_group_reference",
          `${item.id} references missing addon group ${ref}.`,
          { recordIds: [item.id] },
        );
      }
    }

    if (item.value.customization !== undefined) {
      if (!isObject(item.value.customization)) {
        addFinding(
          context,
          "error",
          "relationships",
          "item_customization_invalid",
          `${item.id}.customization must be an object.`,
          { recordIds: [item.id] },
        );
      } else {
        const categories = requireObjectArray(
          item.value.customization.ingredientCategories,
          `${path}.customization.ingredientCategories`,
          context,
        );
        // Generated data can give an item-level category a stable internal
        // `id` distinct from its display `name` (see IngredientItemCategory
        // and lib/ingredientTabs.ts's resolveIngredientCategoryRule): two of
        // an item's own categories are allowed to share a display name (a
        // clean tab label like "Bread Carriers") as long as each has its own
        // `id`, which is the real key into the restaurant-level rule map and
        // the real uniqueness key. Fall back to `name` for records that
        // don't carry an `id` (restaurants without the split, or malformed
        // records where duplication by name is still the right thing to
        // flag).
        const categoryKeys = new Set<string>();
        categories.forEach((category, index) => {
          const categoryPath = `${path}.customization.ingredientCategories[${index}]`;
          const name = nonEmptyString(category.name);
          if (!name) {
            addFinding(
              context,
              "error",
              "relationships",
              "item_ingredient_category_name_missing",
              `${categoryPath}.name must be non-empty.`,
              { recordIds: [item.id] },
            );
            return;
          }
          const key = nonEmptyString(category.id) ?? name;
          if (categoryKeys.has(key)) {
            addFinding(
              context,
              "error",
              "relationships",
              "duplicate_item_ingredient_category",
              `${item.id} repeats customization category ${key}.`,
              { recordIds: [item.id] },
            );
          }
          categoryKeys.add(key);
          if (!isObject(ingredientCategoryRules[key])) {
            addFinding(
              context,
              "error",
              "relationships",
              "missing_ingredient_category_rule",
              `${item.id} uses customization category ${key} without a restaurant rule.`,
              { recordIds: [item.id] },
            );
          }
          if (typeof category.allowNone !== "boolean") {
            addFinding(
              context,
              "error",
              "relationships",
              "item_ingredient_allow_none_invalid",
              `${categoryPath}.allowNone must be boolean.`,
              { recordIds: [item.id] },
            );
          }
          const optionIds = requireStringArray(
            category.ingredients,
            `${categoryPath}.ingredients`,
            context,
            false,
          );
          ingredientReferenceCount += optionIds.length;
          for (const optionId of optionIds) {
            if (!isValidIngredientTarget(optionId)) {
              addFinding(
                context,
                "error",
                "relationships",
                "broken_customization_ingredient_reference",
                `${item.id} customization category ${name} references missing ingredient ${optionId}.`,
                { recordIds: [item.id, optionId] },
              );
            }
          }
        });
      }
    }

    const variants = item.value.variants === undefined
      ? []
      : requireObjectArray(item.value.variants, `${path}.variants`, context);
    const variantIds = new Set<string>();
    for (const [variantIndex, variant] of variants.entries()) {
      const variantPath = `${path}.variants[${variantIndex}]`;
      const variantId = nonEmptyString(variant.id);
      if (!variantId) {
        addFinding(
          context,
          "error",
          "relationships",
          "variant_id_missing",
          `${variantPath}.id must be non-empty.`,
          { recordIds: [item.id] },
        );
        continue;
      }
      variantReferenceCount += 1;
      if (variantIds.has(variantId)) {
        addFinding(
          context,
          "error",
          "relationships",
          "duplicate_variant_reference",
          `${item.id} repeats variant ${variantId}.`,
          { recordIds: [item.id, variantId] },
        );
      }
      variantIds.add(variantId);
      const target = menuItemsById.get(variantId);
      if (!target) {
        addFinding(
          context,
          "error",
          "relationships",
          "broken_variant_reference",
          `${item.id} variant ${variantId} has no top-level menu record.`,
          { recordIds: [item.id, variantId] },
        );
      } else {
        runtimeReferencedMenuIds.add(variantId);
        const variantSource = isObject(variant.source) && isObject(variant.source.menu)
          ? variant.source.menu
          : undefined;
        if (
          !variantSource ||
          variantSource.recordId !== target.sourceMenu?.recordId
        ) {
          addFinding(
            context,
            "error",
            "traceability",
            "variant_source_trace_inconsistent",
            `${item.id} variant ${variantId} does not match its top-level source trace.`,
            { recordIds: [item.id, variantId] },
          );
        }
      }
      validateNutrition(
        variant.nutrition,
        `${variantPath}.nutrition`,
        `${item.id}:${variantId}`,
        context,
        suspiciousZeroMacroIds,
      );
      validateIngredientNutritionContexts(
        variant.ingredientNutritionContexts,
        `${variantPath}.ingredientNutritionContexts`,
        `${item.id}:${variantId}`,
      );
    }
    if (variants.length > 0) {
      const defaultVariantId = nonEmptyString(item.value.defaultVariantId);
      if (!defaultVariantId || !variantIds.has(defaultVariantId)) {
        addFinding(
          context,
          "error",
          "relationships",
          "default_variant_reference_broken",
          `${item.id}.defaultVariantId must resolve to one of its variants.`,
          { recordIds: [item.id] },
        );
      }
    } else if (item.value.defaultVariantId !== undefined) {
      addFinding(
        context,
        "error",
        "relationships",
        "default_variant_without_variants",
        `${item.id} has defaultVariantId without variants.`,
        { recordIds: [item.id] },
      );
    }

    const servingType = nonEmptyString(item.value.servingType);
    const comboConfig = item.value.comboConfig;
    if (servingType === "combo") {
      comboIds.add(item.id);
      if (!isObject(comboConfig)) {
        addFinding(
          context,
          "error",
          "combos",
          "combo_configuration_missing",
          `${item.id} is a combo but has no comboConfig.`,
          { recordIds: [item.id] },
        );
      }
      if (item.hasNutrition) {
        addFinding(
          context,
          "error",
          "combos",
          "meal_container_nutrition_attached",
          `${item.id} is a meal container with attached nutrition.`,
          { recordIds: [item.id] },
        );
      }
    } else if (comboConfig !== undefined) {
      addFinding(
        context,
        "error",
        "combos",
        "combo_configuration_on_non_combo",
        `${item.id} has comboConfig but servingType is ${servingType ?? "missing"}.`,
        { recordIds: [item.id] },
      );
    }

    if (isObject(comboConfig)) {
      const validateComboReference = (
        optionId: string,
        role: "entree" | "side" | "drink" | "included" | "upgrade",
      ): void => {
        comboReferenceCount += 1;
        const target = menuItemsById.get(optionId);
        if (!target) {
          addFinding(
            context,
            "error",
            "combos",
            "broken_combo_reference",
            `${item.id} ${role} reference ${optionId} does not resolve.`,
            { recordIds: [item.id, optionId] },
          );
          return;
        }
        runtimeReferencedMenuIds.add(optionId);
        const targetType = nonEmptyString(target.value.servingType);
        if (role === "side" && targetType !== "side") {
          addFinding(
            context,
            "error",
            "combos",
            "combo_side_type_invalid",
            `${item.id} side option ${optionId} has servingType ${targetType}.`,
            { recordIds: [item.id, optionId] },
          );
        }
        if (role === "drink" && targetType !== "drink") {
          addFinding(
            context,
            "error",
            "combos",
            "combo_drink_type_invalid",
            `${item.id} drink option ${optionId} has servingType ${targetType}.`,
            { recordIds: [item.id, optionId] },
          );
        }
        if (role === "entree" && (targetType === "combo" || optionId === item.id)) {
          addFinding(
            context,
            "error",
            "combos",
            "combo_entree_type_invalid",
            `${item.id} entrée reference ${optionId} is not a distinct entrée record.`,
            { recordIds: [item.id, optionId] },
          );
        }
      };

      const entreeItemId = nonEmptyString(comboConfig.entreeItemId);
      if (comboConfig.entreeItemId !== undefined && !entreeItemId) {
        addFinding(
          context,
          "error",
          "combos",
          "combo_entree_reference_invalid",
          `${item.id}.comboConfig.entreeItemId must be non-empty when present.`,
          { recordIds: [item.id] },
        );
      } else if (entreeItemId) {
        validateComboReference(entreeItemId, "entree");
      } else if (servingType === "combo") {
        combosWithoutRuntimeEntree.add(item.id);
      }

      for (const [field, role] of [
        ["includedItemIds", "included"],
        ["sideOptions", "side"],
        ["drinkOptions", "drink"],
        ["upgradeOptions", "upgrade"],
      ] as const) {
        if (comboConfig[field] === undefined) continue;
        const ids = requireStringArray(
          comboConfig[field],
          `${path}.comboConfig.${field}`,
          context,
        );
        if (new Set(ids).size !== ids.length) {
          addFinding(
            context,
            "error",
            "combos",
            "duplicate_combo_reference",
            `${item.id}.comboConfig.${field} contains duplicates.`,
            { recordIds: [item.id] },
          );
        }
        ids.forEach((optionId) => validateComboReference(optionId, role));
      }

      for (const [defaultField, optionsField] of [
        ["defaultSideId", "sideOptions"],
        ["defaultDrinkId", "drinkOptions"],
      ] as const) {
        const defaultId = nonEmptyString(comboConfig[defaultField]);
        if (!defaultId) continue;
        const options = stringArray(comboConfig[optionsField]) ?? [];
        if (!options.includes(defaultId)) {
          addFinding(
            context,
            "error",
            "combos",
            "combo_default_not_an_option",
            `${item.id}.${defaultField} is not listed in ${optionsField}.`,
            { recordIds: [item.id, defaultId] },
          );
        }
      }
    }
  }

  for (const ingredient of ingredientsById.values()) {
    for (const unit of objectArray(ingredient.value.contextualNutritionUnits) ?? []) {
      const source = isObject(unit.source) ? unit.source : undefined;
      const sourceId = nonEmptyString(source?.sourceId);
      if (
        sourceId &&
        !selectedContextualNutritionUnits.has(`${ingredient.id}|${sourceId}`)
      ) {
        addFinding(
          context,
          "error",
          "relationships",
          "contextual_nutrition_unit_unreferenced",
          `${ingredient.id} preserves contextual unit ${sourceId}, but no parent relationship selects it.`,
          { recordIds: [ingredient.id] },
        );
      }
    }
  }

  setCheckDetails(context, "relationships", {
    addonGroups: addonGroupKeys.size,
    addonItemReferences: addonReferenceCount,
    ingredientReferences: ingredientReferenceCount,
    contextualNutritionRelationships: contextualNutritionRelationshipCount,
    variantReferences: variantReferenceCount,
  });
  setCheckDetails(context, "combos", {
    mealContainers: comboIds.size,
    comboReferences: comboReferenceCount,
    mealContainersWithoutSingleRuntimeEntree: combosWithoutRuntimeEntree.size,
    mealContainersWithNutrition: [...comboIds].filter(
      (id) => recordsById.get(id)?.hasNutrition,
    ).length,
  });

  const unresolvedByStandardId = new Map<string, JsonObject>();
  const unresolvedReasonCounts = new Map<string, number>();
  unresolvedRecords.forEach((record, index) => {
    const path = `unresolved.records[${index}]`;
    const standardizedRecordId = nonEmptyString(record.standardizedRecordId);
    const menuRecordId = nonEmptyString(record.menuRecordId);
    const reason = nonEmptyString(record.reason);
    const matchStatus = nonEmptyString(record.matchStatus);
    if (!standardizedRecordId || !menuRecordId || !reason || !matchStatus) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_identity_invalid",
        `${path} must include standardizedRecordId, menuRecordId, reason, and matchStatus.`,
        { path },
      );
      return;
    }
    if (unresolvedByStandardId.has(standardizedRecordId)) {
      addFinding(
        context,
        "error",
        "unresolved",
        "duplicate_unresolved_record",
        `${standardizedRecordId} occurs more than once in unresolved.json.`,
        { recordIds: [standardizedRecordId] },
      );
    } else {
      unresolvedByStandardId.set(standardizedRecordId, record);
    }
    unresolvedReasonCounts.set(reason, (unresolvedReasonCounts.get(reason) ?? 0) + 1);
    if (!RECOGNIZED_UNRESOLVED_REASONS.has(reason)) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_reason_unrecognized",
        `${standardizedRecordId} uses unrecognized reason ${reason}.`,
        { recordIds: [standardizedRecordId] },
      );
    }
    const generatedRecord = recordsById.get(standardizedRecordId);
    if (!generatedRecord) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_record_target_missing",
        `${standardizedRecordId} does not resolve to a generated logical record.`,
        { recordIds: [standardizedRecordId] },
      );
      return;
    }
    if (generatedRecord.sourceMenu?.recordId !== menuRecordId) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_source_identity_inconsistent",
        `${standardizedRecordId} unresolved source identity does not match restaurant.json.`,
        { recordIds: [standardizedRecordId] },
      );
    }
    if (generatedRecord.hasNutrition) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_record_has_nutrition",
        `${standardizedRecordId} is unresolved but has attached nutrition.`,
        { recordIds: [standardizedRecordId] },
      );
    }

    const candidates = requireObjectArray(
      record.candidateNutritionRows,
      `${path}.candidateNutritionRows`,
      context,
    );
    candidates.forEach((candidate, candidateIndex) => {
      if (!nonEmptyString(candidate.sourceId) || !nonEmptyString(candidate.name)) {
        addFinding(
          context,
          "error",
          "unresolved",
          "unresolved_candidate_identity_invalid",
          `${path}.candidateNutritionRows[${candidateIndex}] lacks sourceId or name.`,
          { recordIds: [standardizedRecordId] },
        );
      }
      validateNutrition(
        candidate.nutrition,
        `${path}.candidateNutritionRows[${candidateIndex}].nutrition`,
        `${standardizedRecordId}:candidate:${candidateIndex}`,
        context,
        suspiciousZeroMacroIds,
      );
    });

    const signatures = new Set(candidates.map(nutritionSignature));
    if (reason === "no_nutrition_match") {
      if (matchStatus !== "no_match" || candidates.length !== 0) {
        addFinding(
          context,
          "error",
          "unresolved",
          "no_match_reason_inconsistent",
          `${standardizedRecordId} no-match state is inconsistent with its candidates.`,
          { recordIds: [standardizedRecordId] },
        );
      }
    } else if (reason === "multiple_conflicting_matches") {
      if (matchStatus !== "ambiguous" || candidates.length < 2 || signatures.size < 2) {
        addFinding(
          context,
          "error",
          "unresolved",
          "conflicting_duplicate_reason_inconsistent",
          `${standardizedRecordId} conflicting-match state is inconsistent.`,
          { recordIds: [standardizedRecordId] },
        );
      }
    } else if (reason === "entree_only_nutrition_for_meal_container") {
      const source = isObject(generatedRecord.value.source)
        ? generatedRecord.value.source
        : undefined;
      const sourceNutrition = source && isObject(source.nutrition)
        ? source.nutrition
        : undefined;
      if (
        generatedRecord.value.servingType !== "combo" ||
        candidates.length !== 1 ||
        sourceNutrition?.attached !== false ||
        sourceNutrition?.attachmentReason !==
          "withheld_entree_only_from_meal_container"
      ) {
        addFinding(
          context,
          "error",
          "unresolved",
          "entree_only_withholding_inconsistent",
          `${standardizedRecordId} entrée-only meal withholding is inconsistent.`,
          { recordIds: [standardizedRecordId] },
        );
      }
    }
  });

  for (const recordId of missingNutritionIds) {
    if (recordsById.get(recordId)?.value.nutritionDerivedFromVariants === true) {
      continue;
    }
    if (!unresolvedByStandardId.has(recordId)) {
      addFinding(
        context,
        "error",
        "unresolved",
        "missing_nutrition_not_reported",
        `${recordId} has no nutrition but is absent from unresolved.json.`,
        { recordIds: [recordId] },
      );
    }
  }
  for (const recordId of unresolvedByStandardId.keys()) {
    if (!missingNutritionIds.has(recordId)) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_record_not_withheld",
        `${recordId} appears in unresolved.json but is not nutrition-withheld.`,
        { recordIds: [recordId] },
      );
    }
  }

  const unresolvedSummary = unresolved && isObject(unresolved.summary)
    ? unresolved.summary
    : undefined;
  if (!unresolvedSummary) {
    addFinding(
      context,
      "error",
      "unresolved",
      "unresolved_summary_missing",
      "unresolved.summary must be an object.",
      { path: "unresolved.summary" },
    );
  } else {
    const expectedSummaryValues: Array<[string, number]> = [
      ["logicalRecords", recordsById.size],
      ["nutritionAttached", recordsById.size - missingNutritionIds.size],
      ["unresolved", unresolvedByStandardId.size],
    ];
    for (const [field, expected] of expectedSummaryValues) {
      if (numberSummary(unresolvedSummary[field]) !== expected) {
        addFinding(
          context,
          "error",
          "unresolved",
          "unresolved_summary_inconsistent",
          `unresolved.summary.${field} does not equal the validated count ${expected}.`,
          { path: `unresolved.summary.${field}` },
        );
      }
    }
    const summaryReasons = isObject(unresolvedSummary.unresolvedReasons)
      ? unresolvedSummary.unresolvedReasons
      : undefined;
    if (!summaryReasons) {
      addFinding(
        context,
        "error",
        "unresolved",
        "unresolved_reason_summary_missing",
        "unresolved.summary.unresolvedReasons must be an object.",
      );
    } else {
      for (const reason of RECOGNIZED_UNRESOLVED_REASONS) {
        const actual = unresolvedReasonCounts.get(reason) ?? 0;
        const reported = summaryReasons[reason] === undefined
          ? 0
          : numberSummary(summaryReasons[reason]);
        if (reported !== actual) {
          addFinding(
            context,
            "error",
            "unresolved",
            "unresolved_reason_summary_inconsistent",
            `Summary count for ${reason} does not equal ${actual}.`,
          );
        }
      }
    }
  }

  const runtimeIntegration = restaurant && isObject(restaurant.runtimeIntegration)
    ? restaurant.runtimeIntegration
    : undefined;
  if (!runtimeIntegration) {
    addFinding(
      context,
      "error",
      "structure",
      "runtime_integration_missing",
      "restaurant.runtimeIntegration must describe visibility and deferred product decisions.",
    );
  } else {
    const visibleItems = requireObjectArray(
      runtimeIntegration.visibleItems,
      "restaurant.runtimeIntegration.visibleItems",
      context,
    );
    const customizationItems = requireObjectArray(
      runtimeIntegration.customizationItems,
      "restaurant.runtimeIntegration.customizationItems",
      context,
    );
    const deferredItems = requireObjectArray(
      runtimeIntegration.deferredItems,
      "restaurant.runtimeIntegration.deferredItems",
      context,
    );
    const integratedIds = new Set<string>();
    for (const [kind, entries] of [
      ["visible", visibleItems],
      ["customization", customizationItems],
    ] as const) {
      entries.forEach((entry) => {
        const itemId = nonEmptyString(entry.itemId);
        const record = itemId ? recordsById.get(itemId) : undefined;
        if (!itemId || !record || integratedIds.has(itemId)) {
          addFinding(
            context,
            "error",
            "identity",
            "runtime_integration_item_invalid",
            `${kind} runtime entry must reference one unique generated item.`,
            { ...(itemId ? { recordIds: [itemId] } : {}) },
          );
          return;
        }
        integratedIds.add(itemId);
        const sourceMenu = record.sourceMenu;
        const categories = stringArray(entry.categories);
        const servingType = nonEmptyString(entry.servingType);
        if (
          sourceMenu?.sellable !== true ||
          sourceMenu.itemClass !== "ITEM" ||
          // A "visible" entry must be a genuine, currently-unhidden Menu
          // card. A "customization" entry is, by definition, NOT a Menu
          // card — it is deliberately sourceOnly in the real generated item
          // (e.g. a bun swap option modeled as customization-only), so that
          // same sourceOnly flag is expected here, not disqualifying.
          (kind === "visible" && record.value.sourceOnly === true) ||
          !record.hasNutrition ||
          !categories ||
          categories.length === 0 ||
          !servingType ||
          !VALID_SERVING_TYPES.has(servingType) ||
          servingType === "combo"
        ) {
          addFinding(
            context,
            "error",
            "structure",
            "runtime_integration_visibility_unsafe",
            `${itemId} is not a safely modeled current sellable non-meal item.`,
            { recordIds: [itemId] },
          );
        }
        if (
          kind === "visible" &&
          categories?.some((category) =>
            /^(?:Meals|Kid's Meals|Family Style Meals)$/i.test(category),
          )
        ) {
          addFinding(
            context,
            "error",
            "categories",
            "runtime_meal_category_leak",
            `${itemId} retains a deferred meal-container display category.`,
            { recordIds: [itemId] },
          );
        }
      });
    }
    const deferredIds = new Set(
      deferredItems.flatMap((entry) => {
        const itemId = nonEmptyString(entry.itemId);
        return itemId ? [itemId] : [];
      }),
    );
    deferredItems.forEach((entry) => {
      const itemId = nonEmptyString(entry.itemId);
      const decision = nonEmptyString(entry.decision);
      const record = itemId ? recordsById.get(itemId) : undefined;
      if (!itemId || !decision || !record) {
        addFinding(
          context,
          "error",
          "identity",
          "runtime_deferred_item_invalid",
          "Every deferred runtime entry must reference a generated item and decision.",
          { ...(itemId ? { recordIds: [itemId] } : {}) },
        );
        return;
      }
      if (
        decision.startsWith("defer_") &&
        decision.endsWith("meal") &&
        record.value.servingType !== "combo"
      ) {
        addFinding(
          context,
          "error",
          "combos",
          "runtime_deferred_meal_invalid",
          `${itemId} is marked as a deferred meal but is not a combo record.`,
          { recordIds: [itemId] },
        );
      }
    });
    for (const itemId of integratedIds) {
      if (deferredIds.has(itemId)) {
        addFinding(
          context,
          "error",
          "identity",
          "runtime_integration_decision_conflict",
          `${itemId} is both integrated and deferred.`,
          { recordIds: [itemId] },
        );
      }
    }
    const summary = isObject(runtimeIntegration.summary)
      ? runtimeIntegration.summary
      : undefined;
    if (
      !summary ||
      numberSummary(summary.visibleItems) !== visibleItems.length ||
      numberSummary(summary.customizationItems) !== customizationItems.length ||
      numberSummary(summary.deferredItems) !== deferredItems.length
    ) {
      addFinding(
        context,
        "error",
        "structure",
        "runtime_integration_counts_inconsistent",
        "runtimeIntegration.summary does not match its item lists.",
      );
    }
    setCheckDetails(context, "structure", {
      ...(context.checks.structure.details ?? {}),
      runtimeVisibleItems: visibleItems.length,
      runtimeCustomizationItems: customizationItems.length,
      runtimeDeferredItems: deferredItems.length,
    });
  }

  const importMetadata = restaurant && isObject(restaurant.importMetadata)
    ? restaurant.importMetadata
    : undefined;
  if (!importMetadata) {
    addFinding(
      context,
      "error",
      "traceability",
      "import_metadata_missing",
      "restaurant.importMetadata must be present.",
    );
  } else {
    const logicalCounts = isObject(importMetadata.logicalRecordCounts)
      ? importMetadata.logicalRecordCounts
      : undefined;
    if (
      !logicalCounts ||
      numberSummary(logicalCounts.total) !== recordsById.size ||
      numberSummary(logicalCounts.menuItems) !== menuItemsById.size ||
      numberSummary(logicalCounts.ingredients) !== ingredientsById.size
    ) {
      addFinding(
        context,
        "error",
        "identity",
        "import_record_counts_inconsistent",
        "importMetadata.logicalRecordCounts does not match validated records.",
      );
    }
    const attachment = isObject(importMetadata.nutritionAttachment)
      ? importMetadata.nutritionAttachment
      : undefined;
    if (
      !attachment ||
      numberSummary(attachment.attached) !== recordsById.size - missingNutritionIds.size ||
      numberSummary(attachment.standaloneNutrition) !==
        attachedNutritionSourceCounts.standalone_nutrition ||
      numberSummary(attachment.orderingSystem) !==
        attachedNutritionSourceCounts.ordering_system ||
      numberSummary(attachment.contextualOrderingSystem) !==
        contextualNutritionRecordCount ||
      numberSummary(attachment.withheldOrUnmatched) !== missingNutritionIds.size
    ) {
      addFinding(
        context,
        "error",
        "nutrition",
        "import_nutrition_counts_inconsistent",
        "importMetadata.nutritionAttachment does not match validated nutrition state.",
      );
    }
    const compatibility = isObject(importMetadata.schemaCompatibility)
      ? importMetadata.schemaCompatibility
      : undefined;
    if (
      unresolvedByStandardId.size > 0 &&
      compatibility?.runtimeReady !== false
    ) {
      addFinding(
        context,
        "error",
        "unresolved",
        "runtime_ready_flag_unsafe",
        "runtimeReady must remain false while unresolved nutrition exists.",
      );
    }
  }

  if (missingNutritionIds.size > 0) {
    addFinding(
      context,
      "warning",
      "nutrition",
      "nutrition_unavailable",
      `${missingNutritionIds.size} records intentionally have no attached official nutrition and remain in human review.`,
      {
        affectedCount: missingNutritionIds.size,
        recordIds: sampleIds(missingNutritionIds),
      },
    );
  }
  if (suspiciousZeroMacroIds.size > 0) {
    addFinding(
      context,
      "warning",
      "nutrition",
      "zero_calories_with_nonzero_macros",
      "Some nutrition objects report zero calories with a positive core macro.",
      {
        affectedCount: suspiciousZeroMacroIds.size,
        recordIds: sampleIds(suspiciousZeroMacroIds),
      },
    );
  }
  if (sourceGroupsById.size > 0) {
    addFinding(
      context,
      "warning",
      "schema_limitations",
      "source_relationships_metadata_only",
      `${sourceGroupsById.size} Chick-fil-A source item groups are retained in metadata because the runtime schema cannot express the complete nested graph.`,
      { affectedCount: sourceGroupsById.size },
    );
  }
  if (contextualConstraintCount > 0) {
    addFinding(
      context,
      "warning",
      "schema_limitations",
      "contextual_constraints_metadata_only",
      `${contextualConstraintCount} source options retain contextual minimum/maximum information that is not fully first-class in the runtime schema.`,
      { affectedCount: contextualConstraintCount },
    );
  }
  if (combosWithoutRuntimeEntree.size > 0) {
    addFinding(
      context,
      "warning",
      "schema_limitations",
      "combo_entree_choice_metadata_only",
      `${combosWithoutRuntimeEntree.size} meal containers cannot express a single runtime entrée reference; their source choices remain in sourceRelationships.`,
      {
        affectedCount: combosWithoutRuntimeEntree.size,
        recordIds: sampleIds(combosWithoutRuntimeEntree),
      },
    );
  }
  if (recordsById.size > 0) {
    addFinding(
      context,
      "warning",
      "schema_limitations",
      "source_identity_metadata_extension",
      "Chick-fil-A source IDs are retained in per-record metadata rather than first-class production schema fields.",
      {
        affectedCount: recordsById.size,
        recordIds: sampleIds(recordsById.keys()),
      },
    );
  }

  const runtimeOrphanIds = [...menuItemsById.values()]
    .filter(
      (record) =>
        record.value.servingType !== "addon" &&
        !runtimeReferencedMenuIds.has(record.id),
    )
    .map((record) => record.id);
  if (runtimeOrphanIds.length > 0) {
    addFinding(
      context,
      "warning",
      "categories",
      "runtime_navigation_orphans",
      `${runtimeOrphanIds.length} non-addon menu records are retained but are not reachable from category roots, variants, or runtime combo references.`,
      {
        affectedCount: runtimeOrphanIds.length,
        recordIds: sampleIds(runtimeOrphanIds),
      },
    );
  }

  setCheckDetails(context, "nutrition", {
    attachedNutritionRecords: recordsById.size - missingNutritionIds.size,
    attachedNutritionBySource: attachedNutritionSourceCounts,
    contextualNutritionRecords: contextualNutritionRecordCount,
    unavailableNutritionRecords: missingNutritionIds.size,
    suspiciousZeroMacroRecords: suspiciousZeroMacroIds.size,
  });
  setCheckDetails(context, "unresolved", {
    humanReviewRecords: unresolvedByStandardId.size,
    reasons: Object.fromEntries(
      [...unresolvedReasonCounts.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    missingNutritionRecords: missingNutritionIds.size,
  });
  setCheckDetails(context, "schema_limitations", {
    sourceGroupsPreservedInMetadata: sourceGroupsById.size,
    contextualConstraintOptions: contextualConstraintCount,
    contextualNutritionRecords: contextualNutritionRecordCount,
    contextualNutritionRelationships: contextualNutritionRelationshipCount,
    combosWithoutSingleRuntimeEntree: combosWithoutRuntimeEntree.size,
    sourceTracedRecords: sourceRecordIds.size,
  });

  const byCode = (findings: Finding[]): Record<string, number> =>
    Object.fromEntries(
      unique(findings.map((finding) => finding.code))
        .sort()
        .map((code) => [
          code,
          findings.filter((finding) => finding.code === code).length,
        ]),
    );
  const report = {
    restaurant: "Chick-fil-A",
    validatedAt: localDate(),
    inputs: {
      restaurant: "data/generated/chick-fil-a/restaurant.json",
      unresolved: "data/generated/chick-fil-a/unresolved.json",
    },
    valid: context.errors.length === 0,
    summary: {
      records: recordsById.size,
      menuItems: menuItemsById.size,
      ingredients: ingredientsById.size,
      nutritionAttached: recordsById.size - missingNutritionIds.size,
      mealContainers: comboIds.size,
      errors: context.errors.length,
      warnings: context.warnings.length,
      humanReview: unresolvedByStandardId.size,
      errorTypes: byCode(context.errors),
      warningTypes: byCode(context.warnings),
    },
    errors: context.errors,
    warnings: context.warnings,
    checks: context.checks,
  };

  await writeAtomically(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    [
      "Chick-fil-A validation complete.",
      "",
      `Records: ${recordsById.size}`,
      `Errors: ${context.errors.length}`,
      `Warnings: ${context.warnings.length}`,
      `Human review items: ${unresolvedByStandardId.size}`,
      "",
      "Report:",
      "data/validation/chick-fil-a/report.json",
    ].join("\n"),
  );

  if (context.errors.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
