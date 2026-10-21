"use client";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import Dialog from "@/components/ui/Dialog";
import { applyNutritionFilters, CALORIE_STEPS, countNutritionFilters, PILL_TIERS, PROTEIN_STEPS, SCORE_TIERS, type FullMenuNutritionFilters } from "@/lib/native/fullMenu";
import type { MenuItem } from "@/types/menu";
import { BoltIcon } from "./NativeProteinScorePill";

export type MenuPreset = { id: string; label: string; icon: LucideIcon; items: MenuItem[] };
export type MenuFilterState = { presetId: string; nutrition: FullMenuNutritionFilters };

function Segments({ label, value, summary, steps, format, onChange }: {
  label: string; value: number | undefined; summary: string; steps: number[]; format: (n: number) => string; onChange: (v: number | undefined) => void;
}) {
  const options = [undefined, ...steps];
  return (
    <div className="py-3">
      <div className="mb-2 flex items-baseline justify-between"><span className="text-[15px] font-bold text-slate-900">{label}</span><span className="text-sm font-semibold text-slate-600">{summary}</span></div>
      <div role="radiogroup" aria-label={label} className="grid gap-0 rounded-xl bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const on = option === value;
          return (
            <button key={option ?? "any"} type="button" role="radio" aria-checked={on} onClick={() => onChange(option)} className={`h-8 rounded-lg text-xs font-semibold focus-ring ${on ? "border border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "border border-transparent text-slate-600"}`}>
              {option === undefined ? "Any" : format(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NativeFiltersSheet({ presets, defaultPresetId, applied, onApply, onClose }: {
  presets: MenuPreset[];
  defaultPresetId: string;
  applied: MenuFilterState;
  onApply: (next: MenuFilterState) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MenuFilterState>(applied);
  const [shown, setShown] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const raf = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(raf); }, []);
  const preset = presets.find((p) => p.id === draft.presetId) ?? presets[0];
  const count = applyNutritionFilters(preset?.items ?? [], draft.nutrition).length;
  const active = countNutritionFilters(draft.nutrition) + (draft.presetId !== defaultPresetId ? 1 : 0);
  const set = (patch: FullMenuNutritionFilters) => setDraft((d) => ({ ...d, nutrition: { ...d.nutrition, ...patch } }));
  const n = draft.nutrition;
  const nSet = countNutritionFilters(n);
  const header = (title: string, summary: string) => (
    <div className="flex min-h-14 items-center justify-between"><h3 className="font-heading text-xl font-bold text-slate-900">{title}</h3><span className="text-[13px] font-medium text-slate-500">{summary}</span></div>
  );
  return (
    <Dialog onClose={onClose} titleId="native-filters-title" initialFocusRef={closeRef} presentation="bottom-sheet" panelClassName={`!flex max-h-[88%] !rounded-b-none !rounded-t-[28px] !p-0 !px-0 !pt-0 !pb-0 shadow-[0_-12px_40px_rgba(15,23,42,0.2)] transition-transform duration-[250ms] ease-out motion-reduce:transition-none ${shown ? "translate-y-0" : "translate-y-full"} flex-col`}>
      <div className="flex h-6 shrink-0 items-center justify-center" aria-hidden="true"><span className="h-1 w-10 rounded-sm bg-slate-300" /></div>
      <div className="flex shrink-0 items-center gap-2 px-5 py-2">
        <h2 id="native-filters-title" className="font-heading text-2xl font-bold text-slate-900">Filters</h2>
        {active > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-strong px-1.5 text-xs font-bold text-white">{active}</span> : null}
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close filters" className="ml-auto flex size-11 items-center justify-center focus-ring"><span className="flex size-9 items-center justify-center rounded-full bg-slate-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></span></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <section aria-label="Categories">
          {header("Categories", `${preset?.label ?? ""} · ${preset?.items.length ?? 0} items`)}
          <div role="radiogroup" aria-label="Categories" className="flex flex-wrap gap-2 pb-4">
            {presets.map((p) => {
              const on = p.id === draft.presetId;
              const Icon = p.icon;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setDraft((d) => ({ ...d, presetId: p.id }))} className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm font-semibold focus-ring ${on ? "border-accent-strong bg-accent-soft text-[#065f46]" : "border-slate-200 bg-white text-slate-700"}`}>
                  <span className={`flex size-6 items-center justify-center rounded-full ${on ? "bg-accent-strong text-white" : "bg-slate-100 text-slate-500"}`}><Icon size={14} aria-hidden="true" /></span>
                  {p.label}
                  <span className={`text-xs font-medium ${on ? "text-accent-strong" : "text-slate-400"}`}>{p.items.length}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section aria-label="Nutrition" className="border-t border-slate-200 pb-4">
          {header("Nutrition", nSet ? `${nSet} set` : "Any")}
          <Segments label="Max calories" value={n.caloriesMax} summary={n.caloriesMax === undefined ? "Any" : `Under ${n.caloriesMax} cal`} steps={CALORIE_STEPS} format={String} onChange={(v) => set({ caloriesMax: v })} />
          <Segments label="Min protein" value={n.proteinMin} summary={n.proteinMin === undefined ? "Any" : `${n.proteinMin}g+`} steps={PROTEIN_STEPS} format={(v) => `${v}g`} onChange={(v) => set({ proteinMin: v })} />
          <div className="py-3">
            <div className="mb-2 flex items-baseline justify-between"><span className="text-[15px] font-bold text-slate-900">Min Protein Score</span><span className="text-sm font-semibold text-slate-600">{n.scoreMin === undefined ? "Any" : `${n.scoreMin}+`}</span></div>
            <div role="radiogroup" aria-label="Min Protein Score" className="grid grid-cols-4 gap-2">
              {SCORE_TIERS.map((t) => {
                const on = t.min === n.scoreMin;
                const colors = t.tier ? PILL_TIERS[t.tier] : PILL_TIERS.low;
                return (
                  <button key={t.label} type="button" role="radio" aria-checked={on} onClick={() => set({ scoreMin: t.min })} style={{ borderColor: on ? (t.tier ? "#047857" : "#64748b") : "#e2e8f0" }} className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-[14px] border px-1 py-[10px] focus-ring ${on ? "bg-slate-50" : "bg-white"}`}>
                    <span className="flex size-6 items-center justify-center rounded-full" style={{ background: t.tier ? colors.icon : "#f1f5f9" }}><BoltIcon size={12} color={t.tier ? colors.iconFg : "#64748b"} /></span>
                    <span className="text-xs font-bold text-slate-900">{t.label}</span>
                    <span className="text-[10px] font-medium text-slate-500">{t.caption}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      <div className="grid shrink-0 grid-cols-[120px_1fr] gap-3 border-t border-slate-200 px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-4">
        <AppButton variant="secondary" size="lg" onClick={() => setDraft({ presetId: defaultPresetId, nutrition: {} })}>Reset</AppButton>
        <AppButton size="lg" disabled={count === 0} onClick={() => { onApply(draft); onClose(); }}>Show {count} items</AppButton>
      </div>
    </Dialog>
  );
}
