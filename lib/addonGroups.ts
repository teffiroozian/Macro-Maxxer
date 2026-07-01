import type { MenuItem, ResolvedAddonGroups, RestaurantAddonGroups } from "@/types/menu";

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
