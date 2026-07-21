import { useMemo } from "react";

import type { Filters } from "@/lib/menuSections/filterOptions";

type UseFilterChipActionsOptions = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function useFilterChipActions({ filters, onFiltersChange }: UseFilterChipActionsOptions) {
  const activeFilterCount = useMemo(
    () => Number(Boolean(filters.proteinMin)) + Number(Boolean(filters.caloriesMax)),
    [filters.caloriesMax, filters.proteinMin]
  );
  const hasActiveFilters = activeFilterCount > 0;

  const clearProteinFilter = () => {
    onFiltersChange({ ...filters, proteinMin: undefined });
  };

  const clearCaloriesFilter = () => {
    onFiltersChange({ ...filters, caloriesMax: undefined });
  };

  const resetFilters = () => {
    onFiltersChange({});
  };

  return {
    activeFilterCount,
    hasActiveFilters,
    clearProteinFilter,
    clearCaloriesFilter,
    resetFilters,
  };
}
