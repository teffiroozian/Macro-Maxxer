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
  isReadOnly?: boolean;
  orderingOptionIdByCount?: Record<number, string>;
  orderingGroupIdByCount?: Record<number, string>;
  nutritionDeltaByCount?: Record<number, Nutrition>;
  extraOption?: {
    id: string;
    label: string;
    nutrition: Nutrition;
  };
};
