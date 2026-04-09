import type { IngredientItem, MenuItem, Nutrition } from "@/types/menu";

type ParsedIngredientEntry = {
  ingredientId: string;
  defaultCount: number;
};

const NUTRITION_KEYS: Array<keyof Nutrition> = [
  "calories",
  "protein",
  "carbs",
  "totalFat",
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
];

function toNutritionNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseIngredientPortion(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "light") return 0.5;
  if (normalized === "extra") return 2;
  return 1;
}

export function parseIncludedIngredientEntry(entry: string): ParsedIngredientEntry | null {
  const [rawId, rawPortion] = entry.split(":");
  const ingredientId = rawId?.trim();
  if (!ingredientId) return null;

  return {
    ingredientId,
    defaultCount: parseIngredientPortion(rawPortion),
  };
}

export function resolveIncludedIngredientDefaults(ingredientEntries: string[] = []) {
  const defaultCounts = new Map<string, number>();

  ingredientEntries.forEach((entry) => {
    const parsed = parseIncludedIngredientEntry(entry);
    if (!parsed) return;
    defaultCounts.set(parsed.ingredientId.toLowerCase(), parsed.defaultCount);
  });

  return defaultCounts;
}

function getIngredientNutrition(
  ingredientId: string,
  ingredientById: Map<string, IngredientItem>,
  menuItemById: Map<string, MenuItem>
) {
  const normalizedId = ingredientId.toLowerCase();
  const ingredientMatch = ingredientById.get(normalizedId);
  if (ingredientMatch?.nutrition) return ingredientMatch.nutrition;

  const menuItemMatch = menuItemById.get(normalizedId);
  if (menuItemMatch?.nutrition) return menuItemMatch.nutrition;

  if (menuItemMatch?.ingredientRef) {
    return ingredientById.get(menuItemMatch.ingredientRef.toLowerCase())?.nutrition;
  }

  return undefined;
}

export function computeNutritionFromIncludedIngredients(options: {
  ingredientEntries?: string[];
  ingredientById: Map<string, IngredientItem>;
  menuItemById?: Map<string, MenuItem>;
}) {
  const { ingredientEntries = [], ingredientById, menuItemById = new Map<string, MenuItem>() } = options;
  const defaultsById = resolveIncludedIngredientDefaults(ingredientEntries);
  if (defaultsById.size === 0) return undefined;

  const totals: Nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    totalFat: 0,
  };
  const extraNutritionTotals: Record<string, number> = {};
  let resolvedCount = 0;

  defaultsById.forEach((count, normalizedId) => {
    const nutrition = getIngredientNutrition(normalizedId, ingredientById, menuItemById);
    if (!nutrition) return;
    resolvedCount += 1;

    NUTRITION_KEYS.forEach((key) => {
      const current = totals[key];
      const nextValue = toNutritionNumber(nutrition[key]) * count;
      totals[key] = (current ?? 0) + nextValue;
    });

    Object.entries(nutrition.extraNutrition ?? {}).forEach(([key, value]) => {
      extraNutritionTotals[key] = (extraNutritionTotals[key] ?? 0) + toNutritionNumber(value) * count;
    });
  });

  if (resolvedCount === 0) return undefined;

  if (Object.keys(extraNutritionTotals).length > 0) {
    totals.extraNutrition = extraNutritionTotals;
  }

  return totals;
}
