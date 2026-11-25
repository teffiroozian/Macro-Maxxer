"use client";
import { useEffect, useRef, useState } from "react";
import { formatWhole } from "@/components/native/cart/cartPresentation";
import { card, muted, soft } from "@/components/native/saved/savedStyles";
import SavedMacros from "@/components/native/saved/SavedMacros";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { CartItem } from "@/types/cart";
import OrderMacroBar, { type OrderTotals } from "./OrderMacroBar";

const GRAMS = [["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;

export default function OrderOverview({ items, totals, approximate }: { items: CartItem[]; totals: OrderTotals; approximate: boolean }) {
  const section = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0), { rootMargin: "-110px 0px 0px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section ref={section} aria-label="Nutrition overview" className={`mx-[18px] mt-4 rounded-[28px] px-5 py-[18px] ${card}`}>
        <p aria-live="polite" className="flex items-baseline gap-2">
          <span className="font-heading text-[46px] font-bold leading-[54px] tracking-[-0.03em] tabular-nums">{approximate ? "~" : ""}{formatWhole(totals.calories)}</span>
          <span className={`text-base ${soft}`}>calories</span>
        </p>
        <OrderMacroBar totals={totals} className="mt-3 h-3.5 rounded-full" />
        <div className="mt-3.5 grid grid-cols-3">
          {GRAMS.map(([key, label]) => (
            <p key={key} className="min-w-0">
              <span className={`block truncate font-heading text-xl font-bold leading-[26px] tracking-[-0.02em] tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatWhole(totals[key], "g")}</span>
              <span className={`mt-px block text-[13px] ${muted}`}>{label}</span>
            </p>
          ))}
        </div>
      </section>
      <div aria-hidden="true" className={`glass-surface pointer-events-none fixed inset-x-0 top-0 z-20 !rounded-none !border-x-0 !border-t-0 px-5 pb-2.5 pt-[calc(var(--safe-area-top)+8px)] transition-opacity duration-150 motion-reduce:transition-none ${pinned ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-2xl">
          <SavedMacros items={items} size="md" />
          <OrderMacroBar totals={totals} className="mt-2 h-[5px] rounded-full" />
        </div>
      </div>
    </>
  );
}
