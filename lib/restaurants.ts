// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import type { MenuItem } from "@/types/menu";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";

const restaurantIndex = restaurants as RestaurantIndexEntry[];

export function getAllRestaurants(): RestaurantIndexEntry[] {
  return restaurantIndex;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function toItemSlug(item: MenuItem) {
  return toSlug(item.id ?? item.name);
}

export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  const menu = menuModule.default;

  const items = menu.items ?? [];
  const ingredients = menu.ingredients ?? [];
  const addonGroups = menu.addonGroups ?? {};
  const hasBuildYourOwn = menu.hasBuildYourOwn ?? false;

  return {
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    cover: restaurant.cover,
    menuFile: restaurant.menuFile,
    isMacroFriendly: restaurant.isMacroFriendly,
    hasBuildYourOwn,
    items,
    ingredients,
    addonGroups,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}
