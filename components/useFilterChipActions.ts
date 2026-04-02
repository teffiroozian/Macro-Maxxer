import { useMemo } from "react";

import type { Filters } from "./ControlsRow";

type UseFilterChipActionsOptions = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function useFilterChipActions({ filters, onFiltersChange }: UseFilterChipActionsOptions) {
  const hasActiveFilters = useMemo(
    () => Boolean(filters.proteinMin || filters.caloriesMax),
    [filters.caloriesMax, filters.proteinMin]
  );

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
    hasActiveFilters,
    clearProteinFilter,
    clearCaloriesFilter,
    resetFilters,
  };
}
