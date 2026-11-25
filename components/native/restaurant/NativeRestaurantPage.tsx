"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { X } from "lucide-react";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import SavedToast, { type SavedNotice } from "@/components/native/saved/SavedToast";
import { useFavoriteRestaurants, useOrderHistory, useSavedMeals } from "@/hooks/useHomeCollections";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { resolveCardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { getRankState, isDefaultOrderSort, type SortOption } from "@/lib/menuSections/sortOptions";
import {
  applyGoal, clearNutrition, countActive, createRestaurantMenu, defaultView, exploreGoals, featuredPicks, filterChips, goalLabel, groupRows,
  hasCategories, isNarrowed, menuRows, rankText, reconcile, rowKey, rowTitle, searchRows, selectedPreset, type GoalId, type RestaurantMenuView,
} from "@/lib/native/restaurantMenu";
import { copyItems, narrowMeals, narrowOrders } from "@/lib/native/savedLibrary";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import { getCanonicalMenuItemCount } from "@/lib/restaurantMenuCount";
import { useCart } from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";
import type { MenuItem } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import MenuDisplaySheet, { type MenuLayout } from "./menu/MenuDisplaySheet";
import MenuItemCard from "./menu/MenuItemCard";
import MenuNutritionSheet from "./menu/MenuNutritionSheet";
import MenuRankSheet from "./menu/MenuRankSheet";
import MenuSelectionSheet from "./menu/MenuSelectionSheet";
import MenuToolbar, { type MenuSheetKind } from "./menu/MenuToolbar";
import { linkButton } from "./menu/MenuSheet";
import NativeRestaurantCover from "./NativeRestaurantCover";
import RestaurantFeaturedPicks from "./RestaurantFeaturedPicks";
import RestaurantGoals from "./RestaurantGoals";
import RestaurantShortcuts, { type YoursTab } from "./RestaurantShortcuts";
import RestaurantTopBar from "./RestaurantTopBar";
import RestaurantYoursSheet from "./RestaurantYoursSheet";
import { useRestaurantScroll } from "./useRestaurantScroll";

// Shared with the earlier full menu, so a chosen grid carries over.
const LAYOUT_KEY = "native-full-menu-layout";

function formatUpdated(lastUpdated?: string) {
  if (!lastUpdated) return undefined;
  const date = new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function NativeRestaurantPage({ restaurantData }: { restaurantData: RestaurantData }) {
  const { id, name, logo, items, menuSizeSelector } = restaurantData;
  const { openPreview } = useGlobalItemPreview();
  const { requestAddItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
  const { requestAddItems } = useCartAddConfirmation();
  const { items: cartItems, addItem, removeItem, dismissLastAddedPreview } = useCart();
  const { favorites, toggle: toggleFavorite } = useFavoriteRestaurants();
  const savedMeals = useSavedMeals();
  const orderHistory = useOrderHistory();

  const menu = useMemo(
    () => createRestaurantMenu(id, items.filter(isStandaloneMenuItem), menuSizeSelector?.enabled ? menuSizeSelector.defaultValue : undefined),
    [id, items, menuSizeSelector],
  );
  const byId = useMemo(() => new Map(menu.items.map((item) => [item.id ?? item.name, item])), [menu]);
  const goals = useMemo(() => exploreGoals(menu), [menu]);
  const picks = useMemo(() => featuredPicks(menu), [menu]);
  const here = useMemo(() => ({ query: "", restaurantId: id, sort: "newest" as const }), [id]);
  const meals = useMemo(() => narrowMeals(savedMeals, here, []), [savedMeals, here]);
  const orders = useMemo(() => narrowOrders(orderHistory, here, []), [orderHistory, here]);

  const [view, setViewState] = useState<RestaurantMenuView>(() => defaultView(menu));
  const [layout, setLayout] = useState<MenuLayout>("list");
  const [sheet, setSheet] = useState<MenuSheetKind | null>(null);
  const [yours, setYours] = useState<YoursTab | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<SavedNotice | null>(null);
  const noticeId = useRef(0);
  const returnTo = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
  const menuTop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const { compact, pinned } = useRestaurantScroll(bar, menuTop);
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeYours = useCallback(() => setYours(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { if (localStorage.getItem(LAYOUT_KEY) === "grid") setLayout("grid"); } catch { /* storage unavailable */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const changeLayout = (next: MenuLayout) => {
    setLayout(next);
    try { localStorage.setItem(LAYOUT_KEY, next === "grid" ? "grid" : "rows"); } catch { /* storage unavailable */ }
  };

  const menuOffset = () => {
    const top = menuTop.current?.getBoundingClientRect().top ?? 0;
    const edge = bar.current?.getBoundingClientRect().bottom ?? 0;
    return Math.max(0, Math.round(window.scrollY + top - edge));
  };
  // After React has laid out the shorter or longer list.
  const toMenu = () => requestAnimationFrame(() => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: menuOffset(), behavior: smooth ? "smooth" : "instant" });
  });
  // A changed list starts from its first result, without pulling the page down.
  const toFirst = () => requestAnimationFrame(() => {
    const top = menuOffset();
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
  });

  const change = (next: RestaurantMenuView) => { setViewState({ ...next, filters: reconcile(menu, next.filters) }); toFirst(); };
  const setFilters = (filters: Filters) => change({ ...view, filters, goal: null });
  const setSort = (sort: SortOption) => change({ ...view, sort, goal: null });
  const reset = () => change({ ...defaultView(menu), filters: { ...defaultView(menu).filters, ...displayOf(view.filters) } });
  const pickGoal = (goal: GoalId) => {
    if (view.goal === goal) return change({ ...view, filters: clearNutrition(view.filters), sort: "default-order", goal: null });
    const next = applyGoal(menu, view, goal);
    setViewState({ ...next, filters: reconcile(menu, next.filters) });
    toMenu();
  };

  const result = useMemo(() => menuRows(menu, view), [menu, view]);
  const text = query.trim();
  const found = useMemo(() => (searching && text ? searchRows(menu, text) : null), [menu, searching, text]);
  const everything = useMemo(() => {
    if (!searching) return null;
    const all = menu.presets.find((preset) => preset.id === "all");
    return menuRows(menu, { filters: { ...defaultView(menu).filters, categories: all?.ids, categoryPreset: "all" }, sort: "default-order" }).rows;
  }, [menu, searching]);
  const rows = useMemo(() => (searching ? found ?? everything ?? [] : result.rows), [searching, found, everything, result]);
  const ranked = !searching && !isDefaultOrderSort(view.sort);
  const groups = useMemo(
    () => (searching && found ? (found.length ? [{ id: "results", title: "", rows: found }] : []) : groupRows(menu, rows, searching ? "default-order" : view.sort)),
    [menu, rows, found, searching, view.sort],
  );
  const mode = resolveCardDisplayMode(ranked ? getRankState(view.sort).metric : undefined, view.filters.cardDisplayOverride);
  const variantsShown = !searching && Boolean(view.filters.showServingSizeVariants || view.filters.showRecipeVariants || (view.filters.separateSizesInProteinScore && getRankState(view.sort).metric === "protein-score" && ranked));
  const filterCount = countActive(view.filters);
  const preset = selectedPreset(menu, view.filters);
  const menuName = hasCategories(view.filters) ? preset?.label ?? "Custom" : "None";
  const narrowed = isNarrowed(menu, view);
  const chips = filterChips(view.filters);
  const action = !hasCategories(view.filters) ? "Choose a category" : result.rows.length ? `Show ${result.rows.length} item${result.rows.length === 1 ? "" : "s"}` : "No items match";

  const say = (message: string, undo?: () => void) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text: message, undo });
  };

  const source = (row: MenuItem) => {
    const item = byId.get(row.id ?? row.name) ?? row;
    const variant = item.variants?.find((v) => v.id === (row.variants?.length === 1 ? row.variants[0].id : row.defaultVariantId)) ?? item.variants?.find((v) => v.id === item.defaultVariantId) ?? item.variants?.[0];
    return { item, variant };
  };
  const inCart = (row: MenuItem) => {
    const { item, variant } = source(row);
    return getMatchingItem({ restaurantId: id, itemId: item.id ?? item.name, variantId: variant?.id });
  };
  const openItem = (row: MenuItem) => {
    const { item, variant } = source(row);
    void openPreview(id, item, variant?.id);
  };
  const addOne = (row: MenuItem, title: string) => {
    const match = inCart(row);
    if (match) {
      updateQuantity(match.id, match.quantity + 1, { markAsJustAdded: true });
      dismissLastAddedPreview();
      trackAddToCart(getCartItemAddToCartAnalytics(match, 1));
      return;
    }
    const { item, variant } = source(row);
    const before = cartItems;
    const added: CartItem = {
      id: crypto.randomUUID(),
      restaurantId: id,
      itemId: item.id ?? item.name,
      ...buildStandardCartItemPayload({ item, selectedVariant: variant, quantity: 1, nutritionPerItem: resolveMenuItemVariantNutrition(item, variant) }),
    };
    requestAddItem(added, ({ replaced }) => confirmAdded(title, [added], before, replaced));
  };
  const confirmAdded = (label: string, added: CartItem[], before: CartItem[], replaced: boolean) => {
    // This page confirms with its own notice instead of the Just added sheet.
    dismissLastAddedPreview();
    say(`${label} added to order`, () => {
      added.forEach((item) => removeItem(item.id));
      if (replaced) before.forEach(addItem);
      dismissLastAddedPreview();
    });
  };
  const addAll = (label: string, list: CartItem[]) => {
    const added = copyItems(list);
    const before = cartItems;
    closeYours();
    requestAddItems(added, ({ replaced }) => confirmAdded(label, added, before, replaced));
  };

  // iOS only opens the keyboard when focus lands inside the tap itself.
  const openSearch = () => {
    returnTo.current = window.scrollY;
    flushSync(() => setSearching(true));
    window.scrollTo({ top: 0, behavior: "instant" });
    input.current?.focus({ preventScroll: true });
  };
  const closeSearch = () => {
    flushSync(() => { setSearching(false); setQuery(""); });
    window.scrollTo({ top: returnTo.current, behavior: "instant" });
    searchButton.current?.focus({ preventScroll: true });
  };
  const search = (value: string) => { setQuery(value); window.scrollTo({ top: 0, behavior: "instant" }); };
  const clearSearch = () => { search(""); input.current?.focus({ preventScroll: true }); };

  const cover = restaurantData.cover?.includes("/brand/cover") ? restaurantData.cover : undefined;
  const summary = filterCount ? ` of ${result.pool} items, ${rankText(view.sort)}` : ` ${result.rows.length === 1 ? "item" : "items"}, ${rankText(view.sort)}`;

  return (
    <>
      <RestaurantTopBar
        barRef={bar} inputRef={input} searchButtonRef={searchButton}
        name={name} logo={logo} compact={compact} pinned={pinned} favorite={favorites.includes(id)} searching={searching} query={query}
        onFavorite={() => toggleFavorite(id)} onSearch={openSearch} onQuery={search} onClear={clearSearch} onCancel={closeSearch}
      />
      <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] text-slate-900 dark:bg-app-background dark:text-slate-50">
        {searching ? <div aria-hidden="true" className="h-[calc(var(--safe-area-top)+52px)]" /> : (
          <>
            <NativeRestaurantCover name={name} logo={logo} cover={cover} itemCount={getCanonicalMenuItemCount(items)} updatedLabel={formatUpdated(restaurantData.lastUpdated)} />
            <RestaurantShortcuts meals={meals} orders={orders} onOpen={setYours} />
            <RestaurantGoals goals={goals} active={view.goal} onPick={pickGoal} />
            <RestaurantFeaturedPicks picks={picks} onOpen={openItem} />
          </>
        )}

        <section aria-label={searching ? `Search ${name}` : "Full menu"} className="min-h-[calc(var(--app-viewport-height)-var(--safe-area-top)-52px)]" onTouchMove={() => input.current?.blur()}>
          {searching ? null : (
            <>
              <div className="flex items-baseline px-5 pb-2 pt-1.5">
                <h2 className="flex-1 text-[22px] font-bold leading-[30px]">Full menu</h2>
                <span className="text-[15px] text-slate-500 dark:text-slate-400">{menu.items.length} items</span>
              </div>
              <div ref={menuTop} aria-hidden="true" />
              <div className={`sticky top-[calc(var(--safe-area-top)+52px)] z-[calc(var(--z-sticky)-1)] bg-slate-50 dark:bg-app-background ${pinned ? "shadow-[0_1px_0_#e2e8f0] dark:shadow-[0_1px_0_var(--border-divider)]" : ""}`}>
                <MenuToolbar menuName={menuName} sort={view.sort} filterCount={filterCount} layout={layout} onOpen={setSheet} />
              </div>
            </>
          )}

          {searching ? (
            text ? <p role="status" className="flex min-h-11 items-center px-5 text-[15px] text-slate-600 dark:text-slate-300"><span><b className="font-bold text-slate-900 dark:text-slate-50">{rows.length}</b> {rows.length === 1 ? "item" : "items"} for “{text}”</span></p> : null
          ) : (
            <div className="px-5">
              <div className="flex min-h-[46px] items-center gap-3">
                <p role="status" className="min-w-0 flex-1 text-[15px] leading-5 text-slate-600 dark:text-slate-300"><b className="font-bold text-slate-900 dark:text-slate-50">{result.rows.length}</b>{summary}</p>
                {narrowed ? <button type="button" onClick={reset} className={linkButton}>Reset</button> : null}
              </div>
              {view.goal || chips.length ? (
                <ul aria-label="Active filters" className="flex flex-wrap gap-2 pb-3">
                  {view.goal ? <Chip label={goalLabel(view.goal)} onRemove={() => view.goal && pickGoal(view.goal)} /> : null}
                  {chips.map((chip) => <Chip key={chip.key} label={chip.label} onRemove={() => setFilters({ ...view.filters, [chip.key]: undefined })} />)}
                </ul>
              ) : null}
            </div>
          )}

          {groups.map((group) => (
            <div key={group.id} className="px-[18px] pb-3.5">
              {group.title ? <h3 className="flex h-11 items-center gap-2 px-0.5 text-lg font-bold">{group.title}<span className="text-[15px] font-normal text-slate-500 dark:text-slate-400">{group.rows.length}</span></h3> : null}
              <ul className={layout === "list" ? "flex flex-col gap-2.5" : "grid grid-cols-2 gap-2.5"}>
                {group.rows.map((row, index) => {
                  const title = rowTitle(row, variantsShown);
                  const match = inCart(row);
                  return (
                    <li key={rowKey(row)} className="min-w-0">
                      <MenuItemCard
                        item={row} title={title} rank={ranked ? index + 1 : undefined} mode={mode} layout={layout} query={searching ? text : undefined} quantity={match?.quantity ?? 0}
                        onOpen={() => openItem(row)} onAdd={() => addOne(row, title)} onRemove={() => { if (match) updateQuantity(match.id, match.quantity - 1); }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {rows.length ? null : searching ? (
            <div className="px-10 pt-10 text-center">
              <h3 className="text-xl font-bold [overflow-wrap:anywhere]">No items match “{text}”</h3>
              <p className="mt-1.5 text-base text-slate-600 dark:text-slate-300">Try another word, or look through the menu.</p>
              <button type="button" onClick={clearSearch} className="mt-2 h-11 cursor-pointer px-3 text-base font-semibold text-accent-strong focus-ring">Clear search</button>
            </div>
          ) : (
            <div className="px-10 pt-8 text-center">
              <h3 className="text-xl font-bold">{hasCategories(view.filters) ? "No items match" : "No categories selected"}</h3>
              <p className="mt-1.5 text-base text-slate-600 dark:text-slate-300">{hasCategories(view.filters) ? "Loosen a filter to see more of the menu." : "Choose at least one category."}</p>
              <button type="button" onClick={() => (hasCategories(view.filters) ? setFilters(clearNutrition(view.filters)) : reset())} className="mt-2 h-11 cursor-pointer px-3 text-base font-semibold text-accent-strong focus-ring">{hasCategories(view.filters) ? "Reset filters" : `Show ${menu.main.label}`}</button>
            </div>
          )}
        </section>
      </main>

      {sheet === "menu" ? <MenuSelectionSheet menu={menu} view={view} action={action} disabled={!result.rows.length} onChange={setFilters} onClose={closeSheet} /> : null}
      {sheet === "rank" ? <MenuRankSheet sort={view.sort} hasFiber={menu.hasFiber} action={action} disabled={!result.rows.length} onChange={setSort} onClose={closeSheet} /> : null}
      {sheet === "nutrition" ? <MenuNutritionSheet menu={menu} filters={view.filters} action={action} disabled={!result.rows.length} onChange={setFilters} onClose={closeSheet} /> : null}
      {sheet === "display" ? <MenuDisplaySheet layout={layout} mode={mode} filters={view.filters} onLayout={changeLayout} onChange={(filters) => change({ ...view, filters })} onClose={closeSheet} /> : null}
      {yours ? <RestaurantYoursSheet name={name} meals={meals} orders={orders} initial={yours} onAdd={addAll} onClose={closeYours} /> : null}
      {notice ? <SavedToast notice={notice} onClose={closeNotice} /> : null}
    </>
  );
}

// Reset narrows nothing but keeps how cards and variants are shown.
const displayOf = (filters: Filters): Filters => ({
  cardDisplayOverride: filters.cardDisplayOverride,
  showServingSizeVariants: filters.showServingSizeVariants,
  showRecipeVariants: filters.showRecipeVariants,
  separateSizesInProteinScore: filters.separateSizesInProteinScore,
});

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="relative flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-soft px-[11px] text-sm font-semibold text-accent-strong before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[''] active:opacity-70 focus-ring">
        {label}<X size={12} strokeWidth={3} aria-hidden="true" />
      </button>
    </li>
  );
}
