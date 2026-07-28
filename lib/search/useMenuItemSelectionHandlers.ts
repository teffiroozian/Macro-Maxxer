"use client";

import { useRouter } from "next/navigation";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import { toItemSlug } from "@/lib/restaurants";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Shared "select a menu item" / "start a build" behavior for every Global
// Search surface (nav dropdown + mobile overlay, homepage hero) — the two
// previously had independent copies of this exact logic (see Slice 6 notes
// in docs/features/global-search-plan.md), which meant the same bug had to
// be fixed twice. The only things that differ per surface are how it closes
// itself afterward and whether it's already on the item's own restaurant
// page (never true on the homepage), so those are the two parameters.
export function useMenuItemSelectionHandlers({
  addRecentMenuItem,
  currentRestaurantId,
  onAfterSelect,
}: {
  addRecentMenuItem: (result: ContentSearchResult) => void;
  currentRestaurantId: string | null;
  onAfterSelect: () => void;
}) {
  const router = useRouter();
  const { openPreview } = useGlobalItemPreview();

  const handleSelectMenuItem = (item: MenuItem, restaurant: RestaurantIndexEntry) => {
    addRecentMenuItem({ kind: "menu-item", item, restaurant });
    onAfterSelect();

    if (currentRestaurantId === restaurant.id) {
      // Already on this restaurant's page (menu, an entree-selection/builder
      // view, or another item's modal) — a same-restaurant push is a sibling
      // navigation, so Next's intercepted @modal route engages and layers
      // the item modal over the current page with proper router.back()
      // support.
      router.push(`/restaurant/${restaurant.id}/${toItemSlug(item)}`);
      return;
    }

    // Any other context (home, nav on an unrelated page, another
    // restaurant's page, cart, a different restaurant's builder) — pushing
    // to the item route here would navigate the user away from where they
    // started. Open the existing item modal locally instead, with no
    // navigation and no history entry, so closing it leaves the user
    // exactly where they were.
    void openPreview(restaurant.id, item);
  };

  const handleStartBuild = (ingredient: IngredientItem, restaurant: RestaurantIndexEntry, categoryLabel: string) => {
    addRecentMenuItem({ kind: "builder-ingredient", ingredient, restaurant, categoryLabel });
    onAfterSelect();
    // Explicitly request the ingredient/entree-selection view rather than
    // relying on the restaurant page's default-view behavior for
    // hasBuildYourOwn restaurants. Ingredient preselection stays deferred.
    router.push(`/restaurant/${restaurant.id}?view=ingredients`);
  };

  return { handleSelectMenuItem, handleStartBuild };
}
