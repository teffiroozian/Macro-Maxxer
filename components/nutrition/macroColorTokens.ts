import type { CoreMacros } from "@/types/nutrition";

type MacroKey = keyof CoreMacros;

export type MacroColorToken = {
  valueClassName: string;
  barValueClassName: string;
  segmentClassName: string;
};

export const macroColorTokens: Record<MacroKey, MacroColorToken> = {
  calories: {
    valueClassName: "text-slate-900",
    barValueClassName: "text-[#111318]",
    segmentClassName: "bg-[#111318] text-white",
  },
  protein: {
    valueClassName: "text-[#c2410c]",
    barValueClassName: "text-[#C75A1B]",
    segmentClassName: "bg-[#c2410c] text-white",
  },
  carbs: {
    valueClassName: "text-[#ca8a04]",
    barValueClassName: "text-[#D0A700]",
    segmentClassName: "bg-[#ca8a04] text-white",
  },
  totalFat: {
    valueClassName: "text-[#2563eb]",
    barValueClassName: "text-[#2563eb]",
    segmentClassName: "bg-[#2563eb] text-white",
  },
};
