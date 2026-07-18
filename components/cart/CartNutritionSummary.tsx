import type { NutritionTotals } from "@/lib/cart/nutrition";
import NutritionLabelCard from "@/components/nutrition/NutritionLabelCard";

type CartNutritionSummaryProps = {
  nutritionTotals: NutritionTotals;
};

export default function CartNutritionSummary({ nutritionTotals }: CartNutritionSummaryProps) {
  return (
    <NutritionLabelCard
      totals={nutritionTotals}
      title="Nutrition Summary"
      footer="Aggregated nutrition totals for all items currently in your cart."
    />
  );
}
