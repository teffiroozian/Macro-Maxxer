import { addNutrition, getNutritionDataQuality, normalizeNutrition } from "@/lib/nutrition";
import type { CartItem, CartSelection, CartSelectionOption } from "@/types/cart";
import type { MenuItem, RestaurantAddonGroups } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

// use Nutrition shape to get NutritionTotals
export type NutritionTotals = Nutrition;

function getOptionQuantity(option: CartSelectionOption) {
  return Number.isFinite(option.quantity) && (option.quantity ?? 0) > 0 ? option.quantity ?? 1 : 1;
}

function getSelectedAddonCounts(selection: CartSelection | undefined) {
  const counts = new Map<string, number>();
  if (selection?.type !== "standard") return counts;

  for (const option of selection.optionSelections ?? []) {
    if (!option.itemId) continue;
    counts.set(option.itemId, (counts.get(option.itemId) ?? 0) + getOptionQuantity(option));
  }

  return counts;
}

// converts structured add-on selections for an item to regular menu items
export function getSelectedAddonNutrition(
  selection: CartSelection | undefined,
  sourceItem: MenuItem | undefined,
  restaurantAddonGroups: RestaurantAddonGroups | undefined,
  restaurantItems: MenuItem[] | undefined
) {
  const selectedAddonCounts = getSelectedAddonCounts(selection);
  if (selectedAddonCounts.size === 0 || !sourceItem || !restaurantAddonGroups) return [] as MenuItem[];

  const itemLookup = new Map((restaurantItems ?? []).map((item) => [item.id, item]));
  return (sourceItem.addonRefs ?? [])
    .flatMap((ref) => restaurantAddonGroups[ref]?.itemIds ?? [])
    .map((itemId) => itemLookup.get(itemId))
    .filter((addon): addon is MenuItem => Boolean(addon?.addonEligible))
    .flatMap((addon) => Array.from({ length: selectedAddonCounts.get(addon.id) ?? 0 }, () => addon));
}

export function buildCartNutritionTotals(items: CartItem[]): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (sum, cartItem) => addNutrition(sum, cartItem.nutritionPerItem, cartItem.quantity),
    normalizeNutrition(),
  );
}

export function buildCartMacroTotals(items: CartItem[]) {
  const totals = buildCartNutritionTotals(items);

  return {
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    totalFat: totals.totalFat,
  };
}

export function hasPartialCartNutritionData(items: CartItem[]) {
  return items.some((item) => getNutritionDataQuality(item.nutritionPerItem).isPartial);
}
