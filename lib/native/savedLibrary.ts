import { orderItemNames, orderPlaceName } from "@/components/native/home/orderPresentation";
import { buildCartItemSummaryGroups, formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import { findCartMenuItem, getCartRestaurantMenu } from "@/lib/cart/cartItemLookup";
import { getCartItemVariantId } from "@/lib/cart/itemAccessors";
import { getDisplayVariantLabel } from "@/lib/menuItemCard/titlePresentation";
import type { PastOrder, SavedItem, SavedMeal } from "@/lib/native/homeCollections";
import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export type SavedTab = "meals" | "items" | "history";
export type SavedSort = "newest" | "oldest";
export const ALL_RESTAURANTS = "all";
export const MEAL_NAME_LIMIT = 40;

export const restaurantIds = (items: CartItem[]) => [...new Set(items.map((item) => item.restaurantId))];
export const itemCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
export const countLabel = (count: number, noun = "item") => `${count} ${noun}${count === 1 ? "" : "s"}`;
// The cart keeps a size's id but not its label, so look it up in the menu.
function sizeLabel(item: CartItem) {
  const menu = getCartRestaurantMenu(item.restaurantId);
  const source = menu ? findCartMenuItem(menu, item.itemId) : null;
  if (!source?.variants || source.variants.length < 2) return "";
  const label = getDisplayVariantLabel(source.variants.find((variant) => variant.id === getCartItemVariantId(item))?.label)?.replace(/\b(\d+)\s*(?:ct|count)\b/gi, "$1 ct") ?? "";
  return formatCartItemName(item).toLowerCase().includes(label.toLowerCase()) ? "" : label;
}

// Ingredient labels don't say when a build doubles its protein.
const doublesProtein = (item: CartItem) => item.selection.type === "build-your-own" && item.selection.buildConfiguration.options?.proteinPortionMode === "double";
const leadLabels = (item: CartItem) => [sizeLabel(item), doublesProtein(item) ? "Double protein" : ""].filter(Boolean);

export const customizationLine = (item: CartItem) =>
  [item.quantity > 1 ? `×${item.quantity}` : "", ...leadLabels(item), summarizeItem(item)].filter(Boolean).join(" • ") || "Standard";

export function customizationList(item: CartItem) {
  return [...leadLabels(item), ...buildCartItemSummaryGroups(item).flatMap((group) => group.inlineItems?.map((entry) => entry.label) ?? [group.label])];
}

// Cart lines merge by id, so every copy that leaves the library gets its own.
export const copyItems = (items: CartItem[]): CartItem[] => items.map((item) => ({ ...structuredClone(item), id: crypto.randomUUID() }));

export type SavedView = { query: string; restaurantId: string; sort: SavedSort };

function matches(view: SavedView, items: CartItem[], text: string) {
  if (view.restaurantId !== ALL_RESTAURANTS && !items.some((item) => item.restaurantId === view.restaurantId)) return false;
  const haystack = text.toLowerCase();
  return view.query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function narrow<T>(entries: T[], view: SavedView, time: (entry: T) => number, items: (entry: T) => CartItem[], text: (entry: T) => string) {
  return entries
    .filter((entry) => matches(view, items(entry), text(entry)))
    .sort((a, b) => (view.sort === "newest" ? time(b) - time(a) : time(a) - time(b)));
}

export const narrowMeals = (meals: SavedMeal[], view: SavedView, restaurants: RestaurantIndexEntry[]) =>
  narrow(meals, view, (m) => m.savedAt, (m) => m.items, (m) => [m.name, searchText(m.items, restaurants)].join(" "));
export const narrowItems = (items: SavedItem[], view: SavedView, restaurants: RestaurantIndexEntry[]) =>
  narrow(items, view, (i) => i.savedAt, (i) => [i.item], (i) => [searchText([i.item], restaurants), summarizeItem(i.item)].join(" "));
export const narrowOrders = (orders: PastOrder[], view: SavedView, restaurants: RestaurantIndexEntry[]) =>
  narrow(orders, view, (o) => o.placedAt, (o) => o.items, (o) => searchText(o.items, restaurants));

function searchText(items: CartItem[], restaurants: RestaurantIndexEntry[]) {
  const places = restaurantIds(items).map((id) => restaurants.find((r) => r.id === id)?.name ?? "");
  return [...places, orderItemNames(items), ...items.map(formatCartItemName)].join(" ");
}

// Only restaurants something is saved from, in the directory's order.
export function savedRestaurants(restaurants: RestaurantIndexEntry[], meals: SavedMeal[], items: SavedItem[], orders: PastOrder[]) {
  const used = new Set([...meals.flatMap((m) => m.items), ...items.map((i) => i.item), ...orders.flatMap((o) => o.items)].map((item) => item.restaurantId));
  return restaurants.filter((r) => used.has(r.id));
}

export type HistoryDay = { key: string; day: string; weekday: string; orders: PastOrder[] };
export type HistoryMonth = { key: string; label: string; days: HistoryDay[] };

// Keeps the incoming order, so oldest-first lists group the same way.
export function groupOrders(orders: PastOrder[], now = Date.now()): HistoryMonth[] {
  const months: HistoryMonth[] = [];
  for (const order of orders) {
    const date = new Date(order.placedAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    let month = months.at(-1);
    if (month?.key !== monthKey) {
      const year = date.getFullYear() === new Date(now).getFullYear() ? {} : { year: "numeric" as const };
      month = { key: monthKey, label: date.toLocaleDateString("en-US", { month: "long", ...year }), days: [] };
      months.push(month);
    }
    const dayKey = `${monthKey}-${date.getDate()}`;
    let day = month.days.at(-1);
    if (day?.key !== dayKey) {
      day = { key: dayKey, day: String(date.getDate()), weekday: date.toLocaleDateString("en-US", { weekday: "short" }), orders: [] };
      month.days.push(day);
    }
    day.orders.push(order);
  }
  return months;
}

export const formatOrderTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const formatOrderDay = (timestamp: number) => new Date(timestamp).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export const mealMeta = (items: CartItem[], restaurants: RestaurantIndexEntry[]) => `${orderPlaceName(items, restaurants)}, ${countLabel(itemCount(items))}`;

export const cleanMealName = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, MEAL_NAME_LIMIT);

export function createMeal(name: string, items: CartItem[], now = Date.now()): SavedMeal {
  return { id: crypto.randomUUID(), name: cleanMealName(name), savedAt: now, items: copyItems(items) };
}

// The copy takes a moment before its original, so it lists right after it.
export function duplicateMeal(meals: SavedMeal[], id: string): SavedMeal[] {
  const meal = meals.find((m) => m.id === id);
  if (!meal) return meals;
  const suffix = " copy";
  const base = meal.name.slice(0, MEAL_NAME_LIMIT - suffix.length).trimEnd();
  return [...meals, { ...createMeal(`${base}${suffix}`, meal.items), savedAt: Math.max(0, meal.savedAt - 1) }];
}

export const changeMeal = (meals: SavedMeal[], id: string, change: Partial<Pick<SavedMeal, "name" | "items">>) =>
  meals.map((meal) => (meal.id === id ? { ...meal, ...change } : meal));

export const changeSavedItem = (items: SavedItem[], id: string, change: Partial<Omit<CartItem, "id" | "restaurantId">>) =>
  items.map((entry) => (entry.id === id ? { ...entry, item: { ...entry.item, ...change } } : entry));
