import { useCallback, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ViewOption } from "@/components/controls/types";
import type { MenuItem } from "@/types/menu";
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
    effectiveViewModeOverride,
    isViewChangeAllowed,
    items,
    ingredientMenuItems,
    searchQuery,
    router,
    pathname,
    searchParams,
}: {
    hasBuildYourOwn: boolean;
    effectiveViewModeOverride?: ViewOption;
    isViewChangeAllowed?: (nextView: ViewOption) => boolean;
    items: MenuItem[];
    ingredientMenuItems: MenuItem[];
    searchQuery: string;
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

    const effectiveViewMode: ViewOption = effectiveViewModeOverride ?? viewMode;

    const allItems = items;

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

    const visibleMenuItems = filteredItems;

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

    const handleViewChange = useCallback(
        (nextView: ViewOption) => {
            if (isViewChangeAllowed && !isViewChangeAllowed(nextView)) {
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
        },
        [
            effectiveViewMode,
            isViewChangeAllowed,
            pathname,
            router,
            searchParams,
            sort,
        ],
    );

    const handleSortChange = useCallback((nextSort: SortOption) => {
        setSort(nextSort);
    }, []);

    const handleFiltersChange = useCallback((nextFilters: Filters) => {
        setFilters(nextFilters);
    }, []);

    const toggleRankedAllFilter = useCallback((key: RankedAllFilterKey) => {
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
    }, []);

    return {
        sort,
        filters,
        handleFiltersChange,
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
