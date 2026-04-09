"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import restaurants from "@/app/data/index.json";
import { useRestaurantUi } from "@/components/RestaurantUiContext";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import CartItemPreviewRow from "@/components/CartItemPreviewRow";
import BuildEditPlaceholderModal from "@/components/cart/BuildEditPlaceholderModal";
import { menuLookupByRestaurant } from "@/lib/cart/menuRegistry";
import { toItemSlug } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";

const getCustomizationDisplayList = (item: {
  optionsLabel?: string;
  customizations?: string[];
}) => {
  const addonSelections = item.optionsLabel
    ? item.optionsLabel
        .split(" + ")
        .map((label) => label.trim())
        .filter(Boolean)
    : [];

  return [...addonSelections, ...(item.customizations ?? [])];
};

export default function CartPreviewDrawer() {
  const { isCartOpen, closeCart } = useRestaurantUi();
  const { items, totals, updateQuantity, clearCart } = useCart();
  const router = useRouter();
  const [editingBuildItemName, setEditingBuildItemName] = useState<string | null>(null);

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
        className={`fixed right-0 top-0 z-[125] h-full w-full max-w-md border-l border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] transition-transform duration-300 ${
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
                  const sourceItem =
                    menuLookupByRestaurant[item.restaurantId]?.find(
                      (menuItem) => (menuItem.id ?? menuItem.name) === item.itemId
                    ) ?? null;
                  const itemEditHref = sourceItem
                    ? `/restaurant/${item.restaurantId}/items/${toItemSlug(sourceItem)}?editCartItem=${item.id}`
                    : null;
                  return (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                    >
                      <CartItemPreviewRow
                        item={item}
                        imageRenderer="next-image"
                        imageFallback="initial"
                        variantStyle="inline"
                        macroStyle="detailed"
                        customizationsText={addonsLabel}
                        customizationsLineClamp={1}
                        actions={
                          <>
                            {item.buildConfiguration ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.restaurantId === "chipotle") {
                                    setEditingBuildItemName(item.name);
                                    return;
                                  }
                                  closeCart();
                                  router.push(`/restaurant/${item.restaurantId}?view=ingredients&editCartItem=${item.id}`);
                                }}
                                className="cursor-pointer inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                            ) : itemEditHref ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeCart();
                                  router.push(itemEditHref, { scroll: false });
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
      {editingBuildItemName ? (
        <BuildEditPlaceholderModal
          itemName={editingBuildItemName}
          onClose={() => setEditingBuildItemName(null)}
          zIndexClass="z-[130]"
        />
      ) : null}
    </>
  );
}
