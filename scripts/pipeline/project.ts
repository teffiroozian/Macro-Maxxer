import { getMealPresetErrors, getMealPresetNutrition } from "../../lib/ordering/mealPreset";
import { validateOrderingPlan } from "../../lib/ordering/evaluate";
// Projects a draft onto the existing runtime schema (types/menu.ts).
//
// The runtime Nutrition type requires all four core macros, so any record
// without them is listed in `excluded` instead of being emitted with made-up
// numbers. Ids come from the stable id registry: a record the registry
// recognizes keeps the id the app already knows, and only an unrecognized
// record is given a new one.
//
// General nested ordering logic stays in the draft. Explicit runtime
// relationships are projected through the app-compatible shape.
import type { BuilderEntreeOption, RestaurantBuilderConfig } from "../../types/builder";
import type {
  GeneratedMenuSourceIdentity,
  IngredientCategoryRule,
  IngredientItem,
  IngredientItemCategory,
  ItemVariant,
  MenuItem,
  MenuSourceIdentity,
  RestaurantMenu,
} from "../../types/menu";
import type { Nutrition } from "../../types/nutrition";
import { normalizeName } from "../lib/normalize-name";
import type { DraftItem, NutritionRecord, RestaurantDraft, SelectionGroup, SelectionOption, SourceRef } from "./contracts";
import { emptyRegistry, idKeys, IdResolver, type IdRegistry, type IdRegistryEntry } from "./ids";
import { remapCombo, remapItemRelationships, remapOrderingPlan } from "./runtime-relationships";
import { toRuntimeNutrition, unresolvedConflicts } from "./nutrition";

export type ProjectionExclusion = { id: string; name: string; reason: string };

export type RuntimeProjection = {
  menu: RestaurantMenu;
  itemIds: ReadonlyMap<string, string>;
  excluded: ProjectionExclusion[];
  // Things the runtime schema cannot express the way the source states them.
  notes: string[];
  relationshipErrors: string[];
  ids: {
    // The registry including ids minted in this projection.
    registry: IdRegistry;
    additions: IdRegistryEntry[];
    conflicts: string[];
  };
};

export type ProjectionOptions = {
  registry?: IdRegistry;
};

const INCLUDED_INGREDIENTS_CATEGORY = "Included Ingredients";

type DraftGroup = SelectionGroup<NutritionRecord>;
type DraftOption = SelectionOption<NutritionRecord>;

function usable(record: NutritionRecord): Nutrition | string {
  const nutrition = toRuntimeNutrition(record);
  if (!nutrition) return `missing ${record.missingCore.join(", ")}`;
  if (unresolvedConflicts(record).length > 0) return "unresolved nutrition conflict";
  return nutrition;
}

function recordIds(refs: ReadonlyArray<SourceRef | undefined>): string[] {
  return [...new Set(refs.flatMap((ref) => (ref?.recordId ? [ref.recordId] : [])))];
}

function sourceIdentity(draft: RestaurantDraft, itemIds: string[], role: string, record: NutritionRecord | undefined, orderingIdentity?: MenuSourceIdentity["menu"]): MenuSourceIdentity {
  const generated: GeneratedMenuSourceIdentity = {
    provider: draft.restaurant.name,
    menu: { itemIds, role },
    // "published", or how the engine calculated the values.
    nutrition: { method: record?.derivation?.method ?? "published" },
  };
  return { menu: orderingIdentity ?? { tags: [], pins: [] }, generated };
}

export function projectToRestaurantMenu(draft: RestaurantDraft, options: ProjectionOptions = {}): RuntimeProjection {
  const resolver = new IdResolver(options.registry ?? emptyRegistry(draft.restaurant.id));
  const excluded: ProjectionExclusion[] = [];
  const relationshipErrors: string[] = [];
  const prefix = draft.restaurant.id;
  const relationships = draft.runtimeRelationships;
  const builders = draft.items.filter((item) => item.model === "build-your-own");

  // ── Items: ids first, so ingredient keys can name the item that offers them.
  const itemIds = new Map<string, string>();
  for (const item of draft.items) {
    const keys = [...recordIds(item.sources).map(idKeys.source), idKeys.name(item.category ?? item.sourceCategory, item.name)];
    itemIds.set(item.id, resolver.resolve("item", keys, `${prefix}-${item.name}`).id);
  }

  // ── Runtime ingredients.
  // An option the registry already knows keeps that record's id, so several
  // builders offering the same record share one ingredient. Options the
  // registry does not know are grouped by name and default serving. The same
  // ingredient at a different serving is its own record, tied back to the
  // first through canonicalIngredientId.
  type Occurrence = { item: DraftItem; option: DraftOption; group: DraftGroup };
  type Bucket = { occurrences: Occurrence[]; knownId?: string };
  const buckets = new Map<string, Bucket>();
  const bucketOf = new Map<string, Bucket>();
  const draftIngredientCategory = new Map(draft.ingredients.map((ingredient) => [ingredient.id, ingredient.category ?? ingredient.sourceCategory]));
  const groupsOf = (item: DraftItem): DraftGroup[] => [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
  const defaultRecord = (option: DraftOption) =>
    option.portions?.length ? (option.portions.find((portion) => portion.isDefault) ?? option.portions[0]).nutrition : option.nutrition;
  const serving = (option: DraftOption) => JSON.stringify([normalizeName(option.label), defaultRecord(option).values]);
  const sourceKeys = (occurrence: Occurrence) => {
    const ids = recordIds([occurrence.option.source]);
    return [...ids.map((id) => idKeys.sourceIn(id, itemIds.get(occurrence.item.id)!)), ...ids.map(idKeys.source)];
  };

  for (const item of builders) {
    for (const group of groupsOf(item)) {
      if (group.role === "preparation") continue;
      group.options.forEach((option) => {
        if (option.isExclusive) return;
        const occurrence: Occurrence = { item, option, group };
        const knownId = resolver.peek("ingredient", sourceKeys(occurrence));
        // A known id only groups options that agree on the default serving.
        const key = knownId ? `id:${knownId}|${serving(option)}` : `serving:${serving(option)}`;
        const bucket = buckets.get(key) ?? { occurrences: [], knownId };
        buckets.set(key, bucket);
        bucket.occurrences.push(occurrence);
        bucketOf.set(`${item.id}|${option.id}`, bucket);
      });
    }
  }

  const ingredients: IngredientItem[] = [];
  const ingredientIdOf = new Map<Bucket, string>();
  const variantIdOf = new Map<string, string>();
  const canonical = new Map<string, string>();
  const notes: string[] = [];
  for (const bucket of buckets.values()) {
    const [first] = bucket.occurrences;
    const { option } = first;
    const category = (option.ingredientId && draftIngredientCategory.get(option.ingredientId)) || first.group.label;
    const nutrition = usable(defaultRecord(option));
    if (typeof nutrition === "string") {
      excluded.push({ id: option.id, name: `${first.item.name} › ${option.label}`, reason: nutrition });
      continue;
    }
    const sourceRecordIds = recordIds(bucket.occurrences.map((entry) => entry.option.source));
    const keys = [...new Set([...bucket.occurrences.flatMap(sourceKeys), idKeys.name(category, option.label)])];
    const id = resolver.resolve("ingredient", keys, `${prefix}-${category}-${option.label}`).id;
    ingredientIdOf.set(bucket, id);

    const base = {
      id,
      name: option.label,
      categories: [category],
      maxQuantity: 1,
      // The source's own display position. With none stated, records keep
      // the neutral 0 and stay in source list order.
      defaultOrder: option.order ?? 0,
      source: sourceIdentity(draft, sourceRecordIds, "selectable_component", defaultRecord(option)),
      ...(option.ingredientId && canonical.has(option.ingredientId) ? { canonicalIngredientId: canonical.get(option.ingredientId) } : {}),
    };
    if (option.ingredientId && !canonical.has(option.ingredientId)) canonical.set(option.ingredientId, id);

    // The runtime keeps one portion list per ingredient, so it is the union
    // of what each builder offers.
    const portions = new Map<string, NonNullable<DraftOption["portions"]>[number]>();
    const offeredBy = new Map<string, Set<string>>();
    for (const occurrence of bucket.occurrences) {
      for (const portion of occurrence.option.portions ?? []) {
        const label = normalizeName(portion.label);
        if (!portions.has(label)) portions.set(label, portion);
        offeredBy.set(label, (offeredBy.get(label) ?? new Set()).add(occurrence.item.name));
      }
    }
    const builderNames = new Set(bucket.occurrences.map((occurrence) => occurrence.item.name));
    for (const [label, offering] of offeredBy) {
      const missing = [...builderNames].filter((name) => !offering.has(name));
      if (missing.length > 0) {
        notes.push(`${option.label} (${id}): the "${portions.get(label)!.label}" portion is not offered on ${missing.join(", ")} in the source, but the runtime schema keeps one portion list per ingredient.`);
      }
    }

    const variants: ItemVariant[] = [];
    let defaultVariantId: string | undefined;
    for (const portion of portions.values()) {
      const portionNutrition = usable(portion.nutrition);
      if (typeof portionNutrition === "string") {
        excluded.push({ id: portion.id, name: `${first.item.name} › ${option.label} › ${portion.label}`, reason: portionNutrition });
        continue;
      }
      const variantId = resolver.resolve("ingredient-variant", [idKeys.portion(id, portion.label)], `${id}-${portion.label}`).id;
      if (portion.isDefault) defaultVariantId = variantId;
      variants.push({
        id: variantId,
        label: portion.label,
        categories: [],
        nutrition: portionNutrition,
        source: sourceIdentity(draft, recordIds([portion.source]), "selectable_component", portion.nutrition),
      });
    }
    if (variants.length > 1 && defaultVariantId) {
      ingredients.push({ ...base, variants: variants as [ItemVariant, ...ItemVariant[]], defaultVariantId });
    } else {
      ingredients.push({ ...base, nutrition });
    }
  }

  const ingredientIds = new Map<string, string>();
  for (const entry of draft.ingredients) {
    const metadata = relationships?.ingredients[entry.id];
    if (!metadata) continue;
    const nutrition = usable(entry.nutrition);
    const contextual = entry.contextualNutritionOnly && Boolean(metadata.contextualNutritionUnits?.length);
    if (typeof nutrition === "string" && !contextual && !entry.preparationOnly) {
      excluded.push({ id: entry.id, name: entry.name, reason: nutrition });
      continue;
    }
    const category = entry.category ?? entry.sourceCategory;
    const id = resolver.resolve("ingredient", [
      ...recordIds(entry.sources).map(idKeys.source), idKeys.name(category, entry.name),
    ], `${prefix}-${entry.name}`).id;
    ingredientIds.set(entry.id, id);
    // The existing ingredient resolver reads contextual/preparation identities
    // without a base panel. Keep the field absent instead of inventing macros.
    ingredients.push({
      id, name: entry.name, categories: [category], ...metadata,
      ...(typeof nutrition === "string" ? {} : { nutrition }),
      source: sourceIdentity(draft, recordIds(entry.sources), "selectable_component", entry.nutrition),
    } as IngredientItem);
  }

  // Components that are always part of an item and have no option of their own.
  const includedIngredientId = (label: string, record: NutritionRecord, refs: string[]): string | undefined => {
    const nutrition = usable(record);
    if (typeof nutrition === "string") return undefined;
    const existing = ingredients.find(
      (ingredient) => ingredient.categories[0] === INCLUDED_INGREDIENTS_CATEGORY && ingredient.name === label && JSON.stringify(ingredient.nutrition) === JSON.stringify(nutrition),
    );
    if (existing) return existing.id;
    const id = resolver.resolve("ingredient", [idKeys.name(INCLUDED_INGREDIENTS_CATEGORY, label)], `${prefix}-${label}-base`).id;
    ingredients.push({
      id,
      name: label,
      categories: [INCLUDED_INGREDIENTS_CATEGORY],
      nutrition,
      maxQuantity: 1,
      defaultOrder: 0,
      source: sourceIdentity(draft, refs, "selectable_component", record),
    });
    return id;
  };

  // ── Menu items.
  const items: MenuItem[] = [];
  const entreeOptions: Record<string, BuilderEntreeOption> = {};
  const categoryMaxSelections: Record<string, number> = {};
  const categoryRules: Record<string, IngredientCategoryRule> = {};

  const sourceVariantByOwner = new Map<string, Map<string, string>>();
  const projectVariants = (item: DraftItem, runtimeId: string, category: string): { variants: ItemVariant[]; defaultVariantId: string } | string | null => {
    if (item.variants.length === 0) return null;
    const variants: ItemVariant[] = [];
    const sourceIds = new Map<string, string>();
    sourceVariantByOwner.set(item.id, sourceIds);
    let defaultVariantId: string | undefined;
    for (const variant of item.variants) {
      const nutrition = usable(variant.nutrition);
      if (typeof nutrition === "string") {
        excluded.push({ id: variant.id, name: `${item.name} › ${variant.label}`, reason: nutrition });
        continue;
      }
      const id = resolver.resolve("variant", [
        ...(variant.sourceVariantId ? [idKeys.variantSource(runtimeId, variant.sourceVariantId)] : []),
        idKeys.variant(runtimeId, variant.label),
      ], `${runtimeId}-${variant.label}`, runtimeId).id;
      variantIdOf.set(variant.id, id);
      sourceIds.set(variant.sourceVariantId ?? variant.id, id);
      if (variant.isDefault) defaultVariantId = id;
      variants.push({
        id,
        label: variant.label,
        ...(variant.tags ? { tags: variant.tags } : {}),
        ...(variant.category ? { category: variant.category } : {}),
        ...(variant.canonicalItemId ? { canonicalItemId: itemIds.get(variant.canonicalItemId) ?? variant.canonicalItemId } : {}),
        categories: [variant.category ?? category],
        ...(variant.servingType ? { servingType: variant.servingType } : {}),
        nutrition,
        source: variant.generatedSource ? { menu: variant.orderingIdentity ?? { tags: [], pins: [] }, generated: variant.generatedSource } :
          sourceIdentity(draft, recordIds([variant.source]), "standalone_product", variant.nutrition, variant.orderingIdentity),
        ...(variant.image ? { image: variant.image } : {}),
      });
    }
    if (variants.length === 0) return "no variant has complete nutrition";
    if (item.requirePublishedDefaultVariant && !defaultVariantId) return "declared default variant has no complete nutrition";
    return { variants, defaultVariantId: defaultVariantId ?? variants[0].id };
  };

  const rulesByName = new Map<string, IngredientCategoryRule[]>();
  const projectCategories = (item: DraftItem, runtimeId: string, groups: readonly DraftGroup[]): IngredientItemCategory[] => {
    const categories: IngredientItemCategory[] = [];
    for (const group of groups) {
      if (group.role === "preparation") continue;
      const members = group.options.flatMap((option) => {
        const bucket = bucketOf.get(`${item.id}|${option.id}`);
        const id = bucket ? ingredientIdOf.get(bucket) : undefined;
        return id ? [id] : [];
      });
      if (members.length === 0) continue;
      const id = resolver.resolve("category", [idKeys.group(runtimeId, group.label)], `${item.name}-${group.label}`).id;
      // Empty is allowed when the source offers a none option or no minimum.
      const allowNone = group.options.some((option) => option.isExclusive) || !group.minSelections;
      categories.push({ name: group.label, id, ingredients: [...new Set(members)], allowNone });
      const rule: IngredientCategoryRule = {
        ...(group.minSelections !== null ? { minQuantity: group.minSelections } : {}),
        ...(group.maxSelections !== null ? { maxQuantity: group.maxSelections } : {}),
        allowNone,
      };
      categoryRules[id] = rule;
      if (group.maxSelections !== null) categoryMaxSelections[id] = group.maxSelections;
      rulesByName.set(group.label, [...(rulesByName.get(group.label) ?? []), rule]);
    }
    return categories;
  };

  draft.items.forEach((item) => {
    const metadata = relationships?.items[item.id];
    if (item.sourceOnly && !metadata && !item.nonNutritionComponent) {
      excluded.push({ id: item.id, name: item.name, reason: "source-only item" });
      return;
    }
    const runtimeId = itemIds.get(item.id)!;
    const category = item.category ?? item.sourceCategory;
    const projectedVariants = projectVariants(item, runtimeId, category);
    const structuralCombo = item.sourceOnly && item.variants.length === 0 && Boolean(metadata?.comboConfig);
    if (typeof projectedVariants === "string") {
      excluded.push({ id: item.id, name: item.name, reason: projectedVariants });
      return;
    }
    const ownRecord = projectedVariants ? undefined : item.nutrition;
    const nutrition = projectedVariants
      ? projectedVariants.variants.find((variant) => variant.id === projectedVariants.defaultVariantId)!.nutrition
      : usable(item.nutrition);
    if (typeof nutrition === "string" && !structuralCombo && !(item.sourceOnly && item.nonNutritionComponent)) {
      excluded.push({ id: item.id, name: item.name, reason: item.model === "build-your-own" && !item.composition ? "builder has no default build to total" : nutrition });
      return;
    }

    const base = {
      id: runtimeId,
      name: item.name,
      image: item.image ?? "",
      category,
      ...(item.tags ? { tags: item.tags } : {}),
      categories: [category],
      servingType: item.servingType,
      ...(typeof nutrition === "string" ? {} : { nutrition }),
      ...(item.sourceOnly ? { sourceOnly: true } : {}),
      defaultOrder: item.order ?? 0,
      source: item.generatedSource ? { menu: item.orderingIdentity ?? { tags: [], pins: [] }, generated: item.generatedSource } :
        sourceIdentity(draft, recordIds(item.sources), item.nonNutritionComponent ? "structural" : item.model === "build-your-own" ? "build_container" : "standalone_product", ownRecord, item.orderingIdentity),
      ...(projectedVariants ?? {}),
    } as MenuItem; // Source-only combo carriers are relationship records with no panel.
    if (item.model !== "build-your-own") {
      items.push(base);
      return;
    }

    // The default build: implicit components, then default selections.
    const defaults: string[] = [];
    const included: string[] = [];
    for (const component of item.composition ?? []) {
      if (component.ref?.kind === "option") {
        const { id: optionId, portionId } = component.ref;
        const bucket = bucketOf.get(`${item.id}|${optionId}`);
        const ingredientId = bucket ? ingredientIdOf.get(bucket) : undefined;
        if (!ingredientId) continue;
        const option = bucket?.occurrences.find((occurrence) => occurrence.item.id === item.id && occurrence.option.id === optionId)?.option;
        const portionLabel = portionId ? option?.portions?.find((portion) => portion.id === portionId)?.label : undefined;
        defaults.push(portionLabel ? `${ingredientId}:${normalizeName(portionLabel)}` : ingredientId);

      } else if (component.nutrition) {
        includedIngredientId(component.label, component.nutrition, recordIds(component.nutrition.observations.map((observation) => observation.source)));
      }
    }

    // Only what the source itself marks as default comes pre-selected.
    for (const group of item.groups) {
      for (const option of group.options) {
        const bucket = option.isDefault ? bucketOf.get(`${item.id}|${option.id}`) : undefined;
        const ingredientId = bucket ? ingredientIdOf.get(bucket) : undefined;
        if (ingredientId) included.push(ingredientId);
      }
    }

    const categories = projectCategories(item, runtimeId, item.groups);
    const byVariant = Object.fromEntries(
      item.variants.flatMap((variant) => {
        const variantCategories = projectCategories(item, runtimeId, variant.groups ?? []);
        const variantId = variantIdOf.get(variant.id);
        return variantId && variantCategories.length > 0 ? [[variantId, { ingredientCategories: variantCategories }]] : [];
      }),
    );
    items.push({
      ...base,
      ...(defaults.length > 0 ? { ingredients: defaults } : {}),
      ...(categories.length > 0 ? { customization: { ingredientCategories: categories } } : {}),
      ...(Object.keys(byVariant).length > 0 ? { customizationByVariantId: byVariant } : {}),
    });
    const optionKey = resolver.resolve("entree-option", [idKeys.entreeOption(runtimeId)], item.name).id;
    entreeOptions[optionKey] = { id: runtimeId, label: item.name, image: item.image ?? "", includedIngredientIds: included };
  });

  const draftItemByRuntimeId = new Map([...itemIds].map(([draftId, runtimeId]) => [runtimeId, draftId]));
  const remapIds = {
    item: (id: string) => itemIds.get(id) ?? id,
    ingredient: (id: string) => ingredientIds.get(id) ?? itemIds.get(id) ?? id,
    variant: (owner: string, id: string) => sourceVariantByOwner.get(owner)?.get(id) ?? id,
  };
  for (const item of items) {
    const draftId = draftItemByRuntimeId.get(item.id)!;
    const plan = draft.orderingPlans?.[draftId];
    if (plan) {
      const errors = validateOrderingPlan(plan);
      if (errors.length === 0) item.orderingPlan = remapOrderingPlan(plan, remapIds);
      else relationshipErrors.push(...errors.map((error) => `${item.id}: ${error}`));
    }
    const additional = draft.additionalOrderingPlans?.[draftId];
    if (additional?.length) item.additionalOrderingPlans = additional.flatMap((entry) => {
      const errors = validateOrderingPlan(entry);
      if (errors.length === 0) return [remapOrderingPlan(entry, remapIds)];
      relationshipErrors.push(...errors.map((error) => `${item.id}: ${error}`));
      return [];
    });
    const metadata = relationships?.items[draftId];
    if (!metadata) continue;
    const { variantContexts, ...rest } = remapItemRelationships(draftId, metadata, remapIds);
    Object.assign(item, Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined)));
    for (const [id, contexts] of Object.entries(variantContexts ?? {})) {
      const variant = item.variants?.find((entry) => entry.id === id);
      if (variant) variant.ingredientNutritionContexts = contexts;
      else relationshipErrors.push(`${item.id}: contextual nutrition belongs to withheld or unknown variant "${id}".`);
    }
  }
  const presetsById = new Map(draft.items.filter((item) => item.mealPreset).map((item) => [itemIds.get(item.id), item.mealPreset]));
  const presetBuilderIds = new Set(Object.values(entreeOptions).map((option) => option.id));
  const presetComponentIds = new Set([...ingredients, ...items].filter((record) =>
    record.nutrition || record.variants?.some((variant) => variant.nutrition)).map((record) => record.id));
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    const preset = presetsById.get(item.id);
    if (!preset) continue;
    const remapped = {
      builderItemId: remapIds.item(preset.builderItemId),
      selections: preset.selections.map((selection) => ({ ...selection, itemId: remapIds.ingredient(selection.itemId) })),
    };
    const errors = getMealPresetErrors(remapped, item.id, presetBuilderIds, presetComponentIds);
    if (errors.length > 0) {
      relationshipErrors.push(...errors);
      excluded.push({ id: item.id, name: item.name, reason: "preset has an invalid builder or selection" });
      items.splice(index, 1);
      continue;
    }
    item.mealPreset = remapped;
    item.nutrition = getMealPresetNutrition(remapped);
  }

  const addonGroups = Object.fromEntries(Object.entries(relationships?.addonGroups ?? {}).map(([id, group]) =>
    [id, { ...group, itemIds: group.itemIds.map(remapIds.item) }],
  ));

  // The runtime also looks limits up by category name alone. A name-keyed
  // limit is only emitted when every item's group of that name agrees;
  // otherwise one name cannot stand for different limits.
  for (const [name, rules] of rulesByName) {
    const maxima = new Set(rules.map((rule) => rule.maxQuantity));
    if (maxima.size === 1 && rules[0].maxQuantity !== undefined) categoryMaxSelections[name] = rules[0].maxQuantity;
    if (new Set(rules.map((rule) => JSON.stringify(rule))).size === 1) categoryRules[name] = rules[0];
    if (maxima.size > 1) {
      notes.push(`"${name}" has different maximums on different items (${[...maxima].map((max) => max ?? "none").join(", ")}); no name-keyed limit is emitted for it, only the per-item ones.`);
    }
  }

  const hasBuildYourOwn = Object.keys(entreeOptions).length > 0;
  const builderConfig: RestaurantBuilderConfig | undefined = hasBuildYourOwn ? { entreeOptions, categoryMaxSelections } : undefined;

  return {
    itemIds,
    menu: {
      hasBuildYourOwn,
      items,
      ingredients,
      addonGroups,
      ...(relationships?.customizationRules || hasBuildYourOwn ? { customizationRules: {
        ...relationships?.customizationRules,
        ingredientCategories: {
          ...categoryRules,
          ...relationships?.customizationRules?.ingredientCategories,
        },
      } } : {}),
      ...(hasBuildYourOwn ? { builderConfig } : {}),
    },
    excluded,
    notes,
    relationshipErrors,
    ids: { registry: resolver.toRegistry(), additions: resolver.additions, conflicts: resolver.conflicts },
  };
}

// Referential integrity of a projected menu: every id it references exists.
export function checkRuntimeMenu(menu: RestaurantMenu): string[] {
  const errors: string[] = [];
  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label} id "${id}" is used more than once.`);
      seen.add(id);
    }
    return seen;
  };
  const itemIds = unique("item", menu.items.map((item) => item.id));
  const ingredientIds = unique("ingredient", (menu.ingredients ?? []).map((ingredient) => ingredient.id));
  const items = new Map(menu.items.map((item) => [item.id, item]));
  const selectableIngredients = new Set([...ingredientIds, ...menu.items.filter((item) => item.ingredientEligible).map((item) => item.id)]);
  const checkIngredient = (id: string, owner: string) => {
    if (!selectableIngredients.has(id)) errors.push(`${owner}: ingredient "${id}" does not exist or is not selectable.`);
    return id;
  };
  const checkVariant = (owner: string, variant: string) => {
    if (!items.get(owner)?.variants?.some((entry) => entry.id === variant)) {
      errors.push(`${owner}: variant "${variant}" does not exist.`);
    }
    return variant;
  };
  const checkItem = (id: string) => {
    if (!itemIds.has(id)) errors.push(`Relationship references missing item "${id}".`);
    return id;
  };
  const completePanel = (nutrition: Nutrition) => [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.totalFat]
    .every((value) => Number.isFinite(value) && value >= 0);
  const checkContexts = (contexts: MenuItem["ingredientNutritionContexts"], owner: string) => {
    for (const [id, context] of Object.entries(contexts ?? {})) {
      checkIngredient(id, owner);
      if (!completePanel(context.nutrition)) {
        errors.push(`${owner}: incomplete contextual nutrition for "${id}".`);
      }
    }
  };

  const categoryIds = new Set<string>();
  const presetComponentIds = new Set([...itemIds, ...ingredientIds]);
  const presetBuilderIds = new Set(Object.values(menu.builderConfig?.entreeOptions ?? {}).map((option) => option.id));
  for (const record of [...menu.items, ...(menu.ingredients ?? [])]) {
    unique(`${record.id} variant`, (record.variants ?? []).map((variant) => variant.id));
    if (record.defaultVariantId && !(record.variants ?? []).some((variant) => variant.id === record.defaultVariantId)) {
      errors.push(`${record.id}: default variant "${record.defaultVariantId}" does not exist.`);
    }
  }
  for (const [id, group] of Object.entries(menu.addonGroups ?? {})) {
    for (const itemId of group.itemIds) {
      if (!items.get(itemId)?.addonEligible) errors.push(`Add-on group "${id}" references unavailable add-on "${itemId}".`);
    }
  }
  for (const item of menu.items) {
    if (item.mealPreset) errors.push(...getMealPresetErrors(item.mealPreset, item.id, presetBuilderIds, presetComponentIds));
    const checkIds = { item: checkItem, ingredient: (id: string) => checkIngredient(id, item.id), variant: checkVariant };
    const orderingIds = {
      ...checkIds,
      ingredient: (id: string) => items.get(id)?.addonEligible ? id : checkIngredient(id, item.id),
    };
    if (item.orderingPlan) remapOrderingPlan(item.orderingPlan, orderingIds);
    for (const plan of item.additionalOrderingPlans ?? []) remapOrderingPlan(plan, orderingIds);
    if (item.comboConfig) remapCombo(item.comboConfig, item.id, checkIds);
    for (const [variant, config] of Object.entries(item.comboConfigByVariantId ?? {})) {
      checkVariant(item.id, variant);
      remapCombo(config, item.id, checkIds);
    }
    for (const id of item.addonRefs ?? []) {
      if (!menu.addonGroups?.[id]) errors.push(`${item.id}: add-on group "${id}" does not exist.`);
    }
    if (item.ingredientRef) checkIngredient(item.ingredientRef, item.id);
    checkContexts(item.ingredientNutritionContexts, item.id);
    for (const variant of item.variants ?? []) checkContexts(variant.ingredientNutritionContexts, `${item.id}/${variant.id}`);
    for (const variant of Object.keys(item.customizationByVariantId ?? {})) checkVariant(item.id, variant);
    for (const [variant, id] of Object.entries(item.proteinExtraByVariantId ?? {})) {
      checkVariant(item.id, variant);
      checkIngredient(id, item.id);
    }
    for (const reference of item.ingredients ?? []) {
      const delimiter = reference.lastIndexOf(":");
      const id = selectableIngredients.has(reference) || delimiter < 0 ? reference : reference.slice(0, delimiter);
      checkIngredient(id, item.id);
    }
    const categories = [
      ...(item.customization?.ingredientCategories ?? []),
      ...Object.values(item.customizationByVariantId ?? {}).flatMap((entry) => entry.ingredientCategories ?? []),
    ];
    for (const category of categories) {
      if (category.id) categoryIds.add(category.id);
      categoryIds.add(category.name);
      for (const id of category.ingredients) {
        checkIngredient(id, `${item.id} › ${category.name}`);
      }
    }
  }
  for (const ingredient of menu.ingredients ?? []) {
    if (ingredient.contextualNutritionUnits?.some((unit) => !completePanel(unit.nutrition))) {
      errors.push(`${ingredient.id}: incomplete contextual nutrition unit.`);
    }
    // canonicalIngredientId is a grouping key; it can identify a logical
    // ingredient with no independently browsable runtime record.
    for (const [count, delta] of Object.entries(ingredient.nutritionDeltaByCount ?? {})) {
      if (![delta.calories, delta.protein, delta.carbs, delta.totalFat].every(Number.isFinite)) {
        errors.push(`${ingredient.id}: incomplete nutrition delta for count "${count}".`);
      }
    }
  }
  for (const id of [...Object.keys(menu.customizationRules?.ingredientCategories ?? {}), ...Object.keys(menu.builderConfig?.categoryMaxSelections ?? {})]) {
    if (!categoryIds.has(id)) errors.push(`Selection rule "${id}" belongs to no ingredient category.`);
  }
  for (const [key, option] of Object.entries(menu.builderConfig?.entreeOptions ?? {})) {
    if (!itemIds.has(option.id)) errors.push(`Entree option "${key}" points at missing item "${option.id}".`);
    for (const id of option.includedIngredientIds ?? []) {
      if (!ingredientIds.has(id)) errors.push(`Entree option "${key}" includes missing ingredient "${id}".`);
    }
  }
  if (Boolean(menu.hasBuildYourOwn) !== Object.keys(menu.builderConfig?.entreeOptions ?? {}).length > 0) {
    errors.push("hasBuildYourOwn does not match the builder configuration.");
  }
  return errors;
}
