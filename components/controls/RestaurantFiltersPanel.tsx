"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Droplets, CupSoda, Grid2X2, SlidersHorizontal, Soup, UtensilsCrossed, Users, X, Zap, type LucideIcon } from "lucide-react";
import { getVariantSettings, countVariantSettingsChanges, VARIANT_FILTER_DEFAULTS, type Filters, type VariantSettings } from "@/lib/menuSections/filterOptions";
import type { MenuItem } from "@/types/menu";
import { isNutritionHistogramBinIncluded, buildNutritionHistogram, getNutritionDisplayData, getActiveCategoryCalorieData } from "@/lib/menuSections/nutritionDisplayRange";
import { countItemsByCategory, getCategoryLabel, getItemCategories } from "@/lib/menuSections/sorting";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import { getCategoryPresets, getSelectedCategoryPreset, selectCategoryPreset, selectCustomCategories, type CategoryPreset, type CategoryPresetId } from "@/lib/menuSections/categoryPresets";
import { getRankedAllFilterKey } from "@/lib/menuSections/filtering";
import AppButton from "@/components/ui/AppButton";

type Bounds = { min: number; max: number };
type Preset = { label: string; value?: number };
const categoryPresetIcons: Record<CategoryPresetId, LucideIcon> = { main: UtensilsCrossed, sides: Soup, drinks: CupSoda, shareables: Users, sauces: Droplets, all: Grid2X2 };

function SectionHeader({ title, summary, open, onClick }: { title: string; summary: string; open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-16 w-full cursor-pointer items-center gap-4 py-1 text-left">
    <span className="font-heading text-xl font-bold text-slate-950 sm:text-[22px]">{title}</span>
    <span className="ml-auto text-[13px] font-medium text-slate-500">{summary}</span>
    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.4} />
  </button>;
}

function Histogram({ values, bounds, color, threshold, minimum }: { values: number[]; bounds: Bounds; color: string; threshold?: number; minimum: boolean }) {
  const bars = useMemo(() => {
    const buckets = buildNutritionHistogram(values, bounds);
    const peak = Math.max(1, ...buckets);
    return buckets.map((count) => count / peak);
  }, [bounds, values]);
  return <div className="flex h-9 items-end gap-[3px] px-1" aria-hidden="true">{bars.map((height, index) => <span key={index} className={`flex-1 rounded-t-[2px] ${isNutritionHistogramBinIncluded(index, bounds, threshold, minimum) ? color : minimum ? "bg-orange-200" : "bg-slate-300"}`} style={{ height: `${Math.max(2, height * 36)}px` }} />)}</div>;
}

function NutritionSlider({ label, displayValue, value, bounds, values, color, presets, anyAt, step, onChange }: { label: string; displayValue: string; value?: number; bounds: Bounds; values: number[]; color: string; presets: Preset[]; anyAt: "min" | "max"; step: number; onChange: (value?: number) => void }) {
  const resolved = Math.min(bounds.max, Math.max(bounds.min, value ?? bounds[anyAt]));
  const fill = ((resolved - bounds.min) / Math.max(1, bounds.max - bounds.min)) * 100;
  return <div className="py-5">
    <div className="mb-4 flex items-baseline justify-between gap-4"><h4 className="text-[15px] font-bold text-slate-950">{label}</h4><span className="text-sm font-semibold text-slate-600">{displayValue}</span></div>
    <div className="mx-auto max-w-[560px]">
      <Histogram values={values} bounds={bounds} color={color} threshold={value} minimum={anyAt === "min"} />
      <input type="range" min={bounds.min} max={bounds.max} step={step} value={resolved} aria-valuetext={displayValue} onChange={(event) => onChange(Number(event.target.value))} className={`nutrition-range mt-2 ${anyAt === "min" ? "minimum" : ""}`} style={{ "--range-color": color.startsWith("bg-[") ? color.slice(4, -1) : "#0f172a", "--range-fill-percent": `${fill}%` } as CSSProperties} aria-label={label} />
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
  const [variantsOpen, setVariantsOpen] = useState(true);
  const [nutritionOpen, setNutritionOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const { proteins, proteinBounds } = useMemo(() => getNutritionDisplayData(items), [items]);
  const { calories, calorieBounds } = useMemo(() => getActiveCategoryCalorieData(items, value.categories), [items, value.categories]);
  const categoryCounts = useMemo(() => {
    return new Map(Object.entries(countItemsByCategory(items)));
  }, [items]);
  const categoryPresets = getCategoryPresets(items, restaurantId).map((preset) => ({ ...preset, Icon: categoryPresetIcons[preset.id] }));
  const allIds = categoryPresets.find((preset) => preset.id === "all")!.ids;
  const categories = allIds.map((id) => ({ id, count: categoryCounts.get(id) ?? 0, label: getCategoryLabel(id) }));
  const selected = value.categories ?? allIds;
  const same = (left: string[], right: string[]) => left.length === right.length && left.every((id) => right.includes(id));
  const matchingCategoryPreset = getSelectedCategoryPreset(value, categoryPresets);
  const [baseCategoryPresetId, setBaseCategoryPresetId] = useState<CategoryPresetId>(
    () => matchingCategoryPreset?.id ?? "main",
  );
  const baseCategoryPreset = categoryPresets.find((preset) => preset.id === baseCategoryPresetId) ?? categoryPresets[0];
  const isCustomCategorySelection = !matchingCategoryPreset;
  const selectedSet = new Set(selected);
  const hasSelectedCategories = selectedSet.size > 0;
  const showItemCount = hasSelectedCategories ? matchingCount : 0;
  const selectedRankingGroups = value.rankingGroups ? new Set(value.rankingGroups) : undefined;
  const selectedItemCount = items.filter((item) => {
    const itemCategories = item.variants?.length
      ? item.variants.flatMap((variant) => variant.categories?.length ? variant.categories : getItemCategories(item))
      : getItemCategories(item);
    const categoryMatches = itemCategories.some((category) => selectedSet.has(category.toLowerCase()));
    if (!categoryMatches || !selectedRankingGroups) return categoryMatches;
    const itemGroup = getRankedAllFilterKey(item.servingType);
    return (itemGroup !== null && selectedRankingGroups.has(itemGroup)) || Boolean(item.variants?.some((variant) => {
      const variantGroup = getRankedAllFilterKey(variant.servingType);
      return variantGroup !== null && selectedRankingGroups.has(variantGroup);
    }));
  }).length;
  const applyCategoryPreset = (preset: CategoryPreset) => {
    setBaseCategoryPresetId(preset.id);
    onChange(selectCategoryPreset(value, preset));
  };
  const toggleCategory = (categoryId: string) => {
    const nextSelected = selected.includes(categoryId)
      ? selected.filter((id) => id !== categoryId)
      : [...selected, categoryId];
    onChange(selectCustomCategories(value, nextSelected));
  };
  const variantSettings = getVariantSettings(value);
  const variantChanges = countVariantSettingsChanges(value);
  const activeCount = variantChanges + Object.entries(value).filter(([key, entry]) => key !== "rankingGroups" && key !== "categoryPreset" && !(key in VARIANT_FILTER_DEFAULTS) && entry !== undefined && (!Array.isArray(entry) || !same(entry, allIds))).length;
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
      <section>
        <SectionHeader
          title="Categories"
          summary={`${isCustomCategorySelection ? "Custom" : matchingCategoryPreset?.label} · ${selectedItemCount} item${selectedItemCount === 1 ? "" : "s"}`}
          open={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        />
        {menuOpen ? <div className="pb-6">
          <div className="flex flex-wrap gap-2">
            {categoryPresets.map((preset) => {
              const active = matchingCategoryPreset?.id === preset.id;
              const Icon = preset.Icon;
              return <button
                key={preset.id}
                type="button"
                onClick={() => applyCategoryPreset(preset)}
                className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-1.5 pr-3 text-sm font-semibold transition ${active ? "border-[#047857] bg-[#ECFDF5] text-[#065F46]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${active ? "bg-[#047857] text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                {preset.label}
              </button>;
            })}
            {isCustomCategorySelection ? <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#047857] bg-[#ECFDF5] px-1.5 pr-3 text-sm font-semibold text-[#065F46]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#047857] text-white"><SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.2} /></span>
              Custom
            </span> : null}
          </div>

          {isCustomCategorySelection ? <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Edited from {baseCategoryPreset.label}</span>
            <button type="button" onClick={() => applyCategoryPreset(baseCategoryPreset)} className="cursor-pointer font-semibold text-[#047857] hover:underline">Reset</button>
          </div> : null}

          <div className="mb-2 mt-5 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Customize</span>
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => onChange(selectCustomCategories(value, allIds))} className="min-h-8 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900 focus-ring">Select all</button>
              <span className="text-xs text-slate-400" aria-hidden="true">·</span>
              <button type="button" onClick={() => onChange(selectCustomCategories(value, []))} className="min-h-8 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900 focus-ring">Clear all</button>
            </div>
          </div>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {categories.map((category) => {
              const checked = selected.includes(category.id);
              const showOnlyPersistently = checked && selectedSet.size === 1;
              return <div key={category.id} className="group flex min-h-10 items-center gap-2 border-b border-slate-100 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
                <label className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
                  <input type="checkbox" checked={checked} onChange={() => toggleCategory(category.id)} className="peer sr-only" />
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#047857]/30 ${checked ? "border-[#047857] bg-[#047857] text-white" : "border-slate-300 bg-white text-transparent"}`}>
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-800">{category.label}</span>
                  <span className="text-xs tabular-nums text-slate-400">{category.count}</span>
                </label>
                <button type="button" aria-label={`Only ${category.label}`} onClick={() => onChange(selectCustomCategories(value, [category.id]))} className={`min-h-10 shrink-0 cursor-pointer rounded px-2 text-xs font-semibold text-[#047857] opacity-100 transition-opacity hover:bg-emerald-50 focus-ring lg:group-hover:opacity-100 lg:group-has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100 ${showOnlyPersistently ? "lg:opacity-100" : "lg:opacity-0"}`}>Only</button>
              </div>;
            })}
          </div>
        </div> : null}
      </section>
      <section className="border-t border-slate-200">
        <SectionHeader title="Variants" summary={variantChanges ? "Custom" : "Default"} open={variantsOpen} onClick={() => setVariantsOpen(!variantsOpen)} />
        {variantsOpen ? <div className="pb-5">
          <div className="divide-y divide-slate-100">
            {([
              { key: "showServingSizeVariants", title: "Show different serving sizes", description: "Show different serving sizes and counts as separate ranking results.", example: "Example: 8 ct nuggets vs 12 ct nuggets" },
              { key: "showRecipeVariants", title: "Show different flavors", description: "Show different flavors, proteins, or recipe versions as separate ranking results.", example: "Example: Cobb Salad with Nuggets vs Cobb Salad with Chick-n-Strips" },
              { key: "separateSizesInProteinScore", title: "Separate sizes in Protein Score", description: "Show serving sizes separately even when their Protein Score is similar.", example: "Example: Protein Score for 5 ct nuggets vs 12 ct nuggets" },
            ] satisfies Array<{ key: keyof VariantSettings; title: string; description: string; example: string }>).map((option) => (
              <button key={option.key} type="button" role="switch" aria-checked={variantSettings[option.key]} aria-labelledby={`variant-title-${option.key}`} aria-describedby={`variant-description-${option.key}`} onClick={() => onChange({ ...value, [option.key]: !variantSettings[option.key] })} className="flex w-full cursor-pointer items-center gap-4 py-4 text-left focus-ring">
                <span className="min-w-0 flex-1">
                  <span id={`variant-title-${option.key}`} className="text-[15px] font-bold text-slate-950">{option.title}</span>
                  <span id={`variant-description-${option.key}`} className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span>
                  <span className="mt-1 block text-xs italic leading-5 text-slate-400">{option.example}</span>
                </span>
                <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${variantSettings[option.key] ? "bg-[#047857]" : "bg-slate-200"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${variantSettings[option.key] ? "translate-x-5" : "translate-x-0"}`} />
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onChange({ ...value, ...VARIANT_FILTER_DEFAULTS })} className="min-h-8 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900 focus-ring">Restore defaults</button>
        </div> : null}
      </section>
      <section className="border-t border-slate-200"><SectionHeader title="Nutrition" summary={nutritionCount ? `${nutritionCount} set` : "Any"} open={nutritionOpen} onClick={() => setNutritionOpen(!nutritionOpen)} />{nutritionOpen ? <div className="divide-y divide-slate-100 pb-3">
        <NutritionSlider label="Max calories" displayValue={value.caloriesMax === undefined ? "Any" : `Under ${value.caloriesMax} cal`} value={value.caloriesMax} bounds={calorieBounds} values={calories} color="bg-[#111318]" anyAt="max" step={10} onChange={(next) => onChange({ ...value, caloriesMax: next })} presets={[{label:"≤ 300",value:300},{label:"≤ 500",value:500},{label:"≤ 700",value:700},{label:"Any"}]} />
        <NutritionSlider label="Min protein" displayValue={value.proteinMin === undefined ? "Any" : `${value.proteinMin}g+`} value={value.proteinMin} bounds={proteinBounds} values={proteins} color="bg-[#C2410C]" anyAt="min" step={1} onChange={(next) => onChange({ ...value, proteinMin: next === proteinBounds.min ? undefined : next })} presets={[{label:"Any"},{label:"20g+",value:20},{label:"30g+",value:30},{label:"40g+",value:40}]} />
        <div className="py-5"><div className="mb-4 flex items-baseline justify-between"><h4 className="text-[15px] font-bold text-slate-950">Min Protein Score</h4><span className="text-sm font-semibold text-slate-500">{value.proteinScoreMin === undefined ? "Any" : `${value.proteinScoreMin}+`}</span></div><div className="grid grid-cols-4 gap-3">{proteinTiers.map((option) => { const active = value.proteinScoreMin === option.value; return <button key={option.label} type="button" onClick={() => onChange({ ...value, proteinScoreMin: option.value })} style={active ? { borderColor: option.border } : undefined} className={`min-h-[88px] cursor-pointer rounded-[14px] border p-2.5 text-center transition ${active ? "bg-slate-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className={`mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full ${proteinScoreTierStyles[option.tier].iconWrap}`}><Zap className={`h-3.5 w-3.5 ${proteinScoreTierStyles[option.tier].icon}`} fill="currentColor" /></span><span className={`block text-xs font-bold ${proteinScoreTierStyles[option.tier].value}`}>{option.label}</span><span className="mt-0.5 block text-[10px] font-medium text-slate-500">{option.caption}</span></button>; })}</div></div>
      </div> : null}</section>
      <section className="border-t border-slate-200"><SectionHeader title="More nutrition" summary={moreCount ? `${moreCount} set` : "Off"} open={moreOpen} onClick={() => setMoreOpen(!moreOpen)} />{moreOpen ? <div className="pb-6"><CompactSlider label="Max carbs" value={value.carbsMax} max={200} unit="g" kind="max" color="#CA8A04" onChange={(next) => onChange({...value,carbsMax:next})}/><CompactSlider label="Max fat" value={value.fatMax} max={100} unit="g" kind="max" color="#2563EB" onChange={(next) => onChange({...value,fatMax:next})}/><CompactSlider label="Min fiber" value={value.fiberMin} max={30} unit="g" kind="min" color="#047857" onChange={(next) => onChange({...value,fiberMin:next})}/><CompactSlider label="Max sodium" value={value.sodiumMax} max={3000} unit="mg" kind="max" color="#64748B" onChange={(next) => onChange({...value,sodiumMax:next})}/><CompactSlider label="Max sugar" value={value.sugarMax} max={100} unit="g" kind="max" color="#BE185D" onChange={(next) => onChange({...value,sugarMax:next})}/></div> : null}</section>
    </div>
    <footer className="grid shrink-0 grid-cols-[120px_1fr] gap-3 border-t border-slate-200 bg-white p-4 sm:px-8"><AppButton variant="secondary" size="lg" onClick={() => { setBaseCategoryPresetId("main"); onChange(selectCategoryPreset({}, categoryPresets[0])); }}>Reset</AppButton><AppButton size="lg" disabled={!hasSelectedCategories} onClick={onApply}>Show {showItemCount} item{showItemCount === 1 ? "" : "s"}</AppButton></footer>
  </div>;
}
