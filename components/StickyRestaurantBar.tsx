"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useGlobalNav } from "@/components/GlobalNav";
import ControlsRow from "./ControlsRow";
import type { ViewOption } from "@/components/controls/types";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import type { RankedAllFilterKey } from "@/lib/menuSections/filtering";
import type { MenuItem } from "@/types/menu";
import { ChevronLeft, Menu, SlidersHorizontal } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppIconButton from "@/components/ui/AppIconButton";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";
import { useStickyNavClearance } from "@/components/restaurant-view/useStickyNavClearance";

type StickyRestaurantBarProps = {
  restaurantId: string;
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
  visibleItemCount?: number;
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
  resultLayout?: "list" | "grid";
  onResultLayoutChange?: (layout: "list" | "grid") => void;
  hideMobileControls?: boolean;
  filterRankingCategories?: boolean;
  showMobileRail?: boolean;
};

export default function StickyRestaurantBar({
  restaurantId,
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
  visibleItemCount,
  rankedChildSelections,
  isRankingView,
  proteinOptions,
  secondaryNavLeading,
  mobileEntreeOptions,
  hideViewSelector = false,
  hideIngredientsView = false,
  hideSecondaryNav = false,
  onEditFiltersDrawerReady,
  resultLayout = "list",
  onResultLayoutChange = () => {},
  hideMobileControls = false,
  filterRankingCategories = true,
  showMobileRail = false,
}: StickyRestaurantBarProps) {
  const [openMobileControlsDrawer, setOpenMobileControlsDrawer] = useState<() => void>(() => () => {});
  const [isBrowseDrawerOpen, setIsBrowseDrawerOpen] = useState(false);
  const [isControlsDrawerOpen, setIsControlsDrawerOpen] = useState(false);
  const { mobileNavVisible: isMobileNavVisible, mobileNavHeight, setHideOnScroll } = useGlobalNav();
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const globalNavBottom = useStickyNavClearance();
  const desktopCapsuleRef = useRef<HTMLDivElement>(null);
  const [isDesktopSticky, setIsDesktopSticky] = useState(false);

  useEffect(() => {
    if (IS_CAPACITOR_BUILD) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const capsule = desktopCapsuleRef.current;
      if (!desktop.matches || !capsule) {
        setIsDesktopSticky(false);
        return;
      }
      // Read the resolved sticky offset so measured nav height and the
      // shared spacing token remain the source of truth for this threshold.
      const stickyTop = Number.parseFloat(window.getComputedStyle(capsule).top);
      const stuck = Number.isFinite(stickyTop)
        && capsule.getBoundingClientRect().top <= stickyTop + 0.5;
      setIsDesktopSticky((previous) => previous === stuck ? previous : stuck);
    };
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    scheduleMeasure();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    desktop.addEventListener("change", scheduleMeasure);
    const observer = new ResizeObserver(scheduleMeasure);
    if (desktopCapsuleRef.current) observer.observe(desktopCapsuleRef.current);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      desktop.removeEventListener("change", scheduleMeasure);
      observer.disconnect();
    };
  }, [globalNavBottom, hideSecondaryNav]);
  useEffect(() => {
    setHideOnScroll(showMobileRail);
    return () => setHideOnScroll(false);
  }, [showMobileRail, setHideOnScroll]);
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
  return (
    <>
      {IS_CAPACITOR_BUILD ? (
        <div
          className="fixed inset-x-0 top-0 z-[95] border-b border-black/10 bg-white/95 pt-[var(--safe-area-top)] shadow-elev-brand backdrop-blur-lg"
          data-sticky-nav="true"
        >
          <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2 px-3">
            {!hideMobileControls ? <AppIconButton
              variant="ghost"
              size="sm"
              onClick={handleNativeBack}
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </AppIconButton> : null}
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

      {showMobileRail && !hideSecondaryNav ? (
        <div className="pointer-events-none col-start-1 row-start-1 self-center border-t border-slate-200 lg:hidden" aria-hidden="true" />
      ) : null}

      {secondaryNavLeading || !hideSecondaryNav ? (
        <div
          className={`sticky top-[var(--mobile-controls-top)] -mx-3 z-[var(--z-sticky)] ${showMobileRail ? "col-start-1 row-start-1 bg-transparent" : "bg-app-background"} py-0 transition-[top] duration-300 ease-out sm:-mx-4 lg:contents ${hideMobileControls && !secondaryNavLeading && !showMobileRail ? "hidden lg:block" : ""}`}
          style={{
            "--mobile-controls-top": showMobileRail
              ? `calc(${isMobileNavVisible ? mobileNavHeight : 0}px + var(--restaurant-controls-gap))`
              : `${isMobileNavVisible ? mobileNavHeight : 0}px`,
            "--desktop-controls-top": showMobileRail
              ? `calc(${globalNavBottom ?? 64}px + var(--restaurant-controls-sticky-gap))`
              : `${(globalNavBottom ?? 64) + 8}px`,
          } as CSSProperties}
        >
          {/* Desktop grid siblings share a row: the rule stays in flow while
              only the capsule sticks, without constraining its travel. */}
          {showMobileRail ? (
            <div className="pointer-events-none hidden self-center border-t border-slate-200 lg:col-start-1 lg:row-start-1 lg:block" aria-hidden="true" />
          ) : (
            <>
              <div className="absolute inset-x-0 top-1/2 border-t border-divider lg:hidden" aria-hidden="true" />
              <div className="hidden h-2 lg:block" aria-hidden="true" />
            </>
          )}
          <div ref={desktopCapsuleRef} className={`relative mx-auto w-full lg:sticky lg:top-[var(--desktop-controls-top)] lg:z-[var(--z-sticky)] lg:w-fit lg:max-w-full ${showMobileRail ? "lg:col-start-1 lg:row-start-1 lg:justify-self-center" : ""}`}>
            <div className="flex min-w-0 flex-col border-y border-hairline bg-white p-1.5 shadow-elev-1 lg:rounded-full lg:border">
              <div className="flex min-w-0 items-center gap-3 overflow-x-auto hide-scrollbar lg:overflow-visible">
                {secondaryNavLeading ? <div className="shrink-0">{secondaryNavLeading}</div> : null}
                {hideSecondaryNav ? null : (
                  <div className={`min-w-0 lg:flex lg:items-center ${secondaryNavLeading ? "lg:ml-auto" : "flex-1"}`}>
                    <div
                      aria-hidden={!isDesktopSticky}
                      className={`hidden shrink-0 overflow-hidden transition-[width,opacity,transform] duration-[180ms] ease-out motion-reduce:transition-none lg:block ${isDesktopSticky ? "w-14 translate-x-0 opacity-100" : "w-0 -translate-x-1 opacity-0"}`}
                    >
                      <div className="flex w-14 items-center gap-3 pl-1">
                        <RestaurantLogoBadge src={restaurantLogo} alt={`${restaurantName} logo`} size="xs" />
                        <span className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                      </div>
                    </div>
                    <ControlsRow
                      restaurantId={restaurantId}
                      view={view}
                      onChange={onChange}
                      sort={sort}
                      onSortChange={onSortChange}
                      filters={filters}
                      onFiltersChange={onFiltersChange}
                      proteinOptions={proteinOptions}
                      calorieBounds={calorieBounds}
                      sourceItems={sourceItems}
                      visibleItemCount={visibleItemCount}
                      rankedChildSelections={rankedChildSelections}
                      isRankingView={isRankingView}
                      hideViewSelector={hideViewSelector}
                      hideIngredientsView={hideIngredientsView}
                      onMobileDrawerOpenReady={hideMobileControls ? undefined : handleMobileDrawerOpenReady}
                      onMobileFiltersDrawerOpenReady={hideMobileControls ? undefined : onEditFiltersDrawerReady}
                      onMobileDrawerOpenChange={hideMobileControls ? undefined : setIsControlsDrawerOpen}
                      mobileEntreeOptions={mobileEntreeOptions}
                      mobileDrawerHeaderTitle={restaurantName}
                      mobileDrawerHeaderLogoSrc={restaurantLogo}
                      resultLayout={resultLayout}
                      onResultLayoutChange={onResultLayoutChange}
                      showMobileTrigger={!hideMobileControls}
                      renderMobileDrawer={!hideMobileControls}
                      filterRankingCategories={filterRankingCategories}
                      showInlineMobileControls={showMobileRail}
                    />
                  </div>
                )}
              </div>
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
