import { surfaceCardClassName } from "@/components/ui/SurfaceCard";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { HistoryEntry } from "@/lib/history/browsingHistory";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
import { resolveHistoryEntry, hasCompleteDefaultNutrition } from "./historyPresentation";
import HistoryItemLink from "./HistoryItemLink";
import HomeSectionTitle from "./HomeSectionTitle";
export default function RecentlyViewedCarousel({ entries, index }: {
    entries: HistoryEntry[];
    index: SearchIndexEntry[];
}) {
    const items = entries.filter(e => e.kind === "menu-item").flatMap(e => {
        const resolved = resolveHistoryEntry(e, index);
        if (!resolved?.item || !hasCompleteDefaultNutrition(resolved.item))
            return [];
        const nutrition = getDefaultMenuItemNutrition(resolved.item);
        return [{ ...resolved, nutrition }];
    }).slice(0, 8);
    if (!items.length)
        return null;
    const macros = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;
    return <section className="native-home-reveal mt-[26px]">
    <HomeSectionTitle title="Recently Viewed"/>
    <div className="native-home-carousel" aria-label="Recently viewed items">{items.map(item => <HistoryItemLink key={item.href} entry={item} label={`View ${item.name} at ${item.restaurant.name}`} className={surfaceCardClassName({ padding: "none", shadow: "md", className: "native-home-card w-[188px] shrink-0 snap-start !p-2.5 active:bg-slate-50 focus-ring" })}>
        <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="aspect-[1.2] overflow-hidden rounded-[14px] bg-slate-100"/>
        <div className="px-1 pt-2.5">
        <h3 className="truncate text-sm font-bold">{item.name}</h3>
        <div className="mt-0.5 flex items-center gap-[5px] text-xs text-slate-500">
        <RestaurantLogoBadge src={item.restaurant.logo} alt="" ring={false} fit="cover" className="!size-3.5"/>
        <span className="truncate">{item.restaurant.name}</span>
        </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 rounded-[14px] bg-slate-50 p-2.5">{macros.map(([key, label]) => <div key={key}>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <span className={`size-[5px] rounded-full ${macroColorTokens[key].segmentClassName}`}/>{label}</div>
            <p className={`mt-[3px] font-heading text-[15px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{Math.round(item.nutrition[key] ?? 0).toLocaleString("en-US")}{key === "calories" ? "" : "g"}</p>
            </div>)}</div>
        </HistoryItemLink>)}</div>
    </section>;
}
