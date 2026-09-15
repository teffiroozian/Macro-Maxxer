import type { RestaurantLogoBadgeShape } from "@/components/ui/RestaurantLogoBadge";

type RestaurantImagePresentation = {
  headerLogoShape?: RestaurantLogoBadgeShape;
  menuCardImageClassName?: string;
  itemDetailImageClassName?: string;
  itemThumbnailImageClassName?: string;
};

const RESTAURANT_IMAGE_PRESENTATION: Record<string, RestaurantImagePresentation> = {
  starbucks: {
    headerLogoShape: "circle",
    menuCardImageClassName: "object-contain scale-150",
    itemDetailImageClassName: "object-contain scale-150",
    itemThumbnailImageClassName: "object-contain scale-150",
  },
};

export function getRestaurantImagePresentation(restaurantId: string): RestaurantImagePresentation {
  return RESTAURANT_IMAGE_PRESENTATION[restaurantId] ?? {};
}

export function getRestaurantLogoShapeClassName(restaurantId: string) {
  return getRestaurantImagePresentation(restaurantId).headerLogoShape === "circle"
    ? "rounded-full"
    : "rounded-xl";
}
