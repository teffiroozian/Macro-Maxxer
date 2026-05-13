export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;

  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
};

export type CoreMacros = Pick<
  Nutrition,
  "calories" | "protein" | "carbs" | "totalFat"
>;

export type ItemVariant = {
  id: string;
  label: string;
  image?: string;

  categories: string[];
  servingType?: string;

  nutrition: Nutrition;

  isDefault?: boolean;
};

export type AddonOption = {
  id: string;
  name: string;
  image: string;
  nutrition: Nutrition;
};

export type RestaurantAddons = Record<string, AddonOption[]>;

export type IngredientTabsOverride = {
  ingredientTabs?: string[];
  singleSelectIngredientTabs?: string[];
  ingredientTabMaxQuantities?: Partial<Record<string, number>>;
  ingredientOptionsByTab?: Partial<Record<string, string[]>>;
  tabsWithNoneOption?: string[];
};

export type FoodCategoryRule = {
  ingredientCategories: string[];
  ingredientOptionsByCategory?: Partial<Record<string, string[]>>;
};

export type IngredientCategoryRule = {
  maxQuantity?: number;
  allowNone?: boolean;
};

export type RestaurantCustomizationRules = {
  foodCategories?: Record<string, FoodCategoryRule>;
  ingredientCategories?: Record<string, IngredientCategoryRule>;
};

export type MenuItem = {
  id: string;
  name: string;
  image: string;

  categories: string[];
  servingType?: string;
  entreeGroup?: string;

  nutrition: Nutrition;

  ingredientRef?: string;
  ingredients?: string[];

  variants?: ItemVariant[];
  defaultVariantId?: string;

  addonRefs?: string[];

  customization?: IngredientTabsOverride;

  defaultOrder: number;

  hideVariantSelector?: boolean;
  disableVariantSelector?: boolean;
};

export type IngredientItem = {
  id: string;
  name: string;
  image?: string;

  categories: string[];

  nutrition: Nutrition;

  variants?: ItemVariant[];
  defaultVariantId?: string;

  maxQuantity: number;
  defaultOrder: number;

  hideVariantSelector?: boolean;
  hideFromIngredientView?: boolean;
};


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

export type RestaurantMenu = {
  id: string;
  name: string;
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
