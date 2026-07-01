import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/ItemRouteModal";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import { getItemBySlug, getRestaurantData, getRouteItems } from "@/lib/restaurants";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  const { id, itemSlug } = await params;
  const restaurant = await getRestaurantData(id);

  if (!restaurant) notFound();

  const routeItems = getRouteItems(restaurant);
  const item = getItemBySlug(routeItems, itemSlug);
  if (!item) notFound();

  return (
    <>
      <RestaurantPageContent restaurantData={restaurant} />
      <ItemRouteModal
        restaurantId={restaurant.id}
        restaurantPath={`/restaurant/${restaurant.id}`}
        item={item}
        menuItems={routeItems}
        addons={restaurant.addons}
        ingredients={restaurant.ingredients}
        customizationRules={restaurant.customizationRules}
        closeBehavior="replace"
      />
    </>
  );
}
