"use client";

import { useMemo, useSyncExternalStore } from "react";

export type CartMacros = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
};

export type CartNutrition = {
  calories: number;
  totalFat: number;
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  carbs: number;
  fiber?: number;
  sugars?: number;
  protein: number;
};

export type CartItem = {
  id: string;
  restaurantId: string;
  itemId: string;
  name: string;
  image?: string;
  variantId?: string;
  variantLabel?: string;
  optionsLabel?: string;
  customizations?: string[];
  quantity: number;
  macrosPerItem: CartMacros;
  nutritionPerItem?: CartNutrition;
  buildConfiguration?: {
    selectedEntree: string | null;
    selectedIngredientItems: Record<
      string,
      {
        quantity: number;
      }
    >;
    selectedIngredientVariantIds: Record<string, string>;
    proteinPortionMode: "normal" | "double";
    splitPortionModeById: Record<string, "light" | "normal" | "extra">;
    selectedTacoShell: "crispy" | "soft";
    selectedTacoCount: 3 | 1;
    selectedKidsMeal: "build-your-own" | "quesadilla";
  };
};

type CartState = {
  items: CartItem[];
  lastAddedItem: CartItem | null;
  lastAddedAt: number | null;
};

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

const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const setCartState = (updater: (prev: CartState) => CartState) => {
  cartState = updater(cartState);
  notify();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cartState;

const computeTotals = (items: CartItem[]): CartMacros => {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.macrosPerItem.calories * item.quantity;
      acc.protein += item.macrosPerItem.protein * item.quantity;
      acc.carbs += item.macrosPerItem.carbs * item.quantity;
      acc.totalFat += item.macrosPerItem.totalFat * item.quantity;

      return acc;
    },
    { ...emptyTotals },
  );
};

export const cartSelectors = {
  totals: (state: CartState) => computeTotals(state.items),
};

const addItem = (item: CartItem) => {
  setCartState((prev) => {
    const existingIndex = prev.items.findIndex((cartItem) => cartItem.id === item.id);

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

const removeItem = (id: string) => {
  setCartState((prev) => ({
    ...prev,
    items: prev.items.filter((item) => item.id !== id),
  }));
};

const updateQuantity = (id: string, quantity: number) => {
  if (quantity <= 0) {
    removeItem(id);
    return;
  }

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

const updateItem = (
  id: string,
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

const clearCart = () => {
  setCartState((prev) => ({
    ...prev,
    items: [],
  }));
};

export const useCart = () => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const totals = useMemo(() => cartSelectors.totals(state), [state]);

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
