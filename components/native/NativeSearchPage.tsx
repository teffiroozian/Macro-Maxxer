"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import { useNativeRecentSearches } from "@/lib/search/useNativeRecentSearches";
import { searchRestaurants } from "@/lib/search/searchRestaurants";
import { recordQuery } from "@/lib/search/recentQueries";
import { readNativeLayout, NATIVE_LAYOUT_KEY } from "@/lib/search/nativeSearchPresentation";
import type { SearchScope } from "@/components/global-search/ScopeSwitcher";
import type { SearchResult } from "@/types/search";
import NativeScopeControl from "./search/NativeScopeControl";
import type { NativeMenuLayout } from "./search/NativeLayoutToggle";
import NativeSearchResults from "./NativeSearchResults";

// Keep the native scope alongside the shared query across route remounts.
let lastNativeScope: SearchScope = "restaurants";
let lastAppliedQueryParam: string | null = null;

export default function NativeSearchPage() {
  const state = useGlobalSearchState();
  const context = useGlobalSearch();
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const params = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const resettingScroll = useRef(false);
  const { searchIndex: eagerIndex } = useMenuItemSearch("", { enabled: true });
  const history = useNativeRecentSearches(state.restaurants, eagerIndex);
  const [layout, setLayout] = useState<NativeMenuLayout>("grid");
  const queryParam = params.get("q");
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  useEffect(() => {
    const current = latest.current;
    if (queryParam && (queryParam !== lastAppliedQueryParam || !current.query)) {
      current.handleInputChange(queryParam);
      lastNativeScope = searchRestaurants(current.restaurants, queryParam).length ? "restaurants" : "menu-items";
    }
    lastAppliedQueryParam = queryParam;
    current.handleScopeChange(lastNativeScope);
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
  }, [state.query, state.scope]);
  const changeScope = (scope: SearchScope) => { lastNativeScope = scope; state.handleScopeChange(scope); };
  const changeLayout = (value: NativeMenuLayout) => {
    setLayout(value);
    try { window.localStorage.setItem(NATIVE_LAYOUT_KEY, value); } catch { /* Storage is optional. */ }
  };
  const select = (result: SearchResult) => {
    history.add(result);
    const query = state.query;
    recordQuery(query);
    if (result.kind === "restaurant") state.handleSelectRestaurant(result.restaurant);
    else if (result.kind === "menu-item") state.handleSelectMenuItem(result.item, result.restaurant);
    else if (result.kind === "builder-entree") state.handleStartEntreeBuild(result.entreeId, result.entreeOption, result.restaurant);
    else state.handleStartBuild(result.ingredient, result.restaurant, result.categoryLabel);
    // Shared close() intentionally clears web searches. Native keeps its query
    // while still using the shared handlers for navigation, previews and recents.
    context.setQuery(query);
  };
  const browse = () => guardNavigation(() => router.replace("/restaurants"));
  const resultsState = { ...state, handleScopeChange: changeScope, searchIndex: state.scope === "restaurants" ? eagerIndex : state.searchIndex };

  return (
    <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pt-[calc(var(--safe-area-top)+6px)] text-slate-900">
      <h1 className="px-5 pt-2.5 font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">Search</h1>
      <div className="mx-[18px] mt-5 rounded-[22px] border border-black/8 bg-white p-1.5 shadow-elev-2">
        <label htmlFor="native-search-input" className="flex h-[52px] cursor-text items-center gap-2.5 pl-[5px] pr-2">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong"><Search size={16} strokeWidth={2.6} aria-hidden="true" /></span>
          <input id="native-search-input" ref={input} type="search" enterKeyHint="search" aria-label="Search restaurants and menu items" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={state.query} onChange={event => state.handleInputChange(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} placeholder="Search restaurants, menu items…" className="native-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-slate-900 caret-accent outline-none placeholder:text-slate-400" />
          {state.query ? <button type="button" aria-label="Clear search" onMouseDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); state.handleInputChange(""); input.current?.focus({ preventScroll: true }); }} className="-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center focus-ring"><span className="flex size-[22px] items-center justify-center rounded-full bg-slate-300 text-white"><X size={10} strokeWidth={3.6} aria-hidden="true" /></span></button> : null}
        </label>
        <NativeScopeControl scope={state.scope} onChange={changeScope} />
      </div>
      <NativeSearchResults state={resultsState} history={history} layout={layout} onLayout={changeLayout} onSelect={select} onBrowse={browse} />
    </main>
  );
}
