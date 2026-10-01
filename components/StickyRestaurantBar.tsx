"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import ControlsRow, { FilterChips } from "./ControlsRow";
import { useFilterChipActions } from "./useFilterChipActions";
import type { ViewOption } from "@/components/controls/types";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import type { RankedAllFilterKey } from "@/lib/menuSections/filtering";
import type { MenuItem } from "@/types/menu";
import { ChevronLeft, Menu, Store, SlidersHorizontal } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppIconButton, { appIconButtonClassName } from "@/components/ui/AppIconButton";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

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
  // The same view-eligible item collection (and ranking-category selection)
  // useRestaurantMenuControls computes for the page — passed straight
  // through to ControlsRow so its draft filter-count previews reuse the
  // page's own filterMenuItems call rather than a parallel one.
  sourceItems: MenuItem[];
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  isRankingView: boolean;
  // Preset protein-minimum chip values, passed straight through to
  // ControlsRow — defaults to the meal-level scale there when omitted.
  proteinOptions?: number[];
  secondaryNavLeading?: ReactNode;
  mobileEntreeOptions?: Array<{
    key: string;
    label: string;
    image?: string;
    selected?: boolean;
    onSelect: () => void;
  }>;
  hideViewSelector?: boolean;
  hideIngredientsView?: boolean;
  // Hides just the view/sort/filter controls (ControlsRow) within the
  // restaurant-specific row below the global nav — e.g. Chipotle's
  // entrée-selection screen, before there's a menu to sort/filter yet. The
  // restaurant-switcher row itself always stays visible.
  hideSecondaryNav?: boolean;
  // Surfaces a function that opens the mobile controls drawer scrolled
  // straight to its Filters section — for a caller-rendered "Edit filters"
  // control living outside this component (the active-filter row beneath
  // the mobile category strip).
  onEditFiltersDrawerReady?: (openEditFiltersDrawer: () => void) => void;
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
  sourceItems,
  rankedChildSelections,
  isRankingView,
  proteinOptions,
  secondaryNavLeading,
  mobileEntreeOptions,
  hideViewSelector = false,
  hideIngredientsView = false,
  hideSecondaryNav = false,
  onEditFiltersDrawerReady,
}: StickyRestaurantBarProps) {
  const [openMobileControlsDrawer, setOpenMobileControlsDrawer] = useState<() => void>(() => () => {});
  const [isBrowseDrawerOpen, setIsBrowseDrawerOpen] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const handleNativeBack = () => {
    guardNavigation(() => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.replace("/restaurants");
      }
    });
  };
  const handleMobileDrawerOpenReady = useCallback((openDrawer: () => void) => {
    setOpenMobileControlsDrawer(() => openDrawer);
  }, []);
  // Desktop's dedicated active-filter row (below the controls row, full
  // width — never sharing space with the entrée selector) reuses the exact
  // same FilterChips component and clear/reset actions the mobile drawer's
  // own chip row (RestaurantCategorySidebar) already uses, rather than a
  // second hand-rolled chip UI.
  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  return (
    <>
      {!IS_CAPACITOR_BUILD ? <div
        className="fixed inset-x-0 top-0 z-[var(--z-nav)] hidden lg:block"
        data-sticky-nav="true"
      >
        <DesktopNav searchBarVariant="compact" presentation="band" />
      </div> : null}

      {!IS_CAPACITOR_BUILD ? <GlobalMobileNav
        markStickyNav
        flat
        middleSlot={
          <AppIconButton
            onClick={() => setIsBrowseDrawerOpen(true)}
            variant="nav"
            size="nav"
            active={isBrowseDrawerOpen}
            aria-label="Browse restaurants"
          >
            <Store className="h-4 w-4" strokeWidth={2.4} />
          </AppIconButton>
        }
        cartSlot={
          <CartIconDropdown
            variant="sheet"
            buttonClassName={appIconButtonClassName({ variant: "nav", size: "nav", className: "relative shrink-0" })}
          />
        }
      /> : null}

      {IS_CAPACITOR_BUILD ? (
        <div
          className="fixed inset-x-0 top-0 z-[95] border-b border-black/10 bg-white/95 pt-[var(--safe-area-top)] shadow-elev-brand backdrop-blur-lg"
          data-sticky-nav="true"
        >
          <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2 px-3">
            <AppIconButton
              variant="ghost"
              size="sm"
              onClick={handleNativeBack}
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </AppIconButton>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <RestaurantLogoBadge src={restaurantLogo} alt="" size="xs" fit="cover" />
              <span className="truncate text-sm font-semibold text-slate-900">{restaurantName}</span>
            </div>
            <AppIconButton
              variant="ghost"
              size="sm"
              active={hideSecondaryNav ? isBrowseDrawerOpen : isControlsDrawerOpen}
              onClick={() => {
                if (hideSecondaryNav) {
                  setIsBrowseDrawerOpen(true);
                  return;
                }
                openMobileControlsDrawer();
              }}
              aria-label={hideSecondaryNav ? "Browse restaurants" : "Open menu controls"}
            >
              {hideSecondaryNav ? (
                <Menu className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
              )}
            </AppIconButton>
          </div>
        </div>
      ) : null}

      {secondaryNavLeading || !hideSecondaryNav ? (
        <div className="relative -mx-3 py-4 sm:-mx-4 sm:py-5 lg:mx-0 lg:py-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-divider" aria-hidden="true" />
          <div className="relative mx-auto w-full lg:w-fit lg:max-w-full">
            <div className="flex min-w-0 flex-col border-y border-hairline bg-white px-3 py-2 shadow-elev-1 sm:px-4 lg:min-w-[34rem] lg:rounded-full lg:border lg:px-3">
              <div className="flex min-w-0 items-center gap-3 overflow-x-auto hide-scrollbar">
                {secondaryNavLeading ? <div className="shrink-0">{secondaryNavLeading}</div> : null}
                {hideSecondaryNav ? null : (
                  <div className={`min-w-0 ${secondaryNavLeading ? "lg:ml-auto" : "flex-1"}`}>
                    <ControlsRow
                      view={view}
                      onChange={onChange}
                      sort={sort}
                      onSortChange={onSortChange}
                      filters={filters}
                      onFiltersChange={onFiltersChange}
                      proteinOptions={proteinOptions}
                      calorieBounds={calorieBounds}
                      sourceItems={sourceItems}
                      rankedChildSelections={rankedChildSelections}
                      isRankingView={isRankingView}
                      hideViewSelector={hideViewSelector}
                      hideIngredientsView={hideIngredientsView}
                      onMobileDrawerOpenReady={handleMobileDrawerOpenReady}
                      onMobileFiltersDrawerOpenReady={onEditFiltersDrawerReady}
                      onMobileDrawerOpenChange={setIsControlsDrawerOpen}
                      mobileEntreeOptions={mobileEntreeOptions}
                      mobileDrawerHeaderTitle={restaurantName}
                      mobileDrawerHeaderLogoSrc={restaurantLogo}
                    />
                  </div>
                )}
              </div>
              {!hideSecondaryNav && hasActiveFilters ? (
                <div className="mt-2 border-t border-divider pt-2">
                  <FilterChips
                    filters={filters}
                    onClearProtein={clearProteinFilter}
                    onClearCalories={clearCaloriesFilter}
                    onClearAll={resetFilters}
                    withMargin={false}
                    scrollable
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <MobileNavDrawer
        isOpen={isBrowseDrawerOpen}
        onClose={() => setIsBrowseDrawerOpen(false)}
        headerTitle={restaurantName}
        headerLogoSrc={restaurantLogo}
      />
    </>
  );
}
