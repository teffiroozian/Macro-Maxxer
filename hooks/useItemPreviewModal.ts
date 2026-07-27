"use client";

import { useState } from "react";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getRestaurantData } from "@/lib/restaurants";

export type ItemPreviewState = {
  restaurant: RestaurantData;
  item: MenuItem;
  addons: ResolvedAddonGroups;
};

// Opens the existing ItemRouteModal ("closeBehavior=local") over whatever
// page is currently mounted, without any navigation — no route change, no
// history entry. This is the same pattern app/cart/page.tsx already uses
// (useCartItemEditModal) to view/edit an existing cart item locally, but for
// a brand-new item (no cartItemId) that hasn't been added to the cart yet.
// Used by Global Search to open a menu-item result from any page context
// that isn't itself the item's own restaurant page (where the intercepted
// route modal already handles it).
export function useItemPreviewModal() {
  const [previewState, setPreviewState] = useState<ItemPreviewState | null>(null);

  const closePreview = () => {
    setPreviewState(null);
  };

  const openPreview = async (restaurantId: string, item: MenuItem) => {
    const restaurant = await getRestaurantData(restaurantId);
    if (!restaurant) {
      return;
    }

    setPreviewState({
      restaurant,
      item,
      addons: resolveAddonMenuItems(restaurant.addonGroups, restaurant.items),
    });
  };

  return {
    previewState,
    openPreview,
    closePreview,
  };
}
