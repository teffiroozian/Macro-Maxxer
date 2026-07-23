// Shared name-based ranking tiers (see plan §4a):
// exact match > starts with > contains > everything else that still passed matching.
export const NAME_RANK_TIER = {
  EXACT: 0,
  STARTS_WITH: 1,
  CONTAINS: 2,
  OTHER: 3,
} as const;

export type NameRankTier = (typeof NAME_RANK_TIER)[keyof typeof NAME_RANK_TIER];

export function getNameRankTier(name: string, rawQuery: string): NameRankTier {
  const normalizedName = name.trim().toLowerCase();
  const normalizedQuery = rawQuery.trim().toLowerCase();

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
