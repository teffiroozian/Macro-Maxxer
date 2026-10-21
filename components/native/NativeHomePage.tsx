"use client";
import { useBrowsingHistory } from "@/lib/history/useBrowsingHistory";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeAppBar from "./home/HomeAppBar";
import CurrentOrderCard from "./home/CurrentOrderCard";
import ContinueBrowsingCarousel from "./home/ContinueBrowsingCarousel";
import RecentlyViewedCarousel from "./home/RecentlyViewedCarousel";
import QuickPicksGrid from "./home/QuickPicksGrid";
export default function NativeHomePage({ restaurants }: {
    restaurants: RestaurantIndexEntry[];
}) {
    const history = useBrowsingHistory();
    const { searchIndex } = useMenuItemSearch("", { enabled: history.entries.length > 0 });
    return <main className="native-dashboard native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pb-6 pl-[calc(18px+var(--safe-area-left))] pr-[calc(18px+var(--safe-area-right))] pt-[calc(var(--safe-area-top)+6px)] text-slate-900">
    <div className="mx-auto w-full max-w-2xl">
    <HomeAppBar />
    <CurrentOrderCard restaurants={restaurants}/>
    <ContinueBrowsingCarousel history={history} restaurants={restaurants} index={searchIndex ?? []}/>
    <RecentlyViewedCarousel entries={history.entries} index={searchIndex ?? []}/>
    <QuickPicksGrid restaurants={restaurants}/>
    </div>
    </main>;
}
