// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import type { AddonOption, MenuItem, RestaurantAddons } from "@/types/menu";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";

// gives restaurant data the RestaurantIndexEntry shape
const restaurantIndex = restaurants as RestaurantIndexEntry[];

// gives other files access to the restaurant list
export function getAllRestaurants(): RestaurantIndexEntry[] {
  return restaurantIndex;
}

export function getVisibleRestaurants(): RestaurantIndexEntry[] {
  return getAllRestaurants();
}

// object lookup for addon groups
const ADDON_GROUP_LABELS: Record<string, string> = {
  sauces: "Dipping Sauces",
  dressings: "Dressings",
  condiments: "Condiments",
};

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

// recieves full usable restaurant page data from restaurant metadata, and
// returns one object that merges index.json + [restaurant].json files into one clean shape
export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  // searches in index json file for restaurant
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  // dynamically loads the one it needs based on the selected restaurant
  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  // pulls the real JSON data out of the imported file
  const menu = menuModule.default;
  const items = menu.items ?? [];
  const ingredients = menu.ingredients ?? [];
  const addons = normalizeAddons(menu.addons ?? {});
  const hasBuildYourOwn = menu.hasBuildYourOwn ?? false;

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

// recieves item info from the url
export function getRouteItems(restaurant: Pick<RestaurantData, "id" | "items" | "addons">) {
  return [...restaurant.items, ...buildAddonMenuItems(restaurant.id, restaurant.addons)];
}

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
