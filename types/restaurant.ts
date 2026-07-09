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

// menu content owned by individual restaurant JSON files; identity/metadata live in app/data/index.json.
export type RestaurantMenuContent = RestaurantMenu;

// entire menu file for a restaurant, merged with index.json identity/metadata.
export type RestaurantData = RestaurantIndexEntry & {
  hasBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addonGroups: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
