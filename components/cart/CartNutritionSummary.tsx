import type { NutritionTotals } from "@/lib/cart/nutrition";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";

type CartNutritionSummaryProps = {
  nutritionTotals: NutritionTotals;
};

export default function CartNutritionSummary({ nutritionTotals }: CartNutritionSummaryProps) {
  return (
    <NutritionFactsPanel
      totals={nutritionTotals}
      title="Nutrition Summary"
      caption="Totals for every item in your cart"
    />
  );
}
