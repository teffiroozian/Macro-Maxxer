import { useMemo } from "react";

import type { Filters } from "@/lib/menuSections/filterOptions";

type UseFilterChipActionsOptions = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function useFilterChipActions({ filters, onFiltersChange }: UseFilterChipActionsOptions) {
  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== undefined),
    [filters]
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
