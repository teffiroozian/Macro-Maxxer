import type { CartItem, SelectedAddon } from "@/types/cart";
import type { MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

// use Nutrtion shape to get NutritionTotals
export type NutritionTotals = Nutrition;

// helper for adding optional nutrition fields
function addOptional(total: number | undefined, next: number | undefined, quantity: number) {
  if (next === undefined) return total;
  return (total ?? 0) + next * quantity;
}

// converts addons of an item to regular menu item
export function getSelectedAddonNutrition(
  selectedAddons: SelectedAddon[] | undefined,
  restaurantItems: MenuItem[] | undefined
) {
  const itemLookup = new Map((restaurantItems ?? []).map((item) => [item.id ?? item.name, item]));

  return (selectedAddons ?? []).flatMap((selectedAddon) => {
    const addon = itemLookup.get(selectedAddon.itemId);
    if (!addon?.addonEligible || selectedAddon.quantity <= 0) return [];

    return Array.from({ length: selectedAddon.quantity }, () => addon);
  });
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
