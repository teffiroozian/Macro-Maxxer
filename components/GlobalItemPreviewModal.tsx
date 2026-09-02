"use client";

import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";

export default function GlobalItemPreviewModal() {
  const { previewState, closePreview } = useGlobalItemPreview();

  if (!previewState) {
    return null;
  }

  const { restaurant, item, addons } = previewState;

  return (
    <ItemRouteModal
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantPath={`/restaurant/${restaurant.id}`}
      item={item}
      menuItems={restaurant.items}
      addons={addons}
      ingredients={restaurant.ingredients}
      customizationRules={restaurant.customizationRules}
      closeBehavior="local"
      onClose={closePreview}
    />
  );
}
