import type { MenuItem } from "@/types/menu";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { getOfficialRankingItems } from "@/lib/menuSections/ranking";

export const NUTRITION_HISTOGRAM_BUCKET_COUNT = 20;

export type NutritionDisplayBounds = { min: number; max: number };

// Nearest-rank 95th percentile of the complete eligible catalog, rounded
// upward to a clean unit. Category selections and display grouping do not
// participate in the domain calculation.
export function getPercentileDisplayBounds(values: number[], unit: number): NutritionDisplayBounds {
  const sorted = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const percentile = sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : 0;
  return { min: 0, max: Math.max(unit, Math.ceil(percentile / unit) * unit) };
}

export function getNutritionDisplayData(items: MenuItem[]) {
  const nutrition = getOfficialRankingItems(items.filter(isStandaloneMenuItem)).map(getDefaultMenuItemNutrition);
  const calories = nutrition.map((value) => value.calories).filter(Number.isFinite);
  const proteins = nutrition.map((value) => value.protein).filter(Number.isFinite);
  return {
    calories,
    proteins,
    calorieBounds: getPercentileDisplayBounds(calories, 100),
    proteinBounds: getPercentileDisplayBounds(proteins, 10),
  };
}

// The final bin includes the last interval plus all values at/above max.
// Display clipping never changes the nutrition used by the real filters.
export function buildNutritionHistogram(values: number[], bounds: NutritionDisplayBounds, bucketCount = NUTRITION_HISTOGRAM_BUCKET_COUNT): number[] {
  const buckets = Array(bucketCount).fill(0) as number[];
  const span = Math.max(1, bounds.max - bounds.min);
  values.filter(Number.isFinite).forEach((value) => {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((value - bounds.min) / span * bucketCount)));
    buckets[index]++;
  });
  return buckets;
}

// Only category selection changes this pool; nutrition filters must not
// feed back into their own display domain.
export function getActiveCategoryCalorieData(items: MenuItem[], categories?: string[]) {
  const selected = categories ? new Set(categories.map((category) => category.trim().toLowerCase())) : undefined;
  const eligible = getOfficialRankingItems(items.filter(isStandaloneMenuItem)).filter((item) =>
    !selected || item.categories.some((category) => selected.has(category.trim().toLowerCase()))
  );
  const calories = eligible.map((item) => getDefaultMenuItemNutrition(item).calories).filter(Number.isFinite);
  const rounded = getPercentileDisplayBounds(calories, 10);
  const roundedMaximum = calories.some((value) => value > 0) ? rounded.max : 0;
  // If H is headroom, H = (useful + H) / bins, so H = useful / (bins - 1).
  // Round up to the slider's 10-calorie increment for about one full bin.
  const headroom = Math.max(10, Math.ceil(roundedMaximum / (NUTRITION_HISTOGRAM_BUCKET_COUNT - 1) / 10) * 10);
  return { calories, calorieBounds: { min: 0, max: roundedMaximum + headroom } };
}


// Keep bins overlapping the included range emphasized. The final bin also
// represents overflow, so its upper edge is unbounded for minimum filters.
export function isNutritionHistogramBinIncluded(index: number, bounds: NutritionDisplayBounds, threshold: number | undefined, minimum: boolean, bucketCount = NUTRITION_HISTOGRAM_BUCKET_COUNT): boolean {
  if (threshold === undefined) return true;
  const width = (bounds.max - bounds.min) / bucketCount;
  const lower = bounds.min + index * width;
  const upper = index === bucketCount - 1 ? Infinity : lower + width;
  return minimum ? upper > threshold : lower <= threshold;
}
