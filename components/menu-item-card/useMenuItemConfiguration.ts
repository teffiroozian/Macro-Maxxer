import { useMemo, useState } from "react";
import type { AddonOption, MenuItem, RestaurantAddons } from "@/types/menu";
import type { AddonRef, CommonChange } from "@/lib/addonTypes";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";
import { getDefaultIngredientCounts } from "@/lib/menuItemCalculations";
import {
  getSelectedAddonsFromLabel,
  getSelectedCommonChangeIdsFromCustomizations,
  getSelectedSauceCountsFromLabel,
} from "@/lib/menuItemCard/cartLabelUtils";
import { parseComboCustomization } from "@/lib/menuItemCard/comboCustomizationParser";
import { getSelectedIngredientCountsFromCustomizations } from "@/lib/menuItemCard/ingredientCountCustomization";

export function useMenuItemConfiguration({
  mode,
  item,
  addons,
  commonChanges,
  initialCartOptionsLabel,
  initialCartCustomizations,
  resolvedIngredients,
}: {
  mode: "menu" | "cart";
  item: MenuItem;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  initialCartOptionsLabel?: string;
  initialCartCustomizations?: string[];
  resolvedIngredients: ResolvedPanelIngredient[];
}) {
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>(() =>
    mode === "cart" ? getSelectedAddonsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    mode === "cart" ? getSelectedSauceCountsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>(() =>
    mode === "cart" ? getSelectedCommonChangeIdsFromCustomizations(commonChanges, initialCartCustomizations) : []
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
    setSelectedCommonChangeIds([]);
    setSelectedIngredientCounts(getDefaultIngredientCounts(resolvedIngredients));
  };

  return {
    selectedAddons,
    setSelectedAddons,
    selectedSauceCounts,
    setSelectedSauceCounts,
    selectedCommonChangeIds,
    setSelectedCommonChangeIds,
    selectedIngredientCounts,
    setSelectedIngredientCounts,
    comboType,
    setComboType,
    parsedInitialComboCustomization,
    resetConfiguration,
  };
}
