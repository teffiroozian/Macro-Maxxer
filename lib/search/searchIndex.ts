import { getAllRestaurants, getRestaurantData } from "@/lib/restaurants";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import type { BuilderEntreeOption, RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export type BuilderEntreeSearchCandidate = {
  entreeId: string;
  option: BuilderEntreeOption;
};

export type SearchIndexEntry = {
  restaurant: RestaurantIndexEntry;
  items: MenuItem[];
  // Only populated for restaurants with hasBuildYourOwn === true — a
  // restaurant having an `ingredients` catalog (e.g. Chick-fil-A's bun/
  // topping swaps) does not make it build-your-own content.
  ingredients: IngredientItem[];
  // Same hasBuildYourOwn gate as `ingredients` — the entree options (e.g.
  // Chipotle's Bowl/Burrito/Quesadilla) that actually launch a build flow,
  // as opposed to entree options that just point at an ordinary purchasable
  // product (e.g. Chipotle's Chips & Sides, Drinks — those are already
  // covered by `items`). See resolveBuildEntreeOptions below.
  entreeBuilders: BuilderEntreeSearchCandidate[];
  builderConfig?: RestaurantBuilderConfig;
};

// A restaurant's raw ingredient catalog can carry several records for the
// same logical ingredient — e.g. Chipotle generates a separate "Chicken"
// record per builder context (Bowl/Burrito/Salad vs. Taco vs. Kids) so the
// per-entree builder can pick the nutrition-correct one — tagged with a
// shared IngredientItem.canonicalIngredientId. Search is entree-agnostic, so
// it should surface each logical ingredient once; the per-entree builder
// itself keeps consuming the undeduped catalog directly (it needs every
// context record present to pick from). Where several records share a
// canonical id, the one whose own id equals it (the "primary" record) wins;
// otherwise the first one found is kept.
function dedupeIngredientsByCanonicalId(ingredients: IngredientItem[]): IngredientItem[] {
  const byCanonicalId = new Map<string, IngredientItem>();
  for (const ingredient of ingredients) {
    const canonicalId = ingredient.canonicalIngredientId ?? ingredient.id;
    const existing = byCanonicalId.get(canonicalId);
    if (!existing || existing.id !== canonicalId) {
      byCanonicalId.set(canonicalId, ingredient);
    }
  }
  return [...byCanonicalId.values()];
}

// An entree option's `id` points at the MenuItem it represents. Some entree
// options (Chipotle's Chips & Sides, Drinks, High Protein Menu) point at a
// real standalone product — already searchable via `items` — while others
// (Bowl, Burrito, Quesadilla, Salad, Tacos, Kid's Meal) point at a
// build-container record (MenuItem.sourceOnly === true) that only exists to
// anchor the builder and is never itself a purchasable item. Only the latter
// represent an actual "start a build" flow worth surfacing as its own search
// result — the former would just duplicate a result `items` already covers.
function resolveBuildEntreeOptions(
  allItems: MenuItem[],
  builderConfig?: RestaurantBuilderConfig
): BuilderEntreeSearchCandidate[] {
  const entreeOptions = builderConfig?.entreeOptions;
  if (!entreeOptions) {
    return [];
  }

  const buildContainerItemIds = new Set(
    allItems.filter((item) => item.sourceOnly === true).map((item) => item.id)
  );

  return Object.entries(entreeOptions)
    .filter(([, option]) => buildContainerItemIds.has(option.id))
    .map(([entreeId, option]) => ({ entreeId, option }));
}

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
            // Structural/internal source records (see MenuItem.sourceOnly)
            // are real relationship targets, not standalone items — never
            // surfaced as their own search result.
            items: data.items.filter(isStandaloneMenuItem),
            ingredients: data.hasBuildYourOwn
              ? dedupeIngredientsByCanonicalId(data.ingredients)
              : [],
            entreeBuilders: data.hasBuildYourOwn
              ? resolveBuildEntreeOptions(data.items, data.builderConfig)
              : [],
            builderConfig: data.builderConfig,
          };
        })
    ).then((entries) => entries.filter((entry): entry is SearchIndexEntry => entry !== null));
  }

  return cachedIndexPromise;
}
