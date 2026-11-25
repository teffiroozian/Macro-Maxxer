import { ChevronRight } from "lucide-react";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export default function NativeRestaurantRow({ restaurant, count, onSelect }: { restaurant: RestaurantIndexEntry; count?: number; onSelect: (r: RestaurantIndexEntry) => void }) {
  const label = count === undefined ? "" : `${count} ${count === 1 ? "item" : "items"}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(restaurant)}
        aria-label={label ? `${restaurant.name}, ${label}` : restaurant.name}
        className="flex h-[72px] w-full cursor-pointer items-center gap-3.5 rounded-3xl border border-black/8 bg-surface-card pl-3.5 pr-4 text-left shadow-elev-2 transition-transform duration-[120ms] active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-hairline focus-ring"
      >
        <RestaurantLogoBadge src={restaurant.logo} alt="" fit="cover" className="!size-[46px] !border-black/[.06] !shadow-none" />
        <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-slate-900 dark:text-slate-50">{restaurant.name}</span>
        {label ? <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span> : null}
        <ChevronRight size={17} strokeWidth={2.4} className="shrink-0 text-slate-400" aria-hidden="true" />
      </button>
    </li>
  );
}
