import chickfilaMenu from "@/app/data/chickfila.json";
import chipotleMenu from "@/app/data/chipotle.json";
import habitMenu from "@/app/data/habit.json";
import mcdonaldsMenu from "@/app/data/mcdonalds.json";
import modMenu from "@/app/data/mod.json";
import pandaMenu from "@/app/data/panda.json";
import paneraMenu from "@/app/data/panera.json";
import starbucksMenu from "@/app/data/starbucks.json";
import subwayMenu from "@/app/data/subway.json";
import { normalizeAddons } from "@/lib/addons";
import { resolveMenuDataset } from "@/lib/menuResolver";
import type {
  CommonChange,
  IngredientItem,
  MenuItem,
  RestaurantAddons,
  RestaurantCustomizationRules,
  RestaurantMenu,
} from "@/types/menu";

type MenuDataset = RestaurantMenu;

const chickfilaData = resolveMenuDataset(chickfilaMenu as unknown as MenuDataset);
const chipotleData = resolveMenuDataset(chipotleMenu as unknown as MenuDataset);
const habitData = resolveMenuDataset(habitMenu as unknown as MenuDataset);
const mcdonaldsData = resolveMenuDataset(mcdonaldsMenu as unknown as MenuDataset);
const modData = resolveMenuDataset(modMenu as unknown as MenuDataset);
const pandaData = resolveMenuDataset(pandaMenu as unknown as MenuDataset);
const paneraData = resolveMenuDataset(paneraMenu as unknown as MenuDataset);
const starbucksData = resolveMenuDataset(starbucksMenu as unknown as MenuDataset);
const subwayData = resolveMenuDataset(subwayMenu as unknown as MenuDataset);

export const menuLookupByRestaurant: Record<string, MenuItem[]> = {
  chickfila: chickfilaData.items ?? [],
  chipotle: chipotleData.items ?? [],
  habit: habitData.items ?? [],
  mcdonalds: mcdonaldsData.items ?? [],
  mod: modData.items ?? [],
  panda: pandaData.items ?? [],
  panera: paneraData.items ?? [],
  starbucks: starbucksData.items ?? [],
  subway: subwayData.items ?? [],
};

export const addonsLookupByRestaurant: Record<string, RestaurantAddons> = {
  chickfila: normalizeAddons(chickfilaData.addons),
  chipotle: normalizeAddons(chipotleData.addons),
  habit: normalizeAddons(habitData.addons),
  mcdonalds: normalizeAddons(mcdonaldsData.addons),
  mod: normalizeAddons(modData.addons),
  panda: normalizeAddons(pandaData.addons),
  panera: normalizeAddons(paneraData.addons),
  starbucks: normalizeAddons(starbucksData.addons),
  subway: normalizeAddons(subwayData.addons),
};

export const ingredientLookupByRestaurant: Partial<Record<string, IngredientItem[]>> = {
  chickfila: chickfilaData.ingredients,
  chipotle: chipotleData.ingredients,
};

export const commonChangesLookupByRestaurant: Partial<Record<string, CommonChange[]>> = {
  chickfila: chickfilaData.commonChanges,
};

export const customizationRulesLookupByRestaurant: Partial<Record<string, RestaurantCustomizationRules>> = {
  chickfila: chickfilaData.customizationRules,
};
