import { useMemo } from "react";
import type { SelectedAddon } from "@/types/cart";
import { useCart } from "@/stores/cartStore";

function formatSelectedAddonSignature(selectedAddons?: SelectedAddon[]) {
  return (selectedAddons ?? [])
    .filter((addon) => addon.quantity > 0)
    .map((addon) => `${addon.itemId}:${addon.quantity}`)
    .sort()
    .join("|");
}

type MatchingSignatureInput = {
  restaurantId: string;
  itemId: string;
  variantId?: string;
  selectionDetailsLabel?: string;
  selectedAddons?: SelectedAddon[];
  customizations?: string[];
};

export function useMenuItemCartAdapter() {
  const { items, addItem, updateQuantity } = useCart();

  const cartIndex = useMemo(() => {
    const index = new Map<string, (typeof items)[number]>();
    items.forEach((item) => {
      const key = [
        item.restaurantId,
        item.itemId,
        item.variantId ?? "",
        item.selectedAddons ? formatSelectedAddonSignature(item.selectedAddons) : item.selectionDetailsLabel ?? "",
        (item.customizations ?? []).join("|"),
      ].join("::");
      index.set(key, item);
    });
    return index;
  }, [items]);

  const getMatchingItem = (input: MatchingSignatureInput) => {
    const key = [
      input.restaurantId,
      input.itemId,
      input.variantId ?? "",
      input.selectedAddons ? formatSelectedAddonSignature(input.selectedAddons) : input.selectionDetailsLabel ?? "",
      (input.customizations ?? []).join("|"),
    ].join("::");

    return cartIndex.get(key);
  };

  return {
    addItem,
    updateQuantity,
    getMatchingItem,
  };
}
