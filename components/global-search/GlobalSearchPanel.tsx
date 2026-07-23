"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import RestaurantResultRow from "@/components/global-search/RestaurantResultRow";
import { searchRestaurants } from "@/lib/search/searchRestaurants";
import { useRecentAndPopularRestaurants } from "@/lib/search/useRecentAndPopularRestaurants";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { getAllRestaurants } from "@/lib/restaurants";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Restaurant-only for now. Menu-item and builder-ingredient scopes are
// added in Slice 3, reusing this same panel.
export default function GlobalSearchPanel() {
  const router = useRouter();
  const { query, setQuery, close } = useGlobalSearch();
  const [activeIndex, setActiveIndex] = useState(-1);

  const restaurants = useMemo(() => getAllRestaurants(), []);
  const results = useMemo(
    () => searchRestaurants(restaurants, query),
    [restaurants, query]
  );
  const { recentRestaurants, popularRestaurants, removeRecent } =
    useRecentAndPopularRestaurants(restaurants);
  const isEmptyQuery = !query.trim();
  const suggestions = isEmptyQuery
    ? [...recentRestaurants, ...popularRestaurants]
    : results;

  const handleSelect = (restaurant: RestaurantIndexEntry) => {
    if (restaurant.isComingSoon) {
      return;
    }

    close();
    router.push(`/restaurant/${restaurant.id}`);
  };

  const handleViewAllRestaurants = () => {
    close();
    router.push("/#all-restaurants-section");
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={(event) => {
              if (suggestions.length === 0) {
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
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
            placeholder="Search restaurants"
            autoFocus
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-11 text-base text-neutral-900 outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
          />
          <span className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-neutral-400">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </div>
      </div>

      <ul role="listbox" className="mt-2 max-h-80 overflow-y-auto pb-2">
        {isEmptyQuery ? (
          <>
            {recentRestaurants.length > 0 && (
              <li className="px-5 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Recently Searched
              </li>
            )}
            {recentRestaurants.map((restaurant, index) => (
              <RestaurantResultRow
                key={restaurant.id}
                restaurant={restaurant}
                isActive={activeIndex === index}
                onSelect={handleSelect}
                onRemoveRecent={removeRecent}
              />
            ))}

            <li className="px-5 pt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Popular Restaurants
            </li>
            {popularRestaurants.map((restaurant, index) => {
              const absoluteIndex = recentRestaurants.length + index;
              return (
                <RestaurantResultRow
                  key={restaurant.id}
                  restaurant={restaurant}
                  isActive={activeIndex === absoluteIndex}
                  onSelect={handleSelect}
                />
              );
            })}
          </>
        ) : results.length > 0 ? (
          results.map((restaurant, index) => (
            <RestaurantResultRow
              key={restaurant.id}
              restaurant={restaurant}
              isActive={activeIndex === index}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <li className="px-5 py-6 text-center text-sm text-neutral-500">
            No restaurants found.
          </li>
        )}
      </ul>

      {isEmptyQuery ? (
        <div className="border-t border-black/5 px-5 py-3">
          <button
            type="button"
            onClick={handleViewAllRestaurants}
            className="cursor-pointer text-sm font-semibold text-neutral-700 transition hover:text-neutral-900"
          >
            View All Restaurants
          </button>
        </div>
      ) : null}
    </div>
  );
}
