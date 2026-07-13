import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getItemBySlug, getRestaurantData } from "@/lib/restaurants";

export async function getRestaurantItemRouteData(id: string, itemSlug: string) {
  const restaurant = await getRestaurantData(id);

  if (!restaurant || restaurant.isComingSoon) {
    return null;
  }

  const item = getItemBySlug(restaurant.items, itemSlug);
  if (!item) {
    return null;
  }

  const addons = resolveAddonMenuItems(restaurant.addonGroups, restaurant.items);

  return { restaurant, item, addons };
}
