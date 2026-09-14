"use client";

import { useMemo, useState } from "react";
import { resolveIngredientCategoryLabel, type ContentSearchResult } from "@/lib/search/searchAllContent";
import { resolveQuickAddEligibility } from "@/lib/search/quickAddEligibility";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";

const RECENT_MENU_ITEMS_KEY = "recentlySearchedMenuItems";
const MAX_RECENT_MENU_ITEMS = 5;

type RecentMenuItemRef =
  | { kind: "menu-item"; restaurantId: string; itemId: string }
  | { kind: "builder-ingredient"; restaurantId: string; ingredientId: string }
  | { kind: "builder-entree"; restaurantId: string; entreeId: string };

function refKey(ref: RecentMenuItemRef): string {
  switch (ref.kind) {
    case "menu-item":
      return `menu-item:${ref.restaurantId}:${ref.itemId}`;
    case "builder-ingredient":
      return `builder-ingredient:${ref.restaurantId}:${ref.ingredientId}`;
    case "builder-entree":
      return `builder-entree:${ref.restaurantId}:${ref.entreeId}`;
  }
}

function toRef(result: ContentSearchResult): RecentMenuItemRef {
  switch (result.kind) {
    case "menu-item":
      return { kind: "menu-item", restaurantId: result.restaurant.id, itemId: result.item.id };
    case "builder-ingredient":
      return { kind: "builder-ingredient", restaurantId: result.restaurant.id, ingredientId: result.ingredient.id };
    case "builder-entree":
      return { kind: "builder-entree", restaurantId: result.restaurant.id, entreeId: result.entreeId };
  }
}

// Shared by GlobalSearchPanel (nav) and the homepage hero search — mirrors
// useRecentAndPopularRestaurants' localStorage pattern, but for Menu Items
// mode results (standard items and Chipotle builder ingredients alike).
// Recorded on selection, not on every keystroke, matching "searched" intent.
export function useRecentMenuItems(searchIndex: SearchIndexEntry[] | null) {
  const [recentRefs, setRecentRefs] = useState<RecentMenuItemRef[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(RECENT_MENU_ITEMS_KEY);
      const parsed = stored ? (JSON.parse(stored) as RecentMenuItemRef[]) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_MENU_ITEMS) : [];
    } catch {
      return [];
    }
  });

  const recentResults: ContentSearchResult[] = useMemo(() => {
    if (!searchIndex) {
      return [];
    }

    const results: ContentSearchResult[] = [];
    for (const ref of recentRefs) {
      const entry = searchIndex.find((candidate) => candidate.restaurant.id === ref.restaurantId);
      if (!entry) {
        continue;
      }

      if (ref.kind === "menu-item") {
        const item = entry.items.find((candidate) => candidate.id === ref.itemId);
        if (item) {
          results.push({
            kind: "menu-item",
            item,
            restaurant: entry.restaurant,
            quickAdd: resolveQuickAddEligibility(item),
          });
        }
      } else if (ref.kind === "builder-ingredient") {
        const ingredient = entry.ingredients.find((candidate) => candidate.id === ref.ingredientId);
        if (ingredient) {
          results.push({
            kind: "builder-ingredient",
            ingredient,
            restaurant: entry.restaurant,
            categoryLabel: resolveIngredientCategoryLabel(ingredient, entry.builderConfig),
          });
        }
      } else {
        const candidate = entry.entreeBuilders.find((candidate) => candidate.entreeId === ref.entreeId);
        if (candidate) {
          results.push({
            kind: "builder-entree",
            entreeId: candidate.entreeId,
            entreeOption: candidate.option,
            restaurant: entry.restaurant,
          });
        }
      }
    }

    return results;
  }, [recentRefs, searchIndex]);

  const persist = (next: RecentMenuItemRef[]) => {
    try {
      window.localStorage.setItem(RECENT_MENU_ITEMS_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage write errors.
    }
  };

  const addRecent = (result: ContentSearchResult) => {
    const ref = toRef(result);

    setRecentRefs((prev) => {
      const next = [ref, ...prev.filter((existing) => refKey(existing) !== refKey(ref))].slice(
        0,
        MAX_RECENT_MENU_ITEMS
      );
      persist(next);
      return next;
    });
  };

  // Removes only the given result from recent history — mirrors
  // useRecentAndPopularRestaurants' removeRecent(restaurantId), just keyed
  // by kind+restaurant+item/ingredient instead of restaurant id alone.
  const removeRecent = (result: ContentSearchResult) => {
    const ref = toRef(result);

    setRecentRefs((prev) => {
      const next = prev.filter((existing) => refKey(existing) !== refKey(ref));
      persist(next);
      return next;
    });
  };

  return { recentResults, addRecent, removeRecent };
}
