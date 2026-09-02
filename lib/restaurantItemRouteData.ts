import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getItemBySlug, getRestaurantData } from "@/lib/restaurants";
import { resolveChipotleLegacyItemRoute } from "@/lib/restaurantBuilders/chipotle/legacyCompatibility";

export async function getRestaurantItemRouteData(id: string, itemSlug: string) {
  const restaurant = await getRestaurantData(id);

  if (!restaurant || restaurant.isComingSoon) {
    return null;
  }

  let item = getItemBySlug(restaurant.items, itemSlug);
  let initialVariantId: string | undefined;
  if (id === "chipotle") {
    const legacyResolution = resolveChipotleLegacyItemRoute(itemSlug);
    if (legacyResolution.status === "resolved") {
      const presentationItem = restaurant.items.find((candidate) =>
        candidate.variants?.some(
          (variant) =>
            variant.canonicalItemId === legacyResolution.recordId &&
            (!legacyResolution.variantId ||
              variant.id === legacyResolution.variantId),
        ),
      );
      item =
        presentationItem ??
        restaurant.items.find(
          (candidate) => candidate.id === legacyResolution.recordId,
        ) ??
        item;
      initialVariantId = legacyResolution.variantId;
    }
  }
  if (!item) {
    return null;
  }

  const addons = resolveAddonMenuItems(restaurant.addonGroups, restaurant.items);

  return { restaurant, item, addons, initialVariantId };
}
