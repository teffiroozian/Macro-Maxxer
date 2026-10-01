import type { ItemVariant, MenuItem } from "@/types/menu";
import { getRankState, type SortOption } from "@/lib/menuSections/sortOptions";
import { getProteinPer100Calories } from "@/lib/nutrition";

// Portion/size variants (e.g. 5/8/12 ct) compete for the same base item's
// ranked row, but shareable/family-size packs scale nutrition up for a whole
// group — including them would let a bulk pack's inflated totals win "highest
// protein" purely by being multi-serving, not by being the best single
// portion. They're excluded from the metric comparison whenever a
// non-shareable option exists.
function getMetricCandidateVariants(item: MenuItem): ItemVariant[] {
  const variants = item.variants ?? [];
  if (variants.length === 0) return [];

  const nonShareable = variants.filter((variant) => variant.servingType !== "shareable");
  return nonShareable.length > 0 ? nonShareable : variants;
}

function pickRepresentativeVariant(item: MenuItem, sort: SortOption): ItemVariant | undefined {
  const candidates = getMetricCandidateVariants(item);
  if (candidates.length === 0) return undefined;

  const { metric, direction } = getRankState(sort);
  const metricValue = (variant: ItemVariant) => {
    if (metric === "protein-score") return getProteinPer100Calories(variant.nutrition.protein, variant.nutrition.calories);
    if (metric === "fat") return variant.nutrition.totalFat;
    return variant.nutrition[metric];
  };
  return candidates.reduce((best, variant) => {
    const bestValue = metricValue(best);
    const value = metricValue(variant);
    if (value === undefined || Number.isNaN(value)) return best;
    if (bestValue === undefined || Number.isNaN(bestValue)) return variant;
    return direction === "highest" ? (value > bestValue ? variant : best) : (value < bestValue ? variant : best);
  });
}

// Collapses each base menu item down to a single representative variant for
// Rankings-view metrics that vary by portion, so a multi-variant item never occupies more than one ranked
// row. Ranking must run on these reduced, one-row-per-item results rather
// than on the raw variant records.
export function selectRankingRepresentativeItems(items: MenuItem[], sort: SortOption): MenuItem[] {
  return items.map((item) => {
    const variant = pickRepresentativeVariant(item, sort);
    if (!variant) return item;

    return {
      ...item,
      defaultVariantId: variant.id,
      disableVariantSelector: true,
      nutrition: variant.nutrition,
    };
  });
}
