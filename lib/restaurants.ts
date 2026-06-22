import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import type {
  IngredientItem,
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
  hasBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addons: RestaurantAddons;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};

export const ACTIVE_RESTAURANT_IDS = ["chickfila", "chipotle"] as const;

export function getAllRestaurants() {
  return restaurants;
}

export function getVisibleRestaurants() {
  return getAllRestaurants();
}

export function isRestaurantAvailable(restaurantId: string) {
  return ACTIVE_RESTAURANT_IDS.includes(restaurantId as (typeof ACTIVE_RESTAURANT_IDS)[number]);
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
  const menu = menuModule.default;
  const ingredients = menu.ingredients ?? [];
  const items = menu.items ?? [];
  return {
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    menuFile: restaurant.menuFile,
    hasBuildYourOwn:
      menu.hasBuildYourOwn ?? (menu as { isBuildYourOwn?: boolean }).isBuildYourOwn ?? false,
    items,
    ingredients,
    addons: normalizeAddons(menu.addons ?? {}),
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}

export function buildAddonMenuItems(restaurantId: string, addons?: RestaurantAddons): MenuItem[] {
  if (!addons) return [];

  const categoryByAddonGroup: Record<string, string> = {
    sauces: "Dipping Sauces",
    dressings: "Dressings",
    condiments: "Condiments",
  };

  return (Object.entries(addons) as [string, NonNullable<RestaurantAddons[string]>][])
    .flatMap(([addonRef, options]) =>
      options.map((option) => ({
        id: `${restaurantId}-${addonRef}-${option.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: option.name,
        defaultOrder: 0,
        nutrition: {
          calories: option.nutrition.calories,
          protein: option.nutrition.protein,
          carbs: option.nutrition.carbs,
          totalFat: option.nutrition.totalFat ?? 0,
          satFat: option.nutrition.satFat,
          transFat: option.nutrition.transFat,
          cholesterol: option.nutrition.cholesterol,
          sodium: option.nutrition.sodium,
          fiber: option.nutrition.fiber,
          sugars: option.nutrition.sugars,
        },
        categories: [categoryByAddonGroup[addonRef]],
        servingType: "addon",
        image: option.image ?? "",
      }))
    );
}
