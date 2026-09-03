"use client";

import type { MenuItem } from "@/types/menu";
import InlineVariantSelect, { type InlineVariantSelectOption } from "@/components/ui/InlineVariantSelect";
import { SelectionScrollList, SelectionSummaryRow, SelectionSummaryShell } from "@/components/item-route-modal/SelectionSummaryPanels";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];
// Same entries as above, plus the category each ingredient was grouped
// under — needed to resolve which portion options (if any) apply to it and
// to route a portion change to the right piece of build state.
type SelectedEntryWithCategory = [string, { item: MenuItem; quantity: number }, string];

export default function SelectedIngredientsReviewCard({
    selectedBuildName,
    groupedSelectedIngredientEntries,
    lockedIngredientIds,
    restaurantLogo,
    adjustedTotals,
    portionModeOptionsById,
    selectedPortionModeIdById,
    onPortionModeChange,
}: {
    selectedBuildName: string;
    groupedSelectedIngredientEntries: Array<{
        categoryKey: string;
        categoryLabel: string;
        entries: SelectedEntry[];
    }>;
    lockedIngredientIds: Set<string>;
    restaurantLogo: string;
    adjustedTotals: {
        calories: number;
        protein: number;
        carbs: number;
        totalFat: number;
    };
    portionModeOptionsById: Record<string, InlineVariantSelectOption[]>;
    selectedPortionModeIdById: Record<string, string>;
    onPortionModeChange: (
        ingredientId: string,
        category: string,
        modeId: string,
    ) => void;
}) {
    const flatEntries: SelectedEntryWithCategory[] = groupedSelectedIngredientEntries.flatMap((group) =>
        group.entries.map<SelectedEntryWithCategory>(([id, entry]) => [id, entry, group.categoryKey]),
    );
    const selectedIngredientCount = flatEntries.reduce((sum, [, entry]) => sum + entry.quantity, 0);

    return (
        <SelectionSummaryShell
            title="Selected Ingredients"
            subtitle={`${selectedBuildName} · ${selectedIngredientCount} selected`}
            totals={adjustedTotals}
        >
            <SelectionScrollList>
                {flatEntries.map(([ingredientId, selectedIngredient, category]) => {
                    const portionModeOptions = portionModeOptionsById[ingredientId];
                    const isLocked = lockedIngredientIds.has(ingredientId);
                    const name = `${selectedIngredient.item.name}${selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}${isLocked ? " · Included" : ""}`;

                    return (
                        <SelectionSummaryRow
                            key={ingredientId}
                            image={selectedIngredient.item.image}
                            fallbackImage={restaurantLogo}
                            name={name}
                            imageAlt={selectedIngredient.item.name}
                            accessory={
                                portionModeOptions && portionModeOptions.length > 0 ? (
                                    <InlineVariantSelect
                                        options={portionModeOptions}
                                        selectedOptionId={selectedPortionModeIdById[ingredientId]}
                                        onSelectOption={(modeId) => onPortionModeChange(ingredientId, category, modeId)}
                                        ariaLabel={`Change ${selectedIngredient.item.name} portion`}
                                    />
                                ) : undefined
                            }
                        />
                    );
                })}
            </SelectionScrollList>
        </SelectionSummaryShell>
    );
}
