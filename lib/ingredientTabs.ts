import type { IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";
export type IngredientSelectionMode = "quantity" | "single";

function normalizeTabName(value: string) {
  return value.trim().toLowerCase();
}

export function resolveIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
) {
  const itemLevelTabs = item.customization?.ingredientTabs?.filter(Boolean) ?? [];
  const primaryCategory = item.categories?.[0];
  const restaurantLevelTabs =
    primaryCategory
      ? customizationRules?.ingredientTabsByItemCategory?.[primaryCategory]?.filter(Boolean) ?? []
      : [];

  const configuredTabs = itemLevelTabs.length > 0 ? itemLevelTabs : restaurantLevelTabs;
  const dedupedConfiguredTabs = configuredTabs.filter((tab, index) => {
    const normalizedTab = normalizeTabName(tab);
    if (!normalizedTab || normalizedTab === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
      return false;
    }

    return configuredTabs.findIndex((candidate) => normalizeTabName(candidate) === normalizedTab) === index;
  });

  return [INCLUDED_INGREDIENT_TAB, ...dedupedConfiguredTabs];
}

export function resolveSingleSelectIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
) {
  const itemLevelTabs = item.customization?.singleSelectIngredientTabs?.filter(Boolean) ?? [];
  const primaryCategory = item.categories?.[0];
  const restaurantLevelTabs =
    primaryCategory
      ? customizationRules?.singleSelectIngredientTabsByItemCategory?.[primaryCategory]?.filter(Boolean) ?? []
      : [];

  const configuredTabs = itemLevelTabs.length > 0 ? itemLevelTabs : restaurantLevelTabs;

  return new Set(
    configuredTabs
      .map((tab) => normalizeTabName(tab))
      .filter((tab) => tab && tab !== normalizeTabName(INCLUDED_INGREDIENT_TAB))
  );
}

export function resolveSingleSelectIngredientIdsByTab(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
) {
  const primaryCategory = item.categories?.[0];
  const restaurantLevelConfig =
    primaryCategory
      ? customizationRules?.singleSelectIngredientIdsByTabByItemCategory?.[primaryCategory] ?? {}
      : {};
  const itemLevelConfig = item.customization?.singleSelectIngredientIdsByTab ?? {};
  const mergedConfig = { ...restaurantLevelConfig, ...itemLevelConfig };

  return Object.entries(mergedConfig).reduce<Record<string, Set<string>>>((acc, [tabName, ingredientIds]) => {
    const normalizedTabName = normalizeTabName(tabName);
    if (!normalizedTabName || normalizedTabName === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
      return acc;
    }

    acc[normalizedTabName] = new Set((ingredientIds ?? []).map((ingredientId) => ingredientId.toLowerCase()));
    return acc;
  }, {});
}

export function ingredientMatchesTab(ingredient: IngredientItem, tabName: string) {
  const ingredientCategories = ingredient.categories?.length
    ? ingredient.categories
    : ingredient.category
      ? [ingredient.category]
      : [];

  return ingredientCategories.some((category) => normalizeTabName(category) === normalizeTabName(tabName));
}
