import { formatWhole } from "@/components/native/cart/cartPresentation";
import { card, muted } from "@/components/native/saved/savedStyles";
import type { NutritionTotals } from "@/lib/cart/nutrition";
import { factRows } from "@/lib/native/orderWorkspace";
import { countLabel } from "@/lib/native/savedLibrary";

const rule = "bg-slate-900 dark:bg-slate-50";

// The complete label, matching the one on the item page.
export default function OrderFacts({ totals, count, approximate }: { totals: NutritionTotals; count: number; approximate: boolean }) {
  return (
    <section className={`rounded-3xl px-4 pb-4 pt-3.5 ${card}`}>
      <p className="flex justify-between text-[15px] font-bold"><span>Serving size</span><span>Whole order ({countLabel(count)})</span></p>
      <div aria-hidden="true" className={`my-2 h-2 ${rule}`} />
      <p className="text-[13px] font-bold">Amount per order</p>
      <p className="flex items-end justify-between gap-3 pb-1.5">
        <span className="text-2xl font-bold leading-8">Calories</span>
        <span className="font-heading text-[32px] font-bold leading-9 tracking-[-0.02em] tabular-nums">{approximate ? "~" : ""}{formatWhole(totals.calories)}</span>
      </p>
      <div aria-hidden="true" className={`h-[5px] ${rule}`} />
      <table className="w-full border-collapse text-[15px] tabular-nums">
        <thead>
          <tr><th scope="col"><span className="sr-only">Nutrient</span></th><th scope="col"><span className="sr-only">Amount</span></th><th scope="col" className={`whitespace-nowrap py-1.5 text-right text-[13px] font-bold ${muted}`}>% Daily Value*</th></tr>
        </thead>
        <tbody>
          {factRows(totals).map(({ key, label, value, daily, sub }) => (
            <tr key={key} className="border-t border-slate-200 dark:border-divider">
              <th scope="row" className={`py-2 pr-2 text-left ${sub ? "pl-4 font-medium" : "font-bold"}`}>{label}</th>
              <td className="py-2 pr-2 text-right font-medium">{value}</td>
              <td className="w-[94px] py-2 text-right font-bold">{daily}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden="true" className={`h-[5px] ${rule}`} />
      <p className={`pt-2.5 text-[13px] leading-[18px] ${muted}`}>*Percent Daily Values are based on a 2,000 calorie diet. Includes your customizations; values may vary by location and serving size.</p>
    </section>
  );
}
