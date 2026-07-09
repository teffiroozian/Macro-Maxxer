import type { RestaurantBuilderConfig } from "@/types/builder";
import type { IngredientItem, MenuItem, RestaurantAddonGroups, RestaurantCustomizationRules, RestaurantMenu } from "@/types/menu";

// restaurant overall info
export type RestaurantIndexEntry = {
  id: string;
  name: string;
  logo: string;
  cover: string;
  menuFile: string;
  isMacroFriendly: boolean;
  isComingSoon?: boolean;
};

// entire menu file for a restaurant
export type RestaurantData = RestaurantIndexEntry & {
  hasBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addonGroups: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
