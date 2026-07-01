import { parseOptionLabelCounts } from "@/lib/cartOptionLabels";
import type { CartItem } from "@/types/cart";
import type { MenuItem, RestaurantAddonGroups } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

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

export function buildCartNutritionTotals(
  items: CartItem[],
  menuLookupByRestaurant: Record<string, MenuItem[]>,
  addonGroupsLookupByRestaurant: Record<string, RestaurantAddonGroups>
): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (sum, cartItem) => {
      const restaurantItems = menuLookupByRestaurant[cartItem.restaurantId] ?? [];
      const sourceItem = restaurantItems.find((item) => (item.id ?? item.name) === cartItem.itemId);
      const restaurantAddonGroups = addonGroupsLookupByRestaurant[cartItem.restaurantId];
      const selectedAddons = getSelectedAddonNutrition(cartItem.selectionDetailsLabel, sourceItem, restaurantAddonGroups, restaurantItems);
      const selectedVariant = sourceItem?.variants?.find((variant) => variant.id === cartItem.variantId);
      const baseNutrition: Nutrition | undefined = selectedVariant?.nutrition ?? sourceItem?.nutrition ?? cartItem.nutritionPerItem;

      const addonNutrition = selectedAddons.reduce(
        (addonSum, addon) => ({
          satFat: addonSum.satFat + (addon.nutrition.satFat ?? 0),
          transFat: addonSum.transFat + (addon.nutrition.transFat ?? 0),
          cholesterol: addonSum.cholesterol + (addon.nutrition.cholesterol ?? 0),
          sodium: addonSum.sodium + (addon.nutrition.sodium ?? 0),
          fiber: addonSum.fiber + (addon.nutrition.fiber ?? 0),
          sugars: addonSum.sugars + (addon.nutrition.sugars ?? 0),
        }),
        { satFat: 0, transFat: 0, cholesterol: 0, sodium: 0, fiber: 0, sugars: 0 }
      );

      sum.calories += (cartItem.nutritionPerItem.calories ?? 0) * cartItem.quantity;
      sum.protein += (cartItem.nutritionPerItem.protein ?? 0) * cartItem.quantity;
      sum.carbs += (cartItem.nutritionPerItem.carbs ?? 0) * cartItem.quantity;
      sum.totalFat += (cartItem.nutritionPerItem.totalFat ?? 0) * cartItem.quantity;
      sum.satFat = addOptional(sum.satFat, (baseNutrition?.satFat ?? 0) + addonNutrition.satFat, cartItem.quantity);
      sum.transFat = addOptional(sum.transFat, (baseNutrition?.transFat ?? 0) + addonNutrition.transFat, cartItem.quantity);
      sum.cholesterol = addOptional(sum.cholesterol, (baseNutrition?.cholesterol ?? 0) + addonNutrition.cholesterol, cartItem.quantity);
      sum.sodium = addOptional(sum.sodium, (baseNutrition?.sodium ?? 0) + addonNutrition.sodium, cartItem.quantity);
      sum.fiber = addOptional(sum.fiber, (baseNutrition?.fiber ?? 0) + addonNutrition.fiber, cartItem.quantity);
      sum.sugars = addOptional(sum.sugars, (baseNutrition?.sugars ?? 0) + addonNutrition.sugars, cartItem.quantity);
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
  );
}
