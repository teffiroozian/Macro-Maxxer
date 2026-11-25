import { getCartItemImagePresentation, resolveCartItemMacroBreakdown } from "@/lib/cart/cartItemLookup";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import type { CartItem } from "@/types/cart";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";

// Each line's share of the order, with its own parts when it has any.
export function buildOrderBreakdown(items: CartItem[]): MacroBreakdownItem[] {
  return items.map((item) => {
    const times = <T extends { calories: number; protein: number; carbs: number; totalFat: number }>(entry: T) =>
      ({ ...entry, calories: entry.calories * item.quantity, protein: entry.protein * item.quantity, carbs: entry.carbs * item.quantity, totalFat: entry.totalFat * item.quantity });
    const { kind, entries } = resolveCartItemMacroBreakdown(item);
    const { calories, protein, carbs, totalFat } = times(item.nutritionPerItem);
    return { id: item.id, name: formatCartItemName(item), image: item.image, imagePresentation: getCartItemImagePresentation(item), calories, protein, carbs, totalFat, nestedKind: kind, nestedItems: entries.map(times) };
  });
}
