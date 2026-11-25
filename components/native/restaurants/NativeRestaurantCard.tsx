import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import type { NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

export default function NativeRestaurantCard({ restaurant, favorite = false, onToggleFavorite }: {
  restaurant: NativeRestaurantSummary;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <div className="relative">
      <Link
        href={`/restaurant/${restaurant.id}`}
        aria-label={restaurant.name}
        className="flex h-[68px] items-center gap-3 rounded-[24px] border border-black/8 bg-surface-card pl-3 pr-4 shadow-elev-2 transition-[transform,background-color] duration-120 active:scale-[0.98] active:bg-slate-50 motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-hairline dark:active:bg-surface-hover focus-ring"
      >
        <NativeRestaurantLogo src={restaurant.logo} size={44} />
        <span className={`min-w-0 flex-1 truncate text-[17px] font-bold text-slate-900 dark:text-slate-50 ${onToggleFavorite ? "pr-11" : ""}`}>{restaurant.name}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white dark:bg-accent dark:text-slate-950" aria-hidden="true">
          <ArrowRight className="size-4" strokeWidth={2.6} />
        </span>
      </Link>
      {onToggleFavorite ? (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${restaurant.name} from favorites` : `Add ${restaurant.name} to favorites`}
          className="absolute right-[60px] top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-accent-strong active:bg-slate-100 dark:active:bg-surface-hover focus-ring"
        >
          <Heart size={21} strokeWidth={2.2} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
