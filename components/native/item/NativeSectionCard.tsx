import type { ReactNode } from "react";

export const CARD_RING = "shadow-[0_0_0_1px_#e9edf2,0_6px_16px_-12px_rgba(15,23,42,0.25)]";
export const CARD_RING_SELECTED = "shadow-[0_0_0_2px_#047857,0_10px_24px_-12px_rgba(4,120,87,0.45)]";
export const ringTransition = "transition-shadow duration-200 motion-reduce:transition-none";

export function Radio({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 bg-white ${ringTransition} ${selected ? "border-accent-strong" : "border-slate-300"}`}>
      <span className={`size-2.5 rounded-full bg-accent-strong transition-opacity duration-200 motion-reduce:transition-none ${selected ? "opacity-100" : "opacity-0"}`} />
    </span>
  );
}

export function CheckBadge({ selected, size = 24, className = "" }: { selected: boolean; size?: number; className?: string }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size }} className={`absolute flex items-center justify-center rounded-full bg-accent-strong transition-opacity duration-200 motion-reduce:transition-none ${selected ? "opacity-100" : "opacity-0"} ${className}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export default function NativeSectionCard({ step, title, aside, children }: { step: number; title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-2 flex flex-col gap-4 rounded-[28px] bg-white pb-6 pt-[22px]">
      <div className="flex items-baseline gap-[10px] px-5">
        <span aria-hidden="true" className="font-heading text-[13px] font-bold text-slate-400">{String(step).padStart(2, "0")}</span>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-slate-900">{title}</h2>
        {aside ? <span className="ml-auto text-[12.5px] text-slate-500">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

export const railClass = "flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 pt-1 [scroll-padding:0_20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
