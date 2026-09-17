type RestaurantImagePresentation = {
  menuCardImageClassName?: string;
  itemDetailImageClassName?: string;
  itemThumbnailImageClassName?: string;
  // Default background for the image container behind the image, wherever
  // this restaurant's item images appear. An item's own
  // imagePresentation.backgroundColor (types/menu.ts) overrides this.
  imageBackgroundColor?: string;
};

const RESTAURANT_IMAGE_PRESENTATION: Record<string, RestaurantImagePresentation> = {
  starbucks: {
    menuCardImageClassName: "object-contain scale-150",
    itemDetailImageClassName: "object-contain scale-150",
    itemThumbnailImageClassName: "object-contain scale-150",
    // Blends contained product photography into the surrounding image area
    // instead of showing gray side gutters.
    imageBackgroundColor: "#1e3932",
  },
};

export function getRestaurantImagePresentation(restaurantId: string): RestaurantImagePresentation {
  return RESTAURANT_IMAGE_PRESENTATION[restaurantId] ?? {};
}

export function getRestaurantLogoShapeClassName() {
  return "rounded-full";
}
