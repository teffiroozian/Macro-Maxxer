import type { adaptGeneratedChipotleMenuForRuntime } from "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter";
import type { MenuSourceIdentity, RestaurantMenu } from "@/types/menu";

type GeneratedChipotleInput = Parameters<typeof adaptGeneratedChipotleMenuForRuntime>[0];
type GeneratedSource = NonNullable<GeneratedChipotleInput["items"][number]["source"]>;

// The import pipeline projects a menu in the runtime shape, with provenance
// nested under `source.generated`. The Chipotle runtime adapter reads the
// generated-dataset shape, where that provenance is `source` itself. This
// only moves it back; no record or value is added or changed.
function generatedSource(source: MenuSourceIdentity | undefined): GeneratedSource | undefined {
  const generated = source?.generated;
  if (!generated) return undefined;
  return {
    ...generated,
    restaurantId: Number(generated.restaurantId ?? 0),
    menu: {
      ...generated.menu,
      itemIds: generated.menu.itemIds ?? [],
      itemType: generated.menu.itemType ?? "",
      itemCategory: generated.menu.itemCategory ?? "",
      role: generated.menu.role ?? "",
    },
  };
}

export function toGeneratedChipotleInput(menu: RestaurantMenu): GeneratedChipotleInput {
  return {
    hasBuildYourOwn: menu.hasBuildYourOwn,
    items: menu.items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      categories: item.categories,
      servingType: item.servingType,
      nutrition: item.nutrition,
      variants: item.variants?.map((variant) => ({
        id: variant.id,
        label: variant.label,
        categories: variant.categories,
        nutrition: variant.nutrition,
        source: generatedSource(variant.source),
      })),
      defaultVariantId: item.defaultVariantId,
      defaultOrder: item.defaultOrder,
      ingredients: item.ingredients ?? item.mealPreset?.selections.map(({ itemId, quantity }) =>
        quantity === 0.5 ? `${itemId}:light` : quantity === 2 ? `${itemId}:extra` : itemId),
      mealPreset: item.mealPreset,
      customization: item.customization,
      source: generatedSource(item.source),
    })),
    ingredients: (menu.ingredients ?? []).map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      image: ingredient.image,
      categories: ingredient.categories,
      nutrition: ingredient.nutrition,
      variants: ingredient.variants?.map((variant) => ({
        id: variant.id,
        label: variant.label,
        categories: variant.categories,
        nutrition: variant.nutrition,
        source: generatedSource(variant.source),
      })),
      defaultVariantId: ingredient.defaultVariantId,
      maxQuantity: ingredient.maxQuantity,
      defaultOrder: ingredient.defaultOrder,
      source: generatedSource(ingredient.source),
      hideFromIngredientView: ingredient.hideFromIngredientView,
    })),
    addonGroups: menu.addonGroups,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}
