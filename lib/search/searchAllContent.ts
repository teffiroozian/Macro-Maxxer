import { getSearchTerms, matchesText } from "@/lib/search/matchText";
import { resolveQuickAddEligibility } from "@/lib/search/quickAddEligibility";
import { NAME_RANK_TIER, getNameRankTier } from "@/lib/search/rankResults";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem } from "@/types/menu";
import type { SearchResult } from "@/types/search";

// searchAllContent only ever produces menu-item/builder-ingredient results —
// narrowing the return type (instead of the full SearchResult union) lets
// callers discriminate on `kind` without "restaurant" muddying the union.
export type ContentSearchResult = Exclude<SearchResult, { kind: "restaurant" }>;

// Finalized 6-tier ranking (plan §4a) for the combined menu-item +
// builder-ingredient result list:
//   1. Exact standard-item name matches
//   2. Exact builder-ingredient name matches
//   3. Standard items whose names start with the query
//   4. Standard items whose names contain the query
//   5. Builder ingredients whose names start with or contain the query
//   6. Weak/category-only matches (either kind)
const TIER = {
  ITEM_EXACT: 0,
  INGREDIENT_EXACT: 1,
  ITEM_STARTS_WITH: 2,
  ITEM_CONTAINS: 3,
  INGREDIENT_STARTS_OR_CONTAINS: 4,
  WEAK: 5,
} as const;

function getTier(name: string, categories: string[], query: string, terms: string[], isIngredient: boolean): number | null {
  const nameTier = getNameRankTier(name, query);

  if (nameTier === NAME_RANK_TIER.EXACT) {
    return isIngredient ? TIER.INGREDIENT_EXACT : TIER.ITEM_EXACT;
  }
  if (nameTier === NAME_RANK_TIER.STARTS_WITH) {
    return isIngredient ? TIER.INGREDIENT_STARTS_OR_CONTAINS : TIER.ITEM_STARTS_WITH;
  }
  if (nameTier === NAME_RANK_TIER.CONTAINS) {
    return isIngredient ? TIER.INGREDIENT_STARTS_OR_CONTAINS : TIER.ITEM_CONTAINS;
  }

  // Name didn't match at all — fall back to a weak category-text match.
  if (matchesText(categories.join(" "), terms)) {
    return TIER.WEAK;
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

// Searches menu items + build-your-own ingredients across every entry in the
// given index (already restaurant-filtered by the caller, e.g. to a single
// cart restaurant), ranked per the 6-tier rule above.
export function searchAllContent(index: SearchIndexEntry[], query: string): ContentSearchResult[] {
  const terms = getSearchTerms(query);
  if (!terms.length) {
    return [];
  }

  const scored: { result: ContentSearchResult; tier: number; order: number }[] = [];
  let order = 0;

  for (const entry of index) {
    for (const item of entry.items) {
      const tier = getTier(item.name, item.categories, query, terms, false);
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

    for (const ingredient of entry.ingredients) {
      const tier = getTier(ingredient.name, ingredient.categories, query, terms, true);
      if (tier !== null) {
        scored.push({
          result: {
            kind: "builder-ingredient",
            ingredient,
            restaurant: entry.restaurant,
            categoryLabel: resolveIngredientCategoryLabel(ingredient, entry.builderConfig),
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
