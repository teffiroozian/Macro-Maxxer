import type { CoreMacros } from "@/types/nutrition";

type MacroKey = keyof CoreMacros;

export type MacroColorToken = {
  valueClassName: string;
  compactValueClassName: string;
  barValueClassName: string;
  segmentClassName: string;
};

export const macroColorTokens: Record<MacroKey, MacroColorToken> = {
  calories: {
    compactValueClassName: "text-slate-900 dark:text-slate-50",
    valueClassName: "text-slate-900 dark:text-slate-50",
    barValueClassName: "text-[#111318]",
    segmentClassName: "bg-[#111318] text-white dark:bg-slate-50 dark:text-slate-950",
  },
  protein: {
    compactValueClassName: "text-[#c2410c] dark:text-[#f96306]",
    valueClassName: "text-[#c2410c] dark:text-[#f96306]",
    barValueClassName: "text-[#C75A1B]",
    segmentClassName: "bg-[#c2410c] text-white dark:bg-[#f96306] dark:text-slate-950",
  },
  carbs: {
    compactValueClassName: "text-[#ca8a04] dark:text-[#f9c406]",
    valueClassName: "text-[#ca8a04] dark:text-[#f9c406]",
    barValueClassName: "text-[#D0A700]",
    segmentClassName: "bg-[#ca8a04] text-white dark:bg-[#f9c406] dark:text-slate-950",
  },
  totalFat: {
    compactValueClassName: "text-[#2563eb] dark:text-slate-300",
    valueClassName: "text-[#2563eb] dark:text-[#336dfa]",
    barValueClassName: "text-[#2563eb]",
    segmentClassName: "bg-[#2563eb] text-white dark:bg-[#336dfa] dark:text-slate-950",
  },
};
