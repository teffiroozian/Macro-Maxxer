"use client";

import { useMemo, useRef } from "react";
import AppButton from "@/components/ui/AppButton";
import Dialog from "@/components/ui/Dialog";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { useCart } from "@/stores/cartStore";
import { getAllRestaurants } from "@/lib/restaurants";

export default function CrossRestaurantCartDialog() {
  const { pendingConflict, confirmAddAnyway, confirmReplaceCart, cancelPendingAdd } = useCartAddConfirmation();
  const { items } = useCart();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const restaurants = useMemo(() => getAllRestaurants(), []);

  if (!pendingConflict) {
    return null;
  }

  const restaurantName = (id: string) => restaurants.find((restaurant) => restaurant.id === id)?.name ?? id;
  const existingRestaurantNames = Array.from(new Set(items.map((item) => item.restaurantId))).map(restaurantName);
  const newRestaurantName = restaurantName(pendingConflict.item.restaurantId);

  return (
    <Dialog
      onClose={cancelPendingAdd}
      titleId="cross-restaurant-dialog-title"
      descriptionId="cross-restaurant-dialog-description"
      initialFocusRef={cancelButtonRef}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Different Restaurant
      </p>
      <h2 id="cross-restaurant-dialog-title" className="mt-2 text-xl font-bold text-slate-900">
        Add from {newRestaurantName}?
      </h2>
      <p id="cross-restaurant-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
        Your cart has items from {existingRestaurantNames.join(", ")}. You can add this item alongside them, or
        replace your cart so it only contains this item.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <AppButton variant="primary" size="md" onClick={confirmAddAnyway}>
          Add Anyway
        </AppButton>
        <AppButton variant="secondary" size="md" onClick={confirmReplaceCart}>
          Replace Cart
        </AppButton>
        <AppButton ref={cancelButtonRef} variant="ghost" size="md" onClick={cancelPendingAdd}>
          Cancel
        </AppButton>
      </div>
    </Dialog>
  );
}
