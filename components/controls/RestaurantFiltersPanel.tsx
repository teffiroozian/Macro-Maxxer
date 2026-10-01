"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, X, Zap } from "lucide-react";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { MenuItem } from "@/types/menu";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { getCategoryLabel, getItemCategories } from "@/lib/menuSections/sorting";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import { RESTAURANT_MAIN_MENU_CATEGORIES } from "@/data/restaurantControlPresets";
import AppButton from "@/components/ui/AppButton";

type Bounds = { min: number; max: number };
type Preset = { label: string; value?: number };

function SectionHeader({ title, summary, open, onClick }: { title: string; summary: string; open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-16 w-full cursor-pointer items-center gap-4 py-1 text-left">
    <span className="font-heading text-xl font-bold text-slate-950 sm:text-[22px]">{title}</span>
    <span className="ml-auto text-[13px] font-medium text-slate-500">{summary}</span>
    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
  </button>;
}

function Histogram({ values, bounds, color }: { values: number[]; bounds: Bounds; color: string }) {
  const bars = useMemo(() => {
    const buckets = Array(20).fill(0) as number[];
    const span = Math.max(1, bounds.max - bounds.min);
    values.forEach((value) => buckets[Math.min(buckets.length - 1, Math.max(0, Math.floor(((value - bounds.min) / span) * buckets.length)))]++);
    const peak = Math.max(1, ...buckets);
    return buckets.map((count) => count / peak);
  }, [bounds, values]);
  return <div className="flex h-9 items-end gap-[3px] px-1" aria-hidden="true">{bars.map((height, index) => <span key={index} className={`flex-1 rounded-t-[2px] ${color}`} style={{ height: `${Math.max(2, height * 36)}px` }} />)}</div>;
}

function NutritionSlider({ label, displayValue, value, bounds, values, color, presets, anyAt, step, onChange }: { label: string; displayValue: string; value?: number; bounds: Bounds; values: number[]; color: string; presets: Preset[]; anyAt: "min" | "max"; step: number; onChange: (value?: number) => void }) {
  const resolved = value ?? bounds[anyAt];
  const fill = ((resolved - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;
  return <div className="py-5">
    <div className="mb-4 flex items-baseline justify-between gap-4"><h4 className="text-[15px] font-bold text-slate-950">{label}</h4><span className="text-sm font-semibold text-slate-600">{displayValue}</span></div>
    <div className="mx-auto max-w-[560px]">
      <Histogram values={values} bounds={bounds} color={color} />
      <input type="range" min={bounds.min} max={bounds.max} step={step} value={resolved} onChange={(event) => onChange(Number(event.target.value))} className="nutrition-range mt-2" style={{ "--range-color": color.startsWith("bg-[") ? color.slice(4, -1) : "#0f172a", "--range-fill-percent": `${fill}%` } as CSSProperties} aria-label={label} />
      <div className="mt-4 grid grid-flow-col auto-cols-fr rounded-xl bg-slate-100 p-1">{presets.map((preset) => {
        const active = value === preset.value;
        return <button key={preset.label} type="button" onClick={() => onChange(preset.value)} className={`h-8 cursor-pointer rounded-lg border text-xs font-semibold transition ${active ? "border-slate-200 bg-white text-slate-950 shadow-sm" : "border-transparent bg-transparent text-slate-600 hover:text-slate-950"}`}>{preset.label}</button>;
      })}</div>
    </div>
  </div>;
}

function CompactSlider({ label, value, max, unit, kind, color, onChange }: { label: string; value?: number; max: number; unit: string; kind: "min" | "max"; color: string; onChange: (value?: number) => void }) {
  const resolved = value ?? (kind === "max" ? max : 0);
  const fill = resolved / Math.max(1, max) * 100;
  return <div className="grid min-h-12 grid-cols-[112px_minmax(120px,1fr)_84px] items-center gap-4 border-b border-slate-100 last:border-0">
    <label className="text-sm font-semibold text-slate-800">{label}</label>
    <input type="range" min={0} max={max} value={resolved} onChange={(event) => onChange(Number(event.target.value))} className={`nutrition-range compact ${kind === "min" ? "minimum" : ""}`} style={{ "--range-color": color, "--range-fill-percent": `${fill}%` } as CSSProperties} />
    <button type="button" onClick={() => onChange(undefined)} className="cursor-pointer text-right text-xs font-semibold tabular-nums text-slate-500">{value === undefined ? "Any" : `${kind === "max" ? "≤" : "≥"} ${value}${unit}`}</button>
  </div>;
}

export default function RestaurantFiltersPanel({ restaurantId, items, value, onChange, onClose, onApply, matchingCount }: { restaurantId: string; items: MenuItem[]; value: Filters; onChange: (filters: Filters) => void; onClose: () => void; onApply: () => void; matchingCount: number }) {
  const [menuOpen, setMenuOpen] = useState(true);
  const [nutritionOpen, setNutritionOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const nutrition = useMemo(() => items.map(getDefaultMenuItemNutrition), [items]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => new Set(getItemCategories(item)).forEach((category) => counts.set(category, (counts.get(category) ?? 0) + 1)));
    return counts;
  }, [items]);
  const availableIds = [...categoryCounts.keys()];
  const configuredMain = (RESTAURANT_MAIN_MENU_CATEGORIES[restaurantId] ?? []).filter((id) => availableIds.includes(id));
  const mainIds = configuredMain.length ? configuredMain : availableIds.slice(0, Math.min(5, availableIds.length));
  const mainSet = new Set(mainIds);
  const allIds = [...mainIds, ...availableIds.filter((id) => !mainSet.has(id))];
  const categories = allIds.map((id) => ({ id, count: categoryCounts.get(id) ?? 0, label: getCategoryLabel(id) }));
  const selected = value.categories ?? allIds;
  const same = (left: string[], right: string[]) => left.length === right.length && left.every((id) => right.includes(id));
  const makeBounds = (values: number[], fallback: number): Bounds => ({ min: 0, max: Math.max(fallback, ...values.map((entry) => Math.ceil(entry / 10) * 10)) });
  const calories = nutrition.map(({ calories }) => calories).filter(Number.isFinite);
  const proteins = nutrition.map(({ protein }) => protein).filter(Number.isFinite);
  const calorieBounds = makeBounds(calories, 800);
  const proteinBounds = makeBounds(proteins, 50);
  const activeCount = Object.entries(value).filter(([, entry]) => entry !== undefined && (!Array.isArray(entry) || !same(entry, allIds))).length;
  const nutritionCount = [value.caloriesMax, value.proteinMin, value.proteinScoreMin].filter((entry) => entry !== undefined).length;
  const moreCount = [value.carbsMax, value.fatMax, value.fiberMin, value.sodiumMax, value.sugarMax].filter((entry) => entry !== undefined).length;
  const proteinTiers = [
    { label: "Any", value: undefined, tier: "moderate", caption: "All", border: "#64748B" },
    { label: "Good", value: 6, tier: "good", caption: "6+", border: "#B08A3E" },
    { label: "Excellent", value: 9, tier: "excellent", caption: "9+", border: "#4C84C4" },
    { label: "Elite", value: 12, tier: "elite", caption: "12+", border: "#047857" },
  ] as const;

  return <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(15,23,42,.25)] sm:max-h-[calc(100dvh-3rem)]">
    <header className="flex shrink-0 items-center px-5 pb-2 pt-5 sm:px-8"><h2 className="font-heading text-2xl font-bold">Filters</h2>{activeCount ? <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#047857] px-1.5 text-xs font-bold text-white">{activeCount}</span> : null}<button type="button" onClick={onClose} aria-label="Close filters" className="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button></header>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8 xl:overflow-y-auto">
      <section><SectionHeader title="Categories" summary={`${selected.length} of ${allIds.length} selected`} open={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />{menuOpen ? <div className="pb-6">
        <div className="mb-4 grid grid-cols-2 gap-3">{[{ label: "Main menu", ids: mainIds }, { label: "Select all", ids: allIds }].map((preset) => { const active = same(selected, preset.ids); return <button key={preset.label} type="button" onClick={() => onChange({ ...value, categories: preset.label === "Select all" ? undefined : preset.ids })} className={`h-10 cursor-pointer rounded-xl border-[1.5px] text-xs font-bold ${active ? "border-slate-900 bg-slate-50 text-slate-950" : "border-slate-300 text-slate-600"}`}>{active ? <Check className="mr-1.5 inline h-3.5 w-3.5 text-[#047857]" /> : null}{preset.label}</button>; })}</div>
        <div className="grid overflow-hidden rounded-2xl border border-slate-200 sm:grid-cols-2">{categories.map((category) => { const checked = selected.includes(category.id); return <label key={category.id} className="flex min-h-[50px] cursor-pointer items-center gap-3 border-b border-slate-100 px-4 sm:[&:nth-last-child(-n+2)]:border-b-0"><input type="checkbox" checked={checked} onChange={() => onChange({ ...value, categories: checked ? selected.filter((id) => id !== category.id) : [...selected, category.id] })} className="h-4 w-4 cursor-pointer accent-[#047857]" /><span className="flex-1 text-sm font-semibold">{category.label}</span><span className="text-xs text-slate-500">{category.count}</span></label>; })}</div>
      </div> : null}</section>
      <section className="border-t border-slate-200"><SectionHeader title="Nutrition" summary={nutritionCount ? `${nutritionCount} set` : "Any"} open={nutritionOpen} onClick={() => setNutritionOpen(!nutritionOpen)} />{nutritionOpen ? <div className="divide-y divide-slate-100 pb-3">
        <NutritionSlider label="Max calories" displayValue={value.caloriesMax === undefined ? "Any" : `Under ${value.caloriesMax} cal`} value={value.caloriesMax} bounds={calorieBounds} values={calories} color="bg-[#111318]" anyAt="max" step={10} onChange={(next) => onChange({ ...value, caloriesMax: next === calorieBounds.max ? undefined : next })} presets={[{label:"≤ 300",value:300},{label:"≤ 500",value:500},{label:"≤ 700",value:700},{label:"Any"}]} />
        <NutritionSlider label="Min protein" displayValue={value.proteinMin === undefined ? "Any" : `${value.proteinMin}g+`} value={value.proteinMin} bounds={proteinBounds} values={proteins} color="bg-[#C2410C]" anyAt="min" step={1} onChange={(next) => onChange({ ...value, proteinMin: next === proteinBounds.min ? undefined : next })} presets={[{label:"Any"},{label:"20g+",value:20},{label:"30g+",value:30},{label:"40g+",value:40}]} />
        <div className="py-5"><div className="mb-4 flex items-baseline justify-between"><h4 className="text-[15px] font-bold text-slate-950">Min Protein Score</h4><span className="text-sm font-semibold text-slate-500">{value.proteinScoreMin === undefined ? "Any" : `${value.proteinScoreMin}+`}</span></div><div className="grid grid-cols-4 gap-3">{proteinTiers.map((option) => { const active = value.proteinScoreMin === option.value; return <button key={option.label} type="button" onClick={() => onChange({ ...value, proteinScoreMin: option.value })} style={active ? { borderColor: option.border } : undefined} className={`min-h-[88px] cursor-pointer rounded-[14px] border p-2.5 text-center transition ${active ? "bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className={`mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full ${proteinScoreTierStyles[option.tier].iconWrap}`}><Zap className={`h-3.5 w-3.5 ${proteinScoreTierStyles[option.tier].icon}`} fill="currentColor" /></span><span className={`block text-xs font-bold ${proteinScoreTierStyles[option.tier].value}`}>{option.label}</span><span className="mt-0.5 block text-[10px] font-medium text-slate-500">{option.caption}</span></button>; })}</div></div>
      </div> : null}</section>
      <section className="border-t border-slate-200"><SectionHeader title="More nutrition" summary={moreCount ? `${moreCount} set` : "Off"} open={moreOpen} onClick={() => setMoreOpen(!moreOpen)} />{moreOpen ? <div className="pb-6"><CompactSlider label="Max carbs" value={value.carbsMax} max={200} unit="g" kind="max" color="#CA8A04" onChange={(next) => onChange({...value,carbsMax:next})}/><CompactSlider label="Max fat" value={value.fatMax} max={100} unit="g" kind="max" color="#2563EB" onChange={(next) => onChange({...value,fatMax:next})}/><CompactSlider label="Min fiber" value={value.fiberMin} max={30} unit="g" kind="min" color="#047857" onChange={(next) => onChange({...value,fiberMin:next})}/><CompactSlider label="Max sodium" value={value.sodiumMax} max={3000} unit="mg" kind="max" color="#64748B" onChange={(next) => onChange({...value,sodiumMax:next})}/><CompactSlider label="Max sugar" value={value.sugarMax} max={100} unit="g" kind="max" color="#BE185D" onChange={(next) => onChange({...value,sugarMax:next})}/></div> : null}</section>
    </div>
    <footer className="grid shrink-0 grid-cols-[120px_1fr] gap-3 border-t border-slate-200 bg-white p-4 sm:px-8"><AppButton variant="secondary" size="lg" onClick={() => onChange({ categories: mainIds })}>Reset</AppButton><AppButton size="lg" onClick={onApply}>Show {matchingCount} item{matchingCount === 1 ? "" : "s"}</AppButton></footer>
  </div>;
}
