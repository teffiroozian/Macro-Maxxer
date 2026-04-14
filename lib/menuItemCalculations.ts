import { Drumstick, EggFried, Salad, Sandwich, Shell } from "lucide-react";
import type {
  AddonOption,
  CommonChange,
  MenuItem,
} from "@/types/menu";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";

export function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

export function isChickfilaBreakfastItem(restaurantId: string, menuItem: MenuItem) {
  if (restaurantId !== "chickfila") return false;
  return menuItem.categories.some((category) => normalizeCategory(category) === "breakfast");
}

export function isWaffleFries(menuItem: MenuItem) {
  const normalizedName = menuItem.name.trim().toLowerCase();
  return menuItem.id === "chick_fil_a_waffle_potato_fries" || normalizedName.includes("waffle potato fries");
}

export function isHashBrowns(menuItem: MenuItem) {
  return menuItem.id === "hash-browns";
}

export function compareByDefaultOrder(left: MenuItem, right: MenuItem) {
  const leftOrder = left.defaultOrder ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.defaultOrder ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.name.localeCompare(right.name);
}

export function sortComboSides(sides: MenuItem[], prioritizeHashBrowns: boolean) {
  if (!prioritizeHashBrowns) {
    return [...sides].sort(compareByDefaultOrder);
  }

  return [...sides].sort((left, right) => {
    if (isHashBrowns(left) && !isHashBrowns(right)) return -1;
    if (!isHashBrowns(left) && isHashBrowns(right)) return 1;
    return compareByDefaultOrder(left, right);
  });
}

export function resolveJustItemLabel(item: MenuItem) {
  const categories = (item.categories ?? []).map((category) => normalizeCategory(category));
  if (categories.some((category) => category.includes("sandwich"))) return "Sandwich Only";
  if (categories.some((category) => category.includes("salad"))) return "Salad Only";
  if (categories.some((category) => category.includes("wrap"))) return "Wrap Only";
  if (categories.some((category) => category.includes("nugget") || category.includes("chicken"))) return "Chicken Only";
  if (categories.some((category) => category.includes("breakfast"))) return "Breakfast Only";
  return "Item Only";
}

export function resolveJustItemIcon(item: MenuItem) {
  const categories = (item.categories ?? []).map((category) => normalizeCategory(category));
  if (categories.some((category) => category.includes("sandwich"))) return Sandwich;
  if (categories.some((category) => category.includes("salad"))) return Salad;
  if (categories.some((category) => category.includes("wrap"))) return Shell;
  if (categories.some((category) => category.includes("nugget") || category.includes("chicken"))) return Drumstick;
  if (categories.some((category) => category.includes("breakfast"))) return EggFried;
  return Sandwich;
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

export function addonFat(addon?: AddonOption) {
  return addon?.totalFat ?? 0;
}

export function menuItemFat(item?: MenuItem) {
  return item?.nutrition.totalFat ?? 0;
}

export function menuItemFatWithFallback(item?: MenuItem) {
  return menuItemFat(item);
}

export function deltaFat(change: CommonChange) {
  return change.delta.totalFat ?? 0;
}

export function getDefaultVariantId(item?: MenuItem) {
  if (!item) return undefined;
  const variants = item.variants ?? [];
  if (variants.length === 0) return undefined;
  if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
    return item.defaultVariantId;
  }
  const flaggedDefault = variants.find((variant) => variant.isDefault);
  return flaggedDefault?.id ?? variants[0]?.id;
}

export function getApplicableCommonChanges(item: MenuItem, commonChanges?: CommonChange[]) {
  if (!commonChanges || commonChanges.length === 0) return [];
  const itemCategories = new Set((item.categories ?? []).map((category) => normalizeCategory(category)));

  return commonChanges.filter((change) => {
    const categories = change.appliesTo?.categories;
    if (!categories || categories.length === 0) return false;
    return categories.some((category) => itemCategories.has(normalizeCategory(category)));
  });
}

export function getDefaultIngredientCounts(resolvedIngredients: ResolvedPanelIngredient[]) {
  return resolvedIngredients.reduce<Record<string, number>>((acc, ingredient) => {
    acc[ingredient.id] = ingredient.defaultCount;
    return acc;
  }, {});
}
