import type { ReactNode } from "react";
import { macroDisplayConfig } from "@/components/nutrition/macroDisplay";
import type { MacroKey } from "@/components/nutrition/macroDisplay";

type MacroStatSize = "summary" | "quick" | "cartCompact" | "cartDetailed" | "ingredientCompact";
type MacroStatLabel = "label" | "shortLabel" | "uppercase" | "lowercase";

type MacroStatProps = {
  macroKey: MacroKey;
  value: number | string;
  size: MacroStatSize;
  labelVariant?: MacroStatLabel;
  delta?: ReactNode;
};

const valueClassBySize: Record<MacroStatSize, string> = {
  summary: "text-2xl font-bold",
  quick: "text-sm leading-4 font-bold",
  cartCompact: "font-semibold",
  cartDetailed: "text-base font-semibold",
  ingredientCompact: "text-lg leading-none font-bold sm:text-xl",
};

function resolveLabel(macroKey: MacroKey, labelVariant: MacroStatLabel) {
  const config = macroDisplayConfig[macroKey];

  if (labelVariant === "shortLabel") return config.shortLabel;
  if (labelVariant === "uppercase") return config.label.toUpperCase();
  if (labelVariant === "lowercase") return config.label.toLowerCase();
  return config.label;
}

function formatMacroValue(macroKey: MacroKey, value: number | string) {
  const unit = macroDisplayConfig[macroKey].unit ?? "";

  if (typeof value === "number") {
    if (Number.isNaN(value)) return macroKey === "calories" ? "—" : `—${unit}`;
    return `${value}${unit}`;
  }

  const trimmedValue = value.trim();
  if (!unit || trimmedValue.toLowerCase().endsWith(unit.toLowerCase())) return trimmedValue;
  return `${trimmedValue}${unit}`;
}

export default function MacroStat({
  macroKey,
  value,
  size,
  labelVariant = "label",
  delta,
}: MacroStatProps) {
  const toneClass = macroDisplayConfig[macroKey].valueClassNameByVariant.default;
  const displayValue = formatMacroValue(macroKey, value);
  const label = resolveLabel(macroKey, labelVariant);

  if (size === "summary") {
    return (
      <div className="flex flex-col items-center justify-start">
        <div className="inline-flex items-baseline gap-1.5">
          <div className={`${valueClassBySize[size]} ${toneClass}`}>{displayValue}</div>
          {delta ? <span className="text-sm font-bold text-green-600">{delta}</span> : null}
        </div>
        <div className="text-[10px] font-bold">{label}</div>
      </div>
    );
  }

  if (size === "quick") {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center">
        <span className={`${valueClassBySize[size]} ${toneClass}`}>{displayValue}</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-600">
          {label}
        </span>
      </div>
    );
  }

  if (size === "cartCompact") {
    return (
      <p className="text-slate-500">
        {label}:<span className={`ml-1 ${valueClassBySize[size]} ${toneClass}`}>{displayValue}</span>
      </p>
    );
  }

  if (size === "ingredientCompact") {
    return (
      <div className="flex min-w-[44px] flex-col items-center gap-1 sm:min-w-[54px]">
        <div className={`${valueClassBySize[size]} ${toneClass}`}>{displayValue}</div>
        <div
          className={`font-semibold uppercase tracking-wide text-black/80 ${
            macroKey === "protein" ? "text-[9px] sm:text-[10px]" : "text-[10px]"
          }`}
        >
          {label}
        </div>
      </div>
    );
  }

  return (
    <p className="whitespace-nowrap text-slate-500">
      <span className={`${valueClassBySize[size]} ${toneClass}`}>{displayValue}</span>
      <span className="ml-1 text-xs">{label}</span>
    </p>
  );
}
