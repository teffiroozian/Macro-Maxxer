import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import { resolveMenuDataset } from "@/lib/menuResolver";
import type {
  AddonRef,
  CommonChange,
  IngredientItem,
  IngredientModifier,
  MenuItem,
  RestaurantAddons,
  RestaurantBuilderConfig,
  RestaurantCustomizationRules,
} from "@/types/menu";

export type RestaurantData = {
  id: string;
  name: string;
  logo: string;
  menuFile: string;
  isBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addons: RestaurantAddons;
  commonChanges: CommonChange[];
  ingredientModifiers: IngredientModifier[];
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};

export const ACTIVE_RESTAURANT_IDS = ["chickfila", "chipotle"] as const;

export function getVisibleRestaurants() {
  const visibleIds = new Set<string>(ACTIVE_RESTAURANT_IDS);
  return restaurants.filter((restaurant) => visibleIds.has(restaurant.id));
}

export function toItemSlug(item: MenuItem) {
  const raw = item.id ?? item.name;
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getRestaurantData(id: string): Promise<RestaurantData | null> {
  const restaurant = restaurants.find((entry) => entry.id === id);
  if (!restaurant) return null;

  const menuModule = await import(`@/app/data/${restaurant.menuFile}`);
  const menu = resolveMenuDataset(menuModule.default);
  const ingredients = menu.ingredients ?? [];
  const items = menu.items ?? [];
  const commonChanges: CommonChange[] = menu.commonChanges ?? [];
  const ingredientModifiers: IngredientModifier[] = menu.ingredientModifiers ?? [];
  return {
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    menuFile: restaurant.menuFile,
    isBuildYourOwn: menu.isBuildYourOwn ?? false,
    items,
    ingredients,
    addons: normalizeAddons(menu.addons ?? {}),
    commonChanges,
    ingredientModifiers,
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}

export function buildAddonMenuItems(restaurantId: string, addons?: RestaurantAddons): MenuItem[] {
  if (!addons) return [];

  const categoryByAddonRef: Record<AddonRef, string> = {
    sauces: "Dipping Sauces",
    dressings: "Dressings",
    condiments: "Condiments",
  };

  return (Object.entries(addons) as [AddonRef, NonNullable<RestaurantAddons[AddonRef]>][])
    .flatMap(([addonRef, options]) =>
      options.map((option) => ({
        id: `${restaurantId}-${addonRef}-${option.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: option.name,
        nutrition: {
          calories: option.calories,
          protein: option.protein,
          carbs: option.carbs,
          totalFat: option.totalFat ?? 0,
          satFat: option.satFat,
          transFat: option.transFat,
          cholesterol: option.cholesterol,
          sodium: option.sodium,
          fiber: option.fiber,
          sugars: option.sugars,
        },
        categories: [categoryByAddonRef[addonRef]],
        portionType: "addon",
        image: option.image,
      }))
    );
}
