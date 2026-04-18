"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CartIconDropdown from "@/components/CartIconDropdown";
import ControlsRow, {
  FilterChips,
  type Filters,
  type ViewOption,
} from "./ControlsRow";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import { Search } from "lucide-react";

import { useFilterChipActions } from "./useFilterChipActions";

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
  calorieBounds: {
    min: number;
    max: number;
  };
  secondaryNavLeading?: ReactNode;
  hideViewSelector?: boolean;
  hideSecondaryNav?: boolean;
  onBack?: () => void;
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
  calorieBounds,
  secondaryNavLeading,
  hideViewSelector = false,
  hideSecondaryNav = false,
  onBack,
}: StickyRestaurantBarProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchMode = searchOpen || searchQuery.trim().length > 0;

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  const handleBrandClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeSearch = () => {
    onCloseSearch();
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-50" data-sticky-nav="true">
      <div
        className={`relative z-[110] mx-auto mt-1 flex w-[calc(100%-0.5rem)] max-w-6xl items-center border border-slate-200/70 bg-white shadow-[0_-6px_16px_rgba(15,23,42,0.12)] backdrop-blur sm:w-[calc(100%-1rem)] ${
          hideSecondaryNav ? "rounded-2xl" : "rounded-t-2xl"
        }`}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onBack ?? (() => router.back())}
            className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base font-semibold text-slate-700 transition hover:text-slate-900"
            aria-label="Back to previous page"
          >
            ←
          </button>

          <button
            type="button"
            onClick={handleBrandClick}
            className="flex min-w-0 items-center gap-2.5 cursor-pointer sm:gap-3"
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

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className={`overflow-hidden transition-all duration-300 ${isSearchMode ? "w-[min(46vw,16rem)] opacity-100 sm:w-[16rem]" : "w-0 opacity-0"}`}>
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
                className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base text-slate-800"
                aria-label="Close search"
              >
                ✕
              </button>
            ) : (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-base text-slate-800 transition hover:bg-slate-50"
                  aria-label="Search menu items"
                >
                <Search className="h-4 w-4" strokeWidth={2.5}/>
              </button>
            )}
            <CartIconDropdown
              buttonClassName="cursor-pointer inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-base text-slate-800 transition hover:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {hideSecondaryNav ? null : (
        <div
          className="relative z-[100] mx-auto flex w-[calc(100%-0.5rem)] max-w-6xl items-center rounded-b-2xl border border-slate-200/70 bg-white shadow-[0_6px_16px_rgba(15,23,42,0.12)] backdrop-blur sm:w-[calc(100%-1rem)]"
        >
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
            {secondaryNavLeading ? (
              <div className="shrink-0">
                {secondaryNavLeading}
              </div>
            ) : null}
            <div className={`min-w-0 shrink-0 ${secondaryNavLeading ? "ml-auto" : "flex-1"}`}>
              <ControlsRow
                view={view}
                onChange={onChange}
                sort={sort}
                onSortChange={onSortChange}
                filters={filters}
                onFiltersChange={onFiltersChange}
                showChips={false}
                calorieBounds={calorieBounds}
                hideViewSelector={hideViewSelector}
              />
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && !hideSecondaryNav ? (
        <div className="relative z-[100] mx-auto mt-0.5 w-[calc(100%-0.5rem)] max-w-6xl rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_6px_16px_rgba(15,23,42,0.12)] backdrop-blur sm:w-[calc(100%-1rem)]">
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
