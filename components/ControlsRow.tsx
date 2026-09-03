"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "@/components/ui/AppImage";

import { useFilterChipActions } from "./useFilterChipActions";
import { SORT_OPTION_VALUES, type SortOption } from "@/lib/menuSections/sortOptions";
import { MEAL_PROTEIN_OPTIONS, type Filters } from "@/lib/menuSections/filterOptions";
import type { ViewOption } from "@/components/controls/types";
import { filterMenuItems, type RankedAllFilterKey } from "@/lib/menuSections/filtering";
import type { MenuItem } from "@/types/menu";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import AppButton from "@/components/ui/AppButton";
import FilterChip from "@/components/ui/FilterChip";
import ViewTabs from "@/components/controls/ViewTabs";
import SortSelector from "@/components/controls/SortSelector";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import {
  SlidersHorizontal,
  ChevronDown,
  ClipboardList,
  Carrot,
  Flame,
  Leaf,
  Scale,
  Award,
  ListOrdered,
  Menu,
  Check,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";


const VIEW_OPTIONS: Array<{ label: string; value: ViewOption; icon: typeof ClipboardList }> = [
  { label: "Menu", value: "menu", icon: ClipboardList },
  { label: "Ingredients", value: "ingredients", icon: Carrot },
  { label: "Rankings", value: "ranking", icon: Award },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption; icon: typeof Flame }> = [
  { label: "Default Order", value: SORT_OPTION_VALUES.DEFAULT_ORDER, icon: ListOrdered },
  { label: "Highest Protein", value: SORT_OPTION_VALUES.HIGHEST_PROTEIN, icon: Flame },
  { label: "Lowest Calories", value: SORT_OPTION_VALUES.LOWEST_CALORIES, icon: Leaf },
  { label: "Best Protein Score", value: SORT_OPTION_VALUES.BEST_RATIO, icon: Scale },
];

// Single source of truth for "how many filters are active" — reused for both
// the applied count (closed Filters trigger, everywhere it's shown) and the
// live draft count (open filter modal/drawer, before Apply) so the two
// derivations never drift apart from hand-rolled duplicate logic. A
// caloriesMax equal to the range's own max is treated as "not really
// filtering" either way.
function countActiveFilters(candidate: Filters, defaultCaloriesMax: number) {
  const hasCalories = candidate.caloriesMax !== undefined && candidate.caloriesMax !== defaultCaloriesMax;
  return (candidate.proteinMin ? 1 : 0) + (hasCalories ? 1 : 0);
}

export function FilterChips({
  filters,
  onClearProtein,
  onClearCalories,
  onClearAll,
  withMargin = true,
  // Single non-wrapping row that scrolls horizontally instead of wrapping —
  // used on mobile/tablet where the fixed category strip has no room to
  // grow taller. Desktop keeps the default wrap-and-right-align behavior,
  // since it has the width to spare and wants to line up under Sort/Filters.
  scrollable = false,
  // Opens the mobile controls drawer straight to its Filters section — a
  // trailing, always-visible control pinned at the far right of the row
  // (never inside the scrollable chip area) so it stays reachable no matter
  // how far the chips scroll. Desktop never passes this: its persistent
  // Filters button above already opens the same editor, so a second icon
  // here would be redundant.
  onEditFilters,
}: {
  filters: Filters;
  onClearProtein: () => void;
  onClearCalories: () => void;
  onClearAll: () => void;
  withMargin?: boolean;
  scrollable?: boolean;
  onEditFilters?: () => void;
}) {
  return (
    <div className={`${withMargin ? "mt-2.5" : "mt-0"} flex w-full items-center justify-end gap-2`}>
      <div
        className={`flex min-w-0 items-center gap-2 ${
          scrollable ? "flex-nowrap overflow-x-auto hide-scrollbar" : "flex-wrap justify-end"
        }`}
      >
        {filters.proteinMin ? (
          <FilterChip
            onClick={onClearProtein}
            aria-label={`Remove filter: protein ${filters.proteinMin}g+`}
            className="shrink-0 bg-black/5 px-2.5 py-1 text-xs"
          >
            <span>Protein {filters.proteinMin}g+</span>
            <span className="ml-0.5 text-slate-500" aria-hidden="true">✕</span>
          </FilterChip>
        ) : null}
        {filters.caloriesMax ? (
          <FilterChip
            onClick={onClearCalories}
            aria-label={`Remove filter: under ${filters.caloriesMax} calories`}
            className="shrink-0 bg-black/5 px-2.5 py-1 text-xs"
          >
            <span>Under {filters.caloriesMax} cal</span>
            <span className="ml-0.5 text-slate-500" aria-hidden="true">✕</span>
          </FilterChip>
        ) : null}
        {(filters.proteinMin || filters.caloriesMax) ? (
          <FilterChip onClick={onClearAll} className="shrink-0 px-2.5 py-1 text-xs">
            Clear All
          </FilterChip>
        ) : null}
      </div>
      {onEditFilters ? (
        <button
          type="button"
          onClick={onEditFilters}
          aria-label="Edit filters"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.3} />
        </button>
      ) : null}
    </div>
  );
}

export default function ControlsRow({
  view,
  onChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  proteinOptions = MEAL_PROTEIN_OPTIONS,
  wrapperId,
  calorieBounds,
  sourceItems,
  rankedChildSelections,
  isRankingView,
  hideViewSelector = false,
  showMobileTrigger = true,
  onMobileDrawerOpenReady,
  onMobileFiltersDrawerOpenReady,
  onMobileDrawerOpenChange,
  mobileEntreeOptions,
  mobileDrawerHeaderTitle,
  mobileDrawerHeaderLogoSrc,
}: {
  view: ViewOption;
  onChange: (view: ViewOption) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  // Preset protein-minimum chip values — defaults to the meal-level scale.
  // Callers filtering individual Build Your Own ingredients (which rarely
  // clear the meal-level thresholds) pass INGREDIENT_PROTEIN_OPTIONS instead.
  proteinOptions?: number[];
  wrapperId?: string;
  calorieBounds: {
    min: number;
    max: number;
  };
  // The same view-eligible item collection (and ranking-category selection)
  // useRestaurantMenuControls already computes for the page itself — reused
  // here, via the same filterMenuItems function, to preview per-threshold
  // and live draft result counts instead of recomputing eligibility rules.
  // Callers narrow this to whatever subset is currently on screen (e.g. a
  // category-filtered "All Ingredients" view) so chip counts never reflect
  // a broader set than what the user is actually looking at.
  sourceItems: MenuItem[];
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  isRankingView: boolean;
  hideViewSelector?: boolean;
  showMobileTrigger?: boolean;
  onMobileDrawerOpenReady?: (openDrawer: () => void) => void;
  // Same drawer, but scrolled straight to the Filters section once open —
  // for a caller-supplied "Edit filters" control (the active-filter row)
  // rather than a generic "open controls" entry point.
  onMobileFiltersDrawerOpenReady?: (openDrawerToFilters: () => void) => void;
  // Lets a caller supplying its own hamburger trigger (StickyRestaurantBar)
  // reflect this drawer's open/closed state on that button, since the
  // drawer's own open state otherwise lives entirely inside this component.
  onMobileDrawerOpenChange?: (isOpen: boolean) => void;
  mobileEntreeOptions?: Array<{
    key: string;
    label: string;
    image?: string;
    selected?: boolean;
    onSelect: () => void;
    // Visually separates a trailing utility action (e.g. "View All
    // Ingredients") from the real entrée options above it — not itself
    // another entrée choice.
    showDividerBefore?: boolean;
  }>;
  mobileDrawerHeaderTitle?: string;
  mobileDrawerHeaderLogoSrc?: string;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isViewSectionOpen, setIsViewSectionOpen] = useState(true);
  const [isSortSectionOpen, setIsSortSectionOpen] = useState(true);
  const [isFiltersSectionOpen, setIsFiltersSectionOpen] = useState(true);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [hoveredSortOption, setHoveredSortOption] = useState<SortOption | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const filtersSectionRef = useRef<HTMLDivElement>(null);
  const filtersDialogResetButtonRef = useRef<HTMLButtonElement>(null);

  const visibleSortOptions = useMemo(
    () =>
      view === "ranking"
        ? SORT_OPTIONS.filter((option) => option.value !== SORT_OPTION_VALUES.DEFAULT_ORDER)
        : SORT_OPTIONS,
    [view]
  );
  const currentSortOption = useMemo(
    () => visibleSortOptions.find((option) => option.value === sort) ?? visibleSortOptions[0],
    [sort, visibleSortOptions]
  );

  const defaultCaloriesMax = calorieBounds.max;

  const openFilters = () => {
    setDraftFilters({
      ...filters,
      caloriesMax: filters.caloriesMax ?? defaultCaloriesMax,
    });
    setIsFiltersOpen(true);
  };

  const openMobileDrawer = useCallback(() => {
    setDraftFilters({
      ...filters,
      caloriesMax: filters.caloriesMax ?? defaultCaloriesMax,
    });
    setIsViewSectionOpen(true);
    setIsSortSectionOpen(true);
    setIsFiltersSectionOpen(true);
    setIsMobileDrawerOpen(true);
  }, [defaultCaloriesMax, filters]);

  // Same drawer as above, plus a scroll straight to the Filters section —
  // used by the active-filter row's "Edit filters" control so it lands on
  // the relevant section instead of the top of the drawer.
  const openMobileDrawerToFilters = useCallback(() => {
    openMobileDrawer();
    requestAnimationFrame(() => {
      filtersSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, [openMobileDrawer]);

  const applyFilters = () => {
    const nextFilters = { ...draftFilters };
    if (nextFilters.caloriesMax === defaultCaloriesMax) {
      nextFilters.caloriesMax = undefined;
    }

    onFiltersChange(nextFilters);
    setIsFiltersOpen(false);
    setIsMobileDrawerOpen(false);
  };

  const { hasActiveFilters, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  // Reflects the currently applied filters — for the closed Filters
  // trigger, wherever it's shown. Never derived from draft edits.
  const appliedActiveFilterCount = countActiveFilters(filters, defaultCaloriesMax);

  const closeFilters = () => {
    setIsFiltersOpen(false);
    setIsMobileDrawerOpen(false);
  };

  // The desktop filters dialog declares `role="dialog" aria-modal="true"` —
  // Escape closes it, opening moves focus into it (Reset, its first
  // focusable control), and closing restores focus to whatever opened it.
  // Same pattern as CartClearConfirmationDialog/ItemRouteModal.
  useEffect(() => {
    if (!isFiltersOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    filtersDialogResetButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFiltersOpen(false);
        setIsMobileDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isFiltersOpen]);

  const handleResetFilters = () => {
    setDraftFilters({ caloriesMax: defaultCaloriesMax });
    resetFilters();
  };

  // Live count of the *draft* panel state — recomputed every render off
  // draftFilters, so it updates immediately as protein/calories change,
  // with no dependency on the previously applied filters.
  const draftActiveFilterCount = countActiveFilters(draftFilters, defaultCaloriesMax);
  const hasDraftFilters = draftActiveFilterCount > 0;

  // Drives the desktop modal's custom-rendered slider fill (see .calorie-range
  // in globals.css) — computed here rather than relying on native
  // accent-color rendering, which can't have its hover chrome suppressed.
  const calorieRangeSpan = calorieBounds.max - calorieBounds.min;
  const desktopCalorieFillPercent =
    calorieRangeSpan > 0
      ? (((draftFilters.caloriesMax ?? defaultCaloriesMax) - calorieBounds.min) / calorieRangeSpan) * 100
      : 0;

  const draftCaloriesMax = draftFilters.caloriesMax ?? defaultCaloriesMax;

  // Reuses the exact same filterMenuItems the page itself uses to render
  // results — never a parallel counting implementation — so these previews
  // can't silently drift from what Apply will actually show.
  const countMatchingItems = useCallback(
    (proteinMin: number | undefined, caloriesMax: number | undefined) =>
      filterMenuItems({
        items: sourceItems,
        filters: { proteinMin, caloriesMax },
        searchTerms: [],
        rankedChildSelections,
        isRankingView,
      }).length,
    [sourceItems, rankedChildSelections, isRankingView]
  );

  // Per-chip "what if this threshold were selected" preview — always
  // evaluated against the *current* draft calorie value, independently of
  // whichever protein option (if any) is currently selected, so one chip's
  // count is never chained through another's selection.
  const proteinOptionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    proteinOptions.forEach((value) => {
      counts.set(value, countMatchingItems(value, draftCaloriesMax));
    });
    return counts;
  }, [countMatchingItems, draftCaloriesMax, proteinOptions]);

  // Live count for the full current draft combination — drives the primary
  // action's label ("Show N items"), not just the count of active filters.
  const draftMatchingItemCount = useMemo(
    () => countMatchingItems(draftFilters.proteinMin, draftCaloriesMax),
    [countMatchingItems, draftFilters.proteinMin, draftCaloriesMax]
  );
  const draftMatchLabel =
    draftMatchingItemCount === 0
      ? "No matching items"
      : `Show ${draftMatchingItemCount} item${draftMatchingItemCount === 1 ? "" : "s"}`;

  // Shared by both the desktop modal's and mobile drawer's protein chips so
  // the two surfaces can never disagree on a count, disabled state, or
  // accessible label for the same threshold.
  const getProteinChipMeta = (value: number, isActive: boolean) => {
    const count = proteinOptionCounts.get(value) ?? 0;
    return {
      count,
      // A zero-result option that's already selected must stay interactive
      // (Reset/re-selecting another option still needs to reach it) rather
      // than becoming a dead end.
      isDisabled: count === 0 && !isActive,
      ariaLabel: `${value} grams or more protein, ${count} matching item${count === 1 ? "" : "s"}`,
    };
  };

  useEffect(() => {
    onMobileDrawerOpenReady?.(openMobileDrawer);
  }, [onMobileDrawerOpenReady, openMobileDrawer]);

  useEffect(() => {
    onMobileFiltersDrawerOpenReady?.(openMobileDrawerToFilters);
  }, [onMobileFiltersDrawerOpenReady, openMobileDrawerToFilters]);

  useEffect(() => {
    onMobileDrawerOpenChange?.(isMobileDrawerOpen);
  }, [onMobileDrawerOpenChange, isMobileDrawerOpen]);

  const sectionHeadingClassName = "text-xs font-semibold uppercase tracking-wide text-slate-400";
  const chevronClassName = "h-3.5 w-3.5 text-slate-400 transition-transform";
  const sectionDividerClassName = "border-t border-slate-200/70";
  const optionRowClassName = (isActive: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
      isActive
        ? "border border-transparent bg-accent-strong text-white"
        : "border border-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100"
    }`;
  // Shared by the View and Sort sections only (never Entree) so both read
  // as the same reusable row component — fully rounded selected pill,
  // identical geometry whether active or inactive so toggling selection
  // never shifts the row's shape.
  const selectableRowClassName = (isActive: boolean) =>
    `flex items-center gap-2.5 rounded-full px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
      isActive
        ? "bg-accent-strong text-white hover:brightness-95 active:brightness-90"
        : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
    }`;

  const controlsContent = (
    <div className="space-y-6">
      {mobileEntreeOptions?.length ? (
        <section className="space-y-2">
          <p className={sectionHeadingClassName}>Entree</p>
          <div className="space-y-1 rounded-xl bg-slate-100 p-1.5">
            {mobileEntreeOptions.map((option) => (
              <div key={option.key}>
                {option.showDividerBefore ? (
                  <div className="my-1 border-t border-black/10" aria-hidden="true" />
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    option.onSelect();
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full ${optionRowClassName(Boolean(option.selected))}`}
                >
                  {option.image ? (
                    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                      <Image src={option.image} alt={option.label} fill className="object-cover" />
                    </span>
                  ) : option.key === "choose-entree" ? (
                    <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  ) : option.key === "view-all-ingredients" ? (
                    <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  ) : null}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.selected ? <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={2.5} /> : null}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {hideViewSelector ? null : (
        <>
          <section className="space-y-2">
            <button type="button" onClick={() => setIsViewSectionOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
              <span className={sectionHeadingClassName}>View</span>
              <ChevronDown className={`${chevronClassName} ${isViewSectionOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
            </button>
            {isViewSectionOpen ? (
              <div className="grid gap-1">
                {VIEW_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = option.value === view;
                  return (
                    <button key={option.value} type="button" onClick={() => {
                      onChange(option.value);
                      setIsMobileDrawerOpen(false);
                    }} className={selectableRowClassName(isActive)}>
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} strokeWidth={2.2} />
                      <span className="flex-1">{option.label}</span>
                      {isActive ? <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={2.5} /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
          <div className={sectionDividerClassName} aria-hidden="true" />
        </>
      )}
      <section className="space-y-2">
        <button type="button" onClick={() => setIsSortSectionOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
          <span className={sectionHeadingClassName}>Sort</span>
          <ChevronDown className={`${chevronClassName} ${isSortSectionOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
        </button>
        {isSortSectionOpen ? (
          <div className="grid gap-1">
            {visibleSortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = option.value === sort;
              return (
                <button key={option.value} type="button" onClick={() => {
                  onSortChange(option.value);
                  setIsMobileDrawerOpen(false);
                }} className={selectableRowClassName(isActive)}>
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} strokeWidth={2.2} />
                  <span className="flex-1">{option.label}</span>
                  {isActive ? <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={2.5} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
      <div className={sectionDividerClassName} aria-hidden="true" />
      <section ref={filtersSectionRef} className="space-y-3">
        <button type="button" onClick={() => setIsFiltersSectionOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
          <span className="inline-flex items-center gap-2">
            <span className={sectionHeadingClassName}>Filters</span>
            {/* Live draft count — updates immediately as protein/calories
                change in this panel, before Apply. The closed trigger's
                badge (appliedActiveFilterCount) is a separate derivation
                and intentionally doesn't move until Apply is pressed. */}
            {draftActiveFilterCount > 0 ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-soft px-1 text-[10px] font-bold text-accent-strong">
                {draftActiveFilterCount}
              </span>
            ) : null}
          </span>
          <ChevronDown className={`${chevronClassName} ${isFiltersSectionOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
        </button>
        {isFiltersSectionOpen ? (
          <>
            <div>
              <div className="mb-2 text-sm font-semibold text-black/80">Protein minimum</div>
              <div className="flex flex-wrap gap-2">
                {proteinOptions.map((value) => {
                  const isActive = draftFilters.proteinMin === value;
                  const { count, isDisabled, ariaLabel } = getProteinChipMeta(value, isActive);
                  return (
                    <FilterChip
                      key={value}
                      active={isActive}
                      disabled={isDisabled}
                      aria-label={ariaLabel}
                      onClick={() => setDraftFilters((prev) => ({ ...prev, proteinMin: isActive ? undefined : value }))}
                    >
                      <span>{value}g+</span>
                      <span className={`ml-1 font-normal ${isActive ? "text-white/70" : "text-slate-400"}`}>
                        · {count}
                      </span>
                    </FilterChip>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-black/80">Calories max: {draftFilters.caloriesMax ?? defaultCaloriesMax}</div>
              <input
                type="range"
                min={calorieBounds.min}
                max={calorieBounds.max}
                step={10}
                value={draftFilters.caloriesMax ?? defaultCaloriesMax}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, caloriesMax: Number(event.target.value) }))}
                className="w-full cursor-pointer accent-accent hover:accent-accent-strong active:accent-accent-strong focus-visible:accent-accent-strong"
              />
              <div className="mt-1 flex justify-between text-xs font-semibold text-black/60">
                <span>{calorieBounds.min}</span>
                <span>{calorieBounds.max}</span>
              </div>
            </div>
            {hasDraftFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-sm font-semibold text-black/55 underline-offset-4 transition hover:text-black/80 hover:underline"
              >
                Clear Filters
              </button>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );

  const controlsFooter = (
    <div className="grid grid-cols-2 gap-2">
      <AppButton
        variant="secondary"
        size="md"
        onClick={closeFilters}
        className="border-transparent! bg-transparent! text-slate-500! hover:bg-slate-100! active:bg-slate-200!"
      >
        Cancel
      </AppButton>
      <AppButton
        size="md"
        onClick={applyFilters}
        disabled={draftMatchingItemCount === 0}
        // `!` forces these past AppButton's `primary` variant (solid
        // black) — without it, Tailwind's build-order cascade can leave
        // `bg-black` from the variant winning over `bg-accent` here even
        // though this className is applied second. `min-w-0` lets the
        // label span below actually shrink instead of forcing this 50%-wide
        // grid cell wider than the drawer on narrow phones once the item
        // count hits 3 digits.
        className="border-accent! bg-accent! font-bold text-white! hover:bg-accent-strong! active:bg-accent-strong! min-w-0"
        aria-live="polite"
      >
        <span className="min-w-0 truncate">{draftMatchLabel}</span>
      </AppButton>
    </div>
  );

  const mobileControlsDrawer = (
    <MobileNavDrawer
      isOpen={isMobileDrawerOpen}
      onClose={() => setIsMobileDrawerOpen(false)}
      showControls
      defaultTab="controls"
      controlsContent={controlsContent}
      controlsFooter={controlsFooter}
      headerTitle={mobileDrawerHeaderTitle}
      headerLogoSrc={mobileDrawerHeaderLogoSrc}
    />
  );

  const filtersDialog = isFiltersOpen ? (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4" onClick={() => setIsFiltersOpen(false)}>
      <div className="max-h-[calc(100vh-1rem)] w-full max-w-[520px] overflow-y-auto rounded-[20px] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.2)] sm:max-h-[calc(100vh-2rem)] sm:p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-xl font-bold">Filters</h3>
          {/* Live draft count, same derivation and semantics as the mobile
              drawer's heading badge — see draftActiveFilterCount. */}
          {draftActiveFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-xs font-bold text-accent-strong">
              {draftActiveFilterCount}
            </span>
          ) : null}
        </div>
        <div className="grid gap-4">
          <div>
            <div className="mb-2 font-semibold">Protein minimum</div>
            <div className="flex flex-wrap gap-2">
              {proteinOptions.map((value) => {
                const isActive = draftFilters.proteinMin === value;
                const { count, isDisabled, ariaLabel } = getProteinChipMeta(value, isActive);
                return (
                  <FilterChip
                    key={value}
                    active={isActive}
                    disabled={isDisabled}
                    aria-label={ariaLabel}
                    onClick={() => setDraftFilters((prev) => ({ ...prev, proteinMin: value }))}
                  >
                    <span>{value}g+</span>
                    <span className={`ml-1 font-normal ${isActive ? "text-white/70" : "text-slate-400"}`}>
                      · {count}
                    </span>
                  </FilterChip>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 font-semibold">Calories max: {draftFilters.caloriesMax ?? defaultCaloriesMax}</div>
            <div className="grid gap-2">
              <input
                type="range"
                min={calorieBounds.min}
                max={calorieBounds.max}
                step={10}
                value={draftFilters.caloriesMax ?? defaultCaloriesMax}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraftFilters((prev) => ({ ...prev, caloriesMax: value }));
                }}
                className="calorie-range"
                style={
                  {
                    "--range-fill-percent": `${desktopCalorieFillPercent}%`,
                  } as CSSProperties
                }
              />
              <div className="flex justify-between text-xs font-semibold text-black/60">
                <span>{calorieBounds.min}</span>
                <span>{calorieBounds.max}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <AppButton ref={filtersDialogResetButtonRef} variant="secondary" size="md" onClick={handleResetFilters}>
            Reset
          </AppButton>
          <AppButton
            size="md"
            onClick={applyFilters}
            disabled={draftMatchingItemCount === 0}
            className="border-accent! bg-accent! font-bold text-white! hover:bg-accent-strong! active:bg-accent-strong! whitespace-nowrap"
            aria-live="polite"
          >
            {draftMatchLabel}
          </AppButton>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div id={wrapperId} className="grid gap-2 overflow-visible">
        {showMobileTrigger ? (
          <div className="lg:hidden">
            <AppButton variant="secondary" size="md" onClick={openMobileDrawer} className="px-[14px] text-black/85">
              <Menu className="h-4 w-4" strokeWidth={2.5} />
              Controls
            </AppButton>
          </div>
        ) : null}

        <div className="hidden min-w-0 flex-nowrap items-center gap-2.5 lg:flex">
          {hideViewSelector ? null : <ViewTabs options={VIEW_OPTIONS} value={view} onSelect={onChange} />}

          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            <SortSelector
              options={visibleSortOptions}
              value={sort}
              currentOption={currentSortOption}
              isOpen={isSortOpen}
              hoveredOption={hoveredSortOption}
              menuRef={sortMenuRef}
              onToggleOpen={() => setIsSortOpen((prev) => !prev)}
              onSelect={(nextSort) => {
                onSortChange(nextSort);
                setIsSortOpen(false);
              }}
              onHover={setHoveredSortOption}
              onClose={() => setIsSortOpen(false)}
            />

            <button
              type="button"
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={isFiltersOpen}
              className={pillTriggerClassName({ active: isFiltersOpen || hasActiveFilters })}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2.3} />
              Filters
              {hasActiveFilters ? (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                  {appliedActiveFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {filtersDialog ? (typeof document === "undefined" ? filtersDialog : createPortal(filtersDialog, document.body)) : null}
      {mobileControlsDrawer ? (typeof document === "undefined" ? mobileControlsDrawer : createPortal(mobileControlsDrawer, document.body)) : null}
    </>
  );
}
