"use client";

import { useMemo, useState } from "react";
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
import type { SearchScope } from "@/components/global-search/ScopeSwitcher";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import type { SearchResult } from "@/types/search";

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

  const isCartPage = pathname === "/cart";
  // Matches /restaurant/[id], /restaurant/[id]/[itemSlug], and the
  // intercepted item-modal route — all share the /restaurant/<id> prefix.
  const currentRestaurantId = pathname?.match(/^\/restaurant\/([^/]+)/)?.[1] ?? null;

  const [scope, setScope] = useState<SearchScope>(() =>
    isCartPage || currentRestaurantId ? "menu-items" : "restaurants"
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
    const cartContext = getCartRestaurantContext(cartItems);
    return cartContext.scope === "single" ? cartContext.restaurantId : null;
  }, [currentRestaurantId, isCartPage, cartItems]);

  const [restaurantFilterId, setRestaurantFilterId] = useState<string | null>(() => naturalRestaurantId);

  const isEmptyQuery = !query.trim();

  // ----- Restaurants scope -----
  const restaurants = useMemo(() => getAllRestaurants(), []);
  const restaurantResults = useMemo(() => searchRestaurants(restaurants, query), [restaurants, query]);
  const { recentRestaurants, popularRestaurants, removeRecent } = useRecentAndPopularRestaurants(restaurants);
  const restaurantSuggestions = isEmptyQuery ? [...recentRestaurants, ...popularRestaurants] : restaurantResults;

  // ----- Menu Items scope -----
  const { searchIndex, results: menuItemResults } = useMenuItemSearch(query, {
    enabled: scope === "menu-items",
    restaurantFilterId,
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
      restaurantFilterId
        ? recentMenuItemsAll.filter((result) => result.restaurant.id === restaurantFilterId)
        : recentMenuItemsAll,
    [recentMenuItemsAll, restaurantFilterId]
  );
  const menuItemSuggestions = isEmptyQuery ? recentMenuItems : menuItemResults;

  const filteredRestaurantName = restaurantFilterId
    ? restaurants.find((restaurant) => restaurant.id === restaurantFilterId)?.name
    : null;
  const naturalRestaurant = naturalRestaurantId
    ? restaurants.find((restaurant) => restaurant.id === naturalRestaurantId) ?? null
    : null;

  // ----- Shared selection handlers -----
  const suggestions: SearchResult[] =
    scope === "restaurants"
      ? restaurantSuggestions.map((restaurant): SearchResult => ({ kind: "restaurant", restaurant }))
      : menuItemSuggestions;

  const handleSelectRestaurant = (restaurant: RestaurantIndexEntry) => {
    if (restaurant.isComingSoon) {
      return;
    }
    close();
    router.push(`/restaurant/${restaurant.id}`);
  };

  const { handleSelectMenuItem, handleStartBuild } = useMenuItemSelectionHandlers({
    addRecentMenuItem,
    currentRestaurantId,
    onAfterSelect: close,
  });

  const handleSelect = (result: SearchResult) => {
    if (result.kind === "restaurant") {
      handleSelectRestaurant(result.restaurant);
    } else if (result.kind === "menu-item") {
      handleSelectMenuItem(result.item, result.restaurant);
    } else {
      handleStartBuild(result.ingredient, result.restaurant, result.categoryLabel);
    }
  };

  const handleViewAllRestaurants = () => {
    close();
    router.push("/#all-restaurants-section");
  };

  const handleScopeChange = (nextScope: SearchScope) => {
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
    scope,
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
    restaurantFilterId,
    filteredRestaurantName,
    naturalRestaurantId,
    naturalRestaurant,
    setRestaurantFilterId,
    handleSelectRestaurant,
    handleSelectMenuItem,
    handleStartBuild,
    handleViewAllRestaurants,
  };
}
