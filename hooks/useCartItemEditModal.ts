"use client";

import { useState } from "react";
import type { CartItem } from "@/types/cart";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { buildCartMenuItemFromState } from "@/lib/cart/buildItemAdapters";
import { hasUnavailablePreviewCustomization, resolveCartStandardCatalogSelection, usesPreviewCatalogSelection } from "@/lib/cart/cartItemLookup";
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
  const itemId = usesPreviewCatalogSelection(cartItem.restaurantId) &&
      cartItem.selection.type === "standard"
    ? resolveCartStandardCatalogSelection(cartItem)?.item.id
    : cartItem.itemId;
  return restaurant.items.find((item) => (item.id ?? item.name) === itemId) ?? null;
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

      const catalogItem = getSourceItem(cartItem, restaurant);
      const unavailableInPreview = usesPreviewCatalogSelection(cartItem.restaurantId) &&
        cartItem.selection.type === "standard" && (!catalogItem || hasUnavailablePreviewCustomization(cartItem));
      const sourceItem = buildCartMenuItemFromState(cartItem, catalogItem, restaurant.ingredients);

      setEditState({
        cartItemId: cartItem.id,
        restaurant,
        sourceItem,
        addons: resolveAddonMenuItems(restaurant.addonGroups, restaurant.items),
        mode: unavailableInPreview ? "preview" : mode,
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
