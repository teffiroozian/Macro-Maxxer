import type { IngredientItem, MenuItem } from "@/types/menu";
import { addNutrition, normalizeNutrition } from "@/lib/nutrition";
import type { Nutrition } from "@/types/nutrition";

type ParsedIngredientEntry = {
  ingredientId: string;
  defaultCount: number;
};

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

  let totals: Nutrition = normalizeNutrition();
  let resolvedCount = 0;

  defaultsById.forEach((count, normalizedId) => {
    const nutrition = getIngredientNutrition(normalizedId, ingredientById, menuItemById);
    if (!nutrition) return;
    resolvedCount += 1;

    totals = addNutrition(totals, nutrition, count);

  });

  if (resolvedCount === 0) return undefined;


  return totals;
}
