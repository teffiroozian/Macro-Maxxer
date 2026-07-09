// one build option
export type BuilderEntreeOption = {
  id: string;
  label: string;
  image: string;
  // different portion sizes
  portionMultiplier?: number;
  // included ingredients that come with that build option
  includedIngredientIds?: string[];
  // different options for the included ingredients
  includedIngredientIdsByOption?: Record<string, string[]>;
};

// whole build system for a restaurant
export type RestaurantBuilderConfig = {
  // all the build-your-own options in a restaurant
  entreeOptions?: Record<string, BuilderEntreeOption>;
  hiddenSectionsByEntree?: Record<string, string[]>;
  // max items selected per category
  categoryMaxSelections?: Record<string, number>;
  // order of selected ingredients
  selectedIngredientCategoryOrder?: string[];
  // label of selected ingredienst
  selectedIngredientCategoryLabels?: Record<string, string>;
};
