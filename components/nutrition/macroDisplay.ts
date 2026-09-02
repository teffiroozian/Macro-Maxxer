import type { CoreMacros } from "@/types/nutrition";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";

export type MacroKey = keyof CoreMacros;
export type MacroDisplayVariant = "default" | "bar";

export type MacroDisplayConfig = {
  label: string;
  shortLabel: string;
  unit?: string;
  valueClassNameByVariant: Record<MacroDisplayVariant, string>;
  segmentClassName: string;
};

export const macroDisplayConfig: Record<MacroKey, MacroDisplayConfig> = {
  calories: {
    label: "Calories",
    shortLabel: "Cal",
    valueClassNameByVariant: {
      default: macroColorTokens.calories.valueClassName,
      bar: macroColorTokens.calories.barValueClassName,
    },
    segmentClassName: macroColorTokens.calories.segmentClassName,
  },
  protein: {
    label: "Protein",
    shortLabel: "P",
    unit: "g",
    valueClassNameByVariant: {
      default: macroColorTokens.protein.valueClassName,
      bar: macroColorTokens.protein.barValueClassName,
    },
    segmentClassName: macroColorTokens.protein.segmentClassName,
  },
  carbs: {
    label: "Carbs",
    shortLabel: "C",
    unit: "g",
    valueClassNameByVariant: {
      default: macroColorTokens.carbs.valueClassName,
      bar: macroColorTokens.carbs.barValueClassName,
    },
    segmentClassName: macroColorTokens.carbs.segmentClassName,
  },
  totalFat: {
    label: "Fat",
    shortLabel: "F",
    unit: "g",
    valueClassNameByVariant: {
      default: macroColorTokens.totalFat.valueClassName,
      bar: macroColorTokens.totalFat.barValueClassName,
    },
    segmentClassName: macroColorTokens.totalFat.segmentClassName,
  },
};

export const macroOrder: MacroKey[] = ["calories", "protein", "carbs", "totalFat"];
export const gramMacroOrder: Array<Exclude<MacroKey, "calories">> = ["protein", "carbs", "totalFat"];

/**
 * Formats user-facing macro totals without changing their stored precision.
 * Macro Maxxer presents calories and gram macros as whole numbers across its
 * summary surfaces.
 */
export function formatMacroDisplayNumber(value: number) {
  return Number.isFinite(value) ? String(Math.round(value)) : "—";
}

/** Protein density is the one summary metric that keeps a decimal place. */
export function formatProteinScoreDisplay(value: number) {
  if (!Number.isFinite(value)) return "—";
  return String(Math.round(value * 10) / 10);
}
