import type { IngredientItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

export type ResolvedPanelIngredient = {
  id: string;
  label: string;
  icon: string;
  tabLabel?: string;
  ingredientItem?: IngredientItem;
  maxQuantity?: number;
  nutrition: Nutrition;
  calories?: number;
  defaultCount: number;
  isNoneOption?: boolean;
};
