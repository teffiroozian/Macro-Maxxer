"use client";
import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, X } from "lucide-react";
import { FIBER_COLOR, getDarkRangeColor } from "@/components/nutrition/metricColors";
import { row } from "@/components/native/saved/savedStyles";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { buildNutritionHistogram, getNutritionHistogramBinInclusion, type NutritionDisplayBounds } from "@/lib/menuSections/nutritionDisplayRange";
import { getMobileProteinShortcuts, type NutritionShortcut } from "@/lib/menuSections/nutritionPresets";
import { ADVANCED_KEYS, clearNutrition, countActive, nutritionControls, type NutritionFilterKey, type RestaurantMenu } from "@/lib/native/restaurantMenu";
import MenuSheet, { segment, segments } from "./MenuSheet";

const rangeStyle = (color: string, fill: number) => ({ "--range-color": color, "--range-dark-color": getDarkRangeColor(color), "--range-fill-percent": `${fill}%` }) as CSSProperties;
const PRESET_BUTTON = "!text-sm";

function Histogram({ values, bounds, color, threshold, minimum }: { values: number[]; bounds: NutritionDisplayBounds; color: string; threshold?: number; minimum: boolean }) {
  const bars = useMemo(() => {
    const buckets = buildNutritionHistogram(values, bounds);
    const peak = Math.max(1, ...buckets);
    return buckets.map((count) => count / peak);
  }, [values, bounds]);
  const included = useMemo(() => getNutritionHistogramBinInclusion(values, bounds, threshold, minimum), [values, bounds, threshold, minimum]);
  return (
    <div className="flex h-[52px] items-end gap-[3px] px-1" aria-hidden="true">
      {bars.map((height, index) => (
        <span key={index} className={`nutrition-histogram-bar flex-1 rounded-t-[2px] ${included[index] ? (minimum ? "bg-[#c2410c]" : "bg-[#111318]") : minimum ? "bg-orange-200 dark:bg-control" : "bg-slate-300 dark:bg-control"}`} style={{ height: Math.max(2, height * 52), "--histogram-dark-color": included[index] ? getDarkRangeColor(color) : "var(--border-control)" } as CSSProperties} />
      ))}
    </div>
  );
}

function MainSlider({ label, text, value, bounds, values, color, presets, minimum, step, onChange }: {
  label: string; text: string; value?: number; bounds: NutritionDisplayBounds; values: number[]; color: string;
  presets: NutritionShortcut[]; minimum: boolean; step: number; onChange: (value?: number) => void;
}) {
  const rest = minimum ? bounds.min : bounds.max;
  const current = Math.min(bounds.max, Math.max(bounds.min, value ?? rest));
  const fill = ((current - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;
  return (
    <section aria-label={label} className={`pb-4 ${row}`}>
      <div className="flex h-[50px] items-center">
        <h3 className="flex-1 text-base font-bold">{label}</h3>
        <span className={`text-[15px] font-semibold ${value === undefined ? "text-slate-500 dark:text-slate-400" : "text-accent-strong"}`}>{text}</span>
        {value === undefined ? null : <button type="button" onClick={() => onChange(undefined)} className="ml-4 h-11 cursor-pointer text-[15px] font-semibold text-slate-600 dark:text-slate-300 focus-ring">Reset</button>}
      </div>
      <Histogram values={values} bounds={bounds} color={color} threshold={value} minimum={minimum} />
      <div className="flex h-9 items-center">
        <input type="range" aria-label={label} aria-valuetext={text} min={bounds.min} max={bounds.max} step={step} value={current} onChange={(event) => { const next = Number(event.target.value); onChange(next === rest ? undefined : next); }} className={`nutrition-range native-menu-range ${minimum ? "minimum" : ""}`} style={rangeStyle(color, fill)} />
      </div>
      <div role="radiogroup" aria-label={`${label} presets`} className={`mt-1 ${segments}`}>
        {presets.map((preset) => <button key={preset.label} type="button" role="radio" aria-checked={value === preset.value} onClick={() => onChange(preset.value)} className={`${segment(value === preset.value)} ${PRESET_BUTTON}`}>{preset.label}</button>)}
      </div>
    </section>
  );
}

const TIERS = [{ label: "Any", caption: "All", value: undefined }, { label: "Good", caption: "6+", value: 6 }, { label: "Excellent", caption: "9+", value: 9 }, { label: "Elite", caption: "12+", value: 12 }];

const ADVANCED: { key: NutritionFilterKey; label: string; max: number; unit: string; minimum?: boolean; color: string }[] = [
  { key: "carbsMax", label: "Max carbs", max: 200, unit: "g", color: "#ca8a04" },
  { key: "fatMax", label: "Max fat", max: 100, unit: "g", color: "#2563eb" },
  { key: "fiberMin", label: "Min fiber", max: 30, unit: "g", minimum: true, color: FIBER_COLOR },
  { key: "sodiumMax", label: "Max sodium", max: 3000, unit: "mg", color: "#64748b" },
  { key: "sugarMax", label: "Max sugar", max: 100, unit: "g", color: "#be185d" },
];

export default function MenuNutritionSheet({ menu, filters, action, disabled, onChange, onClose }: {
  menu: RestaurantMenu;
  filters: Filters;
  action: string;
  disabled: boolean;
  onChange: (filters: Filters) => void;
  onClose: () => void;
}) {
  const data = useMemo(() => nutritionControls(menu, filters), [menu, filters]);
  const advanced = countActive(filters, ADVANCED_KEYS);
  const [more, setMore] = useState(advanced > 0);
  const set = (key: NutritionFilterKey, value?: number) => onChange({ ...filters, [key]: value });
  return (
    <MenuSheet title="Nutrition" badge={countActive(filters)} action={action} disabled={disabled} onReset={() => onChange(clearNutrition(filters))} onClose={onClose}>
      <MainSlider label="Max calories" text={filters.caloriesMax === undefined ? "Any" : `Under ${filters.caloriesMax} cal`} value={filters.caloriesMax} bounds={data.calorieBounds} values={data.calories} color="#111318" presets={data.caloriePresets} minimum={false} step={10} onChange={(value) => set("caloriesMax", value)} />
      <MainSlider label="Min protein" text={filters.proteinMin === undefined ? "Any" : `${filters.proteinMin}g or more`} value={filters.proteinMin} bounds={data.proteinBounds} values={data.proteins} color="#c2410c" presets={getMobileProteinShortcuts(data.maxProtein, data.proteinBounds.max)} minimum step={1} onChange={(value) => set("proteinMin", value)} />
      <section aria-label="Min Protein Score" className={`pb-4 ${row}`}>
        <div className="flex h-[50px] items-center">
          <h3 className="flex-1 text-base font-bold">Min Protein Score</h3>
          <span className={`text-[15px] font-semibold ${filters.proteinScoreMin === undefined ? "text-slate-500 dark:text-slate-400" : "text-accent-strong"}`}>{filters.proteinScoreMin === undefined ? "Any" : `${filters.proteinScoreMin} or more`}</span>
        </div>
        <div role="radiogroup" aria-label="Min Protein Score" className={segments}>
          {TIERS.map((tier) => {
            const on = filters.proteinScoreMin === tier.value;
            return <button key={tier.label} type="button" role="radio" aria-checked={on} onClick={() => set("proteinScoreMin", tier.value)} className={`${segment(on)} !h-[52px] flex-col !gap-0 leading-[18px]`}>{tier.label}<span className="text-[13px] font-normal leading-4">{tier.caption}</span></button>;
          })}
        </div>
      </section>
      <section aria-label="More nutrition" className={row}>
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="flex h-14 w-full cursor-pointer items-center text-left focus-ring">
          <span className="flex-1 text-base font-bold">More nutrition</span>
          <span className="mr-2.5 text-[15px] text-slate-500 dark:text-slate-400">{advanced ? `${advanced} set` : "Carbs, fat, fiber and more"}</span>
          <ChevronDown size={18} strokeWidth={2.4} className={`text-slate-500 transition-transform duration-150 motion-reduce:transition-none dark:text-slate-400 ${more ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {more ? ADVANCED.map(({ key, label, max, unit, minimum = false, color }) => {
          const value = filters[key];
          const current = value ?? (minimum ? 0 : max);
          const text = value === undefined ? "Any" : `${minimum ? "≥" : "≤"} ${value.toLocaleString("en-US")}${unit}`;
          return (
            <div key={key} className={`pb-2 pt-1.5 ${row}`}>
              <div className="flex h-9 items-center">
                <span className="flex-1 text-[15px] font-semibold">{label}</span>
                <span className={`text-[15px] font-semibold tabular-nums ${value === undefined ? "text-slate-500 dark:text-slate-400" : "text-accent-strong"}`}>{text}</span>
                {value === undefined ? null : <button type="button" aria-label={`Reset ${label}`} onClick={() => set(key, undefined)} className="-mr-2.5 flex size-11 cursor-pointer items-center justify-center text-slate-500 dark:text-slate-400 focus-ring"><X size={15} strokeWidth={2.4} aria-hidden="true" /></button>}
              </div>
              <div className="flex h-9 items-center">
                <input type="range" aria-label={label} aria-valuetext={text} min={0} max={max} value={current} onChange={(event) => { const next = Number(event.target.value); set(key, next === (minimum ? 0 : max) ? undefined : next); }} className={`nutrition-range native-menu-range ${minimum ? "minimum" : ""}`} style={rangeStyle(color, (current / max) * 100)} />
              </div>
            </div>
          );
        }) : null}
      </section>
    </MenuSheet>
  );
}
