import type { Nutrition } from "@/types/menu";

type OptionalNutritionKey = Exclude<keyof Nutrition, "calories" | "protein" | "carbs" | "totalFat">;

const OPTIONAL_NUTRITION_KEYS: OptionalNutritionKey[] = [
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
  "extraNutrition",
];

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeExtraNutrition(value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  const entries = Object.entries(value)
    .map(([key, entryValue]) => [key, asFiniteNumber(entryValue)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== undefined);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
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
    if (key === "extraNutrition") {
      const normalizedExtraNutrition = normalizeExtraNutrition(source.extraNutrition);
      if (normalizedExtraNutrition) {
        normalized.extraNutrition = normalizedExtraNutrition;
      }
      continue;
    }

    const value = asFiniteNumber(source[key]);
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}
