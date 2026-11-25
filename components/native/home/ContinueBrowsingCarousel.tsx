import Link from "next/link";
import { ChevronRight } from "lucide-react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { recentRestaurants, type readHistory } from "@/lib/history/browsingHistory";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { hasCompleteDefaultNutrition, resolveHistoryEntry } from "./historyPresentation";
import HistoryItemLink from "./HistoryItemLink";
export default function ContinueBrowsingCarousel({ history, restaurants, index }: {
    history: ReturnType<typeof readHistory>;
    restaurants: RestaurantIndexEntry[];
    index: SearchIndexEntry[];
}) {
    const resolvedHistory = { ...history, visits: history.visits.filter(v => restaurants.some(r => r.id === v.restaurantId && !r.isComingSoon)), entries: history.entries.filter(e => resolveHistoryEntry(e, index)) };
    const recent = recentRestaurants(resolvedHistory);
    if (!recent.length)
        return null;
    return (
        <section className="native-home-reveal mt-5">
            <h2 className="flex h-11 items-center px-0.5 text-xl font-bold text-slate-900">Continue browsing</h2>
            <div className="native-home-carousel" aria-label="Recently browsed restaurants">{recent.map(group => {
                const restaurant = restaurants.find(r => r.id === group.restaurantId)!;
                const tiles = group.entries.flatMap(e => resolveHistoryEntry(e, index) ?? []).slice(0, 3);
                return (
                    <article key={restaurant.id} className="w-[320px] max-w-full shrink-0 snap-start rounded-[26px] border border-black/8 bg-white px-4 pb-4 pt-3.5 shadow-elev-2">
                        <Link href={`/restaurant/${restaurant.id}`} aria-label={`Browse ${restaurant.name}`} className="flex h-11 items-center gap-[11px] active:opacity-70 focus-ring">
                            <NativeRestaurantLogo src={restaurant.logo} size={40} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-base font-bold leading-5">{restaurant.name}</span>
                                <span className="block text-[13px] leading-[17px] text-slate-500">{formatRelativeTime(group.lastViewedAt)}</span>
                            </span>
                            <ChevronRight size={18} strokeWidth={2.2} className="text-slate-500" aria-hidden="true" />
                        </Link>
                        {tiles.length ? (
                            <div className="mt-3.5 grid grid-cols-3 gap-2.5">{tiles.map(tile => (
                                <HistoryItemLink key={tile.href} entry={tile} label={`View ${tile.name} at ${restaurant.name}`} className="min-w-0 active:scale-[.98] focus-ring">
                                    <RestaurantItemImage src={tile.image} alt="" imagePresentation={tile.imagePresentation} fallbackClassName="object-cover" containerClassName="aspect-square overflow-hidden rounded-[20px] bg-slate-100" />
                                    <p className="mt-[7px] truncate text-[13px] font-semibold">{tile.name}</p>
                                    {tile.item && hasCompleteDefaultNutrition(tile.item) ? <p className="text-xs text-slate-500">{Math.round(getDefaultMenuItemNutrition(tile.item).calories ?? 0).toLocaleString("en-US")} cal</p> : null}
                                </HistoryItemLink>
                            ))}</div>
                        ) : null}
                    </article>
                );
            })}</div>
        </section>
    );
}
