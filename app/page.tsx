import HeroSearchNav from "@/components/home/HeroSearchNav";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import RestaurantCarousel from "@/components/home/RestaurantCarousel";
import ProductPreviewCard from "@/components/home/ProductPreviewCard";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { getAllRestaurants, getRestaurantData, toItemSlug } from "@/lib/restaurants";

const restaurants = getAllRestaurants();

// See docs/homepage-visual-refresh-plan.md. Slice 2 replaces the Slice 1
// single-spotlight stand-in with the full Featured Restaurants carousel;
// the Product Walkthrough (Slice 3) preview below is still the Slice 1
// placeholder.
const liveRestaurants = restaurants.filter((restaurant) => !restaurant.isComingSoon);

export default async function Home() {
  const previewRestaurant = await getRestaurantData("chipotle");
  const previewItem = previewRestaurant?.items.find((item) => item.id === "high-protein-high-fiber-bowl");

  return (
    <RestaurantUiProvider>
      <div className="relative">
        <HomeBackdrop />

        <HeroSearchNav restaurants={restaurants} />

        <main className="relative">
          {liveRestaurants.length > 0 ? (
            <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-32 lg:pb-36">
              <HomeSectionHeading
                eyebrowVariant="pill"
                eyebrow={
                  <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-600">
                    {/* "success" semantic role — an available/live status. */}
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    {liveRestaurants.length} restaurant{liveRestaurants.length === 1 ? "" : "s"} live now
                  </span>
                }
                heading="Jump Straight to the Menu"
                description="Every supported restaurant comes with a full menu, real nutrition data, and an order builder."
              />

              <div className="mx-auto mt-10 w-full max-w-4xl">
                <RestaurantCarousel restaurants={liveRestaurants} />
              </div>
            </section>
          ) : null}

          {previewRestaurant && previewItem ? (
            <section className="relative py-20 sm:py-24 lg:py-28">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-gradient-to-b from-transparent via-neutral-50/80 to-transparent"
              />

              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <HomeSectionHeading
                  eyebrow="See It In Action"
                  heading="Real Menu Data, Real Macros"
                  description="Every item shows calories, protein, carbs, and fat up front — before you customize or add it to your order."
                />

                <div className="mx-auto mt-10 w-full max-w-3xl">
                  <ProductPreviewCard
                    restaurantName={previewRestaurant.name}
                    restaurantLogo={previewRestaurant.logo}
                    itemName={previewItem.name}
                    itemImage={previewItem.image}
                    nutrition={previewItem.nutrition}
                    href={`/restaurant/${previewRestaurant.id}/${toItemSlug(previewItem)}`}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <CartPreviewDrawer />
    </RestaurantUiProvider>
  );
}
