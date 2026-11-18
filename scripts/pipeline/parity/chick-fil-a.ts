import { isDeepStrictEqual } from "node:util";
import { resolveAddonMenuItems } from "../../../lib/addonGroups";
import { resolveComboDrinkOptions, resolveComboMealConfig, resolveComboSideOptions } from "../../../lib/comboMeals";
import type { RestaurantMenu } from "../../../types/menu";
import type { RestaurantDraft, PartialNutrition } from "../contracts";
import { ALL_NUTRIENTS } from "../contracts";
import type { RuntimeProjection } from "../project";
import type { buildChickFilAFromCaptures } from "../../importers/chick-fil-a";

type Baseline = Awaited<ReturnType<typeof buildChickFilAFromCaptures>>["restaurantOutput"];

function sameNutrition(left: PartialNutrition | undefined, right: PartialNutrition | undefined) {
  return ALL_NUTRIENTS.every((key) => left?.[key] === right?.[key]);
}

function sameJson(left: unknown, right: unknown) {
  const json = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  return isDeepStrictEqual(json(left), json(right));
}

function compareRuntimeRelationships(baseline: RestaurantMenu, projected: RestaurantMenu) {
  const differences = {
    comboBehavior: [] as string[],
    addonGroups: [] as string[],
    itemRelationships: [] as string[],
    ingredientUnits: [] as string[],
  };
  const byId = new Map(baseline.items.map((item) => [item.id, item]));
  const flags = ["addonRefs", "ingredients", "customization", "customizationByVariantId",
    "ingredientNutritionContexts", "informationalIngredients", "proteinExtraByVariantId",
    "addonEligible", "ingredientEligible", "sourceOnly"] as const;
  const appOptions = (menu: RestaurantMenu, item: RestaurantMenu["items"][number], variantId?: string) => ({
    config: resolveComboMealConfig("chickfila", item, menu.items, variantId),
    sides: resolveComboSideOptions("chickfila", item, menu.items, variantId).map((side) => side.id),
    drinks: resolveComboDrinkOptions("chickfila", item, menu.items, variantId).map((drink) => drink.id),
  });
  let comboCases = 0;
  for (const item of projected.items) {
    const previous = byId.get(item.id);
    if (!previous) {
      differences.itemRelationships.push(item.id);
      continue;
    }
    for (const field of flags) {
      if (!sameJson(item[field], previous[field])) differences.itemRelationships.push(`${item.id}/${field}`);
    }
    for (const variant of item.variants ?? []) {
      const before = previous.variants?.find((entry) => entry.id === variant.id);
      if (!sameJson(variant.ingredientNutritionContexts, before?.ingredientNutritionContexts)) {
        differences.itemRelationships.push(`${item.id}/${variant.id}/ingredientNutritionContexts`);
      }
    }
    for (const variant of [undefined, ...(item.variants ?? []).map((variant) => variant.id)]) {
      comboCases++;
      if (!sameJson(appOptions(baseline, previous, variant), appOptions(projected, item, variant))) {
        differences.comboBehavior.push(variant ? `${item.id}/${variant}` : item.id);
      }
    }
  }
  const beforeAddons = resolveAddonMenuItems(baseline.addonGroups, baseline.items);
  const afterAddons = resolveAddonMenuItems(projected.addonGroups, projected.items);
  for (const [id, group] of Object.entries(beforeAddons)) {
    const after = afterAddons[id];
    if (!after || !sameJson(group.items.map((item) => item.id), after.items.map((item) => item.id)) ||
        group.label !== after.label || group.maxPerItem !== after.maxPerItem) differences.addonGroups.push(id);
  }
  for (const ingredient of baseline.ingredients ?? []) {
    const after = projected.ingredients?.find((entry) => entry.id === ingredient.id);
    if (!after || !sameJson(ingredient.contextualNutritionUnits, after.contextualNutritionUnits) ||
        !sameNutrition(ingredient.nutrition, after.nutrition) || ingredient.maxQuantity !== after.maxQuantity) {
      differences.ingredientUnits.push(ingredient.id);
    }
  }
  return { comboCases, differences };
}

export function compareChickFilA(baseline: Baseline, draft: RestaurantDraft, projection: RuntimeProjection) {
  const draftItems = new Map(draft.items.map((item) => [item.id, item]));
  const runtimeItems = new Map(projection.menu.items.map((item) => [item.id, item]));
  const draftIngredients = new Map(draft.ingredients.map((item) => [item.id, item]));
  const draftOptionCounts = { groups: 0, options: 0, contextualPanels: 0 };
  const differences = {
    itemIds: [] as string[],
    ingredientIds: [] as string[],
    nutrition: [] as string[],
    variants: [] as string[],
    categoryOrServingType: [] as string[],
    defaults: [] as string[],
    groups: [] as string[],
    runtimeVariants: [] as string[],
    runtimeNutrition: [] as string[],
    defaultVariantParentNutrition: [] as string[],
    contextualPanelsMissing: [] as string[],
  };
  const rawEdges = baseline.sourceRelationships.itemGroups.flatMap((group) => group.options);
  let baselineVariants = 0;
  let publishedPanels = 0;
  let baselineContexts = 0;
  let stagedVariants = 0;

  function comparePanel(id: string, before?: PartialNutrition, after?: PartialNutrition) {
    if (before) publishedPanels += 1;
    if (!sameNutrition(before, after)) differences.nutrition.push(id);
  }

  for (const item of baseline.items) {
    const target = draftItems.get(item.id);
    if (!target) {
      differences.itemIds.push(item.id);
      continue;
    }
    if (target.category !== item.categories[0] || target.servingType !== item.servingType) {
      differences.categoryOrServingType.push(item.id);
    }
    comparePanel(item.id, item.nutrition, target.nutrition.values);
    for (const variant of item.variants ?? []) {
      baselineVariants += 1;
      const id = `${item.id}/${variant.id}`;
      const candidate = target.variants.find((entry) => entry.id === id);
      if (candidate?.label !== variant.label) differences.variants.push(id);
      if (candidate?.category !== variant.categories[0] || candidate?.servingType !== variant.servingType) {
        differences.categoryOrServingType.push(id);
      }
      if (candidate?.isDefault !== (item.defaultVariantId === variant.id)) differences.defaults.push(id);
      comparePanel(id, variant.nutrition, candidate?.nutrition.values);
    }
    const runtime = runtimeItems.get(item.id);
    if (runtime) {
      for (const variant of runtime.variants ?? []) {
        stagedVariants += 1;
        const previous = item.variants?.find((entry) => entry.id === variant.id);
        if (previous?.label !== variant.label) differences.runtimeVariants.push(`${item.id}/${variant.id}`);
        if (!sameNutrition(previous?.nutrition, variant.nutrition)) differences.runtimeNutrition.push(`${item.id}/${variant.id}`);
      }
      if (!sameNutrition(item.nutrition, runtime.nutrition)) {
        const defaultVariant = item.variants?.find((entry) => entry.id === runtime.defaultVariantId);
        if (!item.nutrition && defaultVariant?.nutrition && sameNutrition(defaultVariant.nutrition, runtime.nutrition)) {
          differences.defaultVariantParentNutrition.push(item.id);
        } else {
          differences.runtimeNutrition.push(item.id);
        }
      }
    }
    const groups = item.customization?.ingredientCategories ?? [];
    const itemContexts = Object.entries(item.ingredientNutritionContexts ?? {});
    baselineContexts += itemContexts.length;
    if (groups.length !== target.groups.length || groups.some((group, index) => {
      const translated = target.groups[index];
      return translated.label !== group.name || translated.options.length !== group.ingredients.length ||
        translated.options.some((option, optionIndex) => {
          const recordId = group.ingredients[optionIndex];
          return !option.id.endsWith(`:${recordId}`) || option.isDefault !== (item.ingredients?.includes(recordId) ?? false);
        }) ||
        (group.allowNone !== undefined && group.allowNone !== !translated.minSelections) ||
        translated.maxSelections !== (baseline.customizationRules.ingredientCategories[group.id ?? ""]?.maxQuantity ?? null);
    })) differences.groups.push(item.id);
    for (const [ingredientId, context] of itemContexts) {
      const options = target.groups.flatMap((group) => group.options);
      if (!options.some((option) => option.ingredientId === ingredientId &&
          sameNutrition(context.nutrition, option.nutrition.values))) {
        differences.contextualPanelsMissing.push(`${item.id}/${ingredientId}`);
      }
    }
    for (const group of [...target.groups, ...target.variants.flatMap((variant) => variant.groups ?? [])]) {
      draftOptionCounts.groups += 1;
      draftOptionCounts.options += group.options.length;
      draftOptionCounts.contextualPanels += group.options.filter((option) =>
        option.nutrition.observations.some((observation) => observation.basis?.kind === "selected_portion"),
      ).length;
    }
  }
  for (const ingredient of baseline.ingredients) {
    const target = draftIngredients.get(ingredient.id);
    if (!target) differences.ingredientIds.push(ingredient.id);
    comparePanel(ingredient.id, ingredient.nutrition, target?.nutrition.values);
  }

  return {
    baseline: {
      items: baseline.items.length,
      ingredients: baseline.ingredients.length,
      variants: baselineVariants,
      panelsPresent: publishedPanels,
      contextualItemPanels: baselineContexts,
      combos: baseline.items.filter((item) => item.comboConfig).length,
      addonGroups: Object.keys(baseline.addonGroups).length,
      sourceGroups: baseline.sourceRelationships.itemGroups.length,
      sourceEdges: rawEdges.length,
      nestedGroupReferences: rawEdges.filter((edge) => edge.referencedItemGroupId !== null).length,
      constrainedEdges: rawEdges.filter((edge) => edge.minimum !== null || edge.maximum !== null || edge.thirdPartyMinimum !== null).length,
      edgeNutritionUnits: rawEdges.filter((edge) => edge.modifierNutritionUnit !== null).length,
    },
    draftOptions: draftOptionCounts,
    runtime: {
      items: projection.menu.items.length,
      ingredients: projection.menu.ingredients?.length ?? 0,
      variants: stagedVariants,
      executableOrderingPlans: projection.menu.items.reduce((total, item) => total + Number(Boolean(item.orderingPlan)) + (item.additionalOrderingPlans?.length ?? 0), 0),
      comboCarriers: projection.menu.items.filter((item) => item.comboConfig).length,
      addonGroups: Object.keys(projection.menu.addonGroups ?? {}).length,
      itemContexts: projection.menu.items.filter((item) => item.ingredientNutritionContexts).length,
      variantContexts: projection.menu.items.flatMap((item) => item.variants ?? []).filter((variant) => variant.ingredientNutritionContexts).length,
      sourceOnlyWithoutNutrition: projection.menu.items.filter((item) => item.sourceOnly && !item.nutrition).length,
      idsReused: projection.menu.items.filter((item) => draftItems.has(item.id)).length,
      registryAdditions: projection.ids.additions.length,
      registryConflicts: projection.ids.conflicts.length,
      relationshipErrors: projection.relationshipErrors,
      excludedByReason: Object.fromEntries([...new Set(projection.excluded.map((entry) => entry.reason))]
        .map((reason) => [reason, projection.excluded.filter((entry) => entry.reason === reason).length])),
    },
    preservedGraph: {
      groups: draft.orderingGraph?.groups.length ?? 0,
      edges: draft.orderingGraph?.groups.reduce((total, group) => total + group.options.length, 0) ?? 0,
    },
    runtimeRelationships: compareRuntimeRelationships(baseline as unknown as RestaurantMenu, projection.menu),
    differences,
  };
}
