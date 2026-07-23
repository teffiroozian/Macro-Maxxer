"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantResultRow from "@/components/global-search/RestaurantResultRow";
import MenuItemResultRow from "@/components/global-search/MenuItemResultRow";
import BuilderIngredientResultRow from "@/components/global-search/BuilderIngredientResultRow";
import ScopeSwitcher, { type SearchScope } from "@/components/global-search/ScopeSwitcher";
import { searchRestaurants } from "@/lib/search/searchRestaurants";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import { useRecentAndPopularRestaurants } from "@/lib/search/useRecentAndPopularRestaurants";
import { useRecentMenuItems } from "@/lib/search/useRecentMenuItems";
import { toItemSlug } from "@/lib/restaurants";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import type { SearchResult } from "@/types/search";

const MAX_FILTERED_SUGGESTIONS = 10;

type RestaurantSearchProps = {
  restaurants: RestaurantIndexEntry[];
};

// The homepage hero search. Restaurants mode is its own long-standing
// recent/popular experience; Menu Items mode reuses the exact same search
// index, ranking, and result rows as the nav's GlobalSearchPanel (via
// useMenuItemSearch/useRecentMenuItems) rather than a second, homepage-only
// implementation.
export default function RestaurantSearch({ restaurants }: RestaurantSearchProps) {
  const router = useRouter();
  const [scope, setScope] = useState<SearchScope>("restaurants");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const { recentRestaurants, popularRestaurants, removeRecent } =
    useRecentAndPopularRestaurants(restaurants);

  const isEmptyQuery = !query.trim();

  const filteredSuggestions = useMemo(
    () => searchRestaurants(restaurants, query).slice(0, MAX_FILTERED_SUGGESTIONS),
    [query, restaurants]
  );
  const restaurantSuggestions = isEmptyQuery
    ? [...recentRestaurants, ...popularRestaurants]
    : filteredSuggestions;

  const { searchIndex, results: menuItemResults } = useMenuItemSearch(query, {
    enabled: scope === "menu-items",
  });
  const {
    recentResults: recentMenuItems,
    addRecent: addRecentMenuItem,
    removeRecent: removeRecentMenuItem,
  } = useRecentMenuItems(searchIndex);

  const menuItemSuggestions = isEmptyQuery ? recentMenuItems : menuItemResults;

  const suggestions: SearchResult[] =
    scope === "restaurants"
      ? restaurantSuggestions.map((restaurant): SearchResult => ({ kind: "restaurant", restaurant }))
      : menuItemSuggestions;

  const showSuggestions = isFocused && (scope === "restaurants" ? suggestions.length > 0 : true);

  const handleSelectRestaurant = (restaurant: RestaurantIndexEntry) => {
    if (restaurant.isComingSoon) {
      return;
    }

    setQuery(restaurant.name);
    setActiveIndex(-1);
    setIsFocused(false);
    router.push(`/restaurant/${restaurant.id}`, { scroll: true });
  };

  const handleSelectMenuItem = (item: MenuItem, restaurant: RestaurantIndexEntry) => {
    addRecentMenuItem({ kind: "menu-item", item, restaurant });
    setActiveIndex(-1);
    setIsFocused(false);
    router.push(`/restaurant/${restaurant.id}/${toItemSlug(item)}`);
  };

  const handleStartBuild = (
    ingredient: IngredientItem,
    restaurant: RestaurantIndexEntry,
    categoryLabel: string
  ) => {
    addRecentMenuItem({ kind: "builder-ingredient", ingredient, restaurant, categoryLabel });
    setActiveIndex(-1);
    setIsFocused(false);
    router.push(`/restaurant/${restaurant.id}`);
  };

  const handleSelect = (result: SearchResult) => {
    if (result.kind === "restaurant") {
      handleSelectRestaurant(result.restaurant);
    } else if (result.kind === "menu-item") {
      handleSelectMenuItem(result.item, result.restaurant);
    } else {
      handleStartBuild(result.ingredient, result.restaurant, result.categoryLabel);
    }
  };

  const handleClear = () => {
    setQuery("");
    setActiveIndex(-1);
  };

  const handleRemoveRecent = (restaurantId: string) => {
    removeRecent(restaurantId);
    setActiveIndex(-1);
  };

  const handleScopeChange = (nextScope: SearchScope) => {
    setScope(nextScope);
    setActiveIndex(-1);
  };

  return (
    <section className="mx-auto w-full max-w-[34rem]">
      <div className="relative">
        {/* Tabs + input share one bordered/shadowed shell so they read as a
            single search module rather than two stacked controls. */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_0_12px_rgba(0,0,0,0.15)]">
          <div className="flex justify-center border-b border-black/5 pb-1.5 pt-2">
            <ScopeSwitcher scope={scope} onChange={handleScopeChange} showIcons className="px-2" />
          </div>

          <div id="restaurant-search" className="relative">
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                setActiveIndex(-1);
              }}
              onKeyDown={(event) => {
                if (!showSuggestions) {
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((prev) =>
                    Math.min(prev + 1, suggestions.length - 1)
                  );
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((prev) => Math.max(prev - 1, 0));
                }

                if (event.key === "Enter" && activeIndex >= 0) {
                  event.preventDefault();
                  handleSelect(suggestions[activeIndex]);
                }
              }}
              placeholder="Search restaurants, menu items..."
              className="w-full border-0 bg-transparent py-3 pl-10 pr-10 text-base text-neutral-900 outline-none"
            />
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-neutral-400">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer absolute inset-y-0 right-3 flex items-center rounded-full px-1 text-neutral-400 transition hover:text-neutral-600"
                aria-label="Clear search"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {showSuggestions && (
          <SurfaceCard padding="none" shadow="lg" className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden">
            <ul role="listbox" className="max-h-80 overflow-y-auto py-2">
              {scope === "restaurants" ? (
                isEmptyQuery ? (
                  <>
                    {recentRestaurants.length > 0 && (
                      <li className="px-4 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Recently Searched
                      </li>
                    )}
                    {recentRestaurants.map((restaurant, index) => (
                      <RestaurantResultRow
                        key={restaurant.id}
                        restaurant={restaurant}
                        isActive={activeIndex === index}
                        onSelect={handleSelectRestaurant}
                        onRemoveRecent={handleRemoveRecent}
                      />
                    ))}

                    <li className="px-4 pt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Popular Restaurants
                    </li>
                    {popularRestaurants.map((restaurant, index) => {
                      const absoluteIndex = recentRestaurants.length + index;
                      return (
                        <RestaurantResultRow
                          key={restaurant.id}
                          restaurant={restaurant}
                          isActive={activeIndex === absoluteIndex}
                          onSelect={handleSelectRestaurant}
                        />
                      );
                    })}
                  </>
                ) : (
                  filteredSuggestions.map((restaurant, index) => (
                    <RestaurantResultRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      isActive={activeIndex === index}
                      onSelect={handleSelectRestaurant}
                      imageClassName="object-contain"
                    />
                  ))
                )
              ) : isEmptyQuery ? (
                !searchIndex ? (
                  <li className="px-4 py-6 text-center text-sm text-neutral-500">Loading menu items…</li>
                ) : recentMenuItems.length > 0 ? (
                  <>
                    <li className="px-4 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Recently Searched
                    </li>
                    {recentMenuItems.map((result, index) =>
                      result.kind === "menu-item" ? (
                        <MenuItemResultRow
                          key={`recent-item-${result.restaurant.id}-${result.item.id}`}
                          item={result.item}
                          restaurant={result.restaurant}
                          isActive={activeIndex === index}
                          onSelect={handleSelectMenuItem}
                          onRemoveRecent={() => removeRecentMenuItem(result)}
                        />
                      ) : (
                        <BuilderIngredientResultRow
                          key={`recent-ingredient-${result.restaurant.id}-${result.ingredient.id}`}
                          ingredient={result.ingredient}
                          restaurant={result.restaurant}
                          categoryLabel={result.categoryLabel}
                          isActive={activeIndex === index}
                          onSelect={(ingredient, restaurant) =>
                            handleStartBuild(ingredient, restaurant, result.categoryLabel)
                          }
                          onRemoveRecent={() => removeRecentMenuItem(result)}
                        />
                      )
                    )}
                  </>
                ) : (
                  <li className="px-4 py-6 text-center text-sm text-neutral-500">
                    Start typing to search menu items.
                  </li>
                )
              ) : !searchIndex ? (
                <li className="px-4 py-6 text-center text-sm text-neutral-500">Loading menu items…</li>
              ) : menuItemResults.length > 0 ? (
                menuItemResults.map((result, index) =>
                  result.kind === "menu-item" ? (
                    <MenuItemResultRow
                      key={`item-${result.restaurant.id}-${result.item.id}`}
                      item={result.item}
                      restaurant={result.restaurant}
                      isActive={activeIndex === index}
                      onSelect={handleSelectMenuItem}
                    />
                  ) : (
                    <BuilderIngredientResultRow
                      key={`ingredient-${result.restaurant.id}-${result.ingredient.id}`}
                      ingredient={result.ingredient}
                      restaurant={result.restaurant}
                      categoryLabel={result.categoryLabel}
                      isActive={activeIndex === index}
                      onSelect={(ingredient, restaurant) =>
                        handleStartBuild(ingredient, restaurant, result.categoryLabel)
                      }
                    />
                  )
                )
              ) : (
                <li className="px-4 py-6 text-center text-sm text-neutral-500">No menu items found.</li>
              )}
            </ul>
          </SurfaceCard>
        )}
      </div>
    </section>
  );
}
