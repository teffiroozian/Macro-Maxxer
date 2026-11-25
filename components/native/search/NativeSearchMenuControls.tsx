import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, LayoutGrid, Rows3, SlidersHorizontal } from "lucide-react";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { MENU_METRICS, type FullMenuMetric } from "@/lib/native/fullMenu";
import { nextRanking, type SearchRanking } from "@/lib/native/searchResults";
import type { NativeMenuLayout } from "./NativeLayoutToggle";

const METRIC_DOTS: Record<FullMenuMetric, string> = {
  calories: macroColorTokens.calories.segmentClassName,
  protein: macroColorTokens.protein.segmentClassName,
  carbs: macroColorTokens.carbs.segmentClassName,
  fat: macroColorTokens.totalFat.segmentClassName,
  fiber: macroColorTokens.fiber.segmentClassName,
  score: "bg-accent",
};

const ORDER: FullMenuMetric[] = ["calories", "protein", "carbs", "fat", "score", "fiber"];
const METRICS = ORDER.map((key) => ({ key, label: MENU_METRICS.find((metric) => metric.key === key)?.label ?? key }));
const iconButton = "relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-700 active:bg-slate-900/[.06] dark:text-slate-300 dark:active:bg-surface-hover focus-ring";

export default function NativeSearchMenuControls({ ranking, layout, filterCount, filtersButtonRef, onRanking, onLayout, onOpenFilters }: {
  ranking: SearchRanking;
  layout: NativeMenuLayout;
  filterCount: number;
  filtersButtonRef: React.RefObject<HTMLButtonElement | null>;
  onRanking: (ranking: SearchRanking) => void;
  onLayout: (layout: NativeMenuLayout) => void;
  onOpenFilters: () => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const active = ranking?.metric ?? "best";
  useEffect(() => {
    const track = rail.current;
    const pill = track?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (!track || !pill) return;
    const left = pill.offsetLeft - track.offsetLeft;
    if (left < track.scrollLeft || left + pill.offsetWidth > track.scrollLeft + track.clientWidth) {
      track.scrollLeft = left - (track.clientWidth - pill.offsetWidth) / 2;
    }
  }, [active]);
  const pill = (on: boolean) => `relative flex h-9 shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full bg-surface-card px-3 text-[15px] before:absolute before:-inset-y-1 before:inset-x-0 focus-ring ${on ? "font-bold shadow-[inset_0_0_0_2px_var(--product-accent)]" : "font-medium shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] dark:shadow-[inset_0_0_0_1px_var(--border-hairline)]"}`;
  const nextLayout = layout === "list" ? "grid" : "list";

  return (
    <div className="flex items-center gap-1 pl-2 pr-2 pt-2">
      <button ref={filtersButtonRef} type="button" onClick={onOpenFilters} aria-label={filterCount ? `Filters, ${filterCount} active` : "Filters"} className={iconButton}>
        <SlidersHorizontal size={20} strokeWidth={2.2} aria-hidden="true" />
        {filterCount ? <span aria-hidden="true" className="absolute right-0 top-0.5 flex size-[18px] items-center justify-center rounded-full bg-accent-strong text-[11px] font-bold text-white dark:bg-accent dark:text-slate-950">{filterCount}</span> : null}
      </button>
      <div ref={rail} role="group" aria-label="Rank by" className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-pressed={!ranking} onClick={() => onRanking(null)} className={pill(!ranking)}>Best match</button>
        {METRICS.map(({ key, label }) => {
          const on = ranking?.metric === key;
          const high = ranking?.direction === "high";
          const Arrow = high ? ArrowDown : ArrowUp;
          return (
            <button key={key} type="button" aria-pressed={on} aria-label={on ? `${label}, ${high ? "highest" : "lowest"} first. Tap to reverse` : `Rank by ${label}`} onClick={() => onRanking(nextRanking(ranking, key))} className={pill(on)}>
              <span aria-hidden="true" className={`size-2 rounded-full ${METRIC_DOTS[key]}`} />
              {label}
              {on ? <Arrow size={14} strokeWidth={3} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onLayout(nextLayout)} aria-label={`Show as ${nextLayout}`} className={iconButton}>
        {nextLayout === "grid" ? <LayoutGrid size={20} strokeWidth={2.2} aria-hidden="true" /> : <Rows3 size={20} strokeWidth={2.2} aria-hidden="true" />}
      </button>
    </div>
  );
}
