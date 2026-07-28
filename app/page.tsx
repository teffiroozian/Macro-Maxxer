import HeroSearchNav from "@/components/home/HeroSearchNav";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import FeaturedRestaurantCard from "@/components/home/FeaturedRestaurantCard";
import RestaurantQuickLinkChip from "@/components/home/RestaurantQuickLinkChip";
import ProductPreviewCard from "@/components/home/ProductPreviewCard";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { getAllRestaurants, getRestaurantData, toItemSlug } from "@/lib/restaurants";

const restaurants = getAllRestaurants();

// Slice 1 prototype: establishes the homepage's visual language with one
// representative restaurant and one representative menu item rather than
// the full Featured Restaurants (Slice 2) and Product Walkthrough (Slice 3)
// sections. See docs/homepage-visual-refresh-plan.md.
const liveRestaurants = restaurants.filter((restaurant) => !restaurant.isComingSoon);
const spotlightRestaurant = liveRestaurants.find((restaurant) => restaurant.id === "chickfila") ?? liveRestaurants[0];
const secondaryRestaurant = liveRestaurants.find((restaurant) => restaurant.id !== spotlightRestaurant?.id);

export default async function Home() {
  const previewRestaurant = await getRestaurantData("chipotle");
  const previewItem = previewRestaurant?.items.find((item) => item.id === "high-protein-high-fiber-bowl");

  return (
    <RestaurantUiProvider>
      <div className="relative">
        <HomeBackdrop />

        <HeroSearchNav restaurants={restaurants} />

        <main className="relative">
          {spotlightRestaurant ? (
            <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-32 lg:pb-36">
              <div className="mx-auto max-w-xl text-center">
                <SectionEyebrow className="text-xs sm:text-sm">Featured Restaurants</SectionEyebrow>
                <h2 className="font-heading mt-3 text-3xl font-bold text-neutral-900 sm:text-4xl">
                  Jump Straight to the Menu
                </h2>
                <p className="mt-3 text-base text-neutral-600">
                  Every supported restaurant comes with a full menu, real nutrition data, and an order builder.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-600">
                  {/* "success" semantic role — an available/live status. */}
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  {liveRestaurants.length} restaurants live now
                </span>
              </div>

              <div className="relative mx-auto mt-10 w-full max-w-3xl sm:mb-8">
                <FeaturedRestaurantCard restaurant={spotlightRestaurant} />

                {secondaryRestaurant ? (
                  <div className="mt-4 flex justify-center sm:absolute sm:-bottom-7 sm:-right-6 sm:mt-0 sm:w-64 sm:justify-end">
                    <RestaurantQuickLinkChip
                      restaurant={secondaryRestaurant}
                      className="w-full shadow-md sm:shadow-[0_16px_32px_rgba(15,23,42,0.14)]"
                    />
                  </div>
                ) : null}
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
                <div className="mx-auto max-w-xl text-center">
                  <SectionEyebrow className="text-xs sm:text-sm">See It In Action</SectionEyebrow>
                  <h2 className="font-heading mt-3 text-3xl font-bold text-neutral-900 sm:text-4xl">
                    Real Menu Data, Real Macros
                  </h2>
                  <p className="mt-3 text-base text-neutral-600">
                    Every item shows calories, protein, carbs, and fat up front — before you customize or add it to your order.
                  </p>
                </div>

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
