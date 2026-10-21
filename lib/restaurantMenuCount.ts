import type { MenuItem } from "@/types/menu";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";

// One count per normalized browse item/parent, independent of how many
// variants, ingredients, internal lookup records, or ranking rows exist.
export function getCanonicalMenuItemCount(items: readonly MenuItem[]): number {
  return new Set(items.filter(isStandaloneMenuItem).map((item) => item.id)).size;
}
