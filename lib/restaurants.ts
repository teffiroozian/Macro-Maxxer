import restaurants from "@/app/data/index.json";
import { normalizeAddons } from "@/lib/addons";
import type {
  CommonChange,
  IngredientItem,
  IngredientModifier,
  MenuItem,
  RestaurantAddons,
} from "@/types/menu";

export type RestaurantData = {
  id: string;
  name: string;
  logo: string;
  menuFile: string;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addons: RestaurantAddons;
  commonChanges: CommonChange[];
  ingredientModifiers: IngredientModifier[];
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

  const menu = await import(`@/app/data/${restaurant.menuFile}`);
  return {
    id: restaurant.id,
    name: restaurant.name,
    logo: restaurant.logo,
    menuFile: restaurant.menuFile,
    items: menu.default.items as MenuItem[],
    ingredients: (menu.default.ingredients ?? []) as IngredientItem[],
    addons: normalizeAddons(menu.default.addons),
    commonChanges: (menu.default.commonChanges ?? []) as CommonChange[],
    ingredientModifiers: (menu.default.ingredientModifiers ?? []) as IngredientModifier[],
  };
}

export function getItemBySlug(items: MenuItem[], slug: string) {
  return items.find((item) => toItemSlug(item) === slug);
}
