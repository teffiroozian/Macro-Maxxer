import { getSearchTerms, matchesText } from "@/lib/search/matchText";
import { resolveQuickAddEligibility } from "@/lib/search/quickAddEligibility";
import { NAME_RANK_TIER, getNameRankTier } from "@/lib/search/rankResults";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem } from "@/types/menu";
import type { SearchResult } from "@/types/search";

// searchAllContent only ever produces menu-item/builder-entree results (see
// below — builder-ingredient is a separate, recent-history-only kind) —
// narrowing the return type (instead of the full SearchResult union) lets
// callers discriminate on `kind` without "restaurant" muddying the union.
export type ContentSearchResult = Exclude<SearchResult, { kind: "restaurant" }>;

// Ranking for the combined menu-item + BYO-entree/build result list: every
// regular menu item match (at any relevance level) outranks every BYO
// entree/build match — a group boundary, not a per-tier interleave — so an
// exact entree name match (e.g. "Burrito") never jumps ahead of a merely
// partial item match. Within each group, relevance still ranks results:
//   1. Exact regular menu item matches
//   2. Partial (starts-with or contains) regular menu item matches
//   3. Weak/category-only regular menu item matches
//   4. Exact BYO entree/build matches
//   5. Partial BYO entree/build matches
// BYO entree/build results (e.g. Chipotle's Bowl/Burrito/Quesadilla) have no
// category text of their own to fall back on, so they only ever match by
// name — never via the weak tier.
const TIER = {
  ITEM_EXACT: 0,
  ITEM_PARTIAL: 1,
  ITEM_WEAK: 2,
  ENTREE_EXACT: 3,
  ENTREE_PARTIAL: 4,
} as const;

function getItemTier(name: string, categories: string[], query: string, terms: string[]): number | null {
  const nameTier = getNameRankTier(name, query);

  if (nameTier === NAME_RANK_TIER.EXACT) {
    return TIER.ITEM_EXACT;
  }
  if (nameTier === NAME_RANK_TIER.STARTS_WITH || nameTier === NAME_RANK_TIER.CONTAINS) {
    return TIER.ITEM_PARTIAL;
  }

  // Name didn't match at all — fall back to a weak category-text match.
  if (matchesText(categories.join(" "), terms)) {
    return TIER.ITEM_WEAK;
  }

  return null;
}

function getEntreeTier(label: string, query: string): number | null {
  const nameTier = getNameRankTier(label, query);

  if (nameTier === NAME_RANK_TIER.EXACT) {
    return TIER.ENTREE_EXACT;
  }
  if (nameTier === NAME_RANK_TIER.STARTS_WITH || nameTier === NAME_RANK_TIER.CONTAINS) {
    return TIER.ENTREE_PARTIAL;
  }

  return null;
}

export function resolveIngredientCategoryLabel(ingredient: IngredientItem, builderConfig?: RestaurantBuilderConfig): string {
  const rawCategory = ingredient.categories[0];
  if (!rawCategory) {
    return "Ingredient";
  }

  const labels = builderConfig?.selectedIngredientCategoryLabels ?? {};
  const match = Object.entries(labels).find(([key]) => key.toLowerCase() === rawCategory.toLowerCase());
  return match ? match[1] : rawCategory;
}

// Searches menu items + BYO entree/build options across every entry in the
// given index (already restaurant-filtered by the caller, e.g. to a single
// cart restaurant), ranked per the tiers above. Individual build-your-own
// ingredients/modifiers (e.g. Chipotle's standalone "Chicken" record) are
// intentionally excluded from these results — they aren't menu items a user
// would search for on their own — while BYO entree/build results themselves
// (e.g. Chipotle's Bowl/Burrito/Quesadilla builders) are included, sourced
// from `entry.entreeBuilders` rather than `entry.items`.
export function searchAllContent(index: SearchIndexEntry[], query: string): ContentSearchResult[] {
  const terms = getSearchTerms(query);
  if (!terms.length) {
    return [];
  }

  const scored: { result: ContentSearchResult; tier: number; order: number }[] = [];
  let order = 0;

  for (const entry of index) {
    for (const item of entry.items) {
      const tier = getItemTier(item.name, item.categories, query, terms);
      if (tier !== null) {
        scored.push({
          result: {
            kind: "menu-item",
            item,
            restaurant: entry.restaurant,
            quickAdd: resolveQuickAddEligibility(item),
          },
          tier,
          order: order++,
        });
      }
    }

    for (const candidate of entry.entreeBuilders) {
      const tier = getEntreeTier(candidate.option.label, query);
      if (tier !== null) {
        scored.push({
          result: {
            kind: "builder-entree",
            entreeId: candidate.entreeId,
            entreeOption: candidate.option,
            restaurant: entry.restaurant,
          },
          tier,
          order: order++,
        });
      }
    }
  }

  scored.sort((a, b) => a.tier - b.tier || a.order - b.order);
  return scored.map((entry) => entry.result);
}
