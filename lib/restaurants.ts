// DATA LOADER FILE

import restaurants from "@/data/restaurants/index.json";
import type { MenuItem, RestaurantMenu } from "@/types/menu";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";

// gives restaurant data the RestaurantIndexEntry shape
const restaurantIndex = restaurants as RestaurantIndexEntry[];

// Keep every runtime import explicit. A template import rooted at
// data/restaurants causes Next/Turbopack to scan raw collector inputs and
// review artifacts (CSV, PDF, Markdown, etc.) as potential application
// modules. Only production menu JSON and generated runtime adapters belong
// in this graph.
const runtimeMenuLoaders: Record<string, () => Promise<RestaurantMenu>> = {
  chickfila: async () =>
    (await import("@/lib/restaurantBuilders/chickfila/generatedRuntimeAdapter")).CHICKFILA_GENERATED_RUNTIME_MENU,
  chipotle: async () =>
    (await import("@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter")).CHIPOTLE_GENERATED_RUNTIME_MENU,
  habit: async () => (await import("@/data/restaurants/habit.json")).default as RestaurantMenu,
  mcdonalds: async () => (await import("@/data/restaurants/mcdonalds.json")).default as RestaurantMenu,
  mod: async () => (await import("@/data/restaurants/mod.json")).default as RestaurantMenu,
  panda: async () => (await import("@/data/restaurants/panda.json")).default as RestaurantMenu,
  panera: async () => (await import("@/data/restaurants/panera.json")).default as RestaurantMenu,
  starbucks: async () =>
    (await import("@/lib/restaurantBuilders/starbucks/generatedRuntimeAdapter")).STARBUCKS_GENERATED_RUNTIME_MENU,
  subway: async () => (await import("@/data/restaurants/subway.json")).default as RestaurantMenu,
};

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
export function toItemSlug(item: Pick<MenuItem, "id" | "name">) {
  return toSlug(item.id ?? item.name);
}

// takes the restaurant id from the URL and loads its full menu data
export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  // searches in index json file for restaurant
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  // dynamically loads the menu content for the selected restaurant.
  // data/restaurants/index.json owns restaurant identity/metadata; individual menu JSON files own menu content only.
  // The loader merges both sources into the full RestaurantData object consumed by the app.
  //
  // Chick-fil-A, Chipotle, and Starbucks are promoted from their generated datasets.
  // Chipotle passes through its runtime/presentation adapter so generated
  // provenance and canonical ids remain intact while the existing UI gets
  // its curated browse/navigation shape. The old hand-authored JSON remains
  // in the repository as a temporary reference, but is no longer loaded.
  // Chick-fil-A's menu content comes
  // from the generated dataset (data/restaurants/chick-fil-a/generated/restaurant.json)
  // rather than the old hand-authored data/restaurants/chickfila.json. The
  // old file is kept in place as a fallback/reference until runtime QA on
  // the generated data is complete — remove this branch once it's promoted
  // and chickfila.json is retired.
  const loadMenu = runtimeMenuLoaders[restaurant.id];
  if (!loadMenu) return null;
  const menu = await loadMenu();

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
    description: restaurant.description,
    nutritionSourceUrl: restaurant.nutritionSourceUrl,
    nutritionSourceAttribution: restaurant.nutritionSourceAttribution,
    lastUpdated: restaurant.lastUpdated,
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
