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

// Individual restaurant JSON files contain menu content only.
// app/data/index.json is the source of truth for identity/metadata, and the loader merges both shapes into RestaurantData.
export type RestaurantMenuFile = RestaurantMenu;

// full restaurant data consumed by pages/components after index metadata and menu content are merged
export type RestaurantData = RestaurantIndexEntry & {
  hasBuildYourOwn: boolean;
  items: MenuItem[];
  ingredients: IngredientItem[];
  addonGroups: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
