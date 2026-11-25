"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Search, X } from "lucide-react";
import { useFavoriteRestaurants } from "@/hooks/useHomeCollections";
import { groupByLetter, matchRestaurants, sortRestaurants } from "@/lib/native/restaurantDirectory";
import { useNativeRecentRestaurants, type NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeFavoritesSection from "./NativeFavoritesSection";
import NativeFavoritesSheet, { type FavoritesSheetMode } from "./NativeFavoritesSheet";
import NativeRecentRestaurants from "./NativeRecentRestaurants";
import NativeRestaurantCard from "./NativeRestaurantCard";

export default function NativeRestaurantsPage({ restaurants }: { restaurants: NativeRestaurantSummary[] }) {
  const sorted = useMemo(() => sortRestaurants(restaurants), [restaurants]);
  const recents = useNativeRecentRestaurants(restaurants);
  const { favorites, toggle, move } = useFavoriteRestaurants();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<FavoritesSheetMode | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const picks = favorites.flatMap((id) => sorted.find((restaurant) => restaurant.id === id) ?? []);
  const others = sorted.filter((restaurant) => !favorites.includes(restaurant.id));
  const filtered = searching && query.trim() !== "";
  const matches = useMemo(() => (filtered ? matchRestaurants(sorted, query) : sorted), [filtered, sorted, query]);
  const groups = useMemo(() => (filtered ? [{ letter: "", restaurants: matches }] : groupByLetter(matches)), [filtered, matches]);

  // iOS only opens the keyboard when focus lands inside the tap itself.
  const openSearch = () => {
    flushSync(() => setSearching(true));
    window.scrollTo({ top: 0, behavior: "instant" });
    input.current?.focus({ preventScroll: true });
  };
  const closeSearch = () => {
    flushSync(() => { setSearching(false); setQuery(""); });
    window.scrollTo({ top: 0, behavior: "instant" });
    searchButton.current?.focus({ preventScroll: true });
  };
  const search = (value: string) => {
    setQuery(value);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const clear = () => {
    search("");
    input.current?.focus({ preventScroll: true });
  };

  return (
    <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] text-slate-900 dark:bg-app-background dark:text-slate-50">
      <header className="sticky top-0 z-[var(--z-sticky)] bg-slate-50 pb-2 pt-[calc(var(--safe-area-top)+6px)] dark:bg-app-background">
        <h1 className={searching ? "sr-only" : "float-left flex h-[52px] items-center px-5 font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em]"}>Restaurants</h1>
        {searching ? (
          <div role="search" className="flex items-center px-[18px]">
            <label htmlFor="native-restaurant-filter" className="flex h-[52px] min-w-0 flex-1 cursor-text items-center gap-3 rounded-full bg-surface-card pl-[18px] pr-1.5 shadow-[0_0_0_2px_var(--product-accent),var(--elev-2)]">
              <Search size={20} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden="true" />
              <input
                id="native-restaurant-filter"
                ref={input}
                type="search"
                enterKeyHint="search"
                aria-label="Search restaurants"
                placeholder="Search restaurants"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={query}
                onChange={(event) => search(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
                  if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
                }}
                className="native-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-slate-900 caret-accent outline-none placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400"
              />
              {query ? <button type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); clear(); }} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring"><span className="flex size-[22px] items-center justify-center rounded-full bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-950"><X size={12} strokeWidth={3.4} aria-hidden="true" /></span></button> : null}
            </label>
            <button type="button" onClick={closeSearch} className="flex h-11 shrink-0 cursor-pointer items-center pl-3.5 text-base font-semibold text-accent-strong focus-ring">Cancel</button>
          </div>
        ) : (
          <div className="flex h-[52px] items-center justify-end px-5">
            <button ref={searchButton} type="button" aria-label="Search restaurants" onClick={openSearch} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-black/8 bg-surface-card shadow-elev-2 active:bg-slate-100 dark:border-hairline dark:active:bg-surface-hover focus-ring">
              <Search size={20} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {searching ? null : (
        <div className="pt-1">
          <NativeFavoritesSection favorites={picks} onSeeAll={() => setSheet("all")} onEdit={() => setSheet("edit")} />
          {recents.length ? <NativeRecentRestaurants recents={recents} /> : null}
        </div>
      )}

      {matches.length ? (
        <section className={searching ? "" : "pt-3"} aria-label={filtered ? "Results" : "All restaurants"} onTouchMove={() => input.current?.blur()}>
          <div className="flex h-11 items-center justify-between px-5">
            <h2 className="text-xl font-bold">{filtered ? "Results" : "All restaurants"}</h2>
            <span role={searching ? "status" : undefined} className="text-sm text-slate-500 dark:text-slate-400">{filtered ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}` : `${sorted.length}, A–Z`}</span>
          </div>
          {groups.map((group) => (
            <div key={group.letter}>
              {group.letter ? <h3 className="flex h-9 items-end px-6 pb-1 font-heading text-sm font-bold text-slate-500 dark:text-slate-400">{group.letter}</h3> : null}
              <ul className="flex flex-col gap-2.5 px-[18px] py-1">
                {group.restaurants.map((restaurant) => <li key={restaurant.id}><NativeRestaurantCard restaurant={restaurant} favorite={favorites.includes(restaurant.id)} onToggleFavorite={() => toggle(restaurant.id)} /></li>)}
              </ul>
            </div>
          ))}
        </section>
      ) : filtered ? (
        <div role="status" className="px-10 pt-12 text-center">
          <h2 className="text-xl font-bold [overflow-wrap:anywhere]">No restaurants match “{query.trim()}”</h2>
          <p className="mt-1.5 text-base text-slate-600 dark:text-slate-300">Check the spelling, or look for menu items in Search.</p>
          <button type="button" onClick={clear} className="mt-2 h-11 cursor-pointer px-3 text-base font-semibold text-accent-strong focus-ring">Clear search</button>
        </div>
      ) : null}

      {sheet ? <NativeFavoritesSheet mode={sheet} favorites={picks} others={others} onMode={setSheet} onToggle={toggle} onMove={move} onClose={closeSheet} /> : null}
    </main>
  );
}
