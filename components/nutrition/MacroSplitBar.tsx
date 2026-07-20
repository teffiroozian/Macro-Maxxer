import { gramMacroOrder, macroDisplayConfig } from "@/components/nutrition/macroDisplay";
import type { MacroKey } from "@/components/nutrition/macroDisplay";

type MacroSplitLabelMode = "auto" | "full" | "short" | "percent";

type MacroSplitBarProps = {
  protein: number;
  carbs: number;
  totalFat: number;
  labelMode?: MacroSplitLabelMode;
};

function formatMacroSegmentLabel(label: string, percent: number, labelMode: MacroSplitLabelMode = "auto") {
  const roundedPercent = Math.round(percent);

  if (labelMode === "full") return `${label} ${roundedPercent}%`;
  if (labelMode === "short") return `${label.charAt(0)} ${roundedPercent}%`;
  if (labelMode === "percent") return `${roundedPercent}%`;

  if (percent >= 18) return `${label} ${roundedPercent}%`;
  if (percent >= 10) return `${label.charAt(0)} ${roundedPercent}%`;
  return `${roundedPercent}%`;
}

export default function MacroSplitBar({ protein, carbs, totalFat, labelMode = "auto" }: MacroSplitBarProps) {
  const macroTotalGrams = protein + carbs + totalFat;
  const macroValues: Record<Exclude<MacroKey, "calories">, number> = { protein, carbs, totalFat };
  const macroSegments = gramMacroOrder.map((macroKey) => ({
    label: macroDisplayConfig[macroKey].label,
    percent: macroTotalGrams > 0 ? (macroValues[macroKey] / macroTotalGrams) * 100 : 0,
    color: macroDisplayConfig[macroKey].segmentClassName,
  }));

  return (
    <div className="flex h-11 w-full gap-1 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 p-1">
      {macroSegments.map((segment) => (
        <div
          key={segment.label}
          className={`flex min-w-0 items-center justify-center rounded-xl px-1 text-[11px] font-semibold text-neutral-900 ${segment.color}`}
          style={{ width: `${segment.percent}%` }}
        >
          {formatMacroSegmentLabel(segment.label, segment.percent, labelMode)}
        </div>
      ))}
    </div>
  );
}
