"use client";
import { useRef, useState } from "react";
import { MENU_METRICS, metricLabel, type FullMenuDirection, type FullMenuLayout, type FullMenuMetric } from "@/lib/native/fullMenu";
import NativeLayoutToggle from "./NativeLayoutToggle";
import NativeRankMenu, { METRIC_ICONS } from "./NativeRankMenu";
import NativeSortDirectionButton from "./NativeSortDirectionButton";

export default function NativeMenuControlsRow({ metric, direction, layout, filterCount, hasFiber, filtersButtonRef, onMetric, onToggleDirection, onLayout, onOpenFilters }: {
  metric: FullMenuMetric;
  direction: FullMenuDirection;
  layout: FullMenuLayout;
  filterCount: number;
  hasFiber: boolean;
  filtersButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMetric: (metric: FullMenuMetric) => void;
  onToggleDirection: () => void;
  onLayout: (layout: FullMenuLayout) => void;
  onOpenFilters: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const open = anchor !== null;
  const close = () => { setAnchor(null); triggerRef.current?.focus(); };
  const toggle = () => {
    if (open) return close();
    const row = rowRef.current?.getBoundingClientRect();
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (row && trigger) setAnchor({ top: row.bottom + 2, left: trigger.left });
  };
  return (
    <div ref={rowRef} className="sticky top-[calc(var(--safe-area-top)+52px)] z-[3] flex h-14 items-center gap-1 bg-white pl-2 pr-[14px] shadow-[0_1px_0_#f1f5f9]">
      <button ref={filtersButtonRef} type="button" onClick={onOpenFilters} aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"} className="relative flex size-11 shrink-0 items-center justify-center rounded-full active:bg-slate-100 focus-ring">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" /></svg>
        {filterCount > 0 ? <span aria-hidden="true" className="absolute right-[3px] top-[3px] flex h-4 min-w-4 items-center justify-center rounded-lg bg-accent-strong px-1 text-[10px] font-bold text-white shadow-[0_0_0_2px_#fff]">{filterCount}</span> : null}
      </button>
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-slate-200" />
      <button ref={triggerRef} type="button" onClick={toggle} aria-haspopup="listbox" aria-expanded={open} className="flex h-11 items-center gap-1.5 rounded-[10px] px-2 active:bg-slate-50 focus-ring">
        <span className="text-slate-500">{METRIC_ICONS[metric](16)}</span>
        <span className="whitespace-nowrap text-[15px] font-semibold text-slate-900">{metricLabel(metric)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <NativeSortDirectionButton direction={direction} onToggle={onToggleDirection} />
      <div className="flex-1" />
      <NativeLayoutToggle layout={layout} onChange={onLayout} />
      {open && anchor ? (
        <NativeRankMenu
          metrics={MENU_METRICS.filter((m) => m.key !== "fiber" || hasFiber)}
          selected={metric}
          top={anchor.top}
          left={anchor.left}
          onClose={close}
          onSelect={(next) => { onMetric(next); close(); }}
        />
      ) : null}
    </div>
  );
}
