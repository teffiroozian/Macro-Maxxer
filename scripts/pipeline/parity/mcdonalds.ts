import { isDeepStrictEqual } from "node:util";
import { resolveComboBundleOptions, resolveComboDrinkOptions, resolveComboMealConfig, resolveComboSideOptions } from "../../../lib/comboMeals";
import type { MenuItem, RestaurantMenu } from "../../../types/menu";
import type { RestaurantDraft } from "../contracts";
import { checkRuntimeMenu, type RuntimeProjection } from "../project";

const comparable = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const same = (left: unknown, right: unknown) => isDeepStrictEqual(comparable(left), comparable(right));
const context = (item: MenuItem, menu: RestaurantMenu, variant?: string) => [
  resolveComboMealConfig("mcdonalds", item, menu.items, variant),
  resolveComboSideOptions("mcdonalds", item, menu.items, variant).map((entry) => [entry.id, entry.variants?.map((size) => size.id)]),
  resolveComboDrinkOptions("mcdonalds", item, menu.items, variant).map((entry) => [entry.id, entry.variants?.map((size) => size.id)]),
  resolveComboBundleOptions("mcdonalds", item, menu.items, variant).map((entry) => [entry.id, entry.nutrition]),
];

export function compareMcDonalds(live: RestaurantMenu, draft: RestaurantDraft, projection: RuntimeProjection) {
  const previous = new Map(live.items.map((item) => [item.id, item]));
  const normalizedBaseline: RestaurantMenu = {
    ...live,
    items: live.items.map((item) => {
      const defaultPanel = item.variants?.find((variant) => variant.id === item.defaultVariantId)?.nutrition;
      return defaultPanel ? { ...item, nutrition: defaultPanel } : item;
    }),
  };
  const previousIngredients = new Map(live.ingredients?.map((ingredient) => [ingredient.id, ingredient]));
  const differences: string[] = [];
  const normalizedDefaultPanels: string[] = [];
  const enrichedPackets: string[] = [];
  let comboCases = 0;
  let sizePanels = 0;
  const withheldIds = new Set(projection.excluded.map((entry) => entry.id));
  const publishedItems = new Set(projection.menu.items.map((item) => item.id));
  for (const item of live.items) if (!publishedItems.has(item.id)) differences.push(`${item.id}/missing`);
  for (const item of projection.menu.items) {
    const before = previous.get(item.id);
    if (!before) { differences.push(`${item.id}/new`); continue; }
    for (const field of ["defaultVariantId", "categories", "name", "image", "defaultOrder", "sourceOnly", "servingType"] as const) {
      if (!same(before[field], item[field])) differences.push(`${item.id}/${field}`);
    }
    if (!same(before.nutrition, item.nutrition)) {
      const defaultPanel = before.variants?.find((variant) => variant.id === before.defaultVariantId)?.nutrition;
      if (defaultPanel && same(defaultPanel, item.nutrition)) normalizedDefaultPanels.push(item.id);
      else if (before.source?.generated?.menu.role !== "non_nutrition_bundle_component" || item.nutrition) differences.push(`${item.id}/nutrition`);
    }
    if (!same(before.variants?.map((size) => size.id), item.variants?.map((size) => size.id))) differences.push(`${item.id}/size_ids`);
    for (const size of item.variants ?? []) {
      sizePanels++;
      const original = before.variants?.find((variant) => variant.id === size.id);
      if (!original || !same([original.nutrition, original.categories, original.canonicalItemId, original.label],
        [size.nutrition, size.categories, size.canonicalItemId, size.label])) differences.push(`${item.id}/${size.id}`);
    }
    for (const variant of [undefined, ...(item.variants ?? []).map((size) => size.id)]) {
      comboCases++;
      if (!same(context(before, normalizedBaseline, variant), context(item, projection.menu, variant))) differences.push(`${item.id}/${variant ?? "default"}/combo`);
    }
    // The baseline attached both Nuggets and Strips override maps to each
    // parent. Only inspect legacy variant tabs that the parent could select.
    const refs = (record: MenuItem) => {
      const own = new Set(record.variants?.map((variant) => variant.id));
      return [
        ...(record.ingredients ?? []),
        ...(record.customization?.ingredientCategories ?? []).flatMap((group) => group.ingredients),
        ...Object.entries(record.customizationByVariantId ?? {}).flatMap(([id, override]) => own.has(id)
          ? override.ingredientCategories?.flatMap((group) => group.ingredients) ?? []
          : []),
      ].map((id) => id.split(":")[0]);
    };
    const expected = new Set(refs(before).filter((id) => !withheldIds.has(id)));
    const actual = new Set(refs(item));
    if (!isDeepStrictEqual(expected, actual)) differences.push(`${item.id}/customization_membership`);
  }
  for (const ingredient of projection.menu.ingredients ?? []) {
    const before = previousIngredients.get(ingredient.id);
    if (!before || !same([before.nutritionDeltaByCount, before.orderingOptionIdByCount, before.orderingGroupIdByCount, before.maxQuantity],
      [ingredient.nutritionDeltaByCount, ingredient.orderingOptionIdByCount, ingredient.orderingGroupIdByCount, ingredient.maxQuantity])) {
      differences.push(`${ingredient.id}/modifier_actions`);
    }
    if (!same(before?.nutrition, ingredient.nutrition)) {
      if (ingredient.canonicalIngredientId === "mcd-item-200268" && same(previous.get("mcd-item-200268")?.nutrition, ingredient.nutrition)) enrichedPackets.push(ingredient.id);
      else differences.push(`${ingredient.id}/nutrition`);
    }
  }
  return {
    draft: draft.summary,
    runtime: {
      items: projection.menu.items.length, sizePanels, ingredients: projection.menu.ingredients?.length ?? 0,
      comboCases, withheldModifierRecords: withheldIds.size, normalizedDefaultPanels, enrichedPackets,
      issuedIds: projection.ids.additions.length, idConflicts: projection.ids.conflicts.length,
      legacyReferenceErrors: checkRuntimeMenu(live), runtimeReferenceErrors: checkRuntimeMenu(projection.menu),
    },
    withheldEvidence: draft.configurationEvidence?.withheld,
    differences,
  };
}
