"use client";

import { useMemo, useState } from "react";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const RECENT_RESTAURANTS_KEY = "recentlySearchedRestaurants";
const MAX_RECENT_RESTAURANTS = 3;
const MAX_POPULAR_RESTAURANTS = 10;

// Shared by the homepage hero search and the global nav search panel, so
// recent/popular restaurant discovery never drifts between the two.
// Coming Soon restaurants don't lead to a usable page yet, so they're
// excluded from discovery here — this only affects search, not the
// homepage's own Coming Soon cards elsewhere on the page.
export function useRecentAndPopularRestaurants(allRestaurants: RestaurantIndexEntry[]) {
  const restaurants = useMemo(
    () => allRestaurants.filter((restaurant) => !restaurant.isComingSoon),
    [allRestaurants]
  );

  const [recentRestaurantIds, setRecentRestaurantIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(RECENT_RESTAURANTS_KEY);
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(Boolean).slice(0, MAX_RECENT_RESTAURANTS);
    } catch {
      return [];
    }
  });

  const recentRestaurants = useMemo(
    () =>
      recentRestaurantIds
        .map((id) => restaurants.find((restaurant) => restaurant.id === id))
        .filter((restaurant): restaurant is RestaurantIndexEntry => Boolean(restaurant))
        .slice(0, MAX_RECENT_RESTAURANTS),
    [recentRestaurantIds, restaurants]
  );

  const popularRestaurants = useMemo(() => {
    const recentIdSet = new Set(recentRestaurants.map((restaurant) => restaurant.id));

    return restaurants
      .filter((restaurant) => !recentIdSet.has(restaurant.id))
      .slice(0, MAX_POPULAR_RESTAURANTS);
  }, [recentRestaurants, restaurants]);

  const removeRecent = (restaurantId: string) => {
    setRecentRestaurantIds((prev) => {
      const next = prev.filter((id) => id !== restaurantId);

      try {
        window.localStorage.setItem(RECENT_RESTAURANTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage write errors.
      }

      return next;
    });
  };

  return { recentRestaurants, popularRestaurants, removeRecent };
}
