import type { ReactNode } from "react";
import { formatDelta, formatMacro } from "@/lib/menuItemCalculations";
import MacroStat from "@/components/nutrition/MacroStat";
import { macroDisplayConfig } from "@/components/nutrition/macroDisplay";

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
      <MacroStat
        value={formatMacro(displayProtein)}
        delta={hasActiveCustomization ? formatDelta(proteinDelta * quantityMultiplier) : undefined}
        label={macroDisplayConfig.protein.label.toUpperCase()}
        unit={macroDisplayConfig.protein.unit}
        tone="protein"
        size="summary"
      />
      <MacroStat
        value={formatMacro(displayCarbs)}
        delta={hasActiveCustomization ? formatDelta(carbsDelta * quantityMultiplier) : undefined}
        label={macroDisplayConfig.carbs.label.toUpperCase()}
        unit={macroDisplayConfig.carbs.unit}
        tone="carbs"
        size="summary"
      />
      <MacroStat
        value={formatMacro(displayFat)}
        delta={hasActiveCustomization ? formatDelta(fatDelta * quantityMultiplier) : undefined}
        label={macroDisplayConfig.totalFat.label.toUpperCase()}
        unit={macroDisplayConfig.totalFat.unit}
        tone="totalFat"
        size="summary"
      />

      <div className="ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto">
        {actions}
      </div>
    </div>
  );
}
