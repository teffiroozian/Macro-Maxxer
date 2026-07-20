import Image from "next/image";
import { RotateCcw, Save } from "lucide-react";
import type { MenuItem } from "@/types/menu";
import NutritionLabelCard, { type NutritionLabelTotals } from "@/components/nutrition/NutritionLabelCard";
import SurfaceCard from "@/components/ui/SurfaceCard";
import AppButton from "@/components/ui/AppButton";
import QuantityStepper from "@/components/QuantityStepper";
import SectionEyebrow from "@/components/ui/SectionEyebrow";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];

type Props = {
  adjustedNutritionLabelTotals: NutritionLabelTotals;
  selectedBuildName: string;
  selectedIngredientCount: number;
  groupedSelectedIngredientEntries: Array<{
    categoryKey: string;
    categoryLabel: string;
    entries: SelectedEntry[];
  }>;
  ingredientPortionLabelById: Record<string, string>;
  lockedIngredientIds: Set<string>;
  restaurantLogo: string;
  onResetOrder: () => void;
  onSaveOrder: () => void;
  onAdjustIngredientQuantity: (ingredientId: string, delta: 1 | -1) => void;
  hideActionButtons?: boolean;
};

export default function BuildSummaryDrawer({
  adjustedNutritionLabelTotals,
  selectedBuildName,
  selectedIngredientCount,
  groupedSelectedIngredientEntries,
  ingredientPortionLabelById,
  lockedIngredientIds,
  restaurantLogo,
  onResetOrder,
  onSaveOrder,
  onAdjustIngredientQuantity,
  hideActionButtons = false,
}: Props) {
  return (
    <div className="space-y-3">
      {!hideActionButtons ? (
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-end gap-2 bg-white/95 px-1 py-1 backdrop-blur-sm">
          <AppButton variant="secondary" size="sm" onClick={onResetOrder} className="h-7 px-3 text-xs text-slate-700">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset order</span>
          </AppButton>
          <AppButton size="sm" onClick={onSaveOrder} className="h-7 border-transparent bg-slate-900 px-3 text-xs hover:bg-slate-800">
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save order</span>
          </AppButton>
        </div>
      ) : null}

      <div className="grid items-stretch gap-4">
        <SurfaceCard as="section" padding="comfortable" radius="large" shadow="none" className="flex h-full min-h-0 flex-col">
          <h3 className="text-2xl font-bold text-neutral-900">Selected Ingredients</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{selectedBuildName} · {selectedIngredientCount} selected</p>
          <div className="mt-4 min-h-0 flex-1 rounded-xl bg-[#efefef] p-2">
            <div className="space-y-3">
              {groupedSelectedIngredientEntries.map((group) => (
                <div key={group.categoryKey || "uncategorized"} className="space-y-1.5">
                  <SectionEyebrow className="px-1 text-[10px] tracking-[0.06em] text-slate-500">{group.categoryLabel}</SectionEyebrow>
                  <ul className="grid gap-2">
                    {group.entries.map(([ingredientId, selectedIngredient]) => (
                      <SurfaceCard as="li" key={ingredientId} padding="none" radius="default" shadow="none" className="flex items-center justify-between rounded-xl px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
                            <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.name} width={32} height={32} className="h-full w-full object-cover" />
                          </div>
                          <span className="truncate text-sm font-medium text-slate-900">
                            {selectedIngredient.item.name}
                            {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
                            {ingredientPortionLabelById[ingredientId] ? ` · ${ingredientPortionLabelById[ingredientId]}` : ""}
                          </span>
                        </div>
                        <QuantityStepper
                          value={selectedIngredient.quantity}
                          onDecrement={() => onAdjustIngredientQuantity(ingredientId, -1)}
                          onIncrement={() => onAdjustIngredientQuantity(ingredientId, 1)}
                          decrementLabel={`Decrease ${selectedIngredient.item.name}`}
                          incrementLabel={`Increase ${selectedIngredient.item.name}`}
                          decrementDisabled={lockedIngredientIds.has(ingredientId)}
                          incrementDisabled={lockedIngredientIds.has(ingredientId)}
                          variant="small"
                        />
                      </SurfaceCard>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <NutritionLabelCard
          totals={adjustedNutritionLabelTotals}
          title="Nutrition Summary"
          eyebrow="Amount per serving"
        />
      </div>
    </div>
  );
}
