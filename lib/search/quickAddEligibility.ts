import type { MenuItem } from "@/types/menu";

export type QuickAddEligibility =
  | { eligible: false }
  | { eligible: true; hasVariantChoice: boolean };

// Quick Add (Slice 9) eligibility is about whether THIS result already has a
// complete, safe default cart payload — not whether the item happens to
// carry optional add-ons, removable/swappable ingredients, or combo
// metadata. None of those are ever mandatory in this data model (no
// AddonGroup/ingredient-category rule marks anything "required" — see
// types/menu.ts), so their default state (nothing selected, no combo
// upsize) is itself a valid item to add. Excluding on their mere presence
// previously hid ordinary presets (e.g. Chick-fil-A's Hash Brown Scramble
// Bowl, which is combo-eligible via the legacy breakfast-category fallback
// purely as restaurant metadata) that are otherwise perfectly Quick-Add-able.
//
// The only things that structurally can't reach this function at all are
// individual build-your-own ingredients (a separate SearchResult "kind",
// always "Start a Build") and there is currently no generic/unconfigured
// builder-entry MenuItem in any restaurant's `items` catalog (Chipotle's
// build-your-own flow lives entirely in its separate `ingredients` catalog,
// never as a MenuItem) — so every "menu-item" result reaching here already
// has its own complete nutrition and can be added as-is.
export function resolveQuickAddEligibility(item: MenuItem): QuickAddEligibility {
  const hasVariantChoice = Boolean(
    item.variants &&
      item.variants.length > 1 &&
      !item.hideVariantSelector &&
      !item.disableVariantSelector
  );

  return { eligible: true, hasVariantChoice };
}
