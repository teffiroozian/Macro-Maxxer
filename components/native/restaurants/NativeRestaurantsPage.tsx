"use client";
import { useMemo } from "react";
import { useNativeRecentRestaurants, type NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRecentRestaurants from "./NativeRecentRestaurants";
import NativeRestaurantCard from "./NativeRestaurantCard";

export default function NativeRestaurantsPage({ restaurants }: { restaurants: NativeRestaurantSummary[] }) {
  const sorted = useMemo(
    () => [...restaurants].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
    [restaurants],
  );
  const recents = useNativeRecentRestaurants(restaurants);
  const hasRecents = recents.length > 0;
  return (
    <main
      className="native-top-level-page min-h-[var(--app-viewport-height)] bg-slate-50 px-[var(--safe-area-left,0px)] pt-[calc(var(--safe-area-top)+6px)] pb-[var(--native-nav-clearance)]"
    >
      <header className="flex flex-col gap-1.5 px-5 pt-2.5">
        <h1 className="font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900">Restaurants</h1>
        <p className="text-base text-slate-500">Browse supported restaurants</p>
      </header>
      {hasRecents ? (
        <>
          <NativeRecentRestaurants recents={recents} />
          <div className="mx-5 mt-[22px] h-px bg-slate-200" />
        </>
      ) : null}
      <div className={`flex justify-between px-5 pb-[14px] text-[13px] text-slate-400 ${hasRecents ? "pt-3" : "pt-6"}`}>
        <span>{sorted.length} {sorted.length === 1 ? "restaurant" : "restaurants"} available</span>
        <span>A–Z</span>
      </div>
      <ul aria-label="All restaurants" className="flex flex-col gap-[10px] px-[18px]">
        {sorted.map((restaurant) => <li key={restaurant.id}><NativeRestaurantCard restaurant={restaurant} /></li>)}
      </ul>
    </main>
  );
}
