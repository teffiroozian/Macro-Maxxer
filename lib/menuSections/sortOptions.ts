// the official sort option values
export const SORT_OPTION_VALUES = {
  DEFAULT_ORDER: "default-order",
  HIGHEST_PROTEIN: "highest-protein",
  BEST_RATIO: "best-ratio",
  LOWEST_CALORIES: "lowest-calories",
} as const;

// the selected sort option must be one of these exact values
export type SortOption =
  (typeof SORT_OPTION_VALUES)[keyof typeof SORT_OPTION_VALUES];

// default order for the ranking view
export const RANKING_DEFAULT_SORT: SortOption = SORT_OPTION_VALUES.HIGHEST_PROTEIN;


export function isDefaultOrderSort(sort: SortOption) {
  return sort === SORT_OPTION_VALUES.DEFAULT_ORDER;
}

export function isSplitRankingSort(sort: SortOption) {
  return (
    sort === SORT_OPTION_VALUES.HIGHEST_PROTEIN ||
    sort === SORT_OPTION_VALUES.LOWEST_CALORIES
  );
}
