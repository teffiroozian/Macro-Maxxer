export type BuilderEntreeOption = {
  id: string;
  label: string;
  image: string;
  nutritionMultiplier?: number;
  includedIngredientIds?: string[];
  includedIngredientIdsByOption?: Record<string, string[]>;
};

export type RestaurantBuilderConfig = {
  entreeOptions?: Record<string, BuilderEntreeOption>;
  hiddenSectionsByEntree?: Record<string, string[]>;
  categoryMaxSelections?: Record<string, number>;
  selectedIngredientCategoryOrder?: string[];
  selectedIngredientCategoryLabels?: Record<string, string>;
};
