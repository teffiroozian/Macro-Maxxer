import { useMemo } from "react";
import { useCart } from "@/stores/cartStore";

type MatchingSignatureInput = {
  restaurantId: string;
  itemId: string;
  variantId?: string;
  selectionDetailsLabel?: string;
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
        item.selectionDetailsLabel ?? "",
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
      input.selectionDetailsLabel ?? "",
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
