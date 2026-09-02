import type { CartBuildConfiguration, CartItem, CartSelection } from "@/types/cart";
import type { Nutrition } from "@/types/nutrition";
import type { IngredientItem, MenuItem } from "@/types/menu";
import {
  resolveChipotleLegacyId,
  type ChipotleLegacyBuildTargetId,
} from "@/lib/restaurantBuilders/chipotle/legacyCompatibility";
import { buildHighProteinBuildConfiguration, isChipotleEditablePresetBuildItem } from "@/lib/restaurantBuilders/chipotle/highProtein";
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
  const selectedTacoCount =
    (options.selectedTacoCount as ChipotleTacoCount | undefined) ?? 3;
  const selectedKidsMeal =
    (options.selectedKidsMeal as ChipotleKidsMealId | undefined) ??
    "build-your-own";
  const buildTargetId: ChipotleLegacyBuildTargetId =
    configuration.baseItemId === "burrito"
      ? "chipotle-burrito"
      : configuration.baseItemId === "salad"
        ? "chipotle-salad"
        : configuration.baseItemId === "quesadilla"
          ? "chipotle-quesadilla"
          : configuration.baseItemId === "tacos"
            ? selectedTacoCount === 1
              ? "chipotle-taco"
              : "chipotle-tacos-3"
            : configuration.baseItemId === "kids-meal"
              ? selectedKidsMeal === "quesadilla"
                ? "chipotle-kids-quesadilla"
                : "chipotle-kids-build-your-own"
              : "chipotle-bowl";
  const migratedIngredients = configuration.ingredients.flatMap((ingredient) => {
    const resolution = resolveChipotleLegacyId(ingredient.id, { buildTargetId });
    if (resolution.status === "obsolete" || resolution.status === "ambiguous") {
      return [];
    }
    return [{
      ...ingredient,
      id: resolution.status === "resolved" ? resolution.recordId : ingredient.id,
    }];
  });
  return {
    selectedEntree: (configuration.baseItemId ?? null) as ChipotleBuildConfiguration["selectedEntree"],
    selectedIngredientItems: Object.fromEntries(
      migratedIngredients.map((ingredient) => [ingredient.id, { quantity: ingredient.quantity }])
    ),
    selectedIngredientVariantIds: Object.fromEntries(
      migratedIngredients
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
    selectedTacoCount,
    selectedKidsMeal,
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
    selectedTacoShell: chipotle.selectedTacoShellId.includes("soft") ? "soft" : "crispy",
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
  return {
    name: item.name,
    image: item.image,
    quantity,
    macrosPerItem: {
      calories: chipotle.adjustedTotals.calories,
      protein: chipotle.adjustedTotals.protein,
      carbs: chipotle.adjustedTotals.carbs,
      totalFat: chipotle.adjustedTotals.totalFat,
    },
    // adjustedTotals (calculateChipotleBuildNutrition) already aggregates
    // every Nutrition field the ingredient catalog supports, not just the
    // four core macros — pass it through whole so the cart's Nutrition
    // Facts panel, Protein Score, and Macro Split all see the same complete
    // object the modal itself computed, instead of silently truncating to
    // calories/protein/carbs/fat here.
    nutritionPerItem: chipotle.adjustedTotals,
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

  if (!isChipotleEditablePresetBuildItem(item, restaurantId)) {
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
