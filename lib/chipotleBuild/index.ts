import type { MenuItem, RestaurantBuilderConfig } from "@/types/menu";

export type ProteinPortionMode = "normal" | "double";
export type SplitPortionMode = "light" | "normal" | "extra";
export type IncludedIngredientContext = {
  selectedEntree: string | null;
  selectedKidsMeal: string;
};

export function normalizeIngredientCategory(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function scaleNutritionValues(
  nutrition: MenuItem["nutrition"],
  multiplier: number
) {
  if (multiplier === 1) return nutrition;

  return Object.fromEntries(
    Object.entries(nutrition).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.round(value * multiplier) : value,
    ])
  );
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

export function getSplitExtraMultiplier(item: MenuItem) {
  const extraVariant = item.variants?.find((variant) => {
    const label = variant.label?.trim().toLowerCase() ?? "";
    const id = variant.id?.trim().toLowerCase() ?? "";
    return label === "extra" || id === "extra";
  });

  if (!extraVariant) return 1.5;
  return getNutritionMultiplier(item.nutrition, extraVariant.nutrition);
}

export function getSplitPortionLabel(item: MenuItem, mode: SplitPortionMode) {
  const multiplier = mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier(item) : 1;
  return formatMultiplierLabel(multiplier);
}

export function getIngredientCategoryMaxSelections(options: {
  category: string;
  selectedEntree: string | null;
  selectedKidsMeal: string;
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
  selectedEntree: string | null;
  selectedKidsMeal: string;
  selectedTacoShell: string;
  builderConfig?: RestaurantBuilderConfig;
}) {
  const { selectedEntree, selectedKidsMeal, selectedTacoShell, builderConfig } = options;
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
