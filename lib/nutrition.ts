import type { ItemVariant, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

export type CoreNutritionKey = "calories" | "protein" | "carbs" | "totalFat";
type OptionalNutritionKey = Exclude<keyof Nutrition, CoreNutritionKey>;

export type NutritionDataQuality = {
  isPartial: boolean;
  missingCoreFields: CoreNutritionKey[];
};

export const CORE_NUTRITION_KEYS: CoreNutritionKey[] = ["calories", "protein", "carbs", "totalFat"];

const OPTIONAL_NUTRITION_KEYS: OptionalNutritionKey[] = [
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
];

export const NUTRITION_KEYS: Array<keyof Nutrition> = [
  ...CORE_NUTRITION_KEYS,
  ...OPTIONAL_NUTRITION_KEYS,
];

export function asFiniteNutritionNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hasNutritionValue(nutrition: Partial<Nutrition> | undefined, key: keyof Nutrition) {
  return nutrition ? Object.prototype.hasOwnProperty.call(nutrition, key) : false;
}

export function getProteinPer100Calories(protein: number, calories: number) {
  return calories > 0 ? (protein / calories) * 100 : undefined;
}

export function addNutritionValues(baseValue?: number, deltaValue?: number) {
  if (baseValue === undefined && deltaValue === undefined) return undefined;
  return (baseValue ?? 0) + (deltaValue ?? 0);
}

export function addNutrition(total: Nutrition, next: Partial<Nutrition> | undefined, multiplier = 1): Nutrition {
  const sum: Nutrition = { ...total };

  for (const key of NUTRITION_KEYS) {
    const value = asFiniteNutritionNumber(next?.[key]);
    if (value === undefined) continue;
    sum[key] = (sum[key] ?? 0) + value * multiplier;
  }

  return sum;
}

export function scaleNutrition(nutrition: Partial<Nutrition> | undefined, multiplier: number): Nutrition {
  const normalized = normalizeNutrition(nutrition);

  return Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => [key, value * multiplier]),
  ) as Nutrition;
}

export function getNutritionDataQuality(nutrition?: Partial<Nutrition> | null): NutritionDataQuality {
  const source = nutrition ?? undefined;
  const missingCoreFields = CORE_NUTRITION_KEYS.filter(
    (key) => !hasNutritionValue(source, key) || asFiniteNutritionNumber(source?.[key]) === undefined,
  );

  return {
    isPartial: missingCoreFields.length > 0,
    missingCoreFields,
  };
}

/**
 * Converts nutrition data into the complete shape the UI expects.
 *
 * Missing or non-finite core values are converted to 0 for UI safety. A displayed
 * 0 can therefore mean "missing data" rather than a confirmed true zero. Use
 * getNutritionDataQuality before normalizing when callers need to preserve that
 * distinction.
 */
export function normalizeNutrition(nutrition?: Partial<Nutrition> | null): Nutrition {
  const source = nutrition ?? {};

  const normalized: Nutrition = {
    calories: asFiniteNutritionNumber(source.calories) ?? 0,
    protein: asFiniteNutritionNumber(source.protein) ?? 0,
    carbs: asFiniteNutritionNumber(source.carbs) ?? 0,
    totalFat: asFiniteNutritionNumber(source.totalFat) ?? 0,
  };

  for (const key of OPTIONAL_NUTRITION_KEYS) {
    const value = asFiniteNutritionNumber(source[key]);
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
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
  const scaledNutrition = scaleNutrition(baseVariant?.nutrition ?? item.nutrition, multiplier);

  for (const key of NUTRITION_KEYS) {
    if (hasNutritionValue(variant.nutrition, key)) {
      const value = asFiniteNutritionNumber(variant.nutrition?.[key]);
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
    variants[0];

  return resolveMenuItemVariantNutrition(item, defaultVariant);
}
