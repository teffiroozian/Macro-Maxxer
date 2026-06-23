import type { CartBuildConfiguration } from "@/types/cart";
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
