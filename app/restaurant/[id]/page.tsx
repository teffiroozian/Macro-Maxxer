import Link from "next/link";
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

    // uses that id to load restaurant details and full menu data
    // info includes: id, name, logo, items, ingredients, addons
    const restaurantData = await getRestaurantData(id);

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

    return (
        <RestaurantSearchProvider>
            <RestaurantUiProvider>
                <div className="w-full pt-16 sm:pt-20 lg:pt-40">
                    <RecentRestaurantTracker restaurantId={restaurantData.id} />
                    <ScrollToTopOnMount />

                    <main className="mx-auto w-full max-w-6xl px-3 pb-12 sm:px-4 lg:px-6">
                        <RestaurantView
                            restaurantId={restaurantData.id}
                            restaurantName={restaurantData.name}
                            restaurantLogo={restaurantData.logo}
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
