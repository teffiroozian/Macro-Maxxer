"use client";
import { useRef } from "react";
import { Check } from "lucide-react";
import SavedMacros from "@/components/native/saved/SavedMacros";
import SavedPhoto from "@/components/native/saved/SavedPhoto";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { card, muted, primaryButton, quietButton, row, soft } from "@/components/native/saved/savedStyles";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import type { PastOrder } from "@/lib/native/homeCollections";
import { customizationLine, formatOrderTime } from "@/lib/native/savedLibrary";

export default function OrderReceipt({ order, onUndo, onHistory, onClose }: { order: PastOrder; onUndo: () => void; onHistory: () => void; onClose: () => void }) {
  const done = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="order-receipt-title" onClose={onClose} initialFocusRef={done}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-accent-soft text-accent-strong"><Check size={34} strokeWidth={2.6} aria-hidden="true" /></span>
          <h2 id="order-receipt-title" className="mt-3.5 font-heading text-xl font-bold leading-[27px] tracking-[-0.02em]">Added to History</h2>
          <p className={`mt-1 text-base leading-[22px] ${soft}`}>Today, {formatOrderTime(order.placedAt)}. No food was purchased.</p>
        </div>
        <ul className={`mt-[18px] rounded-3xl px-3.5 py-1 ${card}`}>
          {order.items.map((item) => (
            <li key={item.id} className={`flex items-center gap-3 py-2.5 ${row}`}>
              <SavedPhoto item={item} className="size-11 shrink-0 rounded-[13px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-5">{formatCartItemName(item)}</span>
                <span className={`block truncate text-[13px] leading-[17px] ${muted}`}>{customizationLine({ ...item, quantity: 1 })}</span>
              </span>
              <span className={`shrink-0 text-sm ${muted}`}>×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <SavedMacros items={order.items} size="lg" className="mt-4 px-1" />
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-200 px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-3 dark:border-divider">
        <button ref={done} type="button" onClick={onClose} className={primaryButton}>Done</button>
        <div className="flex gap-2">
          <button type="button" onClick={onUndo} className={quietButton}>Undo</button>
          <button type="button" onClick={onHistory} className={quietButton}>View in History</button>
        </div>
      </div>
    </SavedSheet>
  );
}
