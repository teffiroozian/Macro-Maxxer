import type { IngredientItem, MenuItem, RestaurantMenu } from "@/types/menu";
import { computeNutritionFromIncludedIngredients } from "@/lib/itemIngredients";

type FlatLegacyMenuItem = Omit<Partial<MenuItem>, "nutrition"> & {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  totalFat?: number;
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
  nutrition?: MenuItem["nutrition"];
  [key: string]: unknown;
};

const CORE_NUTRITION_KEYS = new Set([
  "calories",
  "protein",
  "carbs",
  "fat",
  "totalFat",
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
  "extraNutrition",
]);

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractExtraNutrition(item: FlatLegacyMenuItem) {
  const entries = Object.entries(item)
    .filter(([key, value]) => !CORE_NUTRITION_KEYS.has(key) && typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => [key, value as number] as const);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function normalizeMenuItem(item: FlatLegacyMenuItem): MenuItem {
  const rest = { ...item } as Omit<FlatLegacyMenuItem, "nutrition">;
  delete rest.calories;
  delete rest.protein;
  delete rest.carbs;
  delete rest.fat;
  delete rest.totalFat;
  delete rest.satFat;
  delete rest.transFat;
  delete rest.cholesterol;
  delete rest.sodium;
  delete rest.fiber;
  delete rest.sugars;
  const baseNutrition = item.nutrition ?? { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
  const extraNutrition = {
    ...(baseNutrition.extraNutrition ?? {}),
    ...(extractExtraNutrition(item) ?? {}),
  };
  const nutrition = {
    ...baseNutrition,
    calories: toNumber(item.calories) ?? baseNutrition.calories ?? 0,
    protein: toNumber(item.protein) ?? baseNutrition.protein ?? 0,
    carbs: toNumber(item.carbs) ?? baseNutrition.carbs ?? 0,
    totalFat: toNumber(item.totalFat ?? item.fat) ?? baseNutrition.totalFat ?? 0,
    satFat: toNumber(item.satFat) ?? baseNutrition.satFat,
    transFat: toNumber(item.transFat) ?? baseNutrition.transFat,
    cholesterol: toNumber(item.cholesterol) ?? baseNutrition.cholesterol,
    sodium: toNumber(item.sodium) ?? baseNutrition.sodium,
    fiber: toNumber(item.fiber) ?? baseNutrition.fiber,
    sugars: toNumber(item.sugars) ?? baseNutrition.sugars,
    extraNutrition: Object.keys(extraNutrition).length > 0 ? extraNutrition : undefined,
  };

  return {
    ...rest,
    nutrition,
    portionType: item.portionType,
    categories: item.categories ?? ["Other"],
  };
}

function normalizeMenuItems(items: FlatLegacyMenuItem[]): MenuItem[] {
  return items.map(normalizeMenuItem);
}

function hasMeaningfulNutrition(nutrition?: MenuItem["nutrition"]) {
  if (!nutrition) return false;
  return [
    nutrition.calories,
    nutrition.protein,
    nutrition.carbs,
    nutrition.totalFat,
    nutrition.satFat,
    nutrition.transFat,
    nutrition.cholesterol,
    nutrition.sodium,
    nutrition.fiber,
    nutrition.sugars,
  ].some((value) => typeof value === "number" && value > 0);
}

function resolveIngredientBackedItems(items: MenuItem[], ingredients: IngredientItem[]): MenuItem[] {
  const ingredientById = new Map(
    ingredients
      .filter((ingredient): ingredient is IngredientItem & { id: string } => Boolean(ingredient.id))
      .map((ingredient) => [ingredient.id.toLowerCase(), ingredient]),
  );
  const menuItemById = new Map(
    items
      .filter((item): item is MenuItem & { id: string } => Boolean(item.id))
      .map((item) => [item.id.toLowerCase(), item]),
  );

  return items.map((item) => {
    const nutritionFromIncludedIngredients = computeNutritionFromIncludedIngredients({
      ingredientEntries: item.ingredients,
      ingredientById,
      menuItemById,
    });

    if (!item.ingredientRef) {
      if (!nutritionFromIncludedIngredients) return item;
      return {
        ...item,
        nutrition: nutritionFromIncludedIngredients,
      };
    }

    const ingredient = ingredientById.get(item.ingredientRef.toLowerCase());
    if (!ingredient) {
      if (!nutritionFromIncludedIngredients) return item;
      return {
        ...item,
        nutrition: nutritionFromIncludedIngredients,
      };
    }

    return {
      ...item,
      nutrition:
        nutritionFromIncludedIngredients
        ?? (hasMeaningfulNutrition(item.nutrition) ? item.nutrition : ingredient.nutrition),
      image: item.image ?? ingredient.image,
    };
  });
}

export function resolveMenuDataset(menu: RestaurantMenu | unknown): RestaurantMenu {
  const dataset = menu as RestaurantMenu;
  const ingredients = (dataset.ingredients ?? []) as IngredientItem[];
  const normalizedItems = normalizeMenuItems((dataset.items ?? []) as FlatLegacyMenuItem[]);

  return {
    ...dataset,
    items: resolveIngredientBackedItems(normalizedItems, ingredients),
    ingredients,
  };
}
