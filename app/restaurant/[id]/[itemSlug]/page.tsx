import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import { getRestaurantItemRouteData } from "@/lib/restaurantItemRouteData";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
}) {
  // recieves two params, one for restaurant one for item
  const { id, itemSlug } = await params;
  const routeData = await getRestaurantItemRouteData(id, itemSlug);

  if (!routeData) notFound();

  const { restaurant, item, addons, initialVariantId } = routeData;

  return (
    <>
      <RestaurantPageContent restaurantData={restaurant} />
      <ItemRouteModal
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantPath={`/restaurant/${restaurant.id}`}
        item={item}
        menuItems={restaurant.items}
        addons={addons}
        ingredients={restaurant.ingredients}
        customizationRules={restaurant.customizationRules}
        closeBehavior="replace"
        initialVariantId={initialVariantId}
      />
    </>
  );
}
