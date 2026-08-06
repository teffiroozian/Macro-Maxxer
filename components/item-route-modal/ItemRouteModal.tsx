"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Utensils, X } from "lucide-react";
import ItemDetailsPanel, { PortionSelector } from "@/components/ItemDetailsPanel";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import MacroStat from "@/components/nutrition/MacroStat";
import MenuSections from "@/components/MenuSections";
import BuildSummaryDrawer from "@/components/restaurant-view/BuildSummaryDrawer";
import type {
    MenuItem,
    ResolvedAddonGroups,
    IngredientItem,
    RestaurantCustomizationRules,
} from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { buildStructuredOptionSelections } from "@/lib/menuItemCard/cartLabelUtils";
import { getDefaultVariantId } from "@/lib/menuItemCalculations";
import {
    resolveJustItemIcon,
    resolveJustItemLabel,
} from "@/lib/restaurantRules/chickfila";
import {
    buildHighProteinBuildConfiguration,
    isChipotleHighProteinMenuItem,
} from "@/lib/restaurantBuilders/chipotle/highProtein";
import {
    getProteinBadgeLabel,
    getProteinMultiplier,
    getSplitPortionLabel,
    normalizeIngredientCategory,
    type ProteinPortionMode,
    type SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";
import type { ChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle";
import { fromUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";
import { SORT_OPTION_VALUES } from "@/lib/menuSections/sortOptions";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import {
    buildIngredientCustomizationLabels,
    calculateStandardItemNutrition,
    resolveActiveAddons,
    resolveSelectedSauceOptions,
    resolveStandardComboSelection,
    resolveStandardIngredientCounts,
} from "@/lib/cart/standardItemConfiguration";
import {
    calculateAddonTotals,
    calculateFullComboNutritionTotals,
    calculateIngredientCountTotals,
} from "@/lib/menuItemCard/totals";
import {
    resolveComboDrinkOptions,
    resolveComboMealConfig,
    resolveComboSideOptions,
} from "@/lib/comboMeals";
import { useItemCustomizationState } from "./useItemCustomizationState";
import { useItemCartSubmission } from "./useItemCartSubmission";
import { useCart } from "@/stores/cartStore";

const emptyAddon: MenuItem = {
    id: "none",
    name: "None",
    nutrition: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    image: "none",
    categories: [],
    servingType: "addon",
    defaultOrder: 0,
};

const maxSauceSelections = 5;

export default function ItemRouteModal({
    restaurantId,
    restaurantPath,
    item,
    addons,
    ingredients,
    menuItems,
    customizationRules,
    closeBehavior = "back",
    onClose,
    editCartItemId: editCartItemIdProp,
}: {
    restaurantId: string;
    restaurantPath: string;
    item: MenuItem;
    addons?: ResolvedAddonGroups;
    ingredients?: IngredientItem[];
    menuItems?: MenuItem[];
    customizationRules?: RestaurantCustomizationRules;
    closeBehavior?: "back" | "replace" | "local";
    onClose?: () => void;
    editCartItemId?: string | null;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editCartItemId =
        editCartItemIdProp ?? searchParams.get("editCartItem");
    const { items } = useCart();
    const editingCartItem = useMemo(() => {
        if (!editCartItemId) return null;

        return (
            items.find(
                (cartItem) =>
                    cartItem.id === editCartItemId &&
                    cartItem.restaurantId === restaurantId &&
                    cartItem.itemId === (item.id ?? item.name),
            ) ?? null
        );
    }, [editCartItemId, item.id, item.name, items, restaurantId]);
    const comboConfig = useMemo(
        () => resolveComboMealConfig(restaurantId, item, menuItems),
        [item, menuItems, restaurantId],
    );
    const comboSides = useMemo(
        () => resolveComboSideOptions(restaurantId, item, menuItems),
        [item, menuItems, restaurantId],
    );
    const comboDrinks = useMemo(
        () => resolveComboDrinkOptions(restaurantId, item, menuItems),
        [item, menuItems, restaurantId],
    );
    const {
        variants,
        selectedVariantId,
        setSelectedVariantId,
        quantity,
        setQuantity,
        selectedAddons,
        setSelectedAddons,
        selectedSauceCounts,
        setSelectedSauceCounts,
        resolvedIngredients,
        selectedIngredientCounts,
        setSelectedIngredientCounts,
        comboType,
        setComboType,
        selectedComboSideId,
        setSelectedComboSideId,
        selectedComboDrinkId,
        setSelectedComboDrinkId,
        selectedComboSideVariantId,
        setSelectedComboSideVariantId,
        selectedComboDrinkVariantId,
        setSelectedComboDrinkVariantId,
    } = useItemCustomizationState({
        item,
        addons,
        ingredients,
        menuItems,
        customizationRules,
        editingCartItem,
        comboConfig,
        comboSides,
        comboDrinks,
    });
    const selectedVariant = variants?.find(
        (variant) => variant.id === selectedVariantId,
    );
    const selectedItemImage = selectedVariant?.image ?? item.image;
    const baseNutrition = resolveMenuItemVariantNutrition(
        item,
        selectedVariant,
    );
    const isChipotlePrebuiltBuilderItem =
        isChipotleHighProteinMenuItem(item, restaurantId) &&
        item.categories.some(
            (category) => category.toLowerCase() !== "protein cups",
        ) &&
        (item.ingredients?.length ?? 0) > 0;
    const canCustomizeViaBuildPage =
        isChipotlePrebuiltBuilderItem && Boolean(editingCartItem);
    const editingBuildConfiguration =
        editingCartItem?.selection.type === "build-your-own"
            ? editingCartItem.selection.buildConfiguration
            : undefined;
    const chipotleBuildConfiguration =
        useMemo<ChipotleBuildConfiguration>(() => {
            if (editingBuildConfiguration) {
                return fromUniversalChipotleBuildConfiguration(
                    editingBuildConfiguration,
                );
            }

            const highProteinConfiguration = buildHighProteinBuildConfiguration(
                item,
                ingredients,
            );
            if (highProteinConfiguration) {
                return highProteinConfiguration;
            }

            return {
                selectedEntree: null,
                selectedIngredientItems: {},
                selectedIngredientVariantIds: {},
                proteinPortionMode: "normal",
                splitPortionModeById: {},
                selectedTacoShell: "crispy",
                selectedTacoCount: 1,
                selectedKidsMeal: "build-your-own",
            };
        }, [editingBuildConfiguration, ingredients, item]);
    const isChipotleTacoItem = (item.id ?? "").toLowerCase().includes("taco");
    const isChipotleBurritoItem = (item.id ?? "")
        .toLowerCase()
        .includes("burrito");
    const chipotleIncludedIngredientIds = useMemo(() => {
        if (isChipotleBurritoItem) return new Set(["tortilla"]);
        if (isChipotleTacoItem)
            return new Set(["crispy-corn-tortilla", "soft-flour-tortilla"]);
        return new Set<string>();
    }, [isChipotleBurritoItem, isChipotleTacoItem]);
    const chipotleAllIngredientMenuItems = useMemo<MenuItem[]>(
        () =>
            (ingredients ?? [])
                .filter((ingredient) => !ingredient.hideFromIngredientView)
                .filter((ingredient) => {
                    const ingredientId = (
                        ingredient.id ?? ingredient.name
                    ).toLowerCase();
                    const isTacoOnlySide =
                        ingredientId === "crispy-corn-tortilla" ||
                        ingredientId === "soft-flour-tortilla";
                    return !isTacoOnlySide || isChipotleTacoItem;
                })
                .map((ingredient) => ({
                    id: ingredient.id ?? ingredient.name,
                    name: ingredient.name,
                    image: ingredient.image ?? "",
                    defaultOrder: ingredient.defaultOrder ?? 0,
                    nutrition: ingredient.nutrition,
                    categories: ingredient.categories,
                    servingType: "addon",
                    variants: ingredient.variants,
                    defaultVariantId: ingredient.defaultVariantId,
                })),
        [ingredients, isChipotleTacoItem],
    );
    const chipotleIngredientMenuItems = useMemo(
        () =>
            chipotleAllIngredientMenuItems.filter(
                (ingredientItem) =>
                    !chipotleIncludedIngredientIds.has(
                        (
                            ingredientItem.id ?? ingredientItem.name
                        ).toLowerCase(),
                    ),
            ),
        [chipotleAllIngredientMenuItems, chipotleIncludedIngredientIds],
    );
    const chipotleIncludedIngredientMenuItems = useMemo(
        () =>
            chipotleAllIngredientMenuItems.filter((ingredientItem) =>
                chipotleIncludedIngredientIds.has(
                    (ingredientItem.id ?? ingredientItem.name).toLowerCase(),
                ),
            ),
        [chipotleAllIngredientMenuItems, chipotleIncludedIngredientIds],
    );
    const chipotleIngredientById = useMemo(
        () =>
            new Map(
                chipotleAllIngredientMenuItems.map((ingredientItem) => [
                    ingredientItem.id ?? ingredientItem.name,
                    ingredientItem,
                ]),
            ),
        [chipotleAllIngredientMenuItems],
    );
    const initialChipotleBuilderState = useMemo<{
        selectedItems: Record<string, { item: MenuItem; quantity: number }>;
        proteinMode: ProteinPortionMode;
        splitModesById: Record<string, SplitPortionMode>;
        selectedVariantIds: Record<string, string>;
        selectedTacoCount: 1 | 3;
        selectedTacoShellId: string;
    }>(() => {
        const nextSelectedItems: Record<
            string,
            { item: MenuItem; quantity: number }
        > = {};
        const nextSplitModesById: Record<string, SplitPortionMode> = {
            ...(chipotleBuildConfiguration?.splitPortionModeById ?? {}),
        };

        Object.entries(
            chipotleBuildConfiguration?.selectedIngredientItems ?? {},
        ).forEach(([ingredientId, selectedEntry]) => {
            const ingredient = chipotleIngredientById.get(ingredientId);
            if (!ingredient || selectedEntry.quantity <= 0) return;

            const category = normalizeIngredientCategory(
                resolvePrimaryCategory(ingredient.categories),
            );
            const rawQuantity = selectedEntry.quantity;

            if (category === "rice" || category === "beans") {
                if (!(ingredientId in nextSplitModesById)) {
                    nextSplitModesById[ingredientId] =
                        rawQuantity <= 0.5
                            ? "light"
                            : rawQuantity >= 2
                              ? "extra"
                              : "normal";
                }
                nextSelectedItems[ingredientId] = {
                    item: ingredient,
                    quantity: 1,
                };
                return;
            }

            nextSelectedItems[ingredientId] = {
                item: ingredient,
                quantity: rawQuantity,
            };
        });

        const isBurrito = (item.id ?? "").toLowerCase().includes("burrito");
        if (isBurrito && !nextSelectedItems.tortilla) {
            const tortilla = chipotleIngredientById.get("tortilla");
            if (tortilla) {
                nextSelectedItems.tortilla = { item: tortilla, quantity: 1 };
            }
        }
        if (isChipotleTacoItem) {
            const tacoShellId =
                chipotleBuildConfiguration?.selectedTacoShell === "soft"
                    ? "soft-flour-tortilla"
                    : "crispy-corn-tortilla";
            const tacoShell = chipotleIngredientById.get(tacoShellId);
            if (tacoShell) {
                nextSelectedItems[tacoShellId] = {
                    item: tacoShell,
                    quantity: 1,
                };
            }
            const alternateShellId =
                tacoShellId === "soft-flour-tortilla"
                    ? "crispy-corn-tortilla"
                    : "soft-flour-tortilla";
            delete nextSelectedItems[alternateShellId];
        }

        return {
            selectedItems: nextSelectedItems,
            proteinMode:
                chipotleBuildConfiguration?.proteinPortionMode ?? "normal",
            splitModesById: nextSplitModesById,
            selectedVariantIds:
                chipotleBuildConfiguration?.selectedIngredientVariantIds ?? {},
            selectedTacoCount:
                chipotleBuildConfiguration?.selectedTacoCount === 1 ? 1 : 3,
            selectedTacoShellId:
                chipotleBuildConfiguration?.selectedTacoShell === "soft"
                    ? "soft-flour-tortilla"
                    : "crispy-corn-tortilla",
        };
    }, [
        chipotleBuildConfiguration,
        chipotleIngredientById,
        isChipotleTacoItem,
        item.id,
    ]);
    const [
        selectedChipotleIngredientItems,
        setSelectedChipotleIngredientItems,
    ] = useState<Record<string, { item: MenuItem; quantity: number }>>(
        initialChipotleBuilderState.selectedItems,
    );
    const selectedChipotleIngredientVariantIds =
        initialChipotleBuilderState.selectedVariantIds;
    const [chipotleProteinPortionMode, setChipotleProteinPortionMode] =
        useState<ProteinPortionMode>(initialChipotleBuilderState.proteinMode);
    const [chipotleSplitPortionModeById, setChipotleSplitPortionModeById] =
        useState<Record<string, SplitPortionMode>>(
            initialChipotleBuilderState.splitModesById,
        );
    const [selectedChipotleTacoCount, setSelectedChipotleTacoCount] = useState<
        1 | 3
    >(initialChipotleBuilderState.selectedTacoCount);
    const [selectedChipotleTacoShellId, setSelectedChipotleTacoShellId] =
        useState<string>(initialChipotleBuilderState.selectedTacoShellId);
    const chipotleLockedIngredientIds = useMemo(() => {
        const isBurrito = (item.id ?? "").toLowerCase().includes("burrito");
        if (!isBurrito) return new Set<string>();
        return new Set(["tortilla"]);
    }, [item.id]);

    const selectedSauceOptions = useMemo(
        () => resolveSelectedSauceOptions({ addons, selectedSauceCounts }),
        [addons, selectedSauceCounts],
    );
    const activeAddons = useMemo(
        () => resolveActiveAddons({ selectedAddons, selectedSauceOptions }),
        [selectedAddons, selectedSauceOptions],
    );
    const addonTotals = useMemo(
        () => calculateAddonTotals(activeAddons),
        [activeAddons],
    );

    const ingredientLookup = useMemo(() => {
        const lookup = new Map<string, (typeof resolvedIngredients)[number]>();

        resolvedIngredients.forEach((ingredient) => {
            lookup.set(ingredient.id, ingredient);
            lookup.set(ingredient.id.toLowerCase(), ingredient);
            lookup.set(ingredient.label.toLowerCase(), ingredient);
        });

        return lookup;
    }, [resolvedIngredients]);

    const ingredientCounts = useMemo(
        () =>
            resolveStandardIngredientCounts({
                resolvedIngredients,
                selectedIngredientCounts,
            }),
        [resolvedIngredients, selectedIngredientCounts],
    );

    const ingredientCountTotals = useMemo(
        () =>
            calculateIngredientCountTotals(
                ingredientCounts,
                resolvedIngredients,
            ),
        [ingredientCounts, resolvedIngredients],
    );

    const optionSelections = useMemo(
        () =>
            buildStructuredOptionSelections(
                selectedAddons,
                selectedSauceCounts,
                addons,
            ),
        [addons, selectedAddons, selectedSauceCounts],
    );

    const selectedIngredientCustomizations = useMemo(
        () =>
            buildIngredientCustomizationLabels({
                resolvedIngredients,
                ingredientCounts,
            }),
        [ingredientCounts, resolvedIngredients],
    );
    const isComboEligibleCategory = Boolean(comboConfig);
    const comboTypeOptions = useMemo(
        () => [
            {
                id: "just-item" as const,
                label: resolveJustItemLabel(item),
                icon: resolveJustItemIcon(item),
            },
            { id: "combo-meal" as const, label: "Combo Meal", icon: Utensils },
        ],
        [item],
    );
    const {
        selectedComboSide,
        selectedComboSideVariant,
        selectedComboDrink,
        selectedComboDrinkVariant,
    } = useMemo(
        () =>
            resolveStandardComboSelection({
                comboSides,
                comboDrinks,
                selectedComboSideId,
                selectedComboDrinkId,
                selectedComboSideVariantId,
                selectedComboDrinkVariantId,
            }),
        [
            comboDrinks,
            comboSides,
            selectedComboDrinkId,
            selectedComboDrinkVariantId,
            selectedComboSideId,
            selectedComboSideVariantId,
        ],
    );
    const activeComboNutritionTotals = useMemo(
        () =>
            calculateFullComboNutritionTotals({
                isComboEligibleCategory,
                comboType,
                selectedComboDrink,
                selectedComboDrinkVariant,
                selectedComboSide,
                selectedComboSideVariant,
            }),
        [
            comboType,
            isComboEligibleCategory,
            selectedComboDrink,
            selectedComboDrinkVariant,
            selectedComboSide,
            selectedComboSideVariant,
        ],
    );
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const overviewSectionRef = useRef<HTMLElement | null>(null);
    const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef.current;
        const overviewSection = overviewSectionRef.current;
        if (!container || !overviewSection) return;

        // Measured against the modal's own scroll container (never window/null),
        // since the modal can be centered mid-page with room to spare above and
        // below it — window-relative measurement would trigger at the wrong
        // moment or not at all depending on where the modal sits on the page.
        const handleOverviewScroll = () => {
            const containerTop = container.getBoundingClientRect().top;
            const overviewBottom =
                overviewSection.getBoundingClientRect().bottom;
            setIsOverviewCollapsed(overviewBottom <= containerTop);
        };

        handleOverviewScroll();
        container.addEventListener("scroll", handleOverviewScroll, {
            passive: true,
        });
        return () =>
            container.removeEventListener("scroll", handleOverviewScroll);
    }, []);

    const chipotleTacoShellIdSet = useMemo(
        () => new Set(["crispy-corn-tortilla", "soft-flour-tortilla"]),
        [],
    );
    const chipotleSelectedProteinCount = useMemo(
        () =>
            Object.values(selectedChipotleIngredientItems).filter(
                (selectedIngredient) =>
                    normalizeIngredientCategory(
                        resolvePrimaryCategory(
                            selectedIngredient.item.categories,
                        ),
                    ) === "proteins",
            ).length,
        [selectedChipotleIngredientItems],
    );
    const chipotleSelectedSplitIngredientIdsByCategory = useMemo(
        () =>
            Object.entries(selectedChipotleIngredientItems).reduce<
                Record<"rice" | "beans", string[]>
            >(
                (acc, [ingredientId, selectedIngredient]) => {
                    const category = normalizeIngredientCategory(
                        resolvePrimaryCategory(
                            selectedIngredient.item.categories,
                        ),
                    );
                    if (category === "rice" || category === "beans") {
                        acc[category].push(ingredientId);
                    }
                    return acc;
                },
                { rice: [], beans: [] },
            ),
        [selectedChipotleIngredientItems],
    );
    const getChipotleIngredientMultiplier = useCallback(
        (ingredientId: string) => {
            if (!isChipotleTacoItem) return 1;
            return chipotleTacoShellIdSet.has(ingredientId)
                ? selectedChipotleTacoCount
                : selectedChipotleTacoCount / 3;
        },
        [chipotleTacoShellIdSet, isChipotleTacoItem, selectedChipotleTacoCount],
    );
    const getChipotleSelectedIngredientPortionMultiplier = useCallback(
        (ingredientId: string, category: string) => {
            if (!(ingredientId in selectedChipotleIngredientItems)) {
                return 1;
            }
            if (category === "proteins") {
                return getProteinMultiplier(
                    chipotleProteinPortionMode,
                    chipotleSelectedProteinCount,
                );
            }
            if (category === "rice" || category === "beans") {
                const selectedSplitIds =
                    chipotleSelectedSplitIngredientIdsByCategory[category];
                if (selectedSplitIds.length >= 2) {
                    return 0.5;
                }
                const splitMode =
                    chipotleSplitPortionModeById[ingredientId] ?? "normal";
                return splitMode === "light"
                    ? 0.5
                    : splitMode === "extra"
                      ? 2
                      : 1;
            }
            return 1;
        },
        [
            chipotleProteinPortionMode,
            chipotleSelectedProteinCount,
            chipotleSelectedSplitIngredientIdsByCategory,
            chipotleSplitPortionModeById,
            selectedChipotleIngredientItems,
        ],
    );
    const buildScaledNutrition = useCallback(
        (
            nutrition: MenuItem["nutrition"],
            multiplier: number,
        ): MenuItem["nutrition"] => {
            const scaleNumericField = (value: number | undefined) =>
                value === undefined
                    ? undefined
                    : Math.round(value * multiplier);
            return {
                calories: Math.round(nutrition.calories * multiplier),
                protein: Math.round(nutrition.protein * multiplier),
                carbs: Math.round(nutrition.carbs * multiplier),
                totalFat: Math.round(nutrition.totalFat * multiplier),
                satFat: scaleNumericField(nutrition.satFat),
                transFat: scaleNumericField(nutrition.transFat),
                cholesterol: scaleNumericField(nutrition.cholesterol),
                sodium: scaleNumericField(nutrition.sodium),
                fiber: scaleNumericField(nutrition.fiber),
                sugars: scaleNumericField(nutrition.sugars),
            };
        },
        [],
    );
    const chipotleIngredientDisplayItems = useMemo<MenuItem[]>(
        () =>
            chipotleIngredientMenuItems.map((ingredientItem) => {
                const ingredientId = (
                    ingredientItem.id ?? ingredientItem.name
                ).toLowerCase();
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(ingredientItem.categories),
                );
                const multiplier =
                    getChipotleIngredientMultiplier(ingredientId) *
                    getChipotleSelectedIngredientPortionMultiplier(
                        ingredientId,
                        category,
                    );
                const nutrition = buildScaledNutrition(
                    ingredientItem.nutrition,
                    multiplier,
                );
                return {
                    ...ingredientItem,
                    nutrition,
                };
            }),
        [
            chipotleIngredientMenuItems,
            buildScaledNutrition,
            getChipotleIngredientMultiplier,
            getChipotleSelectedIngredientPortionMultiplier,
        ],
    );
    const chipotleIncludedIngredientDisplayItems = useMemo<MenuItem[]>(
        () =>
            chipotleIncludedIngredientMenuItems.map((ingredientItem) => {
                const ingredientId = (
                    ingredientItem.id ?? ingredientItem.name
                ).toLowerCase();
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(ingredientItem.categories),
                );
                const multiplier =
                    getChipotleIngredientMultiplier(ingredientId) *
                    getChipotleSelectedIngredientPortionMultiplier(
                        ingredientId,
                        category,
                    );
                const nutrition = buildScaledNutrition(
                    ingredientItem.nutrition,
                    multiplier,
                );
                return {
                    ...ingredientItem,
                    nutrition,
                };
            }),
        [
            chipotleIncludedIngredientMenuItems,
            buildScaledNutrition,
            getChipotleIngredientMultiplier,
            getChipotleSelectedIngredientPortionMultiplier,
        ],
    );
    const chipotleIngredientPortionLabelById = useMemo(
        () =>
            Object.entries(selectedChipotleIngredientItems).reduce<
                Record<string, string>
            >((acc, [ingredientId, entry]) => {
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(entry.item.categories),
                );
                if (category === "proteins") {
                    acc[ingredientId] = getProteinBadgeLabel(
                        chipotleProteinPortionMode,
                        chipotleSelectedProteinCount,
                    );
                } else if (category === "rice" || category === "beans") {
                    const selectedSplitIds =
                        chipotleSelectedSplitIngredientIdsByCategory[category];
                    acc[ingredientId] =
                        selectedSplitIds.length >= 2
                            ? "1/2x"
                            : getSplitPortionLabel(
                                  chipotleSplitPortionModeById[ingredientId] ??
                                      "normal",
                              );
                }
                return acc;
            }, {}),
        [
            chipotleProteinPortionMode,
            chipotleSelectedProteinCount,
            chipotleSelectedSplitIngredientIdsByCategory,
            chipotleSplitPortionModeById,
            selectedChipotleIngredientItems,
        ],
    );
    const chipotleAdjustedTotals = useMemo(
        () =>
            Object.entries(selectedChipotleIngredientItems).reduce(
                (sum, [ingredientId, selectedIngredient]) => {
                    const baseMultiplier = selectedIngredient.quantity;
                    const category = normalizeIngredientCategory(
                        resolvePrimaryCategory(
                            selectedIngredient.item.categories,
                        ),
                    );
                    const multiplier =
                        category === "proteins"
                            ? getProteinMultiplier(
                                  chipotleProteinPortionMode,
                                  chipotleSelectedProteinCount,
                              ) * baseMultiplier
                            : category === "rice" || category === "beans"
                              ? (chipotleSplitPortionModeById[ingredientId] ===
                                "light"
                                    ? 0.5
                                    : chipotleSplitPortionModeById[
                                            ingredientId
                                        ] === "extra"
                                      ? 2
                                      : 1) * baseMultiplier
                              : baseMultiplier;
                    const baseIngredientNutrition =
                        chipotleIngredientById.get(ingredientId)?.nutrition ??
                        selectedIngredient.item.nutrition;
                    const tacoMultiplier =
                        getChipotleIngredientMultiplier(ingredientId);
                    return {
                        calories:
                            sum.calories +
                            Math.round(
                                (baseIngredientNutrition.calories ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        protein:
                            sum.protein +
                            Math.round(
                                (baseIngredientNutrition.protein ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        carbs:
                            sum.carbs +
                            Math.round(
                                (baseIngredientNutrition.carbs ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        totalFat:
                            sum.totalFat +
                            Math.round(
                                (baseIngredientNutrition.totalFat ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        satFat:
                            sum.satFat +
                            Math.round(
                                (baseIngredientNutrition.satFat ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        transFat:
                            sum.transFat +
                            Math.round(
                                (baseIngredientNutrition.transFat ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        cholesterol:
                            sum.cholesterol +
                            Math.round(
                                (baseIngredientNutrition.cholesterol ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        sodium:
                            sum.sodium +
                            Math.round(
                                (baseIngredientNutrition.sodium ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        fiber:
                            sum.fiber +
                            Math.round(
                                (baseIngredientNutrition.fiber ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                        sugars:
                            sum.sugars +
                            Math.round(
                                (baseIngredientNutrition.sugars ?? 0) *
                                    multiplier *
                                    tacoMultiplier,
                            ),
                    };
                },
                {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    totalFat: 0,
                    satFat: 0,
                    transFat: 0,
                    cholesterol: 0,
                    sodium: 0,
                    fiber: 0,
                    sugars: 0,
                },
            ),
        [
            chipotleIngredientById,
            chipotleProteinPortionMode,
            chipotleSelectedProteinCount,
            chipotleSplitPortionModeById,
            getChipotleIngredientMultiplier,
            selectedChipotleIngredientItems,
        ],
    );
    const chipotleGroupedSelectedIngredientEntries = useMemo(() => {
        const categoryOrder = [
            "proteins",
            "rice",
            "beans",
            "toppings",
            "side",
            "other",
        ];
        const categoryLabels: Record<string, string> = {
            proteins: "Protein",
            rice: "Rice",
            beans: "Beans",
            toppings: "Toppings",
            side: "Side",
            other: "Other",
        };
        const grouped = Object.entries(selectedChipotleIngredientItems).reduce<
            Record<
                string,
                Array<[string, { item: MenuItem; quantity: number }]>
            >
        >((acc, [ingredientId, selectedIngredient]) => {
            const category =
                normalizeIngredientCategory(
                    resolvePrimaryCategory(selectedIngredient.item.categories),
                ) || "other";
            if (!acc[category]) acc[category] = [];
            acc[category].push([ingredientId, selectedIngredient]);
            return acc;
        }, {});
        return categoryOrder
            .filter((categoryKey) => (grouped[categoryKey] ?? []).length > 0)
            .map((categoryKey) => ({
                categoryKey,
                categoryLabel: categoryLabels[categoryKey] ?? categoryKey,
                entries: grouped[categoryKey] ?? [],
            }));
    }, [selectedChipotleIngredientItems]);

    const customizationTotals = useMemo(
        () => ({
            calories:
                addonTotals.calories +
                ingredientCountTotals.calories +
                activeComboNutritionTotals.calories,
            protein:
                addonTotals.protein +
                ingredientCountTotals.protein +
                activeComboNutritionTotals.protein,
            carbs:
                addonTotals.carbs +
                ingredientCountTotals.carbs +
                activeComboNutritionTotals.carbs,
            totalFat:
                addonTotals.totalFat +
                ingredientCountTotals.totalFat +
                activeComboNutritionTotals.totalFat,
        }),
        [activeComboNutritionTotals, addonTotals, ingredientCountTotals],
    );

    const hasActiveCustomization = useMemo(
        () =>
            customizationTotals.calories !== 0 ||
            customizationTotals.protein !== 0 ||
            customizationTotals.carbs !== 0 ||
            customizationTotals.totalFat !== 0,
        [customizationTotals],
    );

    const nutrition: Nutrition = useMemo(
        () =>
            calculateStandardItemNutrition({
                baseNutrition,
                addonTotals,
                ingredientCountTotals,
                comboNutritionTotals: activeComboNutritionTotals,
            }),
        [
            activeComboNutritionTotals,
            addonTotals,
            baseNutrition,
            ingredientCountTotals,
        ],
    );

    const handleClose = () => {
        if (closeBehavior === "local") {
            onClose?.();
            return;
        }

        if (closeBehavior === "back") {
            router.back();
            return;
        }

        router.replace(restaurantPath, { scroll: false });
    };

    // Kept in a ref (rather than a useEffect dependency) so the mount-time
    // focus-move-in/focus-restore-out effect below only ever runs once per
    // modal open, instead of re-stealing focus back to the close button on
    // every render as customization state changes.
    const handleCloseRef = useRef(handleClose);
    useEffect(() => {
        handleCloseRef.current = handleClose;
    });

    useEffect(() => {
        const previouslyFocusedElement =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        closeButtonRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                handleCloseRef.current();
            }
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            previouslyFocusedElement?.focus();
        };
    }, []);

    const {
        isEditing: isCustomizeMode,
        submitButtonLabel,
        submitCartItem,
    } = useItemCartSubmission({
        restaurantId,
        item,
        ingredients,
        quantity,
        editingCartItem,
        standard: {
            selectedVariant,
            optionSelections,
            selectedIngredientCustomizations,
            nutritionPerItem: nutrition,
            combo: {
                isComboEligibleCategory,
                comboType,
                selectedComboSide,
                selectedComboSideVariant,
                selectedComboDrink,
                selectedComboDrinkVariant,
            },
        },
        chipotle: {
            isPrebuiltBuilderItem: isChipotlePrebuiltBuilderItem,
            buildConfiguration: chipotleBuildConfiguration,
            selectedIngredientItems: selectedChipotleIngredientItems,
            selectedIngredientVariantIds: selectedChipotleIngredientVariantIds,
            proteinPortionMode: chipotleProteinPortionMode,
            splitPortionModeById: chipotleSplitPortionModeById,
            selectedTacoCount: selectedChipotleTacoCount,
            selectedTacoShellId: selectedChipotleTacoShellId,
            ingredientPortionLabelById: chipotleIngredientPortionLabelById,
            adjustedTotals: chipotleAdjustedTotals,
        },
        onAfterSubmit: handleClose,
    });
    const handleDecrementQuantity = () => {
        setQuantity((prev) => Math.max(1, prev - 1));
    };

    const handleIncrementQuantity = () => {
        setQuantity((prev) => prev + 1);
    };

    return (
        <div
            className="fixed inset-0 z-[235] flex items-end justify-center sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
        >
            <button
                type="button"
                className="cursor-pointer absolute inset-0 border-0 bg-slate-900/60"
                onClick={handleClose}
                aria-label="Close item modal"
            />
            <div className="item-route-modal-root relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:h-auto sm:max-h-[88vh] sm:w-full sm:max-w-[620px] sm:rounded-3xl md:max-w-[760px] lg:max-w-[940px]">
                <div
                    className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 transition-[opacity,transform,box-shadow,border-color] duration-300 ease-out sm:px-6 sm:py-4 lg:px-8 ${
                        isOverviewCollapsed
                            ? "translate-y-0 border-black/[0.06] opacity-100 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                            : "pointer-events-none -translate-y-2 border-transparent opacity-0"
                    }`}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        {selectedItemImage ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-image-placeholder">
                                <Image
                                    src={selectedItemImage}
                                    alt=""
                                    fill
                                    sizes="40px"
                                    className="object-contain p-1"
                                />
                            </div>
                        ) : null}
                        <p className="font-heading min-w-0 truncate text-lg font-medium leading-tight text-neutral-900">
                            {item.name}
                        </p>
                    </div>
                    <button
                        type="button"
                        tabIndex={isOverviewCollapsed ? 0 : -1}
                        className="cursor-pointer inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
                        onClick={handleClose}
                        aria-label="Close item modal"
                    >
                        <X size={18} strokeWidth={2.25} />
                    </button>
                </div>

                <div
                    ref={scrollContainerRef}
                    className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
                >
                    <div className="px-4 pb-8 pt-7 sm:px-6 sm:pb-10 sm:pt-9 lg:px-8 lg:pt-10">
                        <section
                            ref={overviewSectionRef}
                            className="item-overview-grid relative sm:gap-x-7 lg:gap-x-8"
                        >
                            {selectedItemImage ? (
                                <div className="item-overview-image relative aspect-square w-48 overflow-hidden rounded-3xl border border-black/[0.06] bg-image-placeholder sm:aspect-auto sm:h-40 sm:w-40 lg:h-52 lg:w-52">
                                    <Image
                                        src={selectedItemImage}
                                        alt={item.name}
                                        fill
                                        sizes="(min-width: 1024px) 208px, (min-width: 640px) 160px, 192px"
                                        className="object-contain p-1.5 sm:p-2.5 lg:p-3"
                                    />
                                </div>
                            ) : null}
                            <div className="item-overview-content">
                                <p className="item-overview-label mt-4 min-w-0 pr-12 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:mt-0 sm:pr-14">
                                    Base Nutrition
                                </p>
                                <h1 className="item-overview-title font-heading mt-1.5 min-w-0 text-lg font-bold leading-tight tracking-tight text-neutral-900 sm:truncate sm:pr-14 sm:text-xl lg:text-2xl">
                                    {item.name}
                                </h1>
                                <div className="item-overview-macros mt-5 flex flex-nowrap items-center justify-between gap-x-2 sm:mt-3 sm:flex-wrap sm:justify-start sm:gap-x-5 sm:gap-y-2">
                                    <MacroStat
                                        macroKey="calories"
                                        value={Math.round(
                                            baseNutrition.calories,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="protein"
                                        value={Math.round(
                                            baseNutrition.protein,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="carbs"
                                        value={Math.round(baseNutrition.carbs)}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="totalFat"
                                        value={Math.round(
                                            baseNutrition.totalFat,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                </div>
                                {isComboEligibleCategory ? (
                                    <div className="item-overview-ordertype mt-8">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            Order Type
                                        </p>
                                        <div
                                            role="radiogroup"
                                            aria-label="Order type"
                                            className="mt-1.5 grid w-full grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 sm:inline-flex sm:w-fit"
                                        >
                                            {comboTypeOptions.map((option) => {
                                                const isActive =
                                                    comboType === option.id;
                                                const Icon = option.icon;

                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={isActive}
                                                        onClick={() =>
                                                            setComboType(
                                                                option.id,
                                                            )
                                                        }
                                                        className={`box-border flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:gap-1.5 sm:px-3 sm:text-sm ${
                                                            isActive
                                                                ? "border-transparent bg-accent-strong text-white/95 shadow-sm"
                                                                : "border-transparent text-slate-500 hover:bg-white/70 active:bg-white"
                                                        }`}
                                                    >
                                                        <Icon
                                                            className={`h-4 w-4 shrink-0 ${isActive ? "text-white/95" : "text-slate-400"}`}
                                                            strokeWidth={2.3}
                                                        />
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <button
                                ref={closeButtonRef}
                                type="button"
                                className="cursor-pointer absolute right-0 top-0 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
                                onClick={handleClose}
                                aria-label="Close item modal"
                            >
                                <X size={18} strokeWidth={2.25} />
                            </button>
                        </section>

                        <div className="my-6 h-px bg-black/[0.06] sm:my-7" />

                        {variants &&
                        variants.length > 0 &&
                        !item.hideVariantSelector ? (
                            <div className="w-full">
                                <PortionSelector
                                    variants={variants}
                                    selectedVariantId={selectedVariantId}
                                    onSelectVariant={setSelectedVariantId}
                                    className="mt-0"
                                    layout="top"
                                />
                            </div>
                        ) : null}

                        <div className="mt-6 w-full">
                            {isChipotlePrebuiltBuilderItem ? (
                                <div className="grid gap-7">
                                    {chipotleIncludedIngredientDisplayItems.length >
                                    0 ? (
                                        <div className="w-full rounded-3xl border border-black/10 bg-[#e0e0e0] p-4">
                                            <h2 className="my-5 text-3xl font-bold text-slate-900">
                                                Included Ingredient
                                            </h2>
                                            <MenuSections
                                                restaurantId={restaurantId}
                                                items={
                                                    chipotleIncludedIngredientDisplayItems
                                                }
                                                sort={
                                                    SORT_OPTION_VALUES.DEFAULT_ORDER
                                                }
                                                groupByCategory={false}
                                                categoryMode="ingredients"
                                                hasBuildYourOwn
                                                ingredientSelectionConfig={{
                                                    selectedIds: new Set(
                                                        Object.keys(
                                                            selectedChipotleIngredientItems,
                                                        ),
                                                    ),
                                                    lockedIds:
                                                        chipotleLockedIngredientIds,
                                                    onSelectionChange: (
                                                        nextItem,
                                                        selected,
                                                    ) =>
                                                        setSelectedChipotleIngredientItems(
                                                            (prev) => {
                                                                const ingredientId =
                                                                    nextItem.id ??
                                                                    nextItem.name;
                                                                if (
                                                                    chipotleLockedIngredientIds.has(
                                                                        ingredientId,
                                                                    )
                                                                )
                                                                    return prev;
                                                                if (
                                                                    !selected &&
                                                                    !isChipotleTacoItem
                                                                ) {
                                                                    const next =
                                                                        {
                                                                            ...prev,
                                                                        };
                                                                    delete next[
                                                                        ingredientId
                                                                    ];
                                                                    return next;
                                                                }
                                                                if (
                                                                    isChipotleTacoItem
                                                                ) {
                                                                    const next =
                                                                        {
                                                                            ...prev,
                                                                        };
                                                                    if (
                                                                        next[
                                                                            "crispy-corn-tortilla"
                                                                        ]
                                                                    )
                                                                        delete next[
                                                                            "crispy-corn-tortilla"
                                                                        ];
                                                                    if (
                                                                        next[
                                                                            "soft-flour-tortilla"
                                                                        ]
                                                                    )
                                                                        delete next[
                                                                            "soft-flour-tortilla"
                                                                        ];
                                                                    next[
                                                                        ingredientId
                                                                    ] = {
                                                                        item: nextItem,
                                                                        quantity: 1,
                                                                    };
                                                                    setSelectedChipotleTacoShellId(
                                                                        ingredientId,
                                                                    );
                                                                    return next;
                                                                }
                                                                return {
                                                                    ...prev,
                                                                    [ingredientId]:
                                                                        {
                                                                            item: nextItem,
                                                                            quantity: 1,
                                                                        },
                                                                };
                                                            },
                                                        ),
                                                    selectionControlById:
                                                        isChipotleTacoItem
                                                            ? {
                                                                  "crispy-corn-tortilla":
                                                                      "radio",
                                                                  "soft-flour-tortilla":
                                                                      "radio",
                                                              }
                                                            : undefined,
                                                    radioGroupNameById:
                                                        isChipotleTacoItem
                                                            ? {
                                                                  "crispy-corn-tortilla":
                                                                      "chipotle-high-protein-taco-shell",
                                                                  "soft-flour-tortilla":
                                                                      "chipotle-high-protein-taco-shell",
                                                              }
                                                            : undefined,
                                                    variantOptionsById:
                                                        isChipotleTacoItem
                                                            ? {
                                                                  "crispy-corn-tortilla":
                                                                      [
                                                                          {
                                                                              id: "3",
                                                                              label: "3 Tacos",
                                                                          },
                                                                          {
                                                                              id: "1",
                                                                              label: "1 Taco",
                                                                          },
                                                                      ],
                                                                  "soft-flour-tortilla":
                                                                      [
                                                                          {
                                                                              id: "3",
                                                                              label: "3 Tacos",
                                                                          },
                                                                          {
                                                                              id: "1",
                                                                              label: "1 Taco",
                                                                          },
                                                                      ],
                                                              }
                                                            : undefined,
                                                    selectedVariantIdById:
                                                        isChipotleTacoItem
                                                            ? {
                                                                  "crispy-corn-tortilla":
                                                                      String(
                                                                          selectedChipotleTacoCount,
                                                                      ),
                                                                  "soft-flour-tortilla":
                                                                      String(
                                                                          selectedChipotleTacoCount,
                                                                      ),
                                                              }
                                                            : undefined,
                                                    onVariantChange: (
                                                        nextItem,
                                                        variantId,
                                                    ) => {
                                                        if (!isChipotleTacoItem)
                                                            return;
                                                        const ingredientId =
                                                            nextItem.id ??
                                                            nextItem.name;
                                                        setSelectedChipotleTacoCount(
                                                            variantId === "1"
                                                                ? 1
                                                                : 3,
                                                        );
                                                        setSelectedChipotleTacoShellId(
                                                            ingredientId,
                                                        );
                                                    },
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                    <div className="w-full rounded-3xl border border-black/10 bg-[#e0e0e0] p-4">
                                        <MenuSections
                                            restaurantId={restaurantId}
                                            items={
                                                chipotleIngredientDisplayItems
                                            }
                                            sort={
                                                SORT_OPTION_VALUES.DEFAULT_ORDER
                                            }
                                            groupByCategory
                                            categoryMode="ingredients"
                                            hasBuildYourOwn
                                            ingredientSelectionConfig={{
                                                selectedIds: new Set(
                                                    Object.keys(
                                                        selectedChipotleIngredientItems,
                                                    ),
                                                ),
                                                lockedIds:
                                                    chipotleLockedIngredientIds,
                                                onSelectionChange: (
                                                    nextItem,
                                                    selected,
                                                ) =>
                                                    setSelectedChipotleIngredientItems(
                                                        (prev) => {
                                                            const ingredientId =
                                                                nextItem.id ??
                                                                nextItem.name;
                                                            if (
                                                                chipotleLockedIngredientIds.has(
                                                                    ingredientId,
                                                                )
                                                            )
                                                                return prev;
                                                            if (!selected) {
                                                                const next = {
                                                                    ...prev,
                                                                };
                                                                delete next[
                                                                    ingredientId
                                                                ];
                                                                return next;
                                                            }
                                                            return {
                                                                ...prev,
                                                                [ingredientId]:
                                                                    {
                                                                        item: nextItem,
                                                                        quantity: 1,
                                                                    },
                                                            };
                                                        },
                                                    ),
                                                portionBadgeById:
                                                    chipotleIngredientPortionLabelById,
                                                portionModeOptionsById:
                                                    Object.fromEntries(
                                                        chipotleIngredientDisplayItems
                                                            .filter(
                                                                (
                                                                    menuIngredientItem,
                                                                ) => {
                                                                    const category =
                                                                        normalizeIngredientCategory(
                                                                            resolvePrimaryCategory(
                                                                                menuIngredientItem.categories,
                                                                            ),
                                                                        );
                                                                    return (
                                                                        category ===
                                                                            "proteins" ||
                                                                        category ===
                                                                            "rice" ||
                                                                        category ===
                                                                            "beans"
                                                                    );
                                                                },
                                                            )
                                                            .map(
                                                                (
                                                                    menuIngredientItem,
                                                                ) => {
                                                                    const ingredientId =
                                                                        menuIngredientItem.id ??
                                                                        menuIngredientItem.name;
                                                                    const category =
                                                                        normalizeIngredientCategory(
                                                                            resolvePrimaryCategory(
                                                                                menuIngredientItem.categories,
                                                                            ),
                                                                        );
                                                                    return [
                                                                        ingredientId,
                                                                        category ===
                                                                        "proteins"
                                                                            ? [
                                                                                  {
                                                                                      id: "normal",
                                                                                      label: "Normal",
                                                                                  },
                                                                                  {
                                                                                      id: "double",
                                                                                      label: "Double",
                                                                                  },
                                                                              ]
                                                                            : [
                                                                                  {
                                                                                      id: "light",
                                                                                      label: "Light",
                                                                                  },
                                                                                  {
                                                                                      id: "normal",
                                                                                      label: "Normal",
                                                                                  },
                                                                                  {
                                                                                      id: "extra",
                                                                                      label: "Extra",
                                                                                  },
                                                                              ],
                                                                    ];
                                                                },
                                                            ),
                                                    ),
                                                selectedPortionModeIdById:
                                                    Object.fromEntries(
                                                        chipotleIngredientDisplayItems.map(
                                                            (
                                                                menuIngredientItem,
                                                            ) => {
                                                                const ingredientId =
                                                                    menuIngredientItem.id ??
                                                                    menuIngredientItem.name;
                                                                const category =
                                                                    normalizeIngredientCategory(
                                                                        resolvePrimaryCategory(
                                                                            menuIngredientItem.categories,
                                                                        ),
                                                                    );
                                                                const modeId =
                                                                    category ===
                                                                    "proteins"
                                                                        ? chipotleProteinPortionMode
                                                                        : (chipotleSplitPortionModeById[
                                                                              ingredientId
                                                                          ] ??
                                                                          "normal");
                                                                return [
                                                                    ingredientId,
                                                                    modeId,
                                                                ];
                                                            },
                                                        ),
                                                    ),
                                                onPortionModeChange: (
                                                    menuIngredientItem,
                                                    modeId,
                                                ) => {
                                                    const ingredientId =
                                                        menuIngredientItem.id ??
                                                        menuIngredientItem.name;
                                                    const category =
                                                        normalizeIngredientCategory(
                                                            resolvePrimaryCategory(
                                                                menuIngredientItem.categories,
                                                            ),
                                                        );
                                                    if (
                                                        category ===
                                                            "proteins" &&
                                                        (modeId === "normal" ||
                                                            modeId === "double")
                                                    ) {
                                                        setChipotleProteinPortionMode(
                                                            modeId,
                                                        );
                                                    } else if (
                                                        (category === "rice" ||
                                                            category ===
                                                                "beans") &&
                                                        (modeId === "light" ||
                                                            modeId ===
                                                                "normal" ||
                                                            modeId === "extra")
                                                    ) {
                                                        setChipotleSplitPortionModeById(
                                                            (prev) => ({
                                                                ...prev,
                                                                [ingredientId]:
                                                                    modeId,
                                                            }),
                                                        );
                                                    }
                                                },
                                            }}
                                        />
                                    </div>

                                    <div className="w-full rounded-3xl border border-black/10 bg-[#e0e0e0] p-4">
                                        <BuildSummaryDrawer
                                            adjustedNutritionLabelTotals={{
                                                calories:
                                                    chipotleAdjustedTotals.calories,
                                                totalFat:
                                                    chipotleAdjustedTotals.totalFat,
                                                satFat: chipotleAdjustedTotals.satFat,
                                                transFat:
                                                    chipotleAdjustedTotals.transFat,
                                                cholesterol:
                                                    chipotleAdjustedTotals.cholesterol,
                                                sodium: chipotleAdjustedTotals.sodium,
                                                carbs: chipotleAdjustedTotals.carbs,
                                                fiber: chipotleAdjustedTotals.fiber,
                                                sugars: chipotleAdjustedTotals.sugars,
                                                protein:
                                                    chipotleAdjustedTotals.protein,
                                            }}
                                            selectedBuildName={item.name}
                                            selectedIngredientCount={Object.values(
                                                selectedChipotleIngredientItems,
                                            ).reduce(
                                                (sum, entry) =>
                                                    sum + entry.quantity,
                                                0,
                                            )}
                                            groupedSelectedIngredientEntries={
                                                chipotleGroupedSelectedIngredientEntries
                                            }
                                            ingredientPortionLabelById={
                                                chipotleIngredientPortionLabelById
                                            }
                                            lockedIngredientIds={
                                                chipotleLockedIngredientIds
                                            }
                                            restaurantLogo={item.image ?? ""}
                                            onResetOrder={() => {}}
                                            onSaveOrder={() => {}}
                                            onAdjustIngredientQuantity={(
                                                ingredientId,
                                                delta,
                                            ) =>
                                                setSelectedChipotleIngredientItems(
                                                    (prev) => {
                                                        if (
                                                            chipotleLockedIngredientIds.has(
                                                                ingredientId,
                                                            )
                                                        )
                                                            return prev;
                                                        const selectedIngredient =
                                                            prev[ingredientId];
                                                        if (!selectedIngredient)
                                                            return prev;
                                                        const nextQuantity =
                                                            selectedIngredient.quantity +
                                                            delta;
                                                        if (nextQuantity <= 0) {
                                                            const next = {
                                                                ...prev,
                                                            };
                                                            delete next[
                                                                ingredientId
                                                            ];
                                                            return next;
                                                        }
                                                        return {
                                                            ...prev,
                                                            [ingredientId]: {
                                                                ...selectedIngredient,
                                                                quantity:
                                                                    nextQuantity,
                                                            },
                                                        };
                                                    },
                                                )
                                            }
                                            hideActionButtons
                                        />
                                    </div>
                                </div>
                            ) : (
                                <ItemDetailsPanel
                                    item={item}
                                    nutrition={nutrition}
                                    quantityMultiplier={quantity}
                                    variants={variants}
                                    selectedVariantId={selectedVariantId}
                                    onSelectVariant={setSelectedVariantId}
                                    addons={addons}
                                    ingredientItems={ingredients}
                                    menuItems={menuItems}
                                    customizationRules={customizationRules}
                                    selectedAddons={selectedAddons}
                                    onSelectAddon={(ref, addon) =>
                                        setSelectedAddons((prev) => ({
                                            ...prev,
                                            [ref]: addon ?? emptyAddon,
                                        }))
                                    }
                                    sauceSelectionCounts={selectedSauceCounts}
                                    onIncrementSauce={(addon) => {
                                        setSelectedSauceCounts((prev) => {
                                            const currentTotal = Object.values(
                                                prev,
                                            ).reduce(
                                                (sum, count) => sum + count,
                                                0,
                                            );
                                            if (
                                                currentTotal >=
                                                maxSauceSelections
                                            )
                                                return prev;
                                            return {
                                                ...prev,
                                                [addon.name]:
                                                    (prev[addon.name] ?? 0) + 1,
                                            };
                                        });
                                    }}
                                    onDecrementSauce={(addon) => {
                                        setSelectedSauceCounts((prev) => {
                                            const current =
                                                prev[addon.name] ?? 0;
                                            if (current <= 0) return prev;
                                            const next = { ...prev };
                                            if (current === 1)
                                                delete next[addon.name];
                                            else next[addon.name] = current - 1;
                                            return next;
                                        });
                                    }}
                                    onToggleSauce={(addon) => {
                                        setSelectedSauceCounts((prev) => {
                                            if (addon.name === "None")
                                                return {};
                                            const current =
                                                prev[addon.name] ?? 0;
                                            if (current > 0) {
                                                const next = { ...prev };
                                                delete next[addon.name];
                                                return next;
                                            }
                                            const currentTotal = Object.values(
                                                prev,
                                            ).reduce(
                                                (sum, count) => sum + count,
                                                0,
                                            );
                                            if (
                                                currentTotal >=
                                                maxSauceSelections
                                            )
                                                return prev;
                                            return { ...prev, [addon.name]: 1 };
                                        });
                                    }}
                                    customizationTotals={customizationTotals}
                                    showCustomizationDeltas={
                                        hasActiveCustomization
                                    }
                                    showVariantsInDetails={
                                        !item.hideVariantSelector
                                    }
                                    selectedIngredientCounts={ingredientCounts}
                                    onDecrementIngredient={(ingredientId) =>
                                        setSelectedIngredientCounts((prev) => {
                                            const current =
                                                ingredientCounts[
                                                    ingredientId
                                                ] ?? 0;
                                            const nextCount = Math.max(
                                                0,
                                                current - 1,
                                            );
                                            if (nextCount === current)
                                                return prev;

                                            return {
                                                ...prev,
                                                [ingredientId]: nextCount,
                                            };
                                        })
                                    }
                                    onIncrementIngredient={(ingredientId) =>
                                        setSelectedIngredientCounts((prev) => {
                                            const ingredient =
                                                ingredientLookup.get(
                                                    ingredientId,
                                                ) ??
                                                ingredientLookup.get(
                                                    ingredientId.toLowerCase(),
                                                );
                                            const maxQuantity =
                                                ingredient?.maxQuantity;

                                            if (typeof maxQuantity !== "number")
                                                return prev;

                                            const current =
                                                ingredientCounts[
                                                    ingredientId
                                                ] ??
                                                ingredient?.defaultCount ??
                                                0;
                                            const nextCount = Math.min(
                                                maxQuantity,
                                                current + 1,
                                            );
                                            if (nextCount === current)
                                                return prev;

                                            return {
                                                ...prev,
                                                [ingredientId]: nextCount,
                                            };
                                        })
                                    }
                                    onToggleIngredient={(ingredientId) =>
                                        setSelectedIngredientCounts((prev) => {
                                            const ingredient =
                                                ingredientLookup.get(
                                                    ingredientId,
                                                ) ??
                                                ingredientLookup.get(
                                                    ingredientId.toLowerCase(),
                                                );
                                            const maxQuantity =
                                                ingredient?.maxQuantity;
                                            if (typeof maxQuantity !== "number")
                                                return prev;

                                            const current =
                                                prev[ingredientId] ??
                                                ingredient?.defaultCount ??
                                                0;
                                            const nextCount =
                                                current > 0 ? 0 : 1;
                                            if (nextCount === current)
                                                return prev;

                                            return {
                                                ...prev,
                                                [ingredientId]: nextCount,
                                            };
                                        })
                                    }
                                    onSelectSingleIngredient={(
                                        ingredientId,
                                        ingredientIdsInTab,
                                    ) =>
                                        setSelectedIngredientCounts((prev) => {
                                            const next = { ...prev };

                                            ingredientIdsInTab.forEach((id) => {
                                                next[id] =
                                                    id === ingredientId ? 1 : 0;
                                            });

                                            const hasChanged =
                                                ingredientIdsInTab.some(
                                                    (id) =>
                                                        (ingredientCounts[id] ??
                                                            ingredientLookup.get(
                                                                id,
                                                            )?.defaultCount ??
                                                            0) !== next[id],
                                                );
                                            if (!hasChanged) return prev;

                                            return next;
                                        })
                                    }
                                    comboType={comboType}
                                    comboSides={comboSides}
                                    comboDrinks={comboDrinks}
                                    selectedComboSideId={selectedComboSideId}
                                    selectedComboDrinkId={selectedComboDrinkId}
                                    onSelectComboSide={(sideId) => {
                                        const nextSide = comboSides.find(
                                            (side) =>
                                                (side.id ?? side.name) ===
                                                sideId,
                                        );
                                        setSelectedComboSideId(sideId);
                                        setSelectedComboSideVariantId(
                                            getDefaultVariantId(nextSide),
                                        );
                                    }}
                                    onSelectComboDrink={(drinkId) => {
                                        const nextDrink = comboDrinks.find(
                                            (drink) =>
                                                (drink.id ?? drink.name) ===
                                                drinkId,
                                        );
                                        setSelectedComboDrinkId(drinkId);
                                        setSelectedComboDrinkVariantId(
                                            getDefaultVariantId(nextDrink),
                                        );
                                    }}
                                    selectedComboSideVariantId={
                                        selectedComboSideVariantId
                                    }
                                    onSelectComboSideVariant={
                                        setSelectedComboSideVariantId
                                    }
                                    selectedComboDrinkVariantId={
                                        selectedComboDrinkVariantId
                                    }
                                    onSelectComboDrinkVariant={
                                        setSelectedComboDrinkVariantId
                                    }
                                    onCustomizeIngredients={
                                        canCustomizeViaBuildPage &&
                                        closeBehavior !== "local"
                                            ? () => {
                                                  router.push(
                                                      `/restaurant/${restaurantId}?view=ingredients&editCartItem=${editingCartItem!.id}`,
                                                      { scroll: false },
                                                  );
                                              }
                                            : undefined
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="flex h-fit shrink-0 flex-col gap-3 border-t border-black/[0.06] bg-white px-4 pt-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8"
                    style={{
                        paddingBottom:
                            "max(0.75rem, env(safe-area-inset-bottom))",
                    }}
                >
                    <MacroTotalsGrid
                        macros={{
                            calories: Math.round(
                                (isChipotlePrebuiltBuilderItem
                                    ? chipotleAdjustedTotals.calories
                                    : (nutrition.calories ?? 0)) * quantity,
                            ),
                            protein: Math.round(
                                (isChipotlePrebuiltBuilderItem
                                    ? chipotleAdjustedTotals.protein
                                    : (nutrition.protein ?? 0)) * quantity,
                            ),
                            carbs: Math.round(
                                (isChipotlePrebuiltBuilderItem
                                    ? chipotleAdjustedTotals.carbs
                                    : (nutrition.carbs ?? 0)) * quantity,
                            ),
                            totalFat: Math.round(
                                (isChipotlePrebuiltBuilderItem
                                    ? chipotleAdjustedTotals.totalFat
                                    : (nutrition.totalFat ?? 0)) * quantity,
                            ),
                        }}
                        size="panel"
                        className="w-full justify-between gap-2 sm:gap-3 lg:!w-fit lg:justify-start"
                        itemClassName="px-2 py-0.5"
                        labelClassName="text-[#64748b]"
                    />
                    <div className="flex w-full flex-row items-center gap-2 lg:w-auto">
                        <div className="inline-flex h-12 flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 p-1 lg:h-auto lg:w-[104px] lg:flex-none">
                            <button
                                type="button"
                                onClick={handleDecrementQuantity}
                                className="cursor-pointer inline-flex size-9 items-center justify-center rounded-xl text-base font-semibold text-slate-700 transition hover:bg-white"
                                aria-label={`Decrease quantity of ${item.name}`}
                            >
                                -
                            </button>
                            <span className="min-w-8 text-center text-sm font-bold text-slate-900">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                onClick={handleIncrementQuantity}
                                className="cursor-pointer inline-flex size-9 items-center justify-center rounded-xl text-base font-semibold text-slate-700 transition hover:bg-white"
                                aria-label={`Increase quantity of ${item.name}`}
                            >
                                +
                            </button>
                        </div>
                        {isCustomizeMode ? (
                            <button
                                type="button"
                                className="cursor-pointer h-12 rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-base font-bold text-black/80 transition hover:bg-slate-50 sm:px-6"
                                onClick={handleClose}
                            >
                                Cancel
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="cursor-pointer h-12 flex-1 rounded-2xl bg-neutral-900 px-4 py-2.5 text-base font-bold text-white transition hover:bg-neutral-800 sm:px-6 lg:flex-none"
                            onClick={submitCartItem}
                        >
                            {submitButtonLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
