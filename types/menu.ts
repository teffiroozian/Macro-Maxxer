import type { RestaurantBuilderConfig } from "@/types/builder";
import type { Nutrition } from "@/types/nutrition";

export type ServingType = "addon" | "breakfast" | "combo" | "dessert" | "drink" | "entree" | "kids" | "shareable" | "side" | "single";

// item variants allow for different versions of the same base item, 
// e.g. 8pc vs 10pc nuggets, small vs medium fries
export type ItemVariant = {
  id: string;
  label: string;
  image?: string;
  nutrition: Nutrition;
  nutritionMultiplier?: number;
  categories: string[];
  servingType?: ServingType;
  // which variant should show as the default option in the menu
  isDefault: boolean;
};

// group of extra items that can be added to a menu item
// e.g. dipping sauces, dressings
export type AddonGroup = {
  label: string;
  itemIds: string[];
  maxPerItem?: number;
};

export type RestaurantAddonGroups = Record<string, AddonGroup>;
export type ResolvedAddonGroup = AddonGroup & {
  items: MenuItem[];
};

export type ResolvedAddonGroups = Record<string, ResolvedAddonGroup>;

// ingredient item categories
// e.g. Cheese (includes american cheese, pepper jack, swiss)
export type IngredientItemCategory = {
  name: string;
  ingredients: string[];
  // lets choose allow none or remove from item altogether
  allowNone: boolean;
};

// can override the ingredients customizatin of an item
export type ItemCustomizationOverride = {
  // custom ingredient groups
  ingredientCategories?: IngredientItemCategory[];
  // disable customziation
  disabled?: boolean;
};

// rules for what ingredient groups and item should show per item
export type FoodCategoryRule = {
  // categories groups for an item (e.g. Sandwich: cheese, buns, protein, toppings)
  ingredientCategories: string[];
  // ingredient items of a category for an item (e.g. Salad: protein [nuggets, grilled fillet], )
  ingredientOptionsByCategory?: Partial<Record<string, string[]>>;
};

// custom rules for ingredients for food items
export type IngredientCategoryRule = {
  maxQuantity?: number;
  allowNone?: boolean;
};

// restaurant customization rules
export type RestaurantCustomizationRules = {
  foodCategories?: Record<string, FoodCategoryRule>;
  ingredientCategories?: Record<string, IngredientCategoryRule>;
};

// represents one menu item
export type MenuItem = {
  id: string;
  name: string;
  image: string;

  // a single item can have multiple categories
  categories: string[];
  servingType: ServingType;
  // for build your own item
  entreeGroup?: string;

  nutrition: Nutrition;

  ingredientRef?: string;
  ingredients?: string[];

  variants?: ItemVariant[];
  defaultVariantId?: string;

  addonRefs?: string[];
  addonEligible?: boolean;

  customization?: ItemCustomizationOverride;

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


export type RestaurantMenu = {
  id: string;
  name: string;
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addonGroups?: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
