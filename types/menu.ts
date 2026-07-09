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
};

// group of extra items that can be added to a menu item
// e.g. dipping sauces, dressings
export type AddonGroup = {
  label: string;
  itemIds: string[];
  maxPerItem?: number;
};

export type RestaurantAddonGroups = Record<string, AddonGroup>;

// formal combo meal configuration for menu items that can be ordered as a meal.
// IDs refer to MenuItem.id values from the same RestaurantMenu unless otherwise noted.
export type ComboMealConfig = {
  // entree that anchors the combo; defaults to the containing MenuItem.id when omitted.
  entreeItemId?: string;
  // fixed items included with the combo in addition to configurable side/drink selections.
  includedItemIds?: string[];
  // selectable side MenuItem IDs. When omitted, legacy restaurant/category rules may supply options.
  sideOptions?: string[];
  // selectable drink MenuItem IDs. When omitted, legacy restaurant/category rules may supply options.
  drinkOptions?: string[];
  // default selected side MenuItem ID.
  defaultSideId?: string;
  // default selected drink MenuItem ID.
  defaultDrinkId?: string;
  // optional upgrade MenuItem IDs such as premium sides, larger drinks, or add-ons.
  upgradeOptions?: string[];
};
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
  // explicit combo data for items that can be configured as combo meals.
  comboConfig?: ComboMealConfig;
  // for build your own item
  entreeGroup?: string;

  nutrition: Nutrition;

  ingredientRef?: string;
  ingredients?: string[];

  variants?: ItemVariant[];
  // Source of truth for default variant selection; falls back to the first variant when missing or invalid.
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
  // Source of truth for default variant selection; falls back to the first variant when missing or invalid.
  defaultVariantId?: string;

  maxQuantity: number;
  defaultOrder: number;

  hideVariantSelector?: boolean;
  hideFromIngredientView?: boolean;
};


// Menu JSON files contain restaurant menu content only; identity/metadata lives in app/data/index.json.
export type RestaurantMenu = {
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addonGroups?: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
