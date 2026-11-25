"use client";
import type { RefObject } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, Search, X } from "lucide-react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";

const ease = "transition-[background-color,color,box-shadow,opacity] duration-200 ease-out motion-reduce:transition-none";

export default function RestaurantTopBar({ barRef, inputRef, searchButtonRef, name, logo, compact, pinned, favorite, searching, query, onFavorite, onSearch, onQuery, onClear, onCancel }: {
  barRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  searchButtonRef: RefObject<HTMLButtonElement | null>;
  name: string;
  logo: string;
  compact: boolean;
  pinned: boolean;
  favorite: boolean;
  searching: boolean;
  query: string;
  onFavorite: () => void;
  onSearch: () => void;
  onQuery: (query: string) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const back = () => guardNavigation(() => {
    if (window.history.length > 1) router.back();
    else router.replace("/restaurants");
  });
  const solid = compact || searching;
  const circle = `pointer-events-auto flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full ${ease} focus-ring ${solid ? "text-slate-900 active:bg-slate-200/70 dark:text-slate-50 dark:active:bg-surface-hover" : "bg-[rgba(15,23,42,0.42)] text-white backdrop-blur-[12px]"}`;
  // The toolbar draws its own edge once it is pinned underneath.
  const edge = solid && !pinned && !searching ? "shadow-[0_1px_0_#e2e8f0] dark:shadow-[0_1px_0_var(--border-divider)]" : "";
  const fill = solid ? "bg-slate-50 dark:bg-app-background" : "bg-transparent";
  return (
    <>
      <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[var(--z-sticky)] h-[var(--safe-area-top)] ${ease} ${fill}`} />
      <div ref={barRef} className={`fixed inset-x-0 top-[var(--safe-area-top)] z-[var(--z-sticky)] flex h-[52px] items-center gap-2 pl-[max(14px,var(--safe-area-left))] pr-[max(14px,var(--safe-area-right))] text-slate-900 dark:text-slate-50 ${ease} ${fill} ${edge} ${solid ? "" : "pointer-events-none"}`}>
        {searching ? (
          <div role="search" className="flex min-w-0 flex-1 items-center">
            <label htmlFor="native-restaurant-menu-search" className="flex h-11 min-w-0 flex-1 cursor-text items-center gap-2.5 rounded-full bg-surface-card pl-2 pr-0.5 shadow-[0_0_0_2px_var(--product-accent),var(--elev-2)]">
              <NativeRestaurantLogo src={logo} size={28} />
              <input
                id="native-restaurant-menu-search"
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                aria-label={`Search ${name}`}
                placeholder={`Search ${name}`}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
                  if (event.key === "Escape") { event.preventDefault(); onCancel(); }
                }}
                className="native-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] caret-accent outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
              {query ? <button type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); onClear(); }} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring"><span className="flex size-[22px] items-center justify-center rounded-full bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-950"><X size={12} strokeWidth={3.4} aria-hidden="true" /></span></button> : null}
            </label>
            <button type="button" onClick={onCancel} className="flex h-11 shrink-0 cursor-pointer items-center pl-3.5 text-base font-semibold text-accent-strong focus-ring">Cancel</button>
          </div>
        ) : (
          <>
            <button type="button" onClick={back} aria-label="Back" className={circle}><ChevronLeft size={24} strokeWidth={2.4} className="-ml-0.5" aria-hidden="true" /></button>
            <div aria-hidden={!compact} className={`flex min-w-0 flex-1 items-center gap-[9px] ${ease} ${compact ? "opacity-100" : "opacity-0"}`}>
              <NativeRestaurantLogo src={logo} size={32} />
              <span className="min-w-0 truncate text-[17px] font-bold">{name}</span>
            </div>
            <button type="button" onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`} className={circle}><Heart size={21} strokeWidth={2.2} fill={favorite ? "currentColor" : "none"} className={solid ? "text-accent-strong" : ""} aria-hidden="true" /></button>
            <button ref={searchButtonRef} type="button" onClick={onSearch} aria-label={`Search ${name}`} className={circle}><Search size={21} strokeWidth={2.3} aria-hidden="true" /></button>
          </>
        )}
      </div>
    </>
  );
}
