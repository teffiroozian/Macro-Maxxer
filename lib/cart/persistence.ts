import type { CartItem } from "@/types/cart";

export const CART_STORAGE_KEY = "macro-maxxer:cart";
const CART_STORAGE_VERSION = 1;

type PersistedCart = {
  version: typeof CART_STORAGE_VERSION;
  items: CartItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasFiniteCoreMacros(value: unknown) {
  if (!isRecord(value)) return false;
  return ["calories", "protein", "carbs", "totalFat"].every((key) =>
    typeof value[key] === "number" && Number.isFinite(value[key]),
  );
}

function hasValidSelection(value: unknown) {
  if (!isRecord(value)) return false;
  if (value.type === "standard") {
    return value.optionSelections === undefined || Array.isArray(value.optionSelections);
  }
  if (value.type !== "build-your-own" || !isRecord(value.buildConfiguration)) return false;
  return Array.isArray(value.buildConfiguration.ingredients);
}

function isPersistableCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.restaurantId === "string" && value.restaurantId.length > 0 &&
    typeof value.itemId === "string" && value.itemId.length > 0 &&
    typeof value.name === "string" &&
    typeof value.image === "string" &&
    typeof value.quantity === "number" && Number.isFinite(value.quantity) && value.quantity > 0 &&
    hasFiniteCoreMacros(value.macrosPerItem) &&
    hasFiniteCoreMacros(value.nutritionPerItem) &&
    hasValidSelection(value.selection)
  );
}

export function serializeCartItems(items: CartItem[]) {
  const payload: PersistedCart = {
    version: CART_STORAGE_VERSION,
    items,
  };
  return JSON.stringify(payload);
}

/**
 * Returns null when the payload itself is unreadable/unsupported. Individual
 * bad items are omitted so one stale record cannot destroy the rest of a cart.
 */
export function deserializeCartItems(serialized: string): CartItem[] | null {
  try {
    const payload: unknown = JSON.parse(serialized);
    if (!isRecord(payload) || payload.version !== CART_STORAGE_VERSION || !Array.isArray(payload.items)) {
      return null;
    }
    return payload.items.filter(isPersistableCartItem);
  } catch {
    return null;
  }
}
