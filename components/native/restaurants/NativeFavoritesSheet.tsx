"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import type { NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeFavoritesReorderList from "./NativeFavoritesReorderList";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

export type FavoritesSheetMode = "all" | "edit";

const textButton = "flex h-11 min-w-11 cursor-pointer items-center justify-center px-1 text-base text-accent-strong active:opacity-70 focus-ring";
const listCard = "rounded-[24px] border border-black/8 bg-surface-card shadow-elev-2 dark:border-hairline";

export default function NativeFavoritesSheet({ mode, favorites, others, onMode, onToggle, onMove, onClose }: {
  mode: FavoritesSheetMode;
  favorites: NativeRestaurantSummary[];
  others: NativeRestaurantSummary[];
  onMode: (mode: FavoritesSheetMode) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, targetId: string) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  const doneRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = overflow; };
  }, []);
  const editing = mode === "edit";
  return (
    <Dialog
      onClose={onClose}
      titleId="native-favorites-title"
      initialFocusRef={doneRef}
      presentation="bottom-sheet"
      panelClassName={`!flex h-[92%] max-w-2xl flex-col !rounded-t-[28px] !bg-slate-50 !p-0 text-slate-900 dark:!bg-app-background dark:text-slate-50 transition-transform duration-[250ms] ease-out motion-reduce:transition-none ${shown ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="flex h-5 shrink-0 items-end justify-center" aria-hidden="true"><span className="h-[5px] w-9 rounded-full bg-slate-300 dark:bg-slate-600" /></div>
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
        <h2 id="native-favorites-title" className="font-heading text-lg font-bold tracking-[-0.02em]">{editing ? "Edit favorites" : "Favorites"}</h2>
        <div className="flex gap-2">
          {editing ? null : <button type="button" onClick={() => onMode("edit")} className={`${textButton} font-semibold`}>Edit</button>}
          <button ref={doneRef} type="button" onClick={onClose} className={`${textButton} font-bold`}>Done</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,var(--safe-area-bottom))]">
        {editing ? (
          <>
            {favorites.length ? (
              <>
                <p id="native-favorites-hint" className="text-[15px] leading-5 text-slate-600 dark:text-slate-300">Drag to reorder. Home uses this order.</p>
                <NativeFavoritesReorderList
                  favorites={favorites}
                  className={`mt-3.5 ${listCard}`}
                  onMove={onMove}
                  renderRemove={(restaurant) => (
                    <button type="button" onClick={() => onToggle(restaurant.id)} aria-label={`Remove ${restaurant.name} from favorites`} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring">
                      <span className="flex size-6 items-center justify-center rounded-full bg-error text-white"><Minus size={14} strokeWidth={3.4} aria-hidden="true" /></span>
                    </button>
                  )}
                />
              </>
            ) : null}
            {others.length ? (
              <>
                <h3 className={`text-lg font-bold ${favorites.length ? "mt-[22px]" : "mt-1"}`}>{favorites.length ? "Add a restaurant" : "Pick your favorites"}</h3>
                <ul className={`mt-3 overflow-hidden ${listCard}`}>
                  {others.map((restaurant, index) => (
                    <li key={restaurant.id} className={index ? "border-t border-slate-200 dark:border-divider" : ""}>
                      <button type="button" onClick={() => onToggle(restaurant.id)} aria-label={`Add ${restaurant.name} to favorites`} className="flex h-14 w-full cursor-pointer items-center px-1.5 text-left active:bg-slate-50 dark:active:bg-surface-hover focus-ring">
                        <span className="flex size-11 shrink-0 items-center justify-center"><span className="flex size-6 items-center justify-center rounded-full bg-accent-strong text-white dark:bg-accent dark:text-slate-950"><Plus size={14} strokeWidth={3.4} aria-hidden="true" /></span></span>
                        <NativeRestaurantLogo src={restaurant.logo} size={40} />
                        <span className="min-w-0 flex-1 truncate px-3 text-base font-semibold">{restaurant.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <ul className="grid grid-cols-3 gap-x-2.5 gap-y-6 pt-3.5">
            {favorites.map((restaurant) => (
              <li key={restaurant.id} className="min-w-0">
                <Link href={`/restaurant/${restaurant.id}`} className="flex flex-col items-center active:opacity-70 focus-ring">
                  <span className="flex rounded-full shadow-elev-2"><NativeRestaurantLogo src={restaurant.logo} size={72} /></span>
                  <span className="mt-[9px] block w-full truncate text-center text-sm font-semibold">{restaurant.name}</span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">{restaurant.itemCount} items</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
