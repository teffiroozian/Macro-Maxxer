import { getPrimaryMenuCategory, matchesMenuMembership } from "@/lib/menuSections/memberships";
import type { MenuItem } from "@/types/menu";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import { getVariantSettings } from "@/lib/menuSections/filterOptions";
import { filterMenuItems } from "@/lib/menuSections/filtering";

type ResultCountInput = Parameters<typeof filterMenuItems>[0];

function publicCountItems(input: ResultCountInput): MenuItem[] {
  const seen = new Set<string>();
  const items = input.items.filter((item: MenuItem) => {
    if (!isStandaloneMenuItem(item)) return false;
    const key = JSON.stringify([item.id, input.isRankingView ? item.defaultVariantId : undefined]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return items;
}

// X: matches all applied filters/search. Y: the selected category pool under
// current ranking/variant rules, before nutrition/search constraints.
// Neither is the canonical parent-menu count used by restaurant headers.
export function getMenuResultCounts(input: ResultCountInput): { matching: number; total: number } {
  const items = publicCountItems(input);
  const scopeFilters = {
    ...getVariantSettings(input.filters),
    categories: input.filters.categories,
    categoryTags: input.filters.categoryTags,
    categoryExclusions: input.filters.categoryExclusions,
    rankingGroups: input.filters.rankingGroups,
  };
  return {
    matching: filterMenuItems({ ...input, items }).length,
    total: filterMenuItems({ ...input, items, filters: scopeFilters, searchTerms: [] }).length,
  };
}

export type MenuResultContext = Omit<ResultCountInput, "items" | "filters" | "searchTerms">;

// Facets retain global eligibility (size, variants, nutrition), excluding the
// category/tag selection itself so unchecked categories keep their base count.
export function getMenuCategoryFacets(input: ResultCountInput) {
  const universe = filterMenuItems({ ...input, items: publicCountItems(input), filters: { ...input.filters, categories: undefined, categoryTags: undefined, categoryExclusions: undefined, categoryPreset: undefined, rankingGroups: undefined } });
  const counts = new Map<string, number>();
  for (const item of universe) {
    const category = getPrimaryMenuCategory(item);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const selectedCounts = new Map<string, number>();
  for (const item of universe) {
    if (matchesMenuMembership(item, input.filters.categories, input.filters.categoryTags, input.filters.categoryExclusions)) {
      const category = getPrimaryMenuCategory(item);
      selectedCounts.set(category, (selectedCounts.get(category) ?? 0) + 1);
    }
  }
  const states = new Map<string, CategorySelectionState>();
  for (const [category, total] of counts) {
    const included = selectedCounts.get(category) ?? 0;
    states.set(category, included === 0 ? "none" : included === total ? "all" : "some");
  }
  return { universe, counts, selectedCounts, states };
}

export type CategorySelectionState = "none" | "some" | "all";
