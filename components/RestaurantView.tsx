"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bean,
  Beef,
  CakeSlice,
  CircleDashed,
  CupSoda,
  Egg,
  EggFried,
  Diamond,
  Droplets,
  Drumstick,
  Ham,
  IceCreamCone,
  SquareUser,
  LeafyGreen,
  Pin,
  Salad,
  Sandwich,
  Shell,
  SquarePlus,
  Sprout,
  Soup,
  Torus,
  Tractor,
  Triangle,
  ToggleLeft,
  Cylinder,
  Utensils,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { useRestaurantSearch } from "@/components/RestaurantSearchContext";
import type {
  IngredientItem,
  MenuItem,
  ResolvedAddonGroups,
  RestaurantCustomizationRules,
} from "@/types/menu";
import type { RestaurantBuilderConfig } from "@/types/builder";
import { categorySectionId } from "@/lib/menuSections/sorting";
import MenuSections from "./MenuSections";
import StickyRestaurantBar from "./StickyRestaurantBar";
import { useRestaurantMenuControls } from "@/hooks/useRestaurantMenuControls";
import RestaurantCategorySidebar from "./restaurant-view/RestaurantCategorySidebar";
import ChipotleRestaurantBuilderView from "./restaurant-view/ChipotleRestaurantBuilderView";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sandwiches: Sandwich,
  "sandwich toppings": LeafyGreen,
  toppings: LeafyGreen,
  chicken: Drumstick,
  proteins: Drumstick,
  rice: Sprout,
  beans: Bean,
  "included ingredient": Pin,
  "included ingredients": Pin,
  "breakfast protein": Drumstick,
  condiments: Utensils,
  "salad condiments": Utensils,
  salads: Salad,
  "salad toppings": Salad,
  drinks: CupSoda,
  "fountain drinks": CupSoda,
  "tractor beverages": Tractor,
  "kids drinks": SquareUser,
  breakfast: EggFried,
  "breakfast side": Torus,
  "breakfast sides": Torus,
  kids: SquareUser,
  sides: SquarePlus,
  side: CircleDashed,
  desserts: CakeSlice,
  wraps: Shell,
  "wrap toppings": Waves,
  burgers: Beef,
  entrees: Utensils,
  "bowls & plates": Soup,
  buns: CircleDashed,
  "breakfast buns": CircleDashed,
  cheeses: Diamond,
  eggs: Egg,
  "soup toppings": Soup,
  "parfait toppings": IceCreamCone,
  "treat toppings": IceCreamCone,
  dressings: Droplets,
  "dipping sauces": ToggleLeft,
  "chips & dips": Triangle,
  "single sides": Cylinder,
  "protein meals": UtensilsCrossed,
  "protein cups": Ham,
  treats: IceCreamCone,
};

const SECTION_HEADER_TOP_GAP = 24;

const getStickyOffset = () => {
  const stickyBar = document.querySelector('[data-sticky-nav="true"]');
  const mobileCategoryNav = document.querySelector(
    '[data-mobile-category-nav="true"]',
  );
  const stickyBottom =
    stickyBar instanceof HTMLElement
      ? Math.max(0, stickyBar.getBoundingClientRect().bottom)
      : 0;
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
  const { searchOpen, searchQuery, setSearchQuery, openSearch, closeSearch } =
    useRestaurantSearch();
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
    rankedAllFilters,
    effectiveViewMode,
    calorieBounds,
    visibleMenuItems,
    orderedSections,
    categoryOptions,
    handleViewChange,
    handleSortChange,
    toggleRankedAllFilter,
  } = useRestaurantMenuControls({
    hasBuildYourOwn,
    isChipotleBuildPage: false,
    selectedEntree: null,
    items,
    ingredientMenuItems,
    searchQuery,
    chipotleBuilderConfig: undefined,
    router,
    pathname,
    searchParams,
  });
  const [activeCategory, setActiveCategory] = useState<string>(
    () => orderedSections[0] ?? "",
  );

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
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSearch={openSearch}
        onCloseSearch={closeSearch}
        calorieBounds={calorieBounds}
        hideViewSelector={hasBuildYourOwn}
      />

      <div className="grid items-start gap-4 lg:gap-6 lg:[grid-template-columns:240px_minmax(0,1fr)]">
        <RestaurantCategorySidebar
          effectiveViewMode={effectiveViewMode}
          rankedAllFilters={rankedAllFilters}
          toggleRankedAllFilter={toggleRankedAllFilter}
          categoryOptions={categoryOptions}
          resolvedActiveCategory={resolvedActiveCategory}
          onCategorySelect={handleCategorySelect}
          categoryIcons={CATEGORY_ICONS}
        />

        <div className="min-w-0">
          <div className="mx-auto w-full max-w-[900px]">
            <MenuSections
              restaurantId={restaurantId}
              items={visibleMenuItems}
              sort={sort}
              addons={addons}
              ingredients={ingredients}
              customizationRules={customizationRules}
              groupByCategory={effectiveViewMode !== "ranking"}
              categoryMode={
                effectiveViewMode === "ranking" ? "menu" : effectiveViewMode
              }
              hasBuildYourOwn={hasBuildYourOwn}
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
