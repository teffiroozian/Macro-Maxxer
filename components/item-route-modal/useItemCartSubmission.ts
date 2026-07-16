"use client";

import { useCallback, useMemo } from "react";
import type { IngredientItem, ItemVariant, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import type { CartItem, CartSelectionOption } from "@/types/cart";
import { useCart } from "@/stores/cartStore";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import {
  buildComboCustomizationLabels,
  buildStandardCartItemPayload,
} from "@/lib/cart/standardItemConfiguration";
import {
  buildHighProteinBuildConfiguration,
  isChipotleHighProteinMenuItem,
} from "@/lib/restaurantBuilders/chipotle/highProtein";
import type { ChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle";
import { toUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";

type SelectedChipotleIngredientItems = Record<string, { item: MenuItem; quantity: number }>;

type CartSubmissionChipotleState = {
  isPrebuiltBuilderItem: boolean;
  buildConfiguration: ChipotleBuildConfiguration;
  selectedIngredientItems: SelectedChipotleIngredientItems;
  selectedIngredientVariantIds: Record<string, string>;
  proteinPortionMode: ChipotleBuildConfiguration["proteinPortionMode"];
  splitPortionModeById: ChipotleBuildConfiguration["splitPortionModeById"];
  selectedTacoCount: ChipotleBuildConfiguration["selectedTacoCount"];
  selectedTacoShellId: string;
  ingredientPortionLabelById: Record<string, string>;
  adjustedTotals: Nutrition;
};

type CartSubmissionStandardState = {
  selectedVariant?: ItemVariant;
  optionSelections?: CartSelectionOption[];
  selectedIngredientCustomizations: string[];
  nutritionPerItem: Nutrition;
  combo: Parameters<typeof buildComboCustomizationLabels>[0];
};

export function useItemCartSubmission({
  restaurantId,
  item,
  ingredients,
  quantity,
  editingCartItem,
  standard,
  chipotle,
  onAfterSubmit,
}: {
  restaurantId: string;
  item: MenuItem;
  ingredients?: IngredientItem[];
  quantity: number;
  editingCartItem: CartItem | null;
  standard: CartSubmissionStandardState;
  chipotle: CartSubmissionChipotleState;
  onAfterSubmit: () => void;
}) {
  const { addItem, updateItem } = useCart();
  const isEditing = Boolean(editingCartItem);
  const submitButtonLabel = isEditing ? "Update" : "Add to Cart";

  const submitCartItem = useCallback(() => {
    if (chipotle.isPrebuiltBuilderItem) {
      const nextBuildConfiguration: ChipotleBuildConfiguration = {
        ...chipotle.buildConfiguration,
        selectedIngredientItems: Object.fromEntries(
          Object.entries(chipotle.selectedIngredientItems).map(([ingredientId, selectedIngredient]) => [
            ingredientId,
            { quantity: selectedIngredient.quantity },
          ])
        ),
        selectedIngredientVariantIds: chipotle.selectedIngredientVariantIds,
        proteinPortionMode: chipotle.proteinPortionMode,
        splitPortionModeById: chipotle.splitPortionModeById,
        selectedTacoCount: chipotle.selectedTacoCount,
        selectedTacoShell: chipotle.selectedTacoShellId === "soft-flour-tortilla" ? "soft" : "crispy",
      };

      const customizationLabels = Object.entries(chipotle.selectedIngredientItems).map(
        ([ingredientId, selectedIngredient]) =>
          `${selectedIngredient.item.name}: ${selectedIngredient.quantity}x${
            chipotle.ingredientPortionLabelById[ingredientId]
              ? ` (${chipotle.ingredientPortionLabelById[ingredientId]})`
              : ""
          }`
      );

      const payload = {
        name: item.name,
        image: item.image,
        quantity,
        customizations: customizationsFromLabels(customizationLabels),
        macrosPerItem: {
          calories: chipotle.adjustedTotals.calories,
          protein: chipotle.adjustedTotals.protein,
          carbs: chipotle.adjustedTotals.carbs,
          totalFat: chipotle.adjustedTotals.totalFat,
        },
        nutritionPerItem: {
          calories: chipotle.adjustedTotals.calories,
          protein: chipotle.adjustedTotals.protein,
          carbs: chipotle.adjustedTotals.carbs,
          totalFat: chipotle.adjustedTotals.totalFat,
        },
        selection: {
          type: "build-your-own" as const,
          buildConfiguration: toUniversalChipotleBuildConfiguration(nextBuildConfiguration),
        },
      };

      onAfterSubmit();
      window.setTimeout(() => {
        if (editingCartItem) {
          updateItem(editingCartItem.id, payload);
          return;
        }

        addItem({
          id: crypto.randomUUID(),
          restaurantId,
          itemId: item.id ?? item.name,
          ...payload,
        });
      }, 0);
      return;
    }

    const comboCustomizationLabels = buildComboCustomizationLabels(standard.combo);
    const customizationLabels = [...standard.selectedIngredientCustomizations, ...comboCustomizationLabels];
    const standardPayload = buildStandardCartItemPayload({
      item,
      selectedVariant: standard.selectedVariant,
      quantity,
      customizations: customizationsFromLabels(customizationLabels),
      optionSelections: standard.optionSelections,
      nutritionPerItem: standard.nutritionPerItem,
    });
    const nextCartItemPayload = {
      ...standardPayload,
      selection:
        editingCartItem?.selection.type === "build-your-own"
          ? editingCartItem.selection
          : isChipotleHighProteinMenuItem(item, restaurantId)
            ? (() => {
                const buildConfiguration = buildHighProteinBuildConfiguration(item, ingredients);
                return buildConfiguration
                  ? {
                      type: "build-your-own" as const,
                      buildConfiguration: toUniversalChipotleBuildConfiguration(buildConfiguration),
                    }
                  : standardPayload.selection;
              })()
            : standardPayload.selection,
    };

    onAfterSubmit();
    window.setTimeout(() => {
      if (editingCartItem) {
        updateItem(editingCartItem.id, nextCartItemPayload);
        return;
      }

      addItem({
        id: crypto.randomUUID(),
        restaurantId,
        itemId: item.id ?? item.name,
        ...nextCartItemPayload,
      });
    }, 0);
  }, [
    addItem,
    chipotle,
    editingCartItem,
    ingredients,
    item,
    onAfterSubmit,
    quantity,
    restaurantId,
    standard,
    updateItem,
  ]);

  return useMemo(
    () => ({
      isEditing,
      submitButtonLabel,
      submitCartItem,
    }),
    [isEditing, submitButtonLabel, submitCartItem]
  );
}
