"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import restaurants from "@/app/data/index.json";
import { useRestaurantUi } from "@/components/RestaurantUiContext";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import CartItemPreviewRow from "@/components/CartItemPreviewRow";
import ItemRouteModal from "@/components/ItemRouteModal";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getRestaurantData } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";

const getCustomizationDisplayList = (item: {
  selectionDetailsLabel?: string;
  customizations?: string[];
}) => {
  const addonSelections = item.selectionDetailsLabel
    ? item.selectionDetailsLabel
        .split(" + ")
        .map((label) => label.trim())
        .filter(Boolean)
    : [];

  return [...addonSelections, ...(item.customizations ?? [])];
};

export default function CartPreviewDrawer() {
  const { isCartOpen, closeCart } = useRestaurantUi();
  const { items, totals, updateQuantity, clearCart } = useCart();
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantData | null>(null);
  const [editingSourceItem, setEditingSourceItem] = useState<MenuItem | null>(null);
  const [loadingEditItemId, setLoadingEditItemId] = useState<string | null>(null);

  const editingCartItem = useMemo(
    () => items.find((item) => item.id === editingCartItemId) ?? null,
    [editingCartItemId, items]
  );

  const closeEditModal = () => {
    setEditingCartItemId(null);
    setEditingRestaurant(null);
    setEditingSourceItem(null);
  };

  const openEditModal = async (item: typeof items[number]) => {
    setLoadingEditItemId(item.id);
    try {
      const restaurant = await getRestaurantData(item.restaurantId);
      const sourceItem = restaurant?.items.find(
        (menuItem) => (menuItem.id ?? menuItem.name) === item.itemId
      ) ?? null;

      if (restaurant && sourceItem) {
        setEditingCartItemId(item.id);
        setEditingRestaurant(restaurant);
        setEditingSourceItem(sourceItem);
      }
    } finally {
      setLoadingEditItemId(null);
    }
  };

  const activeRestaurant = useMemo(() => {
    const activeRestaurantId = items[0]?.restaurantId;

    if (!activeRestaurantId) {
      return null;
    }

    return (
      restaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
      null
    );
  }, [items]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
  }, [isCartOpen, closeCart]);

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
                  {activeRestaurant?.logo ? (
                    <Image
                      src={activeRestaurant.logo}
                      alt={activeRestaurant.name}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                      {activeRestaurant?.name?.[0] ?? "C"}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {activeRestaurant?.name ?? "Your cart"}
                  </p>
                  <p className="text-sm text-slate-600">
                    Items: {items.length}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="cursor-pointer inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-700 transition hover:bg-slate-100"
                aria-label="Close cart panel"
              >
                ✕
              </button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Items
            </p>
            <div className="mt-2 border-t border-slate-200" />

            {items.length === 0 ? (
              <p className="py-6 text-sm text-slate-600">Your cart is empty.</p>
            ) : (
              <ul className="mt-3 space-y-3 pb-2">
                {items.map((item) => {
                  const customizationDisplayList =
                    getCustomizationDisplayList(item);
                  const addonsLabel = customizationDisplayList.join(" • ");
                  return (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                    >
                      <CartItemPreviewRow
                        item={item}
                        imageRenderer="next-image"
                        imageFallback="initial"
                                macroStyle="detailed"
                        customizationsText={addonsLabel}
                        customizationsLineClamp={1}
                        actions={
                          <>
                            {item.selection.type !== "build-your-own" ? (
                              <button
                                type="button"
                                disabled={loadingEditItemId === item.id}
                                onClick={() => {
                                  openEditModal(item);
                                }}
                                className="cursor-pointer inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                aria-label={`Customize ${item.name}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                            ) : null}
                            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                className="cursor-pointer inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold text-slate-700 transition hover:bg-white"
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                -
                              </button>
                              <span className="min-w-8 text-center text-sm font-semibold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="cursor-pointer inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold text-slate-700 transition hover:bg-white"
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                          </>
                        }
                      />
                    </li>
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
              <button
                type="button"
                onClick={clearCart}
                disabled={items.length === 0}
                className="cursor-pointer inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear Cart
              </button>
              <Link
                href="/cart"
                onClick={closeCart}
                className="cursor-pointer inline-flex items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Open Full Cart
              </Link>
            </div>
          </section>
        </div>
      </aside>

      {editingCartItem && editingRestaurant && editingSourceItem ? (
        <ItemRouteModal
          restaurantId={editingRestaurant.id}
          restaurantPath={`/restaurant/${editingRestaurant.id}`}
          item={editingSourceItem}
          menuItems={editingRestaurant.items}
          addons={resolveAddonMenuItems(editingRestaurant.addonGroups, editingRestaurant.items)}
          ingredients={editingRestaurant.ingredients}
          customizationRules={editingRestaurant.customizationRules}
          closeBehavior="local"
          editCartItemId={editingCartItem.id}
          onClose={closeEditModal}
        />
      ) : null}
    </>
  );
}
