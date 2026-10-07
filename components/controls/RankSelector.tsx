"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Flame, Trophy, Wheat, Droplets, Drumstick } from "lucide-react";
import { pillTriggerClassName } from "@/components/controls/pillButton";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import FiberIcon from "@/components/nutrition/FiberIcon";
import ViewportMenu from "./ViewportMenu";
import { getNaturalRankDirection, getRankState, toRankSort, type RankMetric, type SortOption, type RankDirection } from "@/lib/menuSections/sortOptions";

const metrics: Array<{ metric: RankMetric; label: string; icon: typeof Trophy; color: string }> = [
  { metric: "protein", label: "Protein", icon: Drumstick, color: macroColorTokens.protein.valueClassName },
  { metric: "calories", label: "Calories", icon: Flame, color: macroColorTokens.calories.valueClassName },
  { metric: "protein-score", label: "Protein Score", icon: Trophy, color: "text-[#6366F1]" },
  { metric: "carbs", label: "Carbs", icon: Wheat, color: macroColorTokens.carbs.valueClassName },
  { metric: "fat", label: "Fat", icon: Droplets, color: macroColorTokens.totalFat.valueClassName },
  { metric: "fiber", label: "Fiber", icon: FiberIcon, color: "text-[#047857]" },
];

const desktopQuery = "(min-width: 1024px)";
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverDesktopSnapshot = () => false;

export default function RankSelector({ value, isOpen, onOpenChange, onChange }: {
  value: SortOption; isOpen: boolean; onOpenChange: (open: boolean) => void; onChange: (value: SortOption) => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);
  const [hoverDirection, setHoverDirection] = useState<{ metric: RankMetric; direction: RankDirection } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const state = getRankState(value);
  const selected = metrics.find((option) => option.metric === state.metric) ?? metrics[0];
  const Icon = selected.icon;
  const triggerIconColor = desktop ? selected.color : selected.metric === "protein-score" || selected.metric === "fiber" ? macroColorTokens.fiber.valueClassName : "text-slate-500";
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) onOpenChange(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onOpenChange(false); anchorRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [isOpen, onOpenChange]);
  const choose = (metric: RankMetric, direction: RankDirection) => {
    setHoverDirection(null);
    onChange(toRankSort(metric, direction));
    if (desktop) { onOpenChange(false); anchorRef.current?.focus(); }
  };
  return <div className="relative shrink-0">
    <button ref={anchorRef} type="button" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => { setHoverDirection(null); onOpenChange(!isOpen); }} onKeyDown={(event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault(); setHoverDirection(null); onOpenChange(true);
        requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[data-rank-metric]")?.focus());
      }
    }} className={pillTriggerClassName({ className: isOpen ? "border-slate-900" : "" })}>
      <Icon className={`h-4 w-4 ${triggerIconColor}`} strokeWidth={2.7} />
      <span>{state.direction === "highest" ? "Highest" : "Lowest"} {selected.label}</span>
      <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    <ViewportMenu open={isOpen} anchorRef={anchorRef} menuRef={menuRef} width={360} allowFlip={!desktop} label="Rank by" onKeyDown={(event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-rank-metric]") ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault(); buttons[(current + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    }}>
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">Rank by</div>
      {metrics.map((option) => {
        const active = state.metric === option.metric;
        const OptionIcon = option.icon;
        const iconColor = desktop ? option.color : option.metric === "calories" ? "text-black" : option.metric === "protein-score" || option.metric === "fiber" ? macroColorTokens.fiber.valueClassName : "text-slate-500";
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
    </ViewportMenu>
  </div>;
}
