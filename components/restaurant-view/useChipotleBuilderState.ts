import { useCallback, useRef, useState } from "react";

import type { MenuItem } from "@/types/menu";
import type {
    ChipotleBuildConfiguration,
    ChipotleEntreeSelection,
    ChipotleKidsMealId,
    ChipotleTacoCount,
    ChipotleTacoShell,
    IncludedIngredientContext,
    ProteinPortionMode,
    SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";

type SelectedIngredientItems = Record<
    string,
    { item: MenuItem; quantity: number }
>;

type BuildConfigurationSnapshot = ChipotleBuildConfiguration;

type PendingBuildCustomizationReset =
    | { type: "none" }
    | {
          type: "included";
          context: IncludedIngredientContext;
      }
    | { type: "empty" };

export function useChipotleBuilderState({
    initialSelectedEntree,
}: {
    initialSelectedEntree: ChipotleEntreeSelection;
}) {
    const [selectedIngredientItems, setSelectedIngredientItems] =
        useState<SelectedIngredientItems>({});
    const [selectedIngredientVariantIds, setSelectedIngredientVariantIds] =
        useState<Record<string, string>>({});
    const [proteinPortionMode, setProteinPortionMode] =
        useState<ProteinPortionMode>("normal");
    const [splitPortionModeById, setSplitPortionModeById] = useState<
        Record<string, SplitPortionMode>
    >({});
    const [selectedEntree, setSelectedEntree] =
        useState<ChipotleEntreeSelection>(initialSelectedEntree);
    const [selectedTacoShell, setSelectedTacoShell] =
        useState<ChipotleTacoShell>("crispy");
    const [selectedTacoCount, setSelectedTacoCount] =
        useState<ChipotleTacoCount>(3);
    const [selectedKidsMeal, setSelectedKidsMeal] =
        useState<ChipotleKidsMealId>("build-your-own");

    const appliedIncludedIngredientIdsRef = useRef<Set<string>>(new Set());
    const pendingBuildCustomizationResetRef =
        useRef<PendingBuildCustomizationReset>({ type: "none" });
    const hydratedEditItemIdRef = useRef<string | null>(null);
    const editingBuildBaselineConfigRef =
        useRef<BuildConfigurationSnapshot | null>(null);

    const resetBuilderSelectionState = useCallback(() => {
        setSelectedIngredientItems({});
        setSelectedIngredientVariantIds({});
        setProteinPortionMode("normal");
        setSplitPortionModeById({});
    }, []);

    const resetBuilderPortionAndVariantState = useCallback(() => {
        setProteinPortionMode("normal");
        setSplitPortionModeById({});
        setSelectedIngredientVariantIds({});
    }, []);

    const queueIncludedIngredientReset = useCallback(
        (context: IncludedIngredientContext) => {
            pendingBuildCustomizationResetRef.current = {
                type: "included",
                context,
            };
        },
        [],
    );

    const queueEmptyBuilderReset = useCallback(() => {
        pendingBuildCustomizationResetRef.current = { type: "empty" };
    }, []);

    const clearPendingBuilderReset = useCallback(() => {
        pendingBuildCustomizationResetRef.current = { type: "none" };
    }, []);

    return {
        selectedIngredientItems,
        setSelectedIngredientItems,
        selectedIngredientVariantIds,
        setSelectedIngredientVariantIds,
        proteinPortionMode,
        setProteinPortionMode,
        splitPortionModeById,
        setSplitPortionModeById,
        selectedEntree,
        setSelectedEntree,
        selectedTacoShell,
        setSelectedTacoShell,
        selectedTacoCount,
        setSelectedTacoCount,
        selectedKidsMeal,
        setSelectedKidsMeal,
        appliedIncludedIngredientIdsRef,
        pendingBuildCustomizationResetRef,
        hydratedEditItemIdRef,
        editingBuildBaselineConfigRef,
        resetBuilderSelectionState,
        resetBuilderPortionAndVariantState,
        queueIncludedIngredientReset,
        queueEmptyBuilderReset,
        clearPendingBuilderReset,
    };
}
