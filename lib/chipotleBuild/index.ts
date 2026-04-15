import type { MenuItem, Nutrition, RestaurantBuilderConfig } from "@/types/menu";
import { normalizeNutrition } from "@/lib/nutrition";
import type {
  ChipotleEntreeSelection,
  ChipotleKidsMealId,
  ChipotleTacoShell,
  IncludedIngredientContext,
  ProteinPortionMode,
  SplitPortionMode,
} from "@/lib/chipotleBuild/types";

export { isChipotleEntreeId } from "@/lib/chipotleBuild/types";

export type {
  ChipotleBuildConfiguration,
  ChipotleEntreeId,
  ChipotleEntreeSelection,
  ChipotleKidsMealId,
  ChipotleTacoCount,
  ChipotleTacoShell,
  IncludedIngredientContext,
  ProteinPortionMode,
  SplitPortionMode,
} from "@/lib/chipotleBuild/types";

export function normalizeIngredientCategory(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function scaleNutritionValues(
  nutrition: MenuItem["nutrition"],
  multiplier: number
): Nutrition {
  if (multiplier === 1) return normalizeNutrition(nutrition);

  return normalizeNutrition({
    ...nutrition,
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier),
    carbs: Math.round(nutrition.carbs * multiplier),
    totalFat: Math.round(nutrition.totalFat * multiplier),
    satFat: nutrition.satFat === undefined ? undefined : Math.round(nutrition.satFat * multiplier),
    transFat: nutrition.transFat === undefined ? undefined : Math.round(nutrition.transFat * multiplier),
    cholesterol: nutrition.cholesterol === undefined ? undefined : Math.round(nutrition.cholesterol * multiplier),
    sodium: nutrition.sodium === undefined ? undefined : Math.round(nutrition.sodium * multiplier),
    fiber: nutrition.fiber === undefined ? undefined : Math.round(nutrition.fiber * multiplier),
    sugars: nutrition.sugars === undefined ? undefined : Math.round(nutrition.sugars * multiplier),
    extraNutrition: nutrition.extraNutrition
      ? Object.fromEntries(
          Object.entries(nutrition.extraNutrition).map(([key, value]) => [
            key,
            Math.round(value * multiplier),
          ])
        )
      : undefined,
  });
}

export function getProteinMultiplier(mode: ProteinPortionMode, selectedProteinCount: number) {
  if (selectedProteinCount <= 0) return 0;
  if (mode === "double") return selectedProteinCount === 1 ? 2 : 1;
  return selectedProteinCount === 1 ? 1 : 0.5;
}

export function getProteinBadgeLabel(mode: ProteinPortionMode, selectedProteinCount: number) {
  const multiplier = getProteinMultiplier(mode, selectedProteinCount);
  return multiplier === 0.5 ? "1/2x" : `${multiplier}x`;
}

export function formatMultiplierLabel(multiplier: number) {
  if (multiplier === 0.5) return "1/2x";
  if (Number.isInteger(multiplier)) return `${multiplier}x`;
  return `${multiplier.toFixed(1)}x`;
}

export function getNutritionMultiplier(
  baseNutrition: MenuItem["nutrition"],
  nextNutrition: MenuItem["nutrition"]
) {
  const comparableKeys: Array<keyof MenuItem["nutrition"]> = [
    "calories",
    "protein",
    "carbs",
    "totalFat",
  ];

  for (const key of comparableKeys) {
    const baseValue = baseNutrition[key];
    const nextValue = nextNutrition[key];
    if (typeof baseValue === "number" && baseValue > 0 && typeof nextValue === "number") {
      return nextValue / baseValue;
    }
  }

  return 1;
}

export function getSplitExtraMultiplier() {
  return 2;
}

export function getSplitPortionLabel(mode: SplitPortionMode) {
  const multiplier = mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier() : 1;
  return formatMultiplierLabel(multiplier);
}

export function getIngredientCategoryMaxSelections(options: {
  category: string;
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  builderConfig?: RestaurantBuilderConfig;
}) {
  const { category, selectedEntree, selectedKidsMeal, builderConfig } = options;
  if (category === "side" && selectedEntree === "kids-meal" && selectedKidsMeal === "build-your-own") {
    return 1;
  }
  return builderConfig?.categoryMaxSelections?.[category];
}

export function isQuesadillaCheeseSelection(ingredientId: string, context: IncludedIngredientContext) {
  return (
    ingredientId === "cheese" &&
    (context.selectedEntree === "quesadilla" ||
      (context.selectedEntree === "kids-meal" && context.selectedKidsMeal === "quesadilla"))
  );
}

export function resolveIncludedIngredientIds(options: {
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  selectedTacoShell?: ChipotleTacoShell;
  builderConfig?: RestaurantBuilderConfig;
}) {
  const { selectedEntree, selectedKidsMeal, selectedTacoShell = "crispy", builderConfig } = options;
  if (!builderConfig?.entreeOptions) {
    return [];
  }

  if (selectedEntree === "kids-meal") {
    return selectedKidsMeal === "quesadilla"
      ? [...(builderConfig.includedIngredientRules?.kidsQuesadillaIncludedIngredientIds ?? [])]
      : [];
  }

  if (!selectedEntree) {
    return [];
  }

  const entreeConfig = builderConfig.entreeOptions[selectedEntree];
  if (!entreeConfig) return [];

  return (
    entreeConfig.includedIngredientIdsByOption?.[selectedTacoShell] ??
    entreeConfig.includedIngredientIds ??
    []
  );
}

export function getAllKnownIncludedIngredientIds(builderConfig?: RestaurantBuilderConfig) {
  if (!builderConfig?.entreeOptions) {
    return new Set<string>();
  }

  return new Set(
    [
      ...Object.values(builderConfig.entreeOptions).flatMap((configuration) => [
        ...(configuration.includedIngredientIds ?? []),
        ...Object.values(configuration.includedIngredientIdsByOption ?? {}).flat(),
      ]),
      ...(builderConfig.includedIngredientRules?.kidsQuesadillaIncludedIngredientIds ?? []),
    ]
  );
}
