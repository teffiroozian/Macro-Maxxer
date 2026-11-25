"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useCart } from "@/stores/cartStore";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import type { CartItem } from "@/types/cart";

type OnAdded = (result: { replaced: boolean }) => void;

type PendingConflict = {
  items: CartItem[];
  onAdded?: OnAdded;
};

type CartAddConfirmationContextValue = {
  pendingConflict: PendingConflict | null;
  requestAddItem: (item: CartItem, onAdded?: OnAdded) => void;
  // Adds a whole meal behind one confirmation.
  requestAddItems: (items: CartItem[], onAdded?: OnAdded) => void;
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

  // Every successful add that reaches the cart store funnels through here,
  // so this is the single place the add_to_cart GA4 event fires — one event
  // per genuine add, regardless of which UI surface (card, modal, builder,
  // search quick add) or which of the three addItem() call sites below
  // triggered it.
  const addItemAndTrack = (item: CartItem) => {
    addItem(item);
    trackAddToCart(getCartItemAddToCartAnalytics(item, item.quantity));
  };

  const requestAddItems = (added: CartItem[], onAdded?: OnAdded) => {
    // Compare against every restaurant already represented in the cart
    // (not just the first item) so an already-mixed cart from a prior "Add
    // Anyway" only reconfirms when the new item is from a restaurant that
    // still isn't present.
    const hasConflict = items.length > 0 && !items.some((cartItem) => added.some((item) => item.restaurantId === cartItem.restaurantId));

    if (!hasConflict) {
      added.forEach(addItemAndTrack);
      onAdded?.({ replaced: false });
      return;
    }

    setPendingConflict({ items: added, onAdded });
  };

  const requestAddItem = (item: CartItem, onAdded?: OnAdded) => requestAddItems([item], onAdded);

  const cancelPendingAdd = () => {
    setPendingConflict(null);
  };

  const confirmAddAnyway = () => {
    if (!pendingConflict) return;
    pendingConflict.items.forEach(addItemAndTrack);
    pendingConflict.onAdded?.({ replaced: false });
    setPendingConflict(null);
  };

  const confirmReplaceCart = () => {
    if (!pendingConflict) return;
    clearCart();
    pendingConflict.items.forEach(addItemAndTrack);
    pendingConflict.onAdded?.({ replaced: true });
    setPendingConflict(null);
  };

  return (
    <CartAddConfirmationContext.Provider
      value={{ pendingConflict, requestAddItem, requestAddItems, confirmAddAnyway, confirmReplaceCart, cancelPendingAdd }}
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
