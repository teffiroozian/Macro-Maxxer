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
  searchParams,
}: {
  params: Promise<{ id: string; itemSlug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const { id, itemSlug } = await params;
  const { variant } = await searchParams;
  const routeData = await getRestaurantItemRouteData(id, itemSlug, typeof variant === "string" ? variant : undefined);

  if (!routeData) notFound();

  const { restaurant, item, addons, initialVariantId } = routeData;

  return (
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
      closeBehavior="back"
      initialVariantId={initialVariantId}
    />
  );
}
