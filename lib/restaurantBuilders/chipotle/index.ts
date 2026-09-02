import type { MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { normalizeNutrition } from "@/lib/nutrition";
import type {
  ChipotleEntreeSelection,
  ChipotleKidsMealId,
  ChipotleTacoCount,
  ChipotleTacoShell,
  IncludedIngredientContext,
  ProteinPortionMode,
  SplitPortionMode,
  ChipotleBuilderConfig,
} from "@/lib/restaurantBuilders/chipotle/types";

export { isChipotleEntreeId } from "@/lib/restaurantBuilders/chipotle/types";

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
  ChipotleBuilderConfig,
} from "@/lib/restaurantBuilders/chipotle/types";

export function normalizeIngredientCategory(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function scaleNutritionValues(
  nutrition: MenuItem["nutrition"],
  multiplier: number
): Nutrition {
  if (multiplier === 1) return normalizeNutrition(nutrition);

  const scale = (value: number) =>
    Math.round(value * multiplier * 1000) / 1000;

  return normalizeNutrition({
    ...nutrition,
    calories: scale(nutrition.calories),
    protein: scale(nutrition.protein),
    carbs: scale(nutrition.carbs),
    totalFat: scale(nutrition.totalFat),
    satFat: nutrition.satFat === undefined ? undefined : scale(nutrition.satFat),
    transFat: nutrition.transFat === undefined ? undefined : scale(nutrition.transFat),
    cholesterol: nutrition.cholesterol === undefined ? undefined : scale(nutrition.cholesterol),
    sodium: nutrition.sodium === undefined ? undefined : scale(nutrition.sodium),
    fiber: nutrition.fiber === undefined ? undefined : scale(nutrition.fiber),
    sugars: nutrition.sugars === undefined ? undefined : scale(nutrition.sugars),
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

// The human-facing portion name for a protein's selected mode — the same
// wording used by the portion picker in the customize experience (Normal /
// Double), independent of the multiplier that mode resolves to for a given
// number of selected proteins.
export function getProteinPortionModeLabel(mode: ProteinPortionMode) {
  return mode === "double" ? "Double" : "Normal";
}

export function formatMultiplierLabel(multiplier: number) {
  if (multiplier === 0.5) return "1/2x";
  if (Number.isInteger(multiplier)) return `${multiplier}x`;
  return `${multiplier.toFixed(1)}x`;
}

export function getportionMultiplier(
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

// The human-facing portion name for a rice/beans mode — the same wording
// used by the portion picker in the customize experience (Light / Normal /
// Extra), rather than the numeric multiplier badge.
export function getSplitPortionModeLabel(mode: SplitPortionMode) {
  if (mode === "light") return "Light";
  if (mode === "extra") return "Extra";
  return "Normal";
}

export type ChipotlePortionModeOption = { id: string; label: string };

const PROTEIN_PORTION_MODE_OPTIONS: ChipotlePortionModeOption[] = [
  { id: "normal", label: "Normal" },
  { id: "double", label: "Double" },
];
const SPLIT_PORTION_MODE_OPTIONS: ChipotlePortionModeOption[] = [
  { id: "light", label: "Light" },
  { id: "normal", label: "Normal" },
  { id: "extra", label: "Extra" },
];

// The available portion options for a given (normalized) ingredient
// category — undefined for categories with no portion-mode concept (sides),
// which is how callers know not to show a picker at all.
export function getChipotlePortionModeOptions(
  category: string,
): ChipotlePortionModeOption[] | undefined {
  if (category === "proteins") return PROTEIN_PORTION_MODE_OPTIONS;
  if (category === "rice" || category === "beans" || category === "toppings") return SPLIT_PORTION_MODE_OPTIONS;
  return undefined;
}

export function getIngredientCategoryMaxSelections(options: {
  category: string;
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  builderConfig?: ChipotleBuilderConfig;
}) {
  const { category, selectedEntree, selectedKidsMeal, builderConfig } = options;
  if (category === "side" && selectedEntree === "kids-meal" && selectedKidsMeal === "build-your-own") {
    return 1;
  }
  return builderConfig?.categoryMaxSelections?.[category];
}

export function isQuesadillaCheeseSelection(ingredientId: string, context: IncludedIngredientContext) {
  return (
    (ingredientId === "cheese" || ingredientId === "chipotle-cmg-5252") &&
    (context.selectedEntree === "quesadilla" ||
      (context.selectedEntree === "kids-meal" && context.selectedKidsMeal === "quesadilla"))
  );
}

export function isAdultQuesadillaTripleCheeseSelection(
  ingredientId: string,
  context: IncludedIngredientContext,
) {
  return (
    (ingredientId === "cheese" || ingredientId === "chipotle-cmg-5252") &&
    context.selectedEntree === "quesadilla"
  );
}

export function resolveLockedIncludedIngredientIds(options: {
  selectedIncludedIngredientIds: string[];
  includedRemovableIngredientIds?: string[];
  tacoShellIngredientIds?: string[];
  context: IncludedIngredientContext;
}) {
  const {
    selectedIncludedIngredientIds,
    includedRemovableIngredientIds = [],
    tacoShellIngredientIds = [],
    context,
  } = options;
  const unlockedIncludedIds = new Set(includedRemovableIngredientIds);
  const isTacoShellSelectableEntree =
    context.selectedEntree === "tacos" ||
    (context.selectedEntree === "kids-meal" &&
      context.selectedKidsMeal === "build-your-own");

  if (isTacoShellSelectableEntree) {
    tacoShellIngredientIds.forEach((ingredientId) =>
      unlockedIncludedIds.add(ingredientId),
    );
  }

  return new Set(
    selectedIncludedIngredientIds.filter(
      (ingredientId) => !unlockedIncludedIds.has(ingredientId),
    ),
  );
}

export function resolveIncludedIngredientIds(options: {
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  selectedTacoShell?: ChipotleTacoShell;
  selectedTacoCount?: ChipotleTacoCount;
  builderConfig?: ChipotleBuilderConfig;
}) {
  const {
    selectedEntree,
    selectedKidsMeal,
    selectedTacoShell = "crispy",
    selectedTacoCount = 3,
    builderConfig,
  } = options;
  if (!builderConfig?.entreeOptions) {
    return [];
  }

  if (selectedEntree === "kids-meal") {
    if (selectedKidsMeal === "quesadilla") {
      return [...(builderConfig.chipotle?.kidsQuesadillaIncludedIngredientIds ?? [])];
    }

    // Kid's Build Your Own has its own crispy/soft two-tortilla source
    // records, presented through the same Included Ingredients choice UI as
    // adult Tacos but resolved from a separate context mapping.
    return [
      ...(builderConfig.chipotle?.kidsBuildYourOwnTortillaIdsByOption?.[
        selectedTacoShell
      ] ??
        builderConfig.entreeOptions.tacos?.includedIngredientIdsByOption?.[
          selectedTacoShell
        ] ??
        []),
    ];
  }

  if (!selectedEntree) {
    return [];
  }

  const entreeConfig = builderConfig.entreeOptions[selectedEntree];
  if (!entreeConfig) return [];

  if (selectedEntree === "tacos") {
    const contextualShellIds =
      builderConfig.chipotle?.tacoShellIngredientIdsByCount?.[
        selectedTacoCount
      ]?.[selectedTacoShell];
    if (contextualShellIds) return [...contextualShellIds];
  }

  return (
    entreeConfig.includedIngredientIdsByOption?.[selectedTacoShell] ??
    entreeConfig.includedIngredientIds ??
    []
  );
}

// Which shell (crispy/soft) a clicked taco-shell ingredient id represents.
// Can't be sniffed from the id string itself: adult ids are descriptive
// (chipotle-tortilla-soft-flour-taco) but Kid's Build Your Own uses plain
// CMG numeric ids (chipotle-cmg-5403/5404) that don't contain "crispy" or
// "soft" at all — a substring check on those always resolves to the same
// shell no matter which card was actually clicked. This looks the id up
// against the known soft-shell id sets instead.
export function resolveChipotleTacoShellForIngredientId(
  ingredientId: string,
  builderConfig?: ChipotleBuilderConfig,
): ChipotleTacoShell {
  const kidsSoftTortillaIds =
    builderConfig?.chipotle?.kidsBuildYourOwnTortillaIdsByOption?.soft ?? [];
  const adultSoftTortillaIds = Object.values(
    builderConfig?.chipotle?.tacoShellIngredientIdsByCount ?? {},
  ).flatMap((idsByShell) => idsByShell?.soft ?? []);
  return kidsSoftTortillaIds.includes(ingredientId) ||
    adultSoftTortillaIds.includes(ingredientId)
    ? "soft"
    : "crispy";
}

export function getAllKnownIncludedIngredientIds(builderConfig?: ChipotleBuilderConfig) {
  if (!builderConfig?.entreeOptions) {
    return new Set<string>();
  }

  return new Set([
    ...Object.values(builderConfig.entreeOptions).flatMap((configuration) => [
      ...(configuration.includedIngredientIds ?? []),
      ...Object.values(configuration.includedIngredientIdsByOption ?? {}).flat(),
    ]),
    ...(builderConfig.chipotle?.kidsQuesadillaIncludedIngredientIds ?? []),
  ]);
}
