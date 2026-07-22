"use client";

import { useMemo, useState } from "react";
import StickyMacroTotalsBar from "@/components/StickyMacroTotalsBar";
import SurfaceCard from "@/components/ui/SurfaceCard";
import CartNutritionSummary from "@/components/cart/CartNutritionSummary";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import DesktopNav from "@/components/DesktopNav";
import EmptyStateCard from "@/components/EmptyStateCard";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import CartItemsSection from "@/components/cart/CartItemsSection";
import CartMealBreakdown from "@/components/cart/CartMealBreakdown";
import { useCart } from "@/stores/cartStore";
import { buildCartNutritionTotals } from "@/lib/cart/nutrition";
import { getProteinPer100Calories } from "@/lib/nutrition";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";

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
            <CartItemsSection
              items={items}
              expandedItemId={expandedItemId}
              loadingEditItemId={loadingEditItemId}
              onToggleExpandedItem={(cartItemId) => setExpandedItemId((current) => (current === cartItemId ? null : cartItemId))}
              onUpdateQuantity={updateQuantity}
              onEditItem={openEditModal}
            />
          )}
        </section>

        <SurfaceCard as="section" padding="compact" radius="large" className="sm:p-4">
          <div className="grid grid-cols-1 gap-4 rounded-3xl bg-muted-panel p-3 sm:p-4 lg:grid-cols-2">
            <CartNutritionSummary nutritionTotals={nutritionTotals} />
            <CartMealBreakdown items={items} totals={totals} proteinPer100Calories={proteinPer100Calories} />
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
