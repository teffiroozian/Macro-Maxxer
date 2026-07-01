import type { MenuItem, RestaurantAddonGroups } from "@/types/menu";

export type AddonMenuItemsByRef = Record<string, MenuItem[]>;

export function resolveAddonMenuItems(
  addonGroups: RestaurantAddonGroups | undefined,
  menuItems: MenuItem[] | undefined
): AddonMenuItemsByRef {
  const itemLookup = new Map((menuItems ?? []).map((item) => [item.id, item]));

  return Object.fromEntries(
    Object.entries(addonGroups ?? {}).map(([ref, group]) => [
      ref,
      group.itemIds
        .map((itemId) => itemLookup.get(itemId))
        .filter((item): item is MenuItem => Boolean(item?.addonEligible)),
    ])
  );
}
