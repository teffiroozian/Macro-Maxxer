import type { ComboMealConfig, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { compareByDefaultOrder, normalizeCategory } from "@/lib/menuItemCalculations";
import {
  isChickfilaBreakfastItem,
  isHashBrowns,
  isWaffleFries,
  sortComboSides,
} from "@/lib/restaurantRules/chickfila";

const zeroComboOptionNutrition: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
};

// Explicit "none" options for combo side/drink selection. Represented as
// real zero-nutrition MenuItems (rather than a special-cased sentinel) so
// selecting them flows through the same nutrition/macro calculation and
// cart-selection logic as any other combo option.
export const NO_SIDE_OPTION: MenuItem = {
  id: "no-side",
  name: "No side",
  image: "none",
  categories: [],
  servingType: "side",
  nutrition: zeroComboOptionNutrition,
  defaultOrder: -1,
};

export const NO_DRINK_OPTION: MenuItem = {
  id: "no-drink",
  name: "No drink",
  image: "none",
  categories: [],
  servingType: "drink",
  nutrition: zeroComboOptionNutrition,
  defaultOrder: -1,
};

function itemKey(item: MenuItem) {
  return item.id ?? item.name;
}

function resolveConfiguredItems(itemIds: string[] | undefined, menuItems: MenuItem[] | undefined) {
  if (!itemIds?.length || !menuItems?.length) return [];
  const itemById = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));
  const canonicalParentByVariantId = new Map<string, MenuItem>();
  const canonicalParentBySourceIdentity = new Map<string, MenuItem | null>();
  const registerSourceIdentity = (key: string, parent: MenuItem) => {
    const existing = canonicalParentBySourceIdentity.get(key);
    canonicalParentBySourceIdentity.set(
      key,
      existing && existing.id !== parent.id ? null : parent,
    );
  };
  menuItems.forEach((menuItem) => {
    if (menuItem.sourceOnly || !menuItem.variants?.length) return;
    menuItem.variants.forEach((variant) => {
      canonicalParentByVariantId.set(variant.id, menuItem);
      variant.source?.menu.tags.forEach((tag) =>
        registerSourceIdentity(`tag:${tag}`, menuItem),
      );
      variant.source?.menu.pins.forEach((pin) =>
        registerSourceIdentity(`pin:${pin}`, menuItem),
      );
    });
  });

  const seen = new Set<string>();
  return itemIds.flatMap((itemId) => {
    const configuredItem = itemById.get(itemId);
    const identityParent = configuredItem?.sourceOnly
      ? configuredItem.source?.menu.tags
          .map((tag) => canonicalParentBySourceIdentity.get(`tag:${tag}`))
          .find((candidate): candidate is MenuItem => Boolean(candidate)) ??
        configuredItem.source?.menu.pins
          .map((pin) => canonicalParentBySourceIdentity.get(`pin:${pin}`))
          .find((candidate): candidate is MenuItem => Boolean(candidate))
      : undefined;
    const item =
      canonicalParentByVariantId.get(itemId) ?? identityParent ?? configuredItem;
    if (!item) return [];
    const key = item.id ?? item.name;
    if (seen.has(key)) return [];
    seen.add(key);
    return [item];
  });
}

function resolveLegacyChickfilaComboConfig(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
): ComboMealConfig | undefined {
  if (restaurantId !== "chickfila") return undefined;

  const allowed = new Set(["sandwich", "chicken", "salad", "wrap", "breakfast"]);
  if (!item.categories.some((category) => allowed.has(normalizeCategory(category)))) return undefined;

  const breakfastComboItem = isChickfilaBreakfastItem(restaurantId, item);
  const sideOptions = sortComboSides(
    (menuItems ?? []).filter((menuItem) => {
      const normalizedCategories = menuItem.categories.map((category) => normalizeCategory(category));
      if (!breakfastComboItem) return normalizedCategories.includes("side");
      if (isWaffleFries(menuItem)) return false;
      return normalizedCategories.includes("side") || isHashBrowns(menuItem);
    }),
    breakfastComboItem
  ).map(itemKey);

  const drinkOptions = (menuItems ?? [])
    .filter((menuItem) => menuItem.categories.some((category) => normalizeCategory(category) === "drinks"))
    .sort(compareByDefaultOrder)
    .map(itemKey);

  return {
    entreeItemId: item.id,
    sideOptions,
    drinkOptions,
  };
}

// Generated datasets can model a meal as its own bundle record (e.g. a
// "cfa-group-*" combo item) that points back at the entree via
// `comboConfig.entreeItemId`, rather than attaching `comboConfig` directly to
// the entree itself. These bundle records are `sourceOnly` (excluded from
// browsable listings, see MenuItem.sourceOnly) but still present in the
// unfiltered `menuItems` passed around for relationship lookups, so this is a
// safe, restaurant-agnostic way to recover the official relationship.
function resolveLinkedComboConfig(item: MenuItem, menuItems: MenuItem[] | undefined) {
  return menuItems?.find((menuItem) => menuItem.comboConfig?.entreeItemId === item.id)?.comboConfig;
}

export function resolveComboMealConfig(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
): ComboMealConfig | undefined {
  const generatedConfig = item.comboConfig ?? resolveLinkedComboConfig(item, menuItems);
  if (generatedConfig) return generatedConfig;

  // Generated Chick-fil-A records must be eligible only when the official
  // source graph links the entree to a meal container. Keep the legacy
  // category fallback solely for the old hand-authored dataset.
  if (restaurantId === "chickfila" && item.id.startsWith("cfa-")) {
    return undefined;
  }

  return resolveLegacyChickfilaComboConfig(restaurantId, item, menuItems);
}

export function isComboMealEligible(restaurantId: string, item: MenuItem, menuItems: MenuItem[] | undefined) {
  return Boolean(resolveComboMealConfig(restaurantId, item, menuItems));
}

export function resolveComboSideOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems);
  const options = resolveConfiguredItems(config?.sideOptions, menuItems);
  return options.length > 0 ? [NO_SIDE_OPTION, ...options] : options;
}

export function resolveComboDrinkOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems);
  const options = resolveConfiguredItems(config?.drinkOptions, menuItems);
  return options.length > 0 ? [NO_DRINK_OPTION, ...options] : options;
}
