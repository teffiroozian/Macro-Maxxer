import type { CoreMacros } from "@/types/nutrition";

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
      default: "text-slate-900",
      bar: "text-[#111318]",
    },
    segmentClassName: "bg-[#111318] text-white",
  },
  protein: {
    label: "Protein",
    shortLabel: "P",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#c2410c]",
      bar: "text-[#C75A1B]",
    },
    segmentClassName: "bg-[#c2410c] text-white",
  },
  carbs: {
    label: "Carbs",
    shortLabel: "C",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#ca8a04]",
      bar: "text-[#D0A700]",
    },
    segmentClassName: "bg-[#ca8a04] text-white",
  },
  totalFat: {
    label: "Fat",
    shortLabel: "F",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#2563eb]",
      bar: "text-[#2563eb]",
    },
    segmentClassName: "bg-[#2563eb] text-white",
  },
};

export const macroOrder: MacroKey[] = ["calories", "protein", "carbs", "totalFat"];
export const gramMacroOrder: Array<Exclude<MacroKey, "calories">> = ["protein", "carbs", "totalFat"];
