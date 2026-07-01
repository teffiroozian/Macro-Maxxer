import chickfilaMenu from "@/app/data/chickfila.json";
import chipotleMenu from "@/app/data/chipotle.json";
import habitMenu from "@/app/data/habit.json";
import mcdonaldsMenu from "@/app/data/mcdonalds.json";
import modMenu from "@/app/data/mod.json";
import pandaMenu from "@/app/data/panda.json";
import paneraMenu from "@/app/data/panera.json";
import starbucksMenu from "@/app/data/starbucks.json";
import subwayMenu from "@/app/data/subway.json";
import type { IngredientItem, MenuItem, RestaurantAddonGroups, RestaurantCustomizationRules, RestaurantMenu } from "@/types/menu";

const chickfilaData = chickfilaMenu as unknown as RestaurantMenu;
const chipotleData = chipotleMenu as unknown as RestaurantMenu;
const habitData = habitMenu as unknown as RestaurantMenu;
const mcdonaldsData = mcdonaldsMenu as unknown as RestaurantMenu;
const modData = modMenu as unknown as RestaurantMenu;
const pandaData = pandaMenu as unknown as RestaurantMenu;
const paneraData = paneraMenu as unknown as RestaurantMenu;
const starbucksData = starbucksMenu as unknown as RestaurantMenu;
const subwayData = subwayMenu as unknown as RestaurantMenu;

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

export const addonGroupsLookupByRestaurant: Record<string, RestaurantAddonGroups> = {
  chickfila: chickfilaData.addonGroups ?? {},
  chipotle: chipotleData.addonGroups ?? {},
  habit: habitData.addonGroups ?? {},
  mcdonalds: mcdonaldsData.addonGroups ?? {},
  mod: modData.addonGroups ?? {},
  panda: pandaData.addonGroups ?? {},
  panera: paneraData.addonGroups ?? {},
  starbucks: starbucksData.addonGroups ?? {},
  subway: subwayData.addonGroups ?? {},
};

export const ingredientLookupByRestaurant: Partial<Record<string, IngredientItem[]>> = {
  chickfila: chickfilaData.ingredients,
  chipotle: chipotleData.ingredients,
};


export const customizationRulesLookupByRestaurant: Partial<Record<string, RestaurantCustomizationRules>> = {
  chickfila: chickfilaData.customizationRules,
};
