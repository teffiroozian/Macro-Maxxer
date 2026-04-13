import type { MenuItem } from "@/types/menu";
import type { CartItem } from "@/stores/cartStore";
import { toItemSlug } from "@/lib/restaurants";

type CartItemModifyHrefOptions = {
  editOrigin?: string;
  includeEditOriginForBuild?: boolean;
};

export function getCartItemModifyHref(
  cartItem: CartItem,
  sourceItem?: MenuItem | null,
  options?: CartItemModifyHrefOptions
) {
  if (cartItem.buildConfiguration) {
    const nextParams = new URLSearchParams({ editCartItem: cartItem.id });
    if (options?.editOrigin && options.includeEditOriginForBuild) {
      nextParams.set("editOrigin", options.editOrigin);
    }
    nextParams.set("view", "ingredients");
    return `/restaurant/${cartItem.restaurantId}?${nextParams.toString()}`;
  }

  if (!sourceItem) {
    return null;
  }

  const nextParams = new URLSearchParams({ editCartItem: cartItem.id });
  if (options?.editOrigin) {
    nextParams.set("editOrigin", options.editOrigin);
  }

  return `/restaurant/${cartItem.restaurantId}/items/${toItemSlug(sourceItem)}?${nextParams.toString()}`;
}
