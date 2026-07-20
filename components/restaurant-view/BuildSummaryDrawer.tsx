import Image from "next/image";
import { RotateCcw, Save } from "lucide-react";
import type { MenuItem } from "@/types/menu";
import NutritionLabelCard, { type NutritionLabelTotals } from "@/components/nutrition/NutritionLabelCard";
import SurfaceCard from "@/components/ui/SurfaceCard";
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
          <button
            type="button"
            onClick={onResetOrder}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-black/20 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset order</span>
          </button>
          <button
            type="button"
            onClick={onSaveOrder}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save order</span>
          </button>
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
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAdjustIngredientQuantity(ingredientId, -1)}
                            disabled={lockedIngredientIds.has(ingredientId)}
                            className="h-7 w-7 rounded-full border border-black/20 text-base font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-slate-900">{selectedIngredient.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onAdjustIngredientQuantity(ingredientId, 1)}
                            disabled={lockedIngredientIds.has(ingredientId)}
                            className="h-7 w-7 rounded-full border border-black/20 text-base font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
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
