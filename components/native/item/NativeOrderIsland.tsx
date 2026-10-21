"use client";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatMacro, MACRO_KEYS, MACRO_LABELS, scaleMacros, type Macros } from "./nativeItemModel";

export const MAX_ORDER_QUANTITY = 9;

export default function NativeOrderIsland({ perItem, quantity, onQuantityChange, label, disabled, onSubmit }: {
  perItem: Macros; quantity: number; onQuantityChange: (next: number) => void; label: string; disabled: boolean; onSubmit: () => void;
}) {
  const total = scaleMacros(perItem, quantity);
  return (
    <div className="absolute inset-x-[10px] bottom-[calc(var(--safe-area-bottom)+22px)] z-30 flex flex-col gap-[10px] rounded-[30px] bg-white px-2 pb-2 pt-3 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35),0_0_0_1px_#eef2f6]">
      <div className="flex" aria-live="polite" aria-atomic="true" aria-label={`${Math.round(total.calories)} calories`}>
        {MACRO_KEYS.map((key, index) => (
          <div key={key} className={`flex flex-1 flex-col items-center gap-1 ${index > 0 ? "border-l border-[#eef2f6]" : ""}`}>
            <span className={`font-heading text-[15px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatMacro(key, total[key])}</span>
            <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.06em] text-slate-500">{MACRO_LABELS[key]}</span>
          </div>
        ))}
      </div>
      {quantity > 1 ? <p className="-mt-1 text-center text-[11px] font-semibold text-slate-400">Total for {quantity} items</p> : null}
      <div className="flex gap-1.5">
        <div className="flex h-[52px] items-center rounded-[26px] bg-[#f1f5f9] text-slate-900">
          <button type="button" onClick={() => onQuantityChange(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity" className="flex h-[52px] w-11 items-center justify-center disabled:opacity-30 focus-ring">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
          <span className="min-w-4 text-center text-[17px] font-bold tabular-nums" aria-label={`Quantity ${quantity}`}>{quantity}</span>
          <button type="button" onClick={() => onQuantityChange(quantity + 1)} disabled={quantity >= MAX_ORDER_QUANTITY} aria-label="Increase quantity" className="flex h-[52px] w-11 items-center justify-center disabled:opacity-30 focus-ring">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
        </div>
        <button type="button" onClick={onSubmit} disabled={disabled} className="h-[52px] flex-1 rounded-[26px] bg-accent-strong text-[16.5px] font-bold text-white shadow-elev-brand transition-transform duration-120 active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100 focus-ring">{label}</button>
      </div>
    </div>
  );
}
