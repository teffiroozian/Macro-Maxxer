import type { ReactNode } from "react";
import { macroDisplayConfig } from "@/components/MacroTotalsGrid";
import type { CoreMacros } from "@/types/nutrition";

type MacroTone = keyof CoreMacros;

type MacroStatSize = "summary" | "quick" | "cartCompact" | "cartDetailed";

type MacroStatProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  tone: MacroTone;
  size: MacroStatSize;
  delta?: ReactNode;
};

const valueClassBySize: Record<MacroStatSize, string> = {
  summary: "text-2xl font-bold",
  quick: "text-sm leading-4 font-bold",
  cartCompact: "font-semibold",
  cartDetailed: "text-base font-semibold",
};

export default function MacroStat({
  label,
  value,
  unit,
  tone,
  size,
  delta,
}: MacroStatProps) {
  const toneClass = macroDisplayConfig[tone].valueClassNameByVariant.default;

  if (size === "summary") {
    return (
      <div className="flex flex-col items-center justify-start">
        <div className="inline-flex items-baseline gap-1.5">
          <div className={`${valueClassBySize[size]} ${toneClass}`}>
            {value}
            {unit ?? ""}
          </div>
          {delta ? <span className="text-sm font-bold text-green-600">{delta}</span> : null}
        </div>
        <div className="text-[10px] font-bold">{label}</div>
      </div>
    );
  }

  if (size === "quick") {
    return (
      <div className="flex min-w-0 flex-col items-center justify-center">
        <span className={`${valueClassBySize[size]} ${toneClass}`}>
          {value}
          {unit ?? ""}
        </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-600">
          {label}
        </span>
      </div>
    );
  }

  if (size === "cartCompact") {
    return (
      <p className="text-slate-500">
        {label}:<span className={`ml-1 ${valueClassBySize[size]} ${toneClass}`}>
          {value}
          {unit ?? ""}
        </span>
      </p>
    );
  }

  return (
    <p className="whitespace-nowrap text-slate-500">
      <span className={`${valueClassBySize[size]} ${toneClass}`}>
        {value}
        {unit ?? ""}
      </span>
      <span className="ml-1 text-xs">{label}</span>
    </p>
  );
}
