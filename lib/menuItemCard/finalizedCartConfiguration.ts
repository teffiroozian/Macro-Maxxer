import type { CartCustomization, CartSelection, CartSelectionOption } from "@/types/cart";
import type { IngredientItem, ItemVariant, MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { CoreMacros, Nutrition } from "@/types/nutrition";
import type { ResolvedPanelIngredient } from "@/lib/itemDetails/types";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import {
  resolveStandardItemConfiguration,
  type ComboType,
} from "@/lib/cart/standardItemConfiguration";
import {
  buildHighProteinBuildConfiguration,
  isChipotleEditablePresetBuildItem,
  isChipotleProteinCupItem,
} from "@/lib/restaurantBuilders/chipotle/highProtein";
import { toUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";
import { calculateChipotleBuildNutrition } from "@/lib/restaurantBuilders/chipotle/nutrition";
import { getNutritionDataQuality } from "@/lib/nutrition";

export type CartConfigurationPayload = {
  variantId?: string;
  image?: string;
  customizations?: CartCustomization[];
  macrosPerItem: CoreMacros;
};

export type FinalizedCartConfigurationInput = {
  restaurantId: string;
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
  retainedCustomizationLabels?: string[];
  ingredientItems?: IngredientItem[];
};

function macrosFromNutrition(nutrition: Nutrition): CoreMacros {
  return {
    calories: nutrition.calories ?? 0,
    protein: nutrition.protein ?? 0,
    carbs: nutrition.carbs ?? 0,
    totalFat: nutrition.totalFat ?? 0,
  };
}

export function resolveFinalizedCartConfiguration({
  restaurantId,
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
  retainedCustomizationLabels = [],
  ingredientItems,
}: FinalizedCartConfigurationInput) {
  const standardConfiguration = resolveStandardItemConfiguration({
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
  });

  const highProteinBuildConfiguration = isChipotleEditablePresetBuildItem(item, restaurantId)
    ? buildHighProteinBuildConfiguration(item, ingredientItems)
    : undefined;
  const selection: CartSelection = highProteinBuildConfiguration
    ? { type: "build-your-own", buildConfiguration: toUniversalChipotleBuildConfiguration(highProteinBuildConfiguration) }
    : {
        type: "standard",
        variantId: standardConfiguration.selectedVariant?.id,
        optionSelections: standardConfiguration.optionSelections,
      };
  const customizationLabels = [
    ...retainedCustomizationLabels,
    ...standardConfiguration.customizationLabels,
  ];
  // standardConfiguration.customizations already carries the combo
  // side/drink selections as structured data (real itemId/variantId) rather
  // than display labels — only retainedCustomizationLabels (arbitrary
  // leftover labels with no structured source) need the label round-trip.
  const combinedCustomizations = [
    ...(customizationsFromLabels(retainedCustomizationLabels) ?? []),
    ...(standardConfiguration.customizations ?? []),
  ];
  const customizations = combinedCustomizations.length > 0 ? combinedCustomizations : undefined;
  // Editable prebuilt/preset builds (e.g. High Protein Meal bowls/burritos)
  // are not trustworthy from the item's own hardcoded nutrition field —
  // their real totals come from summing the actual configured ingredients,
  // the same way the modal and cart do (see calculateChipotleBuildNutrition).
  // Protein Cups and standard items always use their own JSON nutrition.
  if (process.env.NODE_ENV !== "production" && isChipotleProteinCupItem(item, restaurantId)) {
    const quality = getNutritionDataQuality(item.nutrition);
    if (quality.isPartial) {
      console.warn(
        `[nutrition] Protein Cup "${item.id ?? item.name}" is missing nutrition field(s): ${quality.missingCoreFields.join(", ")}. Falling back to 0 for those fields instead of calculating from ingredients.`
      );
    }
  }
  const nutritionPerItem = highProteinBuildConfiguration
    ? calculateChipotleBuildNutrition(highProteinBuildConfiguration, ingredientItems ?? [])
    : standardConfiguration.nutrition;
  const macrosPerItem = macrosFromNutrition(nutritionPerItem);

  return {
    ...standardConfiguration,
    customizationLabels,
    customizations,
    highProteinBuildConfiguration,
    selection,
    nutritionPerItem,
    macrosPerItem,
    duplicateMatchingConfiguration: {
      variantId: standardConfiguration.selectedVariant?.id,
      optionSelections: standardConfiguration.optionSelections as CartSelectionOption[] | undefined,
      customizations,
    },
    cartConfigurationPayload: {
      variantId: standardConfiguration.selectedVariant?.id,
      customizations,
      image: standardConfiguration.selectedVariant?.image ?? item.image,
      macrosPerItem,
    } satisfies CartConfigurationPayload,
  };
}
