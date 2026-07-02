import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/ItemRouteModal";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import { getItemBySlug, getRestaurantData } from "@/lib/restaurants";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  // recieves two params, one for restaurant one for item
  const { id, itemSlug } = await params;
  // loads full menu data
  const restaurant = await getRestaurantData(id);

  if (!restaurant) notFound();

  // finds specific item
  const item = getItemBySlug(restaurant.items, itemSlug);
  if (!item) notFound();

  const addons = resolveAddonMenuItems(restaurant.addonGroups, restaurant.items);

  return (
    <>
      <RestaurantPageContent restaurantData={restaurant} />
      <ItemRouteModal
        restaurantId={restaurant.id}
        restaurantPath={`/restaurant/${restaurant.id}`}
        item={item}
        menuItems={restaurant.items}
        addons={addons}
        ingredients={restaurant.ingredients}
        customizationRules={restaurant.customizationRules}
        closeBehavior="replace"
      />
    </>
  );
}
