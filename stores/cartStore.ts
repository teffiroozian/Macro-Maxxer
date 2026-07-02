// CENTRAL PLACE FOR CART INFO

"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CartItem, CartMacros, CartState } from "@/types/cart";
export type { CartItem, CartMacros, CartState } from "@/types/cart";

// default macros when cart is empty
const emptyTotals: CartMacros = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
};

let cartState: CartState = {
  items: [],
  lastAddedItem: null,
  lastAddedAt: null,
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

// calculates the cart totals
const computeTotals = (items: CartItem[]): CartMacros => {
  return items.reduce(
    (acc, item) => {
      acc.calories += (item.nutritionPerItem.calories ?? 0) * item.quantity;
      acc.protein += (item.nutritionPerItem.protein ?? 0) * item.quantity;
      acc.carbs += (item.nutritionPerItem.carbs ?? 0) * item.quantity;
      acc.totalFat += (item.nutritionPerItem.totalFat ?? 0) * item.quantity;

      return acc;
    },
    { ...emptyTotals },
  );
};

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
        lastAddedItem: item,
        lastAddedAt: Date.now(),
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
      lastAddedItem: updatedItem,
      lastAddedAt: Date.now(),
    };
  });
};

// remove item 
const removeItem = (id: string) => {
  setCartState((prev) => ({
    ...prev,
    items: prev.items.filter((item) => item.id !== id),
  }));
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
      lastAddedItem: options?.markAsJustAdded ? updatedItem : prev.lastAddedItem,
      lastAddedAt: options?.markAsJustAdded ? Date.now() : prev.lastAddedAt,
    };
  });
};

// empties the cart
const clearCart = () => {
  setCartState((prev) => ({
    ...prev,
    items: [],
  }));
};

// public api for the cart store for current cart data and functions to change cart
export const useCart = () => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const totals = useMemo(() => computeTotals(state.items), [state.items]);

  return {
    items: state.items,
    totals,
    lastAddedItem: state.lastAddedItem,
    lastAddedAt: state.lastAddedAt,
    addItem,
    removeItem,
    updateQuantity,
    updateItem,
    clearCart,
  };
};
