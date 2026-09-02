import type { IngredientItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

/**
 * Resolves the official nutrition unit before callers apply quantities or
 * portion multipliers. An invalid explicit selection falls through to the
 * declared default, then to direct parent nutrition.
 */
export function resolveEffectiveIngredientNutrition(
  ingredient: Pick<
    IngredientItem,
    "nutrition" | "variants" | "defaultVariantId"
  >,
  selectedVariantId?: string,
): Nutrition | undefined {
  const explicitlySelected = selectedVariantId
    ? ingredient.variants?.find((variant) => variant.id === selectedVariantId)
    : undefined;
  if (explicitlySelected) return explicitlySelected.nutrition;

  const defaultVariant = ingredient.defaultVariantId
    ? ingredient.variants?.find(
        (variant) => variant.id === ingredient.defaultVariantId,
      )
    : undefined;
  if (defaultVariant) return defaultVariant.nutrition;

  return ingredient.nutrition;
}
