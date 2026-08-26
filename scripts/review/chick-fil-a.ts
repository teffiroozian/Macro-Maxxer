import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const PRODUCTION_MENU_PATH = resolve("data/restaurants/chickfila.json");
const RESTAURANT_INDEX_PATH = resolve("data/restaurants/index.json");
const GENERATED_MENU_PATH = resolve("data/generated/chick-fil-a/restaurant.json");
const UNRESOLVED_PATH = resolve("data/generated/chick-fil-a/unresolved.json");
const ASSET_ROOT = resolve("public/restaurants/chickfila");
const JSON_OUTPUT_PATH = resolve("data/review/chick-fil-a/comparison.json");
const MARKDOWN_OUTPUT_PATH = resolve("data/review/chick-fil-a/comparison.md");
const MANUAL_REVIEW_PATH = resolve("data/review/chick-fil-a/manual-review.md");

type JsonObject = Record<string, unknown>;
type RecordKind = "menu_item" | "ingredient";
type Confidence = "high" | "medium" | "review";
type Action =
  | "no_action"
  | "review_needed"
  | "likely_preserve_production_enrichment"
  | "likely_generated_improvement"
  | "needs_source_verification"
  | "schema_limitation";
type Priority = "high" | "medium" | "low";

interface ComparableRecord {
  key: string;
  id: string;
  name: string;
  kind: RecordKind;
  value: JsonObject;
  normalizedNames: string[];
  categories: string[];
  servingType?: string;
}

interface TopAlignment {
  productionKey: string;
  productionId: string;
  generatedId?: string;
  productionName: string;
  generatedName?: string;
  strategy: "unique_normalized_name" | "unique_typed_normalized_name" | "ambiguous" | "unmatched";
  confidence: Confidence;
  possibleGeneratedIds: string[];
}

interface VariantAlignment {
  productionParentKey: string;
  productionParentId: string;
  productionVariantId: string;
  productionLabel: string;
  generatedParentId?: string;
  generatedId?: string;
  generatedLabel?: string;
  strategy:
    | "parent_variant_label"
    | "parent_variant_descriptor"
    | "parent_variant_containment"
    | "global_variant_descriptor"
    | "ambiguous"
    | "unmatched";
  confidence: Confidence;
  possibleGeneratedIds: string[];
}

interface ReviewFinding {
  id: string;
  item: string;
  differenceType: string;
  action: Action;
  confidence: Confidence;
  priority: Priority;
  priorityScore: number;
  reason: string;
  production?: unknown;
  generated?: unknown;
  productionId?: string;
  generatedId?: string;
}

interface CustomizationSnapshot {
  defaultIngredients: string[];
  allowedIngredients: string[];
  addons: string[];
}

const NUTRITION_FIELDS = [
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

const OPTIONAL_NUTRITION_FIELDS = new Set<string>([
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
]);

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function objects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
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

function sorted(values: Iterable<string>): string[] {
  return unique(values).sort((left, right) => left.localeCompare(right));
}

function compareStringSets(left: string[], right: string[]): {
  equivalent: boolean;
  productionOnly: string[];
  generatedOnly: string[];
} {
  const leftByNormalized = new Map(left.map((value) => [normalizeName(value), value]));
  const rightByNormalized = new Map(right.map((value) => [normalizeName(value), value]));
  return {
    equivalent:
      leftByNormalized.size === rightByNormalized.size &&
      [...leftByNormalized.keys()].every((key) => rightByNormalized.has(key)),
    productionOnly: sorted(
      [...leftByNormalized.entries()].flatMap(([key, value]) =>
        rightByNormalized.has(key) ? [] : [value],
      ),
    ),
    generatedOnly: sorted(
      [...rightByNormalized.entries()].flatMap(([key, value]) =>
        leftByNormalized.has(key) ? [] : [value],
      ),
    ),
  };
}

function getLocalDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
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

function generatedAliases(value: JsonObject): string[] {
  const source = isObject(value.source) ? value.source : undefined;
  const menu = source && isObject(source.menu) ? source.menu : undefined;
  return unique([text(value.name), ...strings(menu?.names)].filter((name): name is string => Boolean(name)));
}

function toProductionRecords(menu: JsonObject): ComparableRecord[] {
  const items = objects(menu.items).map((value) => ({ value, kind: "menu_item" as const }));
  const ingredients = objects(menu.ingredients).map((value) => ({ value, kind: "ingredient" as const }));
  return [...items, ...ingredients].flatMap(({ value, kind }) => {
    const id = text(value.id);
    const name = text(value.name);
    if (!id || !name) return [];
    return [{
      key: `${kind}:${id}`,
      id,
      name,
      kind,
      value,
      normalizedNames: [normalizeName(name)],
      categories: strings(value.categories),
      servingType: text(value.servingType),
    }];
  });
}

function toGeneratedRecords(menu: JsonObject): ComparableRecord[] {
  const items = objects(menu.items).map((value) => ({ value, kind: "menu_item" as const }));
  const ingredients = objects(menu.ingredients).map((value) => ({ value, kind: "ingredient" as const }));
  return [...items, ...ingredients].flatMap(({ value, kind }) => {
    const id = text(value.id);
    const name = text(value.name);
    if (!id || !name) return [];
    return [{
      key: `${kind}:${id}`,
      id,
      name,
      kind,
      value,
      normalizedNames: unique(generatedAliases(value).map(normalizeName)),
      categories: strings(value.categories),
      servingType: text(value.servingType),
    }];
  });
}

function categoryFamilies(record: ComparableRecord): Set<string> {
  const families = new Set<string>();
  const values = [...record.categories.map(normalizeName), normalizeName(record.name)];
  for (const value of values) {
    if (/breakfast|biscuit|muffin|hash brown|chick n minis/.test(value)) families.add("breakfast");
    if (/drink|beverage|coffee|tea|lemonade|sunjoy|soda|coca cola|dr pepper|milk|juice|water/.test(value)) families.add("drink");
    if (/side|fries|fruit cup|soup|parfait|mac cheese|salad side/.test(value)) families.add("side");
    if (/treat|dessert|milkshake|frosted|cookie|brownie|icedream/.test(value)) families.add("dessert");
    if (/sandwich|wrap|salad|chicken|entree|nugget|strip|filet/.test(value)) families.add("entree");
    if (/sauce|dressing|condiment|addon/.test(value)) families.add("addon");
    if (/ingredient|topping|bun|cheese|protein|egg/.test(value)) families.add("ingredient");
    if (/meal|combo/.test(value)) families.add("combo");
  }
  if (record.kind === "ingredient") families.add("ingredient");
  if (record.servingType === "addon") families.add("addon");
  if (record.servingType) families.add(record.servingType === "single" ? "entree" : record.servingType);
  return families;
}

function typesCompatible(production: ComparableRecord, generated: ComparableRecord): boolean {
  if (production.kind === "ingredient" && generated.kind === "ingredient") return true;
  if (production.kind === "ingredient" && generated.servingType === "addon") return true;
  if (production.kind === "menu_item" && generated.kind !== "menu_item") return false;
  const left = categoryFamilies(production);
  const right = categoryFamilies(generated);
  return [...left].some((family) => right.has(family));
}

function alignTopRecord(
  production: ComparableRecord,
  generatedRecords: ComparableRecord[],
): TopAlignment {
  const normalizedName = normalizeName(production.name);
  const candidates = generatedRecords.filter((record) => record.normalizedNames.includes(normalizedName));
  if (candidates.length === 1) {
    return {
      productionKey: production.key,
      productionId: production.id,
      generatedId: candidates[0].id,
      productionName: production.name,
      generatedName: candidates[0].name,
      strategy: "unique_normalized_name",
      confidence: "high",
      possibleGeneratedIds: [candidates[0].id],
    };
  }
  if (candidates.length > 1) {
    const typedCandidates = candidates.filter((candidate) => typesCompatible(production, candidate));
    if (typedCandidates.length === 1) {
      return {
        productionKey: production.key,
        productionId: production.id,
        generatedId: typedCandidates[0].id,
        productionName: production.name,
        generatedName: typedCandidates[0].name,
        strategy: "unique_typed_normalized_name",
        confidence: "high",
        possibleGeneratedIds: candidates.map((candidate) => candidate.id),
      };
    }
    return {
      productionKey: production.key,
      productionId: production.id,
      productionName: production.name,
      strategy: "ambiguous",
      confidence: "review",
      possibleGeneratedIds: candidates.map((candidate) => candidate.id),
    };
  }
  return {
    productionKey: production.key,
    productionId: production.id,
    productionName: production.name,
    strategy: "unmatched",
    confidence: "review",
    possibleGeneratedIds: [],
  };
}

interface VariantDescriptor {
  size?: string;
  count?: number;
  portion?: string;
}

function variantDescriptor(value: string): VariantDescriptor {
  const normalized = normalizeName(value);
  const size = normalized.match(/\b(small|medium|large)\b/)?.[1];
  const count = normalized.match(/\b(\d+)\s*(?:ct|count|pc|piece|pieces)\b/)?.[1];
  const portion = normalized.match(/\b(cup|bowl|regular|original|vanilla|granola|cookie crumbs|diet lemonade)\b/)?.[1];
  return {
    ...(size ? { size } : {}),
    ...(count ? { count: Number(count) } : {}),
    ...(portion ? { portion } : {}),
  };
}

function descriptorsEqual(left: VariantDescriptor, right: VariantDescriptor): boolean {
  const keys = ["size", "count", "portion"] as const;
  const populated = keys.filter((key) => left[key] !== undefined || right[key] !== undefined);
  return populated.length > 0 && populated.every((key) => left[key] === right[key]);
}

function stripLeadingVariantDescriptor(value: string): string {
  return normalizeName(value)
    .replace(/^(?:small|medium|large|regular|original|vanilla)\s+/, "")
    .replace(/^\d+\s*(?:ct|count|pc|piece|pieces)\s+/, "")
    .trim();
}

function alignVariants(
  productionParent: ComparableRecord,
  generatedParent: ComparableRecord | undefined,
  generatedById: Map<string, ComparableRecord>,
  generatedRecords: ComparableRecord[],
): VariantAlignment[] {
  const productionVariants = objects(productionParent.value.variants);
  if (productionVariants.length === 0) return [];
  const generatedParentVariants = generatedParent ? objects(generatedParent.value.variants) : [];

  return productionVariants.map((variant, index) => {
    const variantId = text(variant.id) ?? `variant-${index}`;
    const label = text(variant.label) ?? variantId;
    const normalizedLabel = normalizeName(label);
    const descriptor = variantDescriptor(`${variantId} ${label}`);
    const parentCandidates = generatedParentVariants.flatMap((candidate) => {
      const id = text(candidate.id);
      const candidateLabel = text(candidate.label);
      if (!id || !candidateLabel) return [];
      return [{ id, label: candidateLabel, record: generatedById.get(id) }];
    });
    const exact = parentCandidates.filter(
      (candidate) => normalizeName(candidate.label) === normalizedLabel,
    );
    if (exact.length === 1) {
      return {
        productionParentKey: productionParent.key,
        productionParentId: productionParent.id,
        productionVariantId: variantId,
        productionLabel: label,
        generatedParentId: generatedParent?.id,
        generatedId: exact[0].id,
        generatedLabel: exact[0].label,
        strategy: "parent_variant_label",
        confidence: "high",
        possibleGeneratedIds: [exact[0].id],
      };
    }
    const descriptorMatches = parentCandidates.filter((candidate) =>
      descriptorsEqual(descriptor, variantDescriptor(candidate.label)),
    );
    if (descriptorMatches.length === 1) {
      return {
        productionParentKey: productionParent.key,
        productionParentId: productionParent.id,
        productionVariantId: variantId,
        productionLabel: label,
        generatedParentId: generatedParent?.id,
        generatedId: descriptorMatches[0].id,
        generatedLabel: descriptorMatches[0].label,
        strategy: "parent_variant_descriptor",
        confidence: "high",
        possibleGeneratedIds: [descriptorMatches[0].id],
      };
    }
    const containmentMatches = parentCandidates.filter((candidate) =>
      normalizeName(candidate.label).includes(normalizedLabel),
    );
    if (normalizedLabel.length >= 4 && containmentMatches.length === 1) {
      return {
        productionParentKey: productionParent.key,
        productionParentId: productionParent.id,
        productionVariantId: variantId,
        productionLabel: label,
        generatedParentId: generatedParent?.id,
        generatedId: containmentMatches[0].id,
        generatedLabel: containmentMatches[0].label,
        strategy: "parent_variant_containment",
        confidence: "high",
        possibleGeneratedIds: [containmentMatches[0].id],
      };
    }

    const baseName = normalizeName(productionParent.name);
    const globalMatches = generatedRecords.filter((candidate) => {
      if (!typesCompatible(productionParent, candidate)) return false;
      if (!descriptorsEqual(descriptor, variantDescriptor(candidate.name))) return false;
      return candidate.normalizedNames.some(
        (name) => stripLeadingVariantDescriptor(name) === baseName,
      );
    });
    if (globalMatches.length === 1) {
      return {
        productionParentKey: productionParent.key,
        productionParentId: productionParent.id,
        productionVariantId: variantId,
        productionLabel: label,
        generatedParentId: generatedParent?.id,
        generatedId: globalMatches[0].id,
        generatedLabel: globalMatches[0].name,
        strategy: "global_variant_descriptor",
        confidence: "high",
        possibleGeneratedIds: [globalMatches[0].id],
      };
    }
    const possibilities = unique([
      ...descriptorMatches.map((candidate) => candidate.id),
      ...containmentMatches.map((candidate) => candidate.id),
      ...globalMatches.map((candidate) => candidate.id),
    ]);
    return {
      productionParentKey: productionParent.key,
      productionParentId: productionParent.id,
      productionVariantId: variantId,
      productionLabel: label,
      generatedParentId: generatedParent?.id,
      strategy: possibilities.length > 1 ? "ambiguous" : "unmatched",
      confidence: "review",
      possibleGeneratedIds: possibilities,
    };
  });
}

function nutritionObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function nutritionDifferences(
  production: JsonObject | undefined,
  generated: JsonObject | undefined,
): Array<{ field: string; production: number | null; generated: number | null }> {
  const differences: Array<{ field: string; production: number | null; generated: number | null }> = [];
  for (const field of NUTRITION_FIELDS) {
    const productionValue = typeof production?.[field] === "number" ? production[field] as number : null;
    const generatedValue = typeof generated?.[field] === "number" ? generated[field] as number : null;
    if (
      OPTIONAL_NUTRITION_FIELDS.has(field) &&
      productionValue === null &&
      generatedValue !== null
    ) {
      continue;
    }
    if (productionValue !== generatedValue) {
      differences.push({ field, production: productionValue, generated: generatedValue });
    }
  }
  return differences;
}

function additionalGeneratedNutritionFields(
  production: JsonObject | undefined,
  generated: JsonObject | undefined,
): string[] {
  return NUTRITION_FIELDS.filter((field) =>
    OPTIONAL_NUTRITION_FIELDS.has(field) &&
    typeof production?.[field] !== "number" &&
    typeof generated?.[field] === "number"
  );
}

function compactNutrition(value: JsonObject | undefined): Record<string, number> | null {
  if (!value) return null;
  return Object.fromEntries(
    NUTRITION_FIELDS.flatMap((field) =>
      typeof value[field] === "number" ? [[field, value[field] as number]] : [],
    ),
  );
}

function sourceNutritionSummary(record: ComparableRecord | undefined): unknown {
  if (!record) return null;
  const source = isObject(record.value.source) ? record.value.source : undefined;
  const nutrition = source && isObject(source.nutrition) ? source.nutrition : undefined;
  return nutrition
      ? {
        nutritionSource: nutrition.nutritionSource,
        sourceId: nutrition.sourceId,
        candidateSourceIds: nutrition.candidateSourceIds,
        name: nutrition.name,
        matchStatus: nutrition.matchStatus,
        matchRule: nutrition.matchRule,
        attached: nutrition.attached,
        attachmentReason: nutrition.attachmentReason,
        servingSize: nutrition.servingSize,
        orderingSourceUrl: nutrition.orderingSourceUrl,
        orderingRetailModifiedItemId: nutrition.orderingRetailModifiedItemId,
        orderingTag: nutrition.orderingTag,
        orderingDefaultModifierSourceIds:
          nutrition.orderingDefaultModifierSourceIds,
      }
    : null;
}

function contextualNutritionSummary(record: ComparableRecord): unknown[] {
  return objects(record.value.contextualNutritionUnits).map((unit) => ({
    nutrition: compactNutrition(nutritionObject(unit.nutrition)),
    source: isObject(unit.source) ? unit.source : null,
  }));
}

function hasConfidentAttachedOfficialNutrition(record: ComparableRecord): boolean {
  const source = isObject(record.value.source) ? record.value.source : undefined;
  const nutrition = source && isObject(source.nutrition) ? source.nutrition : undefined;
  const status = text(nutrition?.matchStatus);
  return (
    nutrition?.attached === true &&
    [
      "exact_match",
      "normalized_match",
      "variant_rule_match",
      "multiple_identical_official_matches",
      "ordering_source_match",
    ].includes(status ?? "")
  );
}

function priorityScore(item: string, differenceType: string, record?: ComparableRecord): number {
  const normalized = normalizeName(item);
  let score = 20;
  if (/nutrition|unresolved|ambiguous|conflict/.test(differenceType)) score += 50;
  if (/customization/.test(differenceType)) score += 35;
  if (/combo|meal/.test(differenceType) || /meal/.test(normalized)) score += 30;
  if (/sandwich|nugget|strip|salad|wrap|filet/.test(normalized)) score += 25;
  if (/fries|side|drink|coffee|tea|lemonade|sauce/.test(normalized)) score += 15;
  if (record?.servingType === "addon" || record?.kind === "ingredient") score -= 20;
  if (/prize|no toy|no ice|extra ice|salt packet|pepper$/.test(normalized)) score -= 60;
  return score;
}

function priorityFromScore(score: number): Priority {
  if (score >= 75) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function finding(
  input: Omit<ReviewFinding, "priority" | "priorityScore"> & {
    record?: ComparableRecord;
  },
): ReviewFinding {
  const score = priorityScore(input.item, input.differenceType, input.record);
  const result = {
    ...input,
    priority: priorityFromScore(score),
    priorityScore: score,
  } as ReviewFinding & { record?: ComparableRecord };
  delete result.record;
  return result;
}

function sortFindings(values: ReviewFinding[]): ReviewFinding[] {
  return [...values].sort(
    (left, right) =>
      right.priorityScore - left.priorityScore ||
      left.item.localeCompare(right.item) ||
      left.id.localeCompare(right.id),
  );
}

function semanticCategoryEquivalent(
  production: ComparableRecord,
  generated: ComparableRecord,
): boolean {
  const left = categoryFamilies(production);
  const right = categoryFamilies(generated);
  return [...left].some((family) => right.has(family));
}

function servingTypeEquivalent(left?: string, right?: string): boolean {
  if (left === right) return true;
  if (left === "single" && right === "entree") return true;
  if (left === "breakfast" && (right === "breakfast" || right === "entree")) return true;
  if (left === "side" && right === "dessert") return true;
  return false;
}

function resolveRecordNames(ids: string[], recordsById: Map<string, ComparableRecord>): string[] {
  return sorted(ids.flatMap((id) => recordsById.get(id)?.name ?? [id]));
}

function productionCustomization(
  record: ComparableRecord,
  productionMenu: JsonObject,
  productionById: Map<string, ComparableRecord>,
): CustomizationSnapshot {
  if (record.kind !== "menu_item") {
    return { defaultIngredients: [], allowedIngredients: [], addons: [] };
  }
  const defaultIngredients = resolveRecordNames(strings(record.value.ingredients), productionById);
  const explicitCustomization = isObject(record.value.customization)
    ? record.value.customization
    : undefined;
  const explicitCategories = explicitCustomization
    ? objects(explicitCustomization.ingredientCategories)
    : [];
  const rules = isObject(productionMenu.customizationRules)
    ? productionMenu.customizationRules
    : undefined;
  const foodRules = rules && isObject(rules.foodCategories) ? rules.foodCategories : {};
  const primaryCategory = record.categories[0];
  const foodRule = Object.entries(foodRules).find(
    ([name]) => normalizeName(name) === normalizeName(primaryCategory ?? ""),
  )?.[1];
  const foodRuleObject = isObject(foodRule) ? foodRule : undefined;
  const configuredCategoryNames = explicitCategories.length > 0
    ? explicitCategories.flatMap((category) => text(category.name) ?? [])
    : strings(foodRuleObject?.ingredientCategories);
  const optionsByCategory = foodRuleObject && isObject(foodRuleObject.ingredientOptionsByCategory)
    ? foodRuleObject.ingredientOptionsByCategory
    : {};
  const productionIngredients = [...productionById.values()].filter(
    (candidate) => candidate.kind === "ingredient",
  );
  const allowedIngredientIds = new Set<string>();
  for (const categoryName of configuredCategoryNames) {
    const explicit = explicitCategories.find(
      (category) => normalizeName(text(category.name) ?? "") === normalizeName(categoryName),
    );
    const explicitIds = explicit ? strings(explicit.ingredients) : [];
    const ruleIds = Object.entries(optionsByCategory).find(
      ([name]) => normalizeName(name) === normalizeName(categoryName),
    )?.[1];
    const categoryIds = explicitIds.length > 0
      ? explicitIds
      : strings(ruleIds).length > 0
        ? strings(ruleIds)
        : productionIngredients
            .filter((candidate) =>
              candidate.categories.some(
                (category) => normalizeName(category) === normalizeName(categoryName),
              ),
            )
            .map((candidate) => candidate.id);
    categoryIds.forEach((id) => allowedIngredientIds.add(id));
  }
  const addonGroups = isObject(productionMenu.addonGroups) ? productionMenu.addonGroups : {};
  const addonIds = strings(record.value.addonRefs).flatMap((ref) => {
    const group = addonGroups[ref];
    return isObject(group) ? strings(group.itemIds) : [];
  });
  return {
    defaultIngredients,
    allowedIngredients: resolveRecordNames([...allowedIngredientIds], productionById),
    addons: resolveRecordNames(addonIds, productionById),
  };
}

function generatedCustomization(
  record: ComparableRecord,
  generatedMenu: JsonObject,
  generatedById: Map<string, ComparableRecord>,
): CustomizationSnapshot {
  if (record.kind !== "menu_item") {
    return { defaultIngredients: [], allowedIngredients: [], addons: [] };
  }
  const relatedRecords = [record];
  for (const variant of objects(record.value.variants)) {
    const id = text(variant.id);
    const target = id ? generatedById.get(id) : undefined;
    if (target) relatedRecords.push(target);
  }
  const defaultIngredientIds = new Set<string>();
  const allowedIngredientIds = new Set<string>();
  const addonIds = new Set<string>();
  const addonGroups = isObject(generatedMenu.addonGroups) ? generatedMenu.addonGroups : {};
  for (const related of relatedRecords) {
    strings(related.value.ingredients).forEach((id) => defaultIngredientIds.add(id));
    const customization = isObject(related.value.customization)
      ? related.value.customization
      : undefined;
    for (const category of objects(customization?.ingredientCategories)) {
      strings(category.ingredients).forEach((id) => allowedIngredientIds.add(id));
    }
    for (const ref of strings(related.value.addonRefs)) {
      const group = addonGroups[ref];
      if (!isObject(group)) continue;
      strings(group.itemIds).forEach((id) => addonIds.add(id));
    }
  }
  return {
    defaultIngredients: resolveRecordNames([...defaultIngredientIds], generatedById),
    allowedIngredients: resolveRecordNames([...allowedIngredientIds], generatedById),
    addons: resolveRecordNames([...addonIds], generatedById),
  };
}

function productionSummary(record: ComparableRecord): JsonObject {
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    categories: record.categories,
    servingType: record.servingType ?? null,
  };
}

function generatedSummary(record: ComparableRecord): JsonObject {
  const source = isObject(record.value.source) ? record.value.source : undefined;
  const menu = source && isObject(source.menu) ? source.menu : undefined;
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    categories: record.categories,
    servingType: record.servingType ?? null,
    sourceRecordId: menu?.recordId ?? null,
    retailModifiedItemId: menu?.retailModifiedItemId ?? null,
    itemGroupId: menu?.itemGroupId ?? null,
    sellable: menu?.sellable ?? null,
    sourceOnly: record.value.sourceOnly === true,
  };
}

function markdownValue(value: unknown): string {
  if (value === null || value === undefined) return "unavailable";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const serialized = JSON.stringify(value);
  const concise = serialized.length > 700 ? `${serialized.slice(0, 700)}…` : serialized;
  return `\`${concise}\``;
}

function compactMacroText(value: unknown): string {
  if (!isObject(value)) return "Unavailable";
  const calories = typeof value.calories === "number" ? `${value.calories} cal` : "calories unavailable";
  const protein = typeof value.protein === "number" ? `${value.protein}g P` : "P —";
  const carbs = typeof value.carbs === "number" ? `${value.carbs}g C` : "C —";
  const fat = typeof value.totalFat === "number" ? `${value.totalFat}g F` : "F —";
  return `${calories}; ${protein}; ${carbs}; ${fat}`;
}

function markdownTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function markdownFinding(entry: ReviewFinding): string {
  return [
    `### ${entry.item}`,
    "",
    `- Action: \`${entry.action}\``,
    `- Difference: \`${entry.differenceType}\``,
    `- Confidence: \`${entry.confidence}\``,
    `- Reason: ${entry.reason}`,
    ...(entry.production !== undefined ? [`- Production: ${markdownValue(entry.production)}`] : []),
    ...(entry.generated !== undefined ? [`- Generated: ${markdownValue(entry.generated)}`] : []),
    "",
  ].join("\n");
}

function markdownSection(
  title: string,
  entries: ReviewFinding[],
  limit: number,
  emptyMessage: string,
): string {
  if (entries.length === 0) return `## ${title}\n\n${emptyMessage}\n`;
  const shown = entries.slice(0, limit);
  return [
    `## ${title}`,
    "",
    ...shown.map(markdownFinding),
    ...(entries.length > shown.length
      ? [`_${entries.length - shown.length} additional entries are available in comparison.json._`, ""]
      : []),
  ].join("\n");
}

async function main(): Promise<void> {
  const [productionValue, indexValue, generatedValue, unresolvedValue, assetEntries] = await Promise.all([
    readJson(PRODUCTION_MENU_PATH),
    readJson(RESTAURANT_INDEX_PATH),
    readJson(GENERATED_MENU_PATH),
    readJson(UNRESOLVED_PATH),
    readdir(ASSET_ROOT, { recursive: true, withFileTypes: true }),
  ]);
  if (!isObject(productionValue) || !isObject(generatedValue) || !isObject(unresolvedValue)) {
    throw new Error("Production, generated, and unresolved inputs must be JSON objects.");
  }
  const productionMenu = productionValue;
  const generatedMenu = generatedValue;
  const restaurantIndex = Array.isArray(indexValue) ? indexValue.filter(isObject) : [];
  const chickfilaIndex = restaurantIndex.find((entry) => entry.id === "chickfila");
  const unresolvedRecords = objects(unresolvedValue.records);

  const productionRecords = toProductionRecords(productionMenu);
  const generatedRecords = toGeneratedRecords(generatedMenu);
  const runtimeIntegration = isObject(generatedMenu.runtimeIntegration)
    ? generatedMenu.runtimeIntegration
    : undefined;
  const runtimeVisibleIds = new Set(
    objects(runtimeIntegration?.visibleItems).flatMap((entry) => {
      const id = text(entry.itemId);
      return id ? [id] : [];
    }),
  );
  const runtimeCustomizationIds = new Set(
    objects(runtimeIntegration?.customizationItems).flatMap((entry) => {
      const id = text(entry.itemId);
      return id ? [id] : [];
    }),
  );
  const runtimeIntegratedIds = new Set([
    ...runtimeVisibleIds,
    ...runtimeCustomizationIds,
  ]);
  const runtimeDeferredIds = new Set(
    objects(runtimeIntegration?.deferredItems).flatMap((entry) => {
      const id = text(entry.itemId);
      return id ? [id] : [];
    }),
  );
  const productionByKey = new Map(productionRecords.map((record) => [record.key, record]));
  const productionById = new Map(productionRecords.map((record) => [record.id, record]));
  const generatedById = new Map(generatedRecords.map((record) => [record.id, record]));
  const unresolvedByGeneratedId = new Map(
    unresolvedRecords.flatMap((record) => {
      const id = text(record.standardizedRecordId);
      return id ? [[id, record] as const] : [];
    }),
  );

  const topAlignments = productionRecords.map((record) =>
    alignTopRecord(record, generatedRecords),
  );
  const topAlignmentByProductionKey = new Map(
    topAlignments.map((alignment) => [alignment.productionKey, alignment]),
  );
  const variantAlignments = productionRecords.flatMap((production) => {
    const top = topAlignmentByProductionKey.get(production.key);
    const generatedParent = top?.generatedId ? generatedById.get(top.generatedId) : undefined;
    return alignVariants(production, generatedParent, generatedById, generatedRecords);
  });

  const generatedToProduction = new Map<string, string[]>();
  for (const alignment of topAlignments) {
    if (!alignment.generatedId) continue;
    generatedToProduction.set(alignment.generatedId, [
      ...(generatedToProduction.get(alignment.generatedId) ?? []),
      alignment.productionKey,
    ]);
  }
  for (const alignment of variantAlignments) {
    if (!alignment.generatedId) continue;
    generatedToProduction.set(alignment.generatedId, [
      ...(generatedToProduction.get(alignment.generatedId) ?? []),
      `${alignment.productionParentKey}#${alignment.productionVariantId}`,
    ]);
  }

  const nutritionReview: ReviewFinding[] = [];
  const menuStructureReview: ReviewFinding[] = [];
  const customizationReview: ReviewFinding[] = [];
  const acceptedOfficialNutrition: ReviewFinding[] = [];
  const acceptedOfficialCustomization: ReviewFinding[] = [];
  const safeEquivalent: Array<Record<string, unknown>> = [];
  const generatedAdditionalNutritionFieldUnits = new Set<string>();

  for (const alignment of topAlignments) {
    const production = productionByKey.get(alignment.productionKey);
    if (!production) continue;
    if (!alignment.generatedId) {
      const candidates = alignment.possibleGeneratedIds.map((id) => generatedById.get(id)?.name ?? id);
      menuStructureReview.push(
        finding({
          id: `menu:${production.id}:${alignment.strategy}`,
          item: production.name,
          differenceType: alignment.strategy === "ambiguous" ? "ambiguous_alignment" : "production_only_record",
          action: alignment.strategy === "ambiguous" ? "needs_source_verification" : "review_needed",
          confidence: "review",
          reason: alignment.strategy === "ambiguous"
            ? "Multiple generated records share the same conservatively normalized identity."
            : "No generated record has the same safely normalized identity.",
          production: productionSummary(production),
          generated: candidates,
          productionId: production.id,
          record: production,
        }),
      );
      continue;
    }
    const generated = generatedById.get(alignment.generatedId);
    if (!generated) continue;
    let findingCount = 0;
    const productionNutrition = nutritionObject(production.value.nutrition);
    const generatedNutrition = nutritionObject(generated.value.nutrition);
    const generatedContextualNutrition = contextualNutritionSummary(generated);
    if (additionalGeneratedNutritionFields(productionNutrition, generatedNutrition).length > 0) {
      generatedAdditionalNutritionFieldUnits.add(`top:${production.id}:${generated.id}`);
    }
    const nutritionDelta = nutritionDifferences(productionNutrition, generatedNutrition);
    if (!generatedNutrition && generatedContextualNutrition.length > 0) {
      acceptedOfficialNutrition.push(
        finding({
          id: `nutrition:contextual:${production.id}:${generated.id}`,
          item: production.name,
          differenceType: "contextual_official_nutrition_replaces_global_value",
          action: "no_action",
          confidence: alignment.confidence,
          reason:
            "The current official source selects nutrition by parent relationship tag, so one historical production value is not a safe global comparison.",
          production: { nutrition: compactNutrition(productionNutrition) },
          generated: { contextualNutritionUnits: generatedContextualNutrition },
          productionId: production.id,
          generatedId: generated.id,
          record: production,
        }),
      );
    } else if (nutritionDelta.length > 0) {
      const unresolved = unresolvedByGeneratedId.get(generated.id);
      const generatedMissing = !generatedNutrition;
      const productionMissing = !productionNutrition;
      const target = generatedNutrition && hasConfidentAttachedOfficialNutrition(generated)
        ? acceptedOfficialNutrition
        : nutritionReview;
      target.push(
        finding({
          id: `nutrition:top:${production.id}:${generated.id}`,
          item: production.name,
          differenceType: generatedMissing
            ? "generated_unresolved_production_has_nutrition"
            : productionMissing
              ? "production_missing_generated_has_nutrition"
              : "nutrition_values_differ",
          action: target === acceptedOfficialNutrition
            ? "no_action"
            : generatedMissing
            ? "needs_source_verification"
            : productionMissing
              ? "likely_generated_improvement"
              : "review_needed",
          confidence: alignment.confidence,
          reason: target === acceptedOfficialNutrition
            ? "Current official nutrition has confident provenance and is accepted over the historical production value."
            : generatedMissing
            ? "Production provides nutrition evidence, but the generated official match remains unresolved and must not be auto-resolved."
            : productionMissing
              ? "The generated official source has nutrition absent from production."
              : `${nutritionDelta.length} nutrition fields differ between production and generated data.`,
          production: { nutrition: compactNutrition(productionNutrition) },
          generated: {
            nutrition: compactNutrition(generatedNutrition),
            differences: nutritionDelta,
            source: sourceNutritionSummary(generated),
            unresolvedReason: unresolved?.reason ?? null,
          },
          productionId: production.id,
          generatedId: generated.id,
          record: production,
        }),
      );
      if (target === nutritionReview) findingCount += 1;
    }

    if (!semanticCategoryEquivalent(production, generated)) {
      menuStructureReview.push(
        finding({
          id: `menu:category:${production.id}:${generated.id}`,
          item: production.name,
          differenceType: "category_placement_differs",
          action: "review_needed",
          confidence: alignment.confidence,
          reason: "Production and generated category families do not overlap.",
          production: production.categories,
          generated: generated.categories,
          productionId: production.id,
          generatedId: generated.id,
          record: production,
        }),
      );
      findingCount += 1;
    }
    if (!servingTypeEquivalent(production.servingType, generated.servingType)) {
      menuStructureReview.push(
        finding({
          id: `menu:serving:${production.id}:${generated.id}`,
          item: production.name,
          differenceType: "serving_type_differs",
          action: production.servingType === "single" || generated.servingType === "combo"
            ? "schema_limitation"
            : "review_needed",
          confidence: alignment.confidence,
          reason: "The same identity is modeled with different serving semantics.",
          production: production.servingType ?? null,
          generated: generated.servingType ?? null,
          productionId: production.id,
          generatedId: generated.id,
          record: production,
        }),
      );
      findingCount += 1;
    }

    const productionCustom = productionCustomization(production, productionMenu, productionById);
    const generatedCustom = generatedCustomization(generated, generatedMenu, generatedById);
    const defaultIngredients = compareStringSets(
      productionCustom.defaultIngredients,
      generatedCustom.defaultIngredients,
    );
    const allowedIngredients = compareStringSets(
      productionCustom.allowedIngredients,
      generatedCustom.allowedIngredients,
    );
    const addons = compareStringSets(productionCustom.addons, generatedCustom.addons);
    if (!defaultIngredients.equivalent || !allowedIngredients.equivalent || !addons.equivalent) {
      acceptedOfficialCustomization.push(
        finding({
          id: `customization:${production.id}:${generated.id}`,
          item: production.name,
          differenceType: "effective_customization_differs",
          action: "no_action",
          confidence: alignment.confidence,
          reason: "Current official contextual modifier roles and item-to-option relationships are accepted for defaults and availability; historical production behavior remains preservation evidence only.",
          production: productionCustom,
          generated: {
            snapshot: generatedCustom,
            differences: { defaultIngredients, allowedIngredients, addons },
          },
          productionId: production.id,
          generatedId: generated.id,
          record: production,
        }),
      );
    }
    if (findingCount === 0) {
      safeEquivalent.push({
        comparisonUnit: "top_level_record",
        production: productionSummary(production),
        generated: generatedSummary(generated),
        alignment: {
          strategy: alignment.strategy,
          confidence: alignment.confidence,
        },
        action: "no_action",
      });
    }
  }

  for (const alignment of variantAlignments) {
    const parent = productionByKey.get(alignment.productionParentKey);
    const variant = objects(parent?.value.variants).find(
      (candidate) => text(candidate.id) === alignment.productionVariantId,
    );
    if (!parent || !variant) continue;
    if (!alignment.generatedId) {
      menuStructureReview.push(
        finding({
          id: `menu:variant:${parent.id}:${alignment.productionVariantId}`,
          item: `${parent.name} — ${alignment.productionLabel}`,
          differenceType: alignment.strategy === "ambiguous"
            ? "ambiguous_variant_alignment"
            : "production_variant_not_found_generated",
          action: alignment.strategy === "ambiguous" ? "needs_source_verification" : "review_needed",
          confidence: "review",
          reason: alignment.strategy === "ambiguous"
            ? "Multiple generated variants satisfy the same explicit descriptor."
            : "No generated variant in the aligned product group has the same label, size, count, or explicit portion descriptor.",
          production: {
            parentId: parent.id,
            variantId: alignment.productionVariantId,
            label: alignment.productionLabel,
          },
          generated: alignment.possibleGeneratedIds,
          productionId: parent.id,
          record: parent,
        }),
      );
      continue;
    }
    const generated = generatedById.get(alignment.generatedId);
    if (!generated) continue;
    const productionNutrition = nutritionObject(variant.nutrition);
    const generatedNutrition = nutritionObject(generated.value.nutrition);
    if (additionalGeneratedNutritionFields(productionNutrition, generatedNutrition).length > 0) {
      generatedAdditionalNutritionFieldUnits.add(
        `variant:${parent.id}:${alignment.productionVariantId}:${generated.id}`,
      );
    }
    const delta = nutritionDifferences(productionNutrition, generatedNutrition);
    if (delta.length > 0) {
      const unresolved = unresolvedByGeneratedId.get(generated.id);
      const target = generatedNutrition && hasConfidentAttachedOfficialNutrition(generated)
        ? acceptedOfficialNutrition
        : nutritionReview;
      target.push(
        finding({
          id: `nutrition:variant:${parent.id}:${alignment.productionVariantId}:${generated.id}`,
          item: `${parent.name} — ${alignment.productionLabel}`,
          differenceType: generatedNutrition
            ? "variant_nutrition_values_differ"
            : "generated_variant_unresolved_production_has_nutrition",
          action: target === acceptedOfficialNutrition
            ? "no_action"
            : generatedNutrition
              ? "review_needed"
              : "needs_source_verification",
          confidence: alignment.confidence,
          reason: target === acceptedOfficialNutrition
            ? "Current official variant nutrition has confident provenance and is accepted over the historical production value."
            : generatedNutrition
            ? `${delta.length} variant nutrition fields differ.`
            : "Production provides variant nutrition, but the official generated target remains unresolved.",
          production: { nutrition: compactNutrition(productionNutrition) },
          generated: {
            id: generated.id,
            nutrition: compactNutrition(generatedNutrition),
            differences: delta,
            source: sourceNutritionSummary(generated),
            unresolvedReason: unresolved?.reason ?? null,
          },
          productionId: parent.id,
          generatedId: generated.id,
          record: parent,
        }),
      );
    }
    if (delta.length === 0 || hasConfidentAttachedOfficialNutrition(generated)) {
      safeEquivalent.push({
        comparisonUnit: "variant",
        production: {
          parentId: parent.id,
          parentName: parent.name,
          variantId: alignment.productionVariantId,
          label: alignment.productionLabel,
        },
        generated: generatedSummary(generated),
        alignment: {
          strategy: alignment.strategy,
          confidence: alignment.confidence,
        },
        action: "no_action",
      });
    }
  }

  for (const [generatedId, productionIds] of generatedToProduction) {
    if (productionIds.length < 2) continue;
    const generated = generatedById.get(generatedId);
    if (!generated) continue;
    menuStructureReview.push(
      finding({
        id: `menu:production-duplicates:${generatedId}`,
        item: generated.name,
        differenceType: "multiple_production_records_one_generated_identity",
        action: "likely_generated_improvement",
        confidence: "high",
        reason: "Production models one Chick-fil-A source identity more than once; generated data deduplicates it.",
        production: productionIds,
        generated: generatedSummary(generated),
        generatedId,
        record: generated,
      }),
    );
  }

  const consumedGeneratedIds = new Set(generatedToProduction.keys());
  const generatedOnlyRecords = generatedRecords.filter(
    (record) => !consumedGeneratedIds.has(record.id),
  );
  for (const generated of generatedOnlyRecords) {
    const unresolved = unresolvedByGeneratedId.get(generated.id);
    const source = isObject(generated.value.source) ? generated.value.source : undefined;
    const menu = source && isObject(source.menu) ? source.menu : undefined;
    const sourceOnly = menu?.sellable !== true;
    menuStructureReview.push(
      finding({
        id: `menu:generated-only:${generated.id}`,
        item: generated.name,
        differenceType: sourceOnly ? "source_only_structural_record" : "generated_only_record",
        action: sourceOnly
          ? "no_action"
          : unresolved
          ? "needs_source_verification"
          : menu?.sellable === true
            ? "likely_generated_improvement"
            : "review_needed",
        confidence: "high",
        reason: sourceOnly
          ? "This non-sellable official record is preserved for relationships and explicitly marked source-only, not as a user-facing card."
          : unresolved
          ? "Official menu structure contains this record, but its nutrition remains unresolved."
          : "Official generated data contains a source-traceable record with no safely aligned production identity.",
        production: null,
        generated: {
          ...generatedSummary(generated),
          unresolvedReason: unresolved?.reason ?? null,
        },
        generatedId: generated.id,
        record: generated,
      }),
    );
  }

  const productionLegacyComboEligible = productionRecords.filter((record) =>
    record.kind === "menu_item" &&
    record.categories.some((category) =>
      ["sandwich", "chicken", "salad", "wrap", "breakfast"].includes(normalizeName(category)),
    ),
  );
  const generatedCombos = generatedRecords.filter((record) => record.servingType === "combo");
  customizationReview.push(
    finding({
      id: "customization:legacy-combo-vs-official-meals",
      item: "Combo and meal behavior",
      differenceType: "legacy_combo_behavior_vs_official_meal_containers",
      action: "schema_limitation",
      confidence: "high",
      reason: "Production derives combo eligibility from Chick-fil-A-specific category helpers, while generated data represents official meal containers and explicit side/drink relationships.",
      production: {
        implicitComboEligibleItems: productionLegacyComboEligible.length,
        helper: "lib/comboMeals.ts",
      },
      generated: {
        explicitMealContainers: generatedCombos.length,
        mealContainersWithoutSingleRuntimeEntree: generatedCombos.filter(
          (record) => !isObject(record.value.comboConfig) || !text((record.value.comboConfig as JsonObject).entreeItemId),
        ).length,
      },
    }),
  );

  const unresolvedWithProductionEvidence: ReviewFinding[] = [];
  const reverseVariantEvidence = new Map<string, VariantAlignment[]>();
  for (const alignment of variantAlignments) {
    if (!alignment.generatedId) continue;
    reverseVariantEvidence.set(alignment.generatedId, [
      ...(reverseVariantEvidence.get(alignment.generatedId) ?? []),
      alignment,
    ]);
  }
  for (const unresolved of unresolvedRecords) {
    const generatedId = text(unresolved.standardizedRecordId);
    const names = strings(unresolved.names);
    if (!generatedId || names.length === 0) continue;
    const normalizedNames = new Set(names.map(normalizeName));
    const topEvidence = productionRecords.filter((record) =>
      normalizedNames.has(normalizeName(record.name)),
    );
    const variantEvidence = reverseVariantEvidence.get(generatedId) ?? [];
    if (topEvidence.length === 0 && variantEvidence.length === 0) continue;
    const productionEvidence = [
      ...topEvidence.map((record) => ({
        type: "top_level_record",
        id: record.id,
        name: record.name,
        nutrition: compactNutrition(nutritionObject(record.value.nutrition)),
        variants: objects(record.value.variants).map((variant) => ({
          id: variant.id,
          label: variant.label,
          nutrition: compactNutrition(nutritionObject(variant.nutrition)),
        })),
      })),
      ...variantEvidence.flatMap((alignment) => {
        const parent = productionByKey.get(alignment.productionParentKey);
        const variant = objects(parent?.value.variants).find(
          (candidate) => text(candidate.id) === alignment.productionVariantId,
        );
        return parent && variant
          ? [{
              type: "variant",
              parentId: parent.id,
              parentName: parent.name,
              variantId: alignment.productionVariantId,
              label: alignment.productionLabel,
              nutrition: compactNutrition(nutritionObject(variant.nutrition)),
            }]
          : [];
      }),
    ];
    unresolvedWithProductionEvidence.push(
      finding({
        id: `unresolved-evidence:${generatedId}`,
        item: names[0],
        differenceType: "unresolved_with_production_evidence",
        action: "needs_source_verification",
        confidence: topEvidence.length + variantEvidence.length === 1 ? "medium" : "review",
        reason: "Production contains a likely same-name or explicitly aligned variant, but it is historical evidence rather than authority for resolving the official ambiguity.",
        production: productionEvidence,
        generated: {
          id: generatedId,
          reason: unresolved.reason,
          matchStatus: unresolved.matchStatus,
          candidates: objects(unresolved.candidateNutritionRows),
        },
        generatedId,
        record: generatedById.get(generatedId),
      }),
    );
  }

  const productionEnrichment = productionRecords.map((record) => {
    const fields = [
      ...(text(record.value.image)?.startsWith("/restaurants/chickfila/") ? ["local curated image"] : []),
      ...(typeof record.value.defaultOrder === "number" ? ["authored display order"] : []),
      ...(record.categories.length > 0 ? ["authored display categories"] : []),
      ...(record.value.hideFromIngredientView === true ? ["ingredient visibility override"] : []),
      ...(record.value.customization !== undefined ? ["item customization override"] : []),
      ...(strings(record.value.addonRefs).length > 0 ? ["addon eligibility/group assignment"] : []),
      ...(record.value.hideVariantSelector === true || record.value.disableVariantSelector === true
        ? ["variant selector display override"]
        : []),
    ];
    return {
      id: `production-enrichment:${record.kind}:${record.id}`,
      item: record.name,
      productionId: record.id,
      fields,
      action: "likely_preserve_production_enrichment" as const,
      reason: "These fields control Macro Maxxer presentation or authored behavior and are not safely replaceable from source matching alone.",
    };
  });
  const assetFiles = assetEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.parentPath
      ? `${entry.parentPath.replace(`${ASSET_ROOT}/`, "")}/${entry.name}`
      : entry.name)
    .sort();
  const globalProductionEnrichment = [
    {
      id: "restaurant-index-metadata",
      files: ["data/restaurants/index.json"],
      values: chickfilaIndex ?? null,
      action: "likely_preserve_production_enrichment" as const,
    },
    {
      id: "local-brand-and-menu-assets",
      files: ["public/restaurants/chickfila/**"],
      assetCount: assetFiles.length,
      action: "likely_preserve_production_enrichment" as const,
    },
    {
      id: "legacy-combo-and-item-rules",
      files: ["lib/comboMeals.ts", "lib/restaurantRules/chickfila.ts"],
      action: "likely_preserve_production_enrichment" as const,
    },
    {
      id: "cart-static-menu-lookup",
      files: ["lib/cart/cartItemLookup.ts"],
      action: "likely_preserve_production_enrichment" as const,
    },
    {
      id: "restaurant-brand-color",
      files: ["lib/theme/colors.ts"],
      value: "#E51636",
      action: "likely_preserve_production_enrichment" as const,
    },
    {
      id: "homepage-chickfila-presentation",
      files: ["app/page.tsx", "components/home/HeroSearchNav.tsx"],
      action: "likely_preserve_production_enrichment" as const,
    },
  ];

  const sourceRelationships = isObject(generatedMenu.sourceRelationships)
    ? generatedMenu.sourceRelationships
    : undefined;
  const sourceGroups = objects(sourceRelationships?.itemGroups);
  const contextualConstraints = sourceGroups.reduce(
    (count, group) => count + objects(group.options).filter(
      (option) => option.minimum !== null || option.maximum !== null,
    ).length,
    0,
  );
  const generatedOfficialCapabilities = [
    {
      id: "stable-source-identities",
      affectedRecords: generatedRecords.length,
      description: "retailModifiedItemId/itemGroupId traceability and source-native aliases",
      action: "likely_generated_improvement" as const,
    },
    {
      id: "full-source-relationship-graph",
      affectedGroups: sourceGroups.length,
      description: "official nested item and modifier group relationships",
      action: "schema_limitation" as const,
    },
    {
      id: "contextual-source-constraints",
      affectedOptions: contextualConstraints,
      description: "official per-context minimum and maximum option metadata",
      action: "schema_limitation" as const,
    },
    {
      id: "explicit-official-meal-containers",
      affectedRecords: generatedCombos.length,
      description: "official entrée/side/drink meal relationships instead of category-derived eligibility",
      action: "likely_generated_improvement" as const,
    },
    {
      id: "official-image-urls",
      affectedRecords: generatedRecords.filter((record) => text(record.value.image)?.startsWith("http")).length,
      description: "current official CDN image references",
      action: "likely_generated_improvement" as const,
    },
    {
      id: "nutrition-match-provenance",
      affectedRecords: generatedRecords.filter((record) => sourceNutritionSummary(record) !== null).length,
      description: "official nutrition source IDs, serving size, and match strategy",
      action: "likely_generated_improvement" as const,
    },
    {
      id: "contextual-modifier-nutrition",
      affectedRecords: generatedRecords.filter(
        (record) => contextualNutritionSummary(record).length > 0,
      ).length,
      description:
        "one visible modifier identity with official nutrition selected by parent relationship tag",
      action: "likely_generated_improvement" as const,
    },
    {
      id: "additional-official-nutrition-fields",
      affectedComparisonUnits: generatedAdditionalNutritionFieldUnits.size,
      description: "official optional nutrient fields that are absent from the aligned production record or variant",
      action: "likely_generated_improvement" as const,
    },
  ];

  const productionRecordsByRawId = new Map<string, ComparableRecord[]>();
  for (const record of productionRecords) {
    productionRecordsByRawId.set(record.id, [
      ...(productionRecordsByRawId.get(record.id) ?? []),
      record,
    ]);
  }
  const duplicateProductionRecordIds = [...productionRecordsByRawId.entries()]
    .filter(([, records]) => records.length > 1)
    .map(([id, records]) => ({
      id,
      records: records.map((record) => ({ key: record.key, kind: record.kind, name: record.name })),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const productionInventory = {
    primaryData: [
      { path: "data/restaurants/chickfila.json", role: "Production menu, nutrition, variants, ingredients, customization, addons, and display order." },
      { path: "data/restaurants/index.json", role: "Restaurant identity, menu filename, brand assets, description, and nutrition freshness metadata." },
    ],
    assetLibrary: {
      root: "public/restaurants/chickfila/",
      files: assetFiles,
      count: assetFiles.length,
    },
    identityCaveats: {
      duplicateRawRecordIds: duplicateProductionRecordIds,
      comparisonIdentity: "kind:id",
    },
    runtimeConfiguration: [
      { path: "lib/restaurants.ts", role: "Loads index metadata and dynamically imports chickfila.json." },
      { path: "lib/cart/cartItemLookup.ts", role: "Directly imports chickfila.json for cart item and customization resolution." },
      { path: "lib/comboMeals.ts", role: "Provides legacy category-derived Chick-fil-A combo side/drink behavior." },
      { path: "lib/restaurantRules/chickfila.ts", role: "Breakfast, waffle-fries, hash-browns, ordering, label, and icon rules." },
      { path: "lib/theme/colors.ts", role: "Defines the Chick-fil-A brand accent color." },
      { path: "components/item-route-modal/ItemRouteModal.tsx", role: "Consumes Chick-fil-A-specific item labeling and icon rules." },
    ],
    authoredPresentation: [
      { path: "app/page.tsx", role: "Uses Chick-fil-A in the homepage walkthrough." },
      { path: "components/home/HeroSearchNav.tsx", role: "Contains Chick-fil-A-specific homepage examples and imagery." },
    ],
  };

  const safeTopCount = safeEquivalent.filter((entry) => entry.comparisonUnit === "top_level_record").length;
  const safeVariantCount = safeEquivalent.filter((entry) => entry.comparisonUnit === "variant").length;
  const report = {
    restaurant: "Chick-fil-A",
    comparedAt: getLocalDate(),
    inputs: {
      productionMenu: "data/restaurants/chickfila.json",
      productionIndex: "data/restaurants/index.json",
      generatedMenu: "data/generated/chick-fil-a/restaurant.json",
      unresolved: "data/generated/chick-fil-a/unresolved.json",
    },
    readOnly: true,
    alignmentPolicy: {
      order: [
        "unique formatting-normalized name or generated source alias",
        "unique type-compatible formatting-normalized name",
        "variant within an already aligned parent by exact label",
        "variant within an already aligned parent by explicit size/count/portion descriptor",
        "unmatched or ambiguous review",
      ],
      fuzzyMatching: false,
      meaningfulWordsRemoved: false,
      productionAuthority: "Production values are historical evidence, not authority for resolving official-source ambiguity.",
      safeEquivalentUnit: "A comparison unit is a production top-level record or variant aligned to a generated logical record that requires no human review after applying the current-official nutrition and contextual-customization policies.",
    },
    productionInventory,
    summary: {
      productionTopLevelRecords: productionRecords.length,
      productionVariants: variantAlignments.length,
      generatedTopLevelRecords: generatedRecords.length,
      alignedProductionTopLevelRecords: topAlignments.filter((alignment) => alignment.generatedId).length,
      alignedProductionVariants: variantAlignments.filter((alignment) => alignment.generatedId).length,
      ambiguousProductionAlignments: topAlignments.filter((alignment) => alignment.strategy === "ambiguous").length,
      safeEquivalent: safeEquivalent.length,
      safeEquivalentTopLevel: safeTopCount,
      safeEquivalentVariants: safeVariantCount,
      automaticallyAcceptedOfficialNutrition: acceptedOfficialNutrition.length,
      automaticallyAcceptedOfficialCustomization: acceptedOfficialCustomization.length,
      nutritionDifferences: nutritionReview.length,
      menuStructureDifferences: menuStructureReview.length,
      customizationDifferences: customizationReview.length,
      productionOnlyEnrichmentCases: productionEnrichment.length + globalProductionEnrichment.length,
      generatedOnlyOfficialDataCases: generatedOnlyRecords.length + generatedOfficialCapabilities.length,
      generatedOnlyRecords: generatedOnlyRecords.length,
      generatedOfficialCapabilities: generatedOfficialCapabilities.length,
      unresolvedWithProductionEvidence: unresolvedWithProductionEvidence.length,
    },
    alignments: {
      topLevel: topAlignments,
      variants: variantAlignments,
    },
    safeEquivalent,
    automaticallyAccepted: {
      officialNutrition: sortFindings(acceptedOfficialNutrition),
      officialCustomization: sortFindings(acceptedOfficialCustomization),
    },
    nutritionDifferences: sortFindings(nutritionReview),
    menuStructureDifferences: sortFindings(menuStructureReview),
    customizationDifferences: sortFindings(customizationReview),
    productionEnrichment: {
      records: productionEnrichment,
      global: globalProductionEnrichment,
    },
    generatedOfficialInformation: {
      generatedOnlyRecords: generatedOnlyRecords.map(generatedSummary),
      capabilities: generatedOfficialCapabilities,
    },
    unresolvedWithProductionEvidence: sortFindings(unresolvedWithProductionEvidence),
  };

  const sourceMenuFor = (record: ComparableRecord): JsonObject | undefined => {
    const source = isObject(record.value.source) ? record.value.source : undefined;
    return source && isObject(source.menu) ? source.menu : undefined;
  };
  const historicalNutritionForName = (name: string): string => {
    const candidates = productionRecords.filter((record) =>
      record.normalizedNames.includes(normalizeName(name)) &&
      isObject(record.value.nutrition),
    );
    return candidates.length > 0
      ? candidates.map((record) => `${record.name}: ${compactMacroText(record.value.nutrition)}`).join("<br>")
      : "None in production";
  };
  const historicalNutritionFromEvidence = (value: unknown): string => {
    const evidence = Array.isArray(value) ? value.filter(isObject) : [];
    const nutrition = evidence
      .map((entry) => entry.nutrition)
      .find(isObject);
    return compactMacroText(nutrition);
  };
  const uniqueByNormalizedItem = <T extends { item: string }>(entries: T[]): T[] => {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      const key = normalizeName(entry.item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const manualConflictingNutrition = uniqueByNormalizedItem(
    unresolvedRecords.flatMap((unresolved) => {
      if (text(unresolved.reason) !== "multiple_conflicting_matches") return [];
      const generatedId = text(unresolved.standardizedRecordId);
      const generated = generatedId ? generatedById.get(generatedId) : undefined;
      const sourceMenu = generated ? sourceMenuFor(generated) : undefined;
      if (!generated || sourceMenu?.sellable !== true || sourceMenu.itemClass !== "ITEM") return [];
      const candidates = objects(unresolved.candidateNutritionRows).map((candidate) => {
        const servingSize = typeof candidate.servingSize === "number"
          ? `${candidate.servingSize}g serving`
          : "serving size unavailable";
        return `${text(candidate.sourceId) ?? "unknown source"}: ${compactMacroText(candidate.nutrition)}; ${servingSize}`;
      });
      return [{
        item: generated.name,
        sourceRecord: text(sourceMenu.recordId) ?? generated.id,
        candidates,
        historical: historicalNutritionForName(generated.name),
      }];
    }).sort((left, right) => left.item.localeCompare(right.item)),
  );
  const coffeeVariantSourceGaps = generatedRecords
    .filter((record) => {
      const sourceMenu = sourceMenuFor(record);
      const unresolved = unresolvedByGeneratedId.get(record.id);
      return sourceMenu?.sellable === true &&
        text(unresolved?.reason) === "no_nutrition_match" &&
        /iced coffee|cream cold brew/i.test(record.name);
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const missingNutritionEvidence = uniqueByNormalizedItem(
    sortFindings(unresolvedWithProductionEvidence).flatMap((entry) => {
      const generated = entry.generatedId ? generatedById.get(entry.generatedId) : undefined;
      const unresolved = entry.generatedId ? unresolvedByGeneratedId.get(entry.generatedId) : undefined;
      if (!generated || text(unresolved?.reason) !== "no_nutrition_match") return [];
      const sourceMenu = sourceMenuFor(generated);
      const highPriority =
        sourceMenu?.sellable === true &&
        sourceMenu.itemClass === "ITEM" &&
        generated.kind === "menu_item" &&
        generated.servingType !== "addon";
      const lowerPriority =
        generated.kind === "ingredient" ||
        generated.servingType === "addon" ||
        sourceMenu?.itemClass === "MODIFIER";
      if (!highPriority && !lowerPriority) return [];
      return [{
        item: entry.item,
        highPriority,
        historical: historicalNutritionFromEvidence(entry.production),
        status: "no_match",
        reason: text(unresolved?.details) ?? "No unique exact, safe normalized, or verified source-ID match exists.",
      }];
    }),
  );
  const importantMissingNutrition = missingNutritionEvidence
    .filter((entry) => entry.highPriority)
    .sort((left, right) => left.item.localeCompare(right.item));
  const lowerPriorityMissingNutrition = missingNutritionEvidence
    .filter((entry) => !entry.highPriority)
    .sort((left, right) => left.item.localeCompare(right.item));

  const directCategoryIds = new Set(
    objects(sourceRelationships?.categoryRoots).flatMap((root) => strings(root.itemIds)),
  );
  const newUserFacingRecords = generatedOnlyRecords.filter((record) => {
    const sourceMenu = sourceMenuFor(record);
    return record.kind === "menu_item" && sourceMenu?.sellable === true && directCategoryIds.has(record.id);
  });
  const deferredProductGroups = [
    {
      title: "Kid's Meals",
      items: newUserFacingRecords.filter((record) =>
        record.servingType === "combo" &&
        runtimeDeferredIds.has(record.id) &&
        record.categories.some((category) => /kid/i.test(category)),
      ),
      decision: "Deferred; not included in runtime-prep visibility.",
    },
    {
      title: "Standard Meals",
      items: newUserFacingRecords.filter((record) =>
        record.servingType === "combo" &&
        runtimeDeferredIds.has(record.id) &&
        !record.categories.some((category) => /kid|family/i.test(category)),
      ),
      decision: "Deferred; not included in runtime-prep visibility.",
    },
    {
      title: "Family Style Meals",
      items: newUserFacingRecords.filter((record) =>
        record.servingType === "combo" &&
        runtimeDeferredIds.has(record.id) &&
        record.categories.some((category) => /family/i.test(category)),
      ),
      decision: "Deferred; not included in runtime-prep visibility.",
    },
  ].filter((group) => group.items.length > 0);
  const integratedNewNonMealRecords = newUserFacingRecords
    .filter(
      (record) =>
        record.servingType !== "combo" && runtimeIntegratedIds.has(record.id),
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const productDecisionGroups = [
    {
      title: "Unimplemented Current Sellable Non-Meal Items",
      items: newUserFacingRecords.filter(
        (record) =>
          record.servingType !== "combo" && !runtimeIntegratedIds.has(record.id),
      ),
      decision:
        "Decide whether to add a runtime model/category mapping or keep these records deferred.",
    },
  ].filter((group) => group.items.length > 0);
  for (const group of deferredProductGroups) {
    group.items.sort((left, right) => left.name.localeCompare(right.name));
  }
  for (const group of productDecisionGroups) {
    group.items.sort((left, right) => left.name.localeCompare(right.name));
  }

  const mealContainersWithoutSingleEntree = generatedCombos.filter(
    (record) => !isObject(record.value.comboConfig) || !text((record.value.comboConfig as JsonObject).entreeItemId),
  ).length;
  const schemaDecisions = [
    {
      title: "Nested and contextual customization",
      allows: `The official graph retains ${sourceGroups.length} groups and ${contextualConstraints} contextual min/max constraints, including per-item defaults and alternatives.`,
      supports: "The runtime now resolves relationship-tagged modifier nutrition and flattens representable ingredient categories/add-on groups, but it cannot enforce every remaining nested/context-specific selection rule.",
      decision: "Whether to extend the runtime schema with nested, context-aware option groups before migration.",
      recommendation: "Keep the full source graph now and add a typed nested-selection model before exposing workflows that depend on those constraints.",
    },
    {
      title: "Meal entrée-choice modeling",
      allows: `${mealContainersWithoutSingleEntree} official meal containers do not reduce to the runtime's single fixed entrée reference.`,
      supports: "ComboMealConfig supports one entrée ID plus side and drink option arrays.",
      decision: "Whether meal containers need multiple or nested entrée choices when meal support is enabled.",
      recommendation: "Decide meal exposure first; if enabled, extend ComboMealConfig instead of discarding official choices.",
    },
  ];
  const remainingDecisionCount =
    manualConflictingNutrition.length +
    importantMissingNutrition.length +
    lowerPriorityMissingNutrition.length +
    productDecisionGroups.length +
    schemaDecisions.length;

  const missingNutritionTable = (
    title: string,
    entries: typeof importantMissingNutrition,
    recommendation: string,
  ): string[] => [
    `### ${title}`,
    "",
    ...(entries.length === 0
      ? ["None.", ""]
      : [
          "| Item | Production historical nutrition | Current status | Why no official match exists | Recommendation |",
          "| --- | --- | --- | --- | --- |",
          ...entries.map((entry) =>
            `| ${markdownTableCell(entry.item)} | ${markdownTableCell(entry.historical)} | \`${entry.status}\` | ${markdownTableCell(entry.reason)} | ${recommendation} |`,
          ),
          "",
        ]),
  ];

  const manualReviewMarkdown = [
    "# Chick-fil-A — Decisions I Actually Need to Make",
    "",
    `Remaining decisions: ${remainingDecisionCount}`,
    "",
    "## Quick Summary",
    "",
    `- Conflicting nutrition: ${manualConflictingNutrition.length}`,
    `- Important missing nutrition: ${importantMissingNutrition.length}`,
    `- Low-priority missing nutrition: ${lowerPriorityMissingNutrition.length}`,
    `- New menu-type decisions: ${productDecisionGroups.length} groups`,
    `- Recorded deferred meal groups: ${deferredProductGroups.length}`,
    `- Newly integrated current sellable non-meal items: ${integratedNewNonMealRecords.length}`,
    `- Schema/customization decisions: ${schemaDecisions.length}`,
    "",
    "Confident official nutrition, contextual defaults, explicitly linked add-ons, preserved production enrichment, identical duplicate nutrition rows, non-sellable structural records, and informational source metadata are intentionally excluded.",
    "",
    ...(manualConflictingNutrition.length > 0
      ? [
          "## Section A — Conflicting Official Nutrition",
          "",
          "| Item | Generated source record | Current official candidates | Production historical value | Why Codex cannot choose safely | Decision / verification needed |",
          "| --- | --- | --- | --- | --- | --- |",
          ...manualConflictingNutrition.map((entry) =>
            `| ${markdownTableCell(entry.item)} | \`${entry.sourceRecord}\` | ${markdownTableCell(entry.candidates.join("<br>"))} | ${markdownTableCell(entry.historical)} | Same current official name, but serving sizes and nutrition payloads differ and the source graph supplies no candidate source ID selector. | Verify which official nutrition row applies to this sellable source record. |`,
          ),
          "",
        ]
      : []),
    ...(coffeeVariantSourceGaps.length > 0
      ? [
          `> Collected-source note, not a decision: ${coffeeVariantSourceGaps.map((record) => record.name).join(", ")} ${coffeeVariantSourceGaps.length === 1 ? "has" : "have"} no row in the collected official nutrition CSV and remain unavailable.`,
          "",
        ]
      : []),
    "## Section B — Current Official Source Has No Nutrition Match",
    "",
    ...missingNutritionTable("High Priority", importantMissingNutrition, "Verify now; otherwise leave nutrition unavailable."),
    ...missingNutritionTable("Lower Priority", lowerPriorityMissingNutrition, "Low priority; defer or leave unavailable. Do not copy historical values."),
    "## Section C — Recorded Product Decisions and Runtime Preparation",
    "",
    "Only currently sellable records directly present in an official category are included. Internal groups and non-sellable graph records are excluded.",
    "",
    "### Implemented Current Sellable Non-Meal Items",
    "",
    ...(integratedNewNonMealRecords.length > 0
      ? [
          `${integratedNewNonMealRecords.length} generated-only current sellable non-meal items are present in runtime preparation. The previous Seasonal / Other decision bucket is resolved.`,
          "",
          ...integratedNewNonMealRecords.map((record) => {
            const exposure = runtimeCustomizationIds.has(record.id)
              ? "customization only"
              : "visible menu item";
            return `- ${record.name} — ${exposure}`;
          }),
          "",
        ]
      : ["None.", ""]),
    ...deferredProductGroups.flatMap((group) => [
      `### ${group.title} — Deferred`,
      "",
      ...group.items.map((record) => `- ${record.name}`),
      "",
      `Status: ${group.decision}`,
      "Static meal nutrition is not required; it should eventually be calculated from the selected entrée, side, drink, and other selections.",
      "",
    ]),
    ...(productDecisionGroups.length === 0
      ? ["No product decisions remain in this section.", ""]
      : []),
    ...productDecisionGroups.flatMap((group) => [
      `### ${group.title}`,
      "",
      ...group.items.map((record) => `- ${record.name}`),
      "",
      `Decision: ${group.decision}`,
      "",
    ]),
    "## Section D — Remaining Customization / Schema Decisions",
    "",
    ...schemaDecisions.flatMap((entry) => [
      `### ${entry.title}`,
      "",
      `- What Chick-fil-A allows: ${entry.allows}`,
      `- What Macro Maxxer currently supports: ${entry.supports}`,
      `- What decision I need to make: ${entry.decision}`,
      `- Recommended option: ${entry.recommendation}`,
      "",
    ]),
  ].join("\n");

  const highestPriority = sortFindings([
    ...nutritionReview,
    ...customizationReview,
    ...unresolvedWithProductionEvidence,
    ...menuStructureReview.filter((entry) => entry.priority === "high"),
  ]).filter((entry, index, entries) =>
    entries.findIndex((candidate) => candidate.item === entry.item) === index,
  );
  const enrichmentFieldCounts = new Map<string, number>();
  for (const entry of productionEnrichment) {
    for (const field of entry.fields) {
      enrichmentFieldCounts.set(field, (enrichmentFieldCounts.get(field) ?? 0) + 1);
    }
  }
  const markdown = [
    "# Chick-fil-A Generated vs Production Review",
    "",
    `Compared: ${report.comparedAt}`,
    "",
    "> Production values in this report are historical evidence, not authority for resolving official-source ambiguity. No source or production data was modified.",
    "",
    "## Summary",
    "",
    "| Category | Count |",
    "| --- | ---: |",
    `| Safe/equivalent comparison units | ${report.summary.safeEquivalent} |`,
    `| Confident official nutrition changes automatically accepted | ${report.summary.automaticallyAcceptedOfficialNutrition} |`,
    `| Official customization differences automatically accepted | ${report.summary.automaticallyAcceptedOfficialCustomization} |`,
    `| Nutrition differences | ${report.summary.nutritionDifferences} |`,
    `| Menu structure differences | ${report.summary.menuStructureDifferences} |`,
    `| Customization differences | ${report.summary.customizationDifferences} |`,
    `| Production enrichment cases to preserve | ${report.summary.productionOnlyEnrichmentCases} |`,
    `| Generated-only official-data cases | ${report.summary.generatedOnlyOfficialDataCases} |`,
    `| Unresolved records with production evidence | ${report.summary.unresolvedWithProductionEvidence} |`,
    "",
    `Safe/equivalent comprises ${safeTopCount} top-level records and ${safeVariantCount} variants. Full safe alignment detail is intentionally kept in \`comparison.json\`.`,
    "",
    markdownSection("Highest Priority Review", highestPriority, 10, "No high-priority review items were found."),
    markdownSection("Nutrition Differences", sortFindings(nutritionReview), 10, "No nutrition differences were found."),
    markdownSection(
      "Unresolved Records With Production Evidence",
      sortFindings(unresolvedWithProductionEvidence),
      8,
      "No unresolved records have conservative same-identity production evidence.",
    ),
    markdownSection("Customization Differences", sortFindings(customizationReview), 10, "No customization differences were found."),
    markdownSection("Menu Structure Differences", sortFindings(menuStructureReview), 15, "No menu structure differences were found."),
    "## Production Enrichment to Preserve",
    "",
    ...[...enrichmentFieldCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([field, count]) => `- ${field}: ${count} production records`),
    ...globalProductionEnrichment.map(
      (entry) => `- ${entry.id}: ${entry.files.join(", ")}`,
    ),
    "",
    "## Generated-Only Official Information",
    "",
    `- Source-traceable generated-only records: ${generatedOnlyRecords.length}`,
    ...generatedOfficialCapabilities.map((entry) =>
      `- ${entry.id}: ${entry.description}`,
    ),
    "",
    "## Production Files That Power Chick-fil-A",
    "",
    ...productionInventory.primaryData.map((entry) => `- \`${entry.path}\` — ${entry.role}`),
    ...productionInventory.runtimeConfiguration.map((entry) => `- \`${entry.path}\` — ${entry.role}`),
    ...productionInventory.authoredPresentation.map((entry) => `- \`${entry.path}\` — ${entry.role}`),
    `- \`${productionInventory.assetLibrary.root}**\` — ${productionInventory.assetLibrary.count} local brand/menu/ingredient assets.`,
    "",
    "## Review Notes",
    "",
    "- Name alignment is formatting-only. No fuzzy matching or meaningful-word removal is used.",
    "- Variant alignment is restricted to an already aligned parent plus exact labels or explicit size/count/portion descriptors.",
    "- Generated ambiguities remain unresolved even where production offers a plausible historical value.",
    `- Production has ${duplicateProductionRecordIds.length} raw ID collisions across menu items and ingredients; the comparator scopes its internal production identity as \`kind:id\`.`,
    "- Relationship-tagged modifier nutrition is first-class; other nested official relationships and contextual constraints remain schema limitations until production modeling is deliberately designed.",
    "- Full aligned identities and uncapped findings are in `comparison.json`.",
    "",
  ].join("\n");

  await Promise.all([
    writeAtomically(JSON_OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`),
    writeAtomically(MARKDOWN_OUTPUT_PATH, markdown),
    writeAtomically(MANUAL_REVIEW_PATH, `${manualReviewMarkdown}\n`),
  ]);

  console.log(
    [
      "Chick-fil-A review comparison complete.",
      "",
      `Safe/equivalent: ${report.summary.safeEquivalent}`,
      `Official nutrition changes accepted: ${report.summary.automaticallyAcceptedOfficialNutrition}`,
      `Official customization changes accepted: ${report.summary.automaticallyAcceptedOfficialCustomization}`,
      `Nutrition differences: ${report.summary.nutritionDifferences}`,
      `Menu structure differences: ${report.summary.menuStructureDifferences}`,
      `Customization differences: ${report.summary.customizationDifferences}`,
      `Unresolved with production evidence: ${report.summary.unresolvedWithProductionEvidence}`,
      "",
      "Reports:",
      "data/review/chick-fil-a/comparison.json",
      "data/review/chick-fil-a/comparison.md",
      "data/review/chick-fil-a/manual-review.md",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
