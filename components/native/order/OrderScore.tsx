import { Zap } from "lucide-react";
import { formatWhole } from "@/components/native/cart/cartPresentation";
import { card, muted, row, soft } from "@/components/native/saved/savedStyles";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { ELITE_VISUAL_CEILING, getProteinPer100Calories, getProteinScoreTier, PROTEIN_SCORE_TIER_ORDER, PROTEIN_SCORE_TIER_SCALE } from "@/lib/nutrition";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";
import type { OrderTotals } from "./OrderMacroBar";

const BAR = { low: "bg-[#94a3b8]", moderate: "bg-[#64748b]", good: "bg-[#b08a3e]", excellent: "bg-[#4c84c4]", elite: "bg-[#047857] dark:bg-accent" };

export default function OrderScore({ totals, items }: { totals: OrderTotals; items: MacroBreakdownItem[] }) {
  const score = getProteinPer100Calories(totals.protein, totals.calories);
  if (typeof score !== "number") return null;
  const tier = getProteinScoreTier(score);
  const index = PROTEIN_SCORE_TIER_ORDER.indexOf(tier);
  const { min, max } = PROTEIN_SCORE_TIER_SCALE[tier];
  const progress = Math.max(0, Math.min(1, (score - min) / ((max ?? ELITE_VISUAL_CEILING) - min)));
  const marker = Math.max(1, Math.min(99, ((index + progress) / PROTEIN_SCORE_TIER_ORDER.length) * 100));
  const next = PROTEIN_SCORE_TIER_ORDER[index + 1];
  const style = proteinScoreTierStyles[tier];
  const scored = items
    .map((item) => ({ item, score: getProteinPer100Calories(item.protein, item.calories) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (
    <>
      <section className={`rounded-3xl p-4 ${card}`}>
        <div className="flex items-center gap-3.5">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${style.iconWrap} ${style.icon}`}><Zap size={22} fill="currentColor" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className={`font-heading text-[26px] font-bold leading-8 tracking-[-0.02em] tabular-nums ${style.value}`}>{score.toFixed(1)}g</p>
            <p className={`text-sm leading-[18px] ${muted}`}>protein per 100 calories</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold leading-4 ${style.chip} ${style.value}`}>{PROTEIN_SCORE_TIER_SCALE[tier].label}</span>
        </div>
        <div className="relative mt-[18px] pt-3.5">
          <span aria-hidden="true" className="absolute top-1 -ml-0.5 h-6 w-1 rounded-sm bg-slate-900 dark:bg-slate-50" style={{ left: `${marker}%` }} />
          <div className="grid grid-cols-5 gap-1">
            {PROTEIN_SCORE_TIER_ORDER.map((other) => (
              <div key={other} className="min-w-0">
                <div className={`h-2 rounded-full ${BAR[other]} ${other === tier ? "" : "opacity-30"}`} />
                <p className={`mt-2.5 truncate text-xs ${other === tier ? `font-bold ${style.value}` : `font-medium ${muted}`}`}>{PROTEIN_SCORE_TIER_SCALE[other].label}</p>
                <p className={`mt-px text-xs ${muted}`}>{PROTEIN_SCORE_TIER_SCALE[other].tickLabel}</p>
              </div>
            ))}
          </div>
        </div>
        <p className={`mt-3.5 rounded-[14px] bg-slate-100 px-3.5 py-[11px] text-center text-sm leading-[18px] tabular-nums dark:bg-surface-hover ${soft}`}>{formatWhole(totals.protein, "g")} protein ÷ {formatWhole(totals.calories)} cal × 100 = {score.toFixed(1)}</p>
        {next ? <p className={`mt-3 text-sm leading-5 ${soft}`}>{Math.max(0.1, PROTEIN_SCORE_TIER_SCALE[next].min - score).toFixed(1)}g more per 100 calories reaches {PROTEIN_SCORE_TIER_SCALE[next].label}.</p> : null}
      </section>
      {items.length > 1 ? (
        <>
          <h3 className="mt-5 text-base font-bold">By item</h3>
          <ul className={`mt-2.5 rounded-3xl px-3.5 py-1 ${card}`}>
            {scored.map(({ item, score: itemScore }) => {
              const itemStyle = typeof itemScore === "number" ? proteinScoreTierStyles[getProteinScoreTier(itemScore)] : null;
              return (
                <li key={item.id} className={`flex items-center gap-3 py-2.5 ${row}`}>
                  <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} fallbackClassName="object-cover" containerClassName="size-11 shrink-0 overflow-hidden rounded-[13px] bg-slate-100 dark:bg-image-placeholder" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{item.name}</span>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${itemStyle?.value ?? muted}`}>{typeof itemScore === "number" ? `${itemScore.toFixed(1)}g` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </>
  );
}
