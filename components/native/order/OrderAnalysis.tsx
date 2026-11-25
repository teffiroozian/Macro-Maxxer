import { ChevronRight, ChartNoAxesColumn, ClipboardList, Zap } from "lucide-react";
import { card, muted, row } from "@/components/native/saved/savedStyles";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import { getProteinPer100Calories, getProteinScoreTier, PROTEIN_SCORE_TIER_SCALE } from "@/lib/nutrition";
import type { OrderTotals } from "./OrderMacroBar";

export type OrderAnalysisPart = "score" | "breakdown" | "facts";

const plainIcon = "bg-slate-100 text-slate-600 dark:bg-surface-hover dark:text-slate-300";

export default function OrderAnalysis({ totals, onOpen }: { totals: OrderTotals; onOpen: (part: OrderAnalysisPart) => void }) {
  const score = getProteinPer100Calories(totals.protein, totals.calories);
  const tier = typeof score === "number" ? getProteinScoreTier(score) : null;
  const style = tier ? proteinScoreTierStyles[tier] : null;
  const rows = [
    ...(tier && style && typeof score === "number" ? [{ part: "score" as const, title: "Protein Score", detail: `${score.toFixed(1)}g per 100 calories`, Icon: Zap, icon: `${style.iconWrap} ${style.icon}`, tag: PROTEIN_SCORE_TIER_SCALE[tier].label }] : []),
    { part: "breakdown" as const, title: "Macro breakdown", detail: "What each item adds", Icon: ChartNoAxesColumn, icon: plainIcon, tag: "" },
    { part: "facts" as const, title: "Nutrition Facts", detail: "The full label for this order", Icon: ClipboardList, icon: plainIcon, tag: "" },
  ];
  return (
    <section className="px-[18px] pt-[22px]">
      <h2 className="flex h-11 items-center text-xl font-bold">Meal analysis</h2>
      <ul className={`overflow-hidden rounded-3xl ${card}`}>
        {rows.map(({ part, title, detail, Icon, icon, tag }) => (
          <li key={part} className={row}>
            <button type="button" aria-haspopup="dialog" onClick={() => onOpen(part)} className="flex min-h-[70px] w-full cursor-pointer items-center gap-3.5 px-4 text-left active:bg-slate-50 dark:active:bg-surface-hover focus-ring">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${icon}`}><Icon size={20} strokeWidth={2.2} fill={part === "score" ? "currentColor" : "none"} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold leading-5">{title}</span>
                <span className={`mt-px block truncate text-sm leading-[18px] ${muted}`}>{detail}</span>
              </span>
              {tag && style ? <span className={`shrink-0 rounded-full px-[11px] py-[5px] text-sm font-bold leading-4 ${style.chip} ${style.value}`}>{tag}</span> : null}
              <ChevronRight size={16} strokeWidth={2.3} className={`shrink-0 ${muted}`} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
