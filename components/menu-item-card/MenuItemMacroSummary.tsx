import type { ReactNode } from "react";
import { formatDelta, formatMacro } from "@/lib/menuItemCalculations";

function MacroBlock({
  value,
  delta,
  label,
  toneClass,
  showDelta,
}: {
  value: number;
  delta: number;
  label: string;
  toneClass: string;
  showDelta: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-start">
      <div className="inline-flex items-baseline gap-1.5">
        <div className={`text-2xl font-bold ${toneClass}`}>{formatMacro(value)}</div>
        {showDelta ? <span className="text-sm font-bold text-green-600">{formatDelta(delta)}</span> : null}
      </div>
      <div className="text-[10px] font-bold">{label}</div>
    </div>
  );
}

export default function MenuItemMacroSummary({
  displayProtein,
  displayCarbs,
  displayFat,
  proteinDelta,
  carbsDelta,
  fatDelta,
  quantityMultiplier,
  hasActiveCustomization,
  actions,
}: {
  displayProtein: number;
  displayCarbs: number;
  displayFat: number;
  proteinDelta: number;
  carbsDelta: number;
  fatDelta: number;
  quantityMultiplier: number;
  hasActiveCustomization: boolean;
  actions: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-3 lg:mt-auto lg:gap-x-12">
      <MacroBlock
        value={displayProtein}
        delta={proteinDelta * quantityMultiplier}
        label="PROTEIN"
        toneClass="text-[#c2410c]"
        showDelta={hasActiveCustomization}
      />
      <MacroBlock
        value={displayCarbs}
        delta={carbsDelta * quantityMultiplier}
        label="CARBS"
        toneClass="text-[#ca8a04]"
        showDelta={hasActiveCustomization}
      />
      <MacroBlock
        value={displayFat}
        delta={fatDelta * quantityMultiplier}
        label="FAT"
        toneClass="text-[#2563eb]"
        showDelta={hasActiveCustomization}
      />

      <div className="ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto">
        {actions}
      </div>
    </div>
  );
}
