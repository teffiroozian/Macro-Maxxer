import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/ItemRouteModal";
import { getItemBySlug, getRestaurantData } from "@/lib/restaurants";

export default async function ItemModalPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  const { id, itemSlug } = await params;
  const restaurant = await getRestaurantData(id);

  if (!restaurant) notFound();

  const item = getItemBySlug(restaurant.items, itemSlug);
  if (!item) notFound();

  return (
    <ItemRouteModal
      restaurantId={restaurant.id}
      restaurantPath={`/restaurant/${restaurant.id}`}
      item={item}
      addons={restaurant.addons}
      commonChanges={restaurant.commonChanges}
      ingredients={restaurant.ingredients}
    />
  );
}
