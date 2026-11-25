"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  FAVORITES_KEY, HOME_COLLECTIONS_EVENT, ORDER_HISTORY_KEY, SAVED_ITEMS_KEY, SAVED_MEALS_KEY,
  moveFavorite, parseFavorites, parseOrderHistory, parseSavedItems, parseSavedMeals, serializeEntries, toggleFavorite,
  type PastOrder, type SavedItem, type SavedMeal,
} from "@/lib/native/homeCollections";

// Keeps toggles working for the session when storage is unavailable.
const fallback = new Map<string, string>();

function read(key: string) {
  try {
    return fallback.get(key) ?? window.localStorage.getItem(key) ?? null;
  } catch {
    return fallback.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    fallback.delete(key);
  } catch {
    fallback.set(key, value);
  }
  window.dispatchEvent(new Event(HOME_COLLECTIONS_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(HOME_COLLECTIONS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(HOME_COLLECTIONS_EVENT, onChange);
  };
}

function useStored(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => null);
}

export function useFavoriteRestaurants() {
  const raw = useStored(FAVORITES_KEY);
  const favorites = useMemo(() => parseFavorites(raw), [raw]);
  const update = (change: (current: string[]) => string[]) => {
    write(FAVORITES_KEY, JSON.stringify(change(parseFavorites(read(FAVORITES_KEY)))));
  };
  const toggle = (id: string) => update((current) => toggleFavorite(current, id));
  const move = (id: string, targetId: string) => update((current) => moveFavorite(current, id, targetId));
  return { favorites, toggle, move };
}

export function useSavedMeals() {
  const raw = useStored(SAVED_MEALS_KEY);
  return useMemo(() => parseSavedMeals(raw), [raw]);
}

export function useOrderHistory() {
  const raw = useStored(ORDER_HISTORY_KEY);
  return useMemo(() => parseOrderHistory(raw), [raw]);
}

export function useSavedLibrary() {
  const meals = useSavedMeals();
  const orders = useOrderHistory();
  const rawItems = useStored(SAVED_ITEMS_KEY);
  const items = useMemo(() => parseSavedItems(rawItems), [rawItems]);
  const updateMeals = useCallback((change: (current: SavedMeal[]) => SavedMeal[]) => {
    write(SAVED_MEALS_KEY, serializeEntries(change(parseSavedMeals(read(SAVED_MEALS_KEY)))));
  }, []);
  const updateItems = useCallback((change: (current: SavedItem[]) => SavedItem[]) => {
    write(SAVED_ITEMS_KEY, serializeEntries(change(parseSavedItems(read(SAVED_ITEMS_KEY)))));
  }, []);
  const updateOrders = useCallback((change: (current: PastOrder[]) => PastOrder[]) => {
    write(ORDER_HISTORY_KEY, serializeEntries(change(parseOrderHistory(read(ORDER_HISTORY_KEY)))));
  }, []);
  return { meals, items, orders, updateMeals, updateItems, updateOrders };
}

const noSubscription = () => () => {};

// False for the static HTML and the hydration pass, when nothing stored on the
// device can be read yet.
export const useStorageReady = () => useSyncExternalStore(noSubscription, () => true, () => false);
