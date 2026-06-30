// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import type { MenuItem, RestaurantAddons } from "@/types/menu";
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


// takes a menu item and turns it into a URL-safe slug
export function toItemSlug(item: MenuItem) {
  const raw = item.id ?? item.name;
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}

export function buildAddonMenuItems(restaurantId: string, addons?: RestaurantAddons): MenuItem[] {
  if (!addons) return [];

  const categoryByAddonGroup: Record<string, string> = {
    sauces: "Dipping Sauces",
    dressings: "Dressings",
    condiments: "Condiments",
  };

  return (Object.entries(addons) as [string, NonNullable<RestaurantAddons[string]>][])
    .flatMap(([addonRef, options]) =>
      options.map((option) => ({
        id: `${restaurantId}-${addonRef}-${option.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: option.name,
        defaultOrder: 0,
        nutrition: {
          calories: option.nutrition.calories,
          protein: option.nutrition.protein,
          carbs: option.nutrition.carbs,
          totalFat: option.nutrition.totalFat ?? 0,
          satFat: option.nutrition.satFat,
          transFat: option.nutrition.transFat,
          cholesterol: option.nutrition.cholesterol,
          sodium: option.nutrition.sodium,
          fiber: option.nutrition.fiber,
          sugars: option.nutrition.sugars,
        },
        categories: [categoryByAddonGroup[addonRef]],
        servingType: "addon",
        image: option.image ?? "",
      }))
    );
}
