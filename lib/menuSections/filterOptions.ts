// filter options for the menu section
export type Filters = {
  proteinMin?: number;
  caloriesMax?: number;
};

// Protein-minimum chip presets. Finished meals commonly clear 20-50g, but
// individual Build Your Own ingredients rarely do — a burrito easily has
// 30g of protein, a single scoop of rice never will — so BYO ingredient
// filtering uses its own, much lower preset scale instead of sharing the
// meal-level thresholds.
export const MEAL_PROTEIN_OPTIONS = [20, 30, 40, 50];
export const INGREDIENT_PROTEIN_OPTIONS = [5, 10, 15, 20];
