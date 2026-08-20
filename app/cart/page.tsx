"use client";

import { useMemo } from "react";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import CartNutritionSummary from "@/components/cart/CartNutritionSummary";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import GlobalMobileMenuButton from "@/components/GlobalMobileMenuButton";
import DesktopNav from "@/components/DesktopNav";
import EmptyStateCard from "@/components/EmptyStateCard";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import CartItemsSection from "@/components/cart/CartItemsSection";
import CartMealBreakdown from "@/components/cart/CartMealBreakdown";
import { NutritionDetailsGrid } from "@/components/item-route-modal/SelectionSummaryPanels";
import { useCart } from "@/stores/cartStore";
import { buildCartNutritionTotals } from "@/lib/cart/nutrition";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";

export default function CartPage() {
  const { items, totals, updateQuantity } = useCart();
  const { editState, loadingEditItemId, openModal, closeEditModal } = useCartItemEditModal();

  // calculate total nutrition of the cart
  const nutritionTotals = useMemo(() => buildCartNutritionTotals(items), [items]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <GlobalMobileNav leadingButton={<GlobalMobileMenuButton />} />
      <div className="px-4 pt-1 sm:px-6"><DesktopNav searchBarVariant="compact" /></div>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-28 sm:px-6 lg:gap-10 lg:pb-20 lg:pt-10">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-heading text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
            Your Cart
          </h1>
          {items.length > 0 ? (
            <p className="text-sm font-medium text-neutral-500">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </header>

        {items.length === 0 ? (
          <EmptyStateCard
            title="Your cart is empty."
            description="Add items from a restaurant to start meal finalization."
          />
        ) : (
          <>
            <CartItemsSection
              items={items}
              loadingEditItemId={loadingEditItemId}
              onUpdateQuantity={updateQuantity}
              onPreviewItem={(cartItem) => openModal(cartItem, "preview")}
              onEditItem={(cartItem) => openModal(cartItem, "edit")}
            />

            <section className="flex flex-col gap-4 mt-6 sm:mt-8 lg:mt-14">
              <div className="flex flex-col gap-1.5">
                <SectionEyebrow className="text-sm text-neutral-500">Order Summary</SectionEyebrow>
                <h2 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
                  Nutrition &amp; Meal Details
                </h2>
                <p className="text-sm text-slate-500">Totals and items for everything currently in your cart.</p>
              </div>
              <NutritionDetailsGrid
                nutritionFacts={<CartNutritionSummary nutritionTotals={nutritionTotals} />}
                details={<CartMealBreakdown items={items} totals={totals} />}
              />
            </section>
          </>
        )}
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
          initialMode={editState.mode}
          onClose={closeEditModal}
        />
      ) : null}
    </>
  );
}
