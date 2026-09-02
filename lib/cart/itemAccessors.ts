import type { CartItemAnalyticsType } from "@/lib/analytics";
import { getAllRestaurants } from "@/lib/restaurants";
import type { CartItem, CartMacros } from "@/types/cart";

export function getCartItemVariantId(cartItem: Pick<CartItem, "variantId" | "selection">) {
  return cartItem.selection.type === "standard" ? cartItem.selection.variantId ?? cartItem.variantId : cartItem.variantId;
}

/**
 * Core cart macros should be read from nutritionPerItem, which is the cart
 * nutrition source of truth. macrosPerItem remains as a legacy fallback for
 * older cart item shapes that may not have complete nutrition fields.
 */
export function getCartItemCoreMacros(cartItem: Pick<CartItem, "macrosPerItem" | "nutritionPerItem">): CartMacros {
  return {
    calories: cartItem.nutritionPerItem.calories ?? cartItem.macrosPerItem.calories,
    protein: cartItem.nutritionPerItem.protein ?? cartItem.macrosPerItem.protein,
    carbs: cartItem.nutritionPerItem.carbs ?? cartItem.macrosPerItem.carbs,
    totalFat: cartItem.nutritionPerItem.totalFat ?? cartItem.macrosPerItem.totalFat,
  };
}

// Builds the add_to_cart analytics payload from a CartItem that has just
// been added (or merged into an existing matching line). Reads nutrition
// through getCartItemCoreMacros — the same finalized-per-item source of
// truth the cart itself displays — so builder/standard customization is
// always reflected, never base-item nutrition. `quantity` is passed
// separately from the CartItem's own `quantity` field since callers that
// bump an existing line (rather than create a new one) need to report the
// delta actually added in that action, not the item's resulting total.
export function getCartItemAddToCartAnalytics(
  cartItem: Pick<CartItem, "restaurantId" | "itemId" | "name" | "selection" | "macrosPerItem" | "nutritionPerItem">,
  quantity: number
) {
  const macros = getCartItemCoreMacros(cartItem);
  const restaurantName =
    getAllRestaurants().find((restaurant) => restaurant.id === cartItem.restaurantId)?.name ?? cartItem.restaurantId;
  const itemType: CartItemAnalyticsType = cartItem.selection.type === "build-your-own" ? "builder" : "standard";

  return {
    restaurantId: cartItem.restaurantId,
    restaurantName,
    itemId: cartItem.itemId,
    itemName: cartItem.name,
    itemType,
    calories: macros.calories,
    protein: macros.protein,
    quantity,
  };
}
