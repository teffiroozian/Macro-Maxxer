import RestaurantView from "@/components/RestaurantView";
import RestaurantIdentityHeader from "@/components/restaurant-view/RestaurantIdentityHeader";
import RecentRestaurantTracker from "@/components/RecentRestaurantTracker";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import type { RestaurantData } from "@/types/restaurant";

export default function RestaurantPageContent({
  restaurantData,
}: {
  restaurantData: RestaurantData;
}) {
  const addons = resolveAddonMenuItems(restaurantData.addonGroups, restaurantData.items);

  return (
    <RestaurantUiProvider>
      {/* pt-40 (lg) matches DesktopCategorySidebar's own `sticky top-[160px]`
          offset — both represent the same real thing (the fixed nav +
          secondary-controls stack height), so the page no longer reserves
          more top space than that stack actually needs. */}
      <div className="relative w-full pt-16 sm:pt-20 lg:pt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden sm:h-[460px] lg:h-[560px]"
        >
          <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-emerald-50/60 via-emerald-50/15 to-transparent" />
          <div className="absolute left-1/2 top-[-160px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(5,150,105,0.14),transparent_75%)] blur-3xl" />
        </div>

        <RecentRestaurantTracker restaurantId={restaurantData.id} />
        <ScrollToTopOnMount />

        <main className="mx-auto w-full max-w-6xl px-3 pb-12 sm:px-4 lg:px-6">
          <RestaurantIdentityHeader
            name={restaurantData.name}
            logo={restaurantData.logo}
            description={restaurantData.description}
            itemCount={restaurantData.items.length}
            nutritionSourceUrl={restaurantData.nutritionSourceUrl}
            nutritionUpdatedAt={restaurantData.nutritionUpdatedAt}
          />
          <RestaurantView
            restaurantId={restaurantData.id}
            restaurantName={restaurantData.name}
            restaurantLogo={restaurantData.logo}
            hasBuildYourOwn={restaurantData.hasBuildYourOwn}
            items={restaurantData.items}
            ingredients={restaurantData.ingredients}
            addons={addons}
            customizationRules={restaurantData.customizationRules}
            builderConfig={restaurantData.builderConfig}
          />
        </main>
      </div>
      <CartPreviewDrawer />
    </RestaurantUiProvider>
  );
}
