// CENTRAL PLACE FOR CART INFO

"use client";

import { useMemo, useSyncExternalStore } from "react";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import type { CartItem, CartState } from "@/types/cart";
export type { CartItem, CartMacros, CartState } from "@/types/cart";

let cartState: CartState = {
  items: [],
  lastAddedItemId: null,
  lastAddedAt: null,
  lastAddedEventId: null,
  lastAddedPreviewDismissedEventId: null,
};

// store all components listening to cart changes
const listeners = new Set<() => void>();

// tells all those components change has been made to cart
const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

// updates the cart when changes are made and calls notify
const getNextLastAddedEventId = (prev: CartState) => (prev.lastAddedEventId ?? 0) + 1;

const setCartState = (updater: (prev: CartState) => CartState) => {
  cartState = updater(cartState);
  notify();
};

// lets React components subscribe to the cart store
const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

// returns current cartState
const getSnapshot = () => cartState;

// cart nutrition totals are calculated in lib/cart/nutrition.ts.
const computeTotals = buildCartMacroTotals;
const computeHasPartialNutritionData = hasPartialCartNutritionData;

// add item
const addItem = (item: CartItem) => {
  setCartState((prev) => {
    // checks for existing items in the cart
    const existingIndex = prev.items.findIndex((cartItem) => cartItem.id === item.id);

    // if it doesn't exist add as new item
    if (existingIndex === -1) {
      return {
        ...prev,
        items: [...prev.items, item],
        lastAddedItemId: item.id,
        lastAddedAt: Date.now(),
        lastAddedEventId: getNextLastAddedEventId(prev),
      };
    }

    const updatedItems = [...prev.items];
    const existingItem = updatedItems[existingIndex];

    // if it exists increase the quantity
    updatedItems[existingIndex] = {
      ...existingItem,
      quantity: existingItem.quantity + item.quantity,
    };

    const updatedItem = updatedItems[existingIndex];

    return {
      ...prev,
      items: updatedItems,
      lastAddedItemId: updatedItem.id,
      lastAddedAt: Date.now(),
      lastAddedEventId: getNextLastAddedEventId(prev),
    };
  });
};

// remove item 
const removeItem = (id: string) => {
  setCartState((prev) => {
    const isRemovingLastAddedItem = prev.lastAddedItemId === id;

    return {
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      lastAddedItemId: isRemovingLastAddedItem ? null : prev.lastAddedItemId,
      lastAddedAt: isRemovingLastAddedItem ? null : prev.lastAddedAt,
      lastAddedEventId: isRemovingLastAddedItem ? null : prev.lastAddedEventId,
      lastAddedPreviewDismissedEventId: isRemovingLastAddedItem ? null : prev.lastAddedPreviewDismissedEventId,
    };
  });
};

// update quantity
const updateQuantity = (id: string, quantity: number) => {
  if (quantity <= 0) {
    removeItem(id);
    return;
  }
  // if id matches, return a copy with new quantity
  setCartState((prev) => ({
    ...prev,
    items: prev.items.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity,
          }
        : item,
    ),
  }));
};

// updates customziation to an item
const updateItem = (
  id: string,
  // don't touch id or restaurantId
  updates: Partial<Omit<CartItem, "id" | "restaurantId">>,
  options?: { markAsJustAdded?: boolean }
) => {
  setCartState((prev) => {
    let updatedItem: CartItem | null = null;
    const items = prev.items.map((item) => {
      if (item.id !== id) return item;

      updatedItem = {
        ...item,
        ...updates,
      };
      return updatedItem;
    });

    if (!updatedItem) {
      return {
        ...prev,
        items,
      };
    }

    return {
      ...prev,
      items,
      lastAddedItemId: options?.markAsJustAdded ? id : prev.lastAddedItemId,
      lastAddedAt: options?.markAsJustAdded ? Date.now() : prev.lastAddedAt,
      lastAddedEventId: options?.markAsJustAdded ? getNextLastAddedEventId(prev) : prev.lastAddedEventId,
    };
  });
};

// empties the cart
const clearCart = () => {
  setCartState((prev) => ({
    ...prev,
    items: [],
    lastAddedItemId: null,
    lastAddedAt: null,
    lastAddedEventId: null,
    lastAddedPreviewDismissedEventId: null,
  }));
};


const dismissLastAddedPreview = () => {
  setCartState((prev) => {
    if (prev.lastAddedEventId === null || prev.lastAddedPreviewDismissedEventId === prev.lastAddedEventId) {
      return prev;
    }

    return {
      ...prev,
      lastAddedPreviewDismissedEventId: prev.lastAddedEventId,
    };
  });
};

export const __cartStoreTestUtils = {
  getSnapshot,
  resetCartState(nextState?: Partial<CartState>) {
    cartState = {
      items: [],
      lastAddedItemId: null,
      lastAddedAt: null,
      lastAddedEventId: null,
      lastAddedPreviewDismissedEventId: null,
      ...nextState,
    };
    notify();
  },
  addItem,
  updateItem,
  dismissLastAddedPreview,
};

// public api for the cart store for current cart data and functions to change cart
export const useCart = () => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const totals = useMemo(() => computeTotals(state.items), [state.items]);
  const hasPartialNutritionData = useMemo(() => computeHasPartialNutritionData(state.items), [state.items]);
  const lastAddedItem = useMemo(
    () => state.items.find((item) => item.id === state.lastAddedItemId) ?? null,
    [state.items, state.lastAddedItemId],
  );

  return {
    items: state.items,
    totals,
    hasPartialNutritionData,
    lastAddedItem,
    lastAddedAt: state.lastAddedAt,
    lastAddedEventId: state.lastAddedEventId,
    lastAddedPreviewDismissedEventId: state.lastAddedPreviewDismissedEventId,
    dismissLastAddedPreview,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    clearCart,
  };
};
