export function getOrderCountLabel(count: number) {
  return count === 0 ? "Order" : `Order, ${count} ${count === 1 ? "item" : "items"}`;
}

export function getOrderCountDigit(count: number) {
  return count <= 0 ? "" : count >= 10 ? "9+" : String(count);
}

export function getActiveNativeDestination(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/search") return "search";
  if (pathname === "/cart") return "order";
  if (pathname === "/restaurants" || pathname.startsWith("/restaurant/")) return "restaurants";
  return null;
}

// Browser chrome and small viewport changes must not look like a keyboard.
export function isKeyboardViewportReduced(layoutHeight: number, viewportHeight: number) {
  return layoutHeight - viewportHeight > 150;
}
