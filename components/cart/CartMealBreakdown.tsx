import SectionEyebrow from "@/components/ui/SectionEyebrow";
import { SelectionSummaryShell } from "@/components/item-route-modal/SelectionSummaryPanels";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import type { CartItem, CartMacros } from "@/types/cart";

type CartMealBreakdownProps = {
  items: CartItem[];
  totals: CartMacros;
};

export default function CartMealBreakdown({ items, totals }: CartMealBreakdownProps) {
  return (
    <SelectionSummaryShell title="Meal Breakdown" totals={totals}>
      <SectionEyebrow className="text-sm text-neutral-500">Items</SectionEyebrow>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-600">No meal items yet.</p>
      ) : (
        <ul className="grid list-none gap-2 pl-0">
          {items.map((item) => {
            const detailLine = summarizeItem(item);
            const displayName = formatCartItemName(item);
            return (
              <li
                key={`${item.id}-breakdown`}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
                  {detailLine ? <p className="min-w-0 break-words text-xs text-slate-500">{detailLine}</p> : null}
                </div>
                <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/60">
                  ×{item.quantity}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SelectionSummaryShell>
  );
}
