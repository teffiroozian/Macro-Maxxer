"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useFilterChipActions } from "./useFilterChipActions";
import { SORT_OPTION_VALUES, type SortOption } from "@/lib/menuSections/sortOptions";

export type ViewOption = "menu" | "ingredients" | "ranking";
export type { SortOption };
export type Filters = {
  proteinMin?: number;
  caloriesMax?: number;
  includeSidesDrinks?: boolean;
  includeLargeShareables?: boolean;
};
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
  X,
  Check,
} from "lucide-react";

const PROTEIN_OPTIONS = [20, 30, 40, 50];

const VIEW_OPTIONS: Array<{ label: string; value: ViewOption; icon: typeof ClipboardList }> = [
  { label: "Menu", value: "menu", icon: ClipboardList },
  { label: "Ingredients", value: "ingredients", icon: Carrot },
  { label: "Ranking", value: "ranking", icon: Award },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption; icon: typeof Flame }> = [
  { label: "Default Order", value: SORT_OPTION_VALUES.DEFAULT_ORDER, icon: ListOrdered },
  { label: "Highest Protein", value: SORT_OPTION_VALUES.HIGHEST_PROTEIN, icon: Flame },
  { label: "Lowest Calories", value: SORT_OPTION_VALUES.LOWEST_CALORIES, icon: Leaf },
  { label: "Best Protein Score", value: SORT_OPTION_VALUES.BEST_RATIO, icon: Scale },
];

export function FilterChips({
  filters,
  onClearProtein,
  onClearCalories,
  onClearAll,
  withMargin = true,
}: {
  filters: Filters;
  onClearProtein: () => void;
  onClearCalories: () => void;
  onClearAll: () => void;
  withMargin?: boolean;
}) {
  return (
    <div className={`${withMargin ? "mt-2.5" : "mt-0"} flex w-full flex-wrap justify-end gap-2`}>
      {filters.proteinMin ? (
        <button type="button" onClick={onClearProtein} className="cursor-pointer rounded-full border border-black/20 bg-black/5 px-2.5 py-1 text-xs font-semibold">
          Protein {filters.proteinMin}g+ ✕
        </button>
      ) : null}
      {filters.caloriesMax ? (
        <button type="button" onClick={onClearCalories} className="cursor-pointer rounded-full border border-black/20 bg-black/5 px-2.5 py-1 text-xs font-semibold">
          Under {filters.caloriesMax} cal ✕
        </button>
      ) : null}
      {(filters.proteinMin || filters.caloriesMax) ? (
        <button type="button" onClick={onClearAll} className="cursor-pointer rounded-full border border-black/20 bg-white px-2.5 py-1 text-xs font-semibold">
          Clear All
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
  showChips = true,
  wrapperId,
  calorieBounds,
  hideViewSelector = false,
}: {
  view: ViewOption;
  onChange: (view: ViewOption) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  showChips?: boolean;
  wrapperId?: string;
  calorieBounds: {
    min: number;
    max: number;
  };
  hideViewSelector?: boolean;
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [hoveredViewOption, setHoveredViewOption] = useState<ViewOption | null>(null);
  const [hoveredSortOption, setHoveredSortOption] = useState<SortOption | null>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!viewMenuRef.current?.contains(target)) {
        setIsViewOpen(false);
      }

      if (!sortMenuRef.current?.contains(target)) {
        setIsSortOpen(false);
      }
    };

    if (isViewOpen || isSortOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isViewOpen, isSortOpen]);

  const currentViewOption = useMemo(
    () => VIEW_OPTIONS.find((option) => option.value === view) ?? VIEW_OPTIONS[0],
    [view]
  );

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

  const openMobileDrawer = () => {
    setDraftFilters({
      ...filters,
      caloriesMax: filters.caloriesMax ?? defaultCaloriesMax,
    });
    setIsMobileDrawerOpen(true);
  };

  const applyFilters = () => {
    const nextFilters = { ...draftFilters };
    if (nextFilters.caloriesMax === defaultCaloriesMax) {
      nextFilters.caloriesMax = undefined;
    }

    onFiltersChange(nextFilters);
    setIsFiltersOpen(false);
    setIsMobileDrawerOpen(false);
  };

  const { hasActiveFilters, clearProteinFilter, clearCaloriesFilter, resetFilters } = useFilterChipActions({
    filters,
    onFiltersChange,
  });

  const handleResetFilters = () => {
    setDraftFilters({ caloriesMax: defaultCaloriesMax });
    resetFilters();
  };



  const mobileControlsDrawer = isMobileDrawerOpen ? (
    <div className="fixed inset-0 z-[210] md:hidden" aria-modal="true" role="dialog">
      <button
        type="button"
        aria-label="Close controls drawer"
        className="absolute inset-0 bg-black/35"
        onClick={() => setIsMobileDrawerOpen(false)}
      />
      <div className="absolute inset-y-0 left-0 flex w-[min(90vw,360px)] flex-col bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-lg font-bold text-black/90">Controls</h3>
          <button type="button" onClick={() => setIsMobileDrawerOpen(false)} className="rounded-full border border-black/15 p-2 text-black/70">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {hideViewSelector ? null : (
            <section className="space-y-2.5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-black/50">View</h4>
              <div className="grid gap-2">
                {VIEW_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = option.value === view;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange(option.value)}
                      className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                        isActive ? "border-black/80 bg-black/85 text-white" : "border-black/15 bg-white text-black/80"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                      <span className="flex-1">{option.label}</span>
                      {isActive ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-black/50">Sort</h4>
            <div className="grid gap-2">
              {visibleSortOptions.map((option) => {
                const Icon = option.icon;
                const isActive = option.value === sort;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSortChange(option.value)}
                    className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                      isActive ? "border-black/80 bg-black/85 text-white" : "border-black/15 bg-white text-black/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                    <span className="flex-1">{option.label}</span>
                    {isActive ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-black/50">Filters</h4>
            <div>
              <div className="mb-2 text-sm font-semibold text-black/80">Protein minimum</div>
              <div className="flex flex-wrap gap-2">
                {PROTEIN_OPTIONS.map((value) => {
                  const isActive = draftFilters.proteinMin === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, proteinMin: isActive ? undefined : value }))}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        isActive ? "border-black/80 bg-black/85 text-white" : "border-black/20 bg-white text-black/80"
                      }`}
                    >
                      {value}g+
                    </button>
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
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraftFilters((prev) => ({ ...prev, caloriesMax: value }));
                }}
                className="w-full cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-xs font-semibold text-black/60">
                <span>{calorieBounds.min}</span>
                <span>{calorieBounds.max}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-black/10 px-4 py-3">
          <button type="button" onClick={handleResetFilters} className="rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-semibold text-black/80">
            Reset
          </button>
          <button type="button" onClick={applyFilters} className="rounded-full border border-black/80 bg-black/85 px-4 py-2 text-sm font-bold text-white">
            Apply
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const filtersDialog = isFiltersOpen ? (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4" onClick={() => setIsFiltersOpen(false)}>
      <div className="max-h-[calc(100vh-1rem)] w-full max-w-[520px] overflow-y-auto rounded-[20px] bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.2)] sm:max-h-[calc(100vh-2rem)] sm:p-5" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-4 text-xl font-bold">Filters</h3>
        <div className="grid gap-4">
          <div>
            <div className="mb-2 font-semibold">Protein minimum</div>
            <div className="flex flex-wrap gap-2">
              {PROTEIN_OPTIONS.map((value) => {
                const isActive = draftFilters.proteinMin === value;
                return (
                  <button key={value} type="button" onClick={() => setDraftFilters((prev) => ({ ...prev, proteinMin: value }))} className={`cursor-pointer rounded-full border border-black/20 px-3 py-1.5 font-semibold ${isActive ? "bg-black/85 text-white" : "bg-white text-black/80"}`}>
                    {value}g+
                  </button>
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
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-xs font-semibold text-black/60">
                <span>{calorieBounds.min}</span>
                <span>{calorieBounds.max}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button type="button" onClick={handleResetFilters} className="cursor-pointer rounded-full border border-black/20 bg-white px-4 py-2 font-semibold text-black/80">
            Reset
          </button>
          <button type="button" onClick={applyFilters} className="cursor-pointer rounded-full border border-black/80 bg-black/85 px-4 py-2 font-bold text-white">
            Apply
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div id={wrapperId} className="grid gap-2 overflow-visible">
        <div className="md:hidden">
          <button
            type="button"
            onClick={openMobileDrawer}
            className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/85"
          >
            <Menu className="h-4 w-4" strokeWidth={2.5} />
            Controls
          </button>
        </div>

        <div className="hidden min-w-0 flex-nowrap items-center gap-2.5 md:flex">
          {hideViewSelector ? null : (
            <div ref={viewMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsViewOpen((prev) => !prev);
                  setIsSortOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={isViewOpen}
                className="cursor-pointer inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/85"
              >
                <currentViewOption.icon className="h-4 w-4" strokeWidth={2.2} />
                {currentViewOption.label}
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              </button>

              {isViewOpen ? (
                <div role="menu" className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(220px,calc(100vw-2rem))] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                  <div className="grid gap-1">
                    {VIEW_OPTIONS.map((option) => {
                      const isActive = option.value === view;
                      const isHovered = option.value === hoveredViewOption;
                      const Icon = option.icon;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onChange(option.value);
                            setIsViewOpen(false);
                          }}
                          onMouseEnter={() => setHoveredViewOption(option.value)}
                          onMouseLeave={() => setHoveredViewOption(null)}
                          className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] border-none px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                            isActive ? "bg-black/10" : isHovered ? "bg-slate-900/5" : "bg-transparent"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
            <div ref={sortMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsSortOpen((prev) => !prev);
                  setIsViewOpen(false);
                }}
                aria-haspopup="menu"
                aria-expanded={isSortOpen}
                className="cursor-pointer inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/85"
              >
                <currentSortOption.icon className="h-4 w-4" strokeWidth={2.2} />
                {currentSortOption.label}
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              </button>

              {isSortOpen ? (
                <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-20 w-[min(220px,calc(100vw-2rem))] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                  <div className="grid gap-1">
                    {visibleSortOptions.map((option) => {
                      const isActive = option.value === sort;
                      const isHovered = option.value === hoveredSortOption;
                      const Icon = option.icon;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onSortChange(option.value);
                            setIsSortOpen(false);
                          }}
                          onMouseEnter={() => setHoveredSortOption(option.value)}
                          onMouseLeave={() => setHoveredSortOption(null)}
                          className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] border-none px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                            isActive ? "bg-black/10" : isHovered ? "bg-slate-900/5" : "bg-transparent"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openFilters}
              className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[8px] text-sm font-semibold text-black/80 shrink-0"
            >
              Filters
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {hasActiveFilters && showChips ? (
          <>
            <div className="h-px bg-slate-400/50" />
            <FilterChips filters={filters} onClearProtein={clearProteinFilter} onClearCalories={clearCaloriesFilter} onClearAll={resetFilters} withMargin={false} />
          </>
        ) : null}
      </div>

      {filtersDialog ? (typeof document === "undefined" ? filtersDialog : createPortal(filtersDialog, document.body)) : null}
      {mobileControlsDrawer ? (typeof document === "undefined" ? mobileControlsDrawer : createPortal(mobileControlsDrawer, document.body)) : null}
    </>
  );
}
