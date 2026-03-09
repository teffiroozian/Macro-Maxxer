"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CartIconDropdown from "@/components/CartIconDropdown";
import ControlsRow, {
  FilterChips,
  type Filters,
  type SortOption,
  type ViewOption,
} from "./ControlsRow";

type StickyRestaurantBarProps = {
  restaurantName: string;
  restaurantLogo: string;
  view: ViewOption;
  onChange: (view: ViewOption) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  searchOpen: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  entireMenu?: boolean;
  onEntireMenuChange?: (checked: boolean) => void;
  calorieBounds: {
    min: number;
    max: number;
  };
};

export default function StickyRestaurantBar({
  restaurantName,
  restaurantLogo,
  view,
  onChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  searchOpen,
  searchQuery,
  setSearchQuery,
  onOpenSearch,
  onCloseSearch,
  entireMenu,
  onEntireMenuChange,
  calorieBounds,
}: StickyRestaurantBarProps) {
  const [isControlsFloating, setIsControlsFloating] = useState(() => {
    if (typeof document === "undefined") return false;
    return !document.getElementById("controls-row");
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchMode = searchOpen || searchQuery.trim().length > 0;

  useEffect(() => {
    const controlsRow = document.getElementById("controls-row");

    if (!controlsRow) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlsFloating(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(controlsRow);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const hasActiveFilters = Boolean(filters.proteinMin || filters.caloriesMax);

  const handleBrandClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearProteinFilter = () => {
    onFiltersChange({ ...filters, proteinMin: undefined });
  };

  const clearCaloriesFilter = () => {
    onFiltersChange({ ...filters, caloriesMax: undefined });
  };

  const closeSearch = () => {
    onCloseSearch();
  };

  const resetFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-50" data-sticky-nav="true">
      <div className="relative z-[110] w-full border-b border-slate-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link
            href="/"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base font-semibold text-slate-700 transition hover:text-slate-900"
            aria-label="Back to home"
          >
            ←
          </Link>

          <button
            type="button"
            onClick={handleBrandClick}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300/80 bg-white"
            aria-label={`Scroll to top of ${restaurantName} page`}
          >
            <span className="relative h-7 w-7">
              <Image src={restaurantLogo} alt={`${restaurantName} logo`} fill className="object-contain" />
            </span>
          </button>

          <button
            type="button"
            onClick={handleBrandClick}
            className="min-w-0 flex-1 truncate text-left text-base font-semibold text-slate-900"
            aria-label={`Scroll to top of ${restaurantName} page`}
          >
            {restaurantName}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className={`overflow-hidden transition-all duration-300 ${isSearchMode ? "w-[16rem] opacity-100" : "w-0 opacity-0"}`}>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search menu items"
                  aria-label="Search menu items"
                  className="h-9 w-full rounded-full border border-slate-300/80 bg-white px-3 text-sm text-slate-900 outline-none"
                />
              </div>
            </div>

            {isSearchMode ? (
              <button
                type="button"
                onClick={closeSearch}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base text-slate-800"
                aria-label="Close search"
              >
                ✕
              </button>
            ) : (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base text-slate-800 transition hover:bg-slate-50"
                  aria-label="Search menu items"
                >
                🔍
              </button>
            )}

            <CartIconDropdown
              buttonClassName="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-base text-slate-800 transition hover:bg-slate-50"
              countFormat="compact"
            />
          </div>
        </div>
      </div>

      <div
        className={`relative z-[100] w-full border-b border-slate-200/70 bg-white/95 backdrop-blur transition-all duration-300 ${
          isControlsFloating
            ? "translate-y-0 opacity-100 shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
            : "-translate-y-2 opacity-0 pointer-events-none shadow-none"
        }`}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <div className="min-w-0 flex-1">
            <ControlsRow
              view={view}
              onChange={onChange}
              sort={sort}
              onSortChange={onSortChange}
              filters={filters}
              onFiltersChange={onFiltersChange}
              showChips={false}
              entireMenu={entireMenu}
              onEntireMenuChange={onEntireMenuChange}
              calorieBounds={calorieBounds}
            />
          </div>
        </div>
      </div>

      {hasActiveFilters ? (
        <div
          className={`w-full border-b border-slate-200/70 bg-white/95 backdrop-blur transition-all duration-300 ${
            isControlsFloating
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0 pointer-events-none"
          }`}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-2 text-sm sm:flex-nowrap sm:px-6">
            <FilterChips
              filters={filters}
              onClearProtein={clearProteinFilter}
              onClearCalories={clearCaloriesFilter}
              onClearAll={resetFilters}
              withMargin={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
