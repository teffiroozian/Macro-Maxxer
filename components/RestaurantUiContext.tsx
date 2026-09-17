"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import type { CartItem } from "@/types/cart";

type RestaurantUiContextValue = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // Opens the same shared item-preview modal CartPreviewDrawer uses, rendered
  // once here (a sibling of CartPreviewDrawer in RestaurantPageContent) — a
  // caller nested deep inside the sticky nav's own fixed/z-index stacking
  // context (e.g. CartIconDropdown's "Just Added" popover) can't render its
  // own ItemRouteModal instance in place and expect it to stack above the
  // page's sticky build bar, since it'd be capped at the nav's local z-index
  // instead of competing globally. Routing through this shared instance
  // instead keeps every "open this cart item" entry point on the one modal
  // that's already positioned outside that stacking context.
  openItemPreview: (cartItem: CartItem) => void;
};

const RestaurantUiContext = createContext<RestaurantUiContextValue | null>(null);

export function RestaurantUiProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { editState, openModal, closeEditModal } = useCartItemEditModal();

  const value = useMemo(
    () => ({
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      openItemPreview: (cartItem: CartItem) => openModal(cartItem, "preview"),
    }),
    [isCartOpen, openModal]
  );

  return (
    <RestaurantUiContext.Provider value={value}>
      {children}
      {editState ? (
        <ItemRouteModal
          restaurantId={editState.restaurant.id}
          restaurantName={editState.restaurant.name}
          restaurantPath={`/restaurant/${editState.restaurant.id}`}
          item={editState.sourceItem}
          menuItems={editState.restaurant.items}
          addons={editState.addons}
          ingredients={editState.restaurant.ingredients}
          customizationRules={editState.restaurant.customizationRules}
          builderConfig={editState.restaurant.builderConfig}
          closeBehavior="local"
          editCartItemId={editState.cartItemId}
          initialMode={editState.mode}
          onClose={closeEditModal}
        />
      ) : null}
    </RestaurantUiContext.Provider>
  );
}

export function useRestaurantUi() {
  const context = useContext(RestaurantUiContext);

  if (!context) {
    throw new Error("useRestaurantUi must be used within RestaurantUiProvider");
  }

  return context;
}

export function useOptionalRestaurantUi() {
  return useContext(RestaurantUiContext);
}
