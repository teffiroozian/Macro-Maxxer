"use client";
import { X } from "lucide-react";
import type { FullMenuNutritionFilters } from "@/lib/native/fullMenu";
import { ALL_SCOPE_ITEM_LIMIT, rankingNote, searchFilterChips, type NativeSearchScope, type SearchRanking } from "@/lib/native/searchResults";
import { nativeResultCount, nativeResultKey } from "@/lib/search/nativeSearchPresentation";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import type { SearchResult } from "@/types/search";
import NativeMenuItemCard from "./search/NativeMenuItemCard";
import NativeNoResults from "./search/NativeNoResults";
import NativeRestaurantRow from "./search/NativeRestaurantRow";
import type { NativeMenuLayout } from "./search/NativeLayoutToggle";

const TRY_ANOTHER = "Check the spelling or try a simpler word, like “salad” or “chicken”.";

function Status({ text }: { text: string }) {
  return <p aria-live="polite" className="flex min-h-11 items-center px-0.5 text-sm text-slate-600 dark:text-slate-300">{text}</p>;
}

function Skeleton({ layout, count }: { layout: NativeMenuLayout; count: number }) {
  const list = layout === "list";
  return (
    <div aria-hidden="true" className={`grid ${list ? "grid-cols-1 gap-2.5" : "grid-cols-2 gap-3"}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-3xl border border-black/8 bg-surface-card p-3 motion-reduce:animate-none dark:border-hairline ${list ? "flex gap-3.5" : ""}`}>
          <div className={`bg-slate-100 dark:bg-surface-hover ${list ? "size-[92px] rounded-[18px]" : "h-[108px] rounded-2xl"}`} />
          <div className={`h-[92px] flex-1 rounded-2xl bg-slate-100 dark:bg-surface-hover ${list ? "" : "mt-3"}`} />
        </div>
      ))}
    </div>
  );
}

export default function NativeSearchResults({ query, pending, loadingItems, scope, restaurants, items, totalItems, index, layout, ranking, filters, onFilters, onScope, onSelect, onBrowse, onClear }: {
  query: string;
  // The menu item results have not caught up with the typed query yet.
  pending: boolean;
  loadingItems: boolean;
  scope: NativeSearchScope;
  restaurants: RestaurantIndexEntry[];
  // Ranked and filtered for the Menu Items scope, plain relevance for All.
  items: ContentSearchResult[];
  totalItems: number;
  index: SearchIndexEntry[] | null;
  layout: NativeMenuLayout;
  ranking: SearchRanking;
  filters: FullMenuNutritionFilters;
  onFilters: (filters: FullMenuNutritionFilters) => void;
  onScope: (scope: NativeSearchScope) => void;
  onSelect: (result: SearchResult) => void;
  onBrowse: () => void;
  onClear: () => void;
}) {
  const shownQuery = query.trim().slice(0, 40);
  const waiting = pending || loadingItems;
  const browse = { label: "Browse restaurants", onClick: onBrowse };
  const clear = { label: "Clear search", onClick: onClear };
  const instead = (count: number, kind: "restaurants" | "menu-items") => `${nativeResultCount(count, kind)} ${count === 1 ? "matches" : "match"} instead.`;
  const restaurantCards = (
    <ul className="flex flex-col gap-2.5">
      {restaurants.map((restaurant) => {
        const entry = index?.find((e) => e.restaurant.id === restaurant.id);
        return <NativeRestaurantRow key={restaurant.id} restaurant={restaurant} count={entry ? entry.items.length + entry.entreeBuilders.length : undefined} onSelect={(selected) => onSelect({ kind: "restaurant", restaurant: selected })} />;
      })}
    </ul>
  );

  if (scope === "restaurants") {
    if (restaurants.length) return <><Status text={nativeResultCount(restaurants.length, "restaurants")} />{restaurantCards}</>;
    if (waiting) return <Status text="Searching…" />;
    return totalItems
      ? <NativeNoResults title={`No restaurants for “${shownQuery}”`} detail={instead(totalItems, "menu-items")} primary={{ label: "Show menu items", onClick: () => onScope("menu-items") }} secondary={browse} />
      : <NativeNoResults title={`No results for “${shownQuery}”`} detail={TRY_ANOTHER} primary={browse} secondary={clear} />;
  }

  if (scope === "menu-items") {
    if (!totalItems) {
      if (waiting) return <><Status text="Searching…" /><Skeleton layout={layout} count={4} /></>;
      return restaurants.length
        ? <NativeNoResults title={`No menu items for “${shownQuery}”`} detail={instead(restaurants.length, "restaurants")} primary={{ label: "Show restaurants", onClick: () => onScope("restaurants") }} secondary={clear} />
        : <NativeNoResults title={`No results for “${shownQuery}”`} detail={TRY_ANOTHER} primary={browse} secondary={clear} />;
    }
    const chips = searchFilterChips(filters);
    return (
      <>
        <div className="flex min-h-11 flex-wrap items-center gap-2 px-0.5 py-1">
          <p aria-live="polite" className="mr-auto text-sm text-slate-600 dark:text-slate-300">{chips.length ? <>{items.length} of {totalItems}<span className="sr-only"> menu items</span></> : nativeResultCount(totalItems, "menu-items")}</p>
          {chips.map((chip) => (
            <button key={chip.key} type="button" onClick={() => onFilters({ ...filters, [chip.key]: undefined })} aria-label={`Remove filter: ${chip.label}`} className="relative flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-strong before:absolute before:-inset-y-1 before:inset-x-0 focus-ring">{chip.label}<X size={13} strokeWidth={3} aria-hidden="true" /></button>
          ))}
        </div>
        {items.length ? (
          <div className={`grid ${layout === "grid" ? "grid-cols-2 gap-3" : "grid-cols-1 gap-2.5"}`}>
            {items.map((result) => <NativeMenuItemCard key={nativeResultKey(result)} result={result} layout={layout} note={rankingNote(result, ranking)} rankedBy={ranking?.metric} onSelect={onSelect} />)}
          </div>
        ) : <NativeNoResults title="No items fit these filters" detail={`Loosen or clear them to see ${nativeResultCount(totalItems, "menu-items")} for “${shownQuery}”.`} primary={{ label: "Clear filters", onClick: () => onFilters({}) }} />}
      </>
    );
  }

  if (!restaurants.length && !totalItems) {
    return waiting
      ? <><Status text="Searching…" /><Skeleton layout="list" count={3} /></>
      : <NativeNoResults title={`No results for “${shownQuery}”`} detail={TRY_ANOTHER} primary={browse} secondary={clear} />;
  }
  const shown = items.slice(0, ALL_SCOPE_ITEM_LIMIT);
  return (
    <>
      <p aria-live="polite" className="sr-only">{nativeResultCount(restaurants.length, "restaurants")}, {nativeResultCount(totalItems, "menu-items")}</p>
      {restaurants.length ? (
        <section className="mb-3.5">
          <h2 className="flex h-11 items-center px-0.5 text-xl font-bold">Restaurants</h2>
          {restaurantCards}
        </section>
      ) : null}
      {totalItems || loadingItems ? (
        <section>
          <div className="flex h-11 items-center justify-between px-0.5">
            <h2 className="text-xl font-bold">Menu items</h2>
            {totalItems > shown.length ? <button type="button" onClick={() => onScope("menu-items")} aria-label={`See all ${totalItems} menu items`} className="-mr-1 flex h-11 cursor-pointer items-center px-1.5 text-[15px] font-semibold text-accent-strong focus-ring">See all {totalItems}</button> : null}
          </div>
          {shown.length ? (
            <div className="grid grid-cols-1 gap-2.5">
              {shown.map((result) => <NativeMenuItemCard key={nativeResultKey(result)} result={result} layout="list" onSelect={onSelect} />)}
            </div>
          ) : <Skeleton layout="list" count={3} />}
        </section>
      ) : null}
    </>
  );
}
