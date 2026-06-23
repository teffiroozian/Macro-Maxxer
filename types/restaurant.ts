import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem, MenuItem, RestaurantAddons, RestaurantCustomizationRules } from "@/types/menu";

export type RestaurantIndexEntry = {
  id: string;
  name: string;
  logo: string;
  cover: string;
  menuFile: string;
  isMacroFriendly: boolean;
};

export type RestaurantData = RestaurantIndexEntry & {
  hasBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addons: RestaurantAddons;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
