"use client";
import { useEffect, useState } from "react";
import type { SearchResult } from "@/types/search";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import type { SearchIndexEntry } from "./searchIndex";
import { useRecentAndPopularRestaurants } from "./useRecentAndPopularRestaurants";
import { useRecentMenuItems } from "./useRecentMenuItems";
import { readNativeRecents, persistNativeRecents, addNativeRecent, removeNativeRecent, clearNativeRecentStorage, resolveNativeRecent, toNativeRecentRef, type NativeRecentRef } from "./nativeRecentSearches";
export function useNativeRecentSearches(restaurants: RestaurantIndexEntry[], index: SearchIndexEntry[] | null) {
  const [refs, setRefs] = useState<NativeRecentRef[]>([]);
  const discovery = useRecentAndPopularRestaurants(restaurants);
  const menuHistory = useRecentMenuItems(index);
  useEffect(() => {
    const update = () => setRefs(readNativeRecents());
    const timer = window.setTimeout(update, 0);
    window.addEventListener("storage", update);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", update); };
  }, []);
  const add = (result: SearchResult) => {
    const next = addNativeRecent(readNativeRecents(), toNativeRecentRef(result));
    persistNativeRecents(next); setRefs(next);
  };
  const remove = (result: SearchResult) => {
    const next = removeNativeRecent(refs, toNativeRecentRef(result));
    persistNativeRecents(next); setRefs(next);
    if (result.kind === "restaurant") discovery.removeRecent(result.restaurant.id);
    else menuHistory.removeRecent(result);
  };
  const clearAll = () => {
    clearNativeRecentStorage(); setRefs([]);
    discovery.clearAll(); menuHistory.clearAll();
  };
  return { results: refs.flatMap(ref => resolveNativeRecent(ref, restaurants, index) ?? []), add, remove, clearAll, popularRestaurants: discovery.popularRestaurants };
}
