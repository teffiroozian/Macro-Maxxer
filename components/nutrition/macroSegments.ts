import { macroDisplayConfig } from "@/components/nutrition/macroDisplay";

export type MacroSegment = {
  label: string;
  shortLabel: string;
  grams: number;
  percent: number;
  roundedPercent: number;
  color: string;
};

// Pure data transform — no "use client" dependency, so Server Components
// (e.g. ProductPreviewCard) can call it directly instead of crossing into
// MacroSplitChart.tsx's client boundary just to build the segment list.
// Shared with the standard item modal's Macro Split section (ItemDetailsPanel)
// so any prebuilt/preset review card that shows a macro split stays visually
// and numerically identical to it.
export function buildMacroSegments({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}): MacroSegment[] {
  const macroTotalGrams = protein + carbs + fat;

  return [
    {
      label: "Protein",
      shortLabel: "P",
      grams: protein,
      percent: macroTotalGrams > 0 ? (protein / macroTotalGrams) * 100 : 0,
      color: macroDisplayConfig.protein.segmentClassName,
    },
    {
      label: "Carbs",
      shortLabel: "C",
      grams: carbs,
      percent: macroTotalGrams > 0 ? (carbs / macroTotalGrams) * 100 : 0,
      color: macroDisplayConfig.carbs.segmentClassName,
    },
    {
      label: "Fat",
      shortLabel: "F",
      grams: fat,
      percent: macroTotalGrams > 0 ? (fat / macroTotalGrams) * 100 : 0,
      color: macroDisplayConfig.totalFat.segmentClassName,
    },
  ].map((segment) => ({ ...segment, roundedPercent: Math.round(segment.percent) }));
}
