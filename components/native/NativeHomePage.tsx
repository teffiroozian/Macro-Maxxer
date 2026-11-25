"use client";
import { useBrowsingHistory } from "@/lib/history/useBrowsingHistory";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import type { HomeExploreSpot } from "@/lib/native/exploreSpots";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeHeader from "./home/HomeHeader";
import FavoriteRestaurants from "./home/FavoriteRestaurants";
import SavedMealsCarousel from "./home/SavedMealsCarousel";
import PreviousOrdersCarousel from "./home/PreviousOrdersCarousel";
import ContinueBrowsingCarousel from "./home/ContinueBrowsingCarousel";
import ExploreCarousel from "./home/ExploreCarousel";

export default function NativeHomePage({ restaurants, exploreSpots = [] }: {
  restaurants: RestaurantIndexEntry[];
  exploreSpots?: HomeExploreSpot[];
}) {
  const history = useBrowsingHistory();
  const { searchIndex } = useMenuItemSearch("", { enabled: history.entries.length > 0 });
  return (
    <main className="native-dashboard native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pb-6 pl-[calc(18px+var(--safe-area-left))] pr-[calc(18px+var(--safe-area-right))] pt-[calc(var(--safe-area-top)+6px)] text-slate-900">
      <div className="mx-auto w-full max-w-2xl">
        <HomeHeader />
        <FavoriteRestaurants restaurants={restaurants} />
        <SavedMealsCarousel restaurants={restaurants} />
        <PreviousOrdersCarousel restaurants={restaurants} />
        {/* Wait for item data, or late cards shift the scroll-snapped row. */}
        {history.entries.length === 0 || searchIndex ? <ContinueBrowsingCarousel history={history} restaurants={restaurants} index={searchIndex ?? []} /> : null}
        <ExploreCarousel spots={exploreSpots} />
      </div>
    </main>
  );
}
