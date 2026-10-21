import type { ContentSearchResult } from "./searchAllContent";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import type { CoreMacros } from "@/types/nutrition";
export function nativeResultCount(count: number, scope: "restaurants" | "menu-items") {
  const noun = scope === "restaurants" ? "restaurant" : "menu item";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
export function nativeResultPresentation(result: ContentSearchResult) {
  if (result.kind === "builder-entree") return { name: result.entreeOption.label, image: result.entreeOption.image, imagePresentation: undefined, nutrition: undefined, missing: [] as (keyof CoreMacros)[], note: "Build your own" };
  if (result.kind === "builder-ingredient") {
    const nutrition = resolveEffectiveIngredientNutrition(result.ingredient);
    return { name: result.ingredient.name, image: result.ingredient.image, imagePresentation: undefined, nutrition, missing: [] as (keyof CoreMacros)[], note: result.categoryLabel };
  }
  const item = result.item;
  const variants = item.variants ?? [];
  const variant = variants.find(v => v.id === item.defaultVariantId) ?? variants[0];
  const base = variants.find(v => v.id !== variant?.id);
  const source = variant && Number.isFinite(variant.nutritionMultiplier) ? { ...(base?.nutrition ?? item.nutrition), ...variant.nutrition } : variant?.nutrition ?? item.nutrition;
  const missing = (["calories", "protein", "carbs", "totalFat"] as (keyof CoreMacros)[]).filter(key => typeof source?.[key] !== "number" || !Number.isFinite(source[key]));
  return { name: item.name, image: item.image, imagePresentation: item.imagePresentation, nutrition: getDefaultMenuItemNutrition(item), missing, note: "" };
}
export function nativeResultKey(result: import("@/types/search").SearchResult) {
  return `${result.kind}:${result.restaurant.id}:${result.kind === "restaurant" ? "" : result.kind === "menu-item" ? result.item.id : result.kind === "builder-entree" ? result.entreeId : result.ingredient.id}`;
}
export const NATIVE_LAYOUT_KEY = "nativeSearchMenuLayout";
export function readNativeLayout(): "grid" | "list" {
  try { return window.localStorage.getItem(NATIVE_LAYOUT_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
}
