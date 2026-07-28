import { macroDisplayConfig } from "@/components/nutrition/macroDisplay";
import type { MacroKey } from "@/components/nutrition/macroDisplay";

type MacroBadgeProps = {
  macroKey: MacroKey;
  value: number;
  label?: string;
  className?: string;
};

// Small pill used to call out one macro value on top of product visuals
// (e.g. an item image). Reuses the same color tokens as MacroStat/MacroSplitBar
// so the accent color for a given macro stays consistent everywhere it appears.
export default function MacroBadge({ macroKey, value, label, className = "" }: MacroBadgeProps) {
  const config = macroDisplayConfig[macroKey];
  const toneClass = config.valueClassNameByVariant.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current ${toneClass}`} />
      <span className={toneClass}>
        {value}
        {config.unit ?? ""}
      </span>
      <span className="font-semibold text-neutral-500">{label ?? config.label}</span>
    </span>
  );
}
