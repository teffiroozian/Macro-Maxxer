import type {
  FoodCategoryRule,
  IngredientCategoryRule,
  IngredientItem,
  MenuItem,
  RestaurantCustomizationRules,
} from "@/types/menu";

export const INCLUDED_INGREDIENT_TAB = "Included";
export type IngredientSelectionMode = "quantity" | "single";

export function normalizeTabName(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRuleLookupKey(value: string) {
  return value.trim().toLowerCase();
}

export function resolvePrimaryCategory(categories?: string[]) {
  return categories?.map((category) => category.trim()).find(Boolean);
}

function resolveRuleValueByCategoryKey<T>(
  rules: Partial<Record<string, T>> | undefined,
  categoryKey: string | undefined
) {
  if (!categoryKey) {
    return undefined;
  }

  const normalizedCategoryKey = normalizeRuleLookupKey(categoryKey);
  return Object.entries(rules ?? {}).find(
    ([candidateKey]) => normalizeRuleLookupKey(candidateKey) === normalizedCategoryKey
  )?.[1];
}

export function resolveFoodCategoryRule(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
): FoodCategoryRule | undefined {
  return resolveRuleValueByCategoryKey(customizationRules?.foodCategories, resolvePrimaryCategory(item.categories));
}

export function resolveIngredientCategoryRule(
  categoryName: string,
  customizationRules?: RestaurantCustomizationRules
): IngredientCategoryRule | undefined {
  return resolveRuleValueByCategoryKey(customizationRules?.ingredientCategories, categoryName);
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

export function resolveItemCustomizationIngredientCategory(item: MenuItem, categoryName: string) {
  const normalizedCategoryName = normalizeTabName(categoryName);

  return item.customization?.ingredientCategories?.find(
    (category) => normalizeTabName(category.name) === normalizedCategoryName
  );
}

export function resolveIngredientTabs(
  item: MenuItem,
  customizationRules?: RestaurantCustomizationRules
) {
  if (item.customization?.disabled) {
    return [INCLUDED_INGREDIENT_TAB];
  }

  const itemLevelCategories = item.customization?.ingredientCategories?.map((category) => category.name).filter(Boolean) ?? [];
  const restaurantLevelTabs = resolveFoodCategoryRule(item, customizationRules)?.ingredientCategories.filter(Boolean) ?? [];

  const configuredTabs = itemLevelCategories.length > 0 ? itemLevelCategories : restaurantLevelTabs;
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

  return resolveIngredientCategoryRule(tabName, customizationRules)?.maxQuantity;
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
  const ingredientCategories = ingredient.categories?.length ? ingredient.categories : [];

  return ingredientCategories.some((category) => normalizeTabName(category) === normalizeTabName(tabName));
}

export function isSingleSelectIngredientTab(
  item: MenuItem,
  tabName: string,
  customizationRules?: RestaurantCustomizationRules
) {
  return resolveIngredientTabMaxQuantity(item, tabName, customizationRules) === 1;
}
