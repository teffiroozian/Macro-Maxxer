import {
  INGREDIENT_SECTION_ORDER,
  MENU_SECTION_ORDER,
} from "@/data/menuCategoryConfig";
import type { MenuItem } from "@/types/menu";
import {
  getDefaultMenuItemNutrition,
  getProteinPer100Calories,
} from "@/lib/nutrition";
import {
  SORT_OPTION_VALUES,
  isDefaultOrderSort,
  type SortOption,
} from "@/lib/menuSections/sortOptions";

export type CategoryMode = "menu" | "ingredients";

export function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function getItemCategories(item: MenuItem) {
  const categories = item.categories?.length ? item.categories : ["Other"];
  return categories.map((category) => normalizeCategory(category));
}

export function getVisibleVariants(item: MenuItem, section: string) {
  if (!item.variants || item.variants.length === 0) {
    return item.variants;
  }

  const itemCategories = new Set(getItemCategories(item));

  return item.variants.filter((variant) => {
    if (variant.categories && variant.categories.length > 0) {
      return variant.categories.some(
        (category) => normalizeCategory(category) === section
      );
    }

    return itemCategories.has(section);
  });
}

export function categorySectionId(category: string) {
  return `menu-section-${normalizeCategory(category).replace(/[^a-z0-9]+/g, "-")}`;
}

function buildSectionPriorityLookup(sectionOrder: readonly string[]) {
  return new Map(
    sectionOrder.map((section, index) => [normalizeCategory(section), index] as const)
  );
}

const menuSectionPriorityLookup = buildSectionPriorityLookup(MENU_SECTION_ORDER);
const ingredientSectionPriorityLookup = buildSectionPriorityLookup(
  INGREDIENT_SECTION_ORDER
);

function categoryPriority(category: string, mode: CategoryMode) {
  const lookup =
    mode === "ingredients"
      ? ingredientSectionPriorityLookup
      : menuSectionPriorityLookup;
  return lookup.get(category) ?? Number.POSITIVE_INFINITY;
}

function titleCase(text: string) {
  return text
    .split(/([\s&-]+)/)
    .map((part) => {
      if (/^[\s&-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function getSortNutrition(item: MenuItem) {
  return getDefaultMenuItemNutrition(item);
}

function compareNumericWithMissingLast(
  left: number | undefined,
  right: number | undefined,
  direction: "asc" | "desc"
) {
  const leftMissing = left === undefined || Number.isNaN(left);
  const rightMissing = right === undefined || Number.isNaN(right);

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  return direction === "asc" ? left - right : right - left;
}

export function sortItems(
  items: MenuItem[],
  sort: SortOption,
  categoryMode: CategoryMode = "menu"
) {
  const sorted = [...items];

  if (isDefaultOrderSort(sort)) {
    const groupedByCategory = sorted.reduce<Record<string, MenuItem[]>>((acc, item) => {
      const primaryCategory = getItemCategories(item)[0] ?? "";
      if (!acc[primaryCategory]) {
        acc[primaryCategory] = [];
      }
      acc[primaryCategory].push(item);
      return acc;
    }, {});

    Object.values(groupedByCategory).forEach((group) => {
      group.sort((a, b) => {
        const orderDiff = compareNumericWithMissingLast(
          a.defaultOrder,
          b.defaultOrder,
          "asc"
        );
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
    });

    const orderedCategories = getOrderedMenuSections(sorted, categoryMode);
    const orderedUncategorizedItems = groupedByCategory[""] ?? [];

    return [
      ...orderedCategories.flatMap((category) => groupedByCategory[category] ?? []),
      ...orderedUncategorizedItems,
    ];
  } else if (sort === SORT_OPTION_VALUES.HIGHEST_PROTEIN) {
    sorted.sort((a, b) =>
      compareNumericWithMissingLast(
        getSortNutrition(a).protein,
        getSortNutrition(b).protein,
        "desc"
      )
    );
  } else if (sort === SORT_OPTION_VALUES.BEST_RATIO) {
    sorted.sort((a, b) => {
      const aNutrition = getSortNutrition(a);
      const bNutrition = getSortNutrition(b);

      return compareNumericWithMissingLast(
        getProteinPer100Calories(aNutrition.protein, aNutrition.calories),
        getProteinPer100Calories(bNutrition.protein, bNutrition.calories),
        "desc"
      );
    });
  } else {
    sorted.sort((a, b) =>
      compareNumericWithMissingLast(
        getSortNutrition(a).calories,
        getSortNutrition(b).calories,
        "asc"
      )
    );
  }

  return sorted;
}

export function getOrderedMenuSections(
  items: MenuItem[],
  mode: CategoryMode = "menu"
) {
  const sectionSet = new Set<string>();

  items.forEach((item) => {
    getItemCategories(item).forEach((category) => sectionSet.add(category));
    item.variants?.forEach((variant) => {
      variant.categories?.forEach((category) => {
        sectionSet.add(normalizeCategory(category));
      });
    });
  });

  return [...sectionSet].sort((a, b) => {
    const priorityDiff = categoryPriority(a, mode) - categoryPriority(b, mode);
    if (priorityDiff !== 0) return priorityDiff;
    return a.localeCompare(b);
  });
}

export function getCategoryLabel(category: string, _mode: CategoryMode = "menu") {
  return titleCase(normalizeCategory(category));
}
