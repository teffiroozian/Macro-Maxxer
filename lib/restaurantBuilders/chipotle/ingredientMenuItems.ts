import type { IngredientItem, MenuItem } from "@/types/menu";
import {
  normalizeIngredientCategory,
  scaleNutritionValues,
  type ChipotleBuilderConfig,
  type ChipotleEntreeSelection,
  type ChipotleKidsMealId,
} from "@/lib/restaurantBuilders/chipotle";

export type BuildChipotleIngredientMenuItemsOptions = {
  restaurantId: string;
  ingredients: IngredientItem[];
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  selectedIncludedIngredientIds: string[];
  tacoShellIngredientIds: string[];
  getIngredientPortionMultiplier: (ingredientId?: string) => number;
  getSelectedIngredientPortionMultiplier: (ingredientId: string, category: string) => number;
  builderConfig?: ChipotleBuilderConfig;
};

export function buildChipotleIngredientMenuItems({
  restaurantId,
  ingredients,
  selectedEntree,
  selectedKidsMeal,
  selectedIncludedIngredientIds,
  tacoShellIngredientIds,
  getIngredientPortionMultiplier,
  getSelectedIngredientPortionMultiplier,
  builderConfig,
}: BuildChipotleIngredientMenuItemsOptions): MenuItem[] {
  const normalizeIngredientCategories = (ingredient: IngredientItem) => {
    const normalizedCategories =
      ingredient.categories
        ?.map((category) => category.trim())
        .filter(Boolean) ?? [];
    if (normalizedCategories.length > 0) {
      return normalizedCategories;
    }

    return ["Other"];
  };

  const resolveIngredientCategory = (ingredient: IngredientItem) => {
    const categories = normalizeIngredientCategories(ingredient);
    return (
      categories.find(
        (category) => category.toLowerCase() !== "ingredients",
      ) ?? categories[0]
    );
  };

  const kidsBuildYourOwnDoubleSideIds = new Set(
    builderConfig?.chipotle?.kidsBuildYourOwnDoubleSideIds ?? [],
  );
  const quesadillaTripleCheeseVariantId =
    builderConfig?.chipotle?.specialVariantIds?.quesadillaTripleCheese ??
    "quesadilla-triple-cheese";
  const includedIngredientOrderById = new Map(
    selectedIncludedIngredientIds.map(
      (ingredientId, index) => [ingredientId, index] as const,
    ),
  );

  const mappedIngredientItems = ingredients
    .filter((ingredient) => {
      if (ingredient.hideFromIngredientView) {
        return false;
      }

      const shouldHideFromKidsBuildYourOwn =
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own" &&
        ingredient.id === "tortilla";
      if (shouldHideFromKidsBuildYourOwn) {
        return false;
      }

      const shouldHideTortillaSideForEntree =
        ingredient.id === "tortilla" &&
        (selectedEntree === "salad" || selectedEntree === "tacos");
      if (shouldHideTortillaSideForEntree) {
        return false;
      }

      const isTacoShellIngredient = ingredient.id
        ? tacoShellIngredientIds.includes(ingredient.id)
        : false;
      const isKidsBuildYourOwnTacoShellOption =
        isTacoShellIngredient &&
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own";
      const isIncludedForCurrentBuild = ingredient.id
        ? selectedIncludedIngredientIds.includes(ingredient.id)
        : false;
      if (
        isTacoShellIngredient &&
        selectedEntree !== "tacos" &&
        !isKidsBuildYourOwnTacoShellOption &&
        !isIncludedForCurrentBuild
      ) {
        return false;
      }

      return true;
    })
    .map((ingredient, index) => {
      const ingredientId =
        ingredient.id ??
        `${restaurantId}-ingredient-${ingredient.name}-${index}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const resolvedCategory = resolveIngredientCategory(ingredient);
      const shouldPinToIncludedCategory =
        selectedIncludedIngredientIds.includes(ingredientId) ||
        (selectedEntree === "tacos" &&
          tacoShellIngredientIds.includes(ingredientId));
      const displayCategory = shouldPinToIncludedCategory
        ? "Included Ingredient"
        : resolvedCategory;
      const includedIngredientOrder =
        includedIngredientOrderById.get(ingredientId);
      const isQuesadillaCheeseIncludedIngredient =
        ingredientId === "cheese" &&
        shouldPinToIncludedCategory &&
        selectedEntree === "quesadilla";
      const hasCustomVariants = Boolean(ingredient.variants?.length);
      const kidsBuildYourOwnDoubleSideMultiplier =
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own" &&
        ingredient.id &&
        kidsBuildYourOwnDoubleSideIds.has(ingredient.id)
          ? 2
          : 1;
      const ingredientPortionMultiplier =
        getSelectedIngredientPortionMultiplier(
          ingredientId,
          normalizeIngredientCategory(resolvedCategory),
        );
      const ingredientBaseNutrition = scaleNutritionValues(
        ingredient.nutrition,
        getIngredientPortionMultiplier(ingredient.id) *
          kidsBuildYourOwnDoubleSideMultiplier *
          ingredientPortionMultiplier,
      );
      const variants = hasCustomVariants
        ? ingredient.variants?.map((variant) => ({
            ...variant,
            nutrition: scaleNutritionValues(
              variant.nutrition,
              getIngredientPortionMultiplier(ingredient.id) *
                ingredientPortionMultiplier,
            ),
          }))
        : undefined;
      const tripleCheeseVariant = isQuesadillaCheeseIncludedIngredient
        ? {
            id: quesadillaTripleCheeseVariantId,
            label: "",
            categories: ingredient.categories,
            nutrition: scaleNutritionValues(
              ingredientBaseNutrition,
              3,
            ),
          }
        : null;
      const defaultVariantId = tripleCheeseVariant
        ? quesadillaTripleCheeseVariantId
        : ingredient.defaultVariantId;

      const menuItem: MenuItem = {
        id: ingredientId,
        name: ingredient.name,
        nutrition: ingredientBaseNutrition,
        defaultOrder:
          shouldPinToIncludedCategory &&
          selectedEntree !== "tacos" &&
          typeof includedIngredientOrder === "number"
            ? includedIngredientOrder
            : (ingredient.defaultOrder ?? index),
        variants: tripleCheeseVariant
          ? [...(variants ?? []), tripleCheeseVariant]
          : variants,
        defaultVariantId,
        hideVariantSelector:
          ingredient.hideVariantSelector ||
          isQuesadillaCheeseIncludedIngredient,
        image: ingredient.image ?? "",
        categories: [displayCategory],
        servingType: "addon",
      };
      return menuItem;
    });

  if (selectedEntree !== "burrito") {
    return mappedIngredientItems;
  }

  const burritoTortillaItem = mappedIngredientItems.find(
    (item) => item.id === "tortilla",
  );
  if (!burritoTortillaItem) {
    return mappedIngredientItems;
  }

  return [
    ...mappedIngredientItems,
    {
      ...burritoTortillaItem,
      id: "extra-tortilla",
      name: "Extra Tortilla",
      categories: ["Side"],
    },
  ];
}
