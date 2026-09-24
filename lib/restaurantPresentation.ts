import type { ItemImagePresentation } from "@/types/menu";

type RestaurantImagePresentation = {
  menuCardImageClassName?: string;
  itemDetailImageClassName?: string;
  itemThumbnailImageClassName?: string;
  // Default background for the image container behind the image, wherever
  // this restaurant's item images appear. An item's own
  // imagePresentation.backgroundColor (types/menu.ts) overrides this.
  imageBackgroundColor?: string;
  // Same restaurant-level default as the fields above, expressed as a
  // structured ItemImagePresentation instead of a raw className — for
  // contexts that can only carry one presentation value per item (e.g. a
  // cross-restaurant cart/meal-breakdown list, where there's no single
  // shared fallbackClassName that's correct for every item) rather than a
  // separate fallbackClassName/fallbackBackgroundColor pair supplied by the
  // caller. Kept in sync with the fields above by hand since there's only
  // ever been the one restaurant override so far.
  itemImagePresentation?: ItemImagePresentation;
};

const RESTAURANT_IMAGE_PRESENTATION: Record<string, RestaurantImagePresentation> = {
  starbucks: {
    menuCardImageClassName: "object-contain scale-150",
    itemDetailImageClassName: "object-contain scale-150",
    itemThumbnailImageClassName: "object-contain scale-150",
    // Blends contained product photography into the surrounding image area
    // instead of showing gray side gutters.
    imageBackgroundColor: "#1e3932",
    itemImagePresentation: { fit: "contain", scale: 1.5, backgroundColor: "#1e3932" },
  },
};

export function getRestaurantImagePresentation(restaurantId: string): RestaurantImagePresentation {
  return RESTAURANT_IMAGE_PRESENTATION[restaurantId] ?? {};
}

// Structured equivalent of getRestaurantImagePresentation's className-based
// fields — see itemImagePresentation above for why this exists as a
// separate accessor.
export function getRestaurantItemImagePresentation(restaurantId: string): ItemImagePresentation | undefined {
  return RESTAURANT_IMAGE_PRESENTATION[restaurantId]?.itemImagePresentation;
}

export function getRestaurantLogoShapeClassName() {
  return "rounded-full";
}
