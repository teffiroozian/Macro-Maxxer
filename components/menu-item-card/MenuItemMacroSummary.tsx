import type { ReactNode } from "react";
import { formatDelta } from "@/lib/menuItemCalculations";
import MacroStat from "@/components/nutrition/MacroStat";

export default function MenuItemMacroSummary({
  displayCalories,
  displayProtein,
  displayCarbs,
  displayFat,
  caloriesDelta,
  proteinDelta,
  carbsDelta,
  fatDelta,
  quantityMultiplier,
  hasActiveCustomization,
  actions,
}: {
  displayCalories: number;
  displayProtein: number;
  displayCarbs: number;
  displayFat: number;
  caloriesDelta: number;
  proteinDelta: number;
  carbsDelta: number;
  fatDelta: number;
  quantityMultiplier: number;
  hasActiveCustomization: boolean;
  actions: ReactNode;
}) {
  return (
    <div className="mt-3 lg:mt-auto">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-black/[0.06] pt-3 lg:gap-x-8">
        <MacroStat
          macroKey="calories"
          value={displayCalories}
          delta={hasActiveCustomization ? formatDelta(caloriesDelta * quantityMultiplier) : undefined}
          labelVariant="uppercase"
          size="card"
        />
        <MacroStat
          macroKey="protein"
          value={displayProtein}
          delta={hasActiveCustomization ? formatDelta(proteinDelta * quantityMultiplier) : undefined}
          labelVariant="uppercase"
          size="card"
        />
        <MacroStat
          macroKey="carbs"
          value={displayCarbs}
          delta={hasActiveCustomization ? formatDelta(carbsDelta * quantityMultiplier) : undefined}
          labelVariant="uppercase"
          size="card"
        />
        <MacroStat
          macroKey="totalFat"
          value={displayFat}
          delta={hasActiveCustomization ? formatDelta(fatDelta * quantityMultiplier) : undefined}
          labelVariant="uppercase"
          size="card"
        />

        <div className="ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto">
          {actions}
        </div>
      </div>
    </div>
  );
}
