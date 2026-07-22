import { useCallback, useMemo } from "react";
import type { ViewOption } from "@/components/controls/types";
import type { MenuItem } from "@/types/menu";
import {
  getCategoryLabel,
  getOrderedMenuSections,
} from "@/lib/menuSections/sorting";
import type {
  ChipotleBuilderConfig,
  ChipotleEntreeSelection,
} from "@/lib/restaurantBuilders/chipotle";

const MENU_VIEW_ENTREE_SELECTIONS = new Set<ChipotleEntreeSelection>([
  "chips-sides",
  "high-protein-menu",
  "drinks",
]);

const LOCKED_TO_MENU_ENTREE_SELECTIONS = new Set<ChipotleEntreeSelection>([
  "chips-sides",
  "drinks",
]);

export function useChipotleMenuControlAdjustments({
  selectedEntree,
  items,
  visibleMenuItems,
  effectiveViewMode,
  chipotleBuilderConfig,
}: {
  selectedEntree: ChipotleEntreeSelection;
  items: MenuItem[];
  visibleMenuItems?: MenuItem[];
  effectiveViewMode?: ViewOption;
  chipotleBuilderConfig?: ChipotleBuilderConfig;
}) {
  const usesMenuView = MENU_VIEW_ENTREE_SELECTIONS.has(selectedEntree);
  const isLockedToMenuView = LOCKED_TO_MENU_ENTREE_SELECTIONS.has(selectedEntree);
  const effectiveViewModeOverride: ViewOption | undefined = usesMenuView
    ? "menu"
    : undefined;

  const controlItems = useMemo(() => {
    if (!usesMenuView) {
      return items;
    }

    return items.filter((item) => item.entreeGroup === selectedEntree);
  }, [usesMenuView, items, selectedEntree]);

  const isViewChangeAllowed = useCallback(
    (nextView: ViewOption) => !isLockedToMenuView || nextView === "menu",
    [isLockedToMenuView],
  );

  const adjustedVisibleMenuItems = useMemo(() => {
    if (!visibleMenuItems) {
      return visibleMenuItems;
    }

    const hiddenSectionNames = selectedEntree
      ? (chipotleBuilderConfig?.hiddenSectionsByEntree?.[selectedEntree] ?? [])
      : [];
    const hiddenSections = new Set(
      hiddenSectionNames.map((section) => section.trim().toLowerCase()),
    );

    if (hiddenSections.size === 0) {
      return visibleMenuItems;
    }

    return visibleMenuItems
      .map((item) => {
        const nextCategories = (item.categories ?? []).filter(
          (category) => !hiddenSections.has(category.trim().toLowerCase()),
        );
        const nextVariants = item.variants?.map((variant) => ({
          ...variant,
          categories: variant.categories?.filter(
            (category) => !hiddenSections.has(category.trim().toLowerCase()),
          ),
        }));

        return {
          ...item,
          categories: nextCategories,
          variants: nextVariants,
        };
      })
      .filter((item) => item.categories.length > 0);
  }, [chipotleBuilderConfig, selectedEntree, visibleMenuItems]);

  const adjustedOrderedSections = useMemo(() => {
    if (!adjustedVisibleMenuItems || !effectiveViewMode) {
      return undefined;
    }

    return getOrderedMenuSections(
      adjustedVisibleMenuItems,
      effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
    );
  }, [adjustedVisibleMenuItems, effectiveViewMode]);

  const adjustedCategoryOptions = useMemo(() => {
    if (!adjustedOrderedSections || !effectiveViewMode) {
      return undefined;
    }

    return adjustedOrderedSections.map((section) => ({
      id: section,
      label: getCategoryLabel(
        section,
        effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
      ),
    }));
  }, [adjustedOrderedSections, effectiveViewMode]);

  return {
    controlItems,
    effectiveViewModeOverride,
    isViewChangeAllowed,
    visibleMenuItems: adjustedVisibleMenuItems,
    orderedSections: adjustedOrderedSections,
    categoryOptions: adjustedCategoryOptions,
  };
}
