"use client";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { formatScore, getProteinScore } from "@/lib/native/fullMenu";
import type { MenuItem } from "@/types/menu";
import NativeMacroRow from "./NativeMacroRow";
import { itemLabel } from "./NativeMenuItemRow";

const press = "block w-full text-left transition-transform duration-120 active:scale-[0.98] motion-reduce:active:scale-100 focus-ring";

export default function NativeMenuItemTile({ item, rank, onOpen, onAdd }: { item: MenuItem; rank: number; onOpen: () => void; onAdd: () => void }) {
  const nutrition = getDefaultMenuItemNutrition(item);
  const label = itemLabel(rank, item);
  return (
    <li className="min-w-0 rounded-[20px] border border-black/8 bg-white p-2 shadow-elev-2">
      <div className="relative">
        <button type="button" onClick={onOpen} aria-label={label} className={press}>
          <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="aspect-[1.2] overflow-hidden rounded-[14px] bg-slate-100" />
          <span aria-hidden="true" className="absolute left-[7px] top-[7px] flex h-[22px] items-center rounded-[11px] bg-white px-2 text-[11.5px] font-bold text-accent-strong shadow-[0_1px_4px_rgba(15,23,42,0.2)]">#{rank}</span>
        </button>
        <button type="button" onClick={onAdd} aria-label={`Add ${item.name}`} className="absolute bottom-0 right-0 flex size-11 items-center justify-center focus-ring">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="#047857" strokeWidth="3" strokeLinecap="round" /></svg>
          </span>
        </button>
      </div>
      <button type="button" onClick={onOpen} aria-label={label} className={press}>
        <span className="flex flex-col gap-[3px] px-1 pt-[9px]" aria-hidden="true">
          <span className="truncate text-sm font-bold text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500">{formatScore(getProteinScore(item))}g protein / 100 cal</span>
        </span>
        <span className="mt-3 block border-t border-slate-100 px-1 pb-1 pt-3"><NativeMacroRow nutrition={nutrition} variant="grid" /></span>
      </button>
    </li>
  );
}
