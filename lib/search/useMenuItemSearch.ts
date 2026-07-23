"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { loadSearchIndex, type SearchIndexEntry } from "@/lib/search/searchIndex";
import { searchAllContent, type ContentSearchResult } from "@/lib/search/searchAllContent";

type UseMenuItemSearchOptions = {
  // Only start loading the (cross-restaurant) search index once the caller
  // actually needs it — e.g. gated on the Menu Items tab being active, so a
  // panel/hero mounted with the Restaurants tab selected never fetches it.
  enabled: boolean;
  restaurantFilterId?: string | null;
};

// Shared by GlobalSearchPanel (nav) and the homepage hero search, so menu-item
// search never has two competing implementations (plan: "reuse the same
// shared matching logic ... do not build a separate homepage-only system").
export function useMenuItemSearch(query: string, { enabled, restaurantFilterId = null }: UseMenuItemSearchOptions) {
  const [searchIndex, setSearchIndex] = useState<SearchIndexEntry[] | null>(null);

  useEffect(() => {
    if (!enabled || searchIndex) {
      return;
    }

    let cancelled = false;
    loadSearchIndex().then((index) => {
      if (!cancelled) {
        setSearchIndex(index);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, searchIndex]);

  const debouncedQuery = useDebouncedValue(query, 150);

  const filteredIndex = useMemo(() => {
    if (!searchIndex) {
      return [];
    }
    if (!restaurantFilterId) {
      return searchIndex;
    }
    return searchIndex.filter((entry) => entry.restaurant.id === restaurantFilterId);
  }, [searchIndex, restaurantFilterId]);

  const results: ContentSearchResult[] = useMemo(
    () => searchAllContent(filteredIndex, debouncedQuery),
    [filteredIndex, debouncedQuery]
  );

  return { searchIndex, results };
}
