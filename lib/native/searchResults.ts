import {
  applyNutritionFilters,
  countNutritionFilters,
  formatScore,
  getMetricValue,
  getProteinScore,
  naturalDirection,
  type FullMenuDirection,
  type FullMenuMetric,
  type FullMenuNutritionFilters,
} from "@/lib/native/fullMenu";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";

export type NativeSearchScope = "all" | "restaurants" | "menu-items";

// null keeps the shared search's own relevance order.
export type SearchRanking = { metric: FullMenuMetric; direction: FullMenuDirection } | null;

// How many menu items the All view shows before "See all".
export const ALL_SCOPE_ITEM_LIMIT = 5;

// First tap ranks by the metric's natural direction, the next tap flips it.
export function nextRanking(current: SearchRanking, metric: FullMenuMetric): SearchRanking {
  if (current?.metric !== metric) return { metric, direction: naturalDirection(metric) };
  return { metric, direction: current.direction === "high" ? "low" : "high" };
}

const metricValue = (result: ContentSearchResult, metric: FullMenuMetric) =>
  result.kind === "menu-item" ? getMetricValue(result.item, metric) : undefined;

// Results without the metric (including build-your-own entries) go last in
// either direction. Array.sort is stable, so ties keep relevance order.
export function rankSearchResults(results: ContentSearchResult[], ranking: SearchRanking): ContentSearchResult[] {
  if (!ranking) return results;
  const sign = ranking.direction === "high" ? -1 : 1;
  return [...results].sort((a, b) => {
    const x = metricValue(a, ranking.metric);
    const y = metricValue(b, ranking.metric);
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
    return sign * (x - y);
  });
}

// Build-your-own entries have no nutrition of their own, so an active filter
// hides them, as it would any item that cannot prove it qualifies.
export function filterSearchResults(results: ContentSearchResult[], filters: FullMenuNutritionFilters): ContentSearchResult[] {
  if (!countNutritionFilters(filters)) return results;
  return results.filter((result) => result.kind === "menu-item" && applyNutritionFilters([result.item], filters).length > 0);
}

// Protein Score and Fiber are not in the card's four macros, so ranking by
// them shows the value on the card.
export function rankingNote(result: ContentSearchResult, ranking: SearchRanking): string {
  if (result.kind !== "menu-item" || !ranking) return "";
  if (ranking.metric === "score") {
    const score = getProteinScore(result.item);
    return score === undefined ? "" : `${formatScore(score)}g / 100 cal`;
  }
  if (ranking.metric === "fiber") {
    const fiber = getMetricValue(result.item, "fiber");
    return fiber === undefined ? "" : `${Math.round(fiber)}g fiber`;
  }
  return "";
}

export type SearchFilterChip = { key: keyof FullMenuNutritionFilters; label: string };

export function searchFilterChips(filters: FullMenuNutritionFilters): SearchFilterChip[] {
  const chips: SearchFilterChip[] = [];
  if (filters.caloriesMax !== undefined) chips.push({ key: "caloriesMax", label: `${filters.caloriesMax} cal or less` });
  if (filters.proteinMin !== undefined) chips.push({ key: "proteinMin", label: `${filters.proteinMin}g+ protein` });
  if (filters.scoreMin !== undefined) chips.push({ key: "scoreMin", label: `${filters.scoreMin}+ Protein Score` });
  return chips;
}
