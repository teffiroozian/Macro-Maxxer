// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import type { AddonOption, MenuItem, RestaurantAddons } from "@/types/menu";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";

// gives restaurant data the RestaurantIndexEntry shape
const restaurantIndex = restaurants as RestaurantIndexEntry[];

// gives other files access to the restaurant list
export function getAllRestaurants(): RestaurantIndexEntry[] {
  return restaurantIndex;
}

// object lookup for addon groups
const ADDON_GROUP_LABELS: Record<string, string> = {
  sauces: "Dipping Sauces",
  dressings: "Dressings",
  condiments: "Condiments",
};

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

// takes the restaurant id from the URL and
export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  // searches in index json file for restaurant
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  // dynamically loads the one it needs based on the selected restaurant
  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  const menu = menuModule.default;

  // pulling important pieces out of the menu
  const items = menu.items ?? [];
  const ingredients = menu.ingredients ?? [];
  const addons = menu.addons ?? {};
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
    // menu file data
    hasBuildYourOwn,
    items,
    ingredients,
    addons,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

// builds the search list for items and addons
export function getRouteItems(restaurant: Pick<RestaurantData, "id" | "items" | "addons">) {
  return [...restaurant.items, ...buildAddonMenuItems(restaurant.id, restaurant.addons)];
}

// finds a menu item based on the URL slug from the list
export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}

// converts add-on into one MenuItem
function buildAddonMenuItem(
  restaurantId: string,
  addonRef: string,
  option: AddonOption
): MenuItem {
  return {
    id: toSlug(`${restaurantId}-${addonRef}-${option.name}`),
    name: option.name,
    image: option.image ?? "",
    nutrition: option.nutrition,
    categories: [ADDON_GROUP_LABELS[addonRef] ?? "Add-ons"],
    servingType: "addon",
    defaultOrder: 0,
  };
}

// handles the whole addon list
export function buildAddonMenuItems(
  restaurantId: string,
  addons?: RestaurantAddons
): MenuItem[] {
  if (!addons) return [];

  return Object.entries(addons).flatMap(([addonRef, options]) =>
    options.map((option) => buildAddonMenuItem(restaurantId, addonRef, option))
  );
}
