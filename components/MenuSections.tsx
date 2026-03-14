"use client";

import type { CommonChange, IngredientItem, MenuItem, RestaurantAddons } from "@/types/menu";
import type { SortOption } from "./ControlsRow";
import MenuItemCard from "./MenuItemCard";
import { toItemSlug } from "@/lib/restaurants";

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function getItemCategories(item: MenuItem) {
  const categories = item.categories?.length ? item.categories : ["Other"];
  return categories.map((category) => normalizeCategory(category));
}

function getVisibleVariants(item: MenuItem, section: string) {
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

const CATEGORY_PRIORITY_GROUPS = [
  { label: "Entrees", aliases: ["entree", "entrees"] },
  { label: "Burgers", aliases: ["burger", "burgers"] },
  { label: "Sandwiches", aliases: ["sandwich", "sandwiches"] },
  {
    label: "Chicken",
    aliases: ["wings", "wing", "tenders", "tender", "nuggets", "nugget"],
  },
  {
    label: "Bowls & Plates",
    aliases: ["bowl", "bowls", "plate", "plates", "bowls & plates"],
  },
  { label: "Salads", aliases: ["salad", "salads"] },
  { label: "Wraps", aliases: ["wrap", "wraps"] },
  { label: "Breakfast", aliases: ["breakfast"] },
  { label: "Kids", aliases: ["kid", "kids"] },
  { label: "Sides", aliases: ["side", "sides"] },
  {
    label: "Dipping Sauces",
    aliases: ["sauce", "sauces", "dipping sauce", "dipping sauces"],
  },
  {
    label: "Dressings",
    aliases: ["dressing", "dressings"],
  },
  { label: "Desserts", aliases: ["dessert", "desserts"] },
  { label: "Drinks", aliases: ["drink", "drinks", "beverage", "beverages"] },
] as const;

const INGREDIENT_CATEGORY_PRIORITY_GROUPS = [
  { label: "Proteins", aliases: ["protein", "proteins"] },
  { label: "Buns", aliases: ["bun", "buns"] },
  {
    label: "Sandwich Toppings",
    aliases: ["sandwich topping", "sandwich toppings"],
  },
  { label: "Wrap Toppings", aliases: ["wrap topping", "wrap toppings"] },
  { label: "Salad Toppings", aliases: ["salad topping", "salad toppings"] },
  {
    label: "Salad Condiments",
    aliases: ["salad condiment", "salad condiments"],
  },
  { label: "Soup Toppings", aliases: ["soup topping", "soup toppings"] },
  {
    label: "Parfait Toppings",
    aliases: ["parfait topping", "parfait toppings"],
  },
  { label: "Treat Toppings", aliases: ["treat topping", "treat toppings"] },
  { label: "Condiments", aliases: ["condiment", "condiments"] },
  {
    label: "Dipping Sauces",
    aliases: ["sauce", "sauces", "dipping sauce", "dipping sauces"],
  },
  { label: "Dressings", aliases: ["dressing", "dressings"] },
] as const;

type CategoryMode = "menu" | "ingredients";

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
  if (
    item.nutrition.calories === undefined ||
    item.nutrition.protein === undefined ||
    item.nutrition.protein <= 0
  ) {
    return undefined;
  }

  return item.nutrition.calories / item.nutrition.protein;
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

export function sortItems(items: MenuItem[], sort: SortOption) {
  const sorted = [...items];

  if (sort === "highest-protein") {
    sorted.sort((a, b) =>
      compareNumericWithMissingLast(
        a.nutrition.protein,
        b.nutrition.protein,
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
        a.nutrition.calories,
        b.nutrition.calories,
        "asc"
      )
    );
  }

  return sorted;
}

const ALWAYS_LOWEST_CALORIE_SECTIONS = new Set([
  "sauce",
  "sauces",
  "dipping sauce",
  "dipping sauces",
  "dressing",
  "dressings",
  "drink",
  "drinks",
  "treat",
  "treats",
]);

function getSectionSort(section: string, sort: SortOption): SortOption {
  if (ALWAYS_LOWEST_CALORIE_SECTIONS.has(normalizeCategory(section))) {
    return "lowest-calories";
  }

  return sort;
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


function EmptyFilteredState() {
  return (
    <div
      style={{
        marginTop: 32,
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 16,
        padding: "18px 16px",
        color: "rgba(0,0,0,0.72)",
        fontWeight: 500,
      }}
    >
      No items match these filters. Try lowering protein minimum or increasing calories.
    </div>
  );
}

export default function MenuSections({
  restaurantId,
  items,
  sort,
  addons,
  ingredients,
  commonChanges,
  groupByCategory = true,
  categoryMode = "menu",
}: {
  restaurantId: string;
  items: MenuItem[];
  sort: SortOption;
  addons?: RestaurantAddons;
  ingredients?: IngredientItem[];
  commonChanges?: CommonChange[];
  groupByCategory?: boolean;
  categoryMode?: CategoryMode;
}) {

  if (!groupByCategory) {
    const sortedItems = sortItems(items, sort);

    if (!sortedItems.length) {
      return <EmptyFilteredState />;
    }

    return (
      <div style={{ marginTop: 32, display: "grid", gap: 12 }}>
        <ul style={{ marginTop: 0, padding: 0, display: "grid", gap: 12 }}>
          {sortedItems.map((item, index) => (
            <MenuItemCard
              key={`${item.name}-${index}`}
              restaurantId={restaurantId}
              item={item}
              addons={addons}
              ingredientItems={ingredients}
              menuItems={items}
              commonChanges={commonChanges}
              itemHref={`/restaurant/${restaurantId}/items/${toItemSlug(item)}`}
            />
          ))}
        </ul>
      </div>
    );
  }

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const itemCategories = new Set(getItemCategories(item));
    const categoryKeys = new Set([...itemCategories]);
    item.variants?.forEach((variant) => {
      variant.categories?.forEach((category) => {
        categoryKeys.add(normalizeCategory(category));
      });
    });

    categoryKeys.forEach((key) => {
      if (!acc[key]) acc[key] = [];

      if (!item.variants || item.variants.length === 0) {
        if (itemCategories.has(key)) {
          acc[key].push(item);
        }
        return;
      }

      const visibleVariants = getVisibleVariants(item, key);
      if (!visibleVariants || visibleVariants.length === 0) {
        return;
      }

      acc[key].push({
        ...item,
        variants: visibleVariants,
      });
    });

    return acc;
  }, {});
  const sortedGrouped = Object.fromEntries(
    Object.entries(grouped).map(([key, value]) => [
      key,
      sortItems(value, getSectionSort(key, sort)),
    ])
  );

  const sections = getOrderedMenuSections(items, categoryMode);

  if (!sections.length) {
    return <EmptyFilteredState />;
  }

  return (
    <div style={{display: "grid", gap: 80 }}>
      {sections.map((section) => (
        <section
          key={section}
          id={categorySectionId(section)}
          style={{ scrollMarginTop: 0 }}
        >
          <h2 className="my-5 text-3xl font-bold text-slate-900">
            {categoryHeading(section, categoryMode)}
          </h2>
          <ul style={{ marginTop: 12, padding: 0, display: "grid", gap: 12 }}>
            {(sortedGrouped[section] ?? []).map((item, index) => (
              <MenuItemCard
                key={`${item.name}-${index}`}
                restaurantId={restaurantId}
                item={item}
                addons={addons}
                ingredientItems={ingredients}
                menuItems={items}
                commonChanges={commonChanges}
                itemHref={`/restaurant/${restaurantId}/items/${toItemSlug(item)}`}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
