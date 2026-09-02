import { sendGAEvent } from "@next/third-parties/google";

// Previously this gated on `typeof window.gtag === "function"` and silently
// dropped the event otherwise. That's a real data-loss bug: the
// GoogleAnalytics component (app/layout.tsx) loads its scripts via
// next/script's default "afterInteractive" strategy, which only runs once
// the whole page has finished hydrating — not instantly on mount. An event
// fired shortly after initial load (e.g. search's 500ms debounce, which can
// fire well before slower events like add-to-cart or a restaurant visit)
// can easily race ahead of that, and gtag never becomes ready in time to
// catch it.
//
// sendGAEvent (the officially supported utility from @next/third-parties)
// avoids that readiness gate: it pushes onto window.dataLayer, the same
// queue gtag.js itself is designed to drain once it finishes loading, so a
// push before the library is ready isn't lost — it's just queued. Seeding
// dataLayer here (idempotent, the same `window.dataLayer = window.dataLayer
// || []` Google's own snippet uses) guarantees that push always lands, even
// if this fires before GoogleAnalytics's own init script has executed at
// all — closing the gap completely rather than narrowing it.
function sendGaEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  sendGAEvent("event", eventName, params);
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

// "standard": a regular menu item (selection.type === "standard").
// "builder": a Chipotle-style build-your-own item (selection.type === "build-your-own").
export type CartItemAnalyticsType = "standard" | "builder";

export function trackAddToCart({
  restaurantId,
  restaurantName,
  itemId,
  itemName,
  itemType,
  calories,
  protein,
  quantity,
}: {
  restaurantId: string;
  restaurantName: string;
  itemId: string;
  itemName: string;
  itemType: CartItemAnalyticsType;
  calories: number;
  protein: number;
  quantity: number;
}) {
  sendGaEvent("add_to_cart", {
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    item_id: itemId,
    item_name: itemName,
    item_type: itemType,
    calories,
    protein,
    quantity,
  });
}

export function trackCartView({
  itemCount,
  restaurantCount,
  totalCalories,
  totalProtein,
}: {
  itemCount: number;
  restaurantCount: number;
  totalCalories: number;
  totalProtein: number;
}) {
  sendGaEvent("cart_view", {
    item_count: itemCount,
    restaurant_count: restaurantCount,
    total_calories: totalCalories,
    total_protein: totalProtein,
  });
}
