import type { QuickAddEligibility } from "@/lib/search/quickAddEligibility";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Shared Global Search result shape.
export type SearchResult =
  | { kind: "restaurant"; restaurant: RestaurantIndexEntry }
  | {
      kind: "menu-item";
      item: MenuItem;
      restaurant: RestaurantIndexEntry;
      // Undefined only for throwaway "menu-item" literals built just to
      // record recent-search history (never rendered) — real, rendered
      // results always come from searchAllContent/useRecentMenuItems, which
      // always compute this. Row components must treat undefined as
      // ineligible (no Quick Add) rather than assume eligibility.
      quickAdd?: QuickAddEligibility;
    }
  | {
      kind: "builder-ingredient";
      ingredient: IngredientItem;
      restaurant: RestaurantIndexEntry;
      categoryLabel: string;
    };
