import { deserializeCartItems, serializeCartItems } from "@/lib/cart/persistence";
import type { CartItem } from "@/types/cart";

// Local collections behind the native Home, Saved and Order pages. Finishing
// an order on the Order page records it in the order history.
export const FAVORITES_KEY = "macro-maxxer:favorite-restaurants";
export const SAVED_MEALS_KEY = "macro-maxxer:saved-meals";
export const SAVED_ITEMS_KEY = "macro-maxxer:saved-items";
export const ORDER_HISTORY_KEY = "macro-maxxer:order-history";
export const HOME_COLLECTIONS_EVENT = "macro-maxxer:home-collections-change";

export type SavedMeal = { id: string; name: string; savedAt: number; items: CartItem[] };
export type SavedItem = { id: string; savedAt: number; item: CartItem };
export type PastOrder = { id: string; placedAt: number; items: CartItem[] };

function parseList(raw: string | null): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    const entries = data && typeof data === "object" && "version" in data && data.version === 1 && "entries" in data ? data.entries : null;
    return Array.isArray(entries) ? entries.filter((e) => e && typeof e === "object") : [];
  } catch {
    return [];
  }
}

function parseItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return deserializeCartItems(serializeCartItems(items as CartItem[])) ?? [];
}

const validTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? [...new Set(data.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
  } catch {
    return [];
  }
}

export function parseSavedMeals(raw: string | null): SavedMeal[] {
  return parseList(raw)
    .flatMap((e): SavedMeal[] => {
      const items = parseItems(e.items);
      return typeof e.id === "string" && typeof e.name === "string" && validTime(e.savedAt) && items.length
        ? [{ id: e.id, name: e.name, savedAt: e.savedAt, items }]
        : [];
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function parseSavedItems(raw: string | null): SavedItem[] {
  return parseList(raw)
    .flatMap((e): SavedItem[] => {
      const [item] = parseItems([e.item]);
      return typeof e.id === "string" && validTime(e.savedAt) && item ? [{ id: e.id, savedAt: e.savedAt, item }] : [];
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

export const serializeEntries = (entries: (SavedMeal | SavedItem | PastOrder)[]) => JSON.stringify({ version: 1, entries });

export function parseOrderHistory(raw: string | null): PastOrder[] {
  return parseList(raw)
    .flatMap((e): PastOrder[] => {
      const items = parseItems(e.items);
      return typeof e.id === "string" && validTime(e.placedAt) && items.length ? [{ id: e.id, placedAt: e.placedAt, items }] : [];
    })
    .sort((a, b) => b.placedAt - a.placedAt);
}

export const toggleFavorite = (favorites: string[], id: string) =>
  favorites.includes(id) ? favorites.filter((other) => other !== id) : [...favorites, id];

// Moves a favorite into another favorite's place. Saved ids that aren't on
// screen keep their position relative to the rest.
export function moveFavorite(favorites: string[], id: string, targetId: string) {
  const target = favorites.indexOf(targetId);
  if (target < 0 || id === targetId || !favorites.includes(id)) return favorites;
  const next = favorites.filter((other) => other !== id);
  next.splice(target, 0, id);
  return next;
}
