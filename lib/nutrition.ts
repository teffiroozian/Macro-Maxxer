import type { ItemVariant, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

type OptionalNutritionKey = Exclude<keyof Nutrition, "calories" | "protein" | "carbs" | "totalFat">;

const OPTIONAL_NUTRITION_KEYS: OptionalNutritionKey[] = [
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
];

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeNutrition(nutrition?: Partial<Nutrition> | null): Nutrition {
  const source = nutrition ?? {};

  const normalized: Nutrition = {
    calories: asFiniteNumber(source.calories) ?? 0,
    protein: asFiniteNumber(source.protein) ?? 0,
    carbs: asFiniteNumber(source.carbs) ?? 0,
    totalFat: asFiniteNumber(source.totalFat) ?? 0,
  };

  for (const key of OPTIONAL_NUTRITION_KEYS) {
    const value = asFiniteNumber(source[key]);
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function hasNutritionValue(nutrition: Partial<Nutrition> | undefined, key: keyof Nutrition) {
  return nutrition ? Object.prototype.hasOwnProperty.call(nutrition, key) : false;
}

function scaleNutrition(nutrition: Nutrition, multiplier: number): Nutrition {
  return Object.fromEntries(
    Object.entries(nutrition).map(([key, value]) => [key, value * multiplier]),
  ) as Nutrition;
}

export function resolveMenuItemVariantNutrition(
  item: MenuItem,
  variant?: ItemVariant,
): Nutrition {
  if (!variant) {
    return normalizeNutrition(item.nutrition);
  }

  const multiplier = variant.nutritionMultiplier;
  if (typeof multiplier !== "number" || !Number.isFinite(multiplier)) {
    return normalizeNutrition(variant.nutrition);
  }

  const variants = item.variants ?? [];
  const baseVariant =
    (item.defaultVariantId
      ? variants.find(
          (candidate) =>
            candidate.id === item.defaultVariantId && candidate.id !== variant.id,
        )
      : undefined) ?? variants.find((candidate) => candidate.id !== variant.id);
  const scaledNutrition = scaleNutrition(
    normalizeNutrition(baseVariant?.nutrition ?? item.nutrition),
    multiplier,
  );

  for (const key of [
    "calories",
    "protein",
    "carbs",
    "totalFat",
    ...OPTIONAL_NUTRITION_KEYS,
  ] as Array<keyof Nutrition>) {
    if (hasNutritionValue(variant.nutrition, key)) {
      const value = asFiniteNumber(variant.nutrition?.[key]);
      if (value !== undefined) {
        scaledNutrition[key] = value;
      }
    }
  }

  return scaledNutrition;
}

export function getDefaultMenuItemNutrition(item: MenuItem): Nutrition {
  const variants = item.variants ?? [];
  const defaultVariant =
    (item.defaultVariantId
      ? variants.find((variant) => variant.id === item.defaultVariantId)
      : undefined) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0];

  return resolveMenuItemVariantNutrition(item, defaultVariant);
}
