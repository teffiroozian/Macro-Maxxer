import type { IngredientItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import {
  getProteinMultiplier,
  getSplitExtraMultiplier,
  normalizeIngredientCategory,
  scaleNutritionValues,
  type ChipotleBuildConfiguration,
  type SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";

const TACO_SHELL_INGREDIENT_IDS = new Set([
  "crispy-corn-tortilla",
  "soft-flour-tortilla",
]);

const EMPTY_NUTRITION: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
  satFat: 0,
  transFat: 0,
  cholesterol: 0,
  sodium: 0,
  fiber: 0,
  sugars: 0,
};

// Direct light/normal/extra multiplier for a single ingredient's own mode —
// used as-is for toppings, and as the rice/beans fallback once fewer than
// two same-category ingredients are selected (see the auto-half rule below).
function getSplitPortionMultiplier(mode: SplitPortionMode | undefined) {
  if (mode === "light") return 0.5;
  if (mode === "extra") return getSplitExtraMultiplier();
  return 1;
}

function addNutrition(totals: Nutrition, addend: Nutrition): Nutrition {
  return {
    calories: totals.calories + (addend.calories ?? 0),
    protein: totals.protein + (addend.protein ?? 0),
    carbs: totals.carbs + (addend.carbs ?? 0),
    totalFat: totals.totalFat + (addend.totalFat ?? 0),
    satFat: (totals.satFat ?? 0) + (addend.satFat ?? 0),
    transFat: (totals.transFat ?? 0) + (addend.transFat ?? 0),
    cholesterol: (totals.cholesterol ?? 0) + (addend.cholesterol ?? 0),
    sodium: (totals.sodium ?? 0) + (addend.sodium ?? 0),
    fiber: (totals.fiber ?? 0) + (addend.fiber ?? 0),
    sugars: (totals.sugars ?? 0) + (addend.sugars ?? 0),
  };
}

/**
 * Shared per-ingredient scaling step used by both
 * `calculateChipotleBuildNutrition` (which sums these) and
 * `calculateChipotleIngredientNutritionById` (which keeps them separate) —
 * so the totals and the per-ingredient breakdown can never drift apart.
 */
function computeChipotleIngredientContributions(
  buildConfiguration: ChipotleBuildConfiguration,
  ingredientItems: IngredientItem[],
  warningSourceName: string,
): Array<[string, Nutrition]> {
  const ingredientById = new Map(
    ingredientItems.map((ingredient) => [
      (ingredient.id ?? ingredient.name).toLowerCase(),
      ingredient,
    ]),
  );

  const selectedEntries = Object.entries(
    buildConfiguration.selectedIngredientItems ?? {},
  ).filter(([, entry]) => entry.quantity > 0);

  const isTacoBuild = selectedEntries.some(([ingredientId]) =>
    TACO_SHELL_INGREDIENT_IDS.has(ingredientId),
  );
  const selectedTacoCount = buildConfiguration.selectedTacoCount ?? 1;

  const categoryById = new Map<string, string>();
  selectedEntries.forEach(([ingredientId]) => {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) return;
    categoryById.set(
      ingredientId,
      normalizeIngredientCategory(resolvePrimaryCategory(ingredient.categories)),
    );
  });

  const selectedProteinCount = selectedEntries.filter(
    ([ingredientId]) => categoryById.get(ingredientId) === "proteins",
  ).length;

  const selectedSplitIdsByCategory: Record<"rice" | "beans", string[]> = {
    rice: [],
    beans: [],
  };
  selectedEntries.forEach(([ingredientId]) => {
    const category = categoryById.get(ingredientId);
    if (category === "rice" || category === "beans") {
      selectedSplitIdsByCategory[category].push(ingredientId);
    }
  });

  return selectedEntries.reduce<Array<[string, Nutrition]>>(
    (contributions, [ingredientId, selectedEntry]) => {
      const ingredient = ingredientById.get(ingredientId);
      if (!ingredient) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[${warningSourceName}] Unknown ingredient id "${ingredientId}" in build configuration — skipping it rather than guessing its nutrition.`,
          );
        }
        return contributions;
      }

      const category = categoryById.get(ingredientId) ?? "";
      const splitPortionMode = buildConfiguration.splitPortionModeById[ingredientId];
      const portionMultiplier =
        category === "proteins"
          ? getProteinMultiplier(
              buildConfiguration.proteinPortionMode,
              selectedProteinCount,
            )
          : category === "rice" || category === "beans"
            ? selectedSplitIdsByCategory[category].length >= 2
              ? 0.5
              : getSplitPortionMultiplier(splitPortionMode)
            : category === "toppings"
              // Toppings don't share the rice/beans "two selected -> auto
              // half" rule — each topping's light/normal/extra is direct,
              // independent of how many other toppings are selected.
              ? getSplitPortionMultiplier(splitPortionMode)
              : 1;

      const tacoMultiplier = isTacoBuild
        ? TACO_SHELL_INGREDIENT_IDS.has(ingredientId)
          ? selectedTacoCount
          : selectedTacoCount / 3
        : 1;

      const multiplier = portionMultiplier * selectedEntry.quantity * tacoMultiplier;
      const scaled = scaleNutritionValues(ingredient.nutrition, multiplier);

      contributions.push([ingredientId, scaled]);
      return contributions;
    },
    [],
  );
}

/**
 * Single source of truth for a Chipotle build's total nutrition: sums each
 * selected ingredient's catalog nutrition, scaled by its portion mode
 * (protein normal/double split across however many proteins are selected,
 * rice/beans light/normal/extra, or an automatic 1/2x split when two
 * rice-or-beans ingredients share a category) and, for taco builds, the
 * 1-vs-3-taco quantity multiplier.
 *
 * Used for both editable prebuilt/preset builds (e.g. the High Protein
 * menu) and can be reused anywhere else a `ChipotleBuildConfiguration` needs
 * totals, so every surface agrees on the same numbers for the same
 * configuration instead of each keeping its own copy of this math.
 */
export function calculateChipotleBuildNutrition(
  buildConfiguration: ChipotleBuildConfiguration,
  ingredientItems: IngredientItem[],
): Nutrition {
  const contributions = computeChipotleIngredientContributions(
    buildConfiguration,
    ingredientItems,
    "calculateChipotleBuildNutrition",
  );

  return contributions.reduce<Nutrition>(
    (totals, [, scaled]) => addNutrition(totals, scaled),
    EMPTY_NUTRITION,
  );
}

/**
 * Same math as `calculateChipotleBuildNutrition`, but keyed per ingredient
 * instead of summed — the per-ingredient macro contribution shown on the
 * Overview "Included in this Build" cards, guaranteed to always add up to
 * the same totals since both reuse `computeChipotleIngredientContributions`.
 */
export function calculateChipotleIngredientNutritionById(
  buildConfiguration: ChipotleBuildConfiguration,
  ingredientItems: IngredientItem[],
): Record<string, Nutrition> {
  const contributions = computeChipotleIngredientContributions(
    buildConfiguration,
    ingredientItems,
    "calculateChipotleIngredientNutritionById",
  );

  return Object.fromEntries(contributions);
}
