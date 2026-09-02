type GtagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFunction;
  }
}

function sendGaEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackRestaurantView({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string;
  restaurantName: string;
}) {
  sendGaEvent("restaurant_view", {
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
  });
}

export function trackMenuItemView({
  restaurantId,
  restaurantName,
  itemId,
  itemName,
  category,
}: {
  restaurantId: string;
  restaurantName: string;
  itemId: string;
  itemName: string;
  category?: string;
}) {
  sendGaEvent("menu_item_view", {
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    item_id: itemId,
    item_name: itemName,
    category,
  });
}
