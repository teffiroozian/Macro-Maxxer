import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const uniqueItems = (items: CartItem[]) =>
  items.filter((item, index) => items.findIndex((o) => o.restaurantId === item.restaurantId && o.itemId === item.itemId) === index);

export const orderPhotos = (items: CartItem[]) => uniqueItems(items).filter((item) => item.image).slice(0, 3);

export const orderItemNames = (items: CartItem[]) => [...new Set(items.map((item) => item.name))].join(", ");

export function orderPlaceName(items: CartItem[], restaurants: RestaurantIndexEntry[]) {
  const ids = [...new Set(items.map((item) => item.restaurantId))];
  return ids.length > 1 ? `${ids.length} restaurants` : restaurants.find((r) => r.id === ids[0])?.name ?? "Restaurant";
}

export function formatOrderDate(timestamp: number, now = Date.now()) {
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}
