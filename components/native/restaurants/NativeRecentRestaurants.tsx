"use client";
import { useEffect, useRef } from "react";
import type { NativeRecentRestaurantView } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRecentRestaurantCard from "./NativeRecentRestaurantCard";

export default function NativeRecentRestaurants({ recents }: { recents: NativeRecentRestaurantView[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const first = recents[0];
  const firstKey = first ? `${first.id}:${first.viewedAt}` : "";
  useEffect(() => { scroller.current?.scrollTo({ left: 0 }); }, [firstKey]);
  return (
    <section className="pt-3">
      <h2 className="flex h-11 items-center px-5 text-xl font-bold text-slate-900 dark:text-slate-50">Recently visited</h2>
      <div
        ref={scroller}
        role="list"
        className="-mb-3 flex snap-x snap-mandatory gap-[10px] overflow-x-auto px-[18px] pb-[18px] [scroll-padding:0_18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {recents.map((restaurant) => <NativeRecentRestaurantCard key={restaurant.id} restaurant={restaurant} />)}
      </div>
    </section>
  );
}
