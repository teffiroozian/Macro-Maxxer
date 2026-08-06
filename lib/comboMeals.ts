import type { ComboMealConfig, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { compareByDefaultOrder, normalizeCategory } from "@/lib/menuItemCalculations";
import {
  isChickfilaBreakfastItem,
  isHashBrowns,
  isWaffleFries,
  sortComboSides,
} from "@/lib/restaurantRules/chickfila";

const zeroComboOptionNutrition: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
};

// Explicit "none" options for combo side/drink selection. Represented as
// real zero-nutrition MenuItems (rather than a special-cased sentinel) so
// selecting them flows through the same nutrition/macro calculation and
// cart-selection logic as any other combo option.
export const NO_SIDE_OPTION: MenuItem = {
  id: "no-side",
  name: "No side",
  image: "none",
  categories: [],
  servingType: "side",
  nutrition: zeroComboOptionNutrition,
  defaultOrder: -1,
};

export const NO_DRINK_OPTION: MenuItem = {
  id: "no-drink",
  name: "No drink",
  image: "none",
  categories: [],
  servingType: "drink",
  nutrition: zeroComboOptionNutrition,
  defaultOrder: -1,
};

function itemKey(item: MenuItem) {
  return item.id ?? item.name;
}

function resolveConfiguredItems(itemIds: string[] | undefined, menuItems: MenuItem[] | undefined) {
  if (!itemIds?.length || !menuItems?.length) return [];
  const itemById = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));
  return itemIds.flatMap((itemId) => {
    const item = itemById.get(itemId);
    return item ? [item] : [];
  });
}

function resolveLegacyChickfilaComboConfig(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
): ComboMealConfig | undefined {
  if (restaurantId !== "chickfila") return undefined;

  const allowed = new Set(["sandwich", "chicken", "salad", "wrap", "breakfast"]);
  if (!item.categories.some((category) => allowed.has(normalizeCategory(category)))) return undefined;

  const breakfastComboItem = isChickfilaBreakfastItem(restaurantId, item);
  const sideOptions = sortComboSides(
    (menuItems ?? []).filter((menuItem) => {
      const normalizedCategories = menuItem.categories.map((category) => normalizeCategory(category));
      if (!breakfastComboItem) return normalizedCategories.includes("side");
      if (isWaffleFries(menuItem)) return false;
      return normalizedCategories.includes("side") || isHashBrowns(menuItem);
    }),
    breakfastComboItem
  ).map(itemKey);

  const drinkOptions = (menuItems ?? [])
    .filter((menuItem) => menuItem.categories.some((category) => normalizeCategory(category) === "drinks"))
    .sort(compareByDefaultOrder)
    .map(itemKey);

  return {
    entreeItemId: item.id,
    sideOptions,
    drinkOptions,
  };
}

export function resolveComboMealConfig(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
): ComboMealConfig | undefined {
  return item.comboConfig ?? resolveLegacyChickfilaComboConfig(restaurantId, item, menuItems);
}

export function isComboMealEligible(restaurantId: string, item: MenuItem, menuItems: MenuItem[] | undefined) {
  return Boolean(resolveComboMealConfig(restaurantId, item, menuItems));
}

export function resolveComboSideOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems);
  const options = resolveConfiguredItems(config?.sideOptions, menuItems);
  return options.length > 0 ? [NO_SIDE_OPTION, ...options] : options;
}

export function resolveComboDrinkOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems);
  const options = resolveConfiguredItems(config?.drinkOptions, menuItems);
  return options.length > 0 ? [NO_DRINK_OPTION, ...options] : options;
}
