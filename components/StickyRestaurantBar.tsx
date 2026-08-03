"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import ControlsRow, { FilterChips } from "./ControlsRow";
import type { ViewOption } from "@/components/controls/types";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import { Menu } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppIconButton, { appIconButtonClassName } from "@/components/ui/AppIconButton";

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
  calorieBounds,
  secondaryNavLeading,
  mobileEntreeOptions,
  hideViewSelector = false,
  hideSecondaryNav = false,
}: StickyRestaurantBarProps) {
  const [openMobileControlsDrawer, setOpenMobileControlsDrawer] = useState<() => void>(() => () => {});
  const [isBrowseDrawerOpen, setIsBrowseDrawerOpen] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);
  const handleMobileDrawerOpenReady = useCallback((openDrawer: () => void) => {
    setOpenMobileControlsDrawer(() => openDrawer);
  }, []);

  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

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
                  onMobileDrawerOpenChange={setIsControlsDrawerOpen}
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
          homepage/cart mobile nav), with the same shared Search button
          (opens the global search pop-up, scoped to this restaurant) that
          every other page uses — no restaurant-page-only search widget. */}
      <GlobalMobileNav
        markStickyNav
        leadingButton={
          <AppIconButton
            onClick={() => {
              if (hideSecondaryNav) {
                setIsBrowseDrawerOpen(true);
                return;
              }
              openMobileControlsDrawer();
            }}
            variant="nav"
            active={hideSecondaryNav ? isBrowseDrawerOpen : isControlsDrawerOpen}
            className="size-9"
            aria-label="Open controls drawer"
          >
            <Menu className="h-4 w-4" strokeWidth={2.5} />
          </AppIconButton>
        }
        cartSlot={
          <CartIconDropdown
            buttonClassName={appIconButtonClassName({ variant: "nav", className: "relative size-9 shrink-0 text-base" })}
          />
        }
      />

      <MobileNavDrawer
        isOpen={isBrowseDrawerOpen}
        onClose={() => setIsBrowseDrawerOpen(false)}
        headerTitle={restaurantName}
        headerLogoSrc={restaurantLogo}
      />
    </>
  );
}
