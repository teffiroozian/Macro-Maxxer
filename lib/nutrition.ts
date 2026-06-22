import type { MenuItem, Nutrition } from "@/types/menu";

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

export function getDefaultMenuItemNutrition(item: MenuItem): Nutrition {
  const variants = item.variants ?? [];
  const defaultVariant =
    (item.defaultVariantId
      ? variants.find((variant) => variant.id === item.defaultVariantId)
      : undefined) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0];

  return defaultVariant?.nutrition ?? item.nutrition;
}
