// DATA LOADER FILE

import restaurants from "@/app/data/index.json";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import type { RestaurantData, RestaurantIndexEntry } from "@/types/restaurant";
import { computeNutritionFromIncludedIngredients } from "@/lib/itemIngredients";
import { normalizeNutrition } from "@/lib/nutrition";

// gives restaurant data the RestaurantIndexEntry shape
const restaurantIndex = restaurants as RestaurantIndexEntry[];

// gives other files access to the restaurant list
export function getAllRestaurants(): RestaurantIndexEntry[] {
  return restaurantIndex;
}

// turns a string into a URL-safe slug
function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// takes a menu item and turns it into a URL-safe slug
export function toItemSlug(item: MenuItem) {
  return toSlug(item.id ?? item.name);
}

function scaleNutrition(nutrition: Nutrition, multiplier = 1): Nutrition {
  return {
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier),
    carbs: Math.round(nutrition.carbs * multiplier),
    totalFat: Math.round(nutrition.totalFat * multiplier),
    satFat: nutrition.satFat === undefined ? undefined : Math.round(nutrition.satFat * multiplier * 10) / 10,
    transFat: nutrition.transFat === undefined ? undefined : Math.round(nutrition.transFat * multiplier * 10) / 10,
    cholesterol: nutrition.cholesterol === undefined ? undefined : Math.round(nutrition.cholesterol * multiplier),
    sodium: nutrition.sodium === undefined ? undefined : Math.round(nutrition.sodium * multiplier),
    fiber: nutrition.fiber === undefined ? undefined : Math.round(nutrition.fiber * multiplier),
    sugars: nutrition.sugars === undefined ? undefined : Math.round(nutrition.sugars * multiplier),
  };
}

function getDefaultVariantNutrition(item: MenuItem) {
  const variants = item.variants ?? [];
  const defaultVariant =
    (item.defaultVariantId
      ? variants.find((variant) => variant.id === item.defaultVariantId)
      : undefined) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0];

  return defaultVariant?.nutrition;
}

function resolveMenuItemNutrition(items: MenuItem[], ingredients: IngredientItem[]): MenuItem[] {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id.toLowerCase(), ingredient]));
  const resolvedById = new Map<string, MenuItem>();

  function resolveIngredientRef(ref: string | undefined, multiplier = 1) {
    if (!ref) return undefined;
    const ingredient = ingredientById.get(ref.toLowerCase());
    return ingredient ? scaleNutrition(ingredient.nutrition, multiplier) : undefined;
  }

  function resolveItem(item: MenuItem): MenuItem {
    const cached = resolvedById.get(item.id.toLowerCase());
    if (cached) return cached;

    const variants = item.variants?.map((variant) => ({
      ...variant,
      nutrition:
        variant.nutrition ??
        resolveIngredientRef(variant.ingredientRef ?? item.ingredientRef, variant.nutritionMultiplier ?? item.nutritionMultiplier ?? 1) ??
        normalizeNutrition(),
    }));

    const itemWithVariants = { ...item, variants } as MenuItem;
    resolvedById.set(item.id.toLowerCase(), itemWithVariants);

    const menuItemById = new Map([...items.map((menuItem) => [menuItem.id.toLowerCase(), menuItem] as const), ...resolvedById]);
    const resolvedNutrition =
      item.nutrition ??
      getDefaultVariantNutrition(itemWithVariants) ??
      resolveIngredientRef(item.ingredientRef, item.nutritionMultiplier ?? 1) ??
      computeNutritionFromIncludedIngredients({
        ingredientEntries: item.ingredients,
        ingredientById,
        menuItemById,
      }) ??
      normalizeNutrition();

    const resolvedItem = {
      ...itemWithVariants,
      nutrition: normalizeNutrition(resolvedNutrition),
    };
    resolvedById.set(item.id.toLowerCase(), resolvedItem);
    return resolvedItem;
  }

  return items.map(resolveItem);
}

// takes the restaurant id from the URL and loads its full menu data
export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  // searches in index json file for restaurant
  const restaurant = restaurantIndex.find((entry) => entry.id === id);
  if (!restaurant) return null;

  // dynamically loads the one it needs based on the selected restaurant
  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  const menu = menuModule.default;

  // pulling important pieces out of the menu
  const rawItems = menu.items ?? [];
  const ingredients = menu.ingredients ?? [];
  const items = resolveMenuItemNutrition(rawItems, ingredients);
  const addonGroups = menu.addonGroups ?? {};
  const hasBuildYourOwn = menu.hasBuildYourOwn ?? false;

  // return one clean restaurant object that merges index.json + [restaurant].json
  return {
    // restaurant index file data
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    cover: restaurant.cover,
    menuFile: restaurant.menuFile,
    isMacroFriendly: restaurant.isMacroFriendly,
    isComingSoon: restaurant.isComingSoon,
    // menu file data
    hasBuildYourOwn,
    items,
    ingredients,
    addonGroups,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

// finds a menu item based on the URL slug from the list
export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}
