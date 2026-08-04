import type { MenuItem } from "@/types/menu";
import { getDefaultMenuItemNutrition, getProteinPer100Calories } from "@/lib/nutrition";

export const COMPARATIVE_LABEL_VALUES = {
  HIGHEST_PROTEIN: "highest-protein",
  BEST_PROTEIN_SCORE: "best-protein-score",
  LOWEST_CALORIE: "lowest-calorie",
} as const;

export type ComparativeLabelKind =
  (typeof COMPARATIVE_LABEL_VALUES)[keyof typeof COMPARATIVE_LABEL_VALUES];

function itemKey(item: MenuItem) {
  return item.id ?? item.name;
}

// Computes at most one comparative-label winner per metric across a menu's
// items, using the same nutrition source and protein-score formula as the
// Rankings tab's own "Highest Protein" / "Best Ratio" / "Lowest Calories"
// sort options (lib/menuSections/sorting.ts), so a card's badge always
// agrees with what Rankings would show for that metric.
//
// A menu item can only ever wear one badge, so when the same item wins more
// than one metric, the higher-priority metric (highest protein, then best
// protein score, then lowest calorie) claims the badge and the runner-up
// metric is simply left unlabeled for this render rather than shown twice.
export function computeComparativeLabels(
  items: MenuItem[],
): Map<string, ComparativeLabelKind> {
  const eligibleItems = items.filter((item) => item.servingType !== "addon");

  let highestProteinItem: MenuItem | undefined;
  let highestProteinValue = Number.NEGATIVE_INFINITY;
  let bestScoreItem: MenuItem | undefined;
  let bestScoreValue = Number.NEGATIVE_INFINITY;
  let lowestCalorieItem: MenuItem | undefined;
  let lowestCalorieValue = Number.POSITIVE_INFINITY;

  for (const item of eligibleItems) {
    const nutrition = getDefaultMenuItemNutrition(item);

    if (nutrition.protein > highestProteinValue) {
      highestProteinValue = nutrition.protein;
      highestProteinItem = item;
    }

    if (nutrition.calories > 0) {
      const score = getProteinPer100Calories(nutrition.protein, nutrition.calories);
      if (typeof score === "number" && score > bestScoreValue) {
        bestScoreValue = score;
        bestScoreItem = item;
      }

      if (nutrition.calories < lowestCalorieValue) {
        lowestCalorieValue = nutrition.calories;
        lowestCalorieItem = item;
      }
    }
  }

  const labels = new Map<string, ComparativeLabelKind>();

  if (highestProteinItem) {
    labels.set(itemKey(highestProteinItem), COMPARATIVE_LABEL_VALUES.HIGHEST_PROTEIN);
  }
  if (bestScoreItem && !labels.has(itemKey(bestScoreItem))) {
    labels.set(itemKey(bestScoreItem), COMPARATIVE_LABEL_VALUES.BEST_PROTEIN_SCORE);
  }
  if (lowestCalorieItem && !labels.has(itemKey(lowestCalorieItem))) {
    labels.set(itemKey(lowestCalorieItem), COMPARATIVE_LABEL_VALUES.LOWEST_CALORIE);
  }

  return labels;
}
