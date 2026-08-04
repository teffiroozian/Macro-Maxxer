import type { ItemVariant, MenuItem } from "@/types/menu";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { getCategoryLabel, getItemCategories, normalizeCategory } from "@/lib/menuSections/sorting";
import type { Filters } from "@/lib/menuSections/filterOptions";

// A variant that doesn't specify its own `categories` (e.g. a serving-size
// or serving-type override like a 30-piece "shareable" nugget tray) belongs
// to whatever categories its parent item belongs to — same fallback
// `getVisibleVariants` (lib/menuSections/sorting.ts) already uses for the
// Menu/Ingredients grouping, applied here too so a bucket like "shareables"
// that only ever exists as a variant-level override isn't silently treated
// as having zero real categories just because the variant itself is
// category-less.
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
  rankedChildSelections,
  isRankingView,
}: {
  items: MenuItem[];
  filters: Filters;
  searchTerms: string[];
  rankedChildSelections: Record<RankedAllFilterKey, Set<string>>;
  isRankingView: boolean;
}): MenuItem[] {
  return items
    .map((item) => {
      if (!isRankingView) {
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
