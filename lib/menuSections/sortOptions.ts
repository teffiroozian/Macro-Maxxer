// the official sort option values
export const SORT_OPTION_VALUES = {
  DEFAULT_ORDER: "default-order",
  HIGHEST_PROTEIN_SCORE: "highest-protein-score",
  LOWEST_PROTEIN_SCORE: "lowest-protein-score",
  HIGHEST_PROTEIN: "highest-protein",
  LOWEST_PROTEIN: "lowest-protein",
  HIGHEST_CALORIES: "highest-calories",
  LOWEST_CALORIES: "lowest-calories",
  HIGHEST_CARBS: "highest-carbs",
  LOWEST_CARBS: "lowest-carbs",
  HIGHEST_FAT: "highest-fat",
  LOWEST_FAT: "lowest-fat",
  HIGHEST_FIBER: "highest-fiber",
  LOWEST_FIBER: "lowest-fiber",
  BEST_RATIO: "highest-protein-score",
} as const;

// the selected sort option must be one of these exact values
export type SortOption =
  (typeof SORT_OPTION_VALUES)[keyof typeof SORT_OPTION_VALUES];

// default order for the ranking view
export type RankMetric = "protein-score" | "protein" | "calories" | "carbs" | "fat" | "fiber";
export type RankDirection = "highest" | "lowest";

export const RANKING_DEFAULT_SORT: SortOption = SORT_OPTION_VALUES.HIGHEST_PROTEIN;


export function isDefaultOrderSort(sort: SortOption) {
  return sort === SORT_OPTION_VALUES.DEFAULT_ORDER;
}

export function getRankState(sort: SortOption): { metric: RankMetric; direction: RankDirection } {
  if (sort === SORT_OPTION_VALUES.DEFAULT_ORDER) return { metric: "protein-score", direction: "highest" };
  const direction: RankDirection = sort.startsWith("lowest-") ? "lowest" : "highest";
  const metric = sort.replace(/^(highest|lowest)-/, "") as RankMetric;
  return { metric, direction };
}

export function toRankSort(metric: RankMetric, direction: RankDirection): SortOption {
  return `${direction}-${metric}` as SortOption;
}

export function getNaturalRankDirection(metric: RankMetric): RankDirection {
  return metric === "calories" || metric === "carbs" || metric === "fat" ? "lowest" : "highest";
}
