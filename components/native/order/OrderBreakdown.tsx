"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatWhole } from "@/components/native/cart/cartPresentation";
import { card, muted, soft } from "@/components/native/saved/savedStyles";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";
import type { OrderTotals } from "./OrderMacroBar";

const MACROS = [["calories", "Calories", ""], ["protein", "Protein", "g"], ["carbs", "Carbs", "g"], ["totalFat", "Fat", "g"]] as const;

export default function OrderBreakdown({ items, totals }: { items: MacroBreakdownItem[]; totals: OrderTotals }) {
  const [macro, setMacro] = useState<keyof OrderTotals>("protein");
  const [open, setOpen] = useState<string | null>(null);
  const unit = macro === "calories" ? "" : "g";
  const color = macroColorTokens[macro];
  return (
    <section className={`rounded-3xl p-4 ${card}`}>
      <div role="group" aria-label="Show breakdown by" className="grid h-11 grid-cols-4 rounded-2xl bg-slate-200/70 p-1 dark:bg-app-background">
        {MACROS.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={macro === key} onClick={() => setMacro(key)} className={`flex min-w-0 cursor-pointer items-center justify-center rounded-xl text-sm focus-ring ${macro === key ? `bg-white font-bold shadow-elev-1 dark:bg-surface-hover ${macroColorTokens[key].valueClassName}` : `font-semibold ${soft}`}`}>{label}</button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-3.5">
        {[...items].sort((a, b) => b[macro] - a[macro]).map((item) => {
          const share = totals[macro] > 0 ? Math.round((item[macro] / totals[macro]) * 100) : 0;
          const parts = item.nestedItems && item.nestedItems.length > 1 ? [...item.nestedItems].sort((a, b) => b[macro] - a[macro]) : [];
          const expanded = open === item.id;
          const noun = item.nestedKind === "items" ? "items" : "ingredients";
          return (
            <li key={item.id}>
              <div className="flex items-center gap-3">
                <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} fallbackClassName="object-cover" containerClassName="size-11 shrink-0 overflow-hidden rounded-[13px] bg-slate-100 dark:bg-image-placeholder" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5">{item.name}</span>
                    <span className={`shrink-0 font-heading text-sm font-bold tabular-nums ${color.valueClassName}`}>{formatWhole(item[macro], unit)}</span>
                    <span className={`w-9 shrink-0 text-right text-[13px] tabular-nums ${muted}`}>{share}%</span>
                  </p>
                  <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-surface-hover"><div className={`h-full rounded-full ${color.segmentClassName}`} style={{ width: `${Math.min(100, Math.max(0, share))}%` }} /></div>
                </div>
              </div>
              {parts.length ? (
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)} className="ml-14 flex h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-accent-strong active:opacity-70 focus-ring">
                  {expanded ? `Hide ${noun}` : `Show ${noun}`}
                  <ChevronDown size={15} strokeWidth={2.4} className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              ) : null}
              {expanded ? (
                <ul className="ml-14 flex flex-col gap-2 pb-1">
                  {parts.map((part) => (
                    <li key={part.id} className="flex items-center gap-2.5">
                      <RestaurantItemImage src={part.image} alt="" imagePresentation={part.imagePresentation} fallbackClassName="object-contain" containerClassName="size-8 shrink-0 overflow-hidden rounded-[10px] bg-slate-100 dark:bg-image-placeholder" />
                      <span className={`min-w-0 flex-1 truncate text-sm ${soft}`}>{part.name}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatWhole(part[macro], unit)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
