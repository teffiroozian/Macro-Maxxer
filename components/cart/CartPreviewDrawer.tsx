"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRestaurantUi } from "@/components/RestaurantUiContext";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import CartItemPreviewRow from "@/components/cart/CartItemPreviewRow";
import CartClearConfirmationDialog from "@/components/cart/CartClearConfirmationDialog";
import CartControlButton from "@/components/cart/CartControlButton";
import EmptyStateCard from "@/components/EmptyStateCard";
import SurfaceCard from "@/components/ui/SurfaceCard";
import AppButton, { appButtonClassName } from "@/components/ui/AppButton";
import AppIconButton from "@/components/ui/AppIconButton";
import QuantityStepper from "@/components/QuantityStepper";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { getAllRestaurants } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";
import { buildCartItemSummaryGroups } from "@/lib/cart/displayLabels";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";

export default function CartPreviewDrawer() {
  const { isCartOpen, closeCart } = useRestaurantUi();
  const { items, totals, updateQuantity, clearCart } = useCart();
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const { editState, loadingEditItemId, openModal, closeEditModal } = useCartItemEditModal();

  const closeClearCartDialog = useCallback(() => {
    setIsClearCartDialogOpen(false);
  }, []);

  const confirmClearCart = useCallback(() => {
    clearCart();
    setIsClearCartDialogOpen(false);
  }, [clearCart]);

  const cartHeaderInfo = useMemo(() => {
    const restaurantIds = new Set(items.map((item) => item.restaurantId));

    if (restaurantIds.size > 1) {
      return { mode: "multi" as const, restaurantCount: restaurantIds.size };
    }

    const restaurants = getAllRestaurants();
    const activeRestaurantId = items[0]?.restaurantId;
    const restaurant = activeRestaurantId
      ? restaurants.find((restaurant) => restaurant.id === activeRestaurantId) ?? null
      : null;

    return { mode: "single" as const, restaurant };
  }, [items]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isClearCartDialogOpen) {
        closeCart();
      }
    };

    if (isCartOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isCartOpen, closeCart, isClearCartDialogOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[120] bg-slate-900/30 transition ${
          isCartOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      <aside
        className={`fixed right-0 top-0 z-[125] h-full w-[88%] max-w-md border-l border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] transition-transform duration-300 sm:w-[78%] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isCartOpen}
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {cartHeaderInfo.mode === "single" && cartHeaderInfo.restaurant?.logo ? (
                    <Image
                      src={cartHeaderInfo.restaurant.logo}
                      alt={cartHeaderInfo.restaurant.name}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : cartHeaderInfo.mode === "single" ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                      {cartHeaderInfo.restaurant?.name?.[0] ?? "C"}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {cartHeaderInfo.mode === "single" ? cartHeaderInfo.restaurant?.name ?? "Your cart" : "Your Cart"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {cartHeaderInfo.mode === "single"
                      ? `Items: ${items.length}`
                      : `${items.length} ${items.length === 1 ? "item" : "items"} · ${cartHeaderInfo.restaurantCount} restaurants`}
                  </p>
                </div>
              </div>
              <AppIconButton onClick={closeCart} aria-label="Close cart panel">
                ✕
              </AppIconButton>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Items
            </p>

            {items.length === 0 ? (
              <EmptyStateCard variant="compact" align="left" title="Your cart is empty." className="py-6" />
            ) : (
              <ul className="mt-3 space-y-3 pb-2">
                {items.map((item) => {
                  const summaryGroups = buildCartItemSummaryGroups(item);
                  const activatePreview = () => openModal(item, "preview");
                  return (
                    <SurfaceCard
                      as="li"
                      key={item.id}
                      padding="compact"
                      onClick={activatePreview}
                      className="cursor-pointer border-slate-200 px-3 py-3 transition hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)] focus-within:border-slate-300 focus-within:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                    >
                      <CartItemPreviewRow
                        item={item}
                        imageRenderer="next-image"
                        imageFallback="initial"
                        macroStyle="detailed"
                        customizationGroups={summaryGroups}
                        onActivate={activatePreview}
                        activateLabel={`Preview ${item.name}`}
                        actions={
                          <>
                            <CartControlButton
                              disabled={loadingEditItemId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                openModal(item, "edit");
                              }}
                              aria-label={`Customize ${item.name}`}
                              title="Customize"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2.5} />
                            </CartControlButton>
                            <QuantityStepper
                              variant="cartLine"
                              value={item.quantity}
                              onDecrement={(event) => {
                                event.stopPropagation();
                                updateQuantity(item.id, item.quantity - 1);
                              }}
                              onIncrement={(event) => {
                                event.stopPropagation();
                                updateQuantity(item.id, item.quantity + 1);
                              }}
                              decrementLabel={item.quantity === 1 ? `Remove ${item.name} from cart` : `Decrease quantity of ${item.name}`}
                              incrementLabel={`Increase quantity of ${item.name}`}
                              decrementContent={item.quantity === 1 ? <Trash2 className="h-4 w-4" strokeWidth={2.5} /> : undefined}
                            />
                          </>
                        }
                      />
                    </SurfaceCard>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="shrink-0 border-t border-slate-200 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Total Macros
              </p>
              <MacroTotalsGrid macros={totals} size="panel" className="mt-3" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
              <AppButton type="button" variant="ghost" size="md" onClick={() => setIsClearCartDialogOpen(true)} disabled={items.length === 0}>
                Clear Cart
              </AppButton>
              <Link
                href="/cart"
                onClick={closeCart}
                className={appButtonClassName({ variant: "primary", size: "md", className: "border-slate-900 bg-slate-900 font-medium hover:bg-slate-800" })}
              >
                Open Full Cart
              </Link>
            </div>
          </section>
        </div>
      </aside>

      {isClearCartDialogOpen ? (
        <CartClearConfirmationDialog
          itemCount={items.length}
          onCancel={closeClearCartDialog}
          onConfirm={confirmClearCart}
        />
      ) : null}

      {editState ? (
        <ItemRouteModal
          restaurantId={editState.restaurant.id}
          restaurantPath={`/restaurant/${editState.restaurant.id}`}
          item={editState.sourceItem}
          menuItems={editState.restaurant.items}
          addons={editState.addons}
          ingredients={editState.restaurant.ingredients}
          customizationRules={editState.restaurant.customizationRules}
          closeBehavior="local"
          editCartItemId={editState.cartItemId}
          initialMode={editState.mode}
          onClose={closeEditModal}
        />
      ) : null}
    </>
  );
}
