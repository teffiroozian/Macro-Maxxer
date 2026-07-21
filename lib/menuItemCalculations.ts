import type { MenuItem } from "@/types/menu";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";

export function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function compareByDefaultOrder(left: MenuItem, right: MenuItem) {
  const leftOrder = left.defaultOrder ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.defaultOrder ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.name.localeCompare(right.name);
}

export function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function formatMacro(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—g" : `${value}g`;
}

export function formatCalories(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : String(value);
}

export function sumNutrition(base?: number, delta = 0) {
  if (base === undefined) return undefined;
  return base + delta;
}

export function sumNutritionWithFallback(base?: number, delta = 0) {
  if (delta === 0) return base;
  return (base ?? 0) + delta;
}

export function addonFat(addon?: MenuItem) {
  return addon?.nutrition.totalFat ?? 0;
}

export function menuItemFat(item?: MenuItem) {
  return item ? getDefaultMenuItemNutrition(item).totalFat : 0;
}

export function menuItemFatWithFallback(item?: MenuItem) {
  return menuItemFat(item);
}

export function getDefaultVariantId(item?: MenuItem) {
  if (!item) return undefined;
  const variants = item.variants ?? [];
  if (variants.length === 0) return undefined;
  if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
    return item.defaultVariantId;
  }
  return variants[0]?.id;
}

export function getDefaultIngredientCounts(resolvedIngredients: ResolvedPanelIngredient[]) {
  return resolvedIngredients.reduce<Record<string, number>>((acc, ingredient) => {
    acc[ingredient.id] = ingredient.defaultCount;
    return acc;
  }, {});
}
