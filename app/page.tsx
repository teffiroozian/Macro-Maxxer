import HeroSearchNav from "@/components/home/HeroSearchNav";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import RestaurantCarousel from "@/components/home/RestaurantCarousel";
import ProductPreviewCard from "@/components/home/ProductPreviewCard";
import ProductWalkthrough, { type WalkthroughReviewItem } from "@/components/home/ProductWalkthrough";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { getAllRestaurants, getRestaurantData, toItemSlug } from "@/lib/restaurants";

const restaurants = getAllRestaurants();

// See docs/homepage-visual-refresh-plan.md. Slice 2 replaces the Slice 1
// single-spotlight stand-in with the full Featured Restaurants carousel.
// Slice 3 adds the Product Walkthrough between it and the "See It In
// Action" preview below.
const liveRestaurants = restaurants.filter((restaurant) => !restaurant.isComingSoon);

// Real Chipotle menu/ingredient ids used to build the Slice 3 walkthrough
// previews. Kept separate from the raw nutrition data (data/restaurants/chipotle.json)
// so the curated selection is easy to find and change without touching menu data.
const WALKTHROUGH_FIND_ITEM_IDS = [
  "high-protein-high-fiber-bowl",
  "high-protein-low-calorie-bowl",
  "side-of-chicken-high-protein",
];
const WALKTHROUGH_BUILD_ITEM_ID = "high-protein-high-fiber-bowl";
const WALKTHROUGH_ADDON_IDS = ["guacamole", "queso-blanco"];
const WALKTHROUGH_REVIEW_ITEMS = [
  { id: "high-protein-high-fiber-bowl", quantity: 1 },
  { id: "side-of-chicken-high-protein", quantity: 1 },
];

export default async function Home() {
  const previewRestaurant = await getRestaurantData("chipotle");
  const previewItem = previewRestaurant?.items.find((item) => item.id === "high-protein-high-fiber-bowl");

  const walkthroughFindItems = WALKTHROUGH_FIND_ITEM_IDS.map((id) =>
    previewRestaurant?.items.find((item) => item.id === id)
  )
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      category: item.categories[0] ?? "",
      nutrition: item.nutrition,
    }));

  const walkthroughBuildItemSource = previewRestaurant?.items.find(
    (item) => item.id === WALKTHROUGH_BUILD_ITEM_ID
  );
  const walkthroughBuildItem = walkthroughBuildItemSource
    ? {
        id: walkthroughBuildItemSource.id,
        name: walkthroughBuildItemSource.name,
        image: walkthroughBuildItemSource.image,
        category: walkthroughBuildItemSource.categories[0] ?? "",
        nutrition: walkthroughBuildItemSource.nutrition,
      }
    : null;

  const walkthroughAddOns = WALKTHROUGH_ADDON_IDS.map((id) =>
    previewRestaurant?.ingredients.find((ingredient) => ingredient.id === id)
  )
    .filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient?.nutrition))
    .map((ingredient) => ({ id: ingredient.id, name: ingredient.name, nutrition: ingredient.nutrition }));

  const walkthroughReviewItems: WalkthroughReviewItem[] = WALKTHROUGH_REVIEW_ITEMS.map(({ id, quantity }) => {
    const item = previewRestaurant?.items.find((candidate) => candidate.id === id);
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      image: item.image,
      category: item.categories[0] ?? "",
      nutrition: item.nutrition,
      quantity,
    };
  }).filter((item): item is WalkthroughReviewItem => Boolean(item));

  const walkthroughCustomizeHref =
    previewRestaurant && walkthroughBuildItemSource
      ? `/restaurant/${previewRestaurant.id}/${toItemSlug(walkthroughBuildItemSource)}`
      : null;

  const canShowWalkthrough =
    previewRestaurant &&
    walkthroughFindItems.length === WALKTHROUGH_FIND_ITEM_IDS.length &&
    walkthroughBuildItem &&
    walkthroughCustomizeHref &&
    walkthroughAddOns.length === WALKTHROUGH_ADDON_IDS.length &&
    walkthroughReviewItems.length === WALKTHROUGH_REVIEW_ITEMS.length;

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

          {previewRestaurant && canShowWalkthrough && walkthroughBuildItem && walkthroughCustomizeHref ? (
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
              <HomeSectionHeading
                eyebrow="How It Works"
                heading="Build an Order That Fits Your Goals"
                description="Compare menus, customize your meal, and review the full macros before ordering."
              />

              <div className="mt-10">
                <ProductWalkthrough
                  restaurantName={previewRestaurant.name}
                  findItems={walkthroughFindItems}
                  buildItem={walkthroughBuildItem}
                  addOns={walkthroughAddOns}
                  reviewItems={walkthroughReviewItems}
                  findHref={`/restaurant/${previewRestaurant.id}`}
                  customizeHref={walkthroughCustomizeHref}
                  reviewHref="/cart"
                />
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
