import { normalizeSearchText, squashSearchText } from "@/lib/search/normalizeSearchText";

// Shared name-based ranking tiers (see plan §4a):
// exact match > starts with > contains (incl. squashed brand-formatting
// matches) > every query word present somewhere in the name > everything
// else that still passed matching some other way (e.g. category text).
export const NAME_RANK_TIER = {
  EXACT: 0,
  STARTS_WITH: 1,
  CONTAINS: 2,
  TOKEN_MATCH: 3,
  OTHER: 4,
} as const;

export type NameRankTier = (typeof NAME_RANK_TIER)[keyof typeof NAME_RANK_TIER];

export function getNameRankTier(name: string, rawQuery: string): NameRankTier {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(rawQuery);

  if (!normalizedQuery) {
    return NAME_RANK_TIER.OTHER;
  }

  if (normalizedName === normalizedQuery) {
    return NAME_RANK_TIER.EXACT;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return NAME_RANK_TIER.STARTS_WITH;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return NAME_RANK_TIER.CONTAINS;
  }

  // Whitespace-squashed comparison: catches brand names typed as one merged
  // word or split differently than the source data (e.g. "chickfila" or
  // "chick fila" against a name that normalizes to "chick fil a") generically,
  // without an alias list.
  const squashedName = squashSearchText(normalizedName);
  const squashedQuery = squashSearchText(normalizedQuery);
  if (squashedQuery && squashedName.includes(squashedQuery)) {
    return NAME_RANK_TIER.CONTAINS;
  }

  // Every word of the query appears somewhere in the name, just not as one
  // contiguous phrase (e.g. "chick sauce" against "Chick-fil-A Sauce").
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  if (
    queryTerms.length &&
    queryTerms.every((term) => normalizedName.includes(term) || squashedName.includes(term))
  ) {
    return NAME_RANK_TIER.TOKEN_MATCH;
  }

  return NAME_RANK_TIER.OTHER;
}

// Ranks items by how their name compares to the raw (untokenized) query,
// preserving relative order within a tier.
export function rankByName<T>(items: T[], query: string, getName: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index, tier: getNameRankTier(getName(item), query) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map((entry) => entry.item);
}

// 0 when the query matches or strongly overlaps one of the item's own
// category names (e.g. "sauce" against a "Dipping Sauces" category), 1
// otherwise. Reuses the same name-matching tiers category text is just
// another piece of text to compare against the query with, so this works
// for any restaurant's own category labels without hardcoding a specific
// category or brand.
export function getCategoryRelevanceRank(categories: string[], query: string): number {
  const isRelevant = categories.some(
    (category) => getNameRankTier(category, query) !== NAME_RANK_TIER.OTHER
  );
  return isRelevant ? 0 : 1;
}

// Generic "bulk / less-common variant" signal: a menu item whose own display
// name carries an explicit serving-size measurement (e.g. "8 oz", "1 Gallon")
// is typically a bulk, catering, or private-label SKU rather than the normal
// consumer-facing item a search should lead with — true for any restaurant's
// naming, not just one brand's.
const BULK_SIZE_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:oz|ounces?|fl\s*oz|ml|milliliters?|milligrams?|l|liters?|litres?|lb|lbs|pounds?|gal|gallons?|qt|quarts?|pt|pints?|kg|kilograms?|g|grams?)\b/;

export function getVariantProminenceRank(name: string): number {
  return BULK_SIZE_PATTERN.test(normalizeSearchText(name)) ? 1 : 0;
}
