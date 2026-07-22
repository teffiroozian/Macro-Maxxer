import type { CartBuildConfiguration, CartItem, CartSelection } from "@/types/cart";
import type { Nutrition } from "@/types/nutrition";
import type { IngredientItem, MenuItem } from "@/types/menu";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import { buildHighProteinBuildConfiguration, isChipotleHighProteinMenuItem } from "@/lib/restaurantBuilders/chipotle/highProtein";
import type { ChipotleBuildConfiguration, ChipotleKidsMealId, ChipotleTacoCount, ChipotleTacoShell, ProteinPortionMode, SplitPortionMode } from "@/lib/restaurantBuilders/chipotle";

export function toUniversalChipotleBuildConfiguration(configuration: ChipotleBuildConfiguration): CartBuildConfiguration {
  return {
    baseItemId: configuration.selectedEntree ?? undefined,
    ingredients: Object.entries(configuration.selectedIngredientItems).map(([id, selection]) => ({
      id,
      quantity: selection.quantity,
      portion: configuration.splitPortionModeById[id],
      variantId: configuration.selectedIngredientVariantIds[id],
    })),
    options: {
      proteinPortionMode: configuration.proteinPortionMode,
      selectedTacoShell: configuration.selectedTacoShell,
      selectedTacoCount: configuration.selectedTacoCount,
      selectedKidsMeal: configuration.selectedKidsMeal,
    },
  };
}

export function fromUniversalChipotleBuildConfiguration(configuration: CartBuildConfiguration): ChipotleBuildConfiguration {
  const options = configuration.options ?? {};
  return {
    selectedEntree: (configuration.baseItemId ?? null) as ChipotleBuildConfiguration["selectedEntree"],
    selectedIngredientItems: Object.fromEntries(
      configuration.ingredients.map((ingredient) => [ingredient.id, { quantity: ingredient.quantity }])
    ),
    selectedIngredientVariantIds: Object.fromEntries(
      configuration.ingredients
        .filter((ingredient) => Boolean(ingredient.variantId))
        .map((ingredient) => [ingredient.id, ingredient.variantId as string])
    ),
    proteinPortionMode: (options.proteinPortionMode as ProteinPortionMode | undefined) ?? "normal",
    splitPortionModeById: Object.fromEntries(
      configuration.ingredients
        .filter((ingredient) => Boolean(ingredient.portion))
        .map((ingredient) => [ingredient.id, ingredient.portion as SplitPortionMode])
    ),
    selectedTacoShell: (options.selectedTacoShell as ChipotleTacoShell | undefined) ?? "crispy",
    selectedTacoCount: (options.selectedTacoCount as ChipotleTacoCount | undefined) ?? 3,
    selectedKidsMeal: (options.selectedKidsMeal as ChipotleKidsMealId | undefined) ?? "build-your-own",
  };
}


export type SelectedChipotleIngredientItems = Record<string, { item: MenuItem; quantity: number }>;

export type ChipotleCartSubmissionState = {
  isPrebuiltBuilderItem: boolean;
  buildConfiguration: ChipotleBuildConfiguration;
  selectedIngredientItems: SelectedChipotleIngredientItems;
  selectedIngredientVariantIds: Record<string, string>;
  proteinPortionMode: ChipotleBuildConfiguration["proteinPortionMode"];
  splitPortionModeById: ChipotleBuildConfiguration["splitPortionModeById"];
  selectedTacoCount: ChipotleBuildConfiguration["selectedTacoCount"];
  selectedTacoShellId: string;
  ingredientPortionLabelById: Record<string, string>;
  adjustedTotals: Nutrition;
};

type CartItemSubmissionPayload = Omit<CartItem, "id" | "restaurantId" | "itemId">;

export function createChipotleCartConfiguration(chipotle: ChipotleCartSubmissionState): CartBuildConfiguration {
  return toUniversalChipotleBuildConfiguration({
    ...chipotle.buildConfiguration,
    selectedIngredientItems: Object.fromEntries(
      Object.entries(chipotle.selectedIngredientItems).map(([ingredientId, selectedIngredient]) => [
        ingredientId,
        { quantity: selectedIngredient.quantity },
      ])
    ),
    selectedIngredientVariantIds: chipotle.selectedIngredientVariantIds,
    proteinPortionMode: chipotle.proteinPortionMode,
    splitPortionModeById: chipotle.splitPortionModeById,
    selectedTacoCount: chipotle.selectedTacoCount,
    selectedTacoShell: chipotle.selectedTacoShellId === "soft-flour-tortilla" ? "soft" : "crispy",
  });
}

export function createChipotleCartItemPayload({
  item,
  quantity,
  chipotle,
}: {
  item: MenuItem;
  quantity: number;
  chipotle: ChipotleCartSubmissionState;
}): CartItemSubmissionPayload {
  const customizationLabels = Object.entries(chipotle.selectedIngredientItems).map(
    ([ingredientId, selectedIngredient]) =>
      `${selectedIngredient.item.name}: ${selectedIngredient.quantity}x${
        chipotle.ingredientPortionLabelById[ingredientId]
          ? ` (${chipotle.ingredientPortionLabelById[ingredientId]})`
          : ""
      }`
  );

  return {
    name: item.name,
    image: item.image,
    quantity,
    customizations: customizationsFromLabels(customizationLabels),
    macrosPerItem: {
      calories: chipotle.adjustedTotals.calories,
      protein: chipotle.adjustedTotals.protein,
      carbs: chipotle.adjustedTotals.carbs,
      totalFat: chipotle.adjustedTotals.totalFat,
    },
    nutritionPerItem: {
      calories: chipotle.adjustedTotals.calories,
      protein: chipotle.adjustedTotals.protein,
      carbs: chipotle.adjustedTotals.carbs,
      totalFat: chipotle.adjustedTotals.totalFat,
    },
    selection: {
      type: "build-your-own",
      buildConfiguration: createChipotleCartConfiguration(chipotle),
    },
  };
}

export function resolveChipotleStandardItemSelection({
  item,
  restaurantId,
  ingredients,
  fallbackSelection,
  editingSelection,
}: {
  item: MenuItem;
  restaurantId: string;
  ingredients?: IngredientItem[];
  fallbackSelection: CartSelection;
  editingSelection?: CartSelection;
}): CartSelection {
  if (editingSelection?.type === "build-your-own") {
    return editingSelection;
  }

  if (!isChipotleHighProteinMenuItem(item, restaurantId)) {
    return fallbackSelection;
  }

  const buildConfiguration = buildHighProteinBuildConfiguration(item, ingredients);
  return buildConfiguration
    ? {
        type: "build-your-own",
        buildConfiguration: toUniversalChipotleBuildConfiguration(buildConfiguration),
      }
    : fallbackSelection;
}
