"use client";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import {
  getProteinPer100Calories,
  getProteinScoreTier,
  PROTEIN_SCORE_TIER_ORDER,
  PROTEIN_SCORE_TIER_SCALE,
} from "@/lib/nutrition";
import type { Nutrition } from "@/types/nutrition";
import NativeImageWell from "./NativeImageWell";
import {
  calorieShares, formatDelta, formatMacro, formatPlainCalories, MACRO_KEYS, MACRO_LABELS, subMacros, toMacros,
  type MealAdjustments, type MealRow, type Macros,
} from "./nativeItemModel";

const eyebrow = "text-xs font-bold uppercase tracking-[0.08em] text-slate-500";
const subHeader = "pb-0.5 pt-[10px] text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500";

function MacroLine({ macros, grey }: { macros: Macros; grey?: boolean }) {
  const c = (tone: string) => (grey ? "text-slate-500" : tone);
  const sign = (key: keyof Macros, v: number) => (grey ? formatDelta(key, v) || formatMacro(key, 0) : formatMacro(key, v));
  return (
    <span className="flex flex-wrap gap-x-2 text-[11.5px] font-bold" aria-hidden="true">
      <span className={c("text-[#111318]")}>{sign("calories", macros.calories)} cal</span>
      <span className={c("text-[#c2410c]")}>{sign("protein", macros.protein)} P</span>
      <span className={c("text-[#ca8a04]")}>{sign("carbs", macros.carbs)} C</span>
      <span className={c("text-[#2563eb]")}>{sign("totalFat", macros.totalFat)} F</span>
    </span>
  );
}

function ItemRows({ title, rows, grey }: { title: string; rows: MealRow[]; grey?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={subHeader}>{title}</p>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3 py-[7px]">
          <NativeImageWell src={row.image} className="size-[42px] shrink-0 rounded-xl p-1" />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="truncate text-sm font-bold text-slate-900">{row.prefix}{row.name}</span>
            <MacroLine macros={row.macros} grey={grey} />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function NativeMealDetails({ nutrition, baseline, quantity, isEditing, main, mealRows, adjustments, onOpenFacts, onRemove }: {
  nutrition: Nutrition; baseline: Macros; quantity: number; isEditing: boolean;
  main: MealRow; mealRows: MealRow[]; adjustments: MealAdjustments; onOpenFacts: () => void; onRemove?: () => void;
}) {
  const macros = toMacros(nutrition);
  const delta = subMacros(macros, baseline);
  const shares = calorieShares(macros);
  const donut = `conic-gradient(#c2410c 0 ${shares.protein}%, #ca8a04 ${shares.protein}% ${shares.protein + shares.carbs}%, #2563eb ${shares.protein + shares.carbs}% 100%)`;
  const score = getProteinPer100Calories(macros.protein, macros.calories);
  const tier = score === undefined ? undefined : getProteinScoreTier(score);
  const tierStyle = tier ? proteinScoreTierStyles[tier] : undefined;
  const reference = isEditing ? "vs. your saved item" : "vs. standard";
  const sub = `${quantity > 1 ? `Per item · ${quantity} in order · ` : ""}${reference}`;
  const empty = shares.protein + shares.carbs + shares.totalFat === 0;

  return (
    <div className="flex flex-col gap-[22px] px-5">
      <p className="-mt-2 text-[13px] text-slate-500">{sub}</p>

      <div className="flex items-center gap-[18px] rounded-[22px] bg-slate-50 p-4">
        <div className="relative size-[104px] shrink-0 rounded-full transition-[background] duration-300 motion-reduce:transition-none" style={{ background: empty ? "#e2e8f0" : donut }} role="img" aria-label={`${Math.round(macros.calories)} calories`}>
          <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-slate-50">
            <span className="font-heading text-lg font-bold leading-none tabular-nums text-slate-900">{formatPlainCalories(macros.calories)}</span>
            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-slate-500">Calories</span>
          </div>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-[10px]">
          {MACRO_KEYS.map((key) => (
            <li key={key} className="flex items-baseline gap-2">
              <span className="text-[13px] text-slate-500">{MACRO_LABELS[key]}</span>
              <span className="text-[11px] font-bold text-slate-500">{formatDelta(key, delta[key])}</span>
              <span className={`font-heading ml-auto text-[15px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatMacro(key, macros[key])}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={eyebrow}>Items</p>
        <ItemRows title="Main item" rows={[main]} />
        <ItemRows title="Added" rows={adjustments.added} grey />
        <ItemRows title="Removed" rows={adjustments.removed} grey />
        <ItemRows title="Side & drink" rows={mealRows} />
        <ItemRows title="Dipping sauces" rows={adjustments.sauces} />
      </div>

      <div className="flex flex-col gap-[10px]">
        <p className={eyebrow}>Macro split</p>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-md bg-slate-100" role="img" aria-label={`Protein ${shares.protein}%, carbs ${shares.carbs}%, fat ${shares.totalFat}%`}>
          {([["protein", "#c2410c"], ["carbs", "#ca8a04"], ["totalFat", "#2563eb"]] as const).map(([key, color]) => (
            <span key={key} className="block h-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${shares[key]}%`, background: color }} />
          ))}
        </div>
        <div className="grid grid-cols-3" aria-hidden="true">
          {(["protein", "carbs", "totalFat"] as const).map((key) => (
            <div key={key} className="flex flex-col gap-[5px]">
              <span className={`font-heading text-[17px] font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{shares[key]}%</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-500">{MACRO_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {score !== undefined && tier && tierStyle ? (
        <div className="flex flex-col gap-[10px]">
          <p className={eyebrow}>Protein score</p>
          <div className={`rounded-[20px] p-4 ${tierStyle.chip}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className={`font-heading text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums ${tierStyle.value}`}>{(Math.round(score * 10) / 10).toFixed(1)}g</span>
                <span className="text-[13px] font-semibold text-slate-500">protein / 100 cal</span>
              </div>
              <span className={`rounded-full bg-white/70 px-[10px] py-[5px] text-xs font-bold ${tierStyle.value}`}>{PROTEIN_SCORE_TIER_SCALE[tier].label}</span>
            </div>
            <div className="mt-[14px] grid grid-cols-5 gap-1" aria-hidden="true">
              {PROTEIN_SCORE_TIER_ORDER.map((t, index) => {
                const filled = index <= PROTEIN_SCORE_TIER_ORDER.indexOf(tier);
                return (
                  <div key={t} className="flex flex-col gap-1.5">
                    <span className={`h-1.5 rounded-[3px] ${filled ? proteinScoreTierStyles[tier].iconWrap : "bg-slate-200"}`} />
                    <span className={`text-[10px] font-bold ${t === tier ? tierStyle.value : "text-slate-400"}`}>{PROTEIN_SCORE_TIER_SCALE[t].label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <button type="button" onClick={onOpenFacts} className="flex items-center justify-between gap-3 rounded-[18px] px-4 py-[14px] text-left shadow-[0_0_0_1px_#e2e8f0] focus-ring">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold text-slate-900">Nutrition Facts</span>
          <span className="text-[12.5px] text-slate-500">Sodium, sugar, fiber, cholesterol and more</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 9 15" fill="none" aria-hidden="true"><path d="m1.5 1.5 6 6-6 6" stroke="#047857" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {onRemove ? <button type="button" onClick={onRemove} className="h-12 rounded-2xl bg-[#fef2f2] text-[15px] font-bold text-[#b91c1c] focus-ring">Remove from order</button> : null}
    </div>
  );
}
