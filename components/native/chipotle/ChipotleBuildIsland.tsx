"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { MAX_ORDER_QUANTITY } from "@/components/native/item/NativeOrderIsland";
import { formatMacro, MACRO_KEYS, MACRO_LABELS, scaleMacros } from "@/components/native/item/nativeItemModel";
import NativeProteinScorePill from "@/components/native/restaurant/NativeProteinScorePill";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { getProteinPer100Calories } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import { nutritionOf, type ChipotleBuild } from "./useChipotleBuild";

const NOUNS: Record<string, string> = { bowl: "bowl", burrito: "burrito", quesadilla: "quesadilla", salad: "salad", "kids-meal": "kid's meal" };

// The floating macro card. Tapping its top row opens the review in place.
export default function ChipotleBuildIsland({ build, onAdd }: { build: ChipotleBuild; onAdd: (quantity: number) => void }) {
  const [expanded, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const items = build.selectedIds.flatMap((id) => { const item = build.byId.get(id); return item ? [item] : []; });
  const total = scaleMacros(build.macros, quantity);
  const title = build.entree === "tacos" ? `${build.count} ${build.count === 1 ? "taco" : "tacos"}` : `Your ${NOUNS[build.entree] ?? "build"}`;
  const empty = items.length === 0;
  const open = expanded && !empty;
  const score = build.macros.calories > 0 ? getProteinPer100Calories(build.macros.protein, build.macros.calories) : undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = () => {
    onAdd(quantity);
    setQuantity(1);
    setOpen(false);
  };

  return (
    <>
      {open ? <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-[29] bg-slate-900/40" /> : null}
      <section aria-label={open ? `${title}, review` : title} className="fixed inset-x-[10px] bottom-[calc(var(--native-nav-bottom)+72px)] z-30 mx-auto flex max-w-[464px] flex-col gap-2.5 rounded-[30px] bg-white px-2 pb-2 pt-2 text-slate-900 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35),0_0_0_1px_#eef2f6]">
        <button type="button" aria-expanded={open} disabled={empty} onClick={() => setOpen(!open)} className="flex h-11 cursor-pointer items-center gap-2 rounded-[22px] pl-1.5 pr-2 text-left disabled:cursor-default focus-ring">
          {open ? null : (
            <span aria-hidden="true" className="flex pl-2">
              {items.slice(0, 5).map((item) => (
                <RestaurantItemImage key={item.id} src={item.image} alt="" containerClassName="-ml-2 size-7 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-[0_1px_2px_rgb(15_23_42/0.2)]" fallback={<CutleryIcon className="size-3 text-slate-400" />} />
              ))}
            </span>
          )}
          <span className={`min-w-0 flex-1 truncate ${open ? "pl-1.5 font-heading text-[17px] font-bold tracking-[-0.02em]" : "text-sm font-bold"}`}>
            {open ? title : empty ? `${title} · Pick your ingredients` : `${title} · ${items.length} ${items.length === 1 ? "item" : "items"}`}
          </span>
          {empty ? null : (
            <span className="flex shrink-0 items-center gap-[3px] text-sm font-extrabold text-accent-strong">
              {open ? "Hide" : "Review"}{open ? <ChevronDown size={16} strokeWidth={2.8} aria-hidden="true" /> : <ChevronUp size={16} strokeWidth={2.8} aria-hidden="true" />}
            </span>
          )}
        </button>

        {open ? (
          <div className="-mt-1 overflow-y-auto overscroll-contain px-2" style={{ maxHeight: "max(180px, calc(var(--app-viewport-height) - var(--safe-area-top) - var(--native-nav-bottom) - 400px))" }}>
            {score !== undefined ? (
              <div className="mb-1.5 flex items-center gap-2.5 rounded-2xl bg-accent-soft px-3 py-2.5">
                <span className="flex-1 text-sm font-bold text-emerald-900">Protein Score</span>
                <NativeProteinScorePill score={score} />
              </div>
            ) : null}
            <ul aria-label="In your build">
              {items.map((item) => <ReviewRow key={item.id} item={item} build={build} />)}
            </ul>
          </div>
        ) : null}

        <div className="mx-2 h-px bg-[#eef2f6]" />
        <div className="flex" aria-live="polite" aria-atomic="true" aria-label={`${Math.round(total.calories)} calories, ${Math.round(total.protein)} grams protein`}>
          {MACRO_KEYS.map((key, index) => (
            <div key={key} className={`flex flex-1 flex-col items-center gap-1 ${index > 0 ? "border-l border-[#eef2f6]" : ""}`}>
              <span className={`font-heading text-[15px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatMacro(key, total[key])}</span>
              <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.06em] text-slate-500">{MACRO_LABELS[key]}</span>
            </div>
          ))}
        </div>
        {quantity > 1 ? <p className="-mt-1 text-center text-[11px] font-semibold text-slate-400">Total for {quantity}</p> : null}
        <div className="flex gap-1.5">
          <div className="flex h-[52px] items-center rounded-[26px] bg-[#f1f5f9]">
            <button type="button" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity" className="flex h-[52px] w-11 cursor-pointer items-center justify-center disabled:opacity-30 focus-ring">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            </button>
            <span className="min-w-4 text-center text-[17px] font-bold tabular-nums" aria-label={`Quantity ${quantity}`}>{quantity}</span>
            <button type="button" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= MAX_ORDER_QUANTITY} aria-label="Increase quantity" className="flex h-[52px] w-11 cursor-pointer items-center justify-center disabled:opacity-30 focus-ring">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            </button>
          </div>
          <button type="button" onClick={submit} disabled={empty} className="h-[52px] flex-1 cursor-pointer rounded-[26px] bg-accent-strong text-[16.5px] font-bold text-white shadow-elev-brand transition-transform duration-120 active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100 focus-ring">Add to order</button>
        </div>
      </section>
    </>
  );
}

function ReviewRow({ item, build }: { item: MenuItem; build: ChipotleBuild }) {
  const id = item.id ?? "";
  const nutrition = nutritionOf(item);
  const control = build.portionControl(item);
  const fixed = build.isLocked(id) || build.isShell(id);
  const value = (key: "calories" | "protein" | "carbs" | "totalFat") => Math.round(nutrition[key] ?? 0);
  return (
    <li className="flex items-center gap-2.5 border-t border-[#eef2f6] py-2 first:border-t-0">
      <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100" fallback={<CutleryIcon className="size-4 text-slate-400" />} />
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-bold">{item.name}</span>
        <span className="mt-0.5 flex gap-2 text-xs font-extrabold tabular-nums">
          <span className={macroColorTokens.calories.valueClassName}>{value("calories")} cal</span>
          <span className={macroColorTokens.protein.valueClassName}>{value("protein")} P</span>
          <span className={macroColorTokens.carbs.valueClassName}>{value("carbs")} C</span>
          <span className={macroColorTokens.totalFat.valueClassName}>{value("totalFat")} F</span>
        </span>
      </span>
      {control && !control.disabled ? (
        <label className="relative flex h-7 shrink-0 items-center gap-[3px] rounded-full bg-slate-100 pl-2.5 pr-2 text-[12.5px] font-extrabold text-slate-700 focus-within:ring-2 focus-within:ring-accent">
          {build.portionLabel(item)}<ChevronDown size={11} strokeWidth={3} aria-hidden="true" />
          <select aria-label={`${item.name} portion`} value={control.selected} onChange={(event) => build.setPortion(item, event.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
            {control.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      ) : control?.disabled ? (
        <span className="flex h-7 shrink-0 items-center rounded-full bg-slate-100 px-2.5 text-[12.5px] font-extrabold text-slate-700">Half</span>
      ) : fixed ? (
        <span className="flex h-7 shrink-0 items-center rounded-full bg-slate-100 px-2.5 text-[12.5px] font-extrabold text-slate-500">Included</span>
      ) : null}
      {fixed ? <span aria-hidden="true" className="w-7 shrink-0" /> : (
        <button type="button" onClick={() => build.toggle(item)} aria-label={`Remove ${item.name}`} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 active:bg-slate-100 focus-ring"><X size={15} strokeWidth={2.6} aria-hidden="true" /></button>
      )}
    </li>
  );
}
