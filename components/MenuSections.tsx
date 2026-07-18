"use client";

import type { IngredientItem, MenuItem, ResolvedAddonGroups, RestaurantCustomizationRules } from "@/types/menu";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import MenuItemCard from "./MenuItemCard";
import EmptyStateCard from "./EmptyStateCard";
import { toItemSlug } from "@/lib/restaurants";
import {
  type CategoryMode,
  categorySectionId,
  getCategoryLabel,
  getItemCategories,
  getOrderedMenuSections,
  getVisibleVariants,
  normalizeCategory,
  sortItems,
} from "@/lib/menuSections/sorting";
import { isSplitRankingSort } from "@/lib/menuSections/sortOptions";
import { splitItemsByVariantForRanking } from "@/lib/menuSections/ranking";

function getSectionSort(_section: string, sort: SortOption): SortOption {
  return sort;
}

function EmptyFilteredState() {
  return (
    <EmptyStateCard
      variant="compact"
      align="left"
      title="No items match the selected options."
      className="mt-8 px-4 py-[18px]"
    />
  );
}

type IngredientOption = { id: string; label: string };
type IngredientPortionModeOption = IngredientOption & { disabled?: boolean };

export type MenuSectionsIngredientSelectionConfig = {
  selectedIds?: Set<string>;
  lockedIds?: Set<string>;
  unavailableIds?: Set<string>;
  unavailableReasonById?: Record<string, string>;
  selectionControlById?: Record<string, "checkbox" | "radio">;
  radioGroupNameById?: Record<string, string>;
  variantOptionsById?: Record<string, IngredientOption[]>;
  selectedVariantIdById?: Record<string, string>;
  portionBadgeById?: Record<string, string>;
  portionModeOptionsById?: Record<string, IngredientPortionModeOption[]>;
  selectedPortionModeIdById?: Record<string, string>;
  onSelectionChange?: (item: MenuItem, selected: boolean) => void;
  onPortionModeChange?: (item: MenuItem, modeId: string) => void;
  onVariantChange?: (item: MenuItem, variantId: string) => void;
};

type MenuSectionsProps = {
  restaurantId: string;
  items: MenuItem[];
  sort: SortOption;
  addons?: ResolvedAddonGroups;
  ingredients?: IngredientItem[];
  customizationRules?: RestaurantCustomizationRules;
  groupByCategory?: boolean;
  categoryMode?: CategoryMode;
  hasBuildYourOwn?: boolean;
  ingredientSelectionConfig?: MenuSectionsIngredientSelectionConfig;
};

export default function MenuSections({
  restaurantId,
  items,
  sort,
  addons,
  ingredients,
  customizationRules,
  groupByCategory = true,
  categoryMode = "menu",
  hasBuildYourOwn = false,
  ingredientSelectionConfig,
}: MenuSectionsProps) {
  const getIngredientSelection = (item: MenuItem) => {
    const itemId = item.id ?? "";

    return {
      displayMode:
        categoryMode === "ingredients" && hasBuildYourOwn
          ? ("ingredient-compact" as const)
          : ("default" as const),
      isSelected: ingredientSelectionConfig?.selectedIds?.has(itemId),
      isLocked: ingredientSelectionConfig?.lockedIds?.has(itemId),
      isUnavailable: ingredientSelectionConfig?.unavailableIds?.has(itemId),
      unavailableReason: ingredientSelectionConfig?.unavailableReasonById?.[itemId],
      onSelectionChange: ingredientSelectionConfig?.onSelectionChange,
      selectionControl: ingredientSelectionConfig?.selectionControlById?.[itemId] ?? ("checkbox" as const),
      radioGroupName: ingredientSelectionConfig?.radioGroupNameById?.[itemId],
      variantOptions: ingredientSelectionConfig?.variantOptionsById?.[itemId],
      selectedVariantId: ingredientSelectionConfig?.selectedVariantIdById?.[itemId],
      portionBadge: ingredientSelectionConfig?.portionBadgeById?.[itemId],
      portionModeOptions: ingredientSelectionConfig?.portionModeOptionsById?.[itemId],
      selectedPortionModeId: ingredientSelectionConfig?.selectedPortionModeIdById?.[itemId],
      onPortionModeChange: (modeId: string) => ingredientSelectionConfig?.onPortionModeChange?.(item, modeId),
      onVariantChange: (variantId: string) => ingredientSelectionConfig?.onVariantChange?.(item, variantId),
    };
  };

  if (!groupByCategory) {
    const displayItems =
      categoryMode === "menu" && isSplitRankingSort(sort)
        ? splitItemsByVariantForRanking(items)
        : items;
    const sortedItems = sortItems(displayItems, sort, categoryMode);

    if (!sortedItems.length) {
      return <EmptyFilteredState />;
    }

    return (
      <div className="mt-8 grid gap-3">
        <ul className="mt-0 p-0 grid gap-3">
          {sortedItems.map((item, index) => (
            <MenuItemCard
              key={`${item.name}-${index}`}
              restaurantId={restaurantId}
              item={item}
              addons={addons}
              ingredientItems={ingredients}
              menuItems={items}
              customizationRules={customizationRules}
              menu={{
                itemHref: `/restaurant/${restaurantId}/${toItemSlug(item)}`,
              }}
              ingredientSelection={getIngredientSelection(item)}
              detailPanel={{
                showDetailsButton: categoryMode !== "ingredients",
              }}
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
      sortItems(value, getSectionSort(key, sort), categoryMode),
    ])
  );

  const sections = getOrderedMenuSections(items, categoryMode);

  if (!sections.length) {
    return <EmptyFilteredState />;
  }

  return (
    <div className="grid gap-10">
      {sections.map((section) => (
        <section
          key={section}
          id={categorySectionId(section)}
          className="scroll-mt-0"
        >
          <h2 className="my-5 text-3xl font-bold text-slate-900">
            {getCategoryLabel(section, categoryMode)}
          </h2>
          <ul className="mt-3 p-0 grid gap-3">
            {(sortedGrouped[section] ?? []).map((item, index) => (
              <MenuItemCard
                key={`${item.name}-${index}`}
                restaurantId={restaurantId}
                item={item}
                addons={addons}
                ingredientItems={ingredients}
                menuItems={items}
                customizationRules={customizationRules}
                menu={{
                  itemHref: `/restaurant/${restaurantId}/${toItemSlug(item)}`,
                }}
                ingredientSelection={getIngredientSelection(item)}
                detailPanel={{
                  showDetailsButton: categoryMode !== "ingredients",
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
