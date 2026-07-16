import { useMemo, useState } from "react";
import { resolvePanelIngredients } from "@/components/ItemDetailsPanel";
import type { CartItem } from "@/types/cart";
import type { IngredientItem, MenuItem, ResolvedAddonGroups, RestaurantCustomizationRules } from "@/types/menu";
import { parseComboCustomization } from "@/lib/menuItemCard/comboCustomizationParser";
import {
  getSelectedAddonsFromSelection,
  getSelectedSauceCountsFromSelection,
} from "@/lib/menuItemCard/cartLabelUtils";
import { getSelectedIngredientCountsFromCustomizations } from "@/lib/menuItemCard/ingredientCountCustomization";
import { getCustomizationLabels } from "@/lib/cart/customizationLabels";
import { getCartItemVariantId } from "@/lib/cart/itemAccessors";
import type { ComboMealConfig } from "@/types/menu";

type UseItemCustomizationStateParams = {
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  ingredients?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
  editingCartItem: CartItem | null;
  comboConfig?: ComboMealConfig;
  comboSides: MenuItem[];
  comboDrinks: MenuItem[];
};

export function useItemCustomizationState({
  item,
  addons,
  ingredients,
  menuItems,
  customizationRules,
  editingCartItem,
  comboConfig,
  comboSides,
  comboDrinks,
}: UseItemCustomizationStateParams) {
  const variants = item.variants?.length ? item.variants : null;
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    return variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);

  const parsedInitialComboCustomization = useMemo(
    () => parseComboCustomization(getCustomizationLabels(editingCartItem?.customizations)),
    [editingCartItem?.customizations]
  );

  const [selectedVariantId, setSelectedVariantId] = useState(
    editingCartItem ? getCartItemVariantId(editingCartItem) ?? defaultVariantId : defaultVariantId
  );
  const [quantity, setQuantity] = useState(editingCartItem?.quantity ?? 1);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<string, MenuItem>>>(() =>
    getSelectedAddonsFromSelection(item, addons, editingCartItem?.selection)
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    getSelectedSauceCountsFromSelection(item, addons, editingCartItem?.selection)
  );

  const resolvedIngredients = useMemo(
    () => resolvePanelIngredients(item, ingredients, addons, menuItems ?? [], variants, selectedVariantId, customizationRules),
    [addons, customizationRules, ingredients, item, menuItems, selectedVariantId, variants]
  );

  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(() =>
    getSelectedIngredientCountsFromCustomizations(resolvedIngredients, getCustomizationLabels(editingCartItem?.customizations))
  );

  const [comboType, setComboType] = useState<"just-item" | "combo-meal">(parsedInitialComboCustomization.comboType);
  const [selectedComboSideId, setSelectedComboSideId] = useState<string | undefined>(() => {
    const side = comboSides.find((option) => option.name === parsedInitialComboCustomization.sideName);
    return side ? (side.id ?? side.name) : comboConfig?.defaultSideId;
  });
  const [selectedComboDrinkId, setSelectedComboDrinkId] = useState<string | undefined>(() => {
    const drink = comboDrinks.find((option) => option.name === parsedInitialComboCustomization.drinkName);
    return drink ? (drink.id ?? drink.name) : comboConfig?.defaultDrinkId;
  });
  const [selectedComboSideVariantId, setSelectedComboSideVariantId] = useState<string | undefined>(() => {
    const side = comboSides.find((option) => option.name === parsedInitialComboCustomization.sideName);
    return side?.variants?.find((variant) => variant.label === parsedInitialComboCustomization.sideVariantLabel)?.id;
  });
  const [selectedComboDrinkVariantId, setSelectedComboDrinkVariantId] = useState<string | undefined>(() => {
    const drink = comboDrinks.find((option) => option.name === parsedInitialComboCustomization.drinkName);
    return drink?.variants?.find((variant) => variant.label === parsedInitialComboCustomization.drinkVariantLabel)?.id;
  });

  return {
    variants,
    defaultVariantId,
    parsedInitialComboCustomization,
    selectedVariantId,
    setSelectedVariantId,
    quantity,
    setQuantity,
    selectedAddons,
    setSelectedAddons,
    selectedSauceCounts,
    setSelectedSauceCounts,
    resolvedIngredients,
    selectedIngredientCounts,
    setSelectedIngredientCounts,
    comboType,
    setComboType,
    selectedComboSideId,
    setSelectedComboSideId,
    selectedComboDrinkId,
    setSelectedComboDrinkId,
    selectedComboSideVariantId,
    setSelectedComboSideVariantId,
    selectedComboDrinkVariantId,
    setSelectedComboDrinkVariantId,
  };
}
