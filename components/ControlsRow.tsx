"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ViewOption = "menu" | "ingredients" | "ranking";
export type SortOption =
  | "default-order"
  | "highest-protein"
  | "best-ratio"
  | "lowest-calories";
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
} from "lucide-react";

const PROTEIN_OPTIONS = [20, 30, 40, 50];

const VIEW_OPTIONS: Array<{ label: string; value: ViewOption; icon: typeof ClipboardList }> = [
  { label: "Menu", value: "menu", icon: ClipboardList },
  { label: "Ingredients", value: "ingredients", icon: Carrot },
  { label: "Ranking", value: "ranking", icon: Award },
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption; icon: typeof Flame }> = [
  { label: "Default Order", value: "default-order", icon: ListOrdered },
  { label: "Highest Protein", value: "highest-protein", icon: Flame },
  { label: "Lowest Calories", value: "lowest-calories", icon: Leaf },
  { label: "Best Ratio", value: "best-ratio", icon: Scale },
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

  const currentSortOption = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0],
    [sort]
  );

  const defaultCaloriesMax = calorieBounds.max;

  const openFilters = () => {
    setDraftFilters({
      ...filters,
      caloriesMax: filters.caloriesMax ?? defaultCaloriesMax,
    });
    setIsFiltersOpen(true);
  };

  const applyFilters = () => {
    const nextFilters = { ...draftFilters };
    if (nextFilters.caloriesMax === defaultCaloriesMax) {
      nextFilters.caloriesMax = undefined;
    }

    onFiltersChange(nextFilters);
    setIsFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters({ caloriesMax: defaultCaloriesMax });
    onFiltersChange({});
  };

  const clearProteinFilter = () => {
    onFiltersChange({ ...filters, proteinMin: undefined });
  };

  const clearCaloriesFilter = () => {
    onFiltersChange({ ...filters, caloriesMax: undefined });
  };

  const filtersDialog = isFiltersOpen ? (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4" onClick={() => setIsFiltersOpen(false)}>
      <div className="w-full max-w-[520px] rounded-[20px] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)]" onClick={(event) => event.stopPropagation()}>
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
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={resetFilters} className="cursor-pointer rounded-full border border-black/20 bg-white px-4 py-2 font-semibold text-black/80">
            Reset
          </button>
          <button type="button" onClick={applyFilters} className="cursor-pointer rounded-full border border-black/80 bg-black/85 px-4 py-2 font-bold text-white">
            Apply
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const hasActiveFilters = Boolean(filters.proteinMin || filters.caloriesMax);

  return (
    <>
      <div id={wrapperId} className="grid gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2.5">
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
                className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[6px] font-semibold text-black/85"
              >
                <currentViewOption.icon className="h-4 w-4" strokeWidth={2.2} />
                {currentViewOption.label}
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              </button>

              {isViewOpen ? (
                <div role="menu" className="absolute left-0 top-[calc(100%+8px)] z-20 w-[220px] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
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

          <div ref={sortMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsViewOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={isSortOpen}
              className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[6px] font-semibold text-black/85"
            >
              <currentSortOption.icon className="h-4 w-4" strokeWidth={2.2} />
              {currentSortOption.label}
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {isSortOpen ? (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-20 w-[220px] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                <div className="grid gap-1">
                  {SORT_OPTIONS.map((option) => {
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
            className="cursor-pointer inline-flex items-center gap-2 rounded-full border border-black/20 bg-white px-[14px] py-[6px] font-semibold text-black/80 whitespace-nowrap shrink-0"
          >
            Filters
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {hasActiveFilters && showChips ? (
          <>
            <div className="h-px bg-slate-400/50" />
            <FilterChips filters={filters} onClearProtein={clearProteinFilter} onClearCalories={clearCaloriesFilter} onClearAll={resetFilters} withMargin={false} />
          </>
        ) : null}
      </div>

      {filtersDialog ? (typeof document === "undefined" ? filtersDialog : createPortal(filtersDialog, document.body)) : null}
    </>
  );
}
