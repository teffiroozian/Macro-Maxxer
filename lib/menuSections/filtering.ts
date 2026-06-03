import type { MenuItem } from "@/types/menu";
import { getCategoryLabel } from "@/lib/menuSections/sorting";

export type Filters = {
  proteinMin?: number;
  caloriesMax?: number;
  includeSidesDrinks?: boolean;
  includeLargeShareables?: boolean;
};

export type RankedAllFilterKey = "main-entrees" | "breakfast" | "shareables" | "sides" | "drinks";

export function getSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function getRankedAllFilterKey(
  servingType: MenuItem["servingType"] | undefined
): RankedAllFilterKey | null {
  switch (servingType) {
    case "single":
    case "combo":
    case "kids":
    case "entree":
      return "main-entrees";
    case "breakfast":
      return "breakfast";
    case "shareable":
      return "shareables";
    case "drink":
      return "drinks";
    case "side":
      return "sides";
    case "addon":
    case "dessert":
    case undefined:
      return null;
    default:
      return null;
  }
}

export function itemMatchesNutritionFilters(item: MenuItem, filters: Filters): boolean {
  const protein = item.nutrition.protein ?? 0;
  const calories = item.nutrition.calories ?? 0;

  if (filters.proteinMin && protein < filters.proteinMin) {
    return false;
  }

  if (filters.caloriesMax && calories > filters.caloriesMax) {
    return false;
  }

  return true;
}

export function itemMatchesSearch(item: MenuItem, searchTerms: string[]): boolean {
  if (!searchTerms.length) {
    return true;
  }

  const itemCategories = item.categories?.length ? item.categories : ["Other"];

  const categoryVariants = itemCategories
    .flatMap((rawCategory) => {
      const category = rawCategory.toLowerCase();
      const categoryLabel = getCategoryLabel(rawCategory).toLowerCase();
      return [category, categoryLabel];
    })
    .flatMap((value) => {
      const trimmed = value.trim();
      if (!trimmed) return [];
      if (trimmed.endsWith("s")) {
        return [trimmed, trimmed.slice(0, -1)];
      }
      return [trimmed, `${trimmed}s`];
    });

  const searchableText = [item.name.toLowerCase(), ...categoryVariants].join(" ");
  return searchTerms.every((term) => searchableText.includes(term));
}

export function filterMenuItems({
  items,
  filters,
  searchTerms,
  rankedAllFilters,
  isRankingView,
}: {
  items: MenuItem[];
  filters: Filters;
  searchTerms: string[];
  rankedAllFilters: Record<RankedAllFilterKey, boolean>;
  isRankingView: boolean;
}): MenuItem[] {
  const selectedRankedKeys = isRankingView
    ? new Set<RankedAllFilterKey>(
        (Object.entries(rankedAllFilters) as [RankedAllFilterKey, boolean][])
          .filter(([, isEnabled]) => isEnabled)
          .map(([key]) => key)
      )
    : null;

  return items
    .map((item) => {
      if (!selectedRankedKeys) {
        return item;
      }

      const filteredVariants = item.variants?.filter((variant) => {
        const variantKey = getRankedAllFilterKey(variant.servingType);
        if (!variantKey) {
          return false;
        }

        return selectedRankedKeys.has(variantKey);
      });

      const itemKey = getRankedAllFilterKey(item.servingType);
      const itemKeyMatches = itemKey ? selectedRankedKeys.has(itemKey) : false;
      const hasMatchingVariants = Boolean(filteredVariants && filteredVariants.length > 0);

      if (!itemKeyMatches && !hasMatchingVariants) {
        return null;
      }

      if (!item.variants || item.variants.length === 0) {
        return item;
      }

      return {
        ...item,
        variants: hasMatchingVariants ? filteredVariants : [],
      };
    })
    .filter((item): item is MenuItem => Boolean(item))
    .filter(
      (item) =>
        itemMatchesNutritionFilters(item, filters) && itemMatchesSearch(item, searchTerms)
    );
}
