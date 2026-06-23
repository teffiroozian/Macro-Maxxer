import type { CoreMacros, Nutrition } from "@/types/menu";

export type CartMacros = CoreMacros;

export type CartBuildIngredientPortion = "light" | "normal" | "extra" | string;

export type CartBuildIngredient = {
  id: string;
  quantity: number;
  portion?: CartBuildIngredientPortion;
  variantId?: string;
  label?: string;
  categoryId?: string;
};

export type CartBuildConfiguration = {
  baseItemId?: string | null;
  baseItemLabel?: string;
  variantId?: string;
  label?: string;
  categoryId?: string;
  ingredients: CartBuildIngredient[];
  options?: Record<string, string | number | boolean | null | undefined>;
};

export type StandardCartSelection = {
  type: "standard";
  variantId?: string;
  variantLabel?: string;
  optionsLabel?: string;
  customizations?: string[];
};

export type BuildYourOwnCartSelection = {
  type: "build-your-own";
  buildConfiguration: CartBuildConfiguration;
  customizations?: string[];
};

export type CartSelection = StandardCartSelection | BuildYourOwnCartSelection;

export type CartItem = {
  id: string;
  restaurantId: string;
  itemId: string;
  name: string;
  image: string;
  variantId?: string;
  selectionDetailsLabel?: string;
  customizations?: string[];
  quantity: number;
  macrosPerItem: CartMacros;
  nutritionPerItem: Nutrition;
  selection: CartSelection;
};

export type CartState = {
  items: CartItem[];
  lastAddedItem: CartItem | null;
  lastAddedAt: number | null;
};
