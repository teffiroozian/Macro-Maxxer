import { parseOptionLabelCounts } from "@/lib/cartOptionLabels";
import { addNutrition, getNutritionDataQuality, normalizeNutrition } from "@/lib/nutrition";
import type { CartItem } from "@/types/cart";
import type { MenuItem, RestaurantAddonGroups } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

// use Nutrition shape to get NutritionTotals
export type NutritionTotals = Nutrition;

// converts addons of an item to regular menu item
export function getSelectedAddonNutrition(
  selectionDetailsLabel: string | undefined,
  sourceItem: MenuItem | undefined,
  restaurantAddonGroups: RestaurantAddonGroups | undefined,
  restaurantItems: MenuItem[] | undefined
) {
  const selectedAddonCounts = parseOptionLabelCounts(selectionDetailsLabel);
  if (Object.keys(selectedAddonCounts).length === 0 || !sourceItem || !restaurantAddonGroups) return [] as MenuItem[];

  const itemLookup = new Map((restaurantItems ?? []).map((item) => [item.id, item]));
  return (sourceItem.addonRefs ?? [])
    .flatMap((ref) => restaurantAddonGroups[ref]?.itemIds ?? [])
    .map((itemId) => itemLookup.get(itemId))
    .filter((addon): addon is MenuItem => Boolean(addon?.addonEligible))
    .flatMap((addon) => Array.from({ length: selectedAddonCounts[addon.name] ?? 0 }, () => addon));
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
