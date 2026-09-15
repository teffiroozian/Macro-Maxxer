import { getSearchTerms, matchesText } from "@/lib/search/matchText";
import { resolveQuickAddEligibility } from "@/lib/search/quickAddEligibility";
import {
  NAME_RANK_TIER,
  getCategoryRelevanceRank,
  getNameRankTier,
  getVariantProminenceRank,
} from "@/lib/search/rankResults";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem } from "@/types/menu";
import type { SearchResult } from "@/types/search";

// searchAllContent only ever produces menu-item/builder-entree results (see
// below — builder-ingredient is a separate, recent-history-only kind) —
// narrowing the return type (instead of the full SearchResult union) lets
// callers discriminate on `kind` without "restaurant" muddying the union.
export type ContentSearchResult = Exclude<SearchResult, { kind: "restaurant" }>;

// Every regular menu item match (at any relevance level) outranks every BYO
// entree/build match — a group boundary, not a per-tier interleave — so an
// exact entree name match (e.g. "Burrito") never jumps ahead of a merely
// partial item match.
const GROUP = {
  ITEM: 0,
  ENTREE: 1,
} as const;

// How strongly an item's own name matched the query, independent of
// restaurant or category — lower ranks sort first.
const NAME_RANK = {
  EXACT: 0,
  PARTIAL: 1, // starts-with or contains
  TOKEN: 2, // every query word present, just not as one contiguous phrase
  WEAK: 3, // name didn't match at all; category text did (items only)
} as const;

type ItemMatch = {
  nameRank: number;
  // 0 when the query matches/overlaps one of the item's own categories (e.g.
  // "sauce" against "Dipping Sauces") — ranks category-relevant items above
  // same-name-rank items from unrelated categories (e.g. "Apple Sauce").
  categoryRelevance: number;
  // 0 for a normal consumer item, 1 for a bulk/less-common variant (e.g. an
  // "8 oz" bottle) — ranks the normal item first within the same category.
  variantProminence: number;
};

function getItemMatch(
  name: string,
  categories: string[],
  query: string,
  terms: string[]
): ItemMatch | null {
  const nameTier = getNameRankTier(name, query);

  let nameRank: number;
  if (nameTier === NAME_RANK_TIER.EXACT) {
    nameRank = NAME_RANK.EXACT;
  } else if (nameTier === NAME_RANK_TIER.STARTS_WITH || nameTier === NAME_RANK_TIER.CONTAINS) {
    nameRank = NAME_RANK.PARTIAL;
  } else if (nameTier === NAME_RANK_TIER.TOKEN_MATCH) {
    nameRank = NAME_RANK.TOKEN;
  } else if (matchesText(categories.join(" "), terms)) {
    // Name didn't match at all — fall back to a weak category-text match.
    nameRank = NAME_RANK.WEAK;
  } else {
    return null;
  }

  return {
    nameRank,
    categoryRelevance: getCategoryRelevanceRank(categories, query),
    variantProminence: getVariantProminenceRank(name),
  };
}

function getEntreeMatch(label: string, query: string): ItemMatch | null {
  const nameTier = getNameRankTier(label, query);

  let nameRank: number;
  if (nameTier === NAME_RANK_TIER.EXACT) {
    nameRank = NAME_RANK.EXACT;
  } else if (nameTier === NAME_RANK_TIER.STARTS_WITH || nameTier === NAME_RANK_TIER.CONTAINS) {
    nameRank = NAME_RANK.PARTIAL;
  } else if (nameTier === NAME_RANK_TIER.TOKEN_MATCH) {
    nameRank = NAME_RANK.TOKEN;
  } else {
    return null;
  }

  return {
    nameRank,
    // BYO entree/build options (e.g. Chipotle's Bowl/Burrito/Quesadilla) have
    // no category text of their own to weigh — neutral rather than penalized.
    categoryRelevance: 0,
    variantProminence: getVariantProminenceRank(label),
  };
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
// cart restaurant). Individual build-your-own ingredients/modifiers (e.g.
// Chipotle's standalone "Chicken" record) are intentionally excluded from
// these results — they aren't menu items a user would search for on their
// own — while BYO entree/build results themselves (e.g. Chipotle's
// Bowl/Burrito/Quesadilla builders) are included, sourced from
// `entry.entreeBuilders` rather than `entry.items`.
//
// Results are ordered by, in priority order: item group (regular menu items
// before BYO entree/build options), name-match rank, category relevance,
// variant prominence, then insertion order. See NAME_RANK and ItemMatch above
// for what each of those means.
export function searchAllContent(index: SearchIndexEntry[], query: string): ContentSearchResult[] {
  const terms = getSearchTerms(query);
  if (!terms.length) {
    return [];
  }

  const scored: { result: ContentSearchResult; group: number; match: ItemMatch; order: number }[] = [];
  let order = 0;

  for (const entry of index) {
    for (const item of entry.items) {
      const match = getItemMatch(item.name, item.categories, query, terms);
      if (match) {
        scored.push({
          result: {
            kind: "menu-item",
            item,
            restaurant: entry.restaurant,
            quickAdd: resolveQuickAddEligibility(item),
          },
          group: GROUP.ITEM,
          match,
          order: order++,
        });
      }
    }

    for (const candidate of entry.entreeBuilders) {
      const match = getEntreeMatch(candidate.option.label, query);
      if (match) {
        scored.push({
          result: {
            kind: "builder-entree",
            entreeId: candidate.entreeId,
            entreeOption: candidate.option,
            restaurant: entry.restaurant,
          },
          group: GROUP.ENTREE,
          match,
          order: order++,
        });
      }
    }
  }

  scored.sort(
    (a, b) =>
      a.group - b.group ||
      a.match.nameRank - b.match.nameRank ||
      a.match.categoryRelevance - b.match.categoryRelevance ||
      a.match.variantProminence - b.match.variantProminence ||
      a.order - b.order
  );
  return scored.map((entry) => entry.result);
}
