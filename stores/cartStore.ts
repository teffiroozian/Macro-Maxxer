// CENTRAL PLACE FOR CART INFO

"use client";

import { useMemo, useSyncExternalStore } from "react";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import { CART_STORAGE_KEY, deserializeCartItems, serializeCartItems } from "@/lib/cart/persistence";
import type { CartItem, CartState } from "@/types/cart";
export type { CartItem, CartMacros, CartState } from "@/types/cart";

let cartState: CartState = {
  items: [],
  lastAddedItemId: null,
  lastAddedAt: null,
  lastAddedEventId: null,
  lastAddedPreviewDismissedEventId: null,
};

let hasHydratedFromStorage = false;

const persistCartItems = () => {
  if (typeof window === "undefined" || !hasHydratedFromStorage) return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCartItems(cartState.items));
  } catch {
    // Storage may be unavailable in private browsing or under a strict quota.
    // The in-memory cart should continue to work in that case.
  }
};

const hydrateCartFromStorage = () => {
  if (hasHydratedFromStorage) return;
  hasHydratedFromStorage = true;
  if (typeof window === "undefined") return;

  try {
    const serialized = window.localStorage.getItem(CART_STORAGE_KEY);
    if (serialized === null) return;
    const items = deserializeCartItems(serialized);
    if (items === null) return;

    cartState = {
      ...cartState,
      items,
      // Preview state is intentionally session-only. A restored cart should
      // not reopen the just-added drawer after a reload.
      lastAddedItemId: null,
      lastAddedAt: null,
      lastAddedEventId: null,
      lastAddedPreviewDismissedEventId: null,
    };
  } catch {
    // Leave the current in-memory state intact if storage cannot be read.
  }
};

// store all components listening to cart changes
const listeners = new Set<() => void>();

// tells all those components change has been made to cart
const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const onCartStorage = (event: StorageEvent) => {
  if (event.key !== CART_STORAGE_KEY) return;
  const items = event.newValue === null ? [] : deserializeCartItems(event.newValue);
  if (items === null) return;
  cartState = {
    ...cartState,
    items,
    lastAddedItemId: null,
    lastAddedAt: null,
    lastAddedEventId: null,
    lastAddedPreviewDismissedEventId: null,
  };
  notify();
};

// updates the cart when changes are made and calls notify
const getNextLastAddedEventId = (prev: CartState) => (prev.lastAddedEventId ?? 0) + 1;

const setCartState = (updater: (prev: CartState) => CartState) => {
  // A user action can happen before React installs the first subscription.
  // Read saved data first so the initial empty state can never overwrite it.
  hydrateCartFromStorage();
  cartState = updater(cartState);
  persistCartItems();
  notify();
};

// lets React components subscribe to the cart store
const subscribe = (listener: () => void) => {
  const isFirstListener = listeners.size === 0;
  listeners.add(listener);
  hydrateCartFromStorage();
  if (isFirstListener && typeof window !== "undefined") window.addEventListener("storage", onCartStorage);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onCartStorage);
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
const updateQuantity = (id: string, quantity: number, options?: { markAsJustAdded?: boolean }) => {
  if (quantity <= 0) {
    removeItem(id);
    return;
  }
  setCartState((prev) => {
    let matched = false;
    // if id matches, return a copy with new quantity
    const items = prev.items.map((item) => {
      if (item.id !== id) return item;
      matched = true;
      return { ...item, quantity };
    });

    if (!matched) {
      return { ...prev, items };
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
  clearCart,
  dismissLastAddedPreview,
  resetPersistenceForTests() {
    hasHydratedFromStorage = false;
  },
  hydrateCartFromStorage,
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
