import { createHash } from "node:crypto";
import type {
  ComboMealChoiceGroup,
  ComboMealConfig,
  IngredientItem,
  IngredientNutritionContexts,
  IngredientRelationshipNutrition,
  MenuItem,
  RestaurantAddonGroups,
  RestaurantCustomizationRules,
} from "../../types/menu";
import type { SourceRef } from "./contracts";

// Explicit relationships the app already knows how to render. The adapter
// interprets source semantics and supplies draft IDs. Projection owns remapping.
export type ItemRelationships = Pick<MenuItem,
  "comboConfig" | "comboConfigByVariantId" | "addonRefs" | "addonEligible" |
  "ingredientEligible" | "ingredientRef" | "ingredients" | "customization" |
  "customizationByVariantId" | "informationalIngredients" | "proteinExtraByVariantId" |
  "ingredientNutritionContexts" | "variantGroupKind" | "variantGroupLabel"
> & {
  // Variant keys are those of the adapter's source families.
  variantContexts?: Record<string, IngredientNutritionContexts>;
};

export type IngredientRelationships = Pick<IngredientItem,
  "maxQuantity" | "defaultOrder" | "image" | "contextualNutritionUnits" |
  "canonicalIngredientId" | "hideFromIngredientView" | "ingredientViewName" | "ingredientViewImage" |
  "ingredientViewCategories" | "orderingOptionIdByCount" | "orderingGroupIdByCount" | "nutritionDeltaByCount"
>;

export type RuntimeRelationships = {
  items: Record<string, ItemRelationships>;
  ingredients: Record<string, IngredientRelationships>;
  addonGroups: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
};

// Captured graph evidence. Nested source paths and bounds remain reviewable
// even where the app only supports flat groups and known combo shapes.
export type OrderingGraph = {
  source: SourceRef;
  roots: Array<{ name: string; itemIds: string[] }>;
  groups: Array<{
    id: string;
    options: Array<{
      optionIndex: number;
      name: string | null;
      tag: string | null;
      itemClass: string | null;
      itemType: string | null;
      itemGroupType: string | null;
      retailModifiedItemId: string | null;
      referencedItemGroupId: string | null;
      standardizedRecordId: string | null;
      minimum: number | null;
      maximum: number | null;
      thirdPartyMinimum: number | null;
      defaultTag: string | null;
      modifierType: string | null;
      modifierTypeGrouping: string | null;
      selectionRole: string | null;
      modifierNutritionUnit: IngredientRelationshipNutrition | null;
    }>;
  }>;
};

type Remap = {
  item: (id: string) => string;
  ingredient: (id: string) => string;
  variant: (owner: string, id: string) => string;
};

export function remapCombo(config: ComboMealConfig, owner: string, ids: Remap): ComboMealConfig {
  const { item, variant } = ids;
  const entree = config.entreeItemId ?? owner;
  const choiceGroup = (group: ComboMealChoiceGroup): ComboMealChoiceGroup => ({
    ...group,
    options: group.options.map((option) => {
      const { itemId } = option;
      return {
        ...option,
        itemId: item(itemId),
        fixedVariantId: option.fixedVariantId && variant(itemId, option.fixedVariantId),
        allowedVariantIds: option.allowedVariantIds?.map((id) => variant(itemId, id)),
        variantIdByMealSize: option.variantIdByMealSize && Object.fromEntries(
          Object.entries(option.variantIdByMealSize).map(([size, id]) => [size, variant(itemId, id)]),
        ),
      };
    }),
  });
  return {
    ...config,
    entreeItemId: config.entreeItemId && item(config.entreeItemId),
    includedItemIds: config.includedItemIds?.map(item),
    sideOptions: config.sideOptions?.map(item),
    drinkOptions: config.drinkOptions?.map(item),
    upgradeOptions: config.upgradeOptions?.map(item),
    defaultSideId: config.defaultSideId && item(config.defaultSideId),
    defaultDrinkId: config.defaultDrinkId && item(config.defaultDrinkId),
    mealItemIdByEntreeVariantId: config.mealItemIdByEntreeVariantId && Object.fromEntries(
      Object.entries(config.mealItemIdByEntreeVariantId).map(([id, meal]) => [variant(entree, id), item(meal)]),
    ),
    bundleOptions: config.bundleOptions?.map((bundle) => ({
      ...bundle,
      mealItemId: item(bundle.mealItemId),
      components: bundle.components.map((component) => ({
        ...component,
        itemId: item(component.itemId),
        variantId: component.variantId && variant(component.itemId, component.variantId),
      })),
    })),
    sideGroup: config.sideGroup && choiceGroup(config.sideGroup),
    drinkGroup: config.drinkGroup && choiceGroup(config.drinkGroup),
  };
}

export function remapItemRelationships(owner: string, relationships: ItemRelationships, ids: Remap) {
  const { ingredient, variant } = ids;
  const remapContexts = (contexts: IngredientNutritionContexts | undefined) => contexts && Object.fromEntries(
    Object.entries(contexts).map(([id, context]) => [ingredient(id), context]),
  );
  const customization = (value: MenuItem["customization"]) => value && ({
    ...value,
    ingredientCategories: value.ingredientCategories?.map((group) => ({
      ...group,
      ingredients: group.ingredients.map(ingredient),
    })),
  });
  const { variantContexts, ...metadata } = relationships;
  return {
    ...metadata,
    comboConfig: metadata.comboConfig && remapCombo(metadata.comboConfig, owner, ids),
    comboConfigByVariantId: metadata.comboConfigByVariantId && Object.fromEntries(
      Object.entries(metadata.comboConfigByVariantId).map(([id, config]) => [variant(owner, id), remapCombo(config, owner, ids)]),
    ),
    ingredients: metadata.ingredients?.map((reference) => {
      const resolved = ingredient(reference);
      if (resolved !== reference) return resolved;
      const delimiter = reference.lastIndexOf(":");
      return delimiter < 0 ? reference : ingredient(reference.slice(0, delimiter)) + reference.slice(delimiter);
    }),
    ingredientRef: metadata.ingredientRef && ingredient(metadata.ingredientRef),
    informationalIngredients: metadata.informationalIngredients?.map((entry) => ({ ...entry, id: ingredient(entry.id) })),
    customization: customization(metadata.customization),
    customizationByVariantId: metadata.customizationByVariantId && Object.fromEntries(
      Object.entries(metadata.customizationByVariantId).map(([id, value]) => [variant(owner, id), customization(value)!]),
    ),
    proteinExtraByVariantId: metadata.proteinExtraByVariantId && Object.fromEntries(
      Object.entries(metadata.proteinExtraByVariantId).map(([id, extra]) => [variant(owner, id), ingredient(extra)]),
    ),
    ingredientNutritionContexts: remapContexts(metadata.ingredientNutritionContexts),
    variantContexts: variantContexts && Object.fromEntries(
      Object.entries(variantContexts).map(([id, contexts]) => [variant(owner, id), remapContexts(contexts)]),
    ),
  };
}

export function remapOrderingPlan(plan: import("../../types/ordering").OrderingPlan, ids: Remap) {
  const remapGroups = (groups: typeof plan.groups): typeof plan.groups => groups.map((group) => ({
    ...group,
    options: group.options.map((option) => ({
      ...option,
      itemId: option.itemId && (option.role === "ingredient" ? ids.ingredient(option.itemId) : ids.item(option.itemId)),
      variantId: option.itemId && option.variantId ? ids.variant(option.itemId, option.variantId) : option.variantId,
      groups: option.groups && remapGroups(option.groups),
    })),
  }));
  const groups = remapGroups(plan.groups);
  const version = createHash("sha256").update(JSON.stringify([plan.baseNutrition, groups])).digest("hex").slice(0, 16);
  return { ...plan, id: `${plan.id}:${version}`, groups };
}
