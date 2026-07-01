import RestaurantView from "@/components/RestaurantView";
import RecentRestaurantTracker from "@/components/RecentRestaurantTracker";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { RestaurantSearchProvider } from "@/components/RestaurantSearchContext";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/CartPreviewDrawer";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import type { RestaurantData } from "@/types/restaurant";

export default function RestaurantPageContent({
  restaurantData,
}: {
  restaurantData: RestaurantData;
}) {
  const addons = resolveAddonMenuItems(restaurantData.addonGroups, restaurantData.items);

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
              addons={addons}
              customizationRules={restaurantData.customizationRules}
              builderConfig={restaurantData.builderConfig}
            />
          </main>
        </div>
        <CartPreviewDrawer />
      </RestaurantUiProvider>
    </RestaurantSearchProvider>
  );
}
