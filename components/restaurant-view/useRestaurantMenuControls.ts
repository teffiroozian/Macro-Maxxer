import type { MenuSizeSelectorCapability } from "@/types/restaurant";
import { getMenuSizeOptions, ALL_MENU_SIZES } from "@/lib/menuSections/menuSizeSelector";
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
import { getNutritionControlData, reconcileNutritionThresholds } from "@/lib/menuSections/nutritionPresets";
import { getOfficialRankingItems } from "@/lib/menuSections/ranking";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import {
    RANKING_DEFAULT_SORT,
    isDefaultOrderSort,
    type SortOption,
} from "@/lib/menuSections/sortOptions";
import {
    countItemsByCategory,
    applyRestaurantMenuSectionOrder,
    getCategoryLabel,
    getItemCategories,
    getOrderedMenuSections,
} from "@/lib/menuSections/sorting";
import { RESTAURANT_MAIN_MENU_CATEGORIES } from "@/data/restaurantControlPresets";

export function useRestaurantMenuControls({
    restaurantId,
    hasBuildYourOwn,
    effectiveViewModeOverride,
    isViewChangeAllowed,
    items,
    ingredientMenuItems,
    searchQuery,
    router,
    pathname,
    searchParams,
    menuSizeSelector,
    filterRankingCategories = true,
}: {
    restaurantId: string;
    menuSizeSelector?: MenuSizeSelectorCapability;
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
    filterRankingCategories?: boolean;
}) {
    const requestedView = searchParams.get("view");
    const supportsIngredientsView = restaurantId !== "starbucks";
    // Standard restaurant pages are ranking-first. Builder restaurants keep
    // their ingredient-first entry point, while explicit ?view=menu and
    // ?view=ingredients URLs remain supported for existing deep links.
    const defaultView: ViewOption = hasBuildYourOwn && supportsIngredientsView ? "ingredients" : "ranking";
    const viewMode: ViewOption =
        requestedView === "ingredients" && supportsIngredientsView
            ? "ingredients"
            : requestedView === "ranking"
              ? "ranking"
              : defaultView;
    const [sort, setSort] = useState<SortOption>(RANKING_DEFAULT_SORT);
    // Structural/internal source records (see MenuItem.sourceOnly) are valid
    // lookup targets for combo/ingredient relationships elsewhere, but never
    // a standalone item a user browses, filters, or ranks on their own — so
    // every browsable list this hook builds starts from this filtered set,
    // not the raw `items` prop.
    const standaloneItems = useMemo(() => items.filter(isStandaloneMenuItem), [items]);
    const menuSizeOptions = useMemo(() => getMenuSizeOptions(standaloneItems, menuSizeSelector), [standaloneItems, menuSizeSelector]);
    const [menuSizePreference, setMenuSizePreference] = useState(() => menuSizeSelector?.enabled && menuSizeOptions.some((option) => option.value === menuSizeSelector.defaultValue) ? menuSizeSelector.defaultValue : ALL_MENU_SIZES);


    const [filters, setFilters] = useState<Filters>(() => {
        const available = new Set(standaloneItems.flatMap((item) => getItemCategories(item)));
        const mainMenu = (RESTAURANT_MAIN_MENU_CATEGORIES[restaurantId] ?? []).filter((category) => available.has(category));
        return mainMenu.length
            ? { categories: mainMenu, categoryPreset: "main" }
            : {};
    });

    // The narrower categories available inside each broad Rankings parent
    // bucket, derived from this restaurant's own items — never hard-coded —
    // so the nested filter tree is correct for any restaurant's data shape.
    const rankedChildOptions = useMemo(() => getRankedChildCategories(standaloneItems), [standaloneItems]);

    // Per-parent set of *selected* child categories. An empty set means the
    // whole parent bucket is off; a set containing every available child is
    // equivalent to "fully selected" (same effect as the old boolean `true`).
    const [rankedChildSelections, setRankedChildSelections] = useState<
        Record<RankedAllFilterKey, Set<string>>
    >(() => {
        const initialOptions = getRankedChildCategories(standaloneItems);
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

    const allItems = standaloneItems;

    const sourceItems = useMemo(
        () => effectiveViewMode === "ingredients"
            ? ingredientMenuItems
            : effectiveViewMode === "ranking"
              ? getOfficialRankingItems(allItems)
              : allItems,
        [effectiveViewMode, ingredientMenuItems, allItems],
    );

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
                filterRankingCategories,
                rankingSort: sort,
                menuSizePreference: menuSizeOptions.length ? menuSizePreference : undefined,
            }),
        [
            effectiveViewMode,
            sourceItems,
            filters,
            searchTerms,
            rankedChildSelections,
            filterRankingCategories,
            sort,
            menuSizePreference,
            menuSizeOptions.length,
        ],
    );

    const visibleMenuItems = filteredItems;

    const orderedSections = useMemo(
        () =>
            applyRestaurantMenuSectionOrder(
                getOrderedMenuSections(
                    visibleMenuItems,
                    effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
                ),
                restaurantId,
                effectiveViewMode === "ranking" ? "menu" : effectiveViewMode,
            ),
        [effectiveViewMode, restaurantId, visibleMenuItems],
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
            if (nextView === "ingredients" && !supportsIngredientsView) {
                return;
            }

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
            supportsIngredientsView,
        ],
    );

    const reconcileForContext = useCallback((nextFilters: Filters, nextSize = menuSizePreference, nextSort = sort) =>
        reconcileNutritionThresholds(nextFilters, getNutritionControlData({ items: sourceItems, filters: nextFilters, searchTerms: [], rankedChildSelections, isRankingView: effectiveViewMode === "ranking", filterRankingCategories, rankingSort: nextSort, menuSizePreference: nextSize })),
        [sourceItems, rankedChildSelections, effectiveViewMode, filterRankingCategories, sort, menuSizePreference],
    );
    const handleSortChange = useCallback((nextSort: SortOption) => {
        setSort(nextSort);
        setFilters((previous) => reconcileForContext(previous, menuSizePreference, nextSort));
    }, [reconcileForContext, menuSizePreference]);

    const handleFiltersChange = useCallback((nextFilters: Filters) => {
        setFilters(reconcileForContext(nextFilters));
    }, [reconcileForContext]);
    const handleMenuSizeChange = useCallback((nextSize: string) => {
        setMenuSizePreference(nextSize);
        setFilters((previous) => reconcileForContext(previous, nextSize));
    }, [reconcileForContext]);
    const menuSizeControl = menuSizeOptions.length ? { value: menuSizePreference, options: menuSizeOptions, onChange: handleMenuSizeChange } : undefined;

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
        menuSizeControl,
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
