import type { SearchResult } from "@/types/search";
import type { SearchIndexEntry } from "./searchIndex";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { resolveIngredientCategoryLabel } from "./searchAllContent";
export const NATIVE_RECENTS_KEY = "nativeRecentSearches";
export type NativeRecentRef =
  | { kind: "restaurant"; restaurantId: string }
  | { kind: "menu-item"; restaurantId: string; itemId: string }
  | { kind: "builder-entree"; restaurantId: string; entreeId: string }
  | { kind: "builder-ingredient"; restaurantId: string; ingredientId: string };
export function recentRefKey(ref: NativeRecentRef) {
  const id = ref.kind === "restaurant" ? "" : ref.kind === "menu-item" ? ref.itemId : ref.kind === "builder-entree" ? ref.entreeId : ref.ingredientId;
  return `${ref.kind}:${ref.restaurantId}:${id}`;
}
export function toNativeRecentRef(result: SearchResult): NativeRecentRef {
  const restaurantId = result.restaurant.id;
  switch (result.kind) {
    case "restaurant": return { kind: result.kind, restaurantId };
    case "menu-item": return { kind: result.kind, restaurantId, itemId: result.item.id };
    case "builder-entree": return { kind: result.kind, restaurantId, entreeId: result.entreeId };
    case "builder-ingredient": return { kind: result.kind, restaurantId, ingredientId: result.ingredient.id };
  }
}
function parseRefs(raw: string | null): NativeRecentRef[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((value): value is NativeRecentRef => {
      if (!value || typeof value.restaurantId !== "string") return false;
      return value.kind === "restaurant" || (value.kind === "menu-item" && typeof value.itemId === "string") || (value.kind === "builder-entree" && typeof value.entreeId === "string") || (value.kind === "builder-ingredient" && typeof value.ingredientId === "string");
    }).filter((ref,i,all) => all.findIndex(other => recentRefKey(other) === recentRefKey(ref)) === i).slice(0,6);
  } catch { return []; }
}
export function persistNativeRecents(refs: NativeRecentRef[]) {
  try { window.localStorage.setItem(NATIVE_RECENTS_KEY, JSON.stringify(refs)); } catch { /* Storage is optional. */ }
}
export function readNativeRecents(): NativeRecentRef[] {
  try {
    const stored = window.localStorage.getItem(NATIVE_RECENTS_KEY);
    // An explicitly empty list is a persisted clear, and must never reseed.
    if (stored !== null) return parseRefs(stored);
    let restaurants: unknown;
    try { restaurants = JSON.parse(window.localStorage.getItem("recentlySearchedRestaurants") ?? "[]"); } catch { restaurants = []; }
    const visits = Array.isArray(restaurants) ? restaurants.filter(id => typeof id === "string").map(restaurantId => ({ kind: "restaurant", restaurantId })) : [];
    const items = parseRefs(window.localStorage.getItem("recentlySearchedMenuItems"));
    const seeded = parseRefs(JSON.stringify([...visits, ...items]));
    persistNativeRecents(seeded);
    return seeded;
  } catch { return []; }
}
export function addNativeRecent(refs: NativeRecentRef[], ref: NativeRecentRef) {
  return [ref, ...refs.filter(existing => recentRefKey(existing) !== recentRefKey(ref))].slice(0,6);
}
export function removeNativeRecent(refs: NativeRecentRef[], ref: NativeRecentRef) {
  return refs.filter(existing => recentRefKey(existing) !== recentRefKey(ref));
}
export function clearNativeRecentStorage() {
  for (const key of [NATIVE_RECENTS_KEY, "recentlySearchedRestaurants", "recentlySearchedMenuItems"]) {
    try { window.localStorage.setItem(key, "[]"); } catch { /* Storage is optional. */ }
  }
}
export function resolveNativeRecent(ref: NativeRecentRef, restaurants: RestaurantIndexEntry[], index: SearchIndexEntry[] | null): SearchResult | null {
  const restaurant = restaurants.find(r => r.id === ref.restaurantId && !r.isComingSoon);
  if (!restaurant) return null;
  if (ref.kind === "restaurant") return { kind: "restaurant", restaurant };
  const entry = index?.find(e => e.restaurant.id === restaurant.id);
  if (!entry) return null;
  if (ref.kind === "menu-item") {
    const item = entry.items.find(i => i.id === ref.itemId);
    return item ? { kind: ref.kind, item, restaurant } : null;
  }
  if (ref.kind === "builder-entree") {
    const option = entry.entreeBuilders.find(e => e.entreeId === ref.entreeId);
    return option ? { kind: ref.kind, entreeId: ref.entreeId, entreeOption: option.option, restaurant } : null;
  }
  const ingredient = entry.ingredients.find(i => i.id === ref.ingredientId);
  return ingredient ? { kind: ref.kind, ingredient, restaurant, categoryLabel: resolveIngredientCategoryLabel(ingredient, entry.builderConfig) } : null;
}
