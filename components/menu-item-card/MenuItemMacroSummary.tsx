import { getRankingCardMacroKeys, type CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import type { RankMetric } from "@/lib/menuSections/sortOptions";
import type { ReactNode } from "react";
import { formatDelta } from "@/lib/menuItemCalculations";
import MacroStat from "@/components/nutrition/MacroStat";
import ProteinScorePill from "./ProteinScorePill";
import type { ProteinScoreTier } from "@/lib/nutrition";
import type { ItemImagePresentation } from "@/types/menu";

export default function MenuItemMacroSummary({
  displayCalories,
  displayProtein,
  displayCarbs,
  displayFat,
  displayFiber,
  rankMetric,
  cardDisplayOverride,
  caloriesDelta,
  proteinDelta,
  carbsDelta,
  fatDelta,
  quantityMultiplier,
  hasActiveCustomization,
  proteinScore,
  proteinScoreTier,
  itemName,
  itemImage,
  itemImagePresentation,
  imageClassName,
  imageBackgroundColor,
  actions,
  rankedLayout,
}: {
  displayCalories: number;
  displayProtein: number;
  displayCarbs: number;
  displayFat: number;
  displayFiber?: number;
  rankMetric?: RankMetric;
  cardDisplayOverride?: CardDisplayMode;
  caloriesDelta: number;
  proteinDelta: number;
  carbsDelta: number;
  fatDelta: number;
  quantityMultiplier: number;
  hasActiveCustomization: boolean;
  proteinScore?: number;
  proteinScoreTier?: ProteinScoreTier;
  itemName?: string;
  itemImage?: string;
  // Item-level override for `itemImage`, plus the restaurant-level
  // fallbacks — forwarded to the Protein Score pill/modal so its thumbnail
  // matches how the same image renders on this card (see
  // lib/itemImagePresentation.ts).
  itemImagePresentation?: ItemImagePresentation;
  imageClassName?: string;
  imageBackgroundColor?: string;
  actions: ReactNode;
  rankedLayout?: "list" | "grid";
}) {
  const macroSize = rankedLayout === "grid" ? "gridCard" as const : "card" as const;

  return (
    <div className={`${rankedLayout === "grid" ? "mt-3 lg:mt-4 lg:flex lg:flex-1 lg:flex-col" : "mt-4 lg:mt-auto"}`}>
      {typeof proteinScore === "number" && proteinScoreTier ? (
        <ProteinScorePill
          scorePerHundredCalories={proteinScore}
          tier={proteinScoreTier}
          protein={displayProtein}
          calories={displayCalories}
          itemName={itemName}
          itemImage={itemImage}
          itemImagePresentation={itemImagePresentation}
          imageClassName={imageClassName}
          imageBackgroundColor={imageBackgroundColor}
          className={`mb-3 ${rankedLayout === "list" ? "hidden lg:inline-flex" : ""}`}
        />
      ) : null}
      <div className={`flex flex-wrap items-end border-t border-black/[0.06] ${rankedLayout === "grid" ? "gap-x-4 gap-y-3 pt-3 lg:gap-x-6" : "gap-x-4 gap-y-3 pt-4 lg:gap-x-8"}`}>
        {getRankingCardMacroKeys(rankMetric, cardDisplayOverride).map((key) => {
          const values = { calories: displayCalories, protein: displayProtein, carbs: displayCarbs, totalFat: displayFat, fiber: displayFiber ?? NaN };
          const deltas = { calories: caloriesDelta, protein: proteinDelta, carbs: carbsDelta, totalFat: fatDelta, fiber: undefined };
          return <MacroStat key={key} macroKey={key} value={values[key]} delta={hasActiveCustomization && deltas[key] !== undefined ? formatDelta(deltas[key]! * quantityMultiplier) : undefined} labelVariant="uppercase" size={macroSize} />;
        })}

        <div className={rankedLayout === "grid" ? "ml-auto inline-flex items-end justify-end gap-2 lg:mt-4 lg:basis-full lg:w-full" : "ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto"}>
          {actions}
        </div>
      </div>
    </div>
  );
}
