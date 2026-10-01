"use client";

import { Fragment, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Check, Flame, Gauge, Wheat, Droplets, Drumstick } from "lucide-react";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import {
  getNaturalRankDirection,
  getRankState,
  toRankSort,
  type RankMetric,
  type SortOption,
} from "@/lib/menuSections/sortOptions";

const metrics: Array<{ metric: RankMetric; label: string; icon: typeof Gauge; color: string }> = [
  { metric: "protein", label: "Protein", icon: Drumstick, color: "text-[#C2410C]" },
  { metric: "calories", label: "Calories", icon: Flame, color: "text-[#111318]" },
  { metric: "protein-score", label: "Protein Score", icon: Gauge, color: "text-[#047857]" },
  { metric: "carbs", label: "Carbs", icon: Wheat, color: "text-[#CA8A04]" },
  { metric: "fat", label: "Fat", icon: Droplets, color: "text-[#2563EB]" },
];

export default function RankSelector({ value, isOpen, onOpenChange, onChange }: {
  value: SortOption;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: SortOption) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = getRankState(value);
  const selected = metrics.find((option) => option.metric === state.metric) ?? metrics[0];
  const Icon = selected.icon;

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) onOpenChange(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [isOpen, onOpenChange]);

  return <div ref={ref} className="relative shrink-0">
    <button type="button" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => onOpenChange(!isOpen)} className={pillTriggerClassName({ className: isOpen ? "border-slate-900" : "" })}>
      <Icon className={`h-4 w-4 ${selected.color}`} strokeWidth={2.7} />
      <span>{state.direction === "highest" ? "Highest" : "Lowest"} {selected.label}</span>
      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    <div role="menu" aria-hidden={!isOpen} className={`absolute left-0 top-[calc(100%+8px)] z-[120] w-[360px] origin-top-left rounded-[18px] border border-black/10 bg-white p-1.5 shadow-[0_16px_32px_rgba(15,23,42,.16)] transition ${isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Rank by</div>
      {metrics.map((option) => {
        const active = state.metric === option.metric;
        const OptionIcon = option.icon;
        return <Fragment key={option.metric}>
          {option.metric === "carbs" ? <div className="mx-3 my-2 h-px bg-slate-200" aria-hidden="true" /> : null}
          <div className={`flex min-h-12 items-center rounded-xl ${active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
          <button type="button" role="menuitemradio" aria-checked={active} onClick={() => onChange(toRankSort(option.metric, getNaturalRankDirection(option.metric)))} className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 text-left text-[15px] font-medium focus-ring">
            <span className="w-[18px]">{active ? <Check className="h-[18px] w-[18px] text-[#047857]" strokeWidth={2.7} /> : null}</span>
            <OptionIcon className={`h-[18px] w-[18px] ${option.color}`} strokeWidth={2.7} />
            <span className={`flex-1 ${active ? "font-bold" : ""}`}>{option.label}</span>
          </button>
          {active ? <div className="flex shrink-0 items-center gap-2 pr-2">
            <span className="text-[13px] font-semibold text-slate-600">{state.direction === "highest" ? "Highest" : "Lowest"}</span>
            <div className="flex gap-0.5 rounded-full bg-slate-200 p-0.5">
              {(["highest", "lowest"] as const).map((direction) => {
                const DirectionIcon = direction === "highest" ? ArrowUp : ArrowDown;
                return <button key={direction} type="button" aria-label={`${direction === "highest" ? "Highest" : "Lowest"} ${option.label}`} aria-pressed={state.direction === direction} onClick={() => onChange(toRankSort(option.metric, direction))} className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ${state.direction === direction ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><DirectionIcon className="h-4 w-4" strokeWidth={3} /></button>;
              })}
            </div>
          </div> : null}
          </div>
        </Fragment>;
      })}
    </div>
  </div>;
}
