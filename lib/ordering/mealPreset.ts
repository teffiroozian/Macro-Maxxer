import { CORE_NUTRITION_KEYS, NUTRITION_KEYS } from "@/lib/nutrition";
import type { MealPreset } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

export function getMealPresetErrors(preset: MealPreset, ownerId: string, itemIds: ReadonlySet<string>, componentIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (preset.builderItemId === ownerId || !itemIds.has(preset.builderItemId)) {
    errors.push(`Preset "${ownerId}" has no builder "${preset.builderItemId}".`);
  }
  if (preset.selections.length === 0) errors.push(`Preset "${ownerId}" has no selections.`);
  const seen = new Set<string>();
  for (const { itemId, quantity, nutrition } of preset.selections) {
    if (itemId === ownerId || !componentIds.has(itemId) || seen.has(itemId)) {
      errors.push(`Preset "${ownerId}" has a missing or duplicate component "${itemId}".`);
    }
    seen.add(itemId);
    if (!Number.isFinite(quantity) || quantity <= 0 ||
        CORE_NUTRITION_KEYS.some((key) => !Number.isFinite(nutrition[key]) || nutrition[key] < 0)) {
      errors.push(`Preset "${ownerId}" has an invalid portion for "${itemId}".`);
    }
  }
  return errors;
}

// Optional fields survive only when every contribution states a value.
export function sumMealPresetContributions(contributions: readonly Nutrition[]): Nutrition {
  return Object.fromEntries(NUTRITION_KEYS.flatMap((key) => {
    const values = contributions.map((nutrition) => nutrition[key]);
    return values.every((value) => value !== undefined)
      ? [[key, Number(values.reduce((sum, value) => sum + value, 0).toFixed(3))]]
      : [];
  })) as Nutrition;
}

export function getMealPresetNutrition(preset: MealPreset): Nutrition {
  return sumMealPresetContributions(preset.selections.map(({ nutrition }) => nutrition));
}
