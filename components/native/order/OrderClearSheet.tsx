"use client";
import { useRef } from "react";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { quietButton, soft } from "@/components/native/saved/savedStyles";
import { countLabel } from "@/lib/native/savedLibrary";

export default function OrderClearSheet({ count, onClear, onClose }: { count: number; onClear: () => void; onClose: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="order-clear-title" onClose={onClose} initialFocusRef={keep}>
      <div className="px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-5">
        <h2 id="order-clear-title" className="font-heading text-lg font-bold leading-[25px] tracking-[-0.02em]">Clear your order?</h2>
        <p className={`mt-1.5 text-base leading-[22px] ${soft}`}>This removes {countLabel(count)} without adding {count === 1 ? "it" : "them"} to History.</p>
        <button type="button" onClick={onClear} className="mt-5 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-2xl bg-error text-base font-bold text-white active:opacity-80 focus-ring">Clear order</button>
        <button ref={keep} type="button" onClick={onClose} className={`mt-2.5 w-full !h-[50px] !rounded-2xl !text-base ${quietButton}`}>Keep order</button>
      </div>
    </SavedSheet>
  );
}
