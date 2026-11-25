import { selectOgFeatured } from "@/lib/og/restaurant";
import { getRestaurantData } from "@/lib/restaurants";
import type { ItemImagePresentation } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export type HomeExploreSpot = { id: string; name: string; logo: string; image: string; imagePresentation?: ItemImagePresentation };

// Builder menus have no regular item photo, only ingredient cut-outs.
const EDITORIAL_PHOTOS: Record<string, string> = {
  chipotle: "/restaurants/chipotle/menu/high-protein/high-protein-taco.jpg",
};

/** One representative item per live restaurant. */
export async function getHomeExploreSpots(restaurants: RestaurantIndexEntry[]): Promise<HomeExploreSpot[]> {
  const spots = await Promise.all(restaurants.filter((r) => !r.isComingSoon).map(async (restaurant): Promise<HomeExploreSpot[]> => {
    const base = { id: restaurant.id, name: restaurant.name, logo: restaurant.logo };
    const photo = EDITORIAL_PHOTOS[restaurant.id];
    if (photo) return [{ ...base, image: photo }];
    const data = await getRestaurantData(restaurant.id);
    const featured = data ? selectOgFeatured(data) : undefined;
    return featured?.image ? [{ ...base, image: featured.image, imagePresentation: "imagePresentation" in featured.item ? featured.item.imagePresentation : undefined }] : [];
  }));
  return spots.flat();
}
