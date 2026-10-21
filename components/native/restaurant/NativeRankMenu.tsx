"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { FullMenuMetric } from "@/lib/native/fullMenu";

const svg = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const METRIC_ICONS: Record<FullMenuMetric, (size?: number) => ReactNode> = {
  protein: (s = 17) => <svg {...svg} width={s} height={s}><path d="M14.5 4.5 19.5 9.5M5 19l2-6 6-6 4 4-6 6zM4 20l1.5-1.5" /></svg>,
  calories: (s = 17) => <svg {...svg} width={s} height={s}><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-1-5 1-8Z" /></svg>,
  score: (s = 17) => <svg {...svg} width={s} height={s}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  carbs: (s = 17) => <svg {...svg} width={s} height={s}><path d="M12 21V8M12 8c0-3 2-5 5-5 0 3-2 5-5 5ZM12 8C12 5 10 3 7 3c0 3 2 5 5 5ZM12 14c0-2 2-4 5-4 0 2-2 4-5 4ZM12 14c0-2-2-4-5-4 0 2 2 4 5 4Z" /></svg>,
  fat: (s = 17) => <svg {...svg} width={s} height={s}><path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11Z" /></svg>,
  fiber: (s = 17) => <svg {...svg} width={s} height={s}><path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14ZM5 19l8-8" /></svg>,
};

export default function NativeRankMenu({ metrics, selected, top, left, onSelect, onClose }: {
  metrics: { key: FullMenuMetric; label: string }[];
  selected: FullMenuMetric;
  top: number;
  left: number;
  onSelect: (metric: FullMenuMetric) => void;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const raf = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(raf); }, []);
  const option = (m: { key: FullMenuMetric; label: string }) => {
    const on = m.key === selected;
    return (
      <button key={m.key} type="button" role="option" aria-selected={on} onClick={() => (on ? onClose() : onSelect(m.key))} className={`flex min-h-11 items-center gap-[10px] rounded-[10px] px-3 text-left text-[15px] text-slate-900 focus-ring ${on ? "bg-slate-100 font-semibold" : "font-medium"}`}>
        <span className="text-slate-500">{METRIC_ICONS[m.key]()}</span>
        <span className="flex-1">{m.label}</span>
        {on ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> : null}
      </button>
    );
  };
  const first = metrics.filter((m) => m.key === "protein" || m.key === "calories" || m.key === "score");
  const rest = metrics.filter((m) => !first.includes(m));
  return (
    <>
      <div className="fixed inset-0 z-[96]" onClick={onClose} aria-hidden="true" />
      <div role="listbox" aria-label="Rank by" style={{ top, left }} className={`fixed z-[97] flex w-60 origin-top-left flex-col gap-0.5 rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-elev-3 transition-[opacity,transform] duration-150 ease-out motion-reduce:scale-100 ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        {first.map(option)}
        {rest.length ? <div className="mx-3 my-1.5 h-px bg-slate-200" role="separator" /> : null}
        {rest.map(option)}
      </div>
    </>
  );
}
