import type { SortOption } from "@/lib/menuSections/sortOptions";
import { selectRankingItems } from "@/lib/menuSections/ranking";
import type { ItemVariant, MenuItem } from "@/types/menu";
import { getDefaultMenuItemNutrition, getProteinPer100Calories } from "@/lib/nutrition";
import { getCategoryLabel, getItemCategories, normalizeCategory } from "@/lib/menuSections/sorting";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { normalizeSearchText, squashSearchText } from "@/lib/search/normalizeSearchText";

// Variant category overrides take precedence over the parent catalog category.
function getVariantCategoriesForRanking(item: MenuItem, variant: ItemVariant): string[] {
  return variant.categories && variant.categories.length > 0
    ? variant.categories.map(normalizeCategory)
    : getItemCategories(item);
}

export type RankedAllFilterKey = "main-entrees" | "breakfast" | "shareables" | "sides" | "drinks";

export const RANKED_ALL_FILTER_KEYS: RankedAllFilterKey[] = [
  "main-entrees",
  "breakfast",
  "shareables",
  "sides",
  "drinks",
];

export type RankedParentSelectionState = "all" | "some" | "none";

export function getSearchTerms(query: string): string[] {
  return normalizeSearchText(query).split(" ").filter(Boolean);
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

// The narrower categories (e.g. "sandwich", "salad", "wrap") that exist
// within each broad Rankings parent bucket, derived straight from this
// restaurant's own item/variant data — never a hard-coded per-restaurant
// list — so the nested filter tree is automatically correct for any
// restaurant's menu shape.
export function getRankedChildCategories(items: MenuItem[]): Record<RankedAllFilterKey, string[]> {
  const buckets: Record<RankedAllFilterKey, Set<string>> = {
    "main-entrees": new Set(),
    breakfast: new Set(),
    shareables: new Set(),
    sides: new Set(),
    drinks: new Set(),
  };

  items.forEach((item) => {
    const itemKey = getRankedAllFilterKey(item.servingType);
    if (itemKey) {
      getItemCategories(item).forEach((category) => buckets[itemKey].add(category));
    }

    item.variants?.forEach((variant) => {
      const variantKey = getRankedAllFilterKey(variant.servingType);
      if (!variantKey) return;
      getVariantCategoriesForRanking(item, variant).forEach((category) => buckets[variantKey].add(category));
    });
  });

  return Object.fromEntries(
    RANKED_ALL_FILTER_KEYS.map((key) => [key, [...buckets[key]].sort()])
  ) as Record<RankedAllFilterKey, string[]>;
}

// Tri-state read of a parent's checkbox: every available child selected,
// some, or none — shared by desktop, the mobile dropdown, and the mobile
// chip strip so all three always agree on what "selected" means.
export function getParentSelectionState(
  selectedChildren: Set<string>,
  availableChildren: string[]
): RankedParentSelectionState {
  if (selectedChildren.size === 0) return "none";
  if (availableChildren.length > 0 && selectedChildren.size >= availableChildren.length) return "all";
  return "some";
}

export function itemMatchesNutritionFilters(item: MenuItem, filters: Filters): boolean {
  const nutrition = getDefaultMenuItemNutrition(item);
  const protein = nutrition.protein ?? 0;
  const calories = nutrition.calories ?? 0;

  if (filters.proteinMin && protein < filters.proteinMin) {
    return false;
  }

  // `!== undefined` (not a truthy check) — a slider dragged to its own
  // minimum can legitimately be 0, which is falsy but still a real filter
  // value; a truthy check would silently stop filtering at that exact
  // boundary instead of correctly excluding every item above it.
  if (filters.caloriesMax !== undefined && calories > filters.caloriesMax) {
    return false;
  }

  const proteinScore = getProteinPer100Calories(protein, calories);
  if (filters.proteinScoreMin !== undefined && (proteinScore === undefined || proteinScore < filters.proteinScoreMin)) return false;
  if (filters.carbsMax !== undefined && nutrition.carbs > filters.carbsMax) return false;
  if (filters.fatMax !== undefined && nutrition.totalFat > filters.fatMax) return false;
  if (filters.fiberMin !== undefined && (nutrition.fiber === undefined || nutrition.fiber < filters.fiberMin)) return false;
  if (filters.sodiumMax !== undefined && (nutrition.sodium === undefined || nutrition.sodium > filters.sodiumMax)) return false;
  if (filters.sugarMax !== undefined && (nutrition.sugars === undefined || nutrition.sugars > filters.sugarMax)) return false;

  if (filters.categories !== undefined) {
    const selected = new Set(filters.categories.map(normalizeCategory));
    const categories = item.variants?.length
      ? item.variants.flatMap((variant) => getVariantCategoriesForRanking(item, variant))
      : getItemCategories(item);
    if (!categories.some((category) => selected.has(category))) return false;
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

  const searchableText = normalizeSearchText([item.name, ...categoryVariants].join(" "));
  const squashedText = squashSearchText(searchableText);
  return searchTerms.every((term) => searchableText.includes(term) || squashedText.includes(term));
}

export function filterMenuItems({
  items,
  filters,
  searchTerms,
  rankedChildSelections,
  isRankingView,
  filterRankingCategories = true,
  rankingSort,
}: {
  items: MenuItem[];
  filters: Filters;
  searchTerms: string[];
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  isRankingView: boolean;
  filterRankingCategories?: boolean;
  rankingSort?: SortOption;
}): MenuItem[] {
  const candidates = isRankingView && rankingSort ? selectRankingItems(items, rankingSort, filters) : items;
  return candidates
    .map((item) => {
      if (filters.categories === undefined || !item.variants?.length) return item;
      const selected = new Set(filters.categories.map(normalizeCategory));
      const variants = item.variants.filter((variant) =>
        getVariantCategoriesForRanking(item, variant).some((category) => selected.has(category))
      );
      return variants.length ? { ...item, variants } : null;
    })
    .filter((item): item is MenuItem => Boolean(item))
    .map((item) => {
      if (!isRankingView || filters.rankingGroups === undefined) return item;

      const allowedGroups = new Set(filters.rankingGroups);
      const itemGroup = getRankedAllFilterKey(item.servingType);
      const filteredVariants = item.variants?.filter((variant) => {
        const variantGroup = getRankedAllFilterKey(variant.servingType);
        return variantGroup !== null && allowedGroups.has(variantGroup);
      });
      const itemMatches = itemGroup !== null && allowedGroups.has(itemGroup);
      const hasMatchingVariants = Boolean(filteredVariants?.length);

      if (!itemMatches && !hasMatchingVariants) return null;
      if (!item.variants?.length) return item;
      return { ...item, variants: filteredVariants ?? [] };
    })
    .filter((item): item is MenuItem => Boolean(item))
    .map((item) => {
      if (!isRankingView || !filterRankingCategories) {
        return item;
      }

      const filteredVariants = item.variants?.filter((variant) => {
        const variantKey = getRankedAllFilterKey(variant.servingType);
        if (!variantKey) {
          return false;
        }

        const selectedChildren = rankedChildSelections[variantKey];
        if (!selectedChildren || selectedChildren.size === 0) {
          return false;
        }

        const variantCategories = getVariantCategoriesForRanking(item, variant);
        return variantCategories.some((category) => selectedChildren.has(category));
      });

      const itemKey = getRankedAllFilterKey(item.servingType);
      const itemSelectedChildren = itemKey ? rankedChildSelections[itemKey] : undefined;
      const itemKeyMatches = Boolean(
        itemSelectedChildren &&
          itemSelectedChildren.size > 0 &&
          getItemCategories(item).some((category) => itemSelectedChildren.has(category))
      );
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
