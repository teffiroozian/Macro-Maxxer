import { notFound } from "next/navigation";
import RestaurantPageContent from "@/components/RestaurantPageContent";
import { getRestaurantData } from "@/lib/restaurants";

// recieves id from the url
// e.g. URL: /restaurant/chipotle => params.id = "chipotle"
export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // uses that id to load restaurant details and full menu data
  const restaurantData = await getRestaurantData(id);

  // checks if the data exists for the url
  if (!restaurantData || restaurantData.isComingSoon) {
    notFound();
  }

  return <RestaurantPageContent restaurantData={restaurantData} />;
}
