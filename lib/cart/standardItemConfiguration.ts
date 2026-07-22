import type { CartCustomization, CartSelectionOption, StandardCartSelection } from "@/types/cart";
import type { ItemVariant, MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { CoreMacros, Nutrition } from "@/types/nutrition";
import type { ResolvedPanelIngredient } from "@/lib/itemDetails/types";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import { buildStructuredOptionSelections } from "@/lib/menuItemCard/cartLabelUtils";
import { formatIngredientCountCustomizationLabel } from "@/lib/menuItemCard/ingredientCountCustomization";
import {
  calculateAddonTotals,
  calculateComboNutritionTotals,
  calculateFullComboNutritionTotals,
  calculateIngredientCountTotals,
} from "@/lib/menuItemCard/totals";
import { getDefaultIngredientCounts, sumNutritionWithFallback } from "@/lib/menuItemCalculations";
import { normalizeNutrition, resolveMenuItemVariantNutrition } from "@/lib/nutrition";

const sauceRef = "sauces";

export type ComboType = "just-item" | "combo-meal";

export function resolveStandardItemVariant({
  variants,
  selectedVariantId,
  defaultVariantId,
}: {
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  defaultVariantId?: string;
}): ItemVariant | undefined {
  if (!variants || variants.length === 0) return undefined;
  return (
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.id === defaultVariantId) ??
    variants[0]
  );
}

export function resolveStandardIngredientCounts({
  resolvedIngredients,
  selectedIngredientCounts,
}: {
  resolvedIngredients: ResolvedPanelIngredient[];
  selectedIngredientCounts: Record<string, number>;
}): Record<string, number> {
  const defaults = getDefaultIngredientCounts(resolvedIngredients);
  return Object.keys(defaults).reduce<Record<string, number>>((acc, ingredientId) => {
    acc[ingredientId] = ingredientId in selectedIngredientCounts
      ? selectedIngredientCounts[ingredientId]
      : defaults[ingredientId];
    return acc;
  }, {});
}

export function resolveSelectedSauceOptions({
  addons,
  selectedSauceCounts,
}: {
  addons?: ResolvedAddonGroups;
  selectedSauceCounts: Record<string, number>;
}): MenuItem[] {
  const sauceOptions = addons?.[sauceRef]?.items ?? [];
  return sauceOptions.flatMap((addon) => Array.from({ length: selectedSauceCounts[addon.name] ?? 0 }, () => addon));
}

export function resolveActiveAddons({
  selectedAddons,
  selectedSauceOptions,
}: {
  selectedAddons: Partial<Record<string, MenuItem>>;
  selectedSauceOptions: MenuItem[];
}): MenuItem[] {
  return [
    ...Object.values(selectedAddons).filter((addon): addon is MenuItem => Boolean(addon && addon.name !== "None")),
    ...selectedSauceOptions,
  ];
}

export function resolveStandardComboSelection({
  comboSides,
  comboDrinks,
  selectedComboSideId,
  selectedComboDrinkId,
  selectedComboSideVariantId,
  selectedComboDrinkVariantId,
}: {
  comboSides: MenuItem[];
  comboDrinks: MenuItem[];
  selectedComboSideId?: string;
  selectedComboDrinkId?: string;
  selectedComboSideVariantId?: string;
  selectedComboDrinkVariantId?: string;
}) {
  const selectedComboSide = comboSides.find((side) => (side.id ?? side.name) === selectedComboSideId);
  const selectedComboDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === selectedComboDrinkId);
  return {
    selectedComboSide,
    selectedComboDrink,
    selectedComboSideVariant: selectedComboSide?.variants?.find((variant) => variant.id === selectedComboSideVariantId),
    selectedComboDrinkVariant: selectedComboDrink?.variants?.find((variant) => variant.id === selectedComboDrinkVariantId),
  };
}

export function buildIngredientCustomizationLabels({
  resolvedIngredients,
  ingredientCounts,
  suppressRemovedIngredientCustomizationsInCart = false,
}: {
  resolvedIngredients: ResolvedPanelIngredient[];
  ingredientCounts: Record<string, number>;
  suppressRemovedIngredientCustomizationsInCart?: boolean;
}): string[] {
  return resolvedIngredients
    .filter((ingredient) => !ingredient.isNoneOption && (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount)
    .flatMap((ingredient) => {
      const ingredientCount = ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
      if (suppressRemovedIngredientCustomizationsInCart && ingredientCount <= 0) return [];
      return [formatIngredientCountCustomizationLabel(ingredient.label, ingredientCount)];
    });
}

export function buildComboCustomizationLabels({
  isComboEligibleCategory,
  comboType,
  selectedComboSide,
  selectedComboSideVariant,
  selectedComboDrink,
  selectedComboDrinkVariant,
}: Parameters<typeof calculateComboNutritionTotals>[0]): string[] {
  return isComboEligibleCategory && comboType === "combo-meal"
    ? [
        "Combo Meal",
        selectedComboSide ? `Side: ${selectedComboSide.name}${selectedComboSideVariant ? ` (${selectedComboSideVariant.label})` : ""}` : undefined,
        selectedComboDrink ? `Drink: ${selectedComboDrink.name}${selectedComboDrinkVariant ? ` (${selectedComboDrinkVariant.label})` : ""}` : undefined,
      ].filter((entry): entry is string => Boolean(entry))
    : [];
}

export function calculateStandardItemNutrition({
  baseNutrition,
  addonTotals,
  ingredientCountTotals,
  comboNutritionTotals,
}: {
  baseNutrition: Nutrition;
  addonTotals: Nutrition;
  ingredientCountTotals: CoreMacros;
  comboNutritionTotals: CoreMacros & Partial<Nutrition>;
}): Nutrition {
  return normalizeNutrition({
    ...baseNutrition,
    calories: sumNutritionWithFallback(baseNutrition.calories, addonTotals.calories + ingredientCountTotals.calories + comboNutritionTotals.calories) ?? 0,
    protein: sumNutritionWithFallback(baseNutrition.protein, addonTotals.protein + ingredientCountTotals.protein + comboNutritionTotals.protein) ?? 0,
    carbs: sumNutritionWithFallback(baseNutrition.carbs, addonTotals.carbs + ingredientCountTotals.carbs + comboNutritionTotals.carbs) ?? 0,
    totalFat: sumNutritionWithFallback(baseNutrition.totalFat, addonTotals.totalFat + ingredientCountTotals.totalFat + comboNutritionTotals.totalFat) ?? 0,
    satFat: sumNutritionWithFallback(baseNutrition.satFat, (addonTotals.satFat ?? 0) + (comboNutritionTotals.satFat ?? 0)),
    transFat: sumNutritionWithFallback(baseNutrition.transFat, (addonTotals.transFat ?? 0) + (comboNutritionTotals.transFat ?? 0)),
    cholesterol: sumNutritionWithFallback(baseNutrition.cholesterol, (addonTotals.cholesterol ?? 0) + (comboNutritionTotals.cholesterol ?? 0)),
    sodium: sumNutritionWithFallback(baseNutrition.sodium, (addonTotals.sodium ?? 0) + (comboNutritionTotals.sodium ?? 0)),
    fiber: sumNutritionWithFallback(baseNutrition.fiber, (addonTotals.fiber ?? 0) + (comboNutritionTotals.fiber ?? 0)),
    sugars: sumNutritionWithFallback(baseNutrition.sugars, (addonTotals.sugars ?? 0) + (comboNutritionTotals.sugars ?? 0)),
  });
}

export function buildStandardCartItemPayload({
  item,
  selectedVariant,
  quantity,
  nutritionPerItem,
  customizations,
  optionSelections,
}: {
  item: MenuItem;
  selectedVariant?: ItemVariant;
  quantity: number;
  nutritionPerItem: Nutrition;
  customizations?: CartCustomization[];
  optionSelections?: CartSelectionOption[];
}) {
  return {
    name: item.name,
    image: selectedVariant?.image ?? item.image,
    variantId: selectedVariant?.id,
    customizations,
    quantity,
    macrosPerItem: {
      calories: nutritionPerItem.calories ?? 0,
      protein: nutritionPerItem.protein ?? 0,
      carbs: nutritionPerItem.carbs ?? 0,
      totalFat: nutritionPerItem.totalFat ?? 0,
    },
    nutritionPerItem,
    selection: { type: "standard" as const, variantId: selectedVariant?.id, optionSelections } satisfies StandardCartSelection,
  };
}

export function resolveStandardItemConfiguration({
  item,
  variants,
  selectedVariantId,
  defaultVariantId,
  resolvedIngredients,
  selectedIngredientCounts,
  selectedAddons,
  selectedSauceCounts,
  addons,
  comboSides,
  comboDrinks,
  isComboEligibleCategory,
  comboType,
  selectedComboSideId,
  selectedComboDrinkId,
  selectedComboSideVariantId,
  selectedComboDrinkVariantId,
  suppressRemovedIngredientCustomizationsInCart,
}: {
  item: MenuItem;
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  defaultVariantId?: string;
  resolvedIngredients: ResolvedPanelIngredient[];
  selectedIngredientCounts: Record<string, number>;
  selectedAddons: Partial<Record<string, MenuItem>>;
  selectedSauceCounts: Record<string, number>;
  addons?: ResolvedAddonGroups;
  comboSides: MenuItem[];
  comboDrinks: MenuItem[];
  isComboEligibleCategory: boolean;
  comboType: ComboType;
  selectedComboSideId?: string;
  selectedComboDrinkId?: string;
  selectedComboSideVariantId?: string;
  selectedComboDrinkVariantId?: string;
  suppressRemovedIngredientCustomizationsInCart?: boolean;
}) {
  const selectedVariant = resolveStandardItemVariant({ variants, selectedVariantId, defaultVariantId });
  const baseNutrition = resolveMenuItemVariantNutrition(item, selectedVariant);
  const ingredientCounts = resolveStandardIngredientCounts({ resolvedIngredients, selectedIngredientCounts });
  const selectedSauceOptions = resolveSelectedSauceOptions({ addons, selectedSauceCounts });
  const activeAddons = resolveActiveAddons({ selectedAddons, selectedSauceOptions });
  const addonTotals = calculateAddonTotals(activeAddons);
  const ingredientCountTotals = calculateIngredientCountTotals(ingredientCounts, resolvedIngredients);
  const comboSelection = resolveStandardComboSelection({ comboSides, comboDrinks, selectedComboSideId, selectedComboDrinkId, selectedComboSideVariantId, selectedComboDrinkVariantId });
  const comboNutritionTotals = calculateFullComboNutritionTotals({ isComboEligibleCategory, comboType, ...comboSelection });
  const nutrition = calculateStandardItemNutrition({ baseNutrition, addonTotals, ingredientCountTotals, comboNutritionTotals });
  const ingredientCustomizationLabels = buildIngredientCustomizationLabels({ resolvedIngredients, ingredientCounts, suppressRemovedIngredientCustomizationsInCart });
  const comboCustomizationLabels = buildComboCustomizationLabels({ isComboEligibleCategory, comboType, ...comboSelection });
  const customizationLabels = [...ingredientCustomizationLabels, ...comboCustomizationLabels];
  const optionSelections = buildStructuredOptionSelections(selectedAddons, selectedSauceCounts, addons);

  return {
    selectedVariant,
    baseNutrition,
    ingredientCounts,
    selectedSauceOptions,
    activeAddons,
    addonTotals,
    ingredientCountTotals,
    comboNutritionTotals,
    ...comboSelection,
    ingredientCustomizationLabels,
    comboCustomizationLabels,
    customizationLabels,
    customizations: customizationLabels.length > 0 ? customizationsFromLabels(customizationLabels) : undefined,
    optionSelections,
    nutrition,
    macrosPerItem: {
      calories: nutrition.calories ?? 0,
      protein: nutrition.protein ?? 0,
      carbs: nutrition.carbs ?? 0,
      totalFat: nutrition.totalFat ?? 0,
    },
  };
}
