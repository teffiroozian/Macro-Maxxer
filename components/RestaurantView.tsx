"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_ICONS } from "@/data/menuCategoryIcons";
import type {
  IngredientItem,
  MenuItem,
  ResolvedAddonGroups,
  RestaurantCustomizationRules,
} from "@/types/menu";
import type { RestaurantBuilderConfig } from "@/types/builder";
import { categorySectionId } from "@/lib/menuSections/sorting";
import { INGREDIENT_PROTEIN_OPTIONS } from "@/lib/menuSections/filterOptions";
import MenuSections from "./MenuSections";
import StickyRestaurantBar from "./StickyRestaurantBar";
import { useRestaurantMenuControls } from "./restaurant-view/useRestaurantMenuControls";
import RestaurantCategorySidebar from "./restaurant-view/RestaurantCategorySidebar";
import ChipotleRestaurantBuilderView from "./restaurant-view/chipotle/ChipotleRestaurantBuilderView";

const SECTION_HEADER_TOP_GAP = 24;

const getStickyOffset = () => {
  // Desktop and mobile now render as two separate `data-sticky-nav`
  // elements (DesktopNav's wrapper + GlobalMobileNav's own root), only one
  // of which is actually visible at a given viewport width — the other is
  // `display:none` and its rect collapses to all zeros, so Math.max across
  // every match always picks the real, visible one.
  const stickyBars = document.querySelectorAll('[data-sticky-nav="true"]');
  const mobileCategoryNav = document.querySelector(
    '[data-mobile-category-nav="true"]',
  );
  const stickyBottom = Array.from(stickyBars).reduce(
    (max, bar) => (bar instanceof HTMLElement ? Math.max(max, bar.getBoundingClientRect().bottom) : max),
    0,
  );
  const mobileCategoryBottom =
    mobileCategoryNav instanceof HTMLElement
      ? Math.max(0, mobileCategoryNav.getBoundingClientRect().bottom)
      : 0;

  return Math.max(stickyBottom, mobileCategoryBottom);
};

function StandardRestaurantView({
  restaurantId,
  restaurantName,
  restaurantLogo,
  hasBuildYourOwn = false,
  items,
  ingredients = [],
  addons,
  customizationRules,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: ResolvedAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ingredientMenuItems = useMemo<MenuItem[]>(
    () =>
      ingredients
        .filter((ingredient) => !ingredient.hideFromIngredientView)
        .map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          image: ingredient.image ?? restaurantLogo,
          categories: ingredient.categories,
          servingType: "addon",
          nutrition: ingredient.nutrition,
          variants: ingredient.variants,
          defaultVariantId: ingredient.defaultVariantId,
          defaultOrder: ingredient.defaultOrder,
          hideVariantSelector: ingredient.hideVariantSelector,
          ingredientRef: ingredient.id,
        })),
    [ingredients, restaurantLogo],
  );
  const {
    sort,
    filters,
    handleFiltersChange,
    rankedChildOptions,
    rankedChildSelections,
    rankedParentStates,
    effectiveViewMode,
    calorieBounds,
    sourceItems,
    visibleMenuItems,
    orderedSections,
    categoryOptions,
    handleViewChange,
    handleSortChange,
    toggleRankedAllFilter,
    toggleRankedChildFilter,
  } = useRestaurantMenuControls({
    hasBuildYourOwn,
    items,
    ingredientMenuItems,
    searchQuery: "",
    router,
    pathname,
    searchParams,
  });
  const [activeCategory, setActiveCategory] = useState<string>(
    () => orderedSections[0] ?? "",
  );

  // Lets the mobile active-filter row's "Edit filters" icon (rendered in
  // RestaurantCategorySidebar, a sibling of StickyRestaurantBar) open the
  // same controls drawer StickyRestaurantBar's own hamburger button uses —
  // captured here once StickyRestaurantBar surfaces it, then handed down.
  const [openMobileFiltersDrawer, setOpenMobileFiltersDrawer] = useState<() => void>(
    () => () => {},
  );
  const handleEditFiltersDrawerReady = useCallback((openDrawer: () => void) => {
    setOpenMobileFiltersDrawer(() => openDrawer);
  }, []);

  const resolvedActiveCategory = orderedSections.includes(activeCategory)
    ? activeCategory
    : (orderedSections[0] ?? "");

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    const section = document.getElementById(categorySectionId(categoryId));
    if (!section) return;

    const stickyOffset = getStickyOffset();
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    const nextScrollTop = Math.max(
      0,
      sectionTop - stickyOffset - SECTION_HEADER_TOP_GAP,
    );

    window.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  };

  useEffect(() => {
    if (effectiveViewMode === "ranking" || orderedSections.length === 0) {
      return;
    }

    const sectionElements = orderedSections
      .map((sectionId) => ({
        id: sectionId,
        element: document.getElementById(categorySectionId(sectionId)),
      }))
      .filter((section): section is { id: string; element: HTMLElement } =>
        Boolean(section.element),
      );

    if (sectionElements.length === 0) {
      return;
    }

    const updateActiveCategoryOnScroll = () => {
      const activationOffset = getStickyOffset() + SECTION_HEADER_TOP_GAP + 1;
      const reachedSections = sectionElements.filter(
        (section) =>
          section.element.getBoundingClientRect().top <= activationOffset,
      );

      const nextActive =
        reachedSections[reachedSections.length - 1]?.id ??
        sectionElements[0]?.id;

      if (nextActive && nextActive !== activeCategory) {
        setActiveCategory(nextActive);
      }
    };

    updateActiveCategoryOnScroll();
    window.addEventListener("scroll", updateActiveCategoryOnScroll, {
      passive: true,
    });
    window.addEventListener("resize", updateActiveCategoryOnScroll);

    return () => {
      window.removeEventListener("scroll", updateActiveCategoryOnScroll);
      window.removeEventListener("resize", updateActiveCategoryOnScroll);
    };
  }, [activeCategory, effectiveViewMode, orderedSections]);

  return (
    <div>
      <StickyRestaurantBar
        restaurantName={restaurantName}
        restaurantLogo={restaurantLogo}
        view={effectiveViewMode}
        onChange={handleViewChange}
        sort={sort}
        onSortChange={handleSortChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        calorieBounds={calorieBounds}
        sourceItems={sourceItems}
        rankedChildSelections={rankedChildSelections}
        isRankingView={effectiveViewMode === "ranking"}
        // Determined by what's actually being filtered (individual
        // ingredients vs. complete menu items), not by whether this
        // restaurant happens to be Build Your Own.
        proteinOptions={
          effectiveViewMode === "ingredients" ? INGREDIENT_PROTEIN_OPTIONS : undefined
        }
        hideViewSelector={hasBuildYourOwn}
        onEditFiltersDrawerReady={handleEditFiltersDrawerReady}
      />

      <div className="grid items-start gap-4 lg:gap-6 lg:[grid-template-columns:240px_minmax(0,1fr)]">
        <RestaurantCategorySidebar
          effectiveViewMode={effectiveViewMode}
          rankedChildOptions={rankedChildOptions}
          rankedChildSelections={rankedChildSelections}
          rankedParentStates={rankedParentStates}
          toggleRankedAllFilter={toggleRankedAllFilter}
          toggleRankedChildFilter={toggleRankedChildFilter}
          categoryOptions={categoryOptions}
          resolvedActiveCategory={resolvedActiveCategory}
          onCategorySelect={handleCategorySelect}
          categoryIcons={CATEGORY_ICONS}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onEditFilters={openMobileFiltersDrawer}
        />

        <div className="min-w-0">
          <div className="mx-auto w-full max-w-[900px]">
            <MenuSections
              restaurantId={restaurantId}
              items={visibleMenuItems}
              // The full, unfiltered catalog (including structural/
              // sourceOnly records) — needed so a combo item's own
              // side/drink pickers and ingredient lookups can still resolve
              // an internal relationship id even when that record isn't
              // itself something a user browses as a standalone card. Falls
              // back to `items` in MenuSections when omitted.
              allMenuItems={items}
              sort={sort}
              addons={addons}
              ingredients={ingredients}
              customizationRules={customizationRules}
              groupByCategory={effectiveViewMode !== "ranking"}
              categoryMode={
                effectiveViewMode === "ranking" ? "menu" : effectiveViewMode
              }
              hasBuildYourOwn={hasBuildYourOwn}
              showRankBadges={effectiveViewMode === "ranking"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantView(props: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: ResolvedAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
}) {
  const isChipotleBuildPage =
    props.hasBuildYourOwn === true && props.restaurantId === "chipotle";

  if (isChipotleBuildPage) {
    return <ChipotleRestaurantBuilderView {...props} />;
  }

  return <StandardRestaurantView {...props} />;
}
