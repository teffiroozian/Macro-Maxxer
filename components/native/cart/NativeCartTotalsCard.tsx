"use client";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatWhole } from "./cartPresentation";

type Totals = { calories: number; protein: number; carbs: number; totalFat: number };
const TILES = [["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;

export default function NativeCartTotalsCard({ totals, empty, onExport }: { totals: Totals; empty: boolean; onExport: () => void }) {
  return (
    <div className="mx-[18px] mt-4 rounded-[22px] border border-black/8 bg-white p-4 shadow-elev-1">
      <div className={empty ? "opacity-40" : undefined} aria-live="polite">
        <p className="text-[12.5px] font-semibold text-slate-500">Total calories</p>
        <p className="font-heading mt-1 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums text-[#111318]">{empty ? "—" : formatWhole(totals.calories)}</p>
        <div className="mt-[14px] grid grid-cols-3 gap-2">
          {TILES.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-[5px] rounded-[14px] bg-slate-50 px-3 py-[10px]">
              <span className="flex items-center gap-[5px] text-[11.5px] font-semibold text-slate-500">
                <span aria-hidden="true" className={`size-1.5 rounded-full ${macroColorTokens[key].segmentClassName.split(" ")[0]}`} />{label}
              </span>
              <span className={`font-heading text-[17px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{empty ? "—" : formatWhole(totals[key], "g")}</span>
            </div>
          ))}
        </div>
      </div>
      {empty ? null : (
        <button type="button" onClick={onExport} className="mt-[14px] flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-accent text-base font-bold text-white transition-colors active:bg-accent-strong focus-ring">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Export Order
        </button>
      )}
    </div>
  );
}
