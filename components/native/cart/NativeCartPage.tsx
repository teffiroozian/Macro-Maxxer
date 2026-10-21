"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import EmptyStateCard from "@/components/EmptyStateCard";
import ExportOrderDialog from "@/components/cart/ExportOrderDialog";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { appButtonClassName } from "@/components/ui/AppButton";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { trackCartView } from "@/lib/analytics";
import { buildCartNutritionTotals, getCartViewAnalytics } from "@/lib/cart/nutrition";
import { getAllRestaurants } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";
import NativeCartRestaurantGroup from "./NativeCartRestaurantGroup";
import NativeCartTotalsCard from "./NativeCartTotalsCard";
import NativeOrderSummary from "./NativeOrderSummary";
import { groupByRestaurant, itemCountLabel } from "./cartPresentation";

export default function NativeCartPage() {
  const { items, totals, updateQuantity } = useCart();
  const { editState, loadingEditItemId, openModal, closeEditModal } = useCartItemEditModal();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const tracked = useRef(false);

  useEffect(() => { const t = window.setTimeout(() => setHydrated(true), 0); return () => window.clearTimeout(t); }, []);
  useEffect(() => {
    if (!hydrated || tracked.current) return;
    tracked.current = true;
    trackCartView(getCartViewAnalytics(items));
  }, [hydrated, items]);
  useEffect(() => {
    const close = () => setOpenId(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  const nutritionTotals = useMemo(() => buildCartNutritionTotals(items), [items]);
  const restaurants = useMemo(() => new Map(getAllRestaurants().map((r) => [r.id, r])), []);
  const groups = useMemo(() => groupByRestaurant(items), [items]);
  const isEmpty = items.length === 0;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <main className="native-top-level-page min-h-[var(--app-viewport-height)] bg-slate-50 pb-[var(--native-nav-clearance)] pt-[calc(var(--safe-area-top)+6px)]">
        <header className="flex flex-col gap-1 px-5 pt-2.5">
          <h1 className="font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900">My Meal</h1>
          <p className="text-[15px] text-slate-500">{hydrated ? itemCountLabel(count) : " "}</p>
        </header>
        {hydrated ? (
          <>
            <NativeCartTotalsCard totals={totals} empty={isEmpty} onExport={() => setIsExportOpen(true)} />
            {isEmpty ? (
              <div className="mx-[18px] mt-6">
                <EmptyStateCard
                  title="Your meal is empty."
                  description="Your totals fill in as you add items. Add one to start meal finalization."
                  action={<Link href="/restaurants" className={appButtonClassName({ variant: "primary", size: "lg" })}>Browse Restaurants</Link>}
                />
              </div>
            ) : (
              <>
                {groups.map(([restaurantId, groupItems]) => (
                  <NativeCartRestaurantGroup
                    key={restaurantId}
                    name={restaurants.get(restaurantId)?.name ?? "Restaurant"}
                    logo={restaurants.get(restaurantId)?.logo}
                    items={groupItems} openId={openId} onOpenChange={setOpenId}
                    loadingEditItemId={loadingEditItemId}
                    onEdit={(item) => openModal(item, "edit")}
                    onUpdateQuantity={updateQuantity}
                  />
                ))}
                <NativeOrderSummary items={items} totals={totals} nutritionTotals={nutritionTotals} onPreviewItem={(item) => openModal(item, "preview")} />
              </>
            )}
          </>
        ) : null}
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
      {isExportOpen && !isEmpty ? <ExportOrderDialog items={items} nutritionTotals={nutritionTotals} onClose={() => setIsExportOpen(false)} /> : null}
    </>
  );
}
