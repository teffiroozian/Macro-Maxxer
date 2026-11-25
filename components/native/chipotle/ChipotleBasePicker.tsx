import { ChevronRight } from "lucide-react";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { card, pressable } from "@/components/native/saved/savedStyles";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { CoreMacros } from "@/types/nutrition";
import type { BuildEntree, ReadyMadeGroup } from "./useChipotleBuild";

export type BaseCard = { id: BuildEntree; label: string; image: string; startsAt: CoreMacros | null; includes: string };
export type ReadyMadeCard = { id: ReadyMadeGroup; label: string; image: string; count: number; startsAt: CoreMacros | null };

const g = (value: number) => `${Math.round(value)}g`;

// Each base opens the builder; each ready-made group lists its items.
export default function ChipotleBasePicker({ bases, readyMade, onBuild, onMenu }: {
  bases: BaseCard[];
  readyMade: ReadyMadeCard[];
  onBuild: (id: BuildEntree) => void;
  onMenu: (id: ReadyMadeGroup) => void;
}) {
  return (
    <div className="px-[18px]">
      <SectionHeading id="chipotle-bases" title="Build your own" hint="Pick a base" />
      <ul aria-labelledby="chipotle-bases" className="grid grid-cols-2 gap-2.5">
        {bases.map((base) => (
          <li key={base.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onBuild(base.id)}
              aria-label={`Build a ${base.label}${base.startsAt ? `, starts at ${Math.round(base.startsAt.calories)} calories` : ""}`}
              className={`flex h-full w-full cursor-pointer flex-col rounded-[22px] px-2.5 pb-3 pt-2.5 text-left focus-ring ${card} ${pressable}`}
            >
              <RestaurantItemImage src={base.image} alt="" containerClassName="flex h-[78px] w-full items-center justify-center" fallback={<CutleryIcon className="size-7 text-slate-400" />} />
              <span className="mt-1.5 block text-center font-heading text-[15px] font-bold tracking-[-0.02em]">{base.label}</span>
              <StartsAt macros={base.startsAt} includes={base.includes} />
            </button>
          </li>
        ))}
      </ul>

      {readyMade.length ? (
        <>
          <SectionHeading id="chipotle-ready-made" title="Ready-made" hint="No building" />
          <ul aria-labelledby="chipotle-ready-made" className="flex flex-col gap-2.5">
            {readyMade.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => onMenu(group.id)}
                  aria-label={`${group.label}, ${group.count} items${group.startsAt ? `, starts at ${Math.round(group.startsAt.calories)} calories` : ""}`}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-[22px] py-2.5 pl-2.5 pr-3.5 text-left focus-ring ${card} ${pressable}`}
                >
                  <RestaurantItemImage src={group.image} alt="" containerClassName="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white" fallback={<CutleryIcon className="size-6 text-slate-400" />} />
                  <span className="block min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-base font-bold leading-5">{group.label}</span>
                      <span className="shrink-0 text-[13px] text-slate-500">{group.count} items</span>
                    </span>
                    {group.startsAt ? (
                      <span aria-hidden="true" className="mt-1.5 flex items-baseline gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs font-extrabold tabular-nums">
                        <span className="text-[11px] font-bold text-slate-500">Starts at</span>
                        <span className={`font-heading text-[14px] font-bold tracking-[-0.02em] ${macroColorTokens.calories.valueClassName}`}>{Math.round(group.startsAt.calories)}<span className="ml-0.5 font-sans text-[11px]">cal</span></span>
                        <span className="ml-auto flex gap-2">
                          <span className={macroColorTokens.protein.valueClassName}>{g(group.startsAt.protein)} P</span>
                          <span className={macroColorTokens.carbs.valueClassName}>{g(group.startsAt.carbs)} C</span>
                          <span className={macroColorTokens.totalFat.valueClassName}>{g(group.startsAt.totalFat)} F</span>
                        </span>
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={20} strokeWidth={2.4} className="shrink-0 text-slate-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function SectionHeading({ id, title, hint }: { id: string; title: string; hint: string }) {
  return (
    <div className="flex items-baseline px-1 pb-2.5 pt-[22px]">
      <h2 id={id} className="flex-1 text-xl font-bold">{title}</h2>
      <span className="text-sm font-semibold text-slate-500">{hint}</span>
    </div>
  );
}

function StartsAt({ macros, includes }: { macros: CoreMacros | null; includes: string }) {
  return (
    <span aria-hidden="true" className="mt-2.5 flex flex-1 flex-col rounded-[14px] bg-slate-50 px-2.5 py-[9px]">
      {macros ? (
        <>
          <span className="flex items-baseline justify-between text-[11px] font-bold text-slate-500">
            Starts at
            <span className={`font-heading text-[17px] font-bold tracking-[-0.02em] ${macroColorTokens.calories.valueClassName}`}>{Math.round(macros.calories)}<span className="ml-0.5 font-sans text-[11px]">cal</span></span>
          </span>
          <span className="mt-1.5 flex justify-between text-xs font-extrabold tabular-nums">
            <span className={macroColorTokens.protein.valueClassName}>{g(macros.protein)} P</span>
            <span className={macroColorTokens.carbs.valueClassName}>{g(macros.carbs)} C</span>
            <span className={macroColorTokens.totalFat.valueClassName}>{g(macros.totalFat)} F</span>
          </span>
        </>
      ) : <span className="text-[11px] font-bold text-slate-500">Varies by build</span>}
      <span className="mt-1.5 block border-t border-slate-200 pt-1.5 text-[11.5px] leading-4 text-slate-600">{includes}</span>
    </span>
  );
}
