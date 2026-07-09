// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import type { MenuItem } from "@/types/menu";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";

// gives restaurant data the RestaurantIndexEntry shape
const restaurantIndex = restaurants as RestaurantIndexEntry[];

// gives other files access to the restaurant list
export function getAllRestaurants(): RestaurantIndexEntry[] {
  return restaurantIndex;
}

// turns a string into a URL-safe slug
function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// takes a menu item and turns it into a URL-safe slug
export function toItemSlug(item: MenuItem) {
  return toSlug(item.id ?? item.name);
}

// takes the restaurant id from the URL and loads its full menu data
export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  // searches in index json file for restaurant
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  // dynamically loads the menu content for the selected restaurant.
  // app/data/index.json owns restaurant identity/metadata; individual menu JSON files own menu content only.
  // The loader merges both sources into the full RestaurantData object consumed by the app.
  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  const menu = menuModule.default;

  // pulling important pieces out of the menu
  const items = menu.items ?? [];
  const ingredients = menu.ingredients ?? [];
  const addonGroups = menu.addonGroups ?? {};
  const hasBuildYourOwn = menu.hasBuildYourOwn ?? false;

  // return one clean restaurant object that merges index.json + [restaurant].json
  return {
    // restaurant index file data
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    cover: restaurant.cover,
    menuFile: restaurant.menuFile,
    isMacroFriendly: restaurant.isMacroFriendly,
    isComingSoon: restaurant.isComingSoon,
    // menu file data
    hasBuildYourOwn,
    items,
    ingredients,
    addonGroups,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

// finds a menu item based on the URL slug from the list
export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}
