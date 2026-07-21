import type { ReactNode } from "react";
import { formatDelta } from "@/lib/menuItemCalculations";
import MacroStat from "@/components/nutrition/MacroStat";

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
        macroKey="protein"
        value={displayProtein}
        delta={hasActiveCustomization ? formatDelta(proteinDelta * quantityMultiplier) : undefined}
        labelVariant="uppercase"
        size="summary"
      />
      <MacroStat
        macroKey="carbs"
        value={displayCarbs}
        delta={hasActiveCustomization ? formatDelta(carbsDelta * quantityMultiplier) : undefined}
        labelVariant="uppercase"
        size="summary"
      />
      <MacroStat
        macroKey="totalFat"
        value={displayFat}
        delta={hasActiveCustomization ? formatDelta(fatDelta * quantityMultiplier) : undefined}
        labelVariant="uppercase"
        size="summary"
      />

      <div className="ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto">
        {actions}
      </div>
    </div>
  );
}
