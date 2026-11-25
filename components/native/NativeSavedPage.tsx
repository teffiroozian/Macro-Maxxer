"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Search, X } from "lucide-react";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { orderItemNames, orderPlaceName } from "@/components/native/home/orderPresentation";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { useSavedLibrary, useStorageReady } from "@/hooks/useHomeCollections";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import type { SavedItem } from "@/lib/native/homeCollections";
import {
  ALL_RESTAURANTS, changeMeal, changeSavedItem, copyItems, countLabel, createMeal, customizationList, duplicateMeal, formatOrderDay,
  formatOrderTime, itemCount, narrowItems, narrowMeals, narrowOrders, savedRestaurants, type SavedSort, type SavedTab,
} from "@/lib/native/savedLibrary";
import { requestedSavedTab, requestSavedTab } from "@/lib/native/savedTabRequest";
import { getAllRestaurants } from "@/lib/restaurants";
import { useCart } from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";
import SavedDeleteSheet from "./saved/SavedDeleteSheet";
import SavedDetailSheet from "./saved/SavedDetailSheet";
import SavedEmpty from "./saved/SavedEmpty";
import SavedFilterBar from "./saved/SavedFilterBar";
import SavedHistory from "./saved/SavedHistory";
import SavedItemCard from "./saved/SavedItemCard";
import SavedMealCard from "./saved/SavedMealCard";
import SavedMealEditor from "./saved/SavedMealEditor";
import SavedMealMenu from "./saved/SavedMealMenu";
import SavedMealNameSheet from "./saved/SavedMealNameSheet";
import { leadItem } from "./saved/SavedPhoto";
import SavedTabs from "./saved/SavedTabs";
import SavedToast, { type SavedNotice } from "./saved/SavedToast";

type Overlay = { kind: "menu" | "meal" | "edit" | "rename" | "delete" | "item" | "order" | "save-order"; id: string };

const NOUN: Record<SavedTab, string> = { meals: "meals", items: "items", history: "orders" };

const restaurants = getAllRestaurants().filter((restaurant) => !restaurant.isComingSoon);

export default function NativeSavedPage() {
  const ready = useStorageReady();
  const { meals, items, orders, updateMeals, updateItems } = useSavedLibrary();
  const { items: cartItems, addItem, removeItem, dismissLastAddedPreview } = useCart();
  const { requestAddItems } = useCartAddConfirmation();
  const { editState, openModal, closeEditModal } = useCartItemEditModal();
  const [tab, setTab] = useState<SavedTab>(requestedSavedTab);
  const [chosenRestaurant, setChosenRestaurant] = useState(ALL_RESTAURANTS);
  const [sort, setSort] = useState<SavedSort>("newest");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [notice, setNotice] = useState<SavedNotice | null>(null);
  const noticeId = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOverlay(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);
  useEffect(() => requestSavedTab("meals"), []);

  const options = useMemo(() => savedRestaurants(restaurants, meals, items, orders), [meals, items, orders]);
  // Removing the last thing from a restaurant also removes its filter.
  const restaurantId = options.some((r) => r.id === chosenRestaurant) ? chosenRestaurant : ALL_RESTAURANTS;
  const text = searching ? query.trim() : "";
  const view = useMemo(
    () => ({ query: text, restaurantId: searching ? ALL_RESTAURANTS : restaurantId, sort }),
    [text, searching, restaurantId, sort],
  );
  const shownMeals = useMemo(() => narrowMeals(meals, view, restaurants), [meals, view]);
  const shownItems = useMemo(() => narrowItems(items, view, restaurants), [items, view]);
  const shownOrders = useMemo(() => narrowOrders(orders, view, restaurants), [orders, view]);
  const counts = { meals: shownMeals.length, items: shownItems.length, history: shownOrders.length };
  const saved = { meals: meals.length, items: items.length, history: orders.length }[tab];

  const toTop = () => window.scrollTo({ top: 0, behavior: "instant" });
  const openSearch = () => {
    // iOS only opens the keyboard when focus lands inside the tap itself.
    flushSync(() => setSearching(true));
    toTop();
    input.current?.focus({ preventScroll: true });
  };
  const closeSearch = () => {
    flushSync(() => { setSearching(false); setQuery(""); });
    toTop();
    searchButton.current?.focus({ preventScroll: true });
  };
  const search = (value: string) => { setQuery(value); toTop(); };
  const clearSearch = () => { search(""); input.current?.focus({ preventScroll: true }); };
  const changeTab = (next: SavedTab) => { setTab(next); toTop(); };

  const say = (message: string, undo?: () => void) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text: message, undo });
  };

  const addToOrder = (label: string, source: CartItem[]) => {
    const added = copyItems(source);
    const before = cartItems;
    close();
    requestAddItems(added, ({ replaced }) => {
      // This page confirms with its own notice instead of the Just added sheet.
      dismissLastAddedPreview();
      say(`${label} added to order`, () => {
        added.forEach((item) => removeItem(item.id));
        if (replaced) before.forEach(addItem);
        dismissLastAddedPreview();
      });
    });
  };
  const removeSavedItem = (entry: SavedItem) => {
    close();
    updateItems((current) => current.filter((other) => other.id !== entry.id));
    say(`${formatCartItemName(entry.item)} removed`, () => updateItems((current) => [...current, entry]));
  };
  const customize = (entry: SavedItem) => {
    close();
    void openModal({ ...entry.item, id: entry.id }, "edit");
  };

  const meal = overlay ? meals.find((m) => m.id === overlay.id) : undefined;
  const entry = overlay ? items.find((i) => i.id === overlay.id) : undefined;
  const order = overlay ? orders.find((o) => o.id === overlay.id) : undefined;
  const editing = editState ? items.find((i) => i.id === editState.cartItemId) : undefined;
  const show = (kind: Overlay["kind"], id: string) => setOverlay({ kind, id });
  const duplicate = (id: string, name: string) => {
    close();
    updateMeals((current) => duplicateMeal(current, id));
    say(`${name} duplicated`);
  };

  return (
    <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] text-slate-900 dark:bg-app-background dark:text-slate-50">
      <header className="sticky top-0 z-[var(--z-sticky)] bg-slate-50 pb-1.5 pt-[calc(var(--safe-area-top)+6px)] dark:bg-app-background">
        <h1 className={searching ? "sr-only" : "float-left flex h-[52px] items-center px-5 font-heading text-[28px] font-bold leading-[1.15] tracking-[-0.02em]"}>Saved</h1>
        {searching ? (
          <div role="search" className="flex items-center px-[18px]">
            <label htmlFor="native-saved-search" className="flex h-[52px] min-w-0 flex-1 cursor-text items-center gap-3 rounded-full bg-surface-card pl-[18px] pr-1.5 shadow-[0_0_0_2px_var(--product-accent),var(--elev-2)]">
              <Search size={20} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden="true" />
              <input
                id="native-saved-search"
                ref={input}
                type="search"
                enterKeyHint="search"
                aria-label="Search saved"
                placeholder="Search saved"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={query}
                onChange={(event) => search(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
                  if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
                }}
                className="native-search-input min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] text-slate-900 caret-accent outline-none placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400"
              />
              {query ? <button type="button" aria-label="Clear search" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.preventDefault(); clearSearch(); }} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring"><span className="flex size-[22px] items-center justify-center rounded-full bg-slate-500 text-white dark:bg-slate-400 dark:text-slate-950"><X size={12} strokeWidth={3.4} aria-hidden="true" /></span></button> : null}
            </label>
            <button type="button" onClick={closeSearch} className="flex h-11 shrink-0 cursor-pointer items-center pl-3.5 text-base font-semibold text-accent-strong focus-ring">Cancel</button>
          </div>
        ) : (
          <div className="flex h-[52px] items-center justify-end px-5">
            <button ref={searchButton} type="button" aria-label="Search saved" onClick={openSearch} className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-black/8 bg-surface-card shadow-elev-2 active:bg-slate-100 dark:border-hairline dark:active:bg-surface-hover focus-ring">
              <Search size={20} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="clear-both px-[18px] pt-1.5"><SavedTabs tab={tab} counts={text ? counts : undefined} onChange={changeTab} /></div>
      </header>

      {ready ? (
        <div id="saved-panel" role="tabpanel" aria-labelledby={`saved-tab-${tab}`} onTouchMove={() => input.current?.blur()}>
          {!saved && !text ? <SavedEmpty tab={tab} restaurants={restaurants} /> : null}
          {saved && !searching ? <SavedFilterBar restaurants={options} restaurantId={restaurantId} sort={sort} onRestaurant={(id) => { setChosenRestaurant(id); toTop(); }} onSort={(next) => { setSort(next); toTop(); }} /> : null}
          <div className={searching ? "pt-2.5" : ""}>
            {tab === "meals" && shownMeals.length ? (
              <ul className="flex flex-col gap-4 px-[18px] pb-1.5">
                {shownMeals.map((m) => <li key={m.id}><SavedMealCard meal={m} restaurants={restaurants} onOpen={() => show("meal", m.id)} onMenu={() => show("menu", m.id)} onAdd={() => addToOrder(m.name, m.items)} /></li>)}
              </ul>
            ) : null}
            {tab === "items" && shownItems.length ? (
              <ul className="flex flex-col gap-3 px-[18px] pb-1.5">
                {shownItems.map((i) => <li key={i.id}><SavedItemCard entry={i} restaurants={restaurants} onOpen={() => show("item", i.id)} onAdd={() => addToOrder(formatCartItemName(i.item), [i.item])} /></li>)}
              </ul>
            ) : null}
            {tab === "history" && shownOrders.length ? <SavedHistory orders={shownOrders} restaurants={restaurants} onOpen={(o) => show("order", o.id)} /> : null}
          </div>
          {!counts[tab] && (saved || text) ? (
            <div role="status" className="px-10 pt-14 text-center">
              <h2 className="text-xl font-bold [overflow-wrap:anywhere]">{text ? `Nothing matches “${text}”` : `No ${NOUN[tab]} from ${restaurants.find((r) => r.id === restaurantId)?.name ?? "here"}`}</h2>
              <p className="mt-1.5 text-base text-slate-600 dark:text-slate-300">{text ? (counts.meals + counts.items + counts.history ? "There are matches in the other tabs." : "Try a meal, item or restaurant name.") : "Pick another restaurant to see the rest."}</p>
              <button type="button" onClick={text ? clearSearch : () => setChosenRestaurant(ALL_RESTAURANTS)} className="mt-2 h-11 cursor-pointer px-3 text-base font-semibold text-accent-strong focus-ring">{text ? "Clear search" : "Show all restaurants"}</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite">{notice ? <SavedToast notice={notice} onClose={closeNotice} /> : null}</div>

      {overlay?.kind === "menu" && meal ? (
        <SavedMealMenu
          key="menu" meal={meal} restaurants={restaurants} onClose={close}
          onAdd={() => addToOrder(meal.name, meal.items)}
          onView={() => show("meal", meal.id)}
          onRename={() => show("rename", meal.id)}
          onEdit={() => show("edit", meal.id)}
          onDuplicate={() => duplicate(meal.id, meal.name)}
          onDelete={() => show("delete", meal.id)}
        />
      ) : null}
      {overlay?.kind === "meal" && meal ? (
        <SavedDetailSheet
          key="meal" title={meal.name} items={meal.items} restaurants={restaurants} hero={leadItem(meal.items)} listTitle="In this meal" onClose={close}
          onMore={() => show("menu", meal.id)}
          primary={{ label: "Add to order", run: () => addToOrder(meal.name, meal.items) }}
          actions={[
            { label: "Edit", run: () => show("edit", meal.id) },
            { label: "Rename", run: () => show("rename", meal.id) },
            { label: "Duplicate", run: () => duplicate(meal.id, meal.name) },
          ]}
        />
      ) : null}
      {overlay?.kind === "edit" && meal ? (
        <SavedMealEditor key="edit" meal={meal} savedItems={items} onClose={close} onSave={(change) => { close(); updateMeals((current) => changeMeal(current, meal.id, change)); say(`${change.name} updated`); }} />
      ) : null}
      {overlay?.kind === "rename" && meal ? (
        <SavedMealNameSheet key="rename" title="Rename meal" initialName={meal.name} submitLabel="Save" onClose={close} onSubmit={(name) => { close(); updateMeals((current) => changeMeal(current, meal.id, { name })); say(`Renamed to ${name}`); }} />
      ) : null}
      {overlay?.kind === "delete" && meal ? (
        <SavedDeleteSheet key="delete" name={meal.name} onClose={close} onDelete={() => { close(); updateMeals((current) => current.filter((m) => m.id !== meal.id)); say(`${meal.name} deleted`); }} />
      ) : null}
      {overlay?.kind === "item" && entry ? (
        <SavedDetailSheet
          key="item" title={formatCartItemName(entry.item)} items={[entry.item]} restaurants={restaurants} hero={entry.item} listTitle={entry.item.selection.type === "build-your-own" ? "What’s in it" : "Your changes"} changes={customizationList(entry.item)} onClose={close}
          primary={{ label: "Add to order", run: () => addToOrder(formatCartItemName(entry.item), [entry.item]) }}
          actions={[{ label: "Customize", run: () => customize(entry) }, { label: "Remove", danger: true, run: () => removeSavedItem(entry) }]}
        />
      ) : null}
      {overlay?.kind === "order" && order ? (
        <SavedDetailSheet
          key="order" title={orderPlaceName(order.items, restaurants)} items={order.items} restaurants={restaurants} when={`${formatOrderDay(order.placedAt)}, ${formatOrderTime(order.placedAt)}`} listTitle={countLabel(itemCount(order.items))} onClose={close}
          primary={{ label: "Order again", run: () => addToOrder(countLabel(itemCount(order.items)), order.items) }}
          actions={[{ label: "Save as meal", run: () => show("save-order", order.id) }]}
        />
      ) : null}
      {overlay?.kind === "save-order" && order ? (
        <SavedMealNameSheet
          key="save-order" title="Save as a meal" detail={orderItemNames(order.items)} submitLabel="Save meal" onClose={close}
          onSubmit={(name) => { close(); updateMeals((current) => [...current, createMeal(name, order.items)]); say(`${name} saved to Meals`); }}
        />
      ) : null}

      {editState && editing ? (
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
          savedItem={{
            item: editing.item,
            onUpdate: (updates) => { updateItems((current) => changeSavedItem(current, editing.id, updates)); say(`${formatCartItemName(editing.item)} updated`); },
          }}
          initialMode={editState.mode}
          onClose={closeEditModal}
        />
      ) : null}
    </main>
  );
}
