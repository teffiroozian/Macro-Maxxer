import type { IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";

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

  return [INCLUDED_INGREDIENT_TAB, ...dedupedConfiguredTabs];
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
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  const singleSelectTabs = customizationRules?.singleSelectIngredientTabs ?? [];
  return singleSelectTabs.some((tab) => normalizeTabName(tab) === normalizeTabName(tabName));
}
