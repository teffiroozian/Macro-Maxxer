import type { NutritionTotals } from "@/lib/cart/nutrition";

type CartNutritionSummaryProps = {
  nutritionTotals: NutritionTotals;
};

function formatValue(value?: number, suffix = "") {
  return value === undefined ? "—" : `${value}${suffix}`;
}

export default function CartNutritionSummary({ nutritionTotals }: CartNutritionSummaryProps) {
  return (
    <div className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-[18px]">
      <h2 className="mb-6 text-2xl font-bold text-neutral-900">Nutrition Summary</h2>
      <div className="mt-1 flex items-end justify-between">
        <div className="text-xl font-bold">Calories</div>
        <div className="text-xl font-bold">{nutritionTotals.calories}</div>
      </div>

      <div className="my-[12px] mb-2 h-[5px] rounded-[999px] bg-[rgba(0,0,0,0.75)]" />

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
        <div className="text-lg font-semibold">Total Fat</div>
        <div className="text-lg font-semibold">{formatValue(nutritionTotals.totalFat, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sat Fat</div>
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.satFat, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Trans Fat</div>
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.transFat, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
        <div className="text-lg font-semibold">Cholesterol</div>
        <div className="text-lg font-semibold">{formatValue(nutritionTotals.cholesterol, "mg")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
        <div className="text-lg font-semibold">Sodium</div>
        <div className="text-lg font-semibold">{formatValue(nutritionTotals.sodium, "mg")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
        <div className="text-lg font-semibold">Carbohydrates</div>
        <div className="text-lg font-semibold">{formatValue(nutritionTotals.carbs, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Fiber</div>
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.fiber, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sugars</div>
        <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.sugars, "g")}</div>
      </div>

      <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
        <div className="text-lg font-semibold">Protein</div>
        <div className="text-lg font-semibold">{formatValue(nutritionTotals.protein, "g")}</div>
      </div>

      <div className="mt-3 text-xs font-medium leading-[1.05] text-[rgba(0,0,0,0.55)]">
        Aggregated nutrition totals for all items currently in your cart.
      </div>
    </div>
  );
}
