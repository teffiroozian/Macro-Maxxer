import { Drumstick, EggFried, Salad, Sandwich, Shell } from "lucide-react";
import type { MenuItem } from "@/types/menu";
import { compareByDefaultOrder, normalizeCategory } from "@/lib/menuItemCalculations";

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
  if (categories.some((category) => category.includes("chicken"))) return "Chicken Only";
  if (categories.some((category) => category.includes("breakfast"))) return "Breakfast Only";
  return "Item Only";
}

export function resolveJustItemIcon(item: MenuItem) {
  const categories = (item.categories ?? []).map((category) => normalizeCategory(category));
  if (categories.some((category) => category.includes("sandwich"))) return Sandwich;
  if (categories.some((category) => category.includes("salad"))) return Salad;
  if (categories.some((category) => category.includes("wrap"))) return Shell;
  if (categories.some((category) => category.includes("chicken"))) return Drumstick;
  if (categories.some((category) => category.includes("breakfast"))) return EggFried;
  return Sandwich;
}
