import type { CartItem } from "@/types/cart";

export type GramSegments = { protein: number; carbs: number; totalFat: number };

// Macro Split bar widths: proportional to grams, with a minimum share per
// segment so small macros stay legible, then renormalised to 100%.
export function macroSplitWidths({ protein, carbs, totalFat }: GramSegments, minShare = 0.14): GramSegments {
  const grams = [protein, carbs, totalFat].map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = grams.reduce((a, b) => a + b, 0);
  const shares = total === 0 ? [1 / 3, 1 / 3, 1 / 3] : grams.map((g) => Math.max(g / total, minShare));
  const sum = shares.reduce((a, b) => a + b, 0);
  const [p, c, f] = shares.map((s) => (s / sum) * 100);
  return { protein: p, carbs: c, totalFat: f };
}

// Restaurants in first-seen order, items in cart order (same as CartItemsSection).
export function groupByRestaurant(items: CartItem[]) {
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const existing = groups.get(item.restaurantId);
    if (existing) existing.push(item);
    else groups.set(item.restaurantId, [item]);
  }
  return Array.from(groups.entries());
}

export const itemCountLabel = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

export function formatWhole(value: number | undefined, unit = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("en-US")}${unit}`;
}
