import Link from "next/link";
import restaurants from "../../data/index.json";
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
  const isChipotleBuild =
    restaurant?.id === "chipotle" && Boolean(restaurantData?.isBuildYourOwn);

  if (!restaurant || !restaurantData) {
    return (
      <main style={{ maxWidth: 900, margin: "48px auto", padding: 16 }}>
        <Link href="/" style={{ textDecoration: "none", cursor: "pointer" }}>
          ← Back
        </Link>
        <h1 style={{ marginTop: 16 }}>Restaurant not found</h1>
      </main>
    );
  }

  return (
    <RestaurantSearchProvider>
      <RestaurantUiProvider>
        <div className={`w-full ${isChipotleBuild ? "pt-20" : "pt-40"}`}>
          <RecentRestaurantTracker restaurantId={restaurant.id} />
          <ScrollToTopOnMount />

          <main className="mx-auto w-full max-w-6xl px-6 pb-12">
            <RestaurantView
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              restaurantLogo={restaurant.logo}
              isBuildYourOwn={restaurantData.isBuildYourOwn}
              items={restaurantData.items}
              ingredients={restaurantData.ingredients}
              addons={restaurantData.addons}
              commonChanges={restaurantData.commonChanges}
              customizationRules={restaurantData.customizationRules}
            />
          </main>
        </div>
        <CartPreviewDrawer />
      </RestaurantUiProvider>
    </RestaurantSearchProvider>
  );
}
