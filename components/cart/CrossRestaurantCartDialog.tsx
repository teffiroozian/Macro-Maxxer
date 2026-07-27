"use client";

import { useEffect, useMemo, useRef } from "react";
import AppButton from "@/components/ui/AppButton";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { useCart } from "@/stores/cartStore";
import { getAllRestaurants } from "@/lib/restaurants";

export default function CrossRestaurantCartDialog() {
  const { pendingConflict, confirmAddAnyway, confirmReplaceCart, cancelPendingAdd } = useCartAddConfirmation();
  const { items } = useCart();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const restaurants = useMemo(() => getAllRestaurants(), []);

  useEffect(() => {
    if (!pendingConflict) {
      return;
    }

    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        cancelPendingAdd();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [pendingConflict, cancelPendingAdd]);

  if (!pendingConflict) {
    return null;
  }

  const restaurantName = (id: string) => restaurants.find((restaurant) => restaurant.id === id)?.name ?? id;
  const existingRestaurantNames = Array.from(new Set(items.map((item) => item.restaurantId))).map(restaurantName);
  const newRestaurantName = restaurantName(pendingConflict.item.restaurantId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cross-restaurant-dialog-title"
      aria-describedby="cross-restaurant-dialog-description"
      className="fixed inset-0 z-[240] flex items-end justify-center bg-black/35 p-3 sm:items-center sm:p-4"
      onClick={cancelPendingAdd}
    >
      <div
        className="w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
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
      </div>
    </div>
  );
}
