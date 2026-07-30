import HeroSearchNav from "@/components/home/HeroSearchNav";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import RestaurantCarousel from "@/components/home/RestaurantCarousel";
import ProductPreviewCard from "@/components/home/ProductPreviewCard";
import ProductWalkthrough, {
  type WalkthroughBuildItem,
  type WalkthroughReviewItem,
} from "@/components/home/ProductWalkthrough";
import type { RestaurantData } from "@/types/restaurant";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import HomeSectionContainer, { HOME_VISUAL_WIDTH_CLASS } from "@/components/home/HomeSectionContainer";
import HomeFooter from "@/components/home/HomeFooter";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { getAllRestaurants, getRestaurantData, toItemSlug } from "@/lib/restaurants";
import { parseIncludedIngredientEntry } from "@/lib/itemIngredients";

const restaurants = getAllRestaurants();

// See docs/homepage-visual-refresh-plan.md. Slice 2 replaces the Slice 1
// single-spotlight stand-in with the full Featured Restaurants carousel.
// Slice 3 adds the Product Walkthrough between it and the "See It In
// Action" preview below.
const liveRestaurants = restaurants.filter((restaurant) => !restaurant.isComingSoon);

// Real Chipotle menu/ingredient ids used to build the Slice 3 walkthrough's
// Customize & Build / Review Your Order previews. Kept separate from the raw
// nutrition data (data/restaurants/chipotle.json) so the curated selection
// is easy to find and change without touching menu data.
//
// Two fully-customizable examples, each with its own real, distinct add-on
// set — "extra chicken + fajita veggies" reads as a protein/veggie-forward
// customization, distinct from the first item's "guac + queso" flavor-add
// customization.
const WALKTHROUGH_BUILD_ITEMS: Array<{ id: string; addOnIds: string[] }> = [
  { id: "high-protein-high-fiber-bowl", addOnIds: ["guacamole", "queso-blanco"] },
  { id: "high-protein-low-calorie-bowl", addOnIds: ["chicken", "fajita-veggies"] },
];
const WALKTHROUGH_REVIEW_ITEMS = [
  { id: "high-protein-high-fiber-bowl", quantity: 1 },
  { id: "side-of-chicken-high-protein", quantity: 1 },
];

// Builds one Customize & Build example: the real menu item plus its own
// resolved add-ons (each add-on must resolve to real ingredient nutrition,
// or the whole example is dropped via the `null` return below).
function resolveWalkthroughBuildItem(
  restaurant: RestaurantData | null,
  spec: { id: string; addOnIds: string[] }
): WalkthroughBuildItem | null {
  const item = restaurant?.items.find((candidate) => candidate.id === spec.id);
  if (!item) return null;

  const addOns = spec.addOnIds
    .map((addOnId) => restaurant?.ingredients.find((ingredient) => ingredient.id === addOnId))
    .filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient?.nutrition))
    .map((ingredient) => ({ id: ingredient.id, name: ingredient.name, nutrition: ingredient.nutrition }));
  if (addOns.length !== spec.addOnIds.length) return null;

  return {
    id: item.id,
    name: item.name,
    image: item.image,
    category: item.categories[0] ?? "",
    nutrition: item.nutrition,
    addOns,
  };
}

// The Find & Compare step draws from Chick-fil-A instead — chosen so each of
// its three ranking methods (highest protein, lowest calories, best protein
// score) surfaces a different top item:
// - Cool Wrap: highest protein (43g), but the highest calories of the three
//   and the weakest protein score, so it never wins the other two rankings.
// - Chick-n-Strips: best protein score (~9.4g protein per 100 cal), roughly
//   in the middle on both raw calories and protein.
// - Chicken Noodle Soup: lowest calories (190), but the lowest protein and
//   weakest protein score, so it never wins the other two rankings either.
const WALKTHROUGH_FIND_ITEM_IDS = [
  "chick_fil_a_cool_wrap",
  "chick_fil_a_chick_n_strips",
  "chicken_noodle_soup",
];

export default async function Home() {
  const previewRestaurant = await getRestaurantData("chipotle");
  const walkthroughFindRestaurant = await getRestaurantData("chickfila");
  const previewItem = previewRestaurant?.items.find((item) => item.id === "high-protein-high-fiber-bowl");
  const footerRestaurantHref = liveRestaurants[0] ? `/restaurant/${liveRestaurants[0].id}` : "/";

  const previewIngredientNames = (previewItem?.ingredients ?? [])
    .map((entry) => parseIncludedIngredientEntry(entry)?.ingredientId)
    .map((id) => previewRestaurant?.ingredients?.find((ingredient) => ingredient.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const previewItemDescription =
    previewIngredientNames.length >= 3
      ? `${previewIngredientNames.slice(0, 3).join(", ")} in a fiber-forward bowl.`
      : undefined;

  const walkthroughFindItems = WALKTHROUGH_FIND_ITEM_IDS.map((id) =>
    walkthroughFindRestaurant?.items.find((item) => item.id === id)
  )
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      category: item.categories[0] ?? "",
      nutrition: item.nutrition,
    }));

  // The first spec's real item (not just its constructed WalkthroughBuildItem)
  // is still needed below for `toItemSlug`, which wants the raw MenuItem.
  const walkthroughBuildItemSource = previewRestaurant?.items.find(
    (item) => item.id === WALKTHROUGH_BUILD_ITEMS[0].id
  );
  const [walkthroughBuildItemA, walkthroughBuildItemB] = WALKTHROUGH_BUILD_ITEMS.map((spec) =>
    resolveWalkthroughBuildItem(previewRestaurant, spec)
  );
  const walkthroughBuildItems: [WalkthroughBuildItem, WalkthroughBuildItem] | null =
    walkthroughBuildItemA && walkthroughBuildItemB ? [walkthroughBuildItemA, walkthroughBuildItemB] : null;

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
    walkthroughFindRestaurant &&
    walkthroughFindItems.length === WALKTHROUGH_FIND_ITEM_IDS.length &&
    walkthroughBuildItems &&
    walkthroughCustomizeHref &&
    walkthroughReviewItems.length === WALKTHROUGH_REVIEW_ITEMS.length;

  return (
    <RestaurantUiProvider>
      <div className="relative">
        <HomeBackdrop />

        <HeroSearchNav restaurants={restaurants} />

        <main className="relative">
          {liveRestaurants.length > 0 ? (
            <HomeSectionContainer className="pb-16 pt-4 sm:pb-20 lg:pb-24">
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

              <div className={`mx-auto mt-10 w-full ${HOME_VISUAL_WIDTH_CLASS}`}>
                <RestaurantCarousel restaurants={liveRestaurants} />
              </div>
            </HomeSectionContainer>
          ) : null}

          {previewRestaurant && walkthroughFindRestaurant && canShowWalkthrough && walkthroughBuildItems && walkthroughCustomizeHref ? (
            <div className="relative">
              {/* Section-transition band: a soft green tint (distinct from
                  Menu-Item Discovery's neutral band below) so the page reads
                  as connected rather than every section repeating the exact
                  same treatment. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-100/80 to-transparent"
              />

              <HomeSectionContainer className="py-16 sm:py-20 lg:py-24">
                <HomeSectionHeading
                  eyebrow="How It Works"
                  heading="Build an Order That Fits Your Goals"
                  description="Compare menus, customize your meal, and review the full macros before ordering."
                />

                <div className="mt-10">
                  <ProductWalkthrough
                    restaurantName={previewRestaurant.name}
                    findRestaurantName={walkthroughFindRestaurant.name}
                    findItems={walkthroughFindItems}
                    buildItems={walkthroughBuildItems}
                    reviewItems={walkthroughReviewItems}
                    findHref={`/restaurant/${walkthroughFindRestaurant.id}`}
                    customizeHref={walkthroughCustomizeHref}
                    reviewHref="/cart"
                  />
                </div>
              </HomeSectionContainer>
            </div>
          ) : null}

          {previewRestaurant && previewItem ? (
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-gradient-to-b from-transparent via-neutral-50/80 to-transparent"
              />

              <HomeSectionContainer className="py-20 sm:py-24 lg:py-28">
                <HomeSectionHeading
                  eyebrow="See It In Action"
                  heading="Real Menu Data, Real Macros"
                  description="Every item shows calories, protein, carbs, and fat up front — before you customize or add it to your order."
                />

                <div className={`mx-auto mt-10 w-full ${HOME_VISUAL_WIDTH_CLASS}`}>
                  <ProductPreviewCard
                    restaurantName={previewRestaurant.name}
                    restaurantLogo={previewRestaurant.logo}
                    itemName={previewItem.name}
                    itemImage={previewItem.image}
                    itemDescription={previewItemDescription}
                    nutrition={previewItem.nutrition}
                    href={`/restaurant/${previewRestaurant.id}/${toItemSlug(previewItem)}`}
                  />
                </div>
              </HomeSectionContainer>
            </div>
          ) : null}
        </main>

        <HomeFooter primaryRestaurantHref={footerRestaurantHref} />
      </div>

      <CartPreviewDrawer />
    </RestaurantUiProvider>
  );
}
