export const SORT_OPTION_VALUES = {
  DEFAULT_ORDER: "default-order",
  HIGHEST_PROTEIN: "highest-protein",
  BEST_RATIO: "best-ratio",
  LOWEST_CALORIES: "lowest-calories",
} as const;

export type SortOption =
  (typeof SORT_OPTION_VALUES)[keyof typeof SORT_OPTION_VALUES];

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
