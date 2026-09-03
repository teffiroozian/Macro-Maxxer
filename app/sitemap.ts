import type { MetadataRoute } from "next";
import { getAllRestaurants } from "@/lib/restaurants";

const SITE_URL = "https://www.macromaxxer.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const restaurantPages = getAllRestaurants()
    .filter((restaurant) => !restaurant.isComingSoon)
    .map((restaurant) => ({
      url: `${SITE_URL}/restaurant/${restaurant.id}`,
      ...(restaurant.nutritionUpdatedAt
        ? { lastModified: restaurant.nutritionUpdatedAt }
        : {}),
    }));

  return [{ url: SITE_URL }, ...restaurantPages];
}
