import Link from "next/link";
import restaurants from "../../data/index.json";
import RestaurantHeader from "@/components/RestaurantHeader";
import RestaurantView from "@/components/RestaurantView";
import RecentRestaurantTracker from "@/components/RecentRestaurantTracker";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { RestaurantSearchProvider } from "@/components/RestaurantSearchContext";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/CartPreviewDrawer";
import { getRestaurantData } from "@/lib/restaurants";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const restaurant = restaurants.find((r) => r.id === id);
  const restaurantData = await getRestaurantData(id);

  if (!restaurant || !restaurantData) {
    return (
      <main style={{ maxWidth: 900, margin: "48px auto", padding: 16 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← Back
        </Link>
        <h1 style={{ marginTop: 16 }}>Restaurant not found</h1>
      </main>
    );
  }

  return (
    <RestaurantSearchProvider>
      <RestaurantUiProvider>
        <div className="w-full pt-14">
          <div id="restaurant-hero" className="mt-6">
            <RestaurantHeader
              name={restaurant.name}
              logo={restaurant.logo}
              restaurantSlug={restaurant.id}
            />
          </div>

          <RecentRestaurantTracker restaurantId={restaurant.id} />
          <ScrollToTopOnMount />

          <main className="mx-auto mt-6 w-full max-w-6xl px-6 pb-12">
            <RestaurantView
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              restaurantLogo={restaurant.logo}
              items={restaurantData.items}
              ingredients={restaurantData.ingredients}
              addons={restaurantData.addons}
              commonChanges={restaurantData.commonChanges}
            />
          </main>
        </div>
        <CartPreviewDrawer />
      </RestaurantUiProvider>
    </RestaurantSearchProvider>
  );
}
