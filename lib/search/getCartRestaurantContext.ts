import type { CartItem } from "@/types/cart";

// Plan §4j: cart page's Menu Items scope defaults to the cart's own
// restaurant when it's unambiguous, else All Restaurants. Computed fresh
// every time Global Search opens (called from render, not cached).
export type CartRestaurantContext =
  | { scope: "single"; restaurantId: string }
  | { scope: "all" };

export function getCartRestaurantContext(items: CartItem[]): CartRestaurantContext {
  const restaurantIds = new Set(items.map((item) => item.restaurantId));

  if (restaurantIds.size === 1) {
    return { scope: "single", restaurantId: [...restaurantIds][0] };
  }

  return { scope: "all" };
}
