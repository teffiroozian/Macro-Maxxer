import type { ItemImagePresentation } from "@/types/menu";

// One nested row's contribution to its parent cart item's macros — resolved
// from real catalog nutrition (see resolveCartItemMacroBreakdown in
// lib/cart/cartItemLookup.ts), never a placeholder value. Doubles as a
// Chipotle-style build-your-own ingredient or a composite item's own
// component (a combo's side/drink, a sauce, an addon) — see
// MacroBreakdownItem.nestedKind for which one a given list represents.
export type MacroBreakdownEntry = {
  id: string;
  name: string;
  image?: string;
  imagePresentation?: ItemImagePresentation;
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
};

// What a MacroBreakdownItem's nested rows represent: "ingredients" for a
// fully build-your-own item (Chipotle, where the item has no single base
// recipe — it's built entirely from selected ingredients), or "items" for a
// composite/menu item (a combo's side/drink, "nuggets + sauce", etc. — each
// nested row is itself a distinct catalog item, not a raw ingredient pick).
export type MacroBreakdownNestedKind = "ingredients" | "items";

// Shared item shape for the Meal Details "Protein Score" and "Macro Split"
// sections (see SelectionSummaryShell in
// components/item-route-modal/SelectionSummaryPanels.tsx) — a superset of
// ProteinScoreDetails' own ProteinScoreDetailItem so the same list can back
// both detail modals instead of each screen building two separate lists.
// `nestedItems` is left undefined wherever that breakdown can't be resolved
// (a standard item with no customizations, etc.) — both detail modals simply
// omit their nested-breakdown control in that case.
export type MacroBreakdownItem = {
  id: string;
  name: string;
  image?: string;
  imagePresentation?: ItemImagePresentation;
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
  nestedKind?: MacroBreakdownNestedKind;
  nestedItems?: MacroBreakdownEntry[];
};
