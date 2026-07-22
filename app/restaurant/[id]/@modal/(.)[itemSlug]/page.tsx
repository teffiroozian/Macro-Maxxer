import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { getRestaurantItemRouteData } from "@/lib/restaurantItemRouteData";

export default async function ItemModalPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  const { id, itemSlug } = await params;
  const routeData = await getRestaurantItemRouteData(id, itemSlug);

  if (!routeData) notFound();

  const { restaurant, item, addons } = routeData;

  return (
    <ItemRouteModal
      restaurantId={restaurant.id}
      restaurantPath={`/restaurant/${restaurant.id}`}
      item={item}
      menuItems={restaurant.items}
      addons={addons}
      ingredients={restaurant.ingredients}
      customizationRules={restaurant.customizationRules}
      closeBehavior="back"
    />
  );
}
