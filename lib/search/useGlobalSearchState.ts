"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { searchRestaurants } from "@/lib/search/searchRestaurants";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import { useMenuItemSelectionHandlers } from "@/lib/search/useMenuItemSelectionHandlers";
import { useRecentMenuItems } from "@/lib/search/useRecentMenuItems";
import { getCartRestaurantContext } from "@/lib/search/getCartRestaurantContext";
import { useRecentAndPopularRestaurants } from "@/lib/search/useRecentAndPopularRestaurants";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { getAllRestaurants } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { trackSearch, type SearchContext } from "@/lib/analytics";
import type { SearchScope } from "@/components/global-search/ScopeSwitcher";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import type { SearchResult } from "@/types/search";

// How long a query must sit unchanged before it counts as a settled,
// trackable search (independent of useMenuItemSearch's own 150ms debounce,
// which exists to keep result rendering responsive, not to gate analytics).
const SEARCH_ANALYTICS_DEBOUNCE_MS = 500;

// DesktopSearchDropdown and GlobalSearchOverlay both stay mounted at all
// times and each call this hook independently, so a settled query is
// computed twice per keystroke pause — once per surface. This module-level
// signature (shared by both call sites, since they share one module
// instance) makes sure the resulting `search` event only fires once. It
// resets to null whenever the query empties out (e.g. on close()), so
// reopening and re-running the same search still fires a fresh event.
let lastTrackedSearchSignature: string | null = null;
const subscribeToClientReady = () => () => undefined;

// All the state and selection logic behind the nav's Global Search — shared
// by the desktop search bar (DesktopSearchDropdown) and the mobile sheet
// (GlobalSearchOverlay) so the two never drift, and so the actual <input>
// each surface renders can stay a single real input (no second input nested
// inside GlobalSearchPanel underneath it — see plan Slice 3 refinement #5).
export function useGlobalSearchState() {
  const router = useRouter();
  const pathname = usePathname();
  const { query, setQuery, close } = useGlobalSearch();
  const { items: cartItems } = useCart();
  const [activeIndex, setActiveIndex] = useState(-1);
  // Persisted cart data can become available at different moments during
  // selective hydration (the desktop and mobile search surfaces hydrate
  // independently). Keep the first client render identical to SSR, where
  // there is no browser cart, then opt into cart-derived scope after mount.
  const canUseClientCart = useSyncExternalStore(
    subscribeToClientReady,
    () => true,
    () => false,
  );

  const isCartPage = pathname === "/cart";
  // Matches /restaurant/[id], /restaurant/[id]/[itemSlug], and the
  // intercepted item-modal route — all share the /restaurant/<id> prefix.
  const currentRestaurantId = pathname?.match(/^\/restaurant\/([^/]+)/)?.[1] ?? null;

  const [scope, setScope] = useState<SearchScope>(() =>
    isCartPage ? "menu-items" : "restaurants"
  );

  // The restaurant this page is naturally scoped to (restaurant page, or a
  // cart holding items from exactly one restaurant) — independent of
  // restaurantFilterId so the current-restaurant/all-restaurants toggle can
  // switch back and forth without losing track of it.
  const naturalRestaurantId = useMemo(() => {
    if (currentRestaurantId) {
      return currentRestaurantId;
    }
    if (!isCartPage) {
      return null;
    }
    const cartContext = getCartRestaurantContext(canUseClientCart ? cartItems : []);
    return cartContext.scope === "single" ? cartContext.restaurantId : null;
  }, [currentRestaurantId, isCartPage, canUseClientCart, cartItems]);

  const scopeContextKey = currentRestaurantId
    ? `restaurant:${currentRestaurantId}`
    : isCartPage
      ? `cart:${naturalRestaurantId ?? "all"}`
      : "global";
  const [restaurantFilterOverride, setRestaurantFilterOverride] = useState<{
    contextKey: string;
    value: string | null;
  } | null>(null);
  const defaultRestaurantFilterId = isCartPage ? naturalRestaurantId : null;
  const restaurantFilterId = restaurantFilterOverride?.contextKey === scopeContextKey
    ? restaurantFilterOverride.value
    : defaultRestaurantFilterId;
  const setRestaurantFilterId = (value: string | null) => {
    setRestaurantFilterOverride({ contextKey: scopeContextKey, value });
  };
  const isRestaurantScoped = Boolean(currentRestaurantId);
  // Restaurant routes are a hard view over the shared search state. Keeping
  // this derived (instead of copying pathname into state in an effect) makes
  // the very first open correctly scoped and lets homepage state remain
  // untouched when navigating into and back out of a restaurant.
  const activeScope: SearchScope = isRestaurantScoped ? "menu-items" : scope;
  const activeRestaurantFilterId = currentRestaurantId ?? restaurantFilterId;

  const isEmptyQuery = !query.trim();

  // ----- Restaurants scope -----
  const restaurants = useMemo(() => getAllRestaurants(), []);
  const restaurantResults = useMemo(() => searchRestaurants(restaurants, query), [restaurants, query]);
  const { recentRestaurants, popularRestaurants, removeRecent } = useRecentAndPopularRestaurants(restaurants);
  const restaurantSuggestions = isEmptyQuery ? [...recentRestaurants, ...popularRestaurants] : restaurantResults;

  // ----- Menu Items scope -----
  const { searchIndex, results: menuItemResults } = useMenuItemSearch(query, {
    enabled: activeScope === "menu-items",
    restaurantFilterId: activeRestaurantFilterId,
  });
  const {
    recentResults: recentMenuItemsAll,
    addRecent: addRecentMenuItem,
    removeRecent: removeRecentMenuItem,
  } = useRecentMenuItems(searchIndex);
  // Recents respect the active restaurant scope, same as live search results
  // (useMenuItemSearch's restaurantFilterId) — switching scope should never
  // surface another restaurant's history.
  const recentMenuItems = useMemo(
    () =>
      activeRestaurantFilterId
        ? recentMenuItemsAll.filter((result) => result.restaurant.id === activeRestaurantFilterId)
        : recentMenuItemsAll,
    [recentMenuItemsAll, activeRestaurantFilterId]
  );
  const menuItemSuggestions = isEmptyQuery ? recentMenuItems : menuItemResults;

  // Fires one `search` GA4 event per meaningfully settled query, instead of
  // per keystroke: analyticsQuery only changes once `query` has sat still
  // for SEARCH_ANALYTICS_DEBOUNCE_MS. By the time it settles, `query` itself
  // has already been stable that whole time, so the live restaurantResults/
  // menuItemResults (both derived from `query`, the latter via its own
  // shorter debounce) are already correct for this exact term.
  const analyticsQuery = useDebouncedValue(query, SEARCH_ANALYTICS_DEBOUNCE_MS);

  useEffect(() => {
    const term = analyticsQuery.trim();
    if (!term) {
      lastTrackedSearchSignature = null;
      return;
    }

    const resultsCount = activeScope === "restaurants" ? restaurantResults.length : menuItemResults.length;
    const searchContext: SearchContext =
      activeScope === "restaurants" ? "restaurants" : activeRestaurantFilterId ? "restaurant_menu" : "global_menu_items";
    const restaurantId = activeScope === "menu-items" ? (activeRestaurantFilterId ?? undefined) : undefined;

    const signature = `${searchContext}|${restaurantId ?? ""}|${term.toLowerCase()}|${resultsCount}`;
    if (lastTrackedSearchSignature === signature) {
      return;
    }
    lastTrackedSearchSignature = signature;

    trackSearch({ searchTerm: term, resultsCount, searchContext, restaurantId });
  }, [analyticsQuery, activeScope, activeRestaurantFilterId, restaurantResults.length, menuItemResults.length]);

  const filteredRestaurantName = activeRestaurantFilterId
    ? restaurants.find((restaurant) => restaurant.id === activeRestaurantFilterId)?.name
    : null;
  const naturalRestaurant = naturalRestaurantId
    ? restaurants.find((restaurant) => restaurant.id === naturalRestaurantId) ?? null
    : null;

  // ----- Shared selection handlers -----
  const suggestions: SearchResult[] =
    activeScope === "restaurants"
      ? restaurantSuggestions.map((restaurant): SearchResult => ({ kind: "restaurant", restaurant }))
      : menuItemSuggestions;

  const handleSelectRestaurant = (restaurant: RestaurantIndexEntry) => {
    if (restaurant.isComingSoon) {
      return;
    }
    close();
    router.push(`/restaurant/${restaurant.id}`);
  };

  const { handleSelectMenuItem, handleStartBuild, handleStartEntreeBuild } = useMenuItemSelectionHandlers({
    addRecentMenuItem,
    currentRestaurantId,
    onAfterSelect: close,
  });

  const handleSelect = (result: SearchResult) => {
    if (result.kind === "restaurant") {
      handleSelectRestaurant(result.restaurant);
    } else if (result.kind === "menu-item") {
      handleSelectMenuItem(result.item, result.restaurant);
    } else if (result.kind === "builder-entree") {
      handleStartEntreeBuild(result.entreeId, result.entreeOption, result.restaurant);
    } else {
      handleStartBuild(result.ingredient, result.restaurant, result.categoryLabel);
    }
  };

  const handleViewAllRestaurants = () => {
    close();
    router.push("/#all-restaurants-section");
  };

  const handleScopeChange = (nextScope: SearchScope) => {
    if (isRestaurantScoped) return;
    setScope(nextScope);
    setActiveIndex(-1);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
  };

  return {
    query,
    handleInputChange,
    handleInputKeyDown,
    scope: activeScope,
    handleScopeChange,
    activeIndex,
    isEmptyQuery,
    restaurants,
    restaurantResults,
    recentRestaurants,
    popularRestaurants,
    removeRecent,
    searchIndex,
    menuItemResults,
    recentMenuItems,
    removeRecentMenuItem,
    restaurantFilterId: activeRestaurantFilterId,
    filteredRestaurantName,
    naturalRestaurantId,
    naturalRestaurant,
    isRestaurantScoped,
    setRestaurantFilterId,
    handleSelectRestaurant,
    handleSelectMenuItem,
    handleStartBuild,
    handleStartEntreeBuild,
    handleViewAllRestaurants,
  };
}
