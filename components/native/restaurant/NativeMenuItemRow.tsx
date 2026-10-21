"use client";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { getProteinScore } from "@/lib/native/fullMenu";
import type { MenuItem } from "@/types/menu";
import NativeMacroRow from "./NativeMacroRow";
import NativeProteinScorePill from "./NativeProteinScorePill";

const press = "transition-transform duration-120 active:scale-[0.98] motion-reduce:active:scale-100 focus-ring";

export function itemLabel(rank: number, item: MenuItem) {
  const n = getDefaultMenuItemNutrition(item);
  return `#${rank} ${item.name}, ${Math.round(n.calories ?? 0)} calories, ${Math.round(n.protein ?? 0)} grams protein`;
}

export default function NativeMenuItemRow({ item, rank, onOpen, onAdd }: { item: MenuItem; rank: number; onOpen: () => void; onAdd: () => void }) {
  const nutrition = getDefaultMenuItemNutrition(item);
  return (
    <li className="relative rounded-[20px] border border-black/8 bg-white shadow-elev-2">
      <button type="button" onClick={onOpen} aria-label={itemLabel(rank, item)} className={`flex w-full flex-col gap-3 rounded-[20px] p-[14px] text-left ${press}`}>
        <span className="flex items-start gap-3 pr-11" aria-hidden="true">
          <span className="relative block size-[68px] shrink-0">
            <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="size-[68px] overflow-hidden rounded-[14px] bg-slate-100" />
            <span className="absolute -left-1.5 -top-1.5 flex h-[22px] min-w-6 items-center justify-center rounded-[11px] bg-white px-[7px] text-[11.5px] font-bold text-accent-strong shadow-[0_1px_4px_rgba(15,23,42,0.2)]">#{rank}</span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px] pt-0.5">
            <span className="line-clamp-2 text-base font-bold leading-[1.25] text-slate-900">{item.name}</span>
            <span className="mt-[3px]"><NativeProteinScorePill score={getProteinScore(item)} /></span>
          </span>
        </span>
        <span className="border-t border-slate-100 pt-3"><NativeMacroRow nutrition={nutrition} variant="standard" /></span>
      </button>
      <button type="button" onClick={onAdd} aria-label={`Add ${item.name}`} className="absolute right-[3px] top-[9px] flex size-11 items-center justify-center focus-ring">
        <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-strong">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>
        </span>
      </button>
    </li>
  );
}
