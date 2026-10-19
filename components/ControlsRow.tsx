"use client";

import type { MenuSizeSelectorControl } from "@/lib/menuSections/menuSizeSelector";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "@/components/ui/AppImage";
import { createPortal } from "react-dom";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

import { RANKING_DEFAULT_SORT, type SortOption } from "@/lib/menuSections/sortOptions";
import { countVariantSettingsChanges, type Filters } from "@/lib/menuSections/filterOptions";
import type { ViewOption } from "@/components/controls/types";
import { getMenuResultCounts } from "@/lib/menuSections/resultCounts";
import { filterMenuItems, type RankedAllFilterKey } from "@/lib/menuSections/filtering";
import type { MenuItem } from "@/types/menu";
import FilterChip from "@/components/ui/FilterChip";
import MenuSizeSelector, { MenuSizeOptions } from "@/components/controls/MenuSizeSelector";
import RankSelector from "@/components/controls/RankSelector";
import RankOptions, { RankSelection } from "@/components/controls/RankOptions";
import EntreeOptions from "@/components/controls/EntreeOptions";
import ResultLayoutToggle from "@/components/controls/ResultLayoutToggle";
import { getCategoryPresets, getSelectedCategoryPreset } from "@/lib/menuSections/categoryPresets";
import { getCategoryLabel } from "@/lib/menuSections/sorting";
import RestaurantFiltersPanel, { SectionHeader } from "@/components/controls/RestaurantFiltersPanel";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import {
  SlidersHorizontal,
  ListFilter,
  ChevronDown,
  ClipboardList,
  Carrot,
  Award,
  LayoutGrid,
} from "lucide-react";


const VIEW_OPTIONS: Array<{ label: string; value: ViewOption; icon: typeof ClipboardList }> = [
  { label: "Menu", value: "menu", icon: ClipboardList },
  { label: "Ingredients", value: "ingredients", icon: Carrot },
  { label: "Rankings", value: "ranking", icon: Award },
];

// Single source of truth for "how many filters are active" — reused for both
// the applied count (closed Filters trigger, everywhere it's shown) and the
// live draft count (open filter modal/drawer, before Apply) so the two
// derivations never drift apart from hand-rolled duplicate logic. A
// caloriesMax equal to the range's own max is treated as "not really
// filtering" either way.
function countActiveFilters(candidate: Filters, defaultCaloriesMax: number) {
  const hasCalories = candidate.caloriesMax !== undefined && candidate.caloriesMax !== defaultCaloriesMax;
  return [
    candidate.proteinMin,
    candidate.proteinScoreMin,
    candidate.carbsMax,
    candidate.fatMax,
    candidate.fiberMin,
    candidate.sodiumMax,
    candidate.sugarMax,
    candidate.categories !== undefined && candidate.categoryPreset !== "all" ? 1 : undefined,
  ].filter((value) => value !== undefined).length + (hasCalories ? 1 : 0) + countVariantSettingsChanges(candidate);
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
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-ring"
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.3} />
        </button>
      ) : null}
    </div>
  );
}

export default function ControlsRow({
  menuSizeControl,
  restaurantId,  view,
  onChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  wrapperId,
  calorieBounds,
  sourceItems,
  visibleItemCount,
  rankedChildSelections,
  isRankingView,
  hideViewSelector = false,
  hideIngredientsView = false,
  showMobileTrigger = true,
  renderMobileDrawer = true,
  onMobileDrawerOpenReady,
  onMobileFiltersDrawerOpenReady,
  onMobileDrawerOpenChange,
  mobileEntreeOptions,
  showResultLayoutToggle = false,
  resultLayout,
  onResultLayoutChange,
  filterRankingCategories = true,
  showInlineMobileControls = false,
}: {
  menuSizeControl?: MenuSizeSelectorControl;
  restaurantId: string;
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
  visibleItemCount?: number;
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  isRankingView: boolean;
  hideViewSelector?: boolean;
  hideIngredientsView?: boolean;
  showMobileTrigger?: boolean;
  renderMobileDrawer?: boolean;
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
  showResultLayoutToggle?: boolean;
  resultLayout: "list" | "grid";
  onResultLayoutChange: (layout: "list" | "grid") => void;
  filterRankingCategories?: boolean;
  showInlineMobileControls?: boolean;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileFocus, setMobileFocus] = useState<"all" | "rank" | "categories" | "nutrition" | "calories" | "protein" | "variants" | "entree" | "size">("all");
  const [rankOpen, setRankOpen] = useState(true);
  const [entreeOpen, setEntreeOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [viewOpen, setViewOpen] = useState(true);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const filtersDialogResetButtonRef = useRef<HTMLButtonElement>(null);

  const defaultCaloriesMax = calorieBounds.max;

  const openFilters = () => {
    setDraftFilters(filters);
    setIsFiltersOpen(true);
  };

  const openMobileDrawer = useCallback(() => {
    setMobileFocus("all");
    setEntreeOpen(false);
    setIsMobileDrawerOpen(true);
  }, []);
  const openMobileDrawerToFilters = openMobileDrawer;

  const applyFilters = () => {
    const nextFilters = { ...draftFilters };
    onFiltersChange(nextFilters);
    setIsFiltersOpen(false);
    setIsMobileDrawerOpen(false);
  };

  // Reflects the currently applied filters — for the closed Filters
  // trigger, wherever it's shown. Never derived from draft edits.
  const appliedActiveFilterCount = countActiveFilters(filters, defaultCaloriesMax);

  // The desktop filters dialog declares `role="dialog" aria-modal="true"` —
  // Escape closes it, opening moves focus into it (Reset, its first
  // focusable control), and closing restores focus to whatever opened it.
  const closeFiltersDialog = useCallback(() => {
    setIsFiltersOpen(false);
    setIsMobileDrawerOpen(false);
  }, []);
  useDialogA11y({
    isOpen: isFiltersOpen,
    onClose: closeFiltersDialog,
    initialFocusRef: filtersDialogResetButtonRef,
  });

  useEffect(() => {
    if (!isFiltersOpen) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isFiltersOpen]);

  // Reuses the exact same filterMenuItems the page itself uses to render
  // results — never a parallel counting implementation — so these previews
  // can't silently drift from what Apply will actually show.
  const menuSizePreference = menuSizeControl?.value;
  const appliedResultCounts = useMemo(
    () => getMenuResultCounts({ items: sourceItems, filters, searchTerms: [], rankedChildSelections, isRankingView, filterRankingCategories, rankingSort: sort, menuSizePreference }),
    [sourceItems, filters, rankedChildSelections, isRankingView, filterRankingCategories, sort, menuSizePreference],
  );
  const totalResultCount = appliedResultCounts.total;

  const fullDraftMatchingItemCount = useMemo(
    () => filterMenuItems({ items: sourceItems, filters: draftFilters, searchTerms: [], rankedChildSelections, isRankingView, filterRankingCategories, rankingSort: sort, menuSizePreference }).length,
    [draftFilters, isRankingView, rankedChildSelections, sourceItems, filterRankingCategories, sort, menuSizePreference],
  );
  const appliedMatchingItemCount = visibleItemCount ?? appliedResultCounts.matching;

  useEffect(() => {
    onMobileDrawerOpenReady?.(openMobileDrawer);
  }, [onMobileDrawerOpenReady, openMobileDrawer]);

  useEffect(() => {
    onMobileFiltersDrawerOpenReady?.(openMobileDrawerToFilters);
  }, [onMobileFiltersDrawerOpenReady, openMobileDrawerToFilters]);

  useEffect(() => {
    onMobileDrawerOpenChange?.(isMobileDrawerOpen);
  }, [onMobileDrawerOpenChange, isMobileDrawerOpen]);

  const mobileCloseRef = useRef<HTMLDivElement>(null);
  const closeMobile = useCallback(() => setIsMobileDrawerOpen(false), []);
  useDialogA11y({ isOpen: isMobileDrawerOpen, onClose: closeMobile, initialFocusRef: mobileCloseRef, lockBodyScroll: true });
  const showMobileSection = (section: string) => mobileFocus === "all" || mobileFocus === section;
  const isBuildYourOwn = restaurantId === "chipotle" || Boolean(mobileEntreeOptions?.length);
  const selectedEntree = mobileEntreeOptions?.find((option) => option.selected);
  const hasVariants = restaurantId !== "chipotle" && sourceItems.some((item) => !item.sourceOnly && item.variants?.length);
  const selectedCategoryPreset = getSelectedCategoryPreset(filters, getCategoryPresets(sourceItems, restaurantId));
  const categoryLabel = selectedCategoryPreset?.label ?? (filters.categories?.length === 1 ? getCategoryLabel(filters.categories[0]) : "Custom");
  const layoutToggle = <ResultLayoutToggle value={resultLayout} onChange={onResultLayoutChange} />;
  const mobileLeading = <>
    {mobileFocus === "all" && isBuildYourOwn && !hideViewSelector ? <section className="border-b border-slate-200">
      <SectionHeader title="View" summary={VIEW_OPTIONS.find((option) => option.value === view)?.label ?? ""} open={viewOpen} onClick={() => setViewOpen(!viewOpen)} />
      {viewOpen ? <div className="grid gap-1 pb-5">{VIEW_OPTIONS.filter((option) => !hideIngredientsView || option.value !== "ingredients").map((option) => {
        const Icon = option.icon;
        const active = view === option.value;
        return <button key={option.value} type="button" aria-pressed={active} onClick={() => onChange(option.value)} className={`flex items-center gap-2.5 rounded-full px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-ring ${active ? "bg-accent-strong text-white hover:brightness-95 active:brightness-90" : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"}`}><Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} strokeWidth={2.2} />{option.label}</button>;
      })}</div> : null}
    </section> : null}
    {showMobileSection("entree") && mobileEntreeOptions?.length ? <section className="border-b border-slate-200">
      {mobileFocus === "all" ? <SectionHeader title="Entree" summary={mobileEntreeOptions.find((option) => option.selected)?.label ?? ""} open={entreeOpen} onClick={() => setEntreeOpen(!entreeOpen)} /> : null}
      {mobileFocus !== "all" || entreeOpen ? <div className="pb-5"><EntreeOptions options={mobileEntreeOptions} mobileGrid /></div> : null}
    </section> : null}
    {showMobileSection("rank") ? <section className="border-b border-slate-200">
      {mobileFocus === "all" ? <SectionHeader title="Rank By" summary="" open={rankOpen} onClick={() => setRankOpen(!rankOpen)} /> : null}
      {mobileFocus !== "all" || rankOpen ? <div role="menu" aria-label="Rank by" className="pb-5"><RankOptions value={sort} onChange={onSortChange} colorful showDefault={!isBuildYourOwn && !isRankingView} /></div> : null}
    </section> : null}
    {showMobileSection("size") && menuSizeControl ? <section className="border-b border-slate-200">
      {mobileFocus === "all" ? <SectionHeader title="Size" summary={menuSizeControl.options.find((option) => option.value === menuSizeControl.value)?.label ?? ""} open={sizeOpen} onClick={() => setSizeOpen(!sizeOpen)} /> : null}
      {mobileFocus !== "all" || sizeOpen ? <div role="menu" aria-label="Menu size" className="pb-5"><MenuSizeOptions {...menuSizeControl} showTitle={false} /></div> : null}
    </section> : null}
  </>;
  const mobileControlsDrawer = isMobileDrawerOpen ? <div role="dialog" aria-modal="true" aria-label={mobileFocus === "all" ? "Filters" : mobileFocus} className="fixed inset-0 z-[200] flex items-end justify-center bg-overlay-scrim pt-[max(1rem,env(safe-area-inset-top))]" onClick={closeMobile} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]'));
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === mobileCloseRef.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><div ref={mobileCloseRef} tabIndex={-1} className="w-full max-w-[720px] outline-none" onClick={(event) => event.stopPropagation()}><RestaurantFiltersPanel restaurantId={restaurantId} items={sourceItems} value={filters} onChange={onFiltersChange} onClose={closeMobile} onApply={closeMobile} matchingCount={appliedMatchingItemCount} resultContext={{ rankingSort: sort, isRankingView, filterRankingCategories, rankedChildSelections, menuSizePreference }} focus={mobileFocus} isMobileSheet headerControls={mobileFocus === "all" && (isRankingView || showResultLayoutToggle) ? layoutToggle : undefined} leadingControls={mobileLeading} showVariants={hasVariants} onReset={mobileFocus === "rank" ? () => onSortChange(RANKING_DEFAULT_SORT) : mobileFocus === "size" ? () => menuSizeControl?.onChange("all-sizes") : mobileFocus === "entree" ? () => mobileEntreeOptions?.find((option) => option.key === "choose-entree")?.onSelect() : undefined} /></div></div> : null;
  const mobilePill = (focus: typeof mobileFocus, label: ReactNode, active = false) => <button key={focus} type="button" aria-label={focus === "all" ? `Filters${appliedActiveFilterCount ? `, ${appliedActiveFilterCount} active` : ""}` : undefined} aria-haspopup="dialog" onClick={() => {
    setMobileFocus(focus);
    if (focus === "rank") setRankOpen(true);
    if (focus === "all") setEntreeOpen(false);
    if (focus === "entree") setEntreeOpen(true);
    if (focus === "size") setSizeOpen(true);
    setIsMobileDrawerOpen(true);
  }} className={pillTriggerClassName({ className: `shrink-0 ${active ? "border-slate-950!" : ""}` })}>
    {focus === "all" ? <><SlidersHorizontal className="h-4 w-4" />{appliedActiveFilterCount > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#047857] px-1 text-[11px] font-bold text-white">{appliedActiveFilterCount}</span> : null}</> : <>{active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> : null}{label}<ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /></>}
  </button>;

  const redesignedFiltersDialog = isFiltersOpen ? (
    <div role="dialog" aria-modal="true" aria-label="Filters" className="fixed inset-0 z-[200] flex items-center justify-center bg-overlay-scrim p-4" onClick={closeFiltersDialog}>
      <div className="w-full max-w-[720px]" onClick={(event) => event.stopPropagation()}>
        <RestaurantFiltersPanel
          restaurantId={restaurantId}
          items={sourceItems}
          value={draftFilters}
          onChange={setDraftFilters}
          onClose={closeFiltersDialog}
          onApply={applyFilters}
          matchingCount={fullDraftMatchingItemCount}
          resultContext={{ rankingSort: sort, isRankingView, filterRankingCategories, rankedChildSelections, menuSizePreference }}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <div id={wrapperId} className="grid gap-2 overflow-visible">
        {showMobileTrigger || showInlineMobileControls ? <div className={`flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain hide-scrollbar ${IS_CAPACITOR_BUILD ? "" : "lg:hidden"}`} aria-label="Menu controls">
          {mobilePill("all", null, appliedActiveFilterCount > 0)}
          {mobileEntreeOptions?.length ? mobilePill("entree", <>{selectedEntree?.image ? <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white"><Image src={selectedEntree.image} alt="" fill className="object-cover" /></span> : <LayoutGrid className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.2} />}{selectedEntree?.label ?? "Entree"}</>) : null}
          {mobilePill("rank", <RankSelection value={sort} colorful />)}
          {!isBuildYourOwn ? mobilePill("categories", categoryLabel) : null}
          {mobilePill("calories", filters.caloriesMax === undefined ? "Calories" : `≤${filters.caloriesMax} cal`, filters.caloriesMax !== undefined)}
          {mobilePill("protein", filters.proteinMin === undefined ? "Protein" : `≥${filters.proteinMin}g protein`, filters.proteinMin !== undefined)}
          {hasVariants ? mobilePill("variants", "Variants", countVariantSettingsChanges(filters) > 0) : null}
        </div> : null}

        <div className={IS_CAPACITOR_BUILD ? "hidden" : `hidden lg:flex min-w-0 flex-nowrap items-center gap-2`}>
          <div className="flex shrink-0 items-center gap-2">
            <RankSelector value={sort} isOpen={isSortOpen} onOpenChange={setIsSortOpen} onChange={onSortChange} />
            {menuSizeControl ? <MenuSizeSelector {...menuSizeControl} /> : null}

            <button
              type="button"
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={isFiltersOpen}
              className={pillTriggerClassName({ className: isFiltersOpen ? "border-slate-900" : "" })}
            >
              <ListFilter className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              Filters
              {appliedActiveFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                  {appliedActiveFilterCount}
                </span>
              ) : null}
            </button>
            <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
            <span className="whitespace-nowrap px-1 text-sm text-slate-600">
              <strong className="font-bold text-slate-950">{appliedMatchingItemCount}</strong> of {totalResultCount} items
            </span>
            {isRankingView || showResultLayoutToggle ? layoutToggle : null}
          </div>
        </div>
      </div>

      {redesignedFiltersDialog ? (typeof document === "undefined" ? redesignedFiltersDialog : createPortal(redesignedFiltersDialog, document.body)) : null}
      {renderMobileDrawer && mobileControlsDrawer ? (typeof document === "undefined" ? mobileControlsDrawer : createPortal(mobileControlsDrawer, document.body)) : null}
    </>
  );
}
