import { getAllRestaurants } from "@/lib/restaurants";

export function getStaticRestaurantParams() {
  return getAllRestaurants()
    .filter((restaurant) => !restaurant.isComingSoon)
    .map((restaurant) => ({ id: restaurant.id }));
}
