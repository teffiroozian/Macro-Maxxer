import type { ItemVariant, MenuItem } from "@/types/menu";
import { SORT_OPTION_VALUES, type SortOption } from "@/lib/menuSections/sortOptions";

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

  if (sort === SORT_OPTION_VALUES.LOWEST_CALORIES) {
    return candidates.reduce((lowest, variant) =>
      (variant.nutrition?.calories ?? Infinity) < (lowest.nutrition?.calories ?? Infinity) ? variant : lowest
    );
  }

  // Highest Protein: the max-protein variant. Best Protein Score isn't split
  // by this function at all (see MenuSections) since proportional variants
  // share the same protein-per-100-cal ratio, so the item's default variant
  // already represents it.
  return candidates.reduce((highest, variant) =>
    (variant.nutrition?.protein ?? -Infinity) > (highest.nutrition?.protein ?? -Infinity) ? variant : highest
  );
}

// Collapses each base menu item down to a single representative variant for
// Rankings-view metrics that vary by portion (Highest Protein, Lowest
// Calories), so a multi-variant item never occupies more than one ranked
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
