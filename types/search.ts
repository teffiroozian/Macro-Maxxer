import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Shared Global Search result shape.
export type SearchResult =
  | { kind: "restaurant"; restaurant: RestaurantIndexEntry }
  | { kind: "menu-item"; item: MenuItem; restaurant: RestaurantIndexEntry }
  | {
      kind: "builder-ingredient";
      ingredient: IngredientItem;
      restaurant: RestaurantIndexEntry;
      categoryLabel: string;
    };
