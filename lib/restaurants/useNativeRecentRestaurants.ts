"use client";
import { useEffect, useState } from "react";
import { readNativeRecentRestaurants, type NativeRecentRestaurant } from "./nativeRecentRestaurants";

export type NativeRestaurantSummary = { id: string; name: string; logo: string; itemCount: number };
export type NativeRecentRestaurantView = NativeRestaurantSummary & { viewedAt: number | null };

export function useNativeRecentRestaurants(restaurants: NativeRestaurantSummary[]) {
  const [recents, setRecents] = useState<NativeRecentRestaurant[]>([]);
  useEffect(() => {
    const update = () => setRecents(readNativeRecentRestaurants());
    const timer = window.setTimeout(update, 0);
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    window.addEventListener("storage", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("storage", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return recents.flatMap((entry): NativeRecentRestaurantView[] => {
    const restaurant = restaurants.find((r) => r.id === entry.id);
    return restaurant ? [{ ...restaurant, viewedAt: entry.viewedAt }] : [];
  });
}
