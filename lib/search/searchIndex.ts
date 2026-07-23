import { getAllRestaurants, getRestaurantData } from "@/lib/restaurants";
import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export type SearchIndexEntry = {
  restaurant: RestaurantIndexEntry;
  items: MenuItem[];
  // Only populated for restaurants with hasBuildYourOwn === true — a
  // restaurant having an `ingredients` catalog (e.g. Chick-fil-A's bun/
  // topping swaps) does not make it build-your-own content.
  ingredients: IngredientItem[];
  builderConfig?: RestaurantBuilderConfig;
};

// Nothing today loads every restaurant's full menu at once (getRestaurantData
// only fetches one at a time) — this builds that index once and caches the
// promise for the lifetime of the page, since the underlying JSON is static.
let cachedIndexPromise: Promise<SearchIndexEntry[]> | null = null;

export function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  if (!cachedIndexPromise) {
    cachedIndexPromise = Promise.all(
      getAllRestaurants()
        .filter((restaurant) => !restaurant.isComingSoon)
        .map(async (restaurant): Promise<SearchIndexEntry | null> => {
          const data = await getRestaurantData(restaurant.id);
          if (!data) {
            return null;
          }

          return {
            restaurant,
            items: data.items,
            ingredients: data.hasBuildYourOwn ? data.ingredients : [],
            builderConfig: data.builderConfig,
          };
        })
    ).then((entries) => entries.filter((entry): entry is SearchIndexEntry => entry !== null));
  }

  return cachedIndexPromise;
}
