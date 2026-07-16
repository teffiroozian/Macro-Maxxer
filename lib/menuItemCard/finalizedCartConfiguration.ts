import type { CartCustomization, CartSelection, CartSelectionOption } from "@/types/cart";
import type { IngredientItem, ItemVariant, MenuItem, ResolvedAddonGroups } from "@/types/menu";
import type { CoreMacros, Nutrition } from "@/types/nutrition";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";
import { customizationsFromLabels } from "@/lib/cart/customizationLabels";
import {
  resolveStandardItemConfiguration,
  type ComboType,
} from "@/lib/cart/standardItemConfiguration";
import {
  buildHighProteinBuildConfiguration,
  isChipotleHighProteinMenuItem,
} from "@/lib/restaurantBuilders/chipotle/highProtein";
import { toUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";

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

  const highProteinBuildConfiguration = isChipotleHighProteinMenuItem(item, restaurantId)
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
  const customizations = customizationLabels.length > 0 ? customizationsFromLabels(customizationLabels) : undefined;
  const nutritionPerItem = standardConfiguration.nutrition;
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
