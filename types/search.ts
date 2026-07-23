import type { RestaurantIndexEntry } from "@/types/restaurant";

// Shared Global Search result shape. Restaurant kind only for now;
// "menu-item" and "builder-ingredient" kinds are added in Slice 3.
export type SearchResult = {
  kind: "restaurant";
  restaurant: RestaurantIndexEntry;
};
