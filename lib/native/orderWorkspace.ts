import { DAILY_VALUES, percentDV } from "@/components/native/item/nativeItemModel";
import { deserializeCartItems, serializeCartItems } from "@/lib/cart/persistence";
import type { PastOrder, SavedMeal } from "@/lib/native/homeCollections";
import { copyItems } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";
import type { Nutrition } from "@/types/nutrition";

// Key order differs between a fresh cart line and one read back from storage.
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, entry]) => [key, stable(entry)]));
}

// What was ordered, ignoring line ids and the order they were added in.
function contents(items: CartItem[]) {
  const stored = deserializeCartItems(serializeCartItems(items)) ?? [];
  return stored
    .map(({ restaurantId, itemId, quantity, selection, customizations }) =>
      JSON.stringify(stable({ restaurantId, itemId, quantity, selection, customizations: customizations?.length ? customizations : undefined })))
    .sort()
    .join("\n");
}

export function findMatchingMeal(meals: SavedMeal[], items: CartItem[]) {
  if (!items.length) return undefined;
  const order = contents(items);
  return meals.find((meal) => contents(meal.items) === order);
}

export function createOrder(items: CartItem[], now = Date.now()): PastOrder {
  return { id: crypto.randomUUID(), placedAt: now, items: copyItems(items) };
}

// Puts a removed line back where it was, keeping edits made since.
export function restoreLine(current: CartItem[], item: CartItem, index: number) {
  if (current.some((other) => other.id === item.id)) return current;
  return [...current.slice(0, index), item, ...current.slice(index)];
}

// Puts a cleared order back ahead of anything added since.
export const restoreOrder = (current: CartItem[], previous: CartItem[]) => [...previous, ...current.filter((item) => !previous.some((other) => other.id === item.id))];

export type FactRow = { key: keyof Nutrition; label: string; value: string; daily: string; sub: boolean };

const FACTS: { key: keyof Nutrition; label: string; unit: string; sub?: boolean }[] = [
  { key: "totalFat", label: "Total fat", unit: "g" },
  { key: "satFat", label: "Saturated fat", unit: "g", sub: true },
  { key: "transFat", label: "Trans fat", unit: "g", sub: true },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "carbs", label: "Total carbohydrate", unit: "g" },
  { key: "fiber", label: "Dietary fiber", unit: "g", sub: true },
  { key: "sugars", label: "Total sugars", unit: "g", sub: true },
  { key: "protein", label: "Protein", unit: "g" },
];

// The whole label, in the same order and with the same daily values as the
// item page. A value no item publishes shows a dash instead of a zero.
export function factRows(totals: Nutrition): FactRow[] {
  return FACTS.map(({ key, label, unit, sub = false }) => {
    const value = totals[key];
    const known = typeof value === "number" && Number.isFinite(value);
    const daily = key in DAILY_VALUES ? DAILY_VALUES[key as keyof typeof DAILY_VALUES] : undefined;
    return {
      key, label, sub,
      value: known ? `${(unit === "mg" ? Math.round(value) : Math.round(value * 10) / 10).toLocaleString("en-US")}${unit}` : "—",
      daily: known && daily ? percentDV(value, daily) : "",
    };
  });
}
