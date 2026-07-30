"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type HeroRestaurantChipsProps = {
  restaurants: RestaurantIndexEntry[];
};

// Quick-search shortcuts beneath the hero search (moved out of
// RestaurantSearch so the hero can place the supporting paragraph between
// the search module and these chips). Selecting one routes straight to that
// restaurant — the same destination RestaurantSearch's own result rows use —
// so this never becomes a second, divergent selection path.
export default function HeroRestaurantChips({ restaurants }: HeroRestaurantChipsProps) {
  const router = useRouter();
  const quickSearchRestaurants = restaurants.filter((restaurant) => !restaurant.isComingSoon);

  if (quickSearchRestaurants.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-slate-500">Try:</span>
      {quickSearchRestaurants.map((restaurant) => (
        <button
          key={restaurant.id}
          type="button"
          onClick={() => router.push(`/restaurant/${restaurant.id}`, { scroll: true })}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 py-1 pl-1 pr-3 font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          {/* Fixed at 16px so it never grows the chip's own line-height
              (text-sm ≈ 20px + py-1's 4px top/bottom already sets the
              chip's height — the badge just has to stay under that). */}
          <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white">
            <Image src={restaurant.logo} alt="" fill sizes="16px" className="object-cover" />
          </span>
          {restaurant.name}
        </button>
      ))}
    </div>
  );
}
