import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

export default function NativeRestaurantCard({ restaurant }: { restaurant: NativeRestaurantSummary }) {
  const label = `${restaurant.itemCount} menu items`;
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      aria-label={`${restaurant.name}, ${label}`}
      className="flex h-24 items-center gap-4 rounded-[24px] border border-black/8 bg-white px-[18px] transition-[transform,background-color] duration-120 active:scale-[0.98] active:bg-slate-50 motion-reduce:active:scale-100 focus-ring"
    >
      <NativeRestaurantLogo src={restaurant.logo} size={58} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-[7px]">
        <span className="block w-full truncate text-[19px] font-bold tracking-[-0.01em] text-slate-900">{restaurant.name}</span>
        <span className="inline-flex h-6 items-center rounded-xl bg-slate-100 px-[9px] text-[12.5px] font-semibold text-slate-600">{label}</span>
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white" aria-hidden="true">
        <ArrowRight className="size-4" strokeWidth={2.6} />
      </span>
    </Link>
  );
}
