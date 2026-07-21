"use client";

import { useMemo, useState } from "react";
import StickyMacroTotalsBar from "@/components/StickyMacroTotalsBar";
import AppButton from "@/components/ui/AppButton";
import SurfaceCard from "@/components/ui/SurfaceCard";
import CartNutritionSummary from "@/components/cart/CartNutritionSummary";
import MacroSplitBar from "@/components/nutrition/MacroSplitBar";
import QuantityStepper from "@/components/QuantityStepper";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import DesktopNav from "@/components/DesktopNav";
import CartItemPreviewRow from "@/components/CartItemPreviewRow";
import EmptyStateCard from "@/components/EmptyStateCard";
import ItemRouteModal from "@/components/ItemRouteModal";
import { useCart } from "@/stores/cartStore";
import { buildCartNutritionTotals } from "@/lib/cart/nutrition";
import { getProteinPer100Calories } from "@/lib/nutrition";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { Pencil } from "lucide-react";
import { getCustomizationLabels } from "@/lib/cart/customizationLabels";

export default function CartPage() {
  const { items, totals, updateQuantity } = useCart();
  const { editState, loadingEditItemId, openEditModal, closeEditModal } = useCartItemEditModal();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // calculate total nutrition of the cart
  const nutritionTotals = useMemo(() => buildCartNutritionTotals(items), [items]);

  const proteinPer100Calories = getProteinPer100Calories(totals.protein, totals.calories);

  return (
    <>
      <GlobalMobileNav title="Cart" showSearchButton={false} showCartButton={false} />
      <div className="px-4 pt-4 sm:px-6"><DesktopNav showSearchButton={false} showCartButton={false} /></div>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-28 sm:px-6 lg:pt-10">
        <section className="w-full space-y-3">
          {items.length === 0 ? (
            <EmptyStateCard
              variant="compact"
              title="Your cart is empty."
              description="Add items from a restaurant to start meal finalization."
              className="py-8"
            />
          ) : (
            <ul className="grid gap-3">
              {items.map((cartItem) => {
                const detailLine = summarizeItem(cartItem);
                const displayItem = { ...cartItem, name: formatCartItemName(cartItem) };
                const canCustomize = cartItem.selection.type !== "build-your-own";
                return (
                  <SurfaceCard as="li" key={cartItem.id} padding="default" className="transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
                    <div
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer text-left"
                      onClick={() => setExpandedItemId((current) => (current === cartItem.id ? null : cartItem.id))}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpandedItemId((current) => (current === cartItem.id ? null : cartItem.id)); }}
                      aria-expanded={expandedItemId === cartItem.id}
                    >
                    <CartItemPreviewRow
                      item={displayItem}
                      imageRenderer="native-img"
                      imageFallback="initial"
                      macroStyle="detailed"
                      customizationsText={detailLine}
                      customizationsLineClamp={2}
                      actions={
                        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                          {canCustomize ? (
                            <AppButton
                              variant="pill"
                              size="sm"
                              aria-label={`Customize ${cartItem.name}`}
                              title="Customize"
                              onClick={(event) => { event.stopPropagation(); openEditModal(cartItem); }}
                              disabled={loadingEditItemId === cartItem.id}
                              className="h-9 w-9 px-0 py-0 disabled:cursor-wait"
                            >
                              {loadingEditItemId === cartItem.id ? <span className="text-[10px]">...</span> : <Pencil className="h-4 w-4" strokeWidth={2.5} />}
                            </AppButton>
                          ) : null}
                          <QuantityStepper
                            value={cartItem.quantity}
                            onDecrement={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                            onIncrement={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                            decrementLabel={`Decrease quantity of ${cartItem.name}`}
                            incrementLabel={`Increase quantity of ${cartItem.name}`}
                          />
                        </div>
                      }
                    />
                    </div>
                    {expandedItemId === cartItem.id ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="mb-2 font-bold text-slate-900">Details</p>
                        <ul className="grid gap-1.5">
                          {(getCustomizationLabels(cartItem.customizations).filter((label) => !/^Combo Meal$/i.test(label)).length ? getCustomizationLabels(cartItem.customizations).filter((label) => !/^Combo Meal$/i.test(label)) : detailLine ? detailLine.split(" • ") : ["No customizations selected."]).map((label) => (
                            <li key={label} className="rounded-xl bg-white px-3 py-2 shadow-sm">{label}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </SurfaceCard>
                );
              })}
            </ul>
          )}
        </section>

        <SurfaceCard as="section" padding="compact" radius="large" className="sm:p-4">
          <div className="grid grid-cols-1 gap-4 rounded-3xl bg-muted-panel p-3 sm:p-4 lg:grid-cols-2">
            <CartNutritionSummary nutritionTotals={nutritionTotals} />
            <SurfaceCard padding="default" radius="large" className="flex min-h-0 flex-col sm:p-5">
              <h2 className="text-2xl font-bold text-neutral-900">Meal Breakdown</h2>
              <div className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-4">
                <p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Items</p>
                {items.length === 0 ? <p className="text-sm text-neutral-600">No meal items yet.</p> : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto max-h-[300px] bg-image-placeholder p-2 rounded-xl">
                    {items.map((item) => {
                      const detailLine = summarizeItem(item);
                      const displayName = formatCartItemName(item);
                      return (
                        <li key={`${item.id}-breakdown`} className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-3 py-2">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                          </div>
                          <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{item.quantity}x {displayName}</p>{detailLine ? <p className="truncate text-xs text-neutral-500">{detailLine}</p> : null}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="space-y-2 pt-4"><p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Protein Score</p><div className="rounded-xl bg-image-placeholder px-3 py-2"><p className="mt-1 text-sm text-neutral-900"><span className="font-bold">{Math.round(proteinPer100Calories ?? 0)}g</span> of protein in <span className="font-semibold">100 calories</span></p></div></div>
                <div className="space-y-2 pt-4"><p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Macro Split</p><MacroSplitBar protein={totals.protein} carbs={totals.carbs} totalFat={totals.totalFat} /></div>
              </div>
            </SurfaceCard>
            <div className="col-span-1 lg:col-span-2"><StickyMacroTotalsBar totals={totals} inline layoutPreset="cart" onSecondaryAction={() => window.alert("Save Meal coming soon")} onPrimaryAction={() => window.alert("Generate Snapshot coming soon")} /></div>
          </div>
        </SurfaceCard>
      </main>
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
          onClose={closeEditModal}
        />
      ) : null}
    </>
  );
}
