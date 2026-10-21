"use client";
import type { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";
import type { SearchResult } from "@/types/search";
import type { useNativeRecentSearches } from "@/lib/search/useNativeRecentSearches";
import { nativeResultCount, nativeResultKey } from "@/lib/search/nativeSearchPresentation";
import NativeRecentList from "./search/NativeRecentList";
import NativeQuickPicks from "./search/NativeQuickPicks";
import NativeRestaurantRow from "./search/NativeRestaurantRow";
import NativeLayoutToggle, { type NativeMenuLayout } from "./search/NativeLayoutToggle";
import NativeMenuItemCard from "./search/NativeMenuItemCard";
import NativeSearchEmpty from "./search/NativeSearchEmpty";
export default function NativeSearchResults({ state, history, layout, onLayout, onSelect, onBrowse }: {
  state: ReturnType<typeof useGlobalSearchState>;
  history: ReturnType<typeof useNativeRecentSearches>;
  layout: NativeMenuLayout;
  onLayout: (layout: NativeMenuLayout) => void;
  onSelect: (result: SearchResult) => void;
  onBrowse: () => void;
}) {
  const menu = state.scope === "menu-items";
  const loading = menu && !state.searchIndex;
  const count = menu ? state.menuItemResults.length : state.restaurantResults.length;
  return <div id="native-search-results" role="tabpanel" aria-labelledby={`native-scope-${state.scope}`} tabIndex={0} className="focus-ring">
    {state.isEmptyQuery ? <><NativeRecentList results={history.results} onSelect={onSelect} onRemove={history.remove} onClear={history.clearAll} /><NativeQuickPicks restaurants={history.popularRestaurants} onSelect={restaurant => onSelect({ kind: "restaurant", restaurant })} onBrowse={onBrowse} /></> : !loading && count === 0 ? <NativeSearchEmpty query={state.query} scope={state.scope} onBrowse={onBrowse} onScopeChange={state.handleScopeChange} /> : <>
      <div className="mx-5 mb-3 mt-5 flex min-h-8 items-center justify-between"><p aria-live="polite" className="text-[13px] font-semibold text-slate-500">{loading ? "Searching…" : nativeResultCount(count,state.scope)}</p>{menu ? <NativeLayoutToggle layout={layout} onChange={onLayout} /> : null}</div>
      {menu ? <div className={`grid gap-2.5 px-[18px] ${layout === "grid" ? "grid-cols-2" : "grid-cols-1"}`} aria-busy={loading}>{loading ? Array.from({length:4},(_,i) => <div key={i} aria-hidden="true" className={`animate-pulse rounded-[20px] border border-black/8 bg-white p-2 motion-reduce:animate-none ${layout === "list" ? "flex gap-3" : ""}`}><div className={`rounded-[14px] bg-slate-100 ${layout === "list" ? "size-[92px]" : "aspect-[1.35]"}`} /><div className="mt-3 h-16 flex-1 rounded-xl bg-slate-100" /></div>) : state.menuItemResults.map(result => <NativeMenuItemCard key={nativeResultKey(result)} result={result} layout={layout} onSelect={onSelect} />)}</div> : <ul className="ml-5">{state.restaurantResults.map(restaurant => { const entry = state.searchIndex?.find(e => e.restaurant.id === restaurant.id); return <NativeRestaurantRow key={restaurant.id} restaurant={restaurant} count={entry ? entry.items.length + entry.entreeBuilders.length : undefined} onSelect={restaurant => onSelect({ kind: "restaurant", restaurant })} />; })}</ul>}
    </>}
  </div>;
}
