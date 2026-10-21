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
  const macroTotalCalories = protein * 4 + carbs * 4 + fat * 9;

  return [
    {
      label: "Protein",
      shortLabel: "P",
      grams: protein,
      percent: macroTotalCalories > 0 ? (protein * 4 / macroTotalCalories) * 100 : 0,
      color: macroDisplayConfig.protein.segmentClassName,
    },
    {
      label: "Carbs",
      shortLabel: "C",
      grams: carbs,
      percent: macroTotalCalories > 0 ? (carbs * 4 / macroTotalCalories) * 100 : 0,
      color: macroDisplayConfig.carbs.segmentClassName,
    },
    {
      label: "Fat",
      shortLabel: "F",
      grams: fat,
      percent: macroTotalCalories > 0 ? (fat * 9 / macroTotalCalories) * 100 : 0,
      color: macroDisplayConfig.totalFat.segmentClassName,
    },
  ].map((segment) => ({ ...segment, roundedPercent: Math.round(segment.percent) }));
}

// Energy share, rather than the gram share used by buildMacroSegments.
export function buildCalorieSegments({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }): MacroSegment[] {
  const grams = [protein, carbs, fat].map(value => Number.isFinite(value) ? Math.max(0, value) : 0);
  const energy = grams.map((value, index) => value * (index === 2 ? 9 : 4));
  const total = energy.reduce((sum, value) => sum + value, 0);
  const segments = buildMacroSegments({ protein: grams[0], carbs: grams[1], fat: grams[2] }).map((segment, index) => ({ ...segment, percent: total ? energy[index] / total * 100 : 0, roundedPercent: total ? Math.round(energy[index] / total * 100) : 0 }));
  if (total) segments[energy.indexOf(Math.max(...energy))].roundedPercent += 100 - segments.reduce((sum, segment) => sum + segment.roundedPercent, 0);
  return segments;
}
