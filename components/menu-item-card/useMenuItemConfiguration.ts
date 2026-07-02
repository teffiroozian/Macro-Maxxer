import { useMemo, useState } from "react";
import type { SelectedAddon } from "@/types/cart";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";
import { getDefaultIngredientCounts } from "@/lib/menuItemCalculations";
import {
  getSelectedAddonsFromLabel,
  getSelectedAddonsFromStructuredData,
  getSelectedSauceCountsFromLabel,
  getSelectedSauceCountsFromStructuredData,
} from "@/lib/menuItemCard/cartLabelUtils";
import { parseComboCustomization } from "@/lib/menuItemCard/comboCustomizationParser";
import { getSelectedIngredientCountsFromCustomizations } from "@/lib/menuItemCard/ingredientCountCustomization";

export function useMenuItemConfiguration({
  mode,
  item,
  addons,
  initialCartSelectionDetailsLabel,
  initialCartSelectedAddons,
  initialCartCustomizations,
  resolvedIngredients,
}: {
  mode: "menu" | "cart";
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  initialCartSelectionDetailsLabel?: string;
  initialCartSelectedAddons?: SelectedAddon[];
  initialCartCustomizations?: string[];
  resolvedIngredients: ResolvedPanelIngredient[];
}) {
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<string, MenuItem>>>(() =>
    mode === "cart"
      ? initialCartSelectedAddons
        ? getSelectedAddonsFromStructuredData(item, addons, initialCartSelectedAddons)
        : getSelectedAddonsFromLabel(item, addons, initialCartSelectionDetailsLabel)
      : {}
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    mode === "cart"
      ? initialCartSelectedAddons
        ? getSelectedSauceCountsFromStructuredData(item, addons, initialCartSelectedAddons)
        : getSelectedSauceCountsFromLabel(item, addons, initialCartSelectionDetailsLabel)
      : {}
  );

  const parsedInitialComboCustomization = useMemo(
    () => parseComboCustomization(mode === "cart" ? initialCartCustomizations : undefined),
    [initialCartCustomizations, mode]
  );

  const [comboType, setComboType] = useState<"just-item" | "combo-meal">(parsedInitialComboCustomization.comboType);
  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(() =>
    getSelectedIngredientCountsFromCustomizations(resolvedIngredients, mode === "cart" ? initialCartCustomizations : undefined)
  );

  const resetConfiguration = () => {
    setSelectedAddons({});
    setSelectedSauceCounts({});
    setSelectedIngredientCounts(getDefaultIngredientCounts(resolvedIngredients));
  };

  return {
    selectedAddons,
    setSelectedAddons,
    selectedSauceCounts,
    setSelectedSauceCounts,
    selectedIngredientCounts,
    setSelectedIngredientCounts,
    comboType,
    setComboType,
    parsedInitialComboCustomization,
    resetConfiguration,
  };
}
