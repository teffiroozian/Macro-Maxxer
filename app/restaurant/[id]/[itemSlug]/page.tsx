import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import RestaurantPageSkeleton from "@/components/restaurant-view/RestaurantPageSkeleton";
import { getRestaurantItemRouteData } from "@/lib/restaurantItemRouteData";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  // recieves two params, one for restaurant one for item
  const { id, itemSlug } = await params;
  const { variant } = await searchParams;
  const routeData = await getRestaurantItemRouteData(id, itemSlug, typeof variant === "string" ? variant : undefined);

  if (!routeData) notFound();

  const { restaurant, item, addons, initialVariantId } = routeData;

  return (
    <Suspense fallback={<RestaurantPageSkeleton />}>
      <RestaurantPageContent restaurantData={restaurant} />
      <ItemRouteModal
        key={`${item.id}:${initialVariantId ?? "default"}`}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        restaurantPath={`/restaurant/${restaurant.id}`}
        item={item}
        menuItems={restaurant.items}
        addons={addons}
        ingredients={restaurant.ingredients}
        customizationRules={restaurant.customizationRules}
        builderConfig={restaurant.builderConfig}
        closeBehavior="replace"
        initialVariantId={initialVariantId}
      />
    </Suspense>
  );
}
