type MacroSplitLabelMode = "auto" | "full" | "short" | "percent";

type MacroSplitBarProps = {
  protein: number;
  carbs: number;
  totalFat: number;
  labelMode?: MacroSplitLabelMode;
};

const MACRO_SEGMENT_STYLES = {
  protein: "bg-[#c2410c] text-white",
  carbs: "bg-[#ca8a04] text-white",
  totalFat: "bg-[#2563eb] text-white",
} as const;

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
  const macroSegments = [
    {
      label: "Protein",
      percent: macroTotalGrams > 0 ? (protein / macroTotalGrams) * 100 : 0,
      color: MACRO_SEGMENT_STYLES.protein,
    },
    {
      label: "Carbs",
      percent: macroTotalGrams > 0 ? (carbs / macroTotalGrams) * 100 : 0,
      color: MACRO_SEGMENT_STYLES.carbs,
    },
    {
      label: "Fat",
      percent: macroTotalGrams > 0 ? (totalFat / macroTotalGrams) * 100 : 0,
      color: MACRO_SEGMENT_STYLES.totalFat,
    },
  ];

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
