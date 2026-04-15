"use client";

import type { CommonChange, IngredientItem, MenuItem, RestaurantAddons, RestaurantCustomizationRules } from "@/types/menu";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import MenuItemCard from "./MenuItemCard";
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

function getSectionSort(_section: string, sort: SortOption): SortOption {
  return sort;
}

function splitItemsByVariantForRanking(items: MenuItem[]) {
  return items.flatMap((item) => {
    const variants = item.variants ?? [];
    if (variants.length <= 1) {
      return [item];
    }

    const shareableVariants = variants.filter((variant) => variant.portionType === "shareable");
    const splitVariants = variants.filter((variant) => variant.portionType !== "shareable");
    if (splitVariants.length === 0 && shareableVariants.length === 0) {
      return [item];
    }

    const splitItems = splitVariants.map((variant) => ({
      ...item,
      defaultVariantId: variant.id,
      disableVariantSelector: true,
      nutrition: variant.nutrition,
    }));

    if (shareableVariants.length === 0) {
      return splitItems;
    }

    return [
      ...splitItems,
      {
        ...item,
        variants: shareableVariants,
        defaultVariantId: shareableVariants[0]?.id,
        nutrition: shareableVariants[0]?.nutrition ?? item.nutrition,
      },
    ];
  });
}

function EmptyFilteredState() {
  return (
    <div className="mt-8 border border-black/10 rounded-2xl px-4 py-[18px] text-black/70 font-medium">
      No items match the selected options.
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
  customizationRules,
  groupByCategory = true,
  categoryMode = "menu",
  isBuildYourOwn = false,
  selectedIngredientIds,
  onIngredientSelectionChange,
  lockedIngredientIds,
  unavailableIngredientIds,
  unavailableIngredientReasonById,
  ingredientSelectionControlById,
  ingredientRadioGroupNameById,
  ingredientVariantOptionsById,
  selectedIngredientVariantIdById,
  ingredientPortionBadgeById,
  ingredientPortionModeOptionsById,
  selectedIngredientPortionModeIdById,
  onIngredientPortionModeChange,
  onIngredientVariantChange,
}: {
  restaurantId: string;
  items: MenuItem[];
  sort: SortOption;
  addons?: RestaurantAddons;
  ingredients?: IngredientItem[];
  commonChanges?: CommonChange[];
  customizationRules?: RestaurantCustomizationRules;
  groupByCategory?: boolean;
  categoryMode?: CategoryMode;
  isBuildYourOwn?: boolean;
  selectedIngredientIds?: Set<string>;
  onIngredientSelectionChange?: (item: MenuItem, selected: boolean) => void;
  lockedIngredientIds?: Set<string>;
  unavailableIngredientIds?: Set<string>;
  unavailableIngredientReasonById?: Record<string, string>;
  ingredientSelectionControlById?: Record<string, "checkbox" | "radio">;
  ingredientRadioGroupNameById?: Record<string, string>;
  ingredientVariantOptionsById?: Record<string, Array<{ id: string; label: string }>>;
  selectedIngredientVariantIdById?: Record<string, string>;
  ingredientPortionBadgeById?: Record<string, string>;
  ingredientPortionModeOptionsById?: Record<
    string,
    Array<{ id: string; label: string; disabled?: boolean }>
  >;
  selectedIngredientPortionModeIdById?: Record<string, string>;
  onIngredientPortionModeChange?: (item: MenuItem, modeId: string) => void;
  onIngredientVariantChange?: (item: MenuItem, variantId: string) => void;
}) {

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
              commonChanges={commonChanges}
              itemHref={`/restaurant/${restaurantId}/items/${toItemSlug(item)}`}
              displayMode={
                categoryMode === "ingredients" && isBuildYourOwn
                  ? "ingredient-compact"
                  : "default"
              }
              isIngredientSelected={selectedIngredientIds?.has(item.id ?? "")}
              isIngredientLocked={lockedIngredientIds?.has(item.id ?? "")}
              isIngredientUnavailable={unavailableIngredientIds?.has(item.id ?? "")}
              ingredientUnavailableReason={unavailableIngredientReasonById?.[item.id ?? ""]}
              onIngredientSelectionChange={onIngredientSelectionChange}
              ingredientSelectionControl={ingredientSelectionControlById?.[item.id ?? ""] ?? "checkbox"}
              ingredientRadioGroupName={ingredientRadioGroupNameById?.[item.id ?? ""]}
              ingredientVariantOptions={ingredientVariantOptionsById?.[item.id ?? ""]}
              selectedIngredientVariantId={selectedIngredientVariantIdById?.[item.id ?? ""]}
              ingredientPortionBadge={ingredientPortionBadgeById?.[item.id ?? ""]}
              ingredientPortionModeOptions={ingredientPortionModeOptionsById?.[item.id ?? ""]}
              selectedIngredientPortionModeId={selectedIngredientPortionModeIdById?.[item.id ?? ""]}
              onIngredientPortionModeChange={(modeId) => onIngredientPortionModeChange?.(item, modeId)}
              onIngredientVariantChange={(variantId) => onIngredientVariantChange?.(item, variantId)}
              showDetailsButton={categoryMode !== "ingredients"}
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
    <div className="grid gap-20">
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
                commonChanges={commonChanges}
                itemHref={`/restaurant/${restaurantId}/items/${toItemSlug(item)}`}
                displayMode={
                  categoryMode === "ingredients" && isBuildYourOwn
                    ? "ingredient-compact"
                    : "default"
                }
                isIngredientSelected={selectedIngredientIds?.has(item.id ?? "")}
                isIngredientLocked={lockedIngredientIds?.has(item.id ?? "")}
                isIngredientUnavailable={unavailableIngredientIds?.has(item.id ?? "")}
                ingredientUnavailableReason={unavailableIngredientReasonById?.[item.id ?? ""]}
                onIngredientSelectionChange={onIngredientSelectionChange}
                ingredientSelectionControl={ingredientSelectionControlById?.[item.id ?? ""] ?? "checkbox"}
                ingredientRadioGroupName={ingredientRadioGroupNameById?.[item.id ?? ""]}
                ingredientVariantOptions={ingredientVariantOptionsById?.[item.id ?? ""]}
                selectedIngredientVariantId={selectedIngredientVariantIdById?.[item.id ?? ""]}
                ingredientPortionBadge={ingredientPortionBadgeById?.[item.id ?? ""]}
                ingredientPortionModeOptions={ingredientPortionModeOptionsById?.[item.id ?? ""]}
                selectedIngredientPortionModeId={selectedIngredientPortionModeIdById?.[item.id ?? ""]}
                onIngredientPortionModeChange={(modeId) => onIngredientPortionModeChange?.(item, modeId)}
                onIngredientVariantChange={(variantId) => onIngredientVariantChange?.(item, variantId)}
                showDetailsButton={categoryMode !== "ingredients"}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
