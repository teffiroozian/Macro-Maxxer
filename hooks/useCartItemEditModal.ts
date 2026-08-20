"use client";

import { useState } from "react";
import type { CartItem } from "@/types/cart";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { buildCartMenuItemFromState } from "@/lib/cart/buildItemAdapters";
import { getRestaurantData } from "@/lib/restaurants";

export type CartItemModalMode = "preview" | "edit";

export type CartItemEditState = {
  cartItemId: string;
  restaurant: RestaurantData;
  sourceItem: MenuItem;
  addons: ResolvedAddonGroups;
  mode: CartItemModalMode;
};

function getSourceItem(cartItem: CartItem, restaurant: RestaurantData) {
  return restaurant.items.find((item) => (item.id ?? item.name) === cartItem.itemId) ?? null;
}

export function useCartItemEditModal() {
  const [editState, setEditState] = useState<CartItemEditState | null>(null);
  const [loadingEditItemId, setLoadingEditItemId] = useState<string | null>(null);

  const closeEditModal = () => {
    setEditState(null);
  };

  const openModal = async (cartItem: CartItem, mode: CartItemModalMode) => {
    setLoadingEditItemId(cartItem.id);
    try {
      const restaurant = await getRestaurantData(cartItem.restaurantId);
      if (!restaurant) return;

      const sourceItem = buildCartMenuItemFromState(cartItem, getSourceItem(cartItem, restaurant), restaurant.ingredients);

      setEditState({
        cartItemId: cartItem.id,
        restaurant,
        sourceItem,
        addons: resolveAddonMenuItems(restaurant.addonGroups, restaurant.items),
        mode,
      });
    } finally {
      setLoadingEditItemId(null);
    }
  };

  return {
    editState,
    loadingEditItemId,
    openModal,
    closeEditModal,
  };
}
