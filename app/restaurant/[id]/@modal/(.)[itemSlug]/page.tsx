import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { getRestaurantItemRouteData } from "@/lib/restaurantItemRouteData";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ItemModalPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  const { id, itemSlug } = await params;
  const routeData = await getRestaurantItemRouteData(id, itemSlug);

  if (!routeData) notFound();

  const { restaurant, item, addons, initialVariantId } = routeData;

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
      closeBehavior="back"
      initialVariantId={initialVariantId}
    />
  );
}
