import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import type { NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

export default function NativeFavoritesSection({ favorites, onSeeAll, onEdit }: {
  favorites: NativeRestaurantSummary[];
  onSeeAll: () => void;
  onEdit: () => void;
}) {
  if (!favorites.length) return (
    <section className="px-[18px] pb-2">
      <h2 className="flex h-11 items-center px-0.5 text-xl font-bold text-slate-900 dark:text-slate-50">Favorites</h2>
      <button type="button" onClick={onEdit} className="mt-1 block w-full cursor-pointer rounded-[28px] border border-black/8 bg-surface-card px-3 pb-[18px] pt-4 shadow-elev-2 active:bg-slate-50 dark:border-hairline dark:active:bg-surface-hover focus-ring">
        <span className="grid grid-cols-4 justify-items-center gap-2" aria-hidden="true">
          {[1, 0.75, 0.5, 0.3].map((opacity, index) => (
            <span key={opacity} style={{ opacity }} className="flex aspect-square w-full max-w-[68px] items-center justify-center rounded-full border-[1.5px] border-dashed border-slate-500 text-slate-500 dark:border-slate-400 dark:text-slate-400">
              {index === 0 ? <Plus size={22} strokeWidth={2} /> : null}
            </span>
          ))}
        </span>
        <span className="mt-3.5 block text-center text-[15px] font-semibold text-slate-600 dark:text-slate-300">Pick your favorite restaurants</span>
      </button>
    </section>
  );
  return (
    <section>
      <div className="flex items-center justify-between px-5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          <button type="button" onClick={onSeeAll} aria-label={`Favorites, see all ${favorites.length}`} className="flex h-11 cursor-pointer items-center gap-1.5 active:opacity-70 focus-ring">
            Favorites
            <span className="text-[15px] font-normal text-slate-500 dark:text-slate-400">{favorites.length}</span>
            <ChevronRight size={17} strokeWidth={2.4} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </button>
        </h2>
        <button type="button" onClick={onEdit} aria-label="Edit favorites" className="flex h-11 min-w-11 cursor-pointer items-center justify-end px-1 text-[15px] font-semibold text-accent-strong active:opacity-70 focus-ring">Edit</button>
      </div>
      <ul className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[18px] pb-3 pt-1 [scroll-padding:0_18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {favorites.map((restaurant) => (
          <li key={restaurant.id} className="w-[76px] shrink-0 snap-start">
            <Link href={`/restaurant/${restaurant.id}`} className="flex flex-col items-center gap-2 active:opacity-70 focus-ring">
              <span className="flex rounded-full shadow-elev-2"><NativeRestaurantLogo src={restaurant.logo} size={72} /></span>
              <span className="block w-full truncate text-center text-xs font-semibold text-slate-600 dark:text-slate-300">{restaurant.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
