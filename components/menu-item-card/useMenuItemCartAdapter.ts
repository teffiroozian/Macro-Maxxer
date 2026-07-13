import { useMemo } from "react";
import { getCartItemVariantId } from "@/lib/cart/itemAccessors";
import { useCart } from "@/stores/cartStore";

type MatchingSignatureInput = {
  restaurantId: string;
  itemId: string;
  variantId?: string;
  optionSelections?: import("@/types/cart").CartSelectionOption[];
  customizations?: import("@/types/cart").CartCustomization[];
};

export function useMenuItemCartAdapter() {
  const { items, addItem, updateQuantity } = useCart();

  const cartIndex = useMemo(() => {
    const index = new Map<string, (typeof items)[number]>();
    items.forEach((item) => {
      const key = [
        item.restaurantId,
        item.itemId,
        getCartItemVariantId(item) ?? "",
        (item.selection.type === "standard" ? JSON.stringify(item.selection.optionSelections ?? []) : ""),
        JSON.stringify(item.customizations ?? []),
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
      JSON.stringify(input.optionSelections ?? []),
      JSON.stringify(input.customizations ?? []),
    ].join("::");

    return cartIndex.get(key);
  };

  return {
    addItem,
    updateQuantity,
    getMatchingItem,
  };
}
