import {
  CATEGORY_PRIORITY_GROUPS,
  INGREDIENT_CATEGORY_PRIORITY_GROUPS,
} from "@/app/data/menuCategoryConfig";
import type { MenuItem } from "@/types/menu";
import type { SortOption } from "@/components/ControlsRow";

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

function buildCategoryPriorityLookup(
  categoryGroups: ReadonlyArray<{ aliases: readonly string[] }>
) {
  return new Map(
    categoryGroups.flatMap((group, index) =>
      group.aliases.map((alias) => [normalizeCategory(alias), index] as const)
    )
  );
}

function buildCategoryLabelLookup(
  categoryGroups: ReadonlyArray<{ label: string; aliases: readonly string[] }>
) {
  return new Map(
    categoryGroups.flatMap((group) =>
      group.aliases.map((alias) => [normalizeCategory(alias), group.label] as const)
    )
  );
}

const menuCategoryPriorityLookup = buildCategoryPriorityLookup(
  CATEGORY_PRIORITY_GROUPS
);
const ingredientCategoryPriorityLookup = buildCategoryPriorityLookup(
  INGREDIENT_CATEGORY_PRIORITY_GROUPS
);

const menuCategoryLabelLookup = buildCategoryLabelLookup(CATEGORY_PRIORITY_GROUPS);
const ingredientCategoryLabelLookup = buildCategoryLabelLookup(
  INGREDIENT_CATEGORY_PRIORITY_GROUPS
);

function categoryPriority(category: string, mode: CategoryMode) {
  const lookup =
    mode === "ingredients"
      ? ingredientCategoryPriorityLookup
      : menuCategoryPriorityLookup;
  return lookup.get(category) ?? Number.POSITIVE_INFINITY;
}

function categoryHeading(category: string, mode: CategoryMode) {
  const lookup =
    mode === "ingredients" ? ingredientCategoryLabelLookup : menuCategoryLabelLookup;
  return lookup.get(category) ?? titleCase(category);
}

function titleCase(text: string) {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function caloriesPerProtein(item: MenuItem) {
  const nutrition = getSortNutrition(item);
  if (
    nutrition.calories === undefined ||
    nutrition.protein === undefined ||
    nutrition.protein <= 0
  ) {
    return undefined;
  }

  return nutrition.calories / nutrition.protein;
}

function getSortNutrition(item: MenuItem) {
  const variants = item.variants ?? [];
  if (variants.length === 0) {
    return item.nutrition;
  }

  const defaultVariant =
    (item.defaultVariantId
      ? variants.find((variant) => variant.id === item.defaultVariantId)
      : undefined) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0];

  return defaultVariant?.nutrition ?? item.nutrition;
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

  if (sort === "default-order") {
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
  } else if (sort === "highest-protein") {
    sorted.sort((a, b) =>
      compareNumericWithMissingLast(
        getSortNutrition(a).protein,
        getSortNutrition(b).protein,
        "desc"
      )
    );
  } else if (sort === "best-ratio") {
    sorted.sort((a, b) =>
      compareNumericWithMissingLast(caloriesPerProtein(a), caloriesPerProtein(b), "asc")
    );
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

export function getCategoryLabel(category: string, mode: CategoryMode = "menu") {
  return categoryHeading(category, mode);
}
