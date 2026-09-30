import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import { getRestaurantData } from "@/lib/restaurants";
import { getStaticRestaurantParams } from "@/lib/staticRouteParams";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

type RestaurantPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return getStaticRestaurantParams();
}

export async function generateMetadata({
  searchParams,
}: RestaurantPageProps): Promise<Metadata> {
  if (IS_CAPACITOR_BUILD) return {};

  const query = await searchParams;
  if (Object.keys(query).length === 0) return {};

  return {
    robots: {
      index: false,
      follow: true,
    },
  };
}

// recieves id from the url
// e.g. URL: /restaurant/chipotle => params.id = "chipotle"
export default async function RestaurantPage({
  params,
}: RestaurantPageProps) {
  const { id } = await params;

  // uses that id to load restaurant details and full menu data
  const restaurantData = await getRestaurantData(id);

  // checks if the data exists for the url
  if (!restaurantData || restaurantData.isComingSoon) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <RestaurantPageContent restaurantData={restaurantData} />
    </Suspense>
  );
}
