import type { CoreMacros, Nutrition } from "@/types/nutrition";

export type CartMacros = CoreMacros;

// common portion values we expect
export type CartBuildIngredientPortion = "light" | "normal" | "extra" | string;

// one ingredient selected inside a build-your-own cart item
export type CartBuildIngredient = {
  id: string;
  quantity: number;
  portion?: CartBuildIngredientPortion;
  variantId?: string;
  label?: string;
  categoryId?: string;
};

// full saved build-your-own configuration
export type CartBuildConfiguration = {
  baseItemId?: string | null;
  baseItemLabel?: string;
  variantId?: string;
  label?: string;
  categoryId?: string;
  ingredients: CartBuildIngredient[];
  options?: Record<string, string | number | boolean | null | undefined>;
};

// standard item selection
export type CartSelectionOption = {
  optionId?: string;
  itemId?: string;
  label: string;
  quantity?: number;
};

export type CartCustomization = {
  // Structured customization data is the cart source of truth. Generate labels for display instead of using strings for logic.
  action: "add" | "remove" | "extra" | "light" | "swap";
  kind?: "ingredient" | "combo";
  ingredientId?: string;
  ingredientLabel?: string;
  fromIngredientId?: string;
  fromIngredientLabel?: string;
  toIngredientId?: string;
  toIngredientLabel?: string;
  quantity?: number;
  comboRole?: "meal" | "side" | "drink";
  itemId?: string;
  itemLabel?: string;
  variantId?: string;
  variantLabel?: string;
};

export type StandardCartSelection = {
  type: "standard";
  variantId?: string;
  variantLabel?: string;
  optionSelections?: CartSelectionOption[];
};

// build-your-own item selection
export type BuildYourOwnCartSelection = {
  type: "build-your-own";
  buildConfiguration: CartBuildConfiguration;
};

// cart selection can be either a standard or a build-your-own item
export type CartSelection = StandardCartSelection | BuildYourOwnCartSelection;

// one item that the user added to the cart
export type CartItem = {
  id: string;
  restaurantId: string;
  itemId: string;
  name: string;
  image: string;
  variantId?: string;
  customizations?: CartCustomization[];
  quantity: number;
  macrosPerItem: CartMacros;
  nutritionPerItem: Nutrition;
  selection: CartSelection;
};

// full state of the cart store
export type CartState = {
  items: CartItem[];
  lastAddedItem: CartItem | null;
  lastAddedAt: number | null;
};
