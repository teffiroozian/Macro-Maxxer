import type { MetadataRoute } from "next";
import { getAllRestaurants } from "@/lib/restaurants";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const restaurantPages = getAllRestaurants()
    .filter((restaurant) => !restaurant.isComingSoon)
    .map((restaurant) => ({
      url: `${SITE_URL}/restaurant/${restaurant.id}`,
      ...(restaurant.lastUpdated
        ? { lastModified: restaurant.lastUpdated }
        : {}),
    }));

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/privacy` },
    { url: `${SITE_URL}/terms` },
    ...restaurantPages,
  ];
}
