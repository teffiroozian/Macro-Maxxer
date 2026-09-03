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
  // Short, functional supporting copy shown in the restaurant page header —
  // not marketing copy, just what the page is and why the data is useful.
  description?: string;
  // Official nutrition page URL, shown as a linked credit in the restaurant
  // page header so the numbers feel verifiable. Optional and added per
  // restaurant as real URLs are confirmed.
  nutritionSourceUrl?: string;
  // ISO 8601 string for when the nutrition data was last updated — either a
  // bare date ("2026-07-18") or, once a future nutrition import system can
  // capture it, a full timestamp ("2026-07-18T14:32:00Z"). The ISO format
  // allows a real timestamp to replace a bare date later without a field/type
  // change — display logic should still only show a time when one is actually
  // present in the value.
  lastUpdated?: string;
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
