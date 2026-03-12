"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import CartIconDropdown from "@/components/CartIconDropdown";
import ControlsRow, {
  FilterChips,
  type Filters,
  type SortOption,
  type ViewOption,
} from "./ControlsRow";
import { Search,  } from "lucide-react";

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchMode = searchOpen || searchQuery.trim().length > 0;

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
      <div className="relative z-[110] mx-auto flex max-w-6xl items-center mx-2 mt-1 rounded-t-2xl border border-slate-200/70 bg-white/95 shadow-[0_6px_16px_rgba(15,23,42,0.12)] backdrop-blur">
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
            className="flex items-center gap-3 cursor-pointer"
            aria-label={`Scroll to top of ${restaurantName} page`}
          >
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-300/80 bg-white">
              <Image
                src={restaurantLogo}
                alt={`${restaurantName} logo`}
                fill
                className="object-contain rounded-md"
              />
            </span>

            <span className="min-w-0 truncate text-left text-base font-semibold text-slate-900">
              {restaurantName}
            </span>
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
                <Search className="h-4 w-4" strokeWidth={2.5}/>
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
        className="relative z-[100] mx-auto flex w-full max-w-6xl items-center rounded-b-2xl border border-slate-200/70 bg-white/95 shadow-[0_6px_16px_rgba(15,23,42,0.12)] backdrop-blur"
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
        <div className="w-full border-b border-slate-200/70 bg-white/95 backdrop-blur">
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
