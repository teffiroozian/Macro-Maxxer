import type { IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";
export type IngredientSelectionMode = "quantity" | "single";

function normalizeTabName(value: string) {
  return value.trim().toLowerCase();
}

export function getIngredientTabDisplayLabel(tabName: string) {
  return normalizeTabName(tabName) === "sandwich toppings" ? "Toppings" : tabName;
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

  return [
    INCLUDED_INGREDIENT_TAB,
    ...dedupedConfiguredTabs.filter((tab) => typeof resolveIngredientTabMaxQuantity(item, tab, customizationRules) === "number"),
  ];
}

export function resolveIngredientTabMaxQuantity(
  item: MenuItem,
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  const normalizedTabName = normalizeTabName(tabName);
  if (!normalizedTabName || normalizedTabName === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
    return undefined;
  }

  const itemLevelMaxQuantities = item.customization?.ingredientTabMaxQuantities;
  const itemLevelMax = Object.entries(itemLevelMaxQuantities ?? {}).find(
    ([candidateTab]) => normalizeTabName(candidateTab) === normalizedTabName
  )?.[1];

  if (typeof itemLevelMax === "number") {
    return itemLevelMax;
  }

  const restaurantLevelMax = Object.entries(customizationRules?.ingredientTabMaxQuantities ?? {}).find(
    ([candidateTab]) => normalizeTabName(candidateTab) === normalizedTabName
  )?.[1];

  if (typeof restaurantLevelMax === "number") {
    return restaurantLevelMax;
  }

  const primaryCategory = item.categories?.[0];
  const restaurantLevelMaxQuantitiesByCategory =
    primaryCategory ? customizationRules?.ingredientTabMaxQuantitiesByItemCategory?.[primaryCategory] : undefined;

  return Object.entries(restaurantLevelMaxQuantitiesByCategory ?? {}).find(
    ([candidateTab]) => normalizeTabName(candidateTab) === normalizedTabName
  )?.[1];
}

export function resolveSingleSelectIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
) {
  return new Set(
    resolveIngredientTabs(item, customizationRules)
      .filter((tab) => resolveIngredientTabMaxQuantity(item, tab, customizationRules) === 1)
      .map((tab) => normalizeTabName(tab))
      .filter((tab) => tab && tab !== normalizeTabName(INCLUDED_INGREDIENT_TAB))
  );
}

export function ingredientMatchesTab(ingredient: IngredientItem, tabName: string) {
  const ingredientCategories = ingredient.categories?.length
    ? ingredient.categories
    : ingredient.category
      ? [ingredient.category]
      : [];

  return ingredientCategories.some((category) => normalizeTabName(category) === normalizeTabName(tabName));
}

export function isSingleSelectIngredientTab(
  item: MenuItem,
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  return resolveIngredientTabMaxQuantity(item, tabName, customizationRules) === 1;
}
