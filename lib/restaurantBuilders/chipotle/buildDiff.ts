import type { IngredientItem } from "@/types/menu";
import {
  normalizeIngredientCategory,
  type ChipotleBuildConfiguration,
  type SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";

// The raw factory-preset configuration (from buildHighProteinBuildConfiguration)
// encodes a rice/beans portion as a fractional `quantity` (e.g. 0.5) with an
// empty splitPortionModeById, while the live/derived selection state always
// normalizes quantity to 1 and records the portion explicitly in
// splitPortionModeById instead. Resolving both sides through this same
// fallback (mirroring the modal's own initial-state derivation) means the
// diff compares the *effective* portion rather than false-flagging a
// representation difference as a real edit.
function resolveEffectiveSplitPortionMode(
  configuration: ChipotleBuildConfiguration,
  ingredientId: string,
): SplitPortionMode {
  const explicitMode = configuration.splitPortionModeById[ingredientId];
  if (explicitMode) return explicitMode;

  const rawQuantity =
    configuration.selectedIngredientItems[ingredientId]?.quantity ?? 1;
  return rawQuantity <= 0.5 ? "light" : rawQuantity >= 2 ? "extra" : "normal";
}

export type ChipotleIngredientDiffStatus = "added" | "modified";

export type ChipotleBuildDiff = {
  isCustomized: boolean;
  // Count of meaningful ingredient-level differences from the original
  // preset: one per added ingredient, one per removed ingredient, one per
  // ingredient whose quantity or portion changed. A single ingredient never
  // contributes more than one, even if both its quantity and portion moved.
  differenceCount: number;
  // Only for ingredients present in the CURRENT build (drives the "Added" /
  // "Modified" badges) — removed ingredients aren't shown as list items at
  // all, so they have no badge, just a count contribution.
  statusById: Record<string, ChipotleIngredientDiffStatus>;
  removedIngredientIds: string[];
};

/**
 * Compares a build against the original (factory) preset configuration —
 * always that original preset, never a temporary Customize-session snapshot
 * — to drive "Customize (n)", the Added/Modified badges, and whether
 * "Reset to Original" should show.
 */
export function diffChipotleBuildConfigurations(
  originalConfiguration: ChipotleBuildConfiguration,
  currentConfiguration: ChipotleBuildConfiguration,
  ingredientItems: IngredientItem[],
): ChipotleBuildDiff {
  const ingredientById = new Map(
    ingredientItems.map((ingredient) => [
      (ingredient.id ?? ingredient.name).toLowerCase(),
      ingredient,
    ]),
  );

  const originalEntries = originalConfiguration.selectedIngredientItems ?? {};
  const currentEntries = currentConfiguration.selectedIngredientItems ?? {};
  const originalIds = new Set(Object.keys(originalEntries));
  const currentIds = new Set(Object.keys(currentEntries));

  const statusById: Record<string, ChipotleIngredientDiffStatus> = {};
  const removedIngredientIds: string[] = [];
  let differenceCount = 0;

  originalIds.forEach((ingredientId) => {
    if (!currentIds.has(ingredientId)) {
      removedIngredientIds.push(ingredientId);
      differenceCount += 1;
    }
  });

  currentIds.forEach((ingredientId) => {
    if (!originalIds.has(ingredientId)) {
      statusById[ingredientId] = "added";
      differenceCount += 1;
      return;
    }

    const ingredient = ingredientById.get(ingredientId);
    const category = ingredient
      ? normalizeIngredientCategory(resolvePrimaryCategory(ingredient.categories))
      : "";

    // Quantity is only a meaningful, directly-comparable value for
    // categories without their own portion-mode concept (toppings, sides).
    // For proteins/rice/beans, "how much" is expressed via portion mode
    // instead, and quantity is just an internal encoding detail that can
    // legitimately differ (0.5 vs. 1 + "light") between the raw preset and
    // the normalized live state without representing an actual edit.
    let hasDifference: boolean;
    if (category === "proteins") {
      hasDifference =
        originalConfiguration.proteinPortionMode !==
        currentConfiguration.proteinPortionMode;
    } else if (category === "rice" || category === "beans") {
      hasDifference =
        resolveEffectiveSplitPortionMode(originalConfiguration, ingredientId) !==
        resolveEffectiveSplitPortionMode(currentConfiguration, ingredientId);
    } else {
      hasDifference =
        originalEntries[ingredientId].quantity !==
        currentEntries[ingredientId].quantity;
    }

    if (hasDifference) {
      statusById[ingredientId] = "modified";
      differenceCount += 1;
    }
  });

  return {
    isCustomized: differenceCount > 0,
    differenceCount,
    statusById,
    removedIngredientIds,
  };
}
