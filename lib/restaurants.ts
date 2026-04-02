import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import { resolveMenuDataset } from "@/lib/menuResolver";
import type { CommonChange, IngredientItem, IngredientModifier, MenuItem, RestaurantAddons, RestaurantBuilderConfig, RestaurantCustomizationRules } from "@/types/menu";

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
  const ingredients = menu.ingredients;
  const items = menu.items;
  return {
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    menuFile: restaurant.menuFile,
    isBuildYourOwn: menu.isBuildYourOwn ?? false,
    items,
    ingredients,
    addons: normalizeAddons(menu.addons),
    commonChanges: (menu.commonChanges ?? []) as CommonChange[],
    ingredientModifiers: (menu.ingredientModifiers ?? []) as IngredientModifier[],
    customizationRules: menu.customizationRules,
    builderConfig: menu.builderConfig,
  };
}

export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}
