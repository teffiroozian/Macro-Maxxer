"use client";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { card, row } from "@/components/native/saved/savedStyles";
import { getNaturalRankDirection, getRankState, isDefaultOrderSort, SORT_OPTION_VALUES, toRankSort, type RankMetric, type SortOption } from "@/lib/menuSections/sortOptions";
import { METRIC_LABELS } from "@/lib/native/restaurantMenu";
import MenuSheet, { segment, segments } from "./MenuSheet";

const METRICS: RankMetric[] = ["protein", "calories", "protein-score", "carbs", "fat", "fiber"];
const DOTS: Record<RankMetric, string> = {
  protein: macroColorTokens.protein.segmentClassName,
  calories: macroColorTokens.calories.segmentClassName,
  "protein-score": "bg-accent",
  carbs: macroColorTokens.carbs.segmentClassName,
  fat: macroColorTokens.totalFat.segmentClassName,
  fiber: macroColorTokens.fiber.segmentClassName,
};

export default function MenuRankSheet({ sort, hasFiber, action, disabled, onChange, onClose }: {
  sort: SortOption;
  hasFiber: boolean;
  action: string;
  disabled: boolean;
  onChange: (sort: SortOption) => void;
  onClose: () => void;
}) {
  const byDefault = isDefaultOrderSort(sort);
  const { metric: active, direction } = getRankState(sort);
  const option = (key: string, label: string, on: boolean, dot: string, pick: () => void) => (
    <button key={key} type="button" role="radio" aria-checked={on} onClick={pick} className="flex h-[52px] w-full cursor-pointer items-center gap-3 text-left focus-ring">
      <span aria-hidden="true" className={`size-[22px] shrink-0 rounded-full ${on ? "border-[7px] border-accent-strong bg-white dark:border-accent" : "border-2 border-control bg-surface-card"}`} />
      <span aria-hidden="true" className={`size-[9px] shrink-0 rounded-full ${dot}`} />
      <span className={`text-base ${on ? "font-bold" : "font-medium"}`}>{label}</span>
    </button>
  );
  return (
    <MenuSheet title="Rank by" action={action} disabled={disabled} onReset={() => onChange(SORT_OPTION_VALUES.DEFAULT_ORDER)} onClose={onClose}>
      <div role="radiogroup" aria-label="Rank by" className={`rounded-[22px] px-3.5 ${card}`}>
        {option("default", "Menu order", byDefault, "bg-slate-300 dark:bg-slate-500", () => onChange(SORT_OPTION_VALUES.DEFAULT_ORDER))}
        {METRICS.filter((metric) => metric !== "fiber" || hasFiber).map((metric) => {
          const on = !byDefault && active === metric;
          return (
            <div key={metric} className={`${row} !border-t`}>
              {option(metric, METRIC_LABELS[metric], on, DOTS[metric], () => { if (!on) onChange(toRankSort(metric, getNaturalRankDirection(metric))); })}
              {on ? (
                <div role="radiogroup" aria-label={`${METRIC_LABELS[metric]} direction`} className={`mb-3.5 ${segments}`}>
                  {(["highest", "lowest"] as const).map((side) => <button key={side} type="button" role="radio" aria-checked={direction === side} onClick={() => onChange(toRankSort(metric, side))} className={segment(direction === side)}>{side === "highest" ? "Highest first" : "Lowest first"}</button>)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </MenuSheet>
  );
}
