"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import SurfaceCard from "@/components/ui/SurfaceCard";
import MacroStat from "@/components/nutrition/MacroStat";
import { appButtonClassName } from "@/components/ui/AppButton";
import CartNutritionSummary from "@/components/cart/CartNutritionSummary";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import GlobalMobileMenuButton from "@/components/GlobalMobileMenuButton";
import DesktopNav from "@/components/DesktopNav";
import EmptyStateCard from "@/components/EmptyStateCard";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import CartItemsSection from "@/components/cart/CartItemsSection";
import CartMealBreakdown from "@/components/cart/CartMealBreakdown";
import ExportOrderDialog from "@/components/cart/ExportOrderDialog";
import AppButton from "@/components/ui/AppButton";
import { NutritionDetailsGrid } from "@/components/item-route-modal/SelectionSummaryPanels";
import { useCart } from "@/stores/cartStore";
import { buildCartNutritionTotals, getCartViewAnalytics, type NutritionTotals } from "@/lib/cart/nutrition";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { trackCartView } from "@/lib/analytics";

// Ghost totals for the empty-cart state. Every field is NaN rather than 0 so
// NutritionFactsPanel/MacroStat's own "value is missing" formatting renders
// "—" (and "—g") instead of a real-looking "0".
const EMPTY_CART_NUTRITION: NutritionTotals = {
  calories: NaN,
  protein: NaN,
  carbs: NaN,
  totalFat: NaN,
  satFat: NaN,
  transFat: NaN,
  cholesterol: NaN,
  sodium: NaN,
  fiber: NaN,
  sugars: NaN,
};

export default function CartPage() {
  const { items, totals, updateQuantity } = useCart();
  const { editState, loadingEditItemId, openModal, closeEditModal } = useCartItemEditModal();
  const [isExportOpen, setIsExportOpen] = useState(false);

  // calculate total nutrition of the cart
  const nutritionTotals = useMemo(() => buildCartNutritionTotals(items), [items]);
  const isEmpty = items.length === 0;
  const displayNutritionTotals = isEmpty ? EMPTY_CART_NUTRITION : nutritionTotals;
  const displayMacroTotals = isEmpty ? EMPTY_CART_NUTRITION : totals;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Navigating to this route is itself the "genuine view" — fire once per
  // mount (i.e. once per navigation here), never again for this same visit
  // as items/totals update from cart edits made while on the page.
  const hasTrackedViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackCartView(getCartViewAnalytics(items));
  }, [items]);

  return (
    <>
      <GlobalMobileNav leadingButton={<GlobalMobileMenuButton />} />
      <div className="px-4 pt-1 sm:px-6"><DesktopNav searchBarVariant="compact" /></div>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-28 sm:px-6 lg:gap-10 lg:pb-20 lg:pt-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-24">
          <div className="flex flex-col gap-3 lg:shrink-0">
            <h1 className="font-heading text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Your Cart
            </h1>
            {!isEmpty ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
                <AppButton variant="secondary" size="sm" onClick={() => setIsExportOpen(true)}>
                  <Download className="size-3.5" aria-hidden="true" />
                  Export Order
                </AppButton>
              </div>
            ) : null}
          </div>

          <SurfaceCard
            radius="large"
            shadow="sm"
            padding="none"
            className="w-full overflow-hidden lg:flex-1"
          >
            <div className={`flex items-stretch ${isEmpty ? "opacity-40" : ""}`}>
              <div className="flex flex-1 justify-center px-2 py-3.5 sm:px-4 sm:py-4 lg:px-5">
                <MacroStat macroKey="calories" value={displayNutritionTotals.calories} labelVariant="uppercase" size="cartHeaderTotal" />
              </div>
              <div className="my-auto h-9 w-px bg-black/[0.08] sm:h-11" aria-hidden="true" />
              <div className="flex flex-1 justify-center px-2 py-3.5 sm:px-4 sm:py-4 lg:px-5">
                <MacroStat macroKey="protein" value={displayNutritionTotals.protein} labelVariant="uppercase" size="cartHeaderTotal" />
              </div>
              <div className="my-auto h-9 w-px bg-black/[0.08] sm:h-11" aria-hidden="true" />
              <div className="flex flex-1 justify-center px-2 py-3.5 sm:px-4 sm:py-4 lg:px-5">
                <MacroStat macroKey="carbs" value={displayNutritionTotals.carbs} labelVariant="uppercase" size="cartHeaderTotal" />
              </div>
              <div className="my-auto h-9 w-px bg-black/[0.08] sm:h-11" aria-hidden="true" />
              <div className="flex flex-1 justify-center px-2 py-3.5 sm:px-4 sm:py-4 lg:px-5">
                <MacroStat macroKey="totalFat" value={displayNutritionTotals.totalFat} labelVariant="uppercase" size="cartHeaderTotal" />
              </div>
            </div>
          </SurfaceCard>
        </header>

        {isEmpty ? (
          <EmptyStateCard
            title="Your cart is empty."
            description="Your totals fill in as you add items. Add one to start meal finalization."
            action={
              <Link href="/#restaurants" className={appButtonClassName({ variant: "primary", size: "lg" })}>
                Browse Restaurants
              </Link>
            }
          />
        ) : (
          <CartItemsSection
            items={items}
            loadingEditItemId={loadingEditItemId}
            onUpdateQuantity={updateQuantity}
            onPreviewItem={(cartItem) => openModal(cartItem, "preview")}
            onEditItem={(cartItem) => openModal(cartItem, "edit")}
          />
        )}

        <section className="flex flex-col gap-4 mt-6 sm:mt-8 lg:mt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <SectionEyebrow className="text-sm text-slate-500">Order Summary</SectionEyebrow>
              {isEmpty ? (
                <p className="text-sm text-slate-500">A preview of what you&rsquo;ll see here.</p>
              ) : (
                <>
                  <h2 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
                    Nutrition &amp; Meal Details
                  </h2>
                  <p className="text-sm text-slate-500">Totals and items for everything currently in your cart.</p>
                </>
              )}
            </div>
            {!isEmpty ? (
              <AppButton variant="secondary" size="md" className="w-full shrink-0 sm:w-auto" onClick={() => setIsExportOpen(true)}>
                <Download className="size-4" aria-hidden="true" />
                Export Order
              </AppButton>
            ) : null}
          </div>
          <div className={isEmpty ? "pointer-events-none" : undefined} aria-hidden={isEmpty || undefined}>
            <NutritionDetailsGrid
              nutritionFacts={<CartNutritionSummary nutritionTotals={displayNutritionTotals} />}
              details={<CartMealBreakdown items={items} totals={displayMacroTotals} onPreviewItem={(cartItem) => openModal(cartItem, "preview")} />}
            />
          </div>
        </section>
      </main>
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
      {isExportOpen && !isEmpty ? (
        <ExportOrderDialog
          items={items}
          nutritionTotals={nutritionTotals}
          onClose={() => setIsExportOpen(false)}
        />
      ) : null}
    </>
  );
}
