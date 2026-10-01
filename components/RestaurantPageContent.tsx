import RestaurantView from "@/components/RestaurantView";
import RestaurantIdentityHeader from "@/components/restaurant-view/RestaurantIdentityHeader";
import RecentRestaurantTracker from "@/components/RecentRestaurantTracker";
import ScrollToTopOnMount from "@/components/ScrollToTopOnMount";
import { RestaurantUiProvider } from "@/components/RestaurantUiContext";
import CartPreviewDrawer from "@/components/cart/CartPreviewDrawer";
import { resolveAddonMenuItems } from "@/lib/addonGroups";
import type { RestaurantData } from "@/types/restaurant";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

export default function RestaurantPageContent({
  restaurantData,
}: {
  restaurantData: RestaurantData;
}) {
  const addons = resolveAddonMenuItems(restaurantData.addonGroups, restaurantData.items);

  return (
    <RestaurantUiProvider>
      <div className="min-h-[calc(var(--app-viewport-height)+24rem)] w-full bg-app-background">
        <RecentRestaurantTracker restaurantId={restaurantData.id} />
        <ScrollToTopOnMount />

        <RestaurantIdentityHeader
          restaurantId={restaurantData.id}
          name={restaurantData.name}
          logo={restaurantData.logo}
          description={restaurantData.description}
          itemCount={restaurantData.items.length}
          nutritionSourceUrl={restaurantData.nutritionSourceUrl}
          lastUpdated={restaurantData.lastUpdated}
        />

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
          {restaurantData.nutritionSourceAttribution ? (
            <p className="mx-auto mt-12 max-w-3xl border-t border-black/5 pt-5 text-center text-xs leading-5 text-slate-500 sm:mt-14">
              {restaurantData.nutritionSourceAttribution}
            </p>
          ) : null}
        </main>
      </div>
      {!IS_CAPACITOR_BUILD ? <CartPreviewDrawer /> : null}
    </RestaurantUiProvider>
  );
}
