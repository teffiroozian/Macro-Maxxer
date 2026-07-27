"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useCart } from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";

type PendingConflict = {
  item: CartItem;
  onAdded?: () => void;
};

type CartAddConfirmationContextValue = {
  pendingConflict: PendingConflict | null;
  requestAddItem: (item: CartItem, onAdded?: () => void) => void;
  confirmAddAnyway: () => void;
  confirmReplaceCart: () => void;
  cancelPendingAdd: () => void;
};

const CartAddConfirmationContext = createContext<CartAddConfirmationContextValue | null>(null);

// The one shared gate every "add a new item to the cart" path routes through
// (menu item cards, the item-detail modal, the Chipotle builder, and any
// future Quick Add). Editing/updating an existing cart item never goes
// through here — those call useCart().updateItem/updateQuantity directly,
// which is exactly why a cross-restaurant check belongs here rather than in
// the cart store's addItem itself.
export function CartAddConfirmationProvider({ children }: { children: ReactNode }) {
  const { items, addItem, clearCart } = useCart();
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);

  const requestAddItem = (item: CartItem, onAdded?: () => void) => {
    // Compare against every restaurant already represented in the cart
    // (not just the first item) so an already-mixed cart from a prior "Add
    // Anyway" only reconfirms when the new item is from a restaurant that
    // still isn't present.
    const hasConflict = items.length > 0 && !items.some((cartItem) => cartItem.restaurantId === item.restaurantId);

    if (!hasConflict) {
      addItem(item);
      onAdded?.();
      return;
    }

    setPendingConflict({ item, onAdded });
  };

  const cancelPendingAdd = () => {
    setPendingConflict(null);
  };

  const confirmAddAnyway = () => {
    if (!pendingConflict) return;
    addItem(pendingConflict.item);
    pendingConflict.onAdded?.();
    setPendingConflict(null);
  };

  const confirmReplaceCart = () => {
    if (!pendingConflict) return;
    clearCart();
    addItem(pendingConflict.item);
    pendingConflict.onAdded?.();
    setPendingConflict(null);
  };

  return (
    <CartAddConfirmationContext.Provider
      value={{ pendingConflict, requestAddItem, confirmAddAnyway, confirmReplaceCart, cancelPendingAdd }}
    >
      {children}
    </CartAddConfirmationContext.Provider>
  );
}

export function useCartAddConfirmation() {
  const context = useContext(CartAddConfirmationContext);

  if (!context) {
    throw new Error("useCartAddConfirmation must be used within CartAddConfirmationProvider");
  }

  return context;
}
