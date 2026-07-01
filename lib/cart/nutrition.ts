import { parseOptionLabelCounts } from "@/lib/cartOptionLabels";
import type { CartItem } from "@/types/cart";
import type { MenuItem, RestaurantAddonGroups } from "@/types/menu";

export type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
};

function addOptional(total: number | undefined, next: number | undefined, quantity: number) {
  if (next === undefined) return total;
  return (total ?? 0) + next * quantity;
}

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
    (sum, cartItem) => {
      sum.calories += (cartItem.nutritionPerItem.calories ?? 0) * cartItem.quantity;
      sum.protein += (cartItem.nutritionPerItem.protein ?? 0) * cartItem.quantity;
      sum.carbs += (cartItem.nutritionPerItem.carbs ?? 0) * cartItem.quantity;
      sum.totalFat += (cartItem.nutritionPerItem.totalFat ?? 0) * cartItem.quantity;
      sum.satFat = addOptional(sum.satFat, cartItem.nutritionPerItem.satFat, cartItem.quantity);
      sum.transFat = addOptional(sum.transFat, cartItem.nutritionPerItem.transFat, cartItem.quantity);
      sum.cholesterol = addOptional(sum.cholesterol, cartItem.nutritionPerItem.cholesterol, cartItem.quantity);
      sum.sodium = addOptional(sum.sodium, cartItem.nutritionPerItem.sodium, cartItem.quantity);
      sum.fiber = addOptional(sum.fiber, cartItem.nutritionPerItem.fiber, cartItem.quantity);
      sum.sugars = addOptional(sum.sugars, cartItem.nutritionPerItem.sugars, cartItem.quantity);
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
  );
}
