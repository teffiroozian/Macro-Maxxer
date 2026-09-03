import type { Metadata } from "next";
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
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import {
  SITE_DESCRIPTION,
  SITE_LOGO_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import {
  CHIPOTLE_HOMEPAGE_EDITORIAL,
  type ChipotleHomepageRecordRef,
} from "@/data/restaurants/chipotle-homepage-editorial";

const restaurants = getAllRestaurants();

const webApplicationStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  image: SITE_LOGO_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

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
function findEditorialRecord<T extends { id: string }>(
  records: readonly T[] | undefined,
  ref: ChipotleHomepageRecordRef,
) {
  return records?.find(
    (record) =>
      record.id === ref.id || record.id === ref.legacyRuntimeId,
  );
}

// Builds one Customize & Build example: the real menu item plus its own
// resolved add-ons (each add-on must resolve to real ingredient nutrition,
// or the whole example is dropped via the `null` return below).
function resolveWalkthroughBuildItem(
  restaurant: RestaurantData | null,
  spec: (typeof CHIPOTLE_HOMEPAGE_EDITORIAL.buildItems)[number]
): WalkthroughBuildItem | null {
  const item = findEditorialRecord(restaurant?.items, spec.item);
  if (!item) return null;

  const addOns = spec.addOns
    .map((addOnRef) => findEditorialRecord(restaurant?.ingredients, addOnRef))
    .flatMap((ingredient) => {
      if (!ingredient) return [];
      const nutrition = resolveEffectiveIngredientNutrition(ingredient);
      return nutrition
        ? [{ id: ingredient.id, name: ingredient.name, nutrition }]
        : [];
    });
  if (addOns.length !== spec.addOns.length) return null;

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
// IDs are from the generated Chick-fil-A dataset (data/generated/chick-fil-a/restaurant.json),
// matched by exact nutrition identity, not the old production dataset's IDs:
// cfa-item-1004641 = Chick-fil-A Cool Wrap®; cfa-group-100361 = Chick-fil-A
// Chick-n-Strips® (variant container, defaults to the 3 ct variant, same as
// before); cfa-group-100375 = Chicken Noodle Soup (variant container,
// defaults to the Cup variant, same as before).
const WALKTHROUGH_FIND_ITEM_IDS = [
  "cfa-item-1004641",
  "cfa-group-100361",
  "cfa-group-100375",
];

export default async function Home() {
  const previewRestaurant = await getRestaurantData("chipotle");
  const walkthroughFindRestaurant = await getRestaurantData("chickfila");
  const previewItem = findEditorialRecord(
    previewRestaurant?.items,
    CHIPOTLE_HOMEPAGE_EDITORIAL.previewItem,
  );
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
    (item) =>
      item.id === CHIPOTLE_HOMEPAGE_EDITORIAL.buildItems[0].item.id ||
      item.id ===
        CHIPOTLE_HOMEPAGE_EDITORIAL.buildItems[0].item.legacyRuntimeId,
  );
  const [walkthroughBuildItemA, walkthroughBuildItemB] = CHIPOTLE_HOMEPAGE_EDITORIAL.buildItems.map((spec) =>
    resolveWalkthroughBuildItem(previewRestaurant, spec)
  );
  const walkthroughBuildItems: [WalkthroughBuildItem, WalkthroughBuildItem] | null =
    walkthroughBuildItemA && walkthroughBuildItemB ? [walkthroughBuildItemA, walkthroughBuildItemB] : null;

  const walkthroughReviewItems: WalkthroughReviewItem[] = CHIPOTLE_HOMEPAGE_EDITORIAL.reviewItems.flatMap(({ item: itemRef, quantity }) => {
    const item = findEditorialRecord(previewRestaurant?.items, itemRef);
    if (!item) return [];
    return [{
      id: item.id,
      name: item.name,
      image: item.image,
      category: item.categories[0] ?? "",
      nutrition: item.nutrition,
      quantity,
    }];
  });

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
    walkthroughReviewItems.length ===
      CHIPOTLE_HOMEPAGE_EDITORIAL.reviewItems.length;

  return (
    <RestaurantUiProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
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
