import { macroSplitWidths } from "@/components/native/cart/cartPresentation";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";

export type OrderTotals = { calories: number; protein: number; carbs: number; totalFat: number };

const SEGMENTS = ["protein", "carbs", "totalFat"] as const;

// Decorative: the grams are always written out beside it.
export default function OrderMacroBar({ totals, className }: { totals: OrderTotals; className: string }) {
  const widths = macroSplitWidths(totals, 0.04);
  const empty = totals.protein + totals.carbs + totals.totalFat <= 0;
  return (
    <div aria-hidden="true" className={`flex gap-[3px] overflow-hidden ${className}`}>
      {SEGMENTS.map((key) => (
        <span key={key} style={{ width: `${widths[key]}%` }} className={`h-full transition-[width] duration-200 ease-out motion-reduce:transition-none ${empty ? "bg-slate-200 dark:bg-surface-hover" : macroColorTokens[key].segmentClassName}`} />
      ))}
    </div>
  );
}
