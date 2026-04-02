import type { IngredientItem, MenuItem, RestaurantMenu } from "@/types/menu";

type FlatLegacyMenuItem = Omit<Partial<MenuItem>, "nutrition"> & {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  totalFat?: number;
  nutrition?: MenuItem["nutrition"];
};

function isLegacyFlatItem(item: FlatLegacyMenuItem): item is FlatLegacyMenuItem & {
  calories?: number;
  nutrition?: undefined;
} {
  return item.nutrition == null && item.calories != null;
}

function normalizeMenuItem(item: FlatLegacyMenuItem): MenuItem {
  const baseNutrition = item.nutrition ?? {};
  const nutrition = isLegacyFlatItem(item)
    ? {
        ...baseNutrition,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        totalFat: item.totalFat,
      }
    : baseNutrition;

  return {
    ...item,
    nutrition,
    portionType: item.portionType ?? "single",
    categories: item.categories ?? ["Other"],
  };
}

function normalizeMenuItems(items: FlatLegacyMenuItem[]): MenuItem[] {
  return items.map(normalizeMenuItem);
}

function resolveIngredientBackedItems(items: MenuItem[], ingredients: IngredientItem[]): MenuItem[] {
  const ingredientById = new Map(
    ingredients
      .filter((ingredient): ingredient is IngredientItem & { id: string } => Boolean(ingredient.id))
      .map((ingredient) => [ingredient.id, ingredient]),
  );

  return items.map((item) => {
    if (!item.ingredientRef) return item;

    const ingredient = ingredientById.get(item.ingredientRef);
    if (!ingredient) return item;

    return {
      ...item,
      nutrition: item.nutrition ?? ingredient.nutrition,
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
