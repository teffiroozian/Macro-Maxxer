import type { ChipotleKidsMealId, ChipotleTacoShell } from "@/lib/chipotleBuild/types";

export const PORTION_TYPES = [
  "single",
  "combo",
  "shareable",
  "addon",
  "drink",
  "side",
  "breakfast",
  "dessert",
  "kids",
  "entree",
] as const;

export type PortionType = (typeof PORTION_TYPES)[number];

export type Nutrition = {
  calories: number;
  protein: number;
  totalFat: number;
  carbs: number;

  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
  extraNutrition?: Record<string, number>;
};

export type ItemVariant = {
  id: string;          // e.g. "8pc", "12pc", "30pc"
  label: string;       // e.g. "8 piece"
  nutrition: Nutrition;
  image?: string;
  portionType?: PortionType;   // Optional override: variant can differ from base item
  categories?: string[];
  isDefault?: boolean;
};

export type AddonRef = "sauces" | "dressings" | "condiments";

export type AddonOption = {
  name: string;
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
  extraNutrition?: Record<string, number>;
  image?: string;
};

export type RestaurantAddons = Partial<Record<AddonRef, AddonOption[]>>;

export type MacroDelta = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
};

export type CommonChange = {
  id: string;
  label: string;
  appliesTo?: {
    categories?: string[];
  };
  delta: MacroDelta;
};

export type IngredientModifier = {
  id: string;
  label: string;
  multiplier: number;
};

export type IngredientTabsOverride = {
  ingredientTabs?: string[];
  singleSelectIngredientTabs?: string[];
  ingredientTabMaxQuantities?: Partial<Record<string, number>>;
  ingredientOptionsByTab?: Partial<Record<string, string[]>>;
  tabsWithNoneOption?: string[];
};

export type RestaurantCustomizationRules = {
  ingredientTabsByItemCategory?: Partial<Record<string, string[]>>;
  singleSelectIngredientTabsByItemCategory?: Partial<Record<string, string[]>>;
  ingredientTabMaxQuantities?: Partial<Record<string, number>>;
  ingredientTabMaxQuantitiesByItemCategory?: Partial<Record<string, Partial<Record<string, number>>>>;
  ingredientOptionsByItemCategory?: Partial<Record<string, Partial<Record<string, string[]>>>>;
};

export type MenuItem = {
  id?: string;          // optional but recommended later
  ingredientRef?: string;
  name: string;
  defaultOrder?: number;
  nutrition: Nutrition; // make this required so label is consistent
  image?: string;
  categories: string[];
  entreeGroup?: string;
  portionType?: PortionType;
  restaurant?: string;
  variants?: ItemVariant[];
  defaultVariantId?: string;
  addonRefs?: AddonRef[];
  ingredients?: string[];
  customization?: IngredientTabsOverride;
  hideVariantSelector?: boolean;
  disableVariantSelector?: boolean;
};

export type IngredientItem = {
  id?: string;
  name: string;
  defaultOrder?: number;
  nutrition: Nutrition;
  image?: string;
  category?: string;
  categories?: string[];
  variants?: ItemVariant[];
  defaultVariantId?: string;
  hideVariantSelector?: boolean;
  maxQuantity?: number;
  hideFromIngredientView?: boolean;
};


export type BuilderEntreeOption = {
  label: string;
  imageSrc: string;
  nutritionMultiplier?: number;
  includedIngredientIds?: string[];
  includedIngredientIdsByOption?: Partial<Record<ChipotleTacoShell, string[]>>;
};

export type RestaurantBuilderConfig = {
  entreeOptions?: Record<string, BuilderEntreeOption>;
  includedIngredientRules?: {
    tacoShellIngredientIds?: string[];
    kidsQuesadillaIncludedIngredientIds?: string[];
    kidsBuildYourOwnDoubleSideIds?: string[];
  };
  hiddenSectionsByEntree?: Record<string, string[]>;
  categoryMaxSelections?: Record<string, number>;
  kidsMealOptions?: Array<{
    id: ChipotleKidsMealId;
    label: string;
    imageSrc: string;
  }>;
  selectedIngredientCategoryOrder?: string[];
  selectedIngredientCategoryLabels?: Record<string, string>;
  specialVariantIds?: {
    quesadillaTripleCheese?: string;
  };
};

export type RestaurantMenu = {
  id: string;
  name?: string;
  isBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredientModifiers?: IngredientModifier[];
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
