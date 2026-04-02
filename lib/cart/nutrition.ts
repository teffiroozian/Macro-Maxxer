import { parseOptionLabelCounts } from "@/lib/cartOptionLabels";
import type { CartItem } from "@/stores/cartStore";
import type { AddonOption, MenuItem, Nutrition, RestaurantAddons } from "@/types/menu";

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
  return (total ?? 0) + (next * quantity);
}

export function getSelectedAddonNutrition(
  optionsLabel: string | undefined,
  sourceItem: MenuItem | undefined,
  restaurantAddons: RestaurantAddons | undefined
) {
  const selectedAddonCounts = parseOptionLabelCounts(optionsLabel);

  if (Object.keys(selectedAddonCounts).length === 0 || !sourceItem || !restaurantAddons) {
    return [] as AddonOption[];
  }

  return (sourceItem.addonRefs ?? [])
    .flatMap((ref) => restaurantAddons[ref] ?? [])
    .flatMap((addon) => Array.from({ length: selectedAddonCounts[addon.name] ?? 0 }, () => addon));
}

export function buildCartNutritionTotals(
  items: CartItem[],
  menuLookupByRestaurant: Record<string, MenuItem[]>,
  addonsLookupByRestaurant: Record<string, RestaurantAddons>
): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (sum, cartItem) => {
      const sourceItem = menuLookupByRestaurant[cartItem.restaurantId]?.find((item) => (item.id ?? item.name) === cartItem.itemId);
      const restaurantAddons = addonsLookupByRestaurant[cartItem.restaurantId];
      const selectedAddons = getSelectedAddonNutrition(cartItem.optionsLabel, sourceItem, restaurantAddons);
      const selectedVariant = sourceItem?.variants?.find((variant) => variant.id === cartItem.variantId);
      const baseNutrition: Nutrition | undefined =
        selectedVariant?.nutrition ?? sourceItem?.nutrition ?? cartItem.nutritionPerItem;

      const addonNutrition = selectedAddons.reduce(
        (addonSum, addon) => ({
          satFat: addonSum.satFat + (addon.satFat ?? 0),
          transFat: addonSum.transFat + (addon.transFat ?? 0),
          cholesterol: addonSum.cholesterol + (addon.cholesterol ?? 0),
          sodium: addonSum.sodium + (addon.sodium ?? 0),
          fiber: addonSum.fiber + (addon.fiber ?? 0),
          sugars: addonSum.sugars + (addon.sugars ?? 0),
        }),
        { satFat: 0, transFat: 0, cholesterol: 0, sodium: 0, fiber: 0, sugars: 0 }
      );

      sum.calories += cartItem.macrosPerItem.calories * cartItem.quantity;
      sum.protein += cartItem.macrosPerItem.protein * cartItem.quantity;
      sum.carbs += cartItem.macrosPerItem.carbs * cartItem.quantity;
      sum.totalFat += cartItem.macrosPerItem.fat * cartItem.quantity;
      sum.satFat = addOptional(sum.satFat, (baseNutrition?.satFat ?? 0) + addonNutrition.satFat, cartItem.quantity);
      sum.transFat = addOptional(sum.transFat, (baseNutrition?.transFat ?? 0) + addonNutrition.transFat, cartItem.quantity);
      sum.cholesterol = addOptional(
        sum.cholesterol,
        (baseNutrition?.cholesterol ?? 0) + addonNutrition.cholesterol,
        cartItem.quantity
      );
      sum.sodium = addOptional(sum.sodium, (baseNutrition?.sodium ?? 0) + addonNutrition.sodium, cartItem.quantity);
      sum.fiber = addOptional(sum.fiber, (baseNutrition?.fiber ?? 0) + addonNutrition.fiber, cartItem.quantity);
      sum.sugars = addOptional(sum.sugars, (baseNutrition?.sugars ?? 0) + addonNutrition.sugars, cartItem.quantity);

      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
  );
}
