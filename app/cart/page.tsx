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
import chickfilaMenu from "@/app/data/chickfila.json";
import chipotleMenu from "@/app/data/chipotle.json";
import habitMenu from "@/app/data/habit.json";
import mcdonaldsMenu from "@/app/data/mcdonalds.json";
import modMenu from "@/app/data/mod.json";
import pandaMenu from "@/app/data/panda.json";
import paneraMenu from "@/app/data/panera.json";
import starbucksMenu from "@/app/data/starbucks.json";
import subwayMenu from "@/app/data/subway.json";
import MacroStat from "@/components/nutrition/MacroStat";
import type { CartCustomization, CartItem } from "@/types/cart";
import type { IngredientItem, MenuItem, RestaurantMenu } from "@/types/menu";

const restaurantMenusById: Record<string, RestaurantMenu> = {
  chickfila: chickfilaMenu as RestaurantMenu,
  chipotle: chipotleMenu as RestaurantMenu,
  habit: habitMenu as RestaurantMenu,
  mcdonalds: mcdonaldsMenu as RestaurantMenu,
  mod: modMenu as RestaurantMenu,
  panda: pandaMenu as RestaurantMenu,
  panera: paneraMenu as RestaurantMenu,
  starbucks: starbucksMenu as RestaurantMenu,
  subway: subwayMenu as RestaurantMenu,
};

type DetailMenuItem = MenuItem | IngredientItem;

function findRestaurantItem(cartItem: CartItem, customization: CartCustomization): DetailMenuItem | null {
  const restaurant = restaurantMenusById[cartItem.restaurantId];
  const itemId = customization.itemId ?? customization.ingredientId ?? customization.toIngredientId ?? customization.fromIngredientId;
  if (!restaurant || !itemId) return null;

  return (
    restaurant.items.find((item) => item.id === itemId) ??
    restaurant.ingredients?.find((ingredient) => ingredient.id === itemId) ??
    null
  );
}

function getDetailTitle(customization: CartCustomization) {
  if (customization.comboRole === "side") return "Side";
  if (customization.comboRole === "drink") return "Drink";
  if (customization.kind === "ingredient") return "Customization";
  return "Selection";
}

function getDetailLabel(customization: CartCustomization) {
  return customization.itemLabel ?? customization.ingredientLabel ?? customization.toIngredientLabel ?? customization.fromIngredientLabel ?? "Custom item";
}

function CartItemDetailCard({ detailItem, title, label }: { detailItem: DetailMenuItem | null; title: string; label: string }) {
  const nutrition = detailItem?.nutrition;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {detailItem?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detailItem.image} alt={label} className="h-full w-full object-contain p-1" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{label.charAt(0)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        {nutrition ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <MacroStat macroKey="calories" labelVariant="shortLabel" value={nutrition.calories} size="cartCompact" />
            <MacroStat macroKey="protein" labelVariant="shortLabel" value={nutrition.protein} size="cartCompact" />
            <MacroStat macroKey="carbs" labelVariant="shortLabel" value={nutrition.carbs} size="cartCompact" />
            <MacroStat macroKey="totalFat" labelVariant="shortLabel" value={nutrition.totalFat} size="cartCompact" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CartItemDetailsPanel({ cartItem, detailLine }: { cartItem: CartItem; detailLine: string }) {
  const visibleCustomizations = (cartItem.customizations ?? []).filter((customization) => !(
    customization.kind === "combo" && customization.comboRole === "meal"
  ));
  const fallbackLabels = detailLine ? detailLine.split(" • ").filter(Boolean) : [];

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold text-slate-900">Item details</p>
        <p className="text-xs font-semibold text-slate-500">Tap card to collapse</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {visibleCustomizations.length > 0 ? (
          visibleCustomizations.map((customization, index) => (
            <CartItemDetailCard
              key={`${customization.comboRole ?? customization.action}-${customization.itemId ?? customization.ingredientId ?? index}`}
              title={getDetailTitle(customization)}
              label={getDetailLabel(customization)}
              detailItem={findRestaurantItem(cartItem, customization)}
            />
          ))
        ) : fallbackLabels.length > 0 ? (
          fallbackLabels.map((label) => (
            <CartItemDetailCard key={label} title="Selection" label={label} detailItem={null} />
          ))
        ) : (
          <p className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600">No customizations selected.</p>
        )}
      </div>
    </div>
  );
}

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
              title="Your cart is empty."
              description="Add items from a restaurant to start meal finalization."
            />
          ) : (
            <ul className="grid gap-3">
              {items.map((cartItem) => {
                const detailLine = summarizeItem(cartItem);
                const displayItem = { ...cartItem, name: formatCartItemName(cartItem) };
                const canCustomize = cartItem.selection.type !== "build-your-own";
                return (
                  <SurfaceCard as="li" key={cartItem.id} padding="default" className="transition hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
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
                              className="h-10 w-10 px-0 py-0 disabled:cursor-wait"
                            >
                              {loadingEditItemId === cartItem.id ? <span className="text-[10px]">...</span> : <Pencil className="h-5 w-5" strokeWidth={2.5} />}
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
                    {expandedItemId === cartItem.id ? <CartItemDetailsPanel cartItem={cartItem} detailLine={detailLine} /> : null}
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
