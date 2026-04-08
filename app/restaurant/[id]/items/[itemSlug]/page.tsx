import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/ItemRouteModal";
import { buildAddonMenuItems, getItemBySlug, getRestaurantData } from "@/lib/restaurants";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  const { id, itemSlug } = await params;
  const restaurant = await getRestaurantData(id);

  if (!restaurant) notFound();

  const routeItems = [...restaurant.items, ...buildAddonMenuItems(restaurant.id, restaurant.addons)];
  const item = getItemBySlug(routeItems, itemSlug);
  if (!item) notFound();

  return (
    <ItemRouteModal
      restaurantId={restaurant.id}
      restaurantPath={`/restaurant/${restaurant.id}`}
      item={item}
      menuItems={routeItems}
      addons={restaurant.addons}
      commonChanges={restaurant.commonChanges}
      ingredients={restaurant.ingredients}
      customizationRules={restaurant.customizationRules}
    />
  );
}
