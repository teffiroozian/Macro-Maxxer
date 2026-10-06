"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  IngredientItem,
  MenuItem,
  ResolvedAddonGroups,
  RestaurantCustomizationRules,
} from "@/types/menu";
import type { RestaurantBuilderConfig } from "@/types/builder";
import { INGREDIENT_PROTEIN_OPTIONS } from "@/lib/menuSections/filterOptions";
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import { trackRestaurantView } from "@/lib/analytics";
import MenuSections from "./MenuSections";
import StickyRestaurantBar from "./StickyRestaurantBar";
import { useRestaurantMenuControls } from "./restaurant-view/useRestaurantMenuControls";
import ChipotleRestaurantBuilderView from "./restaurant-view/chipotle/ChipotleRestaurantBuilderView";

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
        .flatMap((ingredient) => {
          const nutrition = resolveEffectiveIngredientNutrition(ingredient);
          if (!nutrition) return [];
          return [{
            id: ingredient.id,
            name: ingredient.ingredientViewName ?? ingredient.name,
            image: ingredient.ingredientViewImage ?? ingredient.image ?? restaurantLogo,
            categories: ingredient.ingredientViewCategories ?? ingredient.categories,
            servingType: "addon" as const,
            nutrition,
            variants: ingredient.variants,
            defaultVariantId: ingredient.defaultVariantId,
            defaultOrder: ingredient.defaultOrder,
            hideVariantSelector: ingredient.hideVariantSelector,
            ingredientRef: ingredient.id,
          }];
        }),
    [ingredients, restaurantLogo],
  );
  const {
    sort,
    filters,
    handleFiltersChange,
    rankedChildSelections,
    effectiveViewMode,
    calorieBounds,
    sourceItems,
    visibleMenuItems,
    handleViewChange,
    handleSortChange,
  } = useRestaurantMenuControls({
    restaurantId,
    hasBuildYourOwn,
    items,
    ingredientMenuItems,
    searchQuery: "",
    router,
    pathname,
    searchParams,
    // The retired category sidebar owned a second ranking-category state.
    // Standard pages now use Filters.categories as their only category
    // source of truth; builder flows retain the legacy tree where needed.
    filterRankingCategories: false,
  });
  const [resultLayout, setResultLayout] = useState<"list" | "grid">("list");

  return (
    <div className="grid gap-y-[var(--restaurant-controls-gap)] pt-[var(--restaurant-controls-gap)]">
      <StickyRestaurantBar
        restaurantId={restaurantId}
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
        visibleItemCount={visibleMenuItems.length}
        rankedChildSelections={rankedChildSelections}
        isRankingView={effectiveViewMode === "ranking"}
        // Determined by what's actually being filtered (individual
        // ingredients vs. complete menu items), not by whether this
        // restaurant happens to be Build Your Own.
        proteinOptions={
          effectiveViewMode === "ingredients" ? INGREDIENT_PROTEIN_OPTIONS : undefined
        }
        hideViewSelector={hasBuildYourOwn}
        hideIngredientsView={restaurantId === "starbucks"}
        resultLayout={resultLayout}
        onResultLayoutChange={setResultLayout}
        hideMobileControls
        filterRankingCategories={false}
        showMobileRail
      />

      <div className="col-start-1 row-start-2 min-w-0 [&>div>div]:mt-0">
          <div className={`mx-auto w-full ${effectiveViewMode === "ranking" ? "" : "max-w-[900px]"}`}>
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
              resultLayout={resultLayout}
            />
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
  const { restaurantId, restaurantName } = props;

  useEffect(() => {
    trackRestaurantView({ restaurantId, restaurantName });
  }, [restaurantId, restaurantName]);

  const isChipotleBuildPage =
    props.hasBuildYourOwn === true && props.restaurantId === "chipotle";

  if (isChipotleBuildPage) {
    return <ChipotleRestaurantBuilderView {...props} />;
  }

  return <StandardRestaurantView {...props} />;
}
