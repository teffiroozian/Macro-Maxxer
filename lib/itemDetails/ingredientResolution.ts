import {
  INCLUDED_INGREDIENT_TAB,
  getIngredientTabDisplayLabel,
  ingredientMatchesTab,
  normalizeTabName,
  resolveIngredientTabMaxQuantity,
  resolveIngredientTabs,
  resolveSingleSelectIngredientTabs,
  type IngredientSelectionMode,
} from "@/lib/ingredientTabs";
import {
  normalizeIngredientCategory,
  normalizeIngredientToken,
} from "@/lib/itemDetails/helpers";
import { resolveIncludedIngredientDefaults } from "@/lib/itemIngredients";
import type {
  AddonOption,
  IngredientItem,
  ItemVariant,
  MenuItem,
  Nutrition,
  RestaurantAddons,
  RestaurantCustomizationRules,
} from "@/types/menu";

/**
 * Resolves ingredient UI data from raw menu domain inputs.
 *
 * Data flow:
 * 1) Start from MenuItem ingredient IDs, ingredientItems metadata, addons/menuItems nutrition fallbacks,
 *    and customizationRules tab configuration.
 * 2) Normalize IDs/categories to match across naming variants.
 * 3) Build per-tab ingredient lists (including single-select "None" behavior and max-quantity constraints).
 * 4) Merge tab aliases into display tabs consumed by ItemDetailsPanel.
 */
export type ResolvedPanelIngredient = {
  id: string;
  label: string;
  icon: string;
  tabLabel?: string;
  ingredientItem?: IngredientItem;
  maxQuantity?: number;
  nutrition: Nutrition;
  calories?: number;
  defaultCount: number;
  isNoneOption?: boolean;
};

export type ResolvedIngredientTab = {
  id: string;
  label: string;
  selectionMode: IngredientSelectionMode;
  ingredients: ResolvedPanelIngredient[];
};

function hasMeaningfulNutrition(nutrition?: Nutrition) {
  if (!nutrition) return false;
  return [
    nutrition.calories,
    nutrition.protein,
    nutrition.carbs,
    nutrition.totalFat,
    nutrition.satFat,
    nutrition.transFat,
    nutrition.cholesterol,
    nutrition.sodium,
    nutrition.fiber,
    nutrition.sugars,
  ].some((value) => typeof value === "number" && value > 0);
}

function includedIngredientPriority(ingredient: ResolvedPanelIngredient) {
  const categories = ingredient.ingredientItem?.categories?.length
    ? ingredient.ingredientItem.categories
    : ingredient.ingredientItem?.category
      ? [ingredient.ingredientItem.category]
      : [];
  const normalizedCategories = categories.map((category) => normalizeIngredientCategory(category));

  if (normalizedCategories.some((category) => category.includes("bun"))) return 0;
  if (normalizedCategories.some((category) => category.includes("cheese"))) return 1;
  if (normalizedCategories.some((category) => category === "eggs" || category === "egg")) return 2;
  if (normalizedCategories.some((category) => category.includes("protein"))) return 3;
  if (normalizedCategories.some((category) => category.includes("topping"))) return 4;
  if (
    normalizedCategories.some(
      (category) =>
        category.includes("sauce") ||
        category.includes("condiment") ||
        category.includes("dressing")
    )
  ) {
    return 5;
  }

  return 6;
}

function tabSupportsNoneOption(item: MenuItem, tabName: string) {
  const normalized = normalizeIngredientCategory(tabName);
  const configuredTabsWithNoneOption = item.customization?.tabsWithNoneOption ?? [];

  if (
    configuredTabsWithNoneOption.some(
      (candidateTab) => normalizeIngredientCategory(candidateTab) === normalized
    )
  ) {
    return true;
  }

  return normalized === "cheese" || normalized === "cheeses";
}

export function resolvePanelIngredients(
  item: MenuItem,
  ingredientItems: IngredientItem[] = [],
  addons?: RestaurantAddons,
  menuItems: MenuItem[] = [],
  variants?: ItemVariant[] | null,
  selectedVariantId?: string,
  customizationRules?: RestaurantCustomizationRules
): ResolvedPanelIngredient[] {
  const tabs = resolvePanelIngredientTabs(
    item,
    ingredientItems,
    addons,
    menuItems,
    variants,
    selectedVariantId,
    customizationRules
  );

  const ingredientMap = new Map<string, ResolvedPanelIngredient>();
  tabs.forEach((tab) => {
    tab.ingredients.forEach((ingredient) => {
      const existingIngredient = ingredientMap.get(ingredient.id);
      if (!existingIngredient) {
        ingredientMap.set(ingredient.id, ingredient);
        return;
      }

      ingredientMap.set(ingredient.id, {
        ...existingIngredient,
        ...ingredient,
        tabLabel: ingredient.tabLabel ?? existingIngredient.tabLabel,
        maxQuantity: ingredient.maxQuantity ?? existingIngredient.maxQuantity,
      });
    });
  });

  return [...ingredientMap.values()];
}

export function resolvePanelIngredientTabs(
  item: MenuItem,
  ingredientItems: IngredientItem[] = [],
  addons?: RestaurantAddons,
  menuItems: MenuItem[] = [],
  variants?: ItemVariant[] | null,
  selectedVariantId?: string,
  customizationRules?: RestaurantCustomizationRules
): ResolvedIngredientTab[] {
  const selectedParentVariantLabel = variants?.find((variant) => variant.id === selectedVariantId)?.label;
  const ingredientDefaultsById = resolveIncludedIngredientDefaults(item.ingredients);
  const ingredientIds = [...ingredientDefaultsById.keys()];
  const resolvedTabs = resolveIngredientTabs(item, customizationRules);
  const singleSelectTabs = resolveSingleSelectIngredientTabs(item, customizationRules);
  const primaryCategory = item.categories?.[0];

  const ingredientByIdLookup = new Map<string, IngredientItem>();
  const ingredientByNameLookup = new Map<string, IngredientItem>();
  const addonLookup = new Map<string, AddonOption>();
  const menuItemByIdLookup = new Map<string, MenuItem>();
  const menuItemByNameLookup = new Map<string, MenuItem>();
  const resolvedIngredientLookup = new Map<string, ResolvedPanelIngredient>();

  ingredientItems.forEach((entry) => {
    if (entry.id) ingredientByIdLookup.set(entry.id.toLowerCase(), entry);
    ingredientByNameLookup.set(normalizeIngredientToken(entry.name), entry);
  });

  Object.values(addons ?? {}).forEach((addonGroup) => {
    addonGroup?.forEach((addon) => {
      addonLookup.set(addon.name.toLowerCase(), addon);
    });
  });

  menuItems.forEach((menuItem) => {
    if (menuItem.id) menuItemByIdLookup.set(menuItem.id.toLowerCase(), menuItem);
    menuItemByNameLookup.set(normalizeIngredientToken(menuItem.name), menuItem);
  });

  function getResolvedIngredient(ingredientId: string, explicitIngredientItem?: IngredientItem) {
    const normalizedId = ingredientId.toLowerCase();
    const existing = resolvedIngredientLookup.get(normalizedId);
    if (existing) return existing;

    const fallbackLabel = ingredientId
      .split(/[-_]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

    const match =
      explicitIngredientItem ??
      ingredientByIdLookup.get(ingredientId.toLowerCase()) ??
      ingredientByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      ingredientByNameLookup.get(normalizeIngredientToken(fallbackLabel));
    const menuItemMatch =
      menuItemByIdLookup.get(ingredientId.toLowerCase()) ??
      menuItemByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      menuItemByNameLookup.get(normalizeIngredientToken(fallbackLabel));
    const ingredientRefMatch =
      menuItemMatch?.ingredientRef
        ? ingredientByIdLookup.get(menuItemMatch.ingredientRef.toLowerCase())
        : undefined;
    const matchedVariantNutrition =
      menuItemMatch?.variants?.find((variant) => variant.id === selectedVariantId)?.nutrition ??
      (selectedParentVariantLabel
        ? menuItemMatch?.variants?.find(
            (variant) =>
              normalizeIngredientToken(variant.label) === normalizeIngredientToken(selectedParentVariantLabel)
          )?.nutrition
        : undefined) ??
      menuItemMatch?.variants?.find((variant) => variant.id === menuItemMatch.defaultVariantId)?.nutrition ??
      menuItemMatch?.variants?.[0]?.nutrition;
    const menuItemNutrition =
      menuItemMatch?.variants?.length && !hasMeaningfulNutrition(menuItemMatch?.nutrition)
        ? undefined
        : menuItemMatch?.nutrition;

    const label = menuItemMatch?.name ?? match?.name ?? fallbackLabel;
    const ingredientTabLabel = resolvedTabs.find((tab) => {
      return tab !== INCLUDED_INGREDIENT_TAB && match ? ingredientMatchesTab(match, tab) : false;
    });
    const addonMatch = addonLookup.get(label.toLowerCase());
    const nutrition =
      matchedVariantNutrition ??
      menuItemNutrition ??
      match?.nutrition ??
      ingredientRefMatch?.nutrition ?? {
        calories: addonMatch?.calories,
        protein: addonMatch?.protein,
        carbs: addonMatch?.carbs,
        totalFat: addonMatch?.totalFat ?? addonMatch?.fat,
        satFat: addonMatch?.satFat,
        transFat: addonMatch?.transFat,
        cholesterol: addonMatch?.cholesterol,
        sodium: addonMatch?.sodium,
        fiber: addonMatch?.fiber,
        sugars: addonMatch?.sugars,
      };

    const resolvedIngredient = {
      id: ingredientId,
      label,
      icon: match?.image ?? menuItemMatch?.image ?? addonMatch?.image ?? "🥣",
      tabLabel: ingredientTabLabel,
      ingredientItem: match,
      maxQuantity:
        ingredientTabLabel ? resolveIngredientTabMaxQuantity(item, ingredientTabLabel, customizationRules) : undefined,
      nutrition,
      calories: nutrition.calories,
      defaultCount: ingredientDefaultsById.get(normalizedId) ?? 0,
    };

    resolvedIngredientLookup.set(normalizedId, resolvedIngredient);
    return resolvedIngredient;
  }

  function getConfiguredIngredientIdsForTab(tabName: string) {
    const itemLevelIngredientOptions = Object.entries(item.customization?.ingredientOptionsByTab ?? {}).find(
      ([candidateTab]) => normalizeIngredientCategory(candidateTab) === normalizeIngredientCategory(tabName)
    )?.[1];

    if (itemLevelIngredientOptions?.length) return itemLevelIngredientOptions;
    if (!primaryCategory) return undefined;

    const categoryIngredientOptions = Object.entries(customizationRules?.ingredientOptionsByItemCategory ?? {}).find(
      ([candidateCategory]) => normalizeIngredientCategory(candidateCategory) === normalizeIngredientCategory(primaryCategory)
    )?.[1];

    return Object.entries(categoryIngredientOptions ?? {}).find(
      ([candidateTab]) => normalizeIngredientCategory(candidateTab) === normalizeIngredientCategory(tabName)
    )?.[1];
  }

  const resolvedIngredientTabs: ResolvedIngredientTab[] = resolvedTabs.map((tab) => {
    const configuredIngredientIds = tab === INCLUDED_INGREDIENT_TAB ? undefined : getConfiguredIngredientIdsForTab(tab);
    const tabIngredients =
      tab === INCLUDED_INGREDIENT_TAB
        ? ingredientIds
            .map((ingredientId, index) => ({ ingredient: getResolvedIngredient(ingredientId), index }))
            .sort((left, right) => {
              const priorityDifference =
                includedIngredientPriority(left.ingredient) - includedIngredientPriority(right.ingredient);

              return priorityDifference !== 0 ? priorityDifference : left.index - right.index;
            })
            .map(({ ingredient }) => ingredient)
        : configuredIngredientIds?.length
          ? configuredIngredientIds.map((ingredientId) => getResolvedIngredient(ingredientId))
          : ingredientItems
              .filter((ingredient) => ingredientMatchesTab(ingredient, tab))
              .map((ingredient) => getResolvedIngredient(ingredient.id ?? ingredient.name, ingredient));

    const uniqueTabIngredients = tabIngredients.filter((ingredient, index) => {
      return tabIngredients.findIndex((candidate) => candidate.id === ingredient.id) === index;
    });

    const tabMaxQuantity = resolveIngredientTabMaxQuantity(item, tab, customizationRules);
    const selectionMode = singleSelectTabs.has(normalizeTabName(tab)) ? "single" : "quantity";
    const scopedTabIngredients =
      tab === INCLUDED_INGREDIENT_TAB
        ? uniqueTabIngredients
        : uniqueTabIngredients.map((ingredient) => ({
            ...ingredient,
            tabLabel: tab,
            maxQuantity: tabMaxQuantity,
          }));
    const hasDefaultIngredient = scopedTabIngredients.some((ingredient) => ingredient.defaultCount > 0);
    const ingredients =
      selectionMode === "single" && tabSupportsNoneOption(item, tab)
        ? [
            {
              id: `none-${normalizeIngredientToken(tab)}`,
              label: "None",
              icon: "✕",
              tabLabel: tab,
              maxQuantity: tabMaxQuantity,
              nutrition: {},
              calories: 0,
              defaultCount: hasDefaultIngredient ? 0 : 1,
              isNoneOption: true,
            },
            ...scopedTabIngredients,
          ]
        : scopedTabIngredients;

    return {
      id: normalizeIngredientToken(tab),
      label: tab,
      selectionMode,
      ingredients,
    };
  });

  const mergedTabs = new Map<string, ResolvedIngredientTab>();
  resolvedIngredientTabs.forEach((tab) => {
    const displayLabel = getIngredientTabDisplayLabel(tab.label);
    const existingTab = mergedTabs.get(displayLabel);

    if (!existingTab) {
      mergedTabs.set(displayLabel, {
        ...tab,
        id: normalizeIngredientToken(displayLabel),
        label: displayLabel,
      });
      return;
    }

    const mergedIngredients = [...existingTab.ingredients];
    tab.ingredients.forEach((ingredient) => {
      if (!mergedIngredients.some((candidate) => candidate.id === ingredient.id)) {
        mergedIngredients.push(ingredient);
      }
    });

    const selectionMode: IngredientSelectionMode =
      existingTab.selectionMode === tab.selectionMode ? existingTab.selectionMode : "quantity";

    mergedTabs.set(displayLabel, {
      ...existingTab,
      selectionMode,
      ingredients: mergedIngredients,
    });
  });

  return [...mergedTabs.values()];
}
