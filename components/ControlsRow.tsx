"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ViewOption = "menu" | "ingredients";
export type SortOption = "highest-protein" | "best-ratio" | "lowest-calories";
export type Filters = {
  proteinMin?: number;
  caloriesMax?: number;
  includeSidesDrinks?: boolean;
  includeLargeShareables?: boolean;
};
import { SlidersHorizontal } from "lucide-react";

const PROTEIN_OPTIONS = [20, 30, 40, 50];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Highest Protein", value: "highest-protein" },
  { label: "Lowest Calories", value: "lowest-calories" },
  { label: "Best Ratio", value: "best-ratio" },
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
    <div style={{ width: "100%", marginTop: withMargin ? 10 : 0, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
      {filters.proteinMin ? (
        <button type="button" onClick={onClearProtein} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.05)", fontWeight: 600, fontSize: 12 }}>
          Protein {filters.proteinMin}g+ ✕
        </button>
      ) : null}
      {filters.caloriesMax ? (
        <button type="button" onClick={onClearCalories} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "rgba(0,0,0,0.05)", fontWeight: 600, fontSize: 12 }}>
          Under {filters.caloriesMax} cal ✕
        </button>
      ) : null}
      {(filters.proteinMin || filters.caloriesMax) ? (
        <button type="button" onClick={onClearAll} style={{ padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "white", fontWeight: 600, fontSize: 12 }}>
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
  entireMenu = false,
  onEntireMenuChange,
  calorieBounds,
}: {
  view: ViewOption;
  onChange: (view: ViewOption) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  showChips?: boolean;
  wrapperId?: string;
  entireMenu?: boolean;
  onEntireMenuChange?: (checked: boolean) => void;
  calorieBounds: {
    min: number;
    max: number;
  };
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [hoveredSortOption, setHoveredSortOption] = useState<SortOption | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    if (isSortOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isSortOpen]);

  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Highest Protein",
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
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "center", alignItems: "flex-end", padding: 16, zIndex: 50 }} onClick={() => setIsFiltersOpen(false)}>
      <div style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 20, padding: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }} onClick={(event) => event.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Filters</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Protein minimum</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROTEIN_OPTIONS.map((value) => {
                const isActive = draftFilters.proteinMin === value;
                return (
                  <button key={value} type="button" onClick={() => setDraftFilters((prev) => ({ ...prev, proteinMin: value }))} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: isActive ? "rgba(0,0,0,0.85)" : "white", color: isActive ? "white" : "rgba(0,0,0,0.8)", fontWeight: 600, cursor: "pointer" }}>
                    {value}g+
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Calories max: {draftFilters.caloriesMax ?? defaultCaloriesMax}</div>
            <div style={{ display: "grid", gap: 8 }}>
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
                style={{ width: "100%", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(0,0,0,0.6)", fontWeight: 600 }}>
                <span>{calorieBounds.min}</span>
                <span>{calorieBounds.max}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={resetFilters} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "white", color: "rgba(0,0,0,0.8)", fontWeight: 600, cursor: "pointer" }}>
            Reset
          </button>
          <button type="button" onClick={applyFilters} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.8)", background: "rgba(0,0,0,0.85)", color: "white", fontWeight: 700, cursor: "pointer" }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const hasActiveFilters = Boolean(filters.proteinMin || filters.caloriesMax);

  return (
    <>
      <div id={wrapperId} style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            role="group"
            aria-label="View"
            style={{ display: "inline-flex", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", padding: 2, background: "white" }}
          >
            {([
              { label: "Menu", value: "menu" },
              { label: "Ingredients", value: "ingredients" },
            ] as const).map((option) => {
              const isActive = view === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  aria-pressed={isActive}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "none",
                    background: isActive ? "rgba(15,23,42,0.9)" : "transparent",
                    color: isActive ? "white" : "rgba(0,0,0,0.75)",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div ref={sortMenuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isSortOpen}
              style={{ padding: "6px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "white", color: "rgba(0,0,0,0.85)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {sortLabel} ▾
            </button>

            {isSortOpen ? (
              <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 220, borderRadius: 14, border: "1px solid rgba(0,0,0,0.15)", background: "white", boxShadow: "0 12px 28px rgba(0,0,0,0.12)", padding: 8, zIndex: 20 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  {SORT_OPTIONS.map((option) => {
                    const isActive = option.value === sort;
                    const isHovered = option.value === hoveredSortOption;

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
                        style={{
                          textAlign: "left",
                          border: "none",
                          background: isActive
                            ? "rgba(0,0,0,0.1)"
                            : isHovered
                              ? "rgba(15,23,42,0.06)"
                              : "transparent",
                          color: "rgba(0,0,0,0.88)",
                          padding: "8px 10px",
                          borderRadius: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "background 120ms ease",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ height: 1, background: "rgba(0,0,0,0.12)", margin: "8px 0" }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={entireMenu} onChange={(event) => onEntireMenuChange?.(event.target.checked)} />
                  Entire menu
                </label>
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
            <div style={{ height: 1, background: "rgba(148, 163, 184, 0.5)" }} />
            <FilterChips filters={filters} onClearProtein={clearProteinFilter} onClearCalories={clearCaloriesFilter} onClearAll={resetFilters} withMargin={false} />
          </>
        ) : null}
      </div>

      {filtersDialog ? (typeof document === "undefined" ? filtersDialog : createPortal(filtersDialog, document.body)) : null}
    </>
  );
}
