import type { IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";
export type IngredientSelectionMode = "quantity" | "single";

export function normalizeTabName(value: string) {
  return value.trim().toLowerCase();
}

function getIngredientCategories(ingredient?: Pick<IngredientItem, "category" | "categories">) {
  return ingredient.categories?.length
    ? ingredient.categories.filter(Boolean)
    : ingredient.category
      ? [ingredient.category]
      : [];
}

export function deriveIngredientTabsFromIncludedIngredients(
  item: MenuItem,
  ingredientItems: IngredientItem[] = []
) {
  if (!item.ingredients?.length || ingredientItems.length === 0) {
    return [];
  }

  const ingredientLookup = new Map<string, IngredientItem>();
  const ingredientNameLookup = new Map<string, IngredientItem>();

  ingredientItems.forEach((ingredient) => {
    if (ingredient.id) {
      ingredientLookup.set(ingredient.id.toLowerCase(), ingredient);
    }

    ingredientNameLookup.set(normalizeTabName(ingredient.name), ingredient);
  });

  return item.ingredients.reduce<string[]>((tabs, ingredientId) => {
    const ingredient =
      ingredientLookup.get(ingredientId.toLowerCase()) ?? ingredientNameLookup.get(normalizeTabName(ingredientId));

    getIngredientCategories(ingredient).forEach((category) => {
      const normalizedCategory = normalizeTabName(category);
      if (!normalizedCategory || normalizedCategory === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
        return;
      }

      if (!tabs.some((candidate) => normalizeTabName(candidate) === normalizedCategory)) {
        tabs.push(category);
      }
    });

    return tabs;
  }, []);
}

export function getIngredientTabDisplayLabel(tabName: string) {
  const normalized = normalizeTabName(tabName);
  if (normalized.endsWith(" toppings") || normalized === "toppings") {
    return "Toppings";
  }

  if (normalized.endsWith(" condiments") || normalized === "condiments") {
    return "Condiments";
  }

  return tabName;
}

export function resolveIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules,
  ingredientItems: IngredientItem[] = []
) {
  const itemLevelTabs = item.customization?.ingredientTabs?.filter(Boolean) ?? [];
  const primaryCategory = item.categories?.[0];
  const restaurantLevelTabs =
    primaryCategory
      ? customizationRules?.ingredientTabsByItemCategory?.[primaryCategory]?.filter(Boolean) ?? []
      : [];
  const derivedTabs = deriveIngredientTabsFromIncludedIngredients(item, ingredientItems);

  const configuredTabs = itemLevelTabs.length > 0 ? itemLevelTabs : restaurantLevelTabs;
  const dedupedConfiguredTabs = [...configuredTabs, ...derivedTabs].filter((tab, index, allTabs) => {
    const normalizedTab = normalizeTabName(tab);
    if (!normalizedTab || normalizedTab === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
      return false;
    }

    return allTabs.findIndex((candidate) => normalizeTabName(candidate) === normalizedTab) === index;
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
  customizationRules?: RestaurantCustomizationRules,
  ingredientItems: IngredientItem[] = []
) {
  return new Set(
    resolveIngredientTabs(item, customizationRules, ingredientItems)
      .filter((tab) => resolveIngredientTabMaxQuantity(item, tab, customizationRules) === 1)
      .map((tab) => normalizeTabName(tab))
      .filter((tab) => tab && tab !== normalizeTabName(INCLUDED_INGREDIENT_TAB))
  );
}

export function ingredientMatchesTab(ingredient: IngredientItem, tabName: string) {
  return getIngredientCategories(ingredient).some(
    (category) => normalizeTabName(category) === normalizeTabName(tabName)
  );
}

export function isSingleSelectIngredientTab(
  item: MenuItem,
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  return resolveIngredientTabMaxQuantity(item, tabName, customizationRules) === 1;
}
