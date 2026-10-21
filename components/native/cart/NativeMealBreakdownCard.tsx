"use client";
import { useState } from "react";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import MacroSplitDetails from "@/components/nutrition/MacroSplitDetails";
import ProteinScoreDetails from "@/components/nutrition/ProteinScoreDetails";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import { getCartItemImagePresentation, resolveCartItemMacroBreakdown } from "@/lib/cart/cartItemLookup";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";
import type { CartItem } from "@/types/cart";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";
import { macroSplitWidths, formatWhole } from "./cartPresentation";

type Totals = { calories: number; protein: number; carbs: number; totalFat: number };
const divider = "border-t border-black/[0.06]";
const chevron = <svg width="16" height="16" viewBox="0 0 9 15" fill="none" aria-hidden="true"><path d="m1.5 1.5 6 6-6 6" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function NativeMealBreakdownCard({ items, totals, onPreviewItem }: { items: CartItem[]; totals: Totals; onPreviewItem: (item: CartItem) => void }) {
  const [scoreOpen, setScoreOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const breakdownItems: MacroBreakdownItem[] = items.map((item) => {
    const q = Math.max(item.quantity, 1);
    const breakdown = resolveCartItemMacroBreakdown(item);
    return {
      id: item.id, name: formatCartItemName(item), image: item.image, imagePresentation: getCartItemImagePresentation(item),
      calories: item.nutritionPerItem.calories * q, protein: item.nutritionPerItem.protein * q,
      carbs: item.nutritionPerItem.carbs * q, totalFat: item.nutritionPerItem.totalFat * q,
      nestedKind: breakdown.kind,
      nestedItems: breakdown.entries.map((e) => ({ ...e, calories: e.calories * q, protein: e.protein * q, carbs: e.carbs * q, totalFat: e.totalFat * q })),
    };
  });
  const score = getProteinPer100Calories(totals.protein, totals.calories);
  const tier = typeof score === "number" ? getProteinScoreTier(score) : undefined;
  const style = tier ? proteinScoreTierStyles[tier] : undefined;
  const widths = macroSplitWidths(totals);
  const segments = [["Protein", "protein", "#c2410c"], ["Carbs", "carbs", "#ca8a04"], ["Fat", "totalFat", "#2563eb"]] as const;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-[18px]">
      <h3 className="text-[22px] font-bold text-slate-900">Meal Breakdown</h3>
      <p className="mt-4 text-[13px] text-slate-500">Items</p>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onPreviewItem(item)} className="flex w-full items-center gap-3 rounded-xl border border-black/10 px-3 py-2 text-left focus-ring">
              <RestaurantItemImage src={item.image} alt="" imagePresentation={getCartItemImagePresentation(item)} fallbackClassName="object-contain p-1" containerClassName="size-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-50" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{formatCartItemName(item)}</span>
                <span className="block truncate text-xs text-slate-500">{summarizeItem(item) || "Standard"}</span>
              </span>
              {item.quantity > 1 ? <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-black/60">×{item.quantity}</span> : null}
            </button>
          </li>
        ))}
      </ul>

      {typeof score === "number" && tier && style ? (
        <button type="button" onClick={() => setScoreOpen(true)} aria-haspopup="dialog" className={`mt-3 block w-full pt-2 text-left ${divider} focus-ring`}>
          <span className="flex items-center justify-between py-[14px] pb-2 text-[13px] text-slate-500">Protein Score {chevron}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-[10px] text-xs ${style.chip}`}>
            <span className={`flex size-4 items-center justify-center rounded-full ${style.iconWrap} ${style.icon}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </span>
            <span className={`font-bold ${style.value}`}>{(Math.round(score * 10) / 10).toFixed(1)}g protein</span>
            <span className={style.supporting}>/ 100 cal</span>
          </span>
        </button>
      ) : null}

      <button type="button" onClick={() => setSplitOpen(true)} aria-haspopup="dialog" className={`mt-3 block w-full pt-2 text-left ${divider} focus-ring`}>
        <span className="flex items-center justify-between pt-[14px] text-[13px] text-slate-500">Macro Split {chevron}</span>
        <span className="mt-2 flex h-12 gap-1.5 rounded-xl border border-black/10 bg-[#f1f5f9] p-1.5" aria-label="Macro split">
          {segments.map(([label, key, color]) => (
            <span key={key} className="flex items-center justify-center overflow-hidden whitespace-nowrap rounded-lg text-[11px] font-semibold text-white" style={{ width: `${widths[key]}%`, background: color }}>
              {label} {formatWhole(totals[key], "g")}
            </span>
          ))}
        </span>
      </button>

      {tier && typeof score === "number" && scoreOpen ? (
        <ProteinScoreDetails open onClose={() => setScoreOpen(false)} score={score} protein={totals.protein} calories={totals.calories} name="Meal Breakdown" items={breakdownItems} />
      ) : null}
      {splitOpen ? <MacroSplitDetails open onClose={() => setSplitOpen(false)} totals={totals} items={breakdownItems} /> : null}
    </div>
  );
}
