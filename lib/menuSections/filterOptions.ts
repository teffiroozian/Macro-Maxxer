import type { CategoryPresetId } from "@/lib/menuSections/categoryPresets";
import type { RankedAllFilterKey } from "@/lib/menuSections/filtering";

import type { CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";

// filter options for the menu section
export type Filters = {
  // Display preference only; undefined restores automatic sort-based display.
  cardDisplayOverride?: CardDisplayMode;
  showServingSizeVariants?: boolean;
  showRecipeVariants?: boolean;
  separateSizesInProteinScore?: boolean;
  proteinMin?: number;
  caloriesMax?: number;
  proteinScoreMin?: number;
  carbsMax?: number;
  fatMax?: number;
  fiberMin?: number;
  sodiumMax?: number;
  sugarMax?: number;
  categories?: string[];
  categoryTags?: string[];
  // Explicit manual exclusions override category/tag unions.
  categoryExclusions?: string[];
  // UI intent only: filtering always reads the same categories array.
  categoryPreset?: CategoryPresetId | "custom";
  rankingGroups?: RankedAllFilterKey[];
};

// Protein-minimum chip presets. Finished meals commonly clear 20-50g, but
// individual Build Your Own ingredients rarely do — a burrito easily has
// 30g of protein, a single scoop of rice never will — so BYO ingredient
// filtering uses its own, much lower preset scale instead of sharing the
// meal-level thresholds.
export const MEAL_PROTEIN_OPTIONS = [20, 30, 40, 50];
export const INGREDIENT_PROTEIN_OPTIONS = [5, 10, 15, 20];

export const VARIANT_FILTER_DEFAULTS = {
  showServingSizeVariants: true,
  showRecipeVariants: true,
  separateSizesInProteinScore: false,
} as const;

export type VariantSettings = { [K in keyof typeof VARIANT_FILTER_DEFAULTS]: boolean };
export function getVariantSettings(filters: Filters): VariantSettings {
  return {
    showServingSizeVariants: filters.showServingSizeVariants ?? true,
    showRecipeVariants: filters.showRecipeVariants ?? true,
    separateSizesInProteinScore: filters.separateSizesInProteinScore ?? false,
  };
}
export function countVariantSettingsChanges(filters: Filters): number {
  const settings = getVariantSettings(filters);
  return (Object.keys(VARIANT_FILTER_DEFAULTS) as Array<keyof VariantSettings>)
    .filter((key) => settings[key] !== VARIANT_FILTER_DEFAULTS[key]).length;
}
