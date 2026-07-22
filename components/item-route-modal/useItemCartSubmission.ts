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
  createChipotleCartItemPayload,
  resolveChipotleStandardItemSelection,
  type ChipotleCartSubmissionState,
} from "@/lib/restaurantBuilders/chipotle/cartAdapter";

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
  chipotle: ChipotleCartSubmissionState;
  onAfterSubmit: () => void;
}) {
  const { addItem, updateItem } = useCart();
  const isEditing = Boolean(editingCartItem);
  const submitButtonLabel = isEditing ? "Update" : "Add to Cart";

  const submitCartItem = useCallback(() => {
    if (chipotle.isPrebuiltBuilderItem) {
      const payload = createChipotleCartItemPayload({ item, quantity, chipotle });

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
      selection: resolveChipotleStandardItemSelection({
        item,
        restaurantId,
        ingredients,
        fallbackSelection: standardPayload.selection,
        editingSelection: editingCartItem?.selection,
      }),
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
