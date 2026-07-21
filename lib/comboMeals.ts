import type { ComboMealConfig, MenuItem } from "@/types/menu";
import { compareByDefaultOrder, normalizeCategory } from "@/lib/menuItemCalculations";
import {
  isChickfilaBreakfastItem,
  isHashBrowns,
  isWaffleFries,
  sortComboSides,
} from "@/lib/restaurantRules/chickfila";

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
  return resolveConfiguredItems(config?.sideOptions, menuItems);
}

export function resolveComboDrinkOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems);
  return resolveConfiguredItems(config?.drinkOptions, menuItems);
}
