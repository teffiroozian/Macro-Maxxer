"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@/types/menu";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import SurfaceCard from "@/components/ui/SurfaceCard";
import InlineVariantSelect, {
    type InlineVariantSelectOption,
} from "@/components/ui/InlineVariantSelect";
import ProteinScorePill from "@/components/menu-item-card/ProteinScorePill";
import MacroSplitChart, {
    buildMacroSegments,
    MacroLegendInfo,
} from "@/components/nutrition/MacroSplitChart";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];
// Same entries as above, plus the category each ingredient was grouped
// under — needed to resolve which portion options (if any) apply to it and
// to route a portion change to the right piece of build state.
type SelectedEntryWithCategory = [
    string,
    { item: MenuItem; quantity: number },
    string,
];

// Same compact row used by the Build Your Own order summary, plus an
// optional quick portion-edit dropdown (the same InlineVariantSelect used by
// the standard item modal's Meal Details rows) for ingredients that support
// a portion/variation — proteins, rice, beans. Ingredients without one keep
// the row exactly as it was: review-only.
function SelectedIngredientReviewRow({
    selectedIngredient,
    isLocked,
    restaurantLogo,
    portionModeOptions,
    selectedPortionModeId,
    onPortionModeChange,
}: {
    selectedIngredient: { item: MenuItem; quantity: number };
    isLocked: boolean;
    restaurantLogo: string;
    portionModeOptions?: InlineVariantSelectOption[];
    selectedPortionModeId?: string;
    onPortionModeChange?: (modeId: string) => void;
}) {
    return (
        <SurfaceCard
            as="li"
            padding="none"
            radius="default"
            shadow="none"
            className="flex items-center gap-2 rounded-xl px-3 py-2"
        >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
                <Image
                    src={selectedIngredient.item.image || restaurantLogo}
                    alt={selectedIngredient.item.name}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {selectedIngredient.item.name}
                {selectedIngredient.quantity > 1
                    ? ` (x${selectedIngredient.quantity})`
                    : ""}
                {isLocked ? " · Included" : ""}
            </span>
            {portionModeOptions && portionModeOptions.length > 0 && onPortionModeChange ? (
                <InlineVariantSelect
                    options={portionModeOptions}
                    selectedOptionId={selectedPortionModeId}
                    onSelectOption={onPortionModeChange}
                    ariaLabel={`Change ${selectedIngredient.item.name} portion`}
                />
            ) : null}
        </SurfaceCard>
    );
}

// Mirrors the standard item modal's Meal Details list scroll/fade behavior
// exactly (same sm:+ max-height, same bottom fade cue): at sm:+, where this
// sits beside the Nutrition Facts card in a two-column layout, a long build
// scrolls inside its own bounded area instead of pushing that pairing out of
// sync. Below sm:, the two columns stack and this list grows to its natural
// height instead, letting the modal itself be the only scroll container.
function ScrollableIngredientList({
    entries,
    lockedIngredientIds,
    restaurantLogo,
    portionModeOptionsById,
    selectedPortionModeIdById,
    onPortionModeChange,
}: {
    entries: SelectedEntryWithCategory[];
    lockedIngredientIds: Set<string>;
    restaurantLogo: string;
    portionModeOptionsById: Record<string, InlineVariantSelectOption[]>;
    selectedPortionModeIdById: Record<string, string>;
    onPortionModeChange: (
        ingredientId: string,
        category: string,
        modeId: string,
    ) => void;
}) {
    const scrollRef = useRef<HTMLUListElement>(null);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    }, []);

    useEffect(() => {
        updateScrollState();
        window.addEventListener("resize", updateScrollState);
        return () => window.removeEventListener("resize", updateScrollState);
    }, [updateScrollState, entries.length]);

    return (
        <div className="relative">
            <ul
                ref={scrollRef}
                onScroll={updateScrollState}
                className="grid list-none gap-2 pl-0 sm:max-h-[320px] sm:overflow-y-auto"
            >
                {entries.map(([ingredientId, selectedIngredient, category]) => {
                    const portionModeOptions =
                        portionModeOptionsById[ingredientId];
                    return (
                        <SelectedIngredientReviewRow
                            key={ingredientId}
                            selectedIngredient={selectedIngredient}
                            isLocked={lockedIngredientIds.has(ingredientId)}
                            restaurantLogo={restaurantLogo}
                            portionModeOptions={portionModeOptions}
                            selectedPortionModeId={
                                selectedPortionModeIdById[ingredientId]
                            }
                            onPortionModeChange={
                                portionModeOptions
                                    ? (modeId) =>
                                          onPortionModeChange(
                                              ingredientId,
                                              category,
                                              modeId,
                                          )
                                    : undefined
                            }
                        />
                    );
                })}
            </ul>
            <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-xl bg-gradient-to-t from-white to-transparent transition-opacity duration-150 ${
                    canScrollDown ? "opacity-100" : "opacity-0"
                }`}
            />
        </div>
    );
}

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
    const flatEntries: SelectedEntryWithCategory[] =
        groupedSelectedIngredientEntries.flatMap((group) =>
            group.entries.map<SelectedEntryWithCategory>(([id, entry]) => [
                id,
                entry,
                group.categoryKey,
            ]),
        );
    const selectedIngredientCount = flatEntries.reduce(
        (sum, [, entry]) => sum + entry.quantity,
        0,
    );

    // Same Protein Score / Macro Split calculation as the standard item
    // modal — driven by the live adjusted totals, so it updates as soon as
    // Customize edits are saved.
    const proteinScore = getProteinPer100Calories(
        adjustedTotals.protein,
        adjustedTotals.calories,
    );
    const proteinScoreTier =
        typeof proteinScore === "number"
            ? getProteinScoreTier(proteinScore)
            : undefined;
    const macroSegments = buildMacroSegments({
        protein: adjustedTotals.protein,
        carbs: adjustedTotals.carbs,
        fat: adjustedTotals.totalFat,
    });

    return (
        <section className="rounded-2xl border border-black/10 bg-white p-5">
            <h2 className="mb-4 text-2xl font-bold text-neutral-900">
                Selected Ingredients
            </h2>

            <div className="mt-5 space-y-2">
                <p className="truncate text-sm font-medium normal-case tracking-normal text-slate-500">
                    {selectedBuildName} · {selectedIngredientCount} selected
                </p>
                <ScrollableIngredientList
                    entries={flatEntries}
                    lockedIngredientIds={lockedIngredientIds}
                    restaurantLogo={restaurantLogo}
                    portionModeOptionsById={portionModeOptionsById}
                    selectedPortionModeIdById={selectedPortionModeIdById}
                    onPortionModeChange={onPortionModeChange}
                />
            </div>

            <div className="mt-6 space-y-2 border-t border-black/[0.06] pt-6">
                <SectionEyebrow className="text-base text-neutral-500">
                    Protein Score
                </SectionEyebrow>
                {typeof proteinScore === "number" && proteinScoreTier ? (
                    <ProteinScorePill
                        scorePerHundredCalories={proteinScore}
                        tier={proteinScoreTier}
                    />
                ) : (
                    <p className="text-sm text-neutral-500">—</p>
                )}
            </div>

            <div className="mt-6 space-y-2 border-t border-black/[0.06] pt-6">
                <div className="flex items-center gap-1.5">
                    <SectionEyebrow className="text-base text-neutral-500">
                        Macro Split
                    </SectionEyebrow>
                    <MacroLegendInfo segments={macroSegments} />
                </div>
                <MacroSplitChart segments={macroSegments} />
            </div>
        </section>
    );
}
