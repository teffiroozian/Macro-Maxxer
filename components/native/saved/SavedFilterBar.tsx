import { ArrowDownUp } from "lucide-react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import { ALL_RESTAURANTS, type SavedSort } from "@/lib/native/savedLibrary";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export default function SavedFilterBar({ restaurants, restaurantId, sort, onRestaurant, onSort }: {
  restaurants: RestaurantIndexEntry[];
  restaurantId: string;
  sort: SavedSort;
  onRestaurant: (id: string) => void;
  onSort: (sort: SavedSort) => void;
}) {
  const pill = (on: boolean) => `relative flex h-[38px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full bg-surface-card text-[15px] before:absolute before:-inset-y-1 before:inset-x-0 focus-ring ${on ? "font-bold shadow-[inset_0_0_0_2px_var(--product-accent)]" : "font-medium shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] dark:shadow-[inset_0_0_0_1px_var(--border-hairline)]"}`;
  const newest = sort === "newest";
  return (
    <div className="flex h-14 items-center">
      <div role="group" aria-label="Filter by restaurant" className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1.5 pl-5 pr-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-pressed={restaurantId === ALL_RESTAURANTS} onClick={() => onRestaurant(ALL_RESTAURANTS)} className={`${pill(restaurantId === ALL_RESTAURANTS)} px-[15px]`}>All</button>
        {restaurants.map((restaurant) => (
          <button key={restaurant.id} type="button" aria-pressed={restaurantId === restaurant.id} onClick={() => onRestaurant(restaurant.id)} className={`${pill(restaurantId === restaurant.id)} pl-2 pr-[13px]`}>
            <NativeRestaurantLogo src={restaurant.logo} size={22} />
            {restaurant.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={newest ? "Newest first. Tap for oldest first" : "Oldest first. Tap for newest first"}
        onClick={() => onSort(newest ? "oldest" : "newest")}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-1 pl-2 pr-5 text-[15px] font-semibold text-accent-strong active:opacity-70 focus-ring"
      >
        {newest ? "Newest" : "Oldest"}
        <ArrowDownUp size={16} strokeWidth={2.3} aria-hidden="true" />
      </button>
    </div>
  );
}
