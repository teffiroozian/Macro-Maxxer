import Link from "next/link";
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
  if (!restaurantData) {
    return (
      <main style={{ maxWidth: 900, margin: "48px auto", padding: 16 }}>
        <Link
          href="/"
          style={{ textDecoration: "none", cursor: "pointer" }}
        >
          ← Back
        </Link>
        <h1 style={{ marginTop: 16 }}>Restaurant not found</h1>
      </main>
    );
  }

  return <RestaurantPageContent restaurantData={restaurantData} />;
}
