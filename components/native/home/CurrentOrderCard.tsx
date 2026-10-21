import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { appButtonClassName } from "@/components/ui/AppButton";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { useCart } from "@/stores/cartStore";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import { buildCalorieSegments } from "@/components/nutrition/macroSegments";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeSectionTitle from "./HomeSectionTitle";
export default function CurrentOrderCard({ restaurants }: {
    restaurants: RestaurantIndexEntry[];
}) {
    const { items } = useCart();
    if (!items.length)
        return null;
    const ids = [...new Set(items.map(item => item.restaurantId))];
    const brands = ids.flatMap(id => restaurants.find(r => r.id === id) ?? []);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const totals = buildCartMacroTotals(items);
    const partial = hasPartialCartNutritionData(items);
    const segments = buildCalorieSegments({ protein: totals.protein, carbs: totals.carbs, fat: totals.totalFat });
    const macros = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;
    const thumbnails = items.filter((item, index) => items.findIndex(other => other.restaurantId === item.restaurantId && other.itemId === item.itemId) === index).slice(0, 3);
    return <section className="native-home-reveal mt-[26px]">
    <HomeSectionTitle title="Current Order"/>
    <SurfaceCard padding="none" shadow="md" className="native-home-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3.5">
    <div className="flex -space-x-3">{brands.slice(0, ids.length > 1 ? 2 : 1).map(r => <RestaurantLogoBadge key={r.id} src={r.logo} alt="" fit="cover" className="!size-10 ring-2 ring-white" ring={false}/>)}</div>
    <div className="min-w-0 flex-1">
    <h3 className="truncate text-base font-bold">{ids.length > 1 ? `${ids.length} restaurants` : brands[0]?.name ?? "Your order"}</h3>
    <p className="text-[13px] text-slate-500">{count} {count === 1 ? "item" : "items"}</p>
    </div>
    <div className="flex -space-x-2.5" aria-hidden="true">{thumbnails.map(item => <RestaurantItemImage key={item.id} src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="size-[34px] overflow-hidden rounded-full bg-slate-100 ring-2 ring-white"/>)}</div>
    </div>
      <div className="mx-4 mb-[18px] h-px bg-slate-100"/>
      <div className="grid grid-cols-4">{macros.map(([key, label], index) => <div key={key} className={`${index ? "border-l border-slate-100 pl-3.5" : "pl-4"} min-w-0`}>
        <p className={`font-heading text-lg font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{key === "calories" ? `${partial ? "~" : ""}${Math.round(totals[key]).toLocaleString("en-US")}` : `${Math.round(totals[key])}g`}</p>
        <p className="mt-[3px] text-xs font-semibold text-slate-500">{label}</p>
        </div>)}</div>
      <div className="px-4 pt-3">
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-label={segments.map(s => `${s.roundedPercent}% ${s.label.toLowerCase()}`).join(", ")}>{segments.map(segment => <span key={segment.label} className={segment.color} style={{ width: `${segment.percent}%` }}/>)}</div>
    <div className="mt-1.5 flex justify-between gap-1 text-[11px] font-semibold text-slate-500">{segments.map(s => <span key={s.label} className="flex items-center gap-1">
        <span className={`size-1.5 rounded-full ${s.color}`}/>{s.roundedPercent}% {s.label.toLowerCase()}</span>)}</div>{partial ? <p className="mt-2 text-xs text-slate-500">Some items are missing nutrition data.</p> : null}</div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-2 px-4 pb-4 pt-7">
    <Link href={ids.length === 1 ? `/restaurant/${ids[0]}` : "/restaurants"} className={appButtonClassName({ variant: "secondary", className: "!h-11 !rounded-[14px] !text-[15px]" })}>Add items</Link>
    <Link href="/cart" className={appButtonClassName({ className: "!h-11 !rounded-[14px] !border-accent !bg-accent !text-[15px] active:opacity-80" })}>Review order<ChevronRight size={16} aria-hidden="true"/>
    </Link>
    </div>
    </SurfaceCard>
  </section>;
}
