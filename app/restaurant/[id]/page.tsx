import Link from "next/link";
import restaurants from "../../data/index.json";
import RestaurantView from "@/components/RestaurantView";
import RecentRestaurantTracker from "@/components/RecentRestaurantTracker";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { RestaurantSearchProvider } from "@/components/RestaurantSearchContext";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/CartPreviewDrawer";
import { getRestaurantData } from "@/lib/restaurants";

// recieves id from the url
// e.g. URL: /restaurant/chipotle => params.id = "chipotle"
export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // uses that id to find matching restaurant and info about it
    // basic info like: name, logo
    const restaurant = restaurants.find((r) => r.id === id);
    // uses the same id to load full restaurant menu data
    // full menu info: items, ingredients, addons
    const restaurantData = await getRestaurantData(id);

    if (!restaurant || !restaurantData) {
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

    return (
        <RestaurantSearchProvider>
            <RestaurantUiProvider>
                <div className="w-full pt-16 sm:pt-20 lg:pt-40">
                    <RecentRestaurantTracker restaurantId={restaurant.id} />
                    <ScrollToTopOnMount />

                    <main className="mx-auto w-full max-w-6xl px-3 pb-12 sm:px-4 lg:px-6">
                        <RestaurantView
                            restaurantId={restaurant.id}
                            restaurantName={restaurant.name}
                            restaurantLogo={restaurant.logo}
                            hasBuildYourOwn={restaurantData.hasBuildYourOwn}
                            items={restaurantData.items}
                            ingredients={restaurantData.ingredients}
                            addons={restaurantData.addons}
                            customizationRules={
                                restaurantData.customizationRules
                            }
                            builderConfig={restaurantData.builderConfig}
                        />
                    </main>
                </div>
                <CartPreviewDrawer />
            </RestaurantUiProvider>
        </RestaurantSearchProvider>
    );
}
