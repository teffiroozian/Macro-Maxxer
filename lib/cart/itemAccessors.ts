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
