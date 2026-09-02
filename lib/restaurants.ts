// DATA LOADER FILE

import restaurants from "@/data/restaurants/index.json";
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
  // data/restaurants/index.json owns restaurant identity/metadata; individual menu JSON files own menu content only.
  // The loader merges both sources into the full RestaurantData object consumed by the app.
  //
  // Chick-fil-A and Chipotle are promoted from their generated datasets.
  // Chipotle passes through its runtime/presentation adapter so generated
  // provenance and canonical ids remain intact while the existing UI gets
  // its curated browse/navigation shape. The old hand-authored JSON remains
  // in the repository as a temporary reference, but is no longer loaded.
  // Chick-fil-A's menu content comes
  // from the generated dataset (data/generated/chick-fil-a/restaurant.json)
  // rather than the old hand-authored data/restaurants/chickfila.json. The
  // old file is kept in place as a fallback/reference until runtime QA on
  // the generated data is complete — remove this branch once it's promoted
  // and chickfila.json is retired.
  const menuModule =
    restaurant.id === "chickfila"
      ? await import("@/data/generated/chick-fil-a/restaurant.json")
      : restaurant.id === "chipotle"
        ? await import(
            "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter"
          )
      : await import(`@/data/restaurants/${restaurant.menuFile}`);
  const menu =
    restaurant.id === "chipotle"
      ? menuModule.CHIPOTLE_GENERATED_RUNTIME_MENU
      : menuModule.default;

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
    nutritionUpdatedAt: restaurant.nutritionUpdatedAt,
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
