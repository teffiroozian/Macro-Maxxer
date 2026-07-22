import chickfilaMenu from "@/data/restaurants/chickfila.json";
import chipotleMenu from "@/data/restaurants/chipotle.json";
import habitMenu from "@/data/restaurants/habit.json";
import mcdonaldsMenu from "@/data/restaurants/mcdonalds.json";
import modMenu from "@/data/restaurants/mod.json";
import pandaMenu from "@/data/restaurants/panda.json";
import paneraMenu from "@/data/restaurants/panera.json";
import starbucksMenu from "@/data/restaurants/starbucks.json";
import subwayMenu from "@/data/restaurants/subway.json";
import type { CartCustomization, CartItem } from "@/types/cart";
import type { IngredientItem, ItemVariant, MenuItem, RestaurantMenu } from "@/types/menu";

export type CartDetailMenuItem = MenuItem | IngredientItem;

export type ResolvedCartItemDetail = {
  restaurant: RestaurantMenu | null;
  item: CartDetailMenuItem | null;
  variant: ItemVariant | null;
};

const restaurantMenusById: Record<string, RestaurantMenu> = {
  chickfila: chickfilaMenu as RestaurantMenu,
  chipotle: chipotleMenu as RestaurantMenu,
  habit: habitMenu as RestaurantMenu,
  mcdonalds: mcdonaldsMenu as RestaurantMenu,
  mod: modMenu as RestaurantMenu,
  panda: pandaMenu as RestaurantMenu,
  panera: paneraMenu as RestaurantMenu,
  starbucks: starbucksMenu as RestaurantMenu,
  subway: subwayMenu as RestaurantMenu,
};

export function getCartRestaurantMenu(restaurantId: string): RestaurantMenu | null {
  return restaurantMenusById[restaurantId] ?? null;
}

export function getCartCustomizationItemId(customization: CartCustomization) {
  return customization.itemId ?? customization.ingredientId ?? customization.toIngredientId ?? customization.fromIngredientId;
}

export function findCartMenuItem(restaurant: RestaurantMenu, itemId: string): CartDetailMenuItem | null {
  return (
    restaurant.items.find((item) => item.id === itemId) ??
    restaurant.ingredients?.find((ingredient) => ingredient.id === itemId) ??
    null
  );
}

export function resolveCartItemDetails(cartItem: CartItem, customization: CartCustomization): ResolvedCartItemDetail {
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);
  const itemId = getCartCustomizationItemId(customization);
  const item = restaurant && itemId ? findCartMenuItem(restaurant, itemId) : null;
  const variant = item && customization.variantId ? item.variants?.find((candidate) => candidate.id === customization.variantId) ?? null : null;

  return {
    restaurant,
    item,
    variant,
  };
}
