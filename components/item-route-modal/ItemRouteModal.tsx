"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Pencil, Utensils, X } from "lucide-react";
import ItemDetailsPanel, { ITEM_DETAILS_SECTION_IDS, PortionSelector } from "@/components/ItemDetailsPanel";
import PresetBuildReview from "@/components/item-route-modal/PresetBuildReview";
import CartItemPreviewContent from "@/components/item-route-modal/CartItemPreviewContent";
import ComparativeLabelBadge from "@/components/menu-item-card/ComparativeLabelBadge";
import { computeComparativeLabels } from "@/lib/menuSections/comparativeLabels";
import MacroStat from "@/components/nutrition/MacroStat";
import MenuSections from "@/components/MenuSections";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";
import SelectedIngredientsReviewCard from "@/components/item-route-modal/SelectedIngredientsReviewCard";
import { NutritionDetailsGrid } from "@/components/item-route-modal/SelectionSummaryPanels";
import ItemModalStickyFooter from "@/components/item-route-modal/ItemModalStickyFooter";
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
    isChipotleEditablePresetBuildItem,
} from "@/lib/restaurantBuilders/chipotle/highProtein";
import {
    getChipotlePortionModeOptions,
    getProteinBadgeLabel,
    getProteinMultiplier,
    getProteinPortionModeLabel,
    getSplitPortionLabel,
    getSplitPortionModeLabel,
    normalizeIngredientCategory,
    type ChipotlePortionModeOption,
    type ProteinPortionMode,
    type SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";
import type { ChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle";
import { fromUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";
import { getIncludedIngredientIdsForChipotleBuild } from "@/lib/cart/buildItemAdapters";
import {
    calculateChipotleBuildNutrition,
    calculateChipotleIngredientNutritionById,
} from "@/lib/restaurantBuilders/chipotle/nutrition";
import { diffChipotleBuildConfigurations } from "@/lib/restaurantBuilders/chipotle/buildDiff";
import { SORT_OPTION_VALUES } from "@/lib/menuSections/sortOptions";
import {
    resolveIngredientRelationshipNutrition,
    resolveMenuItemVariantNutrition,
} from "@/lib/nutrition";
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

// Scroll-target id shared between the Overview "Included in this Build"
// cards (which set it via getItemDomId below) and the Customize-state
// MenuSections instances that actually render the ingredient tile.
function chipotleIngredientDomId(ingredientId: string) {
    return `chipotle-ingredient-${ingredientId}`;
}

// Current-value shortcut for the Portion/Order Type segmented controls,
// shown in the Preview/Overview state instead of the full editable
// selector — same label treatment, and still shows only the current value
// (never the alternatives, never the selector's green selected-state
// look), but is a real button: clicking it jumps straight into Customize
// mode, scrolled to that exact control, the same way clicking a Side/Drink/
// Dressings/Dipping Sauces card does.
// A read-only preview chip for a configuration value (Portion, Order Type,
// ...) that opens the Customize flow when clicked — not an inline dropdown,
// so it deliberately looks like an editable value (current value + a small
// pencil icon) rather than a select control (no chevron).
function PreviewControlShortcut({
    label,
    value,
    onClick,
}: {
    label: string;
    value: string;
    onClick?: () => void;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <button
                type="button"
                onClick={onClick}
                aria-label={`Edit ${label}`}
                className="mt-1.5 inline-flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-black/15 bg-slate-50 px-4 text-[13px] font-semibold text-slate-700 transition hover:border-black/25 hover:bg-slate-100 active:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:text-sm"
            >
                <span className="truncate">{value}</span>
                <Pencil className="h-3 w-3 shrink-0 text-slate-400" strokeWidth={2.5} />
            </button>
        </div>
    );
}

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
    initialScrollSectionId,
    initialMode,
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
    // Cart page "jump straight to this section" shortcut (Side/Drink arrow,
    // Customizations arrow) — scrolls to the matching standard-item section
    // once on mount. No effect on the Chipotle build-your-own path, which has
    // its own scroll-to-ingredient mechanism (chipotleCustomizeScrollTargetId).
    initialScrollSectionId?: keyof typeof ITEM_DETAILS_SECTION_IDS | null;
    // Cart page's Preview-vs-Edit entry point: card body click opens the
    // read-only Preview overview, the pencil button opens straight into the
    // relevant edit view. Only meaningful when editCartItemId resolves to a
    // real cart item — irrelevant to the "add a new item" flow other callers
    // use, so it's optional and defaults to jumping straight to edit there.
    initialMode?: "preview" | "edit";
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
    const selectedItemImage = selectedVariant?.image || item.image;
    const comparativeLabel = useMemo(
        () =>
            menuItems && menuItems.length > 0
                ? computeComparativeLabels(menuItems).get(
                      item.id ?? item.name,
                  )
                : undefined,
        [menuItems, item],
    );
    const baseNutrition = resolveMenuItemVariantNutrition(
        item,
        selectedVariant,
    );
    const isChipotlePrebuiltBuilderItem = isChipotleEditablePresetBuildItem(
        item,
        restaurantId,
    );
    const canCustomizeViaBuildPage =
        isChipotlePrebuiltBuilderItem && Boolean(editingCartItem);
    // Fully-custom Build Your Own cart items have no in-modal edit view (the
    // ingredient-category builder lives on the full restaurant build page) —
    // for these the cart Preview's only "Customize" action is a route out to
    // that page, so the modal never enters an internal edit stage for them.
    const isBuildYourOwnCartItem =
        editingCartItem?.selection.type === "build-your-own";
    // A from-scratch build (not one of the catalog High Protein presets) —
    // these have no "original" to diff/reset against, but otherwise share
    // every bit of the preset review/customize machinery below, since both
    // are ultimately just selectedChipotleIngredientItems hydrated from a
    // CartBuildConfiguration.
    const isTrueBuildYourOwnCartItem =
        isBuildYourOwnCartItem && !isChipotlePrebuiltBuilderItem;
    const usesChipotleBuildReview =
        isChipotlePrebuiltBuilderItem || isTrueBuildYourOwnCartItem;
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
    // Always the factory preset — unlike chipotleBuildConfiguration above,
    // this never reflects an editing cart item's saved customization. It's
    // the permanent baseline "Base Nutrition" and the Customize (n) / Added
    // / Modified / Reset to Original comparisons are measured against.
    const originalPresetBuildConfiguration =
        useMemo<ChipotleBuildConfiguration>(
            () => buildHighProteinBuildConfiguration(item, ingredients),
            [item, ingredients],
        );
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
    // Shared derivation from a ChipotleBuildConfiguration to the modal's
    // live selection-state shape — used both to seed initial state (from
    // whatever build is already active, factory or edited-cart) and to
    // implement "Reset to Original" (from the factory preset specifically).
    const deriveChipotleSelectionState = useCallback(
        (buildConfiguration: ChipotleBuildConfiguration) => {
            const nextSelectedItems: Record<
                string,
                { item: MenuItem; quantity: number }
            > = {};
            const nextSplitModesById: Record<string, SplitPortionMode> = {
                ...(buildConfiguration?.splitPortionModeById ?? {}),
            };

            Object.entries(
                buildConfiguration?.selectedIngredientItems ?? {},
            ).forEach(([ingredientId, selectedEntry]) => {
                const ingredient = chipotleIngredientById.get(ingredientId);
                if (!ingredient || selectedEntry.quantity <= 0) return;

                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(ingredient.categories),
                );
                const rawQuantity = selectedEntry.quantity;

                if (category === "rice" || category === "beans" || category === "toppings") {
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

            const isBurrito = (item.id ?? "")
                .toLowerCase()
                .includes("burrito");
            if (isBurrito && !nextSelectedItems.tortilla) {
                const tortilla = chipotleIngredientById.get("tortilla");
                if (tortilla) {
                    nextSelectedItems.tortilla = {
                        item: tortilla,
                        quantity: 1,
                    };
                }
            }
            if (isChipotleTacoItem) {
                const tacoShellId =
                    buildConfiguration?.selectedTacoShell === "soft"
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
                    buildConfiguration?.proteinPortionMode ?? "normal",
                splitModesById: nextSplitModesById,
                selectedVariantIds:
                    buildConfiguration?.selectedIngredientVariantIds ?? {},
                selectedTacoCount: (buildConfiguration?.selectedTacoCount ===
                1
                    ? 1
                    : 3) as 1 | 3,
                selectedTacoShellId:
                    buildConfiguration?.selectedTacoShell === "soft"
                        ? "soft-flour-tortilla"
                        : "crispy-corn-tortilla",
            };
        },
        [chipotleIngredientById, isChipotleTacoItem, item.id],
    );
    const initialChipotleBuilderState = useMemo(
        () => deriveChipotleSelectionState(chipotleBuildConfiguration),
        [deriveChipotleSelectionState, chipotleBuildConfiguration],
    );
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
        // Prefer the real entree from the cart item being edited (covers
        // burrito/quesadilla/salad/tacos/kids-meal) over guessing from the
        // catalog item id — for a from-scratch build that id is a synthetic
        // stand-in (e.g. "chipotle-build") and never matches, so this is
        // also just a more accurate source of truth for preset edits too.
        if (editingCartItem?.selection.type === "build-your-own") {
            return new Set(getIncludedIngredientIdsForChipotleBuild(editingCartItem));
        }
        const isBurrito = (item.id ?? "").toLowerCase().includes("burrito");
        return isBurrito ? new Set(["tortilla"]) : new Set<string>();
    }, [item.id, editingCartItem]);
    // Slice 10: prebuilt Chipotle items open on a read-only preset review by
    // default, with an explicit Customize action to reach the same
    // ingredient-picker experience Build Your Own uses. The cart's pencil
    // button (initialMode="edit") skips straight to Customize instead.
    const [chipotlePresetStage, setChipotlePresetStage] = useState<
        "review" | "customize"
    >(initialMode === "edit" ? "customize" : "review");
    // Customize edits a temporary draft: entering Customize snapshots
    // whatever build is currently live (the factory preset, or a build the
    // user already saved earlier), Cancel restores exactly that snapshot,
    // and Save just drops it so the live state becomes the new baseline.
    const chipotlePresetSnapshotRef = useRef<{
        selectedItems: Record<string, { item: MenuItem; quantity: number }>;
        proteinMode: ProteinPortionMode;
        splitModesById: Record<string, SplitPortionMode>;
        tacoCount: 1 | 3;
        tacoShellId: string;
    } | null>(null);
    const handleEnterChipotleCustomize = useCallback(() => {
        chipotlePresetSnapshotRef.current = {
            selectedItems: selectedChipotleIngredientItems,
            proteinMode: chipotleProteinPortionMode,
            splitModesById: chipotleSplitPortionModeById,
            tacoCount: selectedChipotleTacoCount,
            tacoShellId: selectedChipotleTacoShellId,
        };
        setChipotlePresetStage("customize");
    }, [
        selectedChipotleIngredientItems,
        chipotleProteinPortionMode,
        chipotleSplitPortionModeById,
        selectedChipotleTacoCount,
        selectedChipotleTacoShellId,
    ]);
    const handleSaveChipotleCustomize = useCallback(() => {
        chipotlePresetSnapshotRef.current = null;
        setChipotlePresetStage("review");
    }, []);
    const handleCancelChipotleCustomize = useCallback(() => {
        const snapshot = chipotlePresetSnapshotRef.current;
        if (snapshot) {
            setSelectedChipotleIngredientItems(snapshot.selectedItems);
            setChipotleProteinPortionMode(snapshot.proteinMode);
            setChipotleSplitPortionModeById(snapshot.splitModesById);
            setSelectedChipotleTacoCount(snapshot.tacoCount);
            setSelectedChipotleTacoShellId(snapshot.tacoShellId);
        }
        chipotlePresetSnapshotRef.current = null;
        setChipotlePresetStage("review");
    }, []);
    // Restores the saved build straight to the factory preset — distinct
    // from Customize's discard/cancel, this acts directly on the current
    // saved state (Overview only) rather than a Customize-session draft.
    const handleResetChipotleToOriginal = useCallback(() => {
        const derived = deriveChipotleSelectionState(
            originalPresetBuildConfiguration,
        );
        setSelectedChipotleIngredientItems(derived.selectedItems);
        setChipotleProteinPortionMode(derived.proteinMode);
        setChipotleSplitPortionModeById(derived.splitModesById);
        setSelectedChipotleTacoCount(derived.selectedTacoCount);
        setSelectedChipotleTacoShellId(derived.selectedTacoShellId);
    }, [deriveChipotleSelectionState, originalPresetBuildConfiguration]);
    // Clicking an Overview ingredient card jumps straight into Customize,
    // scrolled to that exact ingredient — a read shortcut, not an edit, so
    // it reuses the same enter-Customize snapshot behavior unchanged and
    // only additionally remembers which ingredient to scroll to once the
    // Customize content has mounted.
    const [chipotleCustomizeScrollTargetId, setChipotleCustomizeScrollTargetId] =
        useState<string | null>(null);
    const handleCustomizeIngredientFromOverview = useCallback(
        (ingredientId: string) => {
            handleEnterChipotleCustomize();
            setChipotleCustomizeScrollTargetId(ingredientId);
        },
        [handleEnterChipotleCustomize],
    );
    useEffect(() => {
        if (chipotlePresetStage !== "customize" || !chipotleCustomizeScrollTargetId) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            const target = document.getElementById(
                chipotleIngredientDomId(chipotleCustomizeScrollTargetId),
            );
            target?.scrollIntoView({ behavior: "smooth", block: "center" });
            setChipotleCustomizeScrollTargetId(null);
        });
        return () => cancelAnimationFrame(frame);
    }, [chipotlePresetStage, chipotleCustomizeScrollTargetId]);

    // Generic counterpart to chipotlePresetStage above, for every cart item
    // that isn't a Chipotle editable preset (standard items, combos, fully
    // custom Build Your Own) — the cart's Preview overview and its "jump
    // into edit at this section" cards drive this instead.
    const [cartPreviewStage, setCartPreviewStage] = useState<
        "preview" | "edit"
    >(initialMode === "edit" ? "edit" : "preview");
    const [pendingPreviewScrollSectionId, setPendingPreviewScrollSectionId] =
        useState<keyof typeof ITEM_DETAILS_SECTION_IDS | null>(null);
    const handleOpenCartPreviewSection = useCallback(
        (section: keyof typeof ITEM_DETAILS_SECTION_IDS) => {
            setCartPreviewStage("edit");
            setPendingPreviewScrollSectionId(section);
        },
        [],
    );
    const handleBackToCartPreviewOverview = useCallback(() => {
        setCartPreviewStage("preview");
    }, []);
    // Preview state's Portion/Order Type shortcut buttons enter Customize.
    // Portion still scrolls to its own control (same "enter Customize, scroll
    // to this exact control" behavior as the Side/Drink/Dressings/Dipping
    // Sauces cards). Order Type deliberately does not register a scroll
    // target: the Order Type control sits directly above the Customize
    // Ingredients section, so scrolling it to the top of the viewport was
    // effectively scrolling the modal down toward Customize Ingredients —
    // Order Type should just switch into Customize in place. Chipotle preset
    // items never actually render these shortcuts (they have no variant/
    // combo-type concept), but route through their own customize entry point
    // for correctness if that ever changes.
    const handleOpenOverviewControl = useCallback(
        (section: "portion" | "orderType") => {
            if (isChipotlePrebuiltBuilderItem) {
                handleEnterChipotleCustomize();
                return;
            }
            if (section === "orderType") {
                setCartPreviewStage("edit");
                return;
            }
            handleOpenCartPreviewSection(section);
        },
        [
            isChipotlePrebuiltBuilderItem,
            handleEnterChipotleCustomize,
            handleOpenCartPreviewSection,
        ],
    );
    useEffect(() => {
        if (cartPreviewStage !== "edit" || !pendingPreviewScrollSectionId) {
            return;
        }
        const targetId = ITEM_DETAILS_SECTION_IDS[pendingPreviewScrollSectionId];
        const frame = requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingPreviewScrollSectionId(null);
        });
        return () => cancelAnimationFrame(frame);
    }, [cartPreviewStage, pendingPreviewScrollSectionId]);

    // Standard (non-Chipotle) counterpart to the scroll-to-ingredient effect
    // above — jumps the modal straight to its Side/Drink/Customize
    // ingredients section once on mount, for the cart page's per-section
    // "edit this part" shortcuts. Runs once (initialScrollSectionId is a
    // prop, not state the cart page changes after open) since the modal
    // itself fully remounts on every open.
    useEffect(() => {
        if (!initialScrollSectionId) return;
        const targetId = ITEM_DETAILS_SECTION_IDS[initialScrollSectionId];
        const frame = requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => cancelAnimationFrame(frame);
    }, [initialScrollSectionId]);

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
            if (category === "toppings") {
                // No auto-half sharing rule for toppings — each one's
                // light/normal/extra is direct, unlike rice/beans.
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
    // Some generated ingredient records (e.g. Chick-fil-A "contextual
    // modifier" ingredients like bacon crumbles or syrup pumps) carry no
    // direct `nutrition` of their own — the real values live per-parent-item
    // in `ingredientNutritionContexts` and are resolved by the caller before
    // this is invoked (see resolveIngredientNutritionForDisplay below).
    // Missing nutrition must never be silently treated as zero, so this
    // returns undefined rather than crashing or fabricating values.
    const buildScaledNutrition = useCallback(
        (
            nutrition: MenuItem["nutrition"] | undefined,
            multiplier: number,
        ): MenuItem["nutrition"] | undefined => {
            if (!nutrition) return undefined;
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
    // Resolves the correct source nutrition for one ingredient before
    // scaling: the parent item -> ingredient relationship (the official
    // per-item modifier unit, e.g. "2 scoops of bacon on this item") wins
    // when present, since that's how context-dependent generated records
    // (Chick-fil-A modifiers) carry their real values; otherwise falls back
    // to nutrition on the ingredient record itself. Returns undefined only
    // when neither source has data — a genuine "no nutrition available"
    // case, not an error.
    const resolveIngredientNutritionForDisplay = useCallback(
        (ingredientItem: MenuItem, ingredientId: string) =>
            resolveIngredientRelationshipNutrition(
                item,
                ingredientId,
                selectedVariant,
            ) ?? ingredientItem.nutrition,
        [item, selectedVariant],
    );
    const chipotleIngredientDisplayItems = useMemo<MenuItem[]>(
        () =>
            chipotleIngredientMenuItems
                .map((ingredientItem) => {
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
                        resolveIngredientNutritionForDisplay(
                            ingredientItem,
                            ingredientId,
                        ),
                        multiplier,
                    );
                    // Genuinely no nutrition available anywhere for this
                    // ingredient — omit it rather than crash or show fake 0s.
                    if (!nutrition) return null;
                    return {
                        ...ingredientItem,
                        nutrition,
                    };
                })
                .filter((displayItem): displayItem is MenuItem => displayItem !== null),
        [
            chipotleIngredientMenuItems,
            buildScaledNutrition,
            resolveIngredientNutritionForDisplay,
            getChipotleIngredientMultiplier,
            getChipotleSelectedIngredientPortionMultiplier,
        ],
    );
    const chipotleIncludedIngredientDisplayItems = useMemo<MenuItem[]>(
        () =>
            chipotleIncludedIngredientMenuItems
                .map((ingredientItem) => {
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
                        resolveIngredientNutritionForDisplay(
                            ingredientItem,
                            ingredientId,
                        ),
                        multiplier,
                    );
                    // Genuinely no nutrition available anywhere for this
                    // ingredient — omit it rather than crash or show fake 0s.
                    if (!nutrition) return null;
                    return {
                        ...ingredientItem,
                        nutrition,
                    };
                })
                .filter((displayItem): displayItem is MenuItem => displayItem !== null),
        [
            chipotleIncludedIngredientMenuItems,
            buildScaledNutrition,
            resolveIngredientNutritionForDisplay,
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
                } else if (category === "toppings") {
                    acc[ingredientId] = getSplitPortionLabel(
                        chipotleSplitPortionModeById[ingredientId] ?? "normal",
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
    // The raw portion mode id (not the display label) currently in effect
    // for each selected proteins/rice/beans ingredient — shared source for
    // both the human-readable label below and the Selected Ingredients
    // quick-edit dropdown's selected value, so they can never disagree.
    const chipotleSelectedPortionModeIdById = useMemo(
        () =>
            Object.entries(selectedChipotleIngredientItems).reduce<
                Record<string, ProteinPortionMode | SplitPortionMode>
            >((acc, [ingredientId, entry]) => {
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(entry.item.categories),
                );
                if (category === "proteins") {
                    acc[ingredientId] = chipotleProteinPortionMode;
                } else if (category === "rice" || category === "beans") {
                    const selectedSplitIds =
                        chipotleSelectedSplitIngredientIdsByCategory[category];
                    acc[ingredientId] =
                        selectedSplitIds.length >= 2
                            ? "light"
                            : (chipotleSplitPortionModeById[ingredientId] ??
                              "normal");
                } else if (category === "toppings") {
                    acc[ingredientId] =
                        chipotleSplitPortionModeById[ingredientId] ?? "normal";
                }
                return acc;
            }, {}),
        [
            chipotleProteinPortionMode,
            chipotleSelectedSplitIngredientIdsByCategory,
            chipotleSplitPortionModeById,
            selectedChipotleIngredientItems,
        ],
    );
    // Human-readable portion names (Light / Normal / Extra / Double) for the
    // read-only "Included in this Build" overview cards — same underlying
    // portion mode data as chipotleIngredientPortionLabelById above, just
    // reusing the same wording as the Customize portion picker instead of
    // the numeric multiplier badge used elsewhere (Customize ingredient
    // tiles, Selected Ingredients) to match the real Build Your Own
    // experience's badge conventions.
    const chipotlePresetPortionModeLabelById = useMemo(
        () =>
            Object.entries(selectedChipotleIngredientItems).reduce<
                Record<string, string>
            >((acc, [ingredientId, entry]) => {
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(entry.item.categories),
                );
                const modeId = chipotleSelectedPortionModeIdById[ingredientId];
                if (!modeId) return acc;
                acc[ingredientId] =
                    category === "proteins"
                        ? getProteinPortionModeLabel(
                              modeId as ProteinPortionMode,
                          )
                        : getSplitPortionModeLabel(modeId as SplitPortionMode);
                return acc;
            }, {}),
        [chipotleSelectedPortionModeIdById, selectedChipotleIngredientItems],
    );
    // The available portion options (if any) for each currently selected
    // ingredient — powers the Selected Ingredients quick-edit dropdown.
    // Ingredients with no entry here (sides) get no dropdown.
    const chipotleSelectedPortionModeOptionsById = useMemo(() => {
        const optionsById: Record<string, ChipotlePortionModeOption[]> = {};
        Object.entries(selectedChipotleIngredientItems).forEach(
            ([ingredientId, entry]) => {
                const category = normalizeIngredientCategory(
                    resolvePrimaryCategory(entry.item.categories),
                );
                const options = getChipotlePortionModeOptions(category);
                if (options) optionsById[ingredientId] = options;
            },
        );
        return optionsById;
    }, [selectedChipotleIngredientItems]);
    // Shared by the Customize ingredient list and the Selected Ingredients
    // quick-edit dropdown, so both write to the exact same state the exact
    // same way.
    const handleChipotlePortionModeChange = useCallback(
        (ingredientId: string, category: string, modeId: string) => {
            if (
                category === "proteins" &&
                (modeId === "normal" || modeId === "double")
            ) {
                setChipotleProteinPortionMode(modeId);
                return;
            }
            if (
                (category === "rice" || category === "beans" || category === "toppings") &&
                (modeId === "light" || modeId === "normal" || modeId === "extra")
            ) {
                setChipotleSplitPortionModeById((prev) => ({
                    ...prev,
                    [ingredientId]: modeId,
                }));
            }
        },
        [],
    );
    // Single source of truth for this build's totals: reuses the same
    // ingredient/portion calculation shared with the menu card and cart
    // (see lib/restaurantBuilders/chipotle/nutrition.ts) instead of a
    // modal-local reimplementation, so every surface that shows this
    // build's macros agrees on the same numbers.
    const chipotleBuildConfigurationForTotals = useMemo<ChipotleBuildConfiguration>(
        () => ({
            selectedEntree: null,
            selectedIngredientItems: Object.fromEntries(
                Object.entries(selectedChipotleIngredientItems).map(
                    ([ingredientId, selectedIngredient]) => [
                        ingredientId,
                        { quantity: selectedIngredient.quantity },
                    ],
                ),
            ),
            selectedIngredientVariantIds: selectedChipotleIngredientVariantIds,
            proteinPortionMode: chipotleProteinPortionMode,
            splitPortionModeById: chipotleSplitPortionModeById,
            selectedTacoShell:
                selectedChipotleTacoShellId === "soft-flour-tortilla"
                    ? "soft"
                    : "crispy",
            selectedTacoCount: selectedChipotleTacoCount,
            selectedKidsMeal: "build-your-own",
        }),
        [
            chipotleProteinPortionMode,
            chipotleSplitPortionModeById,
            selectedChipotleIngredientItems,
            selectedChipotleIngredientVariantIds,
            selectedChipotleTacoCount,
            selectedChipotleTacoShellId,
        ],
    );
    const chipotleAdjustedTotals = useMemo(
        () =>
            calculateChipotleBuildNutrition(
                chipotleBuildConfigurationForTotals,
                ingredients ?? [],
            ),
        [chipotleBuildConfigurationForTotals, ingredients],
    );
    // Per-ingredient macro contribution (at its currently selected portion)
    // for the Overview "Included in this Build" cards — reuses the exact
    // same scaling math as chipotleAdjustedTotals above so the per-card
    // numbers always add up to the same totals shown elsewhere.
    const chipotlePresetIngredientNutritionById = useMemo(
        () =>
            calculateChipotleIngredientNutritionById(
                chipotleBuildConfigurationForTotals,
                ingredients ?? [],
            ),
        [chipotleBuildConfigurationForTotals, ingredients],
    );
    // "Base Nutrition" — always the original preset's totals, never the
    // live/current build. Fixed regardless of customization.
    const originalPresetNutrition = useMemo(
        () =>
            calculateChipotleBuildNutrition(
                originalPresetBuildConfiguration,
                ingredients ?? [],
            ),
        [originalPresetBuildConfiguration, ingredients],
    );
    // Customize (n) / Added / Modified / Reset to Original all compare the
    // current saved build against the original preset — never the
    // temporary Customize-session snapshot.
    const chipotleBuildDiff = useMemo(
        () =>
            diffChipotleBuildConfigurations(
                originalPresetBuildConfiguration,
                chipotleBuildConfigurationForTotals,
                ingredients ?? [],
            ),
        [
            originalPresetBuildConfiguration,
            chipotleBuildConfigurationForTotals,
            ingredients,
        ],
    );
    // A from-scratch build has no factory preset to diff against, so it
    // never shows a difference count / Reset to Original / Added-Modified
    // badges — only a real editable preset does.
    const chipotleCustomizeButtonLabel = isChipotlePrebuiltBuilderItem && chipotleBuildDiff.isCustomized
        ? `Customize (${chipotleBuildDiff.differenceCount})`
        : "Customize";
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

    // True whenever the modal is currently showing a read-only review body
    // (PresetBuildReview / CartItemPreviewContent) rather than an editable
    // customize form — mirrors the same branching used to pick the sticky
    // footer's "preview" vs "customize" mode below, and drives whether the
    // Portion/Order Type controls in the header render as editable
    // segmented controls or as static read-only chips. A brand-new standard
    // item (no editingCartItem, not a Chipotle preset) has no separate
    // review stage at all — it opens straight into the editable form — so
    // it falls through to `false` here.
    const isOverviewPreviewState = usesChipotleBuildReview
        ? chipotlePresetStage === "review"
        : Boolean(editingCartItem) && cartPreviewStage === "preview";

    const handleClose = () => {
        if (closeBehavior === "local") {
            onClose?.();
            return;
        }

        if (closeBehavior === "back") {
            router.back();
            return;
        }

        const query = searchParams.toString();
        router.replace(query ? `${restaurantPath}?${query}` : restaurantPath, {
            scroll: false,
        });
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

    const { submitButtonLabel, submitCartItem, saveChangesInPlace } = useItemCartSubmission({
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
            isPrebuiltBuilderItem: usesChipotleBuildReview,
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
    // Customize → Save Changes for an item already in the cart: commit the
    // edit, then land back on the (now up-to-date) Preview state instead of
    // closing — the modal stays open so the user can review what changed
    // before dismissing it with Done.
    const handleSaveCartItemChanges = useCallback(() => {
        saveChangesInPlace();
        setCartPreviewStage("preview");
    }, [saveChangesInPlace]);
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
            <div className="item-route-modal-root relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:h-auto sm:max-h-[88vh] sm:min-h-[78vh] sm:w-full sm:max-w-[660px] sm:rounded-3xl md:max-w-[800px] lg:max-w-[1000px]">
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
                                    className={
                                        isChipotlePrebuiltBuilderItem
                                            ? "object-cover"
                                            : "object-contain p-1"
                                    }
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
                                        className={
                                            isChipotlePrebuiltBuilderItem
                                                ? "object-cover"
                                                : "object-contain p-1.5 sm:p-2.5 lg:p-3"
                                        }
                                    />
                                    {comparativeLabel ? (
                                        <div className="absolute left-2 top-2 z-10">
                                            <ComparativeLabelBadge
                                                kind={comparativeLabel}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className="item-overview-content">
                                <p className="item-overview-label mt-4 min-w-0 pr-12 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:mt-0 sm:pr-14">
                                    Base Nutrition
                                </p>
                                <h1 className="item-overview-title font-heading mt-1.5 min-w-0 text-lg font-bold leading-tight tracking-tight text-neutral-900 sm:truncate sm:pr-14 sm:text-xl lg:text-2xl">
                                    {item.name}
                                </h1>
                                <div className="item-overview-macros mt-5 flex flex-wrap items-center justify-start gap-x-4 gap-y-2 sm:mt-3 sm:gap-x-5">
                                    <MacroStat
                                        macroKey="calories"
                                        value={Math.round(
                                            isChipotlePrebuiltBuilderItem
                                                ? originalPresetNutrition.calories
                                                : baseNutrition.calories,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="protein"
                                        value={Math.round(
                                            isChipotlePrebuiltBuilderItem
                                                ? originalPresetNutrition.protein
                                                : baseNutrition.protein,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="carbs"
                                        value={Math.round(
                                            isChipotlePrebuiltBuilderItem
                                                ? originalPresetNutrition.carbs
                                                : baseNutrition.carbs,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                    <MacroStat
                                        macroKey="totalFat"
                                        value={Math.round(
                                            isChipotlePrebuiltBuilderItem
                                                ? originalPresetNutrition.totalFat
                                                : baseNutrition.totalFat,
                                        )}
                                        size="ingredientCompact"
                                        labelVariant="uppercase"
                                    />
                                </div>
                                {(variants &&
                                    variants.length > 0 &&
                                    !item.hideVariantSelector) ||
                                isComboEligibleCategory ? (
                                    <div className="item-overview-options mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-4">
                                        {isOverviewPreviewState ? (
                                            <>
                                                {variants &&
                                                variants.length > 0 &&
                                                !item.hideVariantSelector &&
                                                selectedVariant ? (
                                                    <PreviewControlShortcut
                                                        label={
                                                            item.variantGroupLabel ??
                                                            "Portion"
                                                        }
                                                        value={
                                                            selectedVariant.label
                                                        }
                                                        onClick={() =>
                                                            handleOpenOverviewControl(
                                                                "portion",
                                                            )
                                                        }
                                                    />
                                                ) : null}
                                                {isComboEligibleCategory ? (
                                                    <PreviewControlShortcut
                                                        label="Order Type"
                                                        value={
                                                            comboTypeOptions.find(
                                                                (option) =>
                                                                    option.id ===
                                                                    comboType,
                                                            )?.label ?? ""
                                                        }
                                                        onClick={() =>
                                                            handleOpenOverviewControl(
                                                                "orderType",
                                                            )
                                                        }
                                                    />
                                                ) : null}
                                            </>
                                        ) : (
                                            <>
                                                {variants &&
                                                variants.length > 0 &&
                                                !item.hideVariantSelector ? (
                                                    <PortionSelector
                                                        id={
                                                            ITEM_DETAILS_SECTION_IDS.portion
                                                        }
                                                        variants={variants}
                                                        selectedVariantId={
                                                            selectedVariantId
                                                        }
                                                        onSelectVariant={
                                                            setSelectedVariantId
                                                        }
                                                        layout="top"
                                                        className="min-w-0 lg:w-[55%]"
                                                        groupLabel={
                                                            item.variantGroupLabel ??
                                                            "Portion"
                                                        }
                                                    />
                                                ) : null}
                                                {isComboEligibleCategory ? (
                                                    <div
                                                        id={
                                                            ITEM_DETAILS_SECTION_IDS.orderType
                                                        }
                                                        className="min-w-0 lg:w-[45%]"
                                                    >
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                            Order Type
                                                        </p>
                                                        <div
                                                            role="radiogroup"
                                                            aria-label="Order type"
                                                            className="mt-1.5 grid w-full grid-cols-2 gap-1 rounded-full bg-slate-100 p-1"
                                                        >
                                                            {comboTypeOptions.map(
                                                                (option) => {
                                                                    const isActive =
                                                                        comboType ===
                                                                        option.id;
                                                                    const Icon =
                                                                        option.icon;

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                option.id
                                                                            }
                                                                            type="button"
                                                                            role="radio"
                                                                            aria-checked={
                                                                                isActive
                                                                            }
                                                                            onClick={() =>
                                                                                setComboType(
                                                                                    option.id,
                                                                                )
                                                                            }
                                                                            className={`box-border flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:gap-1.5 sm:px-5 sm:text-sm ${
                                                                                isActive
                                                                                    ? "border-transparent bg-accent-strong text-white/95 shadow-sm"
                                                                                    : "border-transparent text-slate-500 hover:bg-white/70 active:bg-white"
                                                                            }`}
                                                                        >
                                                                            <Icon
                                                                                className={`h-4 w-4 shrink-0 ${isActive ? "text-white/95" : "text-slate-400"}`}
                                                                                strokeWidth={
                                                                                    2.3
                                                                                }
                                                                            />
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </button>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </>
                                        )}
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

                        <div className="mt-6 w-full">
                            {usesChipotleBuildReview ? (
                                chipotlePresetStage === "review" ? (
                                    <div
                                        key="chipotle-preset-review"
                                        className="preset-stage-enter grid gap-8"
                                    >
                                        <PresetBuildReview
                                            groupedEntries={
                                                chipotleGroupedSelectedIngredientEntries
                                            }
                                            portionLabelById={
                                                chipotlePresetPortionModeLabelById
                                            }
                                            ingredientNutritionById={
                                                chipotlePresetIngredientNutritionById
                                            }
                                            lockedIds={
                                                chipotleLockedIngredientIds
                                            }
                                            diffStatusById={
                                                isChipotlePrebuiltBuilderItem
                                                    ? chipotleBuildDiff.statusById
                                                    : {}
                                            }
                                            isCustomized={
                                                isChipotlePrebuiltBuilderItem &&
                                                chipotleBuildDiff.isCustomized
                                            }
                                            onResetToOriginal={
                                                handleResetChipotleToOriginal
                                            }
                                            onSelectIngredient={
                                                handleCustomizeIngredientFromOverview
                                            }
                                        />
                                        <NutritionDetailsGrid
                                            nutritionFacts={
                                                <NutritionFactsPanel
                                                    totals={chipotleAdjustedTotals}
                                                />
                                            }
                                            details={
                                                <SelectedIngredientsReviewCard
                                                    selectedBuildName={item.name}
                                                    groupedSelectedIngredientEntries={
                                                        chipotleGroupedSelectedIngredientEntries
                                                    }
                                                    lockedIngredientIds={
                                                        chipotleLockedIngredientIds
                                                    }
                                                    restaurantLogo={
                                                        item.image ?? ""
                                                    }
                                                    adjustedTotals={
                                                        chipotleAdjustedTotals
                                                    }
                                                    portionModeOptionsById={
                                                        chipotleSelectedPortionModeOptionsById
                                                    }
                                                    selectedPortionModeIdById={
                                                        chipotleSelectedPortionModeIdById
                                                    }
                                                    onPortionModeChange={
                                                        handleChipotlePortionModeChange
                                                    }
                                                />
                                            }
                                        />
                                    </div>
                                ) : (
                                <div
                                    key="chipotle-preset-customize"
                                    className="preset-stage-enter"
                                >
                                    <div>
                                        <h2 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
                                            Customize Your Build
                                        </h2>
                                        <p className="mt-1.5 text-sm text-slate-500">
                                            Adjust this preset before adding
                                            it to your order.
                                        </p>
                                    </div>
                                    <div className="mt-10 grid gap-7">
                                    {chipotleIncludedIngredientDisplayItems.length >
                                    0 ? (
                                        <div>
                                            <h2 className="font-heading mb-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
                                                Included Ingredients
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
                                                getItemDomId={(
                                                    menuIngredientItem,
                                                ) =>
                                                    chipotleIngredientDomId(
                                                        (
                                                            menuIngredientItem.id ??
                                                            menuIngredientItem.name
                                                        ).toLowerCase(),
                                                    )
                                                }
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
                                    <div>
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
                                            getItemDomId={(
                                                menuIngredientItem,
                                            ) =>
                                                chipotleIngredientDomId(
                                                    (
                                                        menuIngredientItem.id ??
                                                        menuIngredientItem.name
                                                    ).toLowerCase(),
                                                )
                                            }
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
                                                                        getChipotlePortionModeOptions(
                                                                            category,
                                                                        ),
                                                                    ] as const;
                                                                },
                                                            )
                                                            .filter(
                                                                (
                                                                    entry,
                                                                ): entry is [
                                                                    string,
                                                                    ChipotlePortionModeOption[],
                                                                ] =>
                                                                    Boolean(
                                                                        entry[1],
                                                                    ),
                                                            ),
                                                    ),
                                                selectedPortionModeIdById:
                                                    chipotleSelectedPortionModeIdById,
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
                                                    handleChipotlePortionModeChange(
                                                        ingredientId,
                                                        category,
                                                        modeId,
                                                    );
                                                },
                                            }}
                                        />
                                    </div>
                                    </div>
                                </div>
                                )
                            ) : editingCartItem && cartPreviewStage === "preview" ? (
                                <CartItemPreviewContent
                                    cartItem={editingCartItem}
                                    onOpenSection={handleOpenCartPreviewSection}
                                />
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
                                    // A component-choice group (e.g. "Cheese")
                                    // has hideVariantSelector set, so it never
                                    // renders as the hero-adjacent segmented
                                    // control — it needs the in-panel Meal
                                    // Details selector as its one visible
                                    // place to choose. A real size/count
                                    // variant keeps using only the
                                    // hero-adjacent control (already rendered
                                    // above), so this stays off for it.
                                    showVariantsInDetails={
                                        item.variantGroupKind === "component"
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

                <ItemModalStickyFooter
                    macros={{
                        calories: Math.round(
                            (usesChipotleBuildReview
                                ? chipotleAdjustedTotals.calories
                                : (nutrition.calories ?? 0)) * quantity,
                        ),
                        protein: Math.round(
                            (usesChipotleBuildReview
                                ? chipotleAdjustedTotals.protein
                                : (nutrition.protein ?? 0)) * quantity,
                        ),
                        carbs: Math.round(
                            (usesChipotleBuildReview
                                ? chipotleAdjustedTotals.carbs
                                : (nutrition.carbs ?? 0)) * quantity,
                        ),
                        totalFat: Math.round(
                            (usesChipotleBuildReview
                                ? chipotleAdjustedTotals.totalFat
                                : (nutrition.totalFat ?? 0)) * quantity,
                        ),
                    }}
                    state={
                        usesChipotleBuildReview
                            ? chipotlePresetStage === "customize"
                                ? {
                                      mode: "customize",
                                      onBackToOverview:
                                          handleCancelChipotleCustomize,
                                      onSaveChanges:
                                          handleSaveChipotleCustomize,
                                  }
                                : {
                                      mode: "preview",
                                      quantity,
                                      itemName: item.name,
                                      onIncrementQuantity:
                                          handleIncrementQuantity,
                                      onDecrementQuantity:
                                          handleDecrementQuantity,
                                      onCustomize:
                                          handleEnterChipotleCustomize,
                                      customizeLabel:
                                          chipotleCustomizeButtonLabel,
                                      // This stage is the Preview/Overview
                                      // read-out, same as the standard cart
                                      // item's Preview footer — when opened
                                      // from the cart (editingCartItem set),
                                      // "Update" wrongly implies an edit is
                                      // being actively saved here, so it
                                      // reads as "Done" instead, matching
                                      // the standard item Preview button.
                                      // Adding a brand-new item keeps its
                                      // real "Add to Cart" label.
                                      primaryLabel: editingCartItem
                                          ? "Done"
                                          : submitButtonLabel,
                                      onPrimaryAction: submitCartItem,
                                  }
                            : editingCartItem && cartPreviewStage === "preview"
                              ? {
                                    mode: "preview",
                                    quantity,
                                    itemName: item.name,
                                    onIncrementQuantity:
                                        handleIncrementQuantity,
                                    onDecrementQuantity:
                                        handleDecrementQuantity,
                                    onCustomize: () =>
                                        setCartPreviewStage("edit"),
                                    primaryLabel: "Done",
                                    onPrimaryAction: handleClose,
                                }
                              : editingCartItem
                                ? {
                                      mode: "customize",
                                      onBackToOverview:
                                          handleBackToCartPreviewOverview,
                                      onSaveChanges:
                                          handleSaveCartItemChanges,
                                      saveLabel: "Save Changes",
                                  }
                                : {
                                      mode: "preview",
                                      quantity,
                                      itemName: item.name,
                                      onIncrementQuantity:
                                          handleIncrementQuantity,
                                      onDecrementQuantity:
                                          handleDecrementQuantity,
                                      primaryLabel: submitButtonLabel,
                                      onPrimaryAction: submitCartItem,
                                  }
                    }
                />
            </div>
        </div>
    );
}
