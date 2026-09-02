type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFunction;
  }
}

function sendGaEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackRestaurantView({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string;
  restaurantName: string;
}) {
  sendGaEvent("restaurant_view", {
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
  });
}

export function trackMenuItemView({
  restaurantId,
  restaurantName,
  itemId,
  itemName,
  category,
}: {
  restaurantId: string;
  restaurantName: string;
  itemId: string;
  itemName: string;
  category?: string;
}) {
  sendGaEvent("menu_item_view", {
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    item_id: itemId,
    item_name: itemName,
    category,
  });
}

// Where a tracked search happened, matching the app's actual search
// surfaces/scopes (see useGlobalSearchState and RestaurantSearch):
//   - "restaurants": searching for a restaurant by name.
//   - "restaurant_menu": menu items/ingredients scoped to one restaurant
//     (nav search filtered to the current restaurant/cart context).
//   - "global_menu_items": menu items/ingredients across every restaurant.
export type SearchContext = "restaurants" | "restaurant_menu" | "global_menu_items";

export function trackSearch({
  restaurantId,
  searchTerm,
  resultsCount,
  searchContext,
}: {
  restaurantId?: string;
  searchTerm: string;
  resultsCount: number;
  searchContext: SearchContext;
}) {
  sendGaEvent("search", {
    restaurant_id: restaurantId,
    search_term: searchTerm,
    results_count: resultsCount,
    search_context: searchContext,
  });
}
