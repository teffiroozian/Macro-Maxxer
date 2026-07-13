import { useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ViewOption } from "@/components/ControlsRow";
import type { MenuItem } from "@/types/menu";
import type {
    ChipotleBuilderConfig,
    ChipotleEntreeSelection,
} from "@/lib/restaurantBuilders/chipotle";
import type { Filters } from "@/lib/menuSections/filterOptions";
import {
    filterMenuItems,
    getSearchTerms,
    type RankedAllFilterKey,
} from "@/lib/menuSections/filtering";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import {
    RANKING_DEFAULT_SORT,
    SORT_OPTION_VALUES,
    isDefaultOrderSort,
    type SortOption,
} from "@/lib/menuSections/sortOptions";
import {
    getCategoryLabel,
    getOrderedMenuSections,
} from "@/lib/menuSections/sorting";

export function useRestaurantMenuControls({
    hasBuildYourOwn,
    isChipotleBuildPage,
    selectedEntree,
    items,
    ingredientMenuItems,
    searchQuery,
    chipotleBuilderConfig,
    router,
    pathname,
    searchParams,
}: {
    hasBuildYourOwn: boolean;
    isChipotleBuildPage: boolean;
    selectedEntree: ChipotleEntreeSelection;
    items: MenuItem[];
    ingredientMenuItems: MenuItem[];
    searchQuery: string;
    chipotleBuilderConfig?: ChipotleBuilderConfig;
    router: {
        replace: (href: string, options?: { scroll?: boolean }) => void;
    };
    pathname: string;
    searchParams: ReadonlyURLSearchParams;
}) {
    const requestedView = searchParams.get("view");
    const defaultView: ViewOption = hasBuildYourOwn ? "ingredients" : "menu";
    const viewMode: ViewOption =
        requestedView === "ingredients"
            ? "ingredients"
            : requestedView === "ranking"
              ? "ranking"
              : defaultView;
    const [sort, setSort] = useState<SortOption>(() =>
        viewMode === "ranking"
            ? RANKING_DEFAULT_SORT
            : SORT_OPTION_VALUES.DEFAULT_ORDER,
    );
    const [filters, setFilters] = useState<Filters>({});
    const [rankedAllFilters, setRankedAllFilters] = useState<
        Record<RankedAllFilterKey, boolean>
    >({
        "main-entrees": true,
        breakfast: false,
        shareables: false,
        sides: false,
        drinks: false,
    });

    const isChipotleChipsSidesSelection =
        isChipotleBuildPage && selectedEntree === "chips-sides";
    const isChipotleHighProteinSelection =
        isChipotleBuildPage && selectedEntree === "high-protein-menu";
    const isChipotleDrinksSelection =
        isChipotleBuildPage && selectedEntree === "drinks";
    const effectiveViewMode: ViewOption =
        isChipotleChipsSidesSelection ||
        isChipotleHighProteinSelection ||
        isChipotleDrinksSelection
            ? "menu"
            : viewMode;

    const allItems = useMemo(() => {
        const baseItems = items;
        if (
            isChipotleBuildPage &&
            (selectedEntree === "chips-sides" ||
                selectedEntree === "high-protein-menu" ||
                selectedEntree === "drinks")
        ) {
            return baseItems.filter(
                (item) => item.entreeGroup === selectedEntree,
            );
        }
        return baseItems;
    }, [isChipotleBuildPage, items, selectedEntree]);

    const sourceItems =
        effectiveViewMode === "ingredients" ? ingredientMenuItems : allItems;

    const calorieBounds = useMemo(() => {
        const calories = sourceItems
            .map((item) => getDefaultMenuItemNutrition(item).calories)
            .filter(
                (calories): calories is number => typeof calories === "number",
            );

        if (!calories.length) {
            return { min: 0, max: 0 };
        }

        const minCal = Math.min(...calories);
        const maxCal = Math.max(...calories);

        return {
            min: Math.floor(minCal / 50) * 50,
            max: Math.ceil(maxCal / 50) * 50,
        };
    }, [sourceItems]);

    const searchTerms = useMemo(
        () => getSearchTerms(searchQuery),
        [searchQuery],
    );

    const filteredItems = useMemo(
        () =>
            filterMenuItems({
                items: sourceItems,
                filters,
                searchTerms,
                rankedAllFilters,
                isRankingView: effectiveViewMode === "ranking",
            }),
        [
            effectiveViewMode,
            sourceItems,
            filters,
            searchTerms,
            rankedAllFilters,
        ],
    );

    const visibleMenuItems = useMemo(() => {
        if (!isChipotleBuildPage || !selectedEntree) {
            return filteredItems;
        }

        const hiddenSections = new Set(
            (
                chipotleBuilderConfig?.hiddenSectionsByEntree?.[
                    selectedEntree
                ] ?? []
            ).map((section) => section.trim().toLowerCase()),
        );

        if (hiddenSections.size === 0) {
            return filteredItems;
        }

        return filteredItems
            .map((item) => {
                const nextCategories = (item.categories ?? []).filter(
                    (category) =>
                        !hiddenSections.has(category.trim().toLowerCase()),
                );
                const nextVariants = item.variants?.map((variant) => ({
                    ...variant,
                    categories: variant.categories?.filter(
                        (category) =>
                            !hiddenSections.has(category.trim().toLowerCase()),
                    ),
                }));

                return {
                    ...item,
                    categories: nextCategories,
                    variants: nextVariants,
                };
            })
            .filter((item) => item.categories.length > 0);
    }, [
        filteredItems,
        isChipotleBuildPage,
        selectedEntree,
        chipotleBuilderConfig,
    ]);

    const orderedSections = useMemo(
        () =>
            getOrderedMenuSections(
                visibleMenuItems,
                effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
            ),
        [effectiveViewMode, visibleMenuItems],
    );

    const categoryOptions = useMemo(
        () =>
            orderedSections.map((section) => ({
                id: section,
                label: getCategoryLabel(
                    section,
                    effectiveViewMode === "ranking"
                        ? "menu"
                        : effectiveViewMode,
                ),
            })),
        [effectiveViewMode, orderedSections],
    );

    const handleViewChange = (nextView: ViewOption) => {
        if (
            (isChipotleChipsSidesSelection || isChipotleDrinksSelection) &&
            nextView !== "menu"
        ) {
            return;
        }

        if (nextView === effectiveViewMode) {
            return;
        }

        if (nextView === "ranking" && isDefaultOrderSort(sort)) {
            setSort(RANKING_DEFAULT_SORT);
        }

        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("view", nextView);
        router.replace(`${pathname}?${nextParams.toString()}`, {
            scroll: true,
        });
    };

    const handleSortChange = (nextSort: SortOption) => {
        setSort(nextSort);
    };

    const toggleRankedAllFilter = (key: RankedAllFilterKey) => {
        setRankedAllFilters((previous) => {
            const isCurrentlyChecked = previous[key];
            const checkedCount = Object.values(previous).filter(Boolean).length;
            if (isCurrentlyChecked && checkedCount === 1) {
                return previous;
            }

            return {
                ...previous,
                [key]: !isCurrentlyChecked,
            };
        });
    };

    return {
        sort,
        filters,
        setFilters,
        rankedAllFilters,
        viewMode,
        effectiveViewMode,
        sourceItems,
        calorieBounds,
        searchTerms,
        filteredItems,
        visibleMenuItems,
        orderedSections,
        categoryOptions,
        handleViewChange,
        handleSortChange,
        toggleRankedAllFilter,
    };
}
