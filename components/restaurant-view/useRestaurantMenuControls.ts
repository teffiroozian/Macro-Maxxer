import { useCallback, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ViewOption } from "@/components/controls/types";
import type { MenuItem } from "@/types/menu";
import type { Filters } from "@/lib/menuSections/filterOptions";
import {
    filterMenuItems,
    getParentSelectionState,
    getRankedChildCategories,
    getSearchTerms,
    RANKED_ALL_FILTER_KEYS,
    type RankedAllFilterKey,
    type RankedParentSelectionState,
} from "@/lib/menuSections/filtering";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import {
    RANKING_DEFAULT_SORT,
    SORT_OPTION_VALUES,
    isDefaultOrderSort,
    type SortOption,
} from "@/lib/menuSections/sortOptions";
import {
    countItemsByCategory,
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

    // The narrower categories available inside each broad Rankings parent
    // bucket, derived from this restaurant's own items — never hard-coded —
    // so the nested filter tree is correct for any restaurant's data shape.
    const rankedChildOptions = useMemo(() => getRankedChildCategories(items), [items]);

    // Per-parent set of *selected* child categories. An empty set means the
    // whole parent bucket is off; a set containing every available child is
    // equivalent to "fully selected" (same effect as the old boolean `true`).
    const [rankedChildSelections, setRankedChildSelections] = useState<
        Record<RankedAllFilterKey, Set<string>>
    >(() => {
        const initialOptions = getRankedChildCategories(items);
        return {
            "main-entrees": new Set(initialOptions["main-entrees"]),
            breakfast: new Set<string>(),
            shareables: new Set<string>(),
            sides: new Set<string>(),
            drinks: new Set<string>(),
        };
    });

    const rankedParentStates = useMemo(() => {
        const result = {} as Record<RankedAllFilterKey, RankedParentSelectionState>;
        RANKED_ALL_FILTER_KEYS.forEach((key) => {
            result[key] = getParentSelectionState(rankedChildSelections[key], rankedChildOptions[key] ?? []);
        });
        return result;
    }, [rankedChildOptions, rankedChildSelections]);

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
                rankedChildSelections,
                isRankingView: effectiveViewMode === "ranking",
            }),
        [
            effectiveViewMode,
            sourceItems,
            filters,
            searchTerms,
            rankedChildSelections,
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

    const categoryOptions = useMemo(() => {
        const counts = countItemsByCategory(visibleMenuItems);

        return orderedSections.map((section) => ({
            id: section,
            label: getCategoryLabel(
                section,
                effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
            ),
            count: counts[section] ?? 0,
        }));
    }, [effectiveViewMode, orderedSections, visibleMenuItems]);

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

    // Parent-row click: acts as a convenient select-all/deselect-all for that
    // parent's children. A partially-selected parent moves to fully selected
    // first (the standard indeterminate-checkbox click convention) rather
    // than to empty. Guards against every parent ending up empty at once, so
    // Rankings never silently shows zero results from this toggle alone.
    const toggleRankedAllFilter = useCallback(
        (key: RankedAllFilterKey) => {
            setRankedChildSelections((previous) => {
                const available = rankedChildOptions[key] ?? [];
                const isFullySelected = available.length > 0 && previous[key].size === available.length;
                const nextSelectedForKey = isFullySelected ? new Set<string>() : new Set(available);

                const wouldBeActiveParentCount = RANKED_ALL_FILTER_KEYS.filter((otherKey) =>
                    otherKey === key ? nextSelectedForKey.size > 0 : previous[otherKey].size > 0
                ).length;

                if (wouldBeActiveParentCount === 0) {
                    return previous;
                }

                return { ...previous, [key]: nextSelectedForKey };
            });
        },
        [rankedChildOptions],
    );

    // Individual child toggle — same "never let every parent end up empty"
    // guard as the parent-level toggle above.
    const toggleRankedChildFilter = useCallback((key: RankedAllFilterKey, childCategory: string) => {
        setRankedChildSelections((previous) => {
            const nextSet = new Set(previous[key]);
            if (nextSet.has(childCategory)) {
                nextSet.delete(childCategory);
            } else {
                nextSet.add(childCategory);
            }

            const wouldBeActiveParentCount = RANKED_ALL_FILTER_KEYS.filter((otherKey) =>
                otherKey === key ? nextSet.size > 0 : previous[otherKey].size > 0
            ).length;

            if (wouldBeActiveParentCount === 0) {
                return previous;
            }

            return { ...previous, [key]: nextSet };
        });
    }, []);

    return {
        sort,
        filters,
        handleFiltersChange,
        rankedChildOptions,
        rankedChildSelections,
        rankedParentStates,
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
        toggleRankedChildFilter,
    };
}
