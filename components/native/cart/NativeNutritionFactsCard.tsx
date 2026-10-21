import type { NutritionTotals } from "@/lib/cart/nutrition";
import { formatWhole } from "./cartPresentation";

type Row = { label: string; value: number | undefined; unit: string; sub?: boolean };

export default function NativeNutritionFactsCard({ totals }: { totals: NutritionTotals }) {
  const rows: Row[] = [
    { label: "Total Fat", value: totals.totalFat, unit: "g" },
    { label: "Saturated Fat", value: totals.satFat, unit: "g", sub: true },
    { label: "Trans Fat", value: totals.transFat, unit: "g", sub: true },
    { label: "Cholesterol", value: totals.cholesterol, unit: "mg" },
    { label: "Sodium", value: totals.sodium, unit: "mg" },
    { label: "Carbohydrates", value: totals.carbs, unit: "g" },
    { label: "Fiber", value: totals.fiber, unit: "g", sub: true },
    { label: "Sugars", value: totals.sugars, unit: "g", sub: true },
    { label: "Protein", value: totals.protein, unit: "g" },
  ];
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-[18px]">
      <h3 className="mb-[14px] text-[22px] font-bold text-slate-900">Nutrition Facts</h3>
      <p className="text-xs font-medium text-slate-500">Amount per serving</p>
      <div className="mt-1 flex items-baseline justify-between text-xl font-bold text-slate-900">
        <span>Calories</span><span className="tabular-nums">{formatWhole(totals.calories)}</span>
      </div>
      <div className="my-3 h-[3px] bg-slate-900/80" />
      {rows.map((row) => (
        <div key={row.label} className={`flex justify-between border-b border-black/10 tabular-nums ${row.sub ? "py-[10px] pl-5 text-sm font-medium text-slate-500" : "py-3 text-base font-semibold text-slate-900"}`}>
          <span>{row.label}</span><span>{formatWhole(row.value, row.unit)}</span>
        </div>
      ))}
      <p className="mt-3 text-xs leading-[1.4] text-slate-500">2,000 calories a day is used for general nutrition advice, but calorie needs vary. Values may vary by location, serving size, and customizations.</p>
    </div>
  );
}
