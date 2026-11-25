import Link from "next/link";
import type { NativeRecentRestaurantView } from "@/lib/restaurants/useNativeRecentRestaurants";
import { formatViewedAgo } from "@/lib/restaurants/formatViewedAgo";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

export default function NativeRecentRestaurantCard({ restaurant }: { restaurant: NativeRecentRestaurantView }) {
  const time = restaurant.viewedAt === null ? null : formatViewedAgo(restaurant.viewedAt);
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      role="listitem"
      aria-label={time ? `${restaurant.name}, viewed ${time}` : restaurant.name}
      className="flex w-[280px] flex-none snap-start items-center gap-3 rounded-[22px] border border-black/8 bg-surface-card py-[14px] pl-[14px] pr-[18px] shadow-elev-2 transition-[transform,background-color] duration-120 active:scale-[0.98] active:bg-slate-50 motion-reduce:active:scale-100 dark:border-hairline dark:active:bg-surface-hover focus-ring"
    >
      <NativeRestaurantLogo src={restaurant.logo} size={44} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="block truncate text-base font-bold text-slate-900 dark:text-slate-50">{restaurant.name}</span>
        {time ? <span className="text-[13px] text-slate-500 dark:text-slate-400">{time}</span> : null}
      </span>
      <svg width="8" height="14" viewBox="0 0 9 15" fill="none" aria-hidden="true" className="shrink-0">
        <path d="m1.5 1.5 6 6-6 6" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
