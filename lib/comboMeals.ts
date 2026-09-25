import type { ComboMealChoiceGroup, ComboMealConfig, MenuItem } from "@/types/menu";
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

function resolveChoiceGroupItems(group: ComboMealChoiceGroup | undefined, menuItems: MenuItem[] | undefined) {
  if (!group) return [];
  return group.options.flatMap((option) =>
    resolveConfiguredItems([option.itemId], menuItems).map((item) => {
      const comboOrdering = group.orderingGroupId && option.orderingOptionId
        ? { groupId: group.orderingGroupId, optionId: option.orderingOptionId }
        : undefined;
      const configuredVariantIds = [
        ...(option.allowedVariantIds ?? []),
        ...(option.fixedVariantId ? [option.fixedVariantId] : []),
        ...Object.values(option.variantIdByMealSize ?? {}).filter((id): id is string => Boolean(id)),
      ];
      if (!configuredVariantIds.length) return comboOrdering ? { ...item, comboOrdering } : item;
      const allowedVariantIds = new Set(configuredVariantIds);
      const variants = item.variants?.filter((variant) => allowedVariantIds.has(variant.id)) ?? [];
      return {
        ...item,
        variants,
        defaultVariantId: variants[0]?.id,
        ...(comboOrdering ? { comboOrdering } : {}),
      };
    }),
  );
}

export function resolveComboChoiceVariantId({
  config,
  role,
  itemId,
  mealSize,
}: {
  config: ComboMealConfig | undefined;
  role: "side" | "drink";
  itemId: string | undefined;
  mealSize: "medium" | "large";
}) {
  if (!itemId) return undefined;
  const group = role === "side" ? config?.sideGroup : config?.drinkGroup;
  const option = group?.options.find((candidate) => candidate.itemId === itemId);
  return option?.variantIdByMealSize?.[mealSize] ?? option?.fixedVariantId;
}

export function comboMealSizeFromSideVariant(side: MenuItem | undefined, variantId: string | undefined) {
  const label = side?.variants?.find((variant) => variant.id === variantId)?.label.toLowerCase();
  return label === "large" ? "large" as const : "medium" as const;
}

function isChoiceGroupSelectionComplete(
  group: ComboMealChoiceGroup | undefined,
  selectedItemId: string | undefined,
  selectedVariantId: string | undefined,
) {
  if (!group) return true;
  if (!group.required && group.minSelections === 0 && !selectedItemId) return true;
  if (!selectedItemId) return false;
  const option = group.options.find((candidate) => candidate.itemId === selectedItemId);
  if (!option) return false;
  const configuredVariantIds = [
    ...(option.allowedVariantIds ?? []),
    ...(option.fixedVariantId ? [option.fixedVariantId] : []),
    ...Object.values(option.variantIdByMealSize ?? {}).filter((id): id is string => Boolean(id)),
  ];
  return configuredVariantIds.length === 0 || Boolean(
    selectedVariantId && configuredVariantIds.includes(selectedVariantId),
  );
}

export function isComboMealSelectionComplete({
  config,
  comboType,
  selectedSideId,
  selectedSideVariantId,
  selectedDrinkId,
  selectedDrinkVariantId,
  selectedBundleId,
}: {
  config: ComboMealConfig | undefined;
  comboType: "just-item" | "combo-meal";
  selectedSideId?: string;
  selectedSideVariantId?: string;
  selectedDrinkId?: string;
  selectedDrinkVariantId?: string;
  selectedBundleId?: string;
}) {
  if (comboType !== "combo-meal") return true;
  if (!config) return false;
  if (config.bundleOptions?.length && !config.bundleOptions.some((option) => option.id === selectedBundleId)) return false;
  if (config.sizeGroup && !selectedSideVariantId) return false;
  return isChoiceGroupSelectionComplete(config.sideGroup, selectedSideId, selectedSideVariantId) &&
    isChoiceGroupSelectionComplete(config.drinkGroup, selectedDrinkId, selectedDrinkVariantId);
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
  menuItems: MenuItem[] | undefined,
  selectedVariantId?: string,
): ComboMealConfig | undefined {
  const variantConfig = selectedVariantId ? item.comboConfigByVariantId?.[selectedVariantId] : undefined;
  const generatedConfig = variantConfig ?? item.comboConfig ?? resolveLinkedComboConfig(item, menuItems);
  if (generatedConfig) {
    const variantMealMap = generatedConfig.mealItemIdByEntreeVariantId;
    if (variantMealMap && selectedVariantId && !variantMealMap[selectedVariantId]) return undefined;
    return generatedConfig;
  }

  // Generated Chick-fil-A records must be eligible only when the official
  // source graph links the entree to a meal container. Keep the legacy
  // category fallback solely for the old hand-authored dataset.
  if (restaurantId === "chickfila" && item.id.startsWith("cfa-")) {
    return undefined;
  }

  return resolveLegacyChickfilaComboConfig(restaurantId, item, menuItems);
}

export function isComboMealEligible(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined,
  selectedVariantId?: string,
) {
  return Boolean(resolveComboMealConfig(restaurantId, item, menuItems, selectedVariantId));
}

export function resolveComboSideOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined,
  selectedVariantId?: string,
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems, selectedVariantId);
  if (config?.sideGroup) {
    return resolveChoiceGroupItems(config.sideGroup, menuItems).map((side) => {
      if (!side.comboOrdering || !config.sizeGroup) return side;
      const mealSizeOptionIdByVariantId = Object.fromEntries(
        (side.variants ?? []).flatMap((variant) => {
          const size = variant.label.toLowerCase();
          const sizeOption = config.sizeGroup?.options.find((option) => option.id === size);
          return sizeOption ? [[variant.id, sizeOption.orderingOptionId]] : [];
        }),
      );
      return {
        ...side,
        comboOrdering: {
          ...side.comboOrdering,
          mealSizeGroupId: config.sizeGroup.orderingGroupId,
          mealSizeOptionIdByVariantId,
        },
      };
    });
  }
  const options = resolveConfiguredItems(config?.sideOptions, menuItems);
  return options.length > 0 ? [NO_SIDE_OPTION, ...options] : options;
}

export function resolveComboDrinkOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined,
  selectedVariantId?: string,
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems, selectedVariantId);
  if (config?.drinkGroup) {
    return resolveChoiceGroupItems(config.drinkGroup, menuItems);
  }
  const options = resolveConfiguredItems(config?.drinkOptions, menuItems);
  return options.length > 0 ? [NO_DRINK_OPTION, ...options] : options;
}

export function resolveComboBundleOptions(
  restaurantId: string,
  item: MenuItem,
  menuItems: MenuItem[] | undefined,
  selectedVariantId?: string,
) {
  const config = resolveComboMealConfig(restaurantId, item, menuItems, selectedVariantId);
  if (!config?.bundleOptions?.length || !menuItems?.length) return [];
  const byId = new Map(menuItems.map((candidate) => [candidate.id, candidate]));
  return config.bundleOptions.flatMap((option, index) => {
    const meal = byId.get(option.mealItemId);
    const included = option.components.map((component) => byId.get(component.itemId)).filter((value): value is MenuItem => Boolean(value));
    if (!meal || included.length !== option.components.length) return [];
    return [{
      id: option.id,
      name: option.label,
      image: meal.image,
      categories: item.categories,
      servingType: "combo" as const,
      nutrition: included.reduce((sum, item, componentIndex) => {
        const configuredComponent = option.components[componentIndex];
        const componentNutrition = item.variants?.find((variant) => variant.id === configuredComponent.variantId)?.nutrition ?? item.nutrition;
        return {
        calories: sum.calories + componentNutrition.calories,
        protein: sum.protein + componentNutrition.protein,
        carbs: sum.carbs + componentNutrition.carbs,
        totalFat: sum.totalFat + componentNutrition.totalFat,
      }; }, { calories: 0, protein: 0, carbs: 0, totalFat: 0 }),
      defaultOrder: index,
      source: { menu: { tags: [], pins: [] }, generated: {
        provider: "McDonald's",
        menu: {
          role: "required_bundle_components",
          mealItemId: option.mealItemId,
          bundleComponents: option.components.map((component) => ({
            ...component,
            label: byId.get(component.itemId)?.name,
          })),
        },
      } },
    } satisfies MenuItem];
  });
}

export function resolveComboBundleIncludedItems(
  config: ComboMealConfig | undefined,
  bundleId: string | undefined,
  menuItems: MenuItem[] | undefined,
) {
  if (!bundleId || !menuItems) return [];
  const option = config?.bundleOptions?.find((candidate) => candidate.id === bundleId);
  if (!option) return [];
  const byId = new Map(menuItems.map((candidate) => [candidate.id, candidate]));
  return option.components.map((component) => byId.get(component.itemId)).filter((value): value is MenuItem => Boolean(value));
}
