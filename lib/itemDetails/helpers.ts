import type { AddonOption } from "@/types/menu";

/**
 * Data-flow helper primitives used by Item Details resolution.
 *
 * MenuItem and customizationRules inputs are normalized into stable token/category keys,
 * then used by ingredientResolution to map source ingredient IDs and tab labels into
 * resolved ingredient tabs for rendering.
 */
export function normalizeIngredientToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function normalizeIngredientCategory(value: string) {
  return value.trim().toLowerCase();
}

export const toNumber = (value?: number) => value ?? 0;

export function sortByCalories(addons: AddonOption[]) {
  return [...addons].sort((a, b) => toNumber(a.calories) - toNumber(b.calories));
}

export function formatSummaryDetail(name: string, calories: number) {
  return `• ${name} (${calories >= 0 ? "+" : ""}${calories}cal)`;
}
