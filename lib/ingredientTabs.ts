import type { FoodCategoryRule, IngredientCategoryRule, IngredientItem, MenuItem, RestaurantCustomizationRules } from "@/types/menu";

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
  customizationRules?: RestaurantCustomizationRules,
  item?: MenuItem
): IngredientCategoryRule | undefined {
  // Generated data can give an item-level category a stable internal `id`
  // distinct from its display `name` (two different items can legitimately
  // show the same clean tab name, e.g. "Bread Carriers", while each needing
  // its own max-quantity/allowNone rule) — when present, that id is the real
  // key into the restaurant-level rule map, not the display name. If more
  // than one of the item's own categories share this display name (see
  // resolveIngredientItemCategory), take the most permissive combination of
  // their rules rather than an arbitrary one.
  const matchingCategories = item ? findIngredientCategoriesByName(item, categoryName) : [];
  const idRules = matchingCategories
    .map((category) =>
      category.id ? resolveRuleValueByCategoryKey(customizationRules?.ingredientCategories, category.id) : undefined
    )
    .filter((rule): rule is IngredientCategoryRule => Boolean(rule));

  if (idRules.length > 0) {
    const hasUnlimited = idRules.some((rule) => rule.maxQuantity === undefined);
    return {
      allowNone: idRules.some((rule) => rule.allowNone),
      ...(hasUnlimited
        ? {}
        : { maxQuantity: Math.max(...idRules.map((rule) => rule.maxQuantity as number)) }),
    };
  }

  return resolveRuleValueByCategoryKey(customizationRules?.ingredientCategories, categoryName);
}

// Aliases for raw source group names that map 1:1 onto Macro Maxxer's
// standard customization vocabulary (currently sourced from Chick-fil-A's
// generated modifier-group names — see scripts/importers/chick-fil-a.ts).
// Keyed on the literal raw name rather than a restaurant check, since these
// strings are unique to their source by construction.
const TAB_NAME_ALIASES: Record<string, string> = {
  "bread carriers": "Buns",
  "breakfast bread carriers": "Buns",
  "shredded cheese group": "Cheeses",
  cheese: "Cheeses",
  "sandwich remove modifiers": "Toppings",
  "add pickles mod": "Toppings",
  "breakfast removal": "Toppings",
  "paid salad toppings": "Toppings",
  "parfait fruit modifier": "Toppings",
  "parfait modifiers": "Toppings",
  "extra salad proteins": "Protein",
  // A small, item-specific sauce/syrup selection (e.g. "Classic Syrup" on a
  // breakfast sandwich) — distinct from the large individual sauce/condiment
  // addon collections, which are handled separately as tertiary "Extra
  // sauces & condiments" options (see ItemDetailsPanel's AddonCustomizationSection).
  "individual sauces": "Sauces",
};

export function getIngredientTabDisplayLabel(tabName: string) {
  const normalized = normalizeTabName(tabName);
  if (TAB_NAME_ALIASES[normalized]) {
    return TAB_NAME_ALIASES[normalized];
  }

  if (normalized.endsWith(" toppings") || normalized === "toppings") {
    return "Toppings";
  }

  if (normalized.endsWith(" condiments") || normalized === "condiments") {
    return "Condiments";
  }

  return tabName;
}

function findIngredientCategoriesByName(item: MenuItem, categoryName: string) {
  const normalizedCategoryName = normalizeTabName(categoryName);

  return (item.customization?.ingredientCategories ?? []).filter(
    (category) => normalizeTabName(category.name) === normalizedCategoryName
  );
}

// A display name can legitimately be shared by more than one of an item's
// own categories (generated data disambiguates them internally via `id`,
// not the name — see IngredientItemCategory). Merge their ingredient lists
// instead of returning just the first match, so a real ingredient option
// never silently disappears because another category happened to render
// under the same tab name.
export function resolveIngredientItemCategory(item: MenuItem, categoryName: string) {
  const matches = findIngredientCategoriesByName(item, categoryName);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  return {
    name: matches[0].name,
    ingredients: Array.from(new Set(matches.flatMap((category) => category.ingredients))),
    allowNone: matches.some((category) => category.allowNone),
  };
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

  return resolveIngredientCategoryRule(tabName, customizationRules, item)?.maxQuantity;
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
