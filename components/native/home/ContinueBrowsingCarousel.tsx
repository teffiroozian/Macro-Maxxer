import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { recentRestaurants, type readHistory } from "@/lib/history/browsingHistory";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { resolveHistoryEntry } from "./historyPresentation";
import HistoryItemLink from "./HistoryItemLink";
import HomeSectionTitle from "./HomeSectionTitle";
export default function ContinueBrowsingCarousel({ history, restaurants, index }: {
    history: ReturnType<typeof readHistory>;
    restaurants: RestaurantIndexEntry[];
    index: SearchIndexEntry[];
}) {
    const resolvedHistory = { ...history, visits: history.visits.filter(v => restaurants.some(r => r.id === v.restaurantId && !r.isComingSoon)), entries: history.entries.filter(e => resolveHistoryEntry(e, index)) };
    const recent = recentRestaurants(resolvedHistory);
    if (!recent.length)
        return null;
    return <section className="native-home-reveal mt-[26px]">
    <HomeSectionTitle title="Continue Browsing"/>
    <div className="native-home-carousel" aria-label="Recently browsed restaurants">{recent.map(group => {
            const restaurant = restaurants.find(r => r.id === group.restaurantId)!;
            const tiles = group.entries.flatMap(e => resolveHistoryEntry(e, index) ?? []).slice(0, 3);
            return <SurfaceCard key={restaurant.id} shadow="md" className="native-home-card w-[280px] shrink-0 snap-start">
            <div className="flex items-center gap-2.5">
            <RestaurantLogoBadge src={restaurant.logo} alt="" fit="cover" ring={false} className="!size-[38px]"/>
            <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold">{restaurant.name}</h3>
            <p className="text-xs text-slate-500">{formatRelativeTime(group.lastViewedAt)}</p>
            </div>
            </div>{tiles.length ? <div className="mt-3.5 grid grid-cols-3 gap-2">{tiles.map(tile => <HistoryItemLink key={tile.href} entry={tile} label={`View ${tile.name} at ${restaurant.name}`} className="min-w-0 active:scale-[.98] focus-ring">
                    <RestaurantItemImage src={tile.image} alt="" imagePresentation={tile.imagePresentation} containerClassName="aspect-square overflow-hidden rounded-[14px] bg-slate-100"/>
                    <p className="mt-1.5 truncate text-xs font-semibold text-slate-700">{tile.name}</p>
                    </HistoryItemLink>)}</div> : null}<Link href={`/restaurant/${restaurant.id}`} aria-label={`Browse ${restaurant.name}`} className="mt-3.5 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent-soft text-sm font-semibold text-accent-strong active:bg-slate-50 focus-ring">Browse<ChevronRight size={12} aria-hidden="true"/>
            </Link>
            </SurfaceCard>;
        })}</div>
    </section>;
}
