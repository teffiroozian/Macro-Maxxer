import type { RestaurantIndexEntry } from "@/types/restaurant";
import { getSearchTerms, matchesText } from "@/lib/search/matchText";
import { rankByName } from "@/lib/search/rankResults";

// Restaurant-name search: tokenized AND-match decides what matches,
// then exact/starts-with/contains ranking decides the order (plan §4a).
export function searchRestaurants(
  restaurants: RestaurantIndexEntry[],
  query: string
): RestaurantIndexEntry[] {
  const terms = getSearchTerms(query);
  if (!terms.length) {
    return [];
  }

  const matches = restaurants.filter(
    (restaurant) => !restaurant.isComingSoon && matchesText(restaurant.name, terms)
  );
  return rankByName(matches, query, (restaurant) => restaurant.name);
}
