import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import MacroSplitBar from "@/components/nutrition/MacroSplitBar";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import type { CartItem } from "@/types/cart";
import type { CartMacros } from "@/types/cart";

type CartMealBreakdownProps = {
  items: CartItem[];
  totals: CartMacros;
  proteinPer100Calories: number | null | undefined;
};

export default function CartMealBreakdown({ items, totals, proteinPer100Calories }: CartMealBreakdownProps) {
  return (
    <SurfaceCard padding="default" radius="large" className="flex min-h-0 flex-col sm:p-5">
      <h2 className="text-2xl font-bold text-neutral-900">Meal Breakdown</h2>
      <div className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-4">
        <SectionEyebrow className="text-sm text-neutral-500">Items</SectionEyebrow>
        {items.length === 0 ? <p className="text-sm text-neutral-600">No meal items yet.</p> : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto max-h-[300px] bg-image-placeholder p-2 rounded-xl">
            {items.map((item) => {
              const detailLine = summarizeItem(item);
              const displayName = formatCartItemName(item);
              return (
                <li key={`${item.id}-breakdown`} className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-3 py-2">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                  </div>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-900">{item.quantity}x {displayName}</p>{detailLine ? <p className="truncate text-xs text-neutral-500">{detailLine}</p> : null}</div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="space-y-2 pt-4">
          <SectionEyebrow className="text-sm text-neutral-500">Protein Score</SectionEyebrow>
          <div className="rounded-xl bg-image-placeholder px-3 py-2">
            <p className="mt-1 text-sm text-neutral-900">
              <span className="font-bold">{Math.round(proteinPer100Calories ?? 0)}g</span> of protein in <span className="font-semibold">100 calories</span>
            </p>
          </div>
        </div>
        <div className="space-y-2 pt-4">
          <SectionEyebrow className="text-sm text-neutral-500">Macro Split</SectionEyebrow>
          <MacroSplitBar protein={totals.protein} carbs={totals.carbs} totalFat={totals.totalFat} />
        </div>
      </div>
    </SurfaceCard>
  );
}
