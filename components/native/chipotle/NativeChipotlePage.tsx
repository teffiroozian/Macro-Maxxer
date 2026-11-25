"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import NativeRestaurantCover from "@/components/native/restaurant/NativeRestaurantCover";
import RestaurantFeaturedPicks from "@/components/native/restaurant/RestaurantFeaturedPicks";
import RestaurantShortcuts, { type YoursTab } from "@/components/native/restaurant/RestaurantShortcuts";
import RestaurantTopBar from "@/components/native/restaurant/RestaurantTopBar";
import RestaurantYoursSheet from "@/components/native/restaurant/RestaurantYoursSheet";
import MenuItemCard from "@/components/native/restaurant/menu/MenuItemCard";
import { useRestaurantScroll } from "@/components/native/restaurant/useRestaurantScroll";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import SavedToast, { type SavedNotice } from "@/components/native/saved/SavedToast";
import { getEntreeBaseSummary } from "@/components/restaurant-view/chipotle/entreeBaseSummary";
import { chipotlePresentationGroupForCompatibleId } from "@/data/restaurants/chipotle-generated-presentation";
import { useFavoriteRestaurants, useOrderHistory, useSavedMeals } from "@/hooks/useHomeCollections";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import { createRestaurantMenu, featuredPicks, rowKey, rowTitle, searchRows } from "@/lib/native/restaurantMenu";
import { copyItems, narrowMeals, narrowOrders } from "@/lib/native/savedLibrary";
import { getDefaultMenuItemNutrition, resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { ChipotleBuilderConfig } from "@/lib/restaurantBuilders/chipotle";
import { getCanonicalMenuItemCount } from "@/lib/restaurantMenuCount";
import { useCart } from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";
import type { MenuItem } from "@/types/menu";
import type { CoreMacros } from "@/types/nutrition";
import type { RestaurantData } from "@/types/restaurant";
import ChipotleBasePicker, { type BaseCard, type ReadyMadeCard } from "./ChipotleBasePicker";
import ChipotleBuilder from "./ChipotleBuilder";
import { BUILD_ENTREES, isBuildEntree, isReadyMadeGroup, READY_MADE_GROUPS, type BuildEntree, type ReadyMadeGroup } from "./useChipotleBuild";

const BUILD_TITLES: Record<BuildEntree, string> = {
  bowl: "Build a Bowl", burrito: "Build a Burrito", quesadilla: "Build a Quesadilla", salad: "Build a Salad", tacos: "Build Tacos", "kids-meal": "Build a Kid's Meal",
};

function formatUpdated(lastUpdated?: string) {
  if (!lastUpdated) return undefined;
  const date = new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function includesText(entree: BuildEntree, description: string) {
  if (entree === "kids-meal") return "Build your own or a quesadilla, with a side and drink";
  if (!description || description === "No required ingredients") return "Includes nothing extra";
  if (description === "Base varies by selection") return description;
  return `Includes ${description.charAt(0).toLowerCase()}${description.slice(1)}`;
}

const macrosOf = (item: MenuItem): CoreMacros => {
  const n = getDefaultMenuItemNutrition(item);
  return { calories: n.calories ?? 0, protein: n.protein ?? 0, carbs: n.carbs ?? 0, totalFat: n.totalFat ?? 0 };
};

// Chipotle on iOS: pick a base or a ready-made group, then build on one page.
// ?build=<base> opens the builder and ?menu=<group> a ready-made list, so the
// system back gesture returns to the bases.
export default function NativeChipotlePage({ restaurantData }: { restaurantData: RestaurantData }) {
  const { id, name, logo, items, ingredients, menuSizeSelector } = restaurantData;
  const config = restaurantData.builderConfig as ChipotleBuilderConfig | undefined;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const buildParam = params.get("build");
  const menuParam = params.get("menu");
  const entree = isBuildEntree(buildParam) && config?.entreeOptions?.[buildParam] ? buildParam : null;
  const group = !entree && isReadyMadeGroup(menuParam) ? menuParam : null;

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
  const picks = useMemo(() => featuredPicks(menu), [menu]);
  const here = useMemo(() => ({ query: "", restaurantId: id, sort: "newest" as const }), [id]);
  const meals = useMemo(() => narrowMeals(savedMeals, here, []), [savedMeals, here]);
  const orders = useMemo(() => narrowOrders(orderHistory, here, []), [orderHistory, here]);

  const bases = useMemo<BaseCard[]>(() => BUILD_ENTREES.flatMap((base) => {
    const option = config?.entreeOptions?.[base];
    if (!option) return [];
    const summary = getEntreeBaseSummary(base, ingredients, config);
    return [{ id: base, label: option.label, image: option.image, startsAt: summary.nutrition, includes: includesText(base, summary.description) }];
  }), [config, ingredients]);
  const groupItems = useMemo(() => Object.fromEntries(READY_MADE_GROUPS.map((key) => [key, menu.items.filter((item) => item.id && chipotlePresentationGroupForCompatibleId(item.id) === key)])) as Record<ReadyMadeGroup, MenuItem[]>, [menu]);
  const readyMade = useMemo<ReadyMadeCard[]>(() => READY_MADE_GROUPS.flatMap((key) => {
    const list = groupItems[key];
    if (!list.length) return [];
    const lowest = list.map(macrosOf).reduce((low, next) => (next.calories < low.calories ? next : low));
    const option = config?.entreeOptions?.[key];
    return [{ id: key, label: option?.label ?? key, image: option?.image ?? list[0].image ?? "", count: list.length, startsAt: lowest }];
  }), [groupItems, config]);


  const [yours, setYours] = useState<YoursTab | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<SavedNotice | null>(null);
  const noticeId = useRef(0);
  const returnTo = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
  const listTop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const { compact } = useRestaurantScroll(bar, listTop);
  const closeYours = useCallback(() => setYours(null), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  // Each screen starts at its top.
  const screen = entree ?? group ?? "bases";
  useEffect(() => {
    if (screen !== "bases") window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  const open = (key: "build" | "menu", value: string) => router.push(`${pathname}?${key}=${value}`, { scroll: false });
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.replace(pathname, { scroll: false });
  };

  const say = (message: string, undo?: () => void) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, text: message, undo });
  };
  const confirmAdded = (label: string, added: CartItem[], before: CartItem[], replaced: boolean) => {
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
  const addBuild = (added: CartItem, done: () => void) => {
    const before = cartItems;
    requestAddItems([added], ({ replaced }) => {
      confirmAdded(added.name, [added], before, replaced);
      done();
    });
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
  const text = query.trim();
  const found = useMemo(() => (searching && text ? searchRows(menu, text) : []), [menu, searching, text]);

  const listProps = { inCart, onOpen: openItem, onAdd: addOne, onRemove: (match: CartItem) => updateQuantity(match.id, match.quantity - 1) };

  const toast = notice ? <SavedToast notice={notice} onClose={closeNotice} /> : null;

  if (entree) {
    return (
      <>
        <ChipotleBuilder key={entree} restaurantId={id} entree={entree} ingredients={ingredients} config={config} logo={logo} title={BUILD_TITLES[entree]} onBack={back} onAdd={addBuild} />
        {toast}
      </>
    );
  }

  if (group) {
    const label = readyMade.find((card) => card.id === group)?.label ?? "Menu";
    return (
      <>
        <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[var(--z-sticky)] h-[var(--safe-area-top)] bg-slate-50" />
        <header className="fixed inset-x-0 top-[var(--safe-area-top)] z-[var(--z-sticky)] flex h-[52px] items-center gap-2 bg-slate-50 pl-[max(14px,var(--safe-area-left))] pr-[max(14px,var(--safe-area-right))] text-slate-900 shadow-[0_1px_0_#e2e8f0]">
          <button type="button" onClick={back} aria-label="Back to bases" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:bg-slate-200/70 focus-ring"><ChevronLeft size={24} strokeWidth={2.4} className="-ml-0.5" aria-hidden="true" /></button>
          <div className="flex min-w-0 flex-1 items-center gap-[9px]">
            <NativeRestaurantLogo src={logo} size={32} />
            <h1 className="min-w-0 truncate text-[17px] font-bold">{label}</h1>
          </div>
          <span className="pr-1 text-[15px] text-slate-500">{groupItems[group].length} items</span>
        </header>
        <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 px-[18px] pb-6 pt-[calc(var(--safe-area-top)+66px)] text-slate-900">
          <ItemList rows={groupItems[group]} {...listProps} />
        </main>
        {toast}
      </>
    );
  }

  const cover = restaurantData.cover?.includes("/brand/cover") ? restaurantData.cover : undefined;
  return (
    <>
      <RestaurantTopBar
        barRef={bar} inputRef={input} searchButtonRef={searchButton}
        name={name} logo={logo} compact={compact} pinned={false} favorite={favorites.includes(id)} searching={searching} query={query}
        onFavorite={() => toggleFavorite(id)} onSearch={openSearch} onQuery={search} onClear={clearSearch} onCancel={closeSearch}
      />
      <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] text-slate-900">
        {searching ? (
          <section aria-label={`Search ${name}`} className="px-[18px] pt-[calc(var(--safe-area-top)+52px)]" onTouchMove={() => input.current?.blur()}>
            {text ? (
              <>
                <p role="status" className="flex min-h-11 items-center px-0.5 text-[15px] text-slate-600"><span><b className="font-bold text-slate-900">{found.length}</b> {found.length === 1 ? "item" : "items"} for “{text}”</span></p>
                {found.length ? <ItemList rows={found} highlight={text} {...listProps} /> : (
                  <div className="px-6 pt-8 text-center">
                    <h3 className="text-xl font-bold [overflow-wrap:anywhere]">No items match “{text}”</h3>
                    <p className="mt-1.5 text-base text-slate-600">Try another word, or build your own.</p>
                  </div>
                )}
              </>
            ) : <p className="px-0.5 pt-3 text-[15px] text-slate-600">Search sides, drinks and the High Protein Menu.</p>}
          </section>
        ) : (
          <>
            <NativeRestaurantCover name={name} logo={logo} cover={cover} itemCount={getCanonicalMenuItemCount(items)} updatedLabel={formatUpdated(restaurantData.lastUpdated)} />
            <RestaurantShortcuts meals={meals} orders={orders} onOpen={setYours} />
            <ChipotleBasePicker bases={bases} readyMade={readyMade} onBuild={(base) => open("build", base)} onMenu={(key) => open("menu", key)} />
            <div ref={listTop} aria-hidden="true" />
            <div className="pb-4 pt-2"><RestaurantFeaturedPicks picks={picks} onOpen={openItem} /></div>
          </>
        )}
      </main>
      {yours ? <RestaurantYoursSheet name={name} meals={meals} orders={orders} initial={yours} onAdd={addAll} onClose={closeYours} /> : null}
      {toast}
    </>
  );
}

function ItemList({ rows, highlight, inCart, onOpen, onAdd, onRemove }: {
  rows: MenuItem[];
  highlight?: string;
  inCart: (row: MenuItem) => CartItem | undefined | null;
  onOpen: (row: MenuItem) => void;
  onAdd: (row: MenuItem, title: string) => void;
  onRemove: (match: CartItem) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const title = rowTitle(row, false);
        const match = inCart(row);
        return (
          <li key={rowKey(row)} className="min-w-0">
            <MenuItemCard
              item={row} title={title} mode="standard" layout="list" query={highlight} quantity={match?.quantity ?? 0}
              onOpen={() => onOpen(row)} onAdd={() => onAdd(row, title)} onRemove={() => { if (match) onRemove(match); }}
            />
          </li>
        );
      })}
    </ul>
  );
}
