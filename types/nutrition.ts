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
export type CoreMacros = Pick<Nutrition, "calories" | "protein" | "carbs" | "totalFat">;
