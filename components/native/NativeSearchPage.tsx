"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { countNutritionFilters, type FullMenuNutritionFilters } from "@/lib/native/fullMenu";
import { filterSearchResults, rankSearchResults, type NativeSearchScope, type SearchRanking } from "@/lib/native/searchResults";
import { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import { useRecentQueries } from "@/lib/search/useRecentQueries";
import { clearQueries, recordQuery, removeQuery } from "@/lib/search/recentQueries";
import { readNativeLayout, NATIVE_LAYOUT_KEY } from "@/lib/search/nativeSearchPresentation";
import type { SearchResult } from "@/types/search";
import NativeFiltersSheet from "./restaurant/NativeFiltersSheet";
import type { NativeMenuLayout } from "./search/NativeLayoutToggle";
import NativeRecentQueries from "./search/NativeRecentQueries";
import NativeSearchGuide from "./search/NativeSearchGuide";
import NativeSearchMenuControls from "./search/NativeSearchMenuControls";
import NativeSearchScopeTabs from "./search/NativeSearchScopeTabs";
import NativeSearchResults from "./NativeSearchResults";

// Keep how the results are narrowed alongside the shared query across route
// remounts, so coming back from an item returns to the same list.
type ResultView = { scope: NativeSearchScope; ranking: SearchRanking; filters: FullMenuNutritionFilters };
const DEFAULT_VIEW: ResultView = { scope: "all", ranking: null, filters: {} };
let lastView = DEFAULT_VIEW;
let lastAppliedQueryParam: string | null = null;

// The shared search knows two scopes. All reports as menu items; restaurant
// results are computed in either.
const sharedScope = (scope: NativeSearchScope) => (scope === "restaurants" ? "restaurants" : "menu-items");

export default function NativeSearchPage() {
  const state = useGlobalSearchState();
  const context = useGlobalSearch();
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const params = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const filtersButton = useRef<HTMLButtonElement>(null);
  const resettingScroll = useRef(false);
  // Menu items stay available in every scope, for counts and instant narrowing.
  const { searchIndex, results } = useMenuItemSearch(state.query, { enabled: true });
  // Matches useMenuItemSearch's own debounce, so "no results" never flashes
  // while the item results are still catching up with the typed query.
  const pending = useDebouncedValue(state.query, 150) !== state.query;
  const recents = useRecentQueries();
  const [view, setViewState] = useState<ResultView>(() => (state.isEmptyQuery ? DEFAULT_VIEW : lastView));
  const [layout, setLayout] = useState<NativeMenuLayout>("grid");
  const [focused, setFocused] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const queryParam = params.get("q");
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);

  const setView = (next: ResultView) => {
    lastView = next;
    setViewState(next);
    state.handleScopeChange(sharedScope(next.scope));
  };
  useEffect(() => {
    const current = latest.current;
    if (queryParam && (queryParam !== lastAppliedQueryParam || !current.query)) {
      current.handleInputChange(queryParam);
      lastView = DEFAULT_VIEW;
      setViewState(DEFAULT_VIEW);
    } else if (!current.query.trim()) {
      lastView = DEFAULT_VIEW;
    }
    lastAppliedQueryParam = queryParam;
    current.handleScopeChange(sharedScope(lastView.scope));
  }, [queryParam]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLayout(readNativeLayout()), 0);
    let refocusing = false;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const focusAfterScroll = () => {
      window.clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        refocusing = false;
        input.current?.focus({ preventScroll: true });
      }, 180);
    };
    const dismiss = () => {
      if (refocusing) focusAfterScroll();
      else if (resettingScroll.current) resettingScroll.current = false;
      else input.current?.blur();
    };
    const reselect = () => {
      refocusing = true;
      focusAfterScroll();
    };
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("native-nav-reselect", reselect);
    return () => { window.clearTimeout(timer); window.clearTimeout(focusTimer); window.removeEventListener("scroll", dismiss); window.removeEventListener("native-nav-reselect", reselect); };
  }, []);
  useEffect(() => {
    if (window.scrollY !== 0) {
      resettingScroll.current = true;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [state.query, view]);

  const { scope, ranking, filters } = view;
  const items = useMemo(
    () => (scope === "menu-items" ? rankSearchResults(filterSearchResults(results, filters), ranking) : results),
    [results, scope, ranking, filters],
  );
  const filterItems = useMemo(() => results.flatMap((result) => (result.kind === "menu-item" ? [result.item] : [])), [results]);
  const showControls = scope === "menu-items" && !state.isEmptyQuery && results.length > 0;

  const search = (query: string) => {
    if (!query.trim()) setView(DEFAULT_VIEW);
    state.handleInputChange(query);
  };
  const clear = () => {
    search("");
    input.current?.focus({ preventScroll: true });
  };
  const cancel = () => {
    search("");
    input.current?.blur();
  };
  const changeLayout = (value: NativeMenuLayout) => {
    setLayout(value);
    try { window.localStorage.setItem(NATIVE_LAYOUT_KEY, value); } catch { /* Storage is optional. */ }
  };
  const rerun = (query: string) => {
    setView(DEFAULT_VIEW);
    state.handleInputChange(query);
    recordQuery(query);
    input.current?.blur();
  };
  const select = (result: SearchResult) => {
    const query = state.query;
    recordQuery(query);
    if (result.kind === "restaurant") state.handleSelectRestaurant(result.restaurant);
    else if (result.kind === "menu-item") state.handleSelectMenuItem(result.item, result.restaurant);
    else if (result.kind === "builder-entree") state.handleStartEntreeBuild(result.entreeId, result.entreeOption, result.restaurant);
    else state.handleStartBuild(result.ingredient, result.restaurant, result.categoryLabel);
    // Shared close() intentionally clears web searches. Native keeps its query
    // while still using the shared handlers for navigation and previews.
    context.setQuery(query);
  };
  const browse = () => guardNavigation(() => router.replace("/restaurants"));

  return (
    <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] text-slate-900 dark:bg-app-background dark:text-slate-50">
      <div className="sticky top-0 z-[var(--z-sticky)] bg-slate-50 pb-2 pt-[calc(var(--safe-area-top)+6px)] dark:bg-app-background">
        <h1 className={state.isEmptyQuery ? "px-5 py-2.5 font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em]" : "sr-only"}>Search</h1>
        <div className="flex items-center px-[18px] pt-1.5">
          <label htmlFor="native-search-input" className={`flex h-[52px] min-w-0 flex-1 cursor-text items-center gap-3 rounded-full bg-surface-card pl-[18px] pr-1.5 transition-shadow duration-150 motion-reduce:transition-none ${focused ? "shadow-[0_0_0_2px_var(--product-accent),var(--elev-2)]" : "shadow-[0_0_0_1px_rgb(0_0_0/0.08),var(--elev-2)] dark:shadow-[0_0_0_1px_var(--border-hairline),var(--elev-2)]"}`}>
            <Search size={20} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden="true" />
            <input id="native-search-input" ref={input} type="search" enterKeyHint="search" aria-label="Search restaurants and menu items" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={state.query} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={event => search(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); recordQuery(state.query); event.currentTarget.blur(); } }} placeholder="Restaurants or menu items" className="native-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-slate-900 caret-accent outline-none placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400" />
            {state.query ? <button type="button" aria-label="Clear search" onMouseDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); clear(); }} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring"><span className="flex size-[22px] items-center justify-center rounded-full bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-950"><X size={12} strokeWidth={3.4} aria-hidden="true" /></span></button> : null}
          </label>
          {focused ? <button type="button" onMouseDown={event => event.preventDefault()} onClick={cancel} className="flex h-11 shrink-0 cursor-pointer items-center pl-3.5 text-base font-semibold text-accent-strong focus-ring">Cancel</button> : null}
        </div>
        {state.isEmptyQuery ? null : <div className="px-[18px] pt-3"><NativeSearchScopeTabs scope={scope} onChange={next => setView({ ...view, scope: next })} /></div>}
        {showControls ? <NativeSearchMenuControls ranking={ranking} layout={layout} filterCount={countNutritionFilters(filters)} filtersButtonRef={filtersButton} onRanking={next => setView({ ...view, ranking: next })} onLayout={changeLayout} onOpenFilters={() => setFiltersOpen(true)} /> : null}
      </div>
      {state.isEmptyQuery ? (
        <div className="px-[18px] pt-2">
          {recents.length ? <NativeRecentQueries queries={recents} onSelect={rerun} onRemove={removeQuery} onClear={clearQueries} /> : <NativeSearchGuide />}
        </div>
      ) : (
        <div id="native-search-results" role="tabpanel" aria-labelledby={`native-scope-${scope}`} className="px-[18px]">
          <NativeSearchResults query={state.query} pending={pending} loadingItems={!searchIndex} scope={scope} restaurants={state.restaurantResults} items={items} totalItems={results.length} index={searchIndex} layout={layout} ranking={ranking} filters={filters} onFilters={next => setView({ ...view, filters: next })} onScope={next => setView({ ...view, scope: next })} onSelect={select} onBrowse={browse} onClear={clear} />
        </div>
      )}
      {filtersOpen ? (
        <NativeFiltersSheet
          presets={[{ id: "results", label: "Search results", icon: Search, items: filterItems }]}
          defaultPresetId="results"
          applied={{ presetId: "results", nutrition: filters }}
          onApply={next => setView({ ...view, filters: next.nutrition })}
          onClose={() => { setFiltersOpen(false); filtersButton.current?.focus(); }}
        />
      ) : null}
    </main>
  );
}
