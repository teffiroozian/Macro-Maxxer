"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import ControlsRow, { FilterChips } from "./ControlsRow";
import type { ViewOption } from "@/components/controls/types";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import { Menu, Search } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppIconButton from "@/components/ui/AppIconButton";

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
  mobileEntreeOptions?: Array<{
    key: string;
    label: string;
    image?: string;
    selected?: boolean;
    onSelect: () => void;
  }>;
  hideViewSelector?: boolean;
  // Hides just the view/sort/filter controls (ControlsRow) within the
  // restaurant-specific row below the global nav — e.g. Chipotle's
  // entrée-selection screen, before there's a menu to sort/filter yet. The
  // restaurant-switcher row itself always stays visible.
  hideSecondaryNav?: boolean;
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
  mobileEntreeOptions,
  hideViewSelector = false,
  hideSecondaryNav = false,
}: StickyRestaurantBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchMode = searchOpen || searchQuery.trim().length > 0;
  const [openMobileControlsDrawer, setOpenMobileControlsDrawer] = useState<() => void>(() => () => {});
  const [isBrowseDrawerOpen, setIsBrowseDrawerOpen] = useState(false);
  const [browseDrawerKey, setBrowseDrawerKey] = useState(0);
  const handleMobileDrawerOpenReady = useCallback((openDrawer: () => void) => {
    setOpenMobileControlsDrawer(() => openDrawer);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  const closeSearch = () => {
    onCloseSearch();
  };

  const mobileFilterToggle = (
    <>
      <div className={`overflow-hidden transition-all duration-300 ${isSearchMode ? "w-[min(46vw,16rem)] opacity-100 sm:w-[16rem]" : "w-0 opacity-0"}`}>
        <div className="relative">
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filter this menu"
            aria-label="Filter this menu"
            className="h-9 w-full rounded-full border border-slate-300/80 bg-white px-3 text-sm text-slate-900 outline-none"
          />
        </div>
      </div>

      {isSearchMode ? (
        <AppIconButton onClick={closeSearch} className="size-9 border-slate-300/80 text-base text-slate-800" aria-label="Close filter">
          ✕
        </AppIconButton>
      ) : (
        <AppIconButton onClick={onOpenSearch} className="size-9 border-slate-300/80 text-base text-slate-800" aria-label="Filter this menu">
          <Search className="h-4 w-4" strokeWidth={2.5} />
        </AppIconButton>
      )}
    </>
  );

  return (
    <>
      {/* Desktop nav — literally DesktopNav (same component/card as the
          homepage/cart nav): Logo | Restaurants | Search | Cart. Search
          defaults to this restaurant's menu (Slice 3's restaurant-context
          mechanism, generalized in useGlobalSearchState). The restaurant
          switcher now lives in this global nav (DesktopNav itself) so it's
          identical everywhere — only page-specific controls (view/sort/
          filters, Chipotle's entrée switcher) live in the secondary row
          below, and that row disappears entirely when it would have
          nothing else in it. */}
      <div
        className="fixed inset-x-0 top-0 z-[95] hidden px-4 pt-1 sm:px-6 lg:block"
        data-sticky-nav="true"
      >
        <DesktopNav searchBarVariant="compact" />

        {secondaryNavLeading || !hideSecondaryNav ? (
          <div className="mx-auto mt-0.5 hidden w-full max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white px-6 py-2 shadow-[0_3px_12px_rgba(15,23,42,0.12)] lg:flex">
            {secondaryNavLeading ? <div className="shrink-0">{secondaryNavLeading}</div> : null}
            {hideSecondaryNav ? null : (
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
                  showMobileTrigger={false}
                  onMobileDrawerOpenReady={handleMobileDrawerOpenReady}
                  mobileEntreeOptions={mobileEntreeOptions}
                  mobileDrawerHeaderTitle={restaurantName}
                  mobileDrawerHeaderLogoSrc={restaurantLogo}
                />
              </div>
            )}
          </div>
        ) : null}

        {hasActiveFilters && !hideSecondaryNav ? (
          <div className="mx-auto mt-0.5 hidden w-full max-w-6xl flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/95 px-6 py-2 text-sm shadow-[0_3px_12px_rgba(15,23,42,0.12)] backdrop-blur lg:flex">
            <FilterChips
              filters={filters}
              onClearProtein={clearProteinFilter}
              onClearCalories={clearCaloriesFilter}
              onClearAll={resetFilters}
              withMargin={false}
            />
          </div>
        ) : null}
      </div>

      {/* Mobile nav — literally GlobalMobileNav (same component/card as the
          homepage/cart mobile nav). Its own Global Search button covers the
          nav-wide search; the hamburger and "Filter this menu" mini input
          are restaurant-page-specific slots. */}
      <GlobalMobileNav
        markStickyNav
        leadingButton={
          <AppIconButton
            onClick={() => {
              if (hideSecondaryNav) {
                setBrowseDrawerKey((prev) => prev + 1);
                setIsBrowseDrawerOpen(true);
                return;
              }
              openMobileControlsDrawer();
            }}
            className="size-9 border-slate-300/80 text-slate-800"
            aria-label="Open controls drawer"
          >
            <Menu className="h-4 w-4" strokeWidth={2.5} />
          </AppIconButton>
        }
        middleSlot={mobileFilterToggle}
        cartSlot={
          <CartIconDropdown
            buttonClassName="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white p-0 text-base text-slate-800 transition hover:bg-slate-50"
          />
        }
      />

      <MobileNavDrawer
        key={browseDrawerKey}
        isOpen={isBrowseDrawerOpen}
        onClose={() => setIsBrowseDrawerOpen(false)}
        headerTitle={restaurantName}
        headerLogoSrc={restaurantLogo}
      />
    </>
  );
}
