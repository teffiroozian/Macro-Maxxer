"use client";
import { useEffect, useRef, useState } from "react";
import { DAILY_VALUES, percentDV } from "./nativeItemModel";
import type { Nutrition } from "@/types/nutrition";

type Row = { label: string; value: number | undefined; unit: string; dv?: number; bold?: boolean; sub?: boolean };

export default function NativeNutritionFactsSheet({ open, onClose, nutrition, title, subtitle }: {
  open: boolean; onClose: () => void; nutrition: Nutrition; title: string; subtitle?: string;
}) {
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus({ preventScroll: true }); };
  }, [open, onClose]);

  const rows: Row[] = [
    { label: "Total Fat", value: nutrition.totalFat, unit: "g", dv: DAILY_VALUES.totalFat, bold: true },
    { label: "Saturated Fat", value: nutrition.satFat, unit: "g", dv: DAILY_VALUES.satFat, sub: true },
    { label: "Trans Fat", value: nutrition.transFat, unit: "g", sub: true },
    { label: "Cholesterol", value: nutrition.cholesterol, unit: "mg", dv: DAILY_VALUES.cholesterol, bold: true },
    { label: "Sodium", value: nutrition.sodium, unit: "mg", dv: DAILY_VALUES.sodium, bold: true },
    { label: "Total Carbohydrate", value: nutrition.carbs, unit: "g", dv: DAILY_VALUES.carbs, bold: true },
    { label: "Dietary Fiber", value: nutrition.fiber, unit: "g", dv: DAILY_VALUES.fiber, sub: true },
    { label: "Total Sugars", value: nutrition.sugars, unit: "g", sub: true },
    { label: "Protein", value: nutrition.protein, unit: "g", dv: DAILY_VALUES.protein, bold: true },
  ].filter((row) => typeof row.value === "number" && Number.isFinite(row.value));

  return (
    <div className={`absolute inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <button type="button" tabIndex={-1} aria-label="Close nutrition facts" onClick={onClose}
        className={`absolute inset-0 bg-[rgba(15,23,42,0.42)] transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} />
      <div role="dialog" aria-modal="true" aria-label="Nutrition Facts"
        style={{ transform: open ? `translateY(${drag}px)` : "translateY(105%)", transitionDuration: drag ? "0ms" : undefined }}
        className="absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[32px] bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] transition-transform duration-[400ms] ease-[cubic-bezier(.3,.9,.3,1)] motion-reduce:transition-none">
        <div className="touch-none px-5 pb-3 pt-[10px]"
          onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
          onTouchMove={(e) => { if (startY.current !== null) setDrag(Math.max(0, e.touches[0].clientY - startY.current)); }}
          onTouchEnd={() => { const shouldClose = drag > 90; startY.current = null; setDrag(0); if (shouldClose) onClose(); }}>
          <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-[#d4d9e0]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-2xl font-extrabold leading-none tracking-[-0.03em] text-slate-900">Nutrition Facts</h2>
              <p className="mt-2 truncate text-[12.5px] text-slate-500">{title}{subtitle ? ` · ${subtitle}` : ""}</p>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] focus-ring">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8" stroke="#475569" strokeWidth="3" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 pb-[34px] pt-1.5">
          <div className="rounded-[20px] px-4 pb-4 pt-[14px] shadow-[0_0_0_1.5px_#0f172a]">
            <div className="flex justify-between text-[13px] font-bold text-slate-900"><span>Serving size</span><span>1 item</span></div>
            <div className="my-2 h-2 bg-slate-900" />
            <p className="text-[11.5px] font-bold text-slate-900">Amount per item</p>
            <div className="flex items-end justify-between border-b-[5px] border-slate-900 pb-1">
              <span className="text-[22px] font-extrabold text-slate-900">Calories</span>
              <span className="font-heading text-[32px] font-extrabold leading-none text-slate-900">{Math.round(nutrition.calories ?? 0).toLocaleString("en-US")}</span>
            </div>
            <p className="py-1 text-right text-[11px] font-bold text-slate-500">% Daily Value*</p>
            {rows.map((row) => (
              <div key={row.label} className={`flex justify-between border-t border-slate-200 py-[7px] text-sm text-slate-900 ${row.sub ? "pl-4 font-medium" : "font-extrabold"}`}>
                <span>{row.label} <span className="font-medium">{Math.round((row.value as number) * 10) / 10}{row.unit}</span></span>
                <span className="font-extrabold">{row.dv ? percentDV(row.value, row.dv) : ""}</span>
              </div>
            ))}
            <div className="h-[5px] bg-slate-900" />
            <p className="pt-2 text-[11px] leading-[1.5] text-slate-500">*Percent Daily Values are based on a 2,000 calorie diet. Includes your customizations; values for modified items are estimates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
