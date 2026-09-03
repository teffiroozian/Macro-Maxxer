import Image from "@/components/ui/AppImage";
import { ArrowRight, Lock, RotateCcw, Save } from "lucide-react";
import type { MenuItem } from "@/types/menu";
import NutritionFactsPanel, {
  type NutritionFactsPanelProps,
} from "@/components/nutrition/NutritionFactsPanel";
import SurfaceCard from "@/components/ui/SurfaceCard";
import AppButton from "@/components/ui/AppButton";
import QuantityStepper from "@/components/QuantityStepper";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import {
  PortionControlsRow,
  type CompactOption,
} from "@/components/menu-item-card/IngredientCompactCard";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];

type PortionControl = { options: CompactOption[]; selectedId: string };

const INCLUDED_INGREDIENT_CATEGORY_KEY = "included ingredient";

type Props = {
  adjustedNutritionLabelTotals: NutritionFactsPanelProps["totals"];
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
  onResetOrder?: () => void;
  onSaveOrder?: () => void;
  onAdjustIngredientQuantity: (ingredientId: string, delta: 1 | -1) => void;
  portionControlByIngredientId?: Record<string, PortionControl>;
  onPortionModeChange?: (item: MenuItem, modeId: string) => void;
  onNavigateToCategory?: (categoryKey: string) => void;
  hideActionButtons?: boolean;
  variant?: "embedded" | "panel";
};

function SelectedIngredientRow({
  ingredientId,
  selectedIngredient,
  portionLabel,
  portionControl,
  isLocked,
  isPanel,
  restaurantLogo,
  onAdjustIngredientQuantity,
  onPortionModeChange,
}: {
  ingredientId: string;
  selectedIngredient: { item: MenuItem; quantity: number };
  portionLabel?: string;
  portionControl?: PortionControl;
  isLocked: boolean;
  isPanel: boolean;
  restaurantLogo: string;
  onAdjustIngredientQuantity: (ingredientId: string, delta: 1 | -1) => void;
  onPortionModeChange?: (item: MenuItem, modeId: string) => void;
}) {
  const isRemoved = isPanel && selectedIngredient.quantity === 0;

  if (!isPanel) {
    return (
      <SurfaceCard as="li" padding="none" radius="default" shadow="none" className="flex items-center justify-between rounded-xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
            <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={32} height={32} className="h-full w-full object-cover" />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
            {selectedIngredient.item.name}
            {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
            {portionLabel ? ` · ${portionLabel}` : ""}
          </span>
        </div>
        <QuantityStepper
          value={selectedIngredient.quantity}
          onDecrement={() => onAdjustIngredientQuantity(ingredientId, -1)}
          onIncrement={() => onAdjustIngredientQuantity(ingredientId, 1)}
          decrementLabel={`Decrease ${selectedIngredient.item.name}`}
          incrementLabel={`Increase ${selectedIngredient.item.name}`}
          decrementDisabled={isLocked}
          incrementDisabled={isLocked}
          variant="small"
        />
      </SurfaceCard>
    );
  }

  if (isLocked) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 opacity-80 sm:h-9 sm:w-9">
            <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={44} height={44} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-600">{selectedIngredient.item.name}</p>
            {portionLabel ? <p className="truncate text-xs text-slate-400">{portionLabel}</p> : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Included
        </span>
      </li>
    );
  }

  // Same content everywhere, but the quantity stepper moves from inline
  // (desktop/tablet) to its own right-aligned row underneath (mobile) —
  // same technique ItemDetailsPanel's standard ingredient rows use, via two
  // breakpoint-gated copies of the stepper rather than one repositioned
  // element, so each layout stays simple instead of fighting flex-wrap.
  const stepper = (
    <QuantityStepper
      value={selectedIngredient.quantity}
      onDecrement={() => onAdjustIngredientQuantity(ingredientId, -1)}
      onIncrement={() => onAdjustIngredientQuantity(ingredientId, 1)}
      decrementLabel={`Decrease ${selectedIngredient.item.name}`}
      incrementLabel={`Increase ${selectedIngredient.item.name}`}
      decrementDisabled={selectedIngredient.quantity <= 0}
      incrementDisabled={false}
      variant="small"
    />
  );

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2 transition-opacity duration-150 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3 sm:py-2.5 ${
        isRemoved ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 sm:h-9 sm:w-9">
          <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={44} height={44} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{selectedIngredient.item.name}</p>
          {isRemoved ? (
            <p className="truncate text-xs font-medium text-slate-400">Removed</p>
          ) : portionControl && onPortionModeChange ? (
            <div className="mt-1">
              <PortionControlsRow
                options={portionControl.options}
                selectedOptionId={portionControl.selectedId}
                onSelect={(optionId) => onPortionModeChange(selectedIngredient.item, optionId)}
              />
            </div>
          ) : portionLabel ? (
            <p className="truncate text-xs text-slate-500">{portionLabel}</p>
          ) : null}
        </div>
      </div>
      <div className="flex w-full justify-end sm:hidden">{stepper}</div>
      <div className="hidden shrink-0 sm:block">{stepper}</div>
    </li>
  );
}

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
  portionControlByIngredientId,
  onPortionModeChange,
  onNavigateToCategory,
  hideActionButtons = false,
  variant = "embedded",
}: Props) {
  const isPanel = variant === "panel";

  return (
    <div className={isPanel ? "flex h-full min-h-0 flex-col" : "space-y-3"}>
      {!isPanel && !hideActionButtons ? (
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

      <div
        className={
          isPanel
            ? "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3 pt-4 sm:p-5 lg:grid-cols-[2fr_3fr] lg:gap-6 lg:overflow-hidden"
            : "grid items-stretch gap-4 lg:grid-cols-2"
        }
      >
        <div className={isPanel ? "order-2 lg:order-1 lg:h-full lg:min-h-0 lg:overflow-y-auto" : "order-2 lg:order-1"}>
          <NutritionFactsPanel
            totals={adjustedNutritionLabelTotals}
            className={isPanel ? "py-4" : undefined}
          />
        </div>

        <SurfaceCard
          as="section"
          padding={isPanel ? "none" : "comfortable"}
          radius="large"
          shadow="none"
          className={`flex flex-col ${isPanel ? "p-3 pb-0 sm:p-5 sm:pb-0 order-1 lg:order-2 lg:h-full lg:min-h-0 lg:overflow-y-auto" : "order-1 h-full min-h-0 lg:order-2"}`}
        >
          <h3 className="text-2xl font-bold text-neutral-900">Selected Ingredients</h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">{selectedBuildName} · {selectedIngredientCount} selected</p>
          <div className={isPanel ? "mt-4 flex-1 space-y-4 lg:min-h-0" : "mt-4 min-h-0 flex-1 rounded-xl bg-[#efefef] p-2"}>
            <div className={isPanel ? "space-y-4 pb-5" : "space-y-3"}>
              {groupedSelectedIngredientEntries.map((group) => {
                const canNavigateToCategory =
                  isPanel &&
                  Boolean(onNavigateToCategory) &&
                  group.categoryKey !== INCLUDED_INGREDIENT_CATEGORY_KEY;

                return (
                  <div key={group.categoryKey || "uncategorized"} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 px-1">
                      <SectionEyebrow className="text-[10px] text-slate-500">{group.categoryLabel}</SectionEyebrow>
                      {canNavigateToCategory ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToCategory?.(group.categoryKey)}
                          aria-label={`Edit ${group.categoryLabel} in the builder`}
                          className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-black/5 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
                        >
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <ul className="grid gap-2">
                      {group.entries.map(([ingredientId, selectedIngredient]) => (
                        <SelectedIngredientRow
                          key={ingredientId}
                          ingredientId={ingredientId}
                          selectedIngredient={selectedIngredient}
                          portionLabel={ingredientPortionLabelById[ingredientId]}
                          portionControl={portionControlByIngredientId?.[ingredientId]}
                          isLocked={lockedIngredientIds.has(ingredientId)}
                          isPanel={isPanel}
                          restaurantLogo={restaurantLogo}
                          onAdjustIngredientQuantity={onAdjustIngredientQuantity}
                          onPortionModeChange={onPortionModeChange}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
