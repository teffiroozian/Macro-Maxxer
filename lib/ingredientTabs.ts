import type { IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";
export type IngredientSelectionMode = "quantity" | "single";

function singularizeCategoryToken(token: string) {
  if (token.endsWith("ies") && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("ses") || token.endsWith("xes") || token.endsWith("zes") || token.endsWith("ches") || token.endsWith("shes")) {
    return token;
  }

  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 1) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeCategoryTokens(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeCategoryToken);
}

export function normalizeTabName(value: string) {
  return normalizeCategoryTokens(value).join(" ");
}

export function getIngredientCategories(ingredient: IngredientItem) {
  return ingredient.categories?.length ? ingredient.categories : ingredient.category ? [ingredient.category] : [];
}

export function ingredientCategoryMatchesTab(category: string, tabName: string) {
  return normalizeTabName(category) === normalizeTabName(tabName);
}

export function getIngredientTabDisplayLabel(tabName: string) {
  const normalized = normalizeTabName(tabName);

  if (normalized.endsWith(" topping") || normalized === "topping") {
    return "Toppings";
  }

  if (normalized.endsWith(" condiment") || normalized === "condiment") {
    return "Condiments";
  }

  return tabName;
}

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules,
  ingredientItems: IngredientItem[] = []
) {
  const itemLevelTabs = item.customization?.ingredientTabs?.filter(Boolean) ?? [];
  const itemLevelSingleSelectTabs = item.customization?.singleSelectIngredientTabs?.filter(Boolean) ?? [];
  const primaryCategory = item.categories?.[0];
  const restaurantLevelTabs =
    primaryCategory
      ? customizationRules?.ingredientTabsByItemCategory?.[primaryCategory]?.filter(Boolean) ?? []
      : [];
  const restaurantLevelSingleSelectTabs =
    primaryCategory
      ? customizationRules?.singleSelectIngredientTabsByItemCategory?.[primaryCategory]?.filter(Boolean) ?? []
      : [];
  const configuredIngredientOptionTabs = primaryCategory
    ? Object.keys(customizationRules?.ingredientOptionsByItemCategory?.[primaryCategory] ?? {})
    : [];

  const explicitTabs = [...itemLevelTabs, ...itemLevelSingleSelectTabs];
  const aliasTabs =
    explicitTabs.length > 0
      ? explicitTabs
      : [...restaurantLevelTabs, ...restaurantLevelSingleSelectTabs, ...configuredIngredientOptionTabs];

  const ingredientById = new Map<string, IngredientItem>();
  const ingredientByName = new Map<string, IngredientItem>();

  ingredientItems.forEach((ingredient) => {
    if (ingredient.id) {
      ingredientById.set(ingredient.id.toLowerCase(), ingredient);
    }

    ingredientByName.set(normalizeLookupKey(ingredient.name), ingredient);
  });

  const detectedTabs = (item.ingredients ?? [])
    .flatMap((ingredientId) => {
      const ingredient =
        ingredientById.get(ingredientId.toLowerCase()) ??
        ingredientByName.get(normalizeLookupKey(ingredientId));

      return ingredient ? getIngredientCategories(ingredient) : [];
    })
    .map((category) => {
      return aliasTabs.find((tab) => ingredientCategoryMatchesTab(category, tab)) ?? category;
    });

  const tabsToRender = [...explicitTabs, ...configuredIngredientOptionTabs, ...detectedTabs].filter((tab, index, tabs) => {
    const normalizedTab = normalizeTabName(tab);
    if (!normalizedTab || normalizedTab === normalizeTabName(INCLUDED_INGREDIENT_TAB)) {
      return false;
    }

    return tabs.findIndex((candidate) => normalizeTabName(candidate) === normalizedTab) === index;
  });

  return [
    INCLUDED_INGREDIENT_TAB,
    ...tabsToRender.filter((tab) => typeof resolveIngredientTabMaxQuantity(item, tab, customizationRules) === "number"),
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
  return getIngredientCategories(ingredient).some((category) => ingredientCategoryMatchesTab(category, tabName));
}

export function isSingleSelectIngredientTab(
  item: MenuItem,
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  return resolveIngredientTabMaxQuantity(item, tabName, customizationRules) === 1;
}
