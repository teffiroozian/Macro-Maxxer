"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import ExportOrderDialog from "@/components/cart/ExportOrderDialog";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import OrderActionDock from "@/components/native/order/OrderActionDock";
import OrderAnalysis, { type OrderAnalysisPart } from "@/components/native/order/OrderAnalysis";
import OrderBreakdown from "@/components/native/order/OrderBreakdown";
import OrderClearSheet from "@/components/native/order/OrderClearSheet";
import OrderEmpty from "@/components/native/order/OrderEmpty";
import OrderFacts from "@/components/native/order/OrderFacts";
import OrderGroup from "@/components/native/order/OrderGroup";
import OrderMealPicker from "@/components/native/order/OrderMealPicker";
import OrderMenu from "@/components/native/order/OrderMenu";
import OrderOverview from "@/components/native/order/OrderOverview";
import OrderReceipt from "@/components/native/order/OrderReceipt";
import OrderSavePreview from "@/components/native/order/OrderSavePreview";
import OrderScore from "@/components/native/order/OrderScore";
import OrderSheet from "@/components/native/order/OrderSheet";
import { buildOrderBreakdown } from "@/components/native/order/orderContributions";
import SavedMealNameSheet from "@/components/native/saved/SavedMealNameSheet";
import SavedToast, { type SavedNotice } from "@/components/native/saved/SavedToast";
import { muted } from "@/components/native/saved/savedStyles";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { useSavedLibrary, useStorageReady } from "@/hooks/useHomeCollections";
import { trackCartView } from "@/lib/analytics";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import { buildCartNutritionTotals, getCartViewAnalytics } from "@/lib/cart/nutrition";
import type { PastOrder } from "@/lib/native/homeCollections";
import { createOrder, findMatchingMeal, restoreLine, restoreOrder } from "@/lib/native/orderWorkspace";
import { copyItems, countLabel, createMeal, itemCount } from "@/lib/native/savedLibrary";
import { requestSavedTab } from "@/lib/native/savedTabRequest";
import { getAllRestaurants } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";
import { groupByRestaurant } from "./cartPresentation";

type Overlay = OrderAnalysisPart | "menu" | "clear" | "save" | "meals" | "export" | "receipt";

const ANALYSIS_TITLE: Record<OrderAnalysisPart, string> = { score: "Protein Score", breakdown: "Macro breakdown", facts: "Nutrition Facts" };

const restaurants = getAllRestaurants();

export default function NativeCartPage() {
  const ready = useStorageReady();
  const router = useRouter();
  const { items, totals, hasPartialNutritionData, updateQuantity, removeItem, clearCart, changeItems, dismissLastAddedPreview } = useCart();
  const { meals, orders, updateMeals, updateOrders } = useSavedLibrary();
  const { requestAddItems } = useCartAddConfirmation();
  const { editState, loadingEditItemId, openModal, closeEditModal } = useCartItemEditModal();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [finished, setFinished] = useState<{ order: PastOrder; items: CartItem[] } | null>(null);
  const [notice, setNotice] = useState<SavedNotice | null>(null);
  const noticeId = useRef(0);
  const tracked = useRef(false);
  const close = useCallback(() => setOverlay(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!ready || tracked.current) return;
    tracked.current = true;
    trackCartView(getCartViewAnalytics(items));
  }, [ready, items]);

  const nutrition = useMemo(() => buildCartNutritionTotals(items), [items]);
  const groups = useMemo(() => groupByRestaurant(items), [items]);
  const savedMeal = useMemo(() => findMatchingMeal(meals, items), [meals, items]);
  const count = itemCount(items);
  const filled = ready && items.length > 0;

  const say = (text: string, undo?: () => void) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text, undo });
  };
  const remove = (item: CartItem) => {
    const index = items.indexOf(item);
    removeItem(item.id);
    say(`${formatCartItemName(item)} removed`, () => changeItems((current) => restoreLine(current, item, index)));
  };
  const clear = () => {
    const previous = items;
    close();
    clearCart();
    say("Order cleared", () => changeItems((current) => restoreOrder(current, previous)));
  };
  const add = (label: string, source: CartItem[]) => {
    const added = copyItems(source);
    const before = items;
    close();
    requestAddItems(added, ({ replaced }) => {
      dismissLastAddedPreview();
      say(`${label} added to your order`, () => changeItems((current) => {
        const rest = current.filter((item) => !added.some((other) => other.id === item.id));
        return replaced ? restoreOrder(rest, before) : rest;
      }));
    });
  };
  const save = () => {
    if (savedMeal) say(`Already saved as ${savedMeal.name}`);
    else setOverlay("save");
  };
  const saveAs = (name: string) => {
    close();
    updateMeals((current) => [...current, createMeal(name, items)]);
    say(`${name} saved to Meals`);
  };
  const finish = () => {
    const order = createOrder(items);
    setFinished({ order, items });
    updateOrders((current) => [...current, order]);
    closeNotice();
    clearCart();
    setOverlay("receipt");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const undoFinish = () => {
    close();
    if (!finished) return;
    updateOrders((current) => current.filter((order) => order.id !== finished.order.id));
    changeItems((current) => restoreOrder(current, finished.items));
  };
  const viewHistory = () => {
    close();
    requestSavedTab("history");
    router.replace("/saved");
  };
  const breakdown = overlay === "score" || overlay === "breakdown" ? buildOrderBreakdown(items) : [];

  return (
    <>
      <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pt-[calc(var(--safe-area-top)+6px)] text-slate-900 dark:bg-app-background dark:text-slate-50">
        <header className="flex items-center gap-2.5 px-5 pt-1.5">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em]">Your Order</h1>
            <p aria-live="polite" className={`mt-0.5 min-h-5 text-[15px] leading-5 ${muted}`}>{!ready ? "" : filled ? `${countLabel(count)}${groups.length > 1 ? ` from ${groups.length} restaurants` : ""}` : "No items yet"}</p>
          </div>
          {filled ? (
            <button type="button" aria-label="More order actions" aria-haspopup="dialog" onClick={() => setOverlay("menu")} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/8 bg-surface-card shadow-elev-2 active:bg-slate-100 dark:border-hairline dark:active:bg-surface-hover focus-ring">
              <Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          ) : null}
        </header>
        {filled ? (
          <div className="pb-[76px]">
            <OrderOverview items={items} totals={totals} approximate={hasPartialNutritionData} />
            {groups.map(([restaurantId, groupItems]) => (
              <OrderGroup
                key={restaurantId}
                restaurant={restaurants.find((r) => r.id === restaurantId)}
                items={groupItems}
                loadingId={loadingEditItemId}
                onEdit={(item) => void openModal(item, "edit")}
                onRemove={remove}
                onQuantity={(item, quantity) => updateQuantity(item.id, quantity)}
              />
            ))}
            <OrderAnalysis totals={totals} onOpen={setOverlay} />
            <p className={`px-8 pt-4 text-center text-sm leading-5 ${muted}`}>Finishing logs this meal to History and clears your order. Macro Maxxer doesn’t place or pay for food.</p>
          </div>
        ) : null}
        {ready && !filled ? <OrderEmpty orders={orders} restaurants={restaurants} onChooseMeal={() => setOverlay("meals")} onOrderAgain={(order) => add(countLabel(itemCount(order.items)), order.items)} /> : null}
      </main>

      {filled ? <OrderActionDock saved={Boolean(savedMeal)} onSave={save} onFinish={finish} /> : null}
      <div aria-live="polite">{notice ? <SavedToast notice={notice} raised={filled} onClose={closeNotice} /> : null}</div>

      {overlay === "menu" && filled ? <OrderMenu onExport={() => setOverlay("export")} onAddMeal={() => setOverlay("meals")} onClear={() => setOverlay("clear")} onClose={close} /> : null}
      {overlay === "clear" && filled ? <OrderClearSheet count={count} onClear={clear} onClose={close} /> : null}
      {overlay === "meals" ? <OrderMealPicker meals={meals} restaurants={restaurants} onAdd={(meal) => add(meal.name, meal.items)} onClose={close} /> : null}
      {overlay === "save" && filled ? (
        <SavedMealNameSheet title="Save as a meal" preview={<OrderSavePreview items={items} restaurants={restaurants} />} note="Your order stays open." submitLabel="Save meal" onSubmit={saveAs} onClose={close} />
      ) : null}
      {(overlay === "score" || overlay === "breakdown" || overlay === "facts") && filled ? (
        <OrderSheet title={ANALYSIS_TITLE[overlay]} onClose={close}>
          {overlay === "score" ? <OrderScore totals={totals} items={breakdown} /> : null}
          {overlay === "breakdown" ? <OrderBreakdown totals={totals} items={breakdown} /> : null}
          {overlay === "facts" ? <OrderFacts totals={nutrition} count={count} approximate={hasPartialNutritionData} /> : null}
        </OrderSheet>
      ) : null}
      {overlay === "receipt" && finished ? <OrderReceipt order={finished.order} onUndo={undoFinish} onHistory={viewHistory} onClose={close} /> : null}
      {overlay === "export" && filled ? <ExportOrderDialog items={items} nutritionTotals={nutrition} onClose={close} /> : null}

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
    </>
  );
}
