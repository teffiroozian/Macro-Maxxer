import Link from "next/link";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeSectionTitle from "./HomeSectionTitle";
const QUICK_PICK_IDS = ["chickfila", "chipotle", "mcdonalds", "starbucks"];
export default function QuickPicksGrid({ restaurants }: {
    restaurants: RestaurantIndexEntry[];
}) {
    const picks = QUICK_PICK_IDS.flatMap(id => restaurants.find(r => r.id === id && !r.isComingSoon) ?? []);
    return <section className="mt-[26px]">
    <HomeSectionTitle title="Quick Picks" href="/restaurants"/>
    <div className="grid grid-cols-4 gap-2.5">{picks.map(r => <Link key={r.id} href={`/restaurant/${r.id}`} className="min-w-0 active:scale-[.98] focus-ring">
        <span className="flex aspect-square items-center justify-center rounded-[22px] border border-black/8 bg-surface-card shadow-elev-2">
        <RestaurantLogoBadge src={r.logo} alt="" ring={false} fit="cover" className="!h-auto !w-[54%] aspect-square"/>
        </span>
        <span className="mt-2 block truncate text-center text-xs font-semibold text-slate-700">{r.name}</span>
        </Link>)}</div>
    </section>;
}
