import { useMemo, useState } from "react";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { ResolvedPanelIngredient } from "@/lib/itemDetails/types";
import { getDefaultIngredientCounts } from "@/lib/menuItemCalculations";
import {
  getSelectedAddonsFromLabel,
  getSelectedSauceCountsFromLabel,
} from "@/lib/menuItemCard/cartLabelUtils";
import { parseComboCustomization } from "@/lib/menuItemCard/comboCustomizationParser";
import { getSelectedIngredientCountsFromCustomizations } from "@/lib/menuItemCard/ingredientCountCustomization";

export function useMenuItemConfiguration({
  mode,
  item,
  addons,
  initialCartSelectionDetailsLabel,
  initialCartCustomizations,
  resolvedIngredients,
}: {
  mode: "menu" | "cart";
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  initialCartSelectionDetailsLabel?: string;
  initialCartCustomizations?: string[];
  resolvedIngredients: ResolvedPanelIngredient[];
}) {
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<string, MenuItem>>>(() =>
    mode === "cart" ? getSelectedAddonsFromLabel(item, addons, initialCartSelectionDetailsLabel) : {}
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    mode === "cart" ? getSelectedSauceCountsFromLabel(item, addons, initialCartSelectionDetailsLabel) : {}
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
