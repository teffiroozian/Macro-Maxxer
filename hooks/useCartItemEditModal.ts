"use client";

import { useState } from "react";
import type { CartItem } from "@/types/cart";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getRestaurantData } from "@/lib/restaurants";

export type CartItemEditState = {
  cartItemId: string;
  restaurant: RestaurantData;
  sourceItem: MenuItem;
  addons: ResolvedAddonGroups;
};

function canCustomizeCartItem(cartItem: CartItem) {
  return cartItem.selection.type !== "build-your-own";
}

function getSourceItem(cartItem: CartItem, restaurant: RestaurantData) {
  return restaurant.items.find((item) => (item.id ?? item.name) === cartItem.itemId) ?? null;
}

export function useCartItemEditModal() {
  const [editState, setEditState] = useState<CartItemEditState | null>(null);
  const [loadingEditItemId, setLoadingEditItemId] = useState<string | null>(null);

  const closeEditModal = () => {
    setEditState(null);
  };

  const openEditModal = async (cartItem: CartItem) => {
    if (!canCustomizeCartItem(cartItem)) {
      return;
    }

    setLoadingEditItemId(cartItem.id);
    try {
      const restaurant = await getRestaurantData(cartItem.restaurantId);
      const sourceItem = restaurant ? getSourceItem(cartItem, restaurant) : null;

      if (restaurant && sourceItem) {
        setEditState({
          cartItemId: cartItem.id,
          restaurant,
          sourceItem,
          addons: resolveAddonMenuItems(restaurant.addonGroups, restaurant.items),
        });
      }
    } finally {
      setLoadingEditItemId(null);
    }
  };

  return {
    editState,
    loadingEditItemId,
    openEditModal,
    closeEditModal,
  };
}
