"use client";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";

export function useNativeQuickAdd(restaurantId: string) {
  const { openPreview } = useGlobalItemPreview();
  const { requestAddItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
  const open = (item: MenuItem) => void openPreview(restaurantId, item);
  const add = (item: MenuItem) => {
    const variant = item.variants?.find((v) => v.id === item.defaultVariantId) ?? item.variants?.[0];
    const nutrition = resolveMenuItemVariantNutrition(item, variant);
    const itemId = item.id ?? item.name;
    const match = getMatchingItem({ restaurantId, itemId, variantId: variant?.id });
    if (match) {
      updateQuantity(match.id, match.quantity + 1, { markAsJustAdded: true });
      trackAddToCart(getCartItemAddToCartAnalytics(match, 1));
      return;
    }
    requestAddItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId,
      ...buildStandardCartItemPayload({ item, selectedVariant: variant, quantity: 1, nutritionPerItem: nutrition }),
    });
  };
  return { open, add };
}
