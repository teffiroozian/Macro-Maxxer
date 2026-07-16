import type { ItemVariant, MenuItem } from "@/types/menu";
import type { CoreMacros, Nutrition } from "@/types/nutrition";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";
import { addonFat, menuItemFatWithFallback } from "@/lib/menuItemCalculations";

const zeroCoreMacros: CoreMacros = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
};

const zeroNutrition: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
  satFat: 0,
  transFat: 0,
  cholesterol: 0,
  sodium: 0,
  fiber: 0,
  sugars: 0,
};

export function calculateAddonTotals(addons: Array<MenuItem | undefined | null>): Nutrition {
  return addons.reduce<Nutrition>(
    (sum, addon) => ({
      calories: sum.calories + (addon?.nutrition.calories ?? 0),
      protein: sum.protein + (addon?.nutrition.protein ?? 0),
      carbs: sum.carbs + (addon?.nutrition.carbs ?? 0),
      totalFat: sum.totalFat + addonFat(addon ?? undefined),
      satFat: (sum.satFat ?? 0) + (addon?.nutrition.satFat ?? 0),
      transFat: (sum.transFat ?? 0) + (addon?.nutrition.transFat ?? 0),
      cholesterol: (sum.cholesterol ?? 0) + (addon?.nutrition.cholesterol ?? 0),
      sodium: (sum.sodium ?? 0) + (addon?.nutrition.sodium ?? 0),
      fiber: (sum.fiber ?? 0) + (addon?.nutrition.fiber ?? 0),
      sugars: (sum.sugars ?? 0) + (addon?.nutrition.sugars ?? 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      totalFat: 0,
      satFat: 0,
      transFat: 0,
      cholesterol: 0,
      sodium: 0,
      fiber: 0,
      sugars: 0,
    }
  );
}

export function calculateIngredientCountTotals(
  ingredientCounts: Record<string, number>,
  ingredients: ResolvedPanelIngredient[]
): CoreMacros {
  const ingredientLookup = new Map<string, ResolvedPanelIngredient>();

  ingredients.forEach((ingredient) => {
    ingredientLookup.set(ingredient.id, ingredient);
    ingredientLookup.set(ingredient.id.toLowerCase(), ingredient);
    ingredientLookup.set(ingredient.label.toLowerCase(), ingredient);
  });

  return Object.entries(ingredientCounts).reduce<CoreMacros>((sum, [ingredientId, count]) => {
    const ingredient = ingredientLookup.get(ingredientId) ?? ingredientLookup.get(ingredientId.toLowerCase());

    if (!ingredient) return sum;
    const countDelta = count - ingredient.defaultCount;
    if (countDelta === 0) return sum;

    return {
      calories: sum.calories + (ingredient.nutrition.calories ?? 0) * countDelta,
      protein: sum.protein + (ingredient.nutrition.protein ?? 0) * countDelta,
      carbs: sum.carbs + (ingredient.nutrition.carbs ?? 0) * countDelta,
      totalFat: sum.totalFat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
    };
  }, zeroCoreMacros);
}

export function calculateComboNutritionTotals({
  isComboEligibleCategory,
  comboType,
  selectedComboDrink,
  selectedComboDrinkVariant,
  selectedComboSide,
  selectedComboSideVariant,
}: {
  isComboEligibleCategory: boolean;
  comboType: "just-item" | "combo-meal";
  selectedComboDrink?: MenuItem;
  selectedComboDrinkVariant?: ItemVariant;
  selectedComboSide?: MenuItem;
  selectedComboSideVariant?: ItemVariant;
}): CoreMacros {
  const fullNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory,
    comboType,
    selectedComboDrink,
    selectedComboDrinkVariant,
    selectedComboSide,
    selectedComboSideVariant,
  });

  return {
    calories: fullNutrition.calories,
    protein: fullNutrition.protein,
    carbs: fullNutrition.carbs,
    totalFat: fullNutrition.totalFat,
  };
}

export function calculateFullComboNutritionTotals(params: Parameters<typeof calculateComboNutritionTotals>[0]): Nutrition {
  if (!params.isComboEligibleCategory || params.comboType !== "combo-meal") return { ...zeroNutrition };
  const drinkNutrition = params.selectedComboDrinkVariant?.nutrition ?? params.selectedComboDrink?.nutrition;
  const sideNutrition = params.selectedComboSideVariant?.nutrition ?? params.selectedComboSide?.nutrition;
  return {
    calories: (drinkNutrition?.calories ?? 0) + (sideNutrition?.calories ?? 0),
    protein: (drinkNutrition?.protein ?? 0) + (sideNutrition?.protein ?? 0),
    carbs: (drinkNutrition?.carbs ?? 0) + (sideNutrition?.carbs ?? 0),
    totalFat:
      (drinkNutrition?.totalFat ?? menuItemFatWithFallback(params.selectedComboDrink)) +
      (sideNutrition?.totalFat ?? menuItemFatWithFallback(params.selectedComboSide)),
    satFat: (drinkNutrition?.satFat ?? 0) + (sideNutrition?.satFat ?? 0),
    transFat: (drinkNutrition?.transFat ?? 0) + (sideNutrition?.transFat ?? 0),
    cholesterol: (drinkNutrition?.cholesterol ?? 0) + (sideNutrition?.cholesterol ?? 0),
    sodium: (drinkNutrition?.sodium ?? 0) + (sideNutrition?.sodium ?? 0),
    fiber: (drinkNutrition?.fiber ?? 0) + (sideNutrition?.fiber ?? 0),
    sugars: (drinkNutrition?.sugars ?? 0) + (sideNutrition?.sugars ?? 0),
  };
}

export function calculateMenuItemMacrosPerItem({
  baseNutrition,
  addonTotals = zeroCoreMacros,
  ingredientCountTotals = zeroCoreMacros,
  comboNutritionTotals = zeroCoreMacros,
}: {
  baseNutrition: Nutrition;
  addonTotals?: CoreMacros;
  ingredientCountTotals?: CoreMacros;
  comboNutritionTotals?: CoreMacros;
}): CoreMacros {
  return {
    calories:
      (baseNutrition.calories ?? 0) +
      addonTotals.calories +
      ingredientCountTotals.calories +
      comboNutritionTotals.calories,
    protein:
      (baseNutrition.protein ?? 0) +
      addonTotals.protein +
      ingredientCountTotals.protein +
      comboNutritionTotals.protein,
    carbs: (baseNutrition.carbs ?? 0) + addonTotals.carbs + ingredientCountTotals.carbs + comboNutritionTotals.carbs,
    totalFat:
      (baseNutrition.totalFat ?? 0) +
      addonTotals.totalFat +
      ingredientCountTotals.totalFat +
      comboNutritionTotals.totalFat,
  };
}
