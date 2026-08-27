import type { MenuItem, ResolvedAddonGroup, ResolvedAddonGroups, RestaurantAddonGroups } from "@/types/menu";

// Single source of truth for which addon-group refs use quantity-stepper
// selection (multiple picks with counts, backed by the flat
// selectedSauceCounts state) versus a single pick (backed by selectedAddons).
// Chipotle's literal "dressings" ref is the only true single pick; every
// other group — Chipotle's "sauces", any restaurant's tertiary sauce/condiment
// collections, and any other group whose label identifies it as a dressing
// choice (see ItemDetailsPanel's prepareAddonSections) — is quantity-based.
// Both the customization UI (ItemDetailsPanel) and cart
// serialization/restore (lib/menuItemCard/cartLabelUtils) must agree on this,
// or selections silently disappear when added to or restored from the cart.
export function addonGroupUsesQuantitySelection(ref: string) {
  return ref !== "dressings";
}

// Finds which resolved addon group a given addon belongs to, so quantity
// caps (see ItemRouteModal's sauce increment/decrement handlers) can be
// enforced per-group using that group's own official `maxPerItem` instead of
// one shared total across every addon group on the item.
export function resolveAddonGroupForAddon(
  addons: ResolvedAddonGroups | undefined,
  addon: MenuItem
): ResolvedAddonGroup | undefined {
  return Object.values(addons ?? {}).find((group) =>
    group.items.some((item) => item.name === addon.name)
  );
}

// Finds a quantity-selected addon by name across every quantity-mode group
// (not just one restaurant's literal "sauces" ref), for cart
// serialization/restore — see addonGroupUsesQuantitySelection.
export function findQuantitySelectionAddon(
  addons: ResolvedAddonGroups | undefined,
  name: string
): MenuItem | undefined {
  for (const [ref, group] of Object.entries(addons ?? {})) {
    if (!addonGroupUsesQuantitySelection(ref)) continue;
    const match = group.items.find((item) => item.name === name);
    if (match) return match;
  }
  return undefined;
}

export function resolveAddonMenuItems(
  addonGroups: RestaurantAddonGroups | undefined,
  menuItems: MenuItem[] | undefined
): ResolvedAddonGroups {
  const itemLookup = new Map((menuItems ?? []).map((item) => [item.id, item]));

  return Object.fromEntries(
    Object.entries(addonGroups ?? {}).map(([ref, group]) => [
      ref,
      {
        ...group,
        items: group.itemIds
          .map((itemId) => itemLookup.get(itemId))
          .filter((item): item is MenuItem => Boolean(item?.addonEligible)),
      },
    ])
  );
}
