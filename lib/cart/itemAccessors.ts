import type { CartItem, CartMacros } from "@/types/cart";

export function getCartItemVariantId(cartItem: Pick<CartItem, "variantId" | "selection">) {
  return cartItem.selection.type === "standard" ? cartItem.selection.variantId ?? cartItem.variantId : cartItem.variantId;
}

export function getCartItemCoreMacros(cartItem: Pick<CartItem, "macrosPerItem" | "nutritionPerItem">): CartMacros {
  return {
    calories: cartItem.nutritionPerItem.calories ?? cartItem.macrosPerItem.calories,
    protein: cartItem.nutritionPerItem.protein ?? cartItem.macrosPerItem.protein,
    carbs: cartItem.nutritionPerItem.carbs ?? cartItem.macrosPerItem.carbs,
    totalFat: cartItem.nutritionPerItem.totalFat ?? cartItem.macrosPerItem.totalFat,
  };
}
