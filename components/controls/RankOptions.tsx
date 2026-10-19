"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Flame, Trophy, Wheat, Droplets, Drumstick, ListOrdered } from "lucide-react";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { proteinScoreColorTokens } from "@/components/nutrition/metricColors";
import FiberIcon from "@/components/nutrition/FiberIcon";
import { getNaturalRankDirection, getRankState, toRankSort, type RankMetric, type SortOption, type RankDirection } from "@/lib/menuSections/sortOptions";

const metrics: Array<{ metric: RankMetric; label: string; icon: typeof Trophy; color: string }> = [
  { metric: "protein", label: "Protein", icon: Drumstick, color: macroColorTokens.protein.valueClassName },
  { metric: "calories", label: "Calories", icon: Flame, color: macroColorTokens.calories.valueClassName },
  { metric: "protein-score", label: "Protein Score", icon: Trophy, color: proteinScoreColorTokens.value },
  { metric: "carbs", label: "Carbs", icon: Wheat, color: macroColorTokens.carbs.valueClassName },
  { metric: "fat", label: "Fat", icon: Droplets, color: macroColorTokens.totalFat.valueClassName },
  { metric: "fiber", label: "Fiber", icon: FiberIcon, color: "text-[#047857]" },
];

export function RankSelection({ value, colorful = false, showChevron = false, isOpen = false, displayDefault = true }: { value: SortOption; colorful?: boolean; showChevron?: boolean; isOpen?: boolean; displayDefault?: boolean }) {
  const state = getRankState(value);
  const selected = metrics.find((option) => option.metric === state.metric) ?? metrics[0];
  const Icon = displayDefault && value === "default-order" ? ListOrdered : selected.icon;
  const color = colorful || selected.metric === "protein-score" ? selected.color : selected.metric === "fiber" ? macroColorTokens.fiber.valueClassName : "text-slate-500";
  return <>
    <Icon className={`h-4 w-4 ${color}`} strokeWidth={2.7} />
    <span>{displayDefault && value === "default-order" ? "Default Order" : `${state.direction === "highest" ? "Highest" : "Lowest"} ${selected.label}`}</span>
    {showChevron ? <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} /> : null}
  </>;
}

// The existing rank menu body is shared by the desktop popover and mobile sheets.
export default function RankOptions({ value, onChange, desktop = false, colorful = false, isOpen = true, showDefault = false }: {
  value: SortOption; onChange: (value: SortOption) => void; desktop?: boolean; colorful?: boolean; isOpen?: boolean; showDefault?: boolean;
}) {
  const state = getRankState(value);
  const [hoverDirection, setHoverDirection] = useState<{ metric: RankMetric; direction: RankDirection } | null>(null);
  const choose = (metric: RankMetric, direction: RankDirection) => {
    setHoverDirection(null);
    onChange(toRankSort(metric, direction));
  };
  const content = <>
    {showDefault ? <button type="button" role="menuitemradio" aria-checked={value === "default-order"} onClick={() => onChange("default-order")} className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-medium focus-ring ${value === "default-order" ? "bg-slate-100" : "hover:bg-slate-50"}`}><ListOrdered className="h-[18px] w-[18px] text-slate-500" />Default Order</button> : null}
      {metrics.map((option) => {
        const active = (!showDefault || value !== "default-order") && state.metric === option.metric;
        const OptionIcon = option.icon;
        const iconColor = colorful || desktop || option.metric === "protein-score" ? option.color : option.metric === "calories" ? "text-black" : option.metric === "fiber" ? macroColorTokens.fiber.valueClassName : "text-slate-500";
        const direction = active ? state.direction : getNaturalRankDirection(option.metric);
        const displayedDirection = desktop && isOpen && hoverDirection?.metric === option.metric ? hoverDirection.direction : direction;
        return <Fragment key={option.metric}>
          {option.metric === "carbs" ? <div className="mx-3 my-2 h-px bg-slate-200" role="separator" /> : null}
          <div className={`group flex min-h-12 cursor-pointer items-center rounded-xl ${active ? "bg-slate-100" : "hover:bg-slate-50 lg:hover:bg-slate-100/30"}`} onClick={(event) => { if (desktop || (event.target as Element).closest("[data-rank-metric]")) choose(option.metric, getNaturalRankDirection(option.metric)); }}>
            <button type="button" data-rank-metric role="menuitemradio" aria-checked={active} className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 text-left text-[15px] font-medium lg:font-semibold focus-ring">
              <OptionIcon className={`h-[18px] w-[18px] ${iconColor}`} strokeWidth={2.7} />
              <span>{option.label}</span>
            </button>
            <div className={`${active ? "flex" : "hidden lg:flex"} shrink-0 items-center gap-2 pr-2 text-slate-600`}>
              <span className={`text-[13px] font-medium ${active ? "" : "text-slate-500/65 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}><span className="lg:hidden">{direction === "highest" ? "Highest" : "Lowest"}</span>
                <span className="hidden lg:grid">
                  <span aria-hidden={displayedDirection !== "highest"} className={`col-start-1 row-start-1 transition-opacity duration-100 motion-reduce:transition-none ${displayedDirection === "highest" ? "opacity-100" : "opacity-0"}`}>Highest</span>
                  <span aria-hidden={displayedDirection !== "lowest"} className={`col-start-1 row-start-1 transition-opacity duration-100 motion-reduce:transition-none ${displayedDirection === "lowest" ? "opacity-100" : "opacity-0"}`}>Lowest</span>
                </span>
              </span>
              <div className={`flex gap-0.5 rounded-full p-0.5 opacity-100 transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 ${active ? "bg-slate-200 lg:opacity-100" : "bg-slate-200/35 lg:opacity-0"}`}>
                {(["highest", "lowest"] as const).map((arrow) => {
                  const Arrow = arrow === "highest" ? ArrowUp : ArrowDown;
                  return <button key={arrow} type="button" onMouseEnter={() => { if (desktop) setHoverDirection({ metric: option.metric, direction: arrow }); }} onMouseLeave={() => { if (desktop) setHoverDirection(null); }} aria-label={`${arrow === "highest" ? "Highest" : "Lowest"} ${option.label}`} aria-pressed={active && state.direction === arrow} onClick={(event) => { event.stopPropagation(); choose(option.metric, arrow); }} className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full focus-ring ${active ? `hover:bg-slate-50 ${state.direction === arrow ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}` : "text-slate-500/55 hover:bg-slate-200/50 hover:text-slate-600/80"}`}><Arrow className="h-4 w-4" strokeWidth={3} /></button>;
                })}
              </div>
            </div>
          </div>
        </Fragment>;
      })}
  </>;
  return content;
}
