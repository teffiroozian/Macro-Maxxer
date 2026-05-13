export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
  // optional fields that are less common = harder to get consistent data for
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
};

// Core macros are the most commonly used nutrition fields that are typically displayed prominently in the UI
export type CoreMacros = Pick<
  Nutrition,
  "calories" | "protein" | "carbs" | "totalFat"
>;

// item variants allow for different versions of the same base item, 
// such as different sizes or flavors, without needing to create entirely separate menu items for each variation
export type ItemVariant = {
  id: string;
  label: string;
  image?: string;

  categories: string[];
  servingType?: string;

  nutrition: Nutrition;

  isDefault?: boolean;
};

// addons are additional options that can be added to a menu item, such as dippping sauces and dressings
export type AddonOption = {
  id: string;
  name: string;
  image: string;
  nutrition: Nutrition;
};

// allows for defining groups of addons that can be easily referenced by menu items
export type RestaurantAddons = Record<string, AddonOption[]>;

// item-level overrides for the ingredient tab options, allowing customization for specific items 
export type IngredientTabsOverride = {
  ingredientTabs?: string[];
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
