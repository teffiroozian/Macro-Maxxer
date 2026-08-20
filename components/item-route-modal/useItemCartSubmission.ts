"use client";

import { useCallback, useMemo } from "react";
import type { IngredientItem, ItemVariant, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import type { CartItem, CartSelectionOption } from "@/types/cart";
import { useCart } from "@/stores/cartStore";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import {
  buildComboCustomizations,
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
  combo: Parameters<typeof buildComboCustomizations>[0];
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
  const { updateItem } = useCart();
  const { requestAddItem } = useCartAddConfirmation();
  const isEditing = Boolean(editingCartItem);
  const submitButtonLabel = isEditing ? "Update" : "Add to Cart";

  // Shared by both submitCartItem (closes the modal) and saveChangesInPlace
  // (keeps it open, for the Customize → Save Changes → updated Preview
  // flow) — builds the right payload for whichever item type this is and
  // writes it to the cart store, without any closing/navigation behavior of
  // its own.
  const commitCartItem = useCallback(() => {
    if (chipotle.isPrebuiltBuilderItem) {
      const payload = createChipotleCartItemPayload({ item, quantity, chipotle });

      if (editingCartItem) {
        updateItem(editingCartItem.id, payload);
        return;
      }

      requestAddItem({
        id: crypto.randomUUID(),
        restaurantId,
        itemId: item.id ?? item.name,
        ...payload,
      });
      return;
    }

    // Combo side/drink customizations are built directly from the resolved
    // MenuItem/ItemVariant (buildComboCustomizations) rather than round-tripped
    // through a display label + customizationFromLabel — that round-trip
    // loses the real itemId/variantId for any catalog item whose name
    // contains parentheses (e.g. Chick-fil-A's Sunjoy drinks), which broke
    // the cart Preview modal's image/nutrition resolution for those items.
    const comboCustomizations = buildComboCustomizations(standard.combo);
    const ingredientCustomizations = customizationsFromLabels(standard.selectedIngredientCustomizations) ?? [];
    const customizations = [...ingredientCustomizations, ...comboCustomizations];
    const standardPayload = buildStandardCartItemPayload({
      item,
      selectedVariant: standard.selectedVariant,
      quantity,
      customizations: customizations.length > 0 ? customizations : undefined,
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

    if (editingCartItem) {
      updateItem(editingCartItem.id, nextCartItemPayload);
      return;
    }

    requestAddItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId: item.id ?? item.name,
      ...nextCartItemPayload,
    });
  }, [
    requestAddItem,
    chipotle,
    editingCartItem,
    ingredients,
    item,
    quantity,
    restaurantId,
    standard,
    updateItem,
  ]);

  // Add-to-cart / Done-from-preview / preset-review path: closes the modal
  // first (so a toast/confirmation isn't hidden behind it), then commits on
  // the next tick.
  const submitCartItem = useCallback(() => {
    onAfterSubmit();
    window.setTimeout(commitCartItem, 0);
  }, [commitCartItem, onAfterSubmit]);

  // Customize → Save Changes path for an item already in the cart: commits
  // immediately and leaves the modal open — the caller is responsible for
  // switching back to the Preview state so the just-saved item is what
  // renders there.
  const saveChangesInPlace = useCallback(() => {
    commitCartItem();
  }, [commitCartItem]);

  return useMemo(
    () => ({
      isEditing,
      submitButtonLabel,
      submitCartItem,
      saveChangesInPlace,
    }),
    [isEditing, submitButtonLabel, submitCartItem, saveChangesInPlace]
  );
}
