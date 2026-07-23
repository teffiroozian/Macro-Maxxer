"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantResultRow from "@/components/global-search/RestaurantResultRow";
import { searchRestaurants } from "@/lib/search/searchRestaurants";
import { useRecentAndPopularRestaurants } from "@/lib/search/useRecentAndPopularRestaurants";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const MAX_FILTERED_SUGGESTIONS = 10;

type RestaurantSearchProps = {
  restaurants: RestaurantIndexEntry[];
};

export default function RestaurantSearch({ restaurants }: RestaurantSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const { recentRestaurants, popularRestaurants, removeRecent } =
    useRecentAndPopularRestaurants(restaurants);

  const filteredSuggestions = useMemo(
    () => searchRestaurants(restaurants, query).slice(0, MAX_FILTERED_SUGGESTIONS),
    [query, restaurants]
  );

  const isEmptyFocusedState = isFocused && !query.trim();
  const suggestions = isEmptyFocusedState
    ? [...recentRestaurants, ...popularRestaurants]
    : filteredSuggestions;

  const showSuggestions = isFocused && suggestions.length > 0;

  const handleSelect = (restaurant: RestaurantIndexEntry) => {
    if (restaurant.isComingSoon) {
      return;
    }

    setQuery(restaurant.name);
    setActiveIndex(-1);
    setIsFocused(false);
    router.push(`/restaurant/${restaurant.id}`, { scroll: true });
  };

  const handleClear = () => {
    setQuery("");
    setActiveIndex(-1);
  };

  const handleRemoveRecent = (restaurantId: string) => {
    removeRecent(restaurantId);
    setActiveIndex(-1);
  };

  return (
    <section className="flex flex-col gap-3">
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
          placeholder="Start typing a restaurant name"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-16 text-base text-neutral-900 shadow-[0_0_12px_rgba(0,0,0,0.15)] outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
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
            className="cursor-pointer absolute inset-y-0 right-11 flex items-center rounded-full px-1 text-neutral-400 transition hover:text-neutral-600"
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
        {showSuggestions && (
          <SurfaceCard padding="none" shadow="lg" className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden">
            <ul role="listbox" className="max-h-60 overflow-y-auto py-2">
              {isEmptyFocusedState ? (
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
                      onSelect={handleSelect}
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
                        onSelect={handleSelect}
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
                    onSelect={handleSelect}
                    imageClassName="object-contain"
                  />
                ))
              )}
            </ul>
          </SurfaceCard>
        )}
      </div>
    </section>
  );
}
