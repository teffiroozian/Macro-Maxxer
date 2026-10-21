import type { NutritionTotals } from "@/lib/cart/nutrition";
import type { CartItem } from "@/types/cart";
import NativeMealBreakdownCard from "./NativeMealBreakdownCard";
import NativeNutritionFactsCard from "./NativeNutritionFactsCard";

export default function NativeOrderSummary({ items, totals, nutritionTotals, onPreviewItem }: {
  items: CartItem[]; totals: { calories: number; protein: number; carbs: number; totalFat: number };
  nutritionTotals: NutritionTotals; onPreviewItem: (item: CartItem) => void;
}) {
  return (
    <section>
      <div className="flex flex-col gap-1 px-5 pt-[34px]">
        <p className="text-[13px] font-semibold text-slate-500">Meal Summary</p>
        <h2 className="font-heading text-xl font-bold leading-tight tracking-[-0.01em] text-slate-900">Nutrition &amp; Meal Details</h2>
      </div>
      <div className="mx-[18px] mt-[14px] flex flex-col gap-[10px] rounded-3xl border border-black/8 bg-[#f1f5f9] p-[10px]">
        <NativeMealBreakdownCard items={items} totals={totals} onPreviewItem={onPreviewItem} />
        <NativeNutritionFactsCard totals={nutritionTotals} />
      </div>
    </section>
  );
}
