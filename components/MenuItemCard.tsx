"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  IngredientItem,
  MacroDelta,
  MenuItem,
  RestaurantAddons,
  RestaurantCustomizationRules,
} from "@/types/menu";
import { useCart } from "@/stores/cartStore";
import ItemDetailsPanel, { type ResolvedPanelIngredient, resolvePanelIngredients } from "./ItemDetailsPanel";
import VariantSelector from "./VariantSelector";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatMacro(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—g" : `${value}g`;
}

function formatCalories(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : String(value);
}

function sumNutrition(base?: number, delta = 0) {
  if (base === undefined) return undefined;
  return base + delta;
}

function formatCommonChangeForCart(label: string) {
  const [firstSegment] = label.split("→");
  const normalized = firstSegment.trim();

  if (!normalized) {
    return label;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}


function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function addonFat(addon?: AddonOption) {
  return addon?.totalFat ?? addon?.fat ?? 0;
}

function deltaFat(change: CommonChange) {
  return change.delta.totalFat ?? change.delta.fat ?? 0;
}

function getApplicableCommonChanges(item: MenuItem, commonChanges?: CommonChange[]) {
  if (!commonChanges || commonChanges.length === 0) return [];
  const itemCategories = new Set(
    (item.categories ?? []).map((category) => normalizeCategory(category))
  );
  return commonChanges.filter((change) => {
    const categories = change.appliesTo?.categories;
    if (!categories || categories.length === 0) return false;
    return categories.some((category) => itemCategories.has(normalizeCategory(category)));
  });
}

const emptyAddon: AddonOption = {
  name: "None",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  image: "none",
};

const sauceRef: AddonRef = "sauces";
const maxSauceSelections = 5;

type CartConfigurationPayload = {
  variantId?: string;
  variantLabel?: string;
  image?: string;
  optionsLabel?: string;
  customizations?: string[];
  macrosPerItem: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

function parseOptionLabelCounts(optionsLabel?: string) {
  const counts: Record<string, number> = {};

  for (const rawSegment of (optionsLabel ?? "").split("+")) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    const match = segment.match(/^(.*?)(?:\s*x(\d+))?$/i);
    const name = match?.[1]?.trim() ?? segment;
    const quantity = Number(match?.[2] ?? "1");
    if (!name) continue;

    counts[name] = (counts[name] ?? 0) + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }

  return counts;
}

function getSelectedAddonsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  if (!optionsLabel) return {} as Partial<Record<AddonRef, AddonOption>>;

  const selectedCounts = parseOptionLabelCounts(optionsLabel);
  const selectedMap: Partial<Record<AddonRef, AddonOption>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (ref === sauceRef) continue;
    const options = addons?.[ref] ?? [];
    const matched = options.find((addon) => (selectedCounts[addon.name] ?? 0) > 0);
    if (matched) {
      selectedMap[ref] = matched;
    }
  }

  return selectedMap;
}

function getSelectedSauceCountsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  const selectedCounts = parseOptionLabelCounts(optionsLabel);
  const sauceOptions = addons?.[sauceRef] ?? [];

  if (!(item.addonRefs ?? []).includes(sauceRef) || sauceOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return sauceOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedCounts[addon.name] ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}

function getSelectedCommonChangeIdsFromCustomizations(
  commonChanges: CommonChange[] | undefined,
  customizations: string[] | undefined
) {
  if (!commonChanges || commonChanges.length === 0 || !customizations || customizations.length === 0) {
    return [];
  }

  const normalizedCustomizations = new Set(customizations.map((label) => label.replace(/^\+\s*/, "").trim().toLowerCase()));

  return commonChanges
    .filter((change) => {
      const normalizedLabel = change.label.trim().toLowerCase();
      const normalizedCartLabel = formatCommonChangeForCart(change.label).trim().toLowerCase();
      return normalizedCustomizations.has(normalizedLabel) || normalizedCustomizations.has(normalizedCartLabel);
    })
    .map((change) => change.id);
}

function formatIngredientCountCustomizationLabel(ingredientName: string, count: number) {
  return count === 0 ? `${ingredientName}: Removed` : `${ingredientName}: ${count}x`;
}

function getDefaultIngredientCounts(
  resolvedIngredients: ResolvedPanelIngredient[]
) {
  return resolvedIngredients.reduce<Record<string, number>>((acc, ingredient) => {
    acc[ingredient.id] = ingredient.defaultCount;
    return acc;
  }, {});
}

function getSelectedIngredientCountsFromCustomizations(
  resolvedIngredients: ResolvedPanelIngredient[],
  customizations: string[] | undefined
) {
  const baseCounts = getDefaultIngredientCounts(resolvedIngredients);

  if (!customizations || customizations.length === 0) {
    return baseCounts;
  }

  const ingredientLookup = new Map<string, string>();
  resolvedIngredients.forEach((ingredient) => {
    ingredientLookup.set(ingredient.id.trim().toLowerCase(), ingredient.id);
    ingredientLookup.set(ingredient.label.trim().toLowerCase(), ingredient.id);
  });

  return customizations.reduce<Record<string, number>>((acc, label) => {
    const match = label.match(/^(.*?):\s*(Removed|(\d+)x|Remove|Extra)$/i);
    if (!match) return acc;

    const ingredientKey = match[1].trim().toLowerCase();
    const ingredientId = ingredientLookup.get(ingredientKey);
    if (!ingredientId || !(ingredientId in baseCounts)) return acc;

    const rawValue = match[2].trim().toLowerCase();
    const nextCount =
      rawValue === "removed" || rawValue === "remove"
        ? 0
        : rawValue === "extra"
          ? 2
          : Number.parseInt(match[3] ?? "", 10);

    if (!Number.isFinite(nextCount)) return acc;

    acc[ingredientId] = nextCount;
    return acc;
  }, { ...baseCounts });
}

export default function MenuItemCard({
  restaurantId,
  item,
  rankIndex,
  isTopRanked,
  addons,
  ingredientItems,
  menuItems,
  customizationRules,
  commonChanges,
  mode = "menu",
  cartQuantity = 1,
  onCartIncrement,
  onCartDecrement,
  cartSummaryLine,
  cartItemId,
  initialCartVariantId,
  initialCartOptionsLabel,
  initialCartCustomizations,
  onCartConfigurationChange,
  itemHref,
  displayMode = "default",
  isIngredientSelected: controlledIngredientSelected,
  isIngredientLocked = false,
  isIngredientUnavailable = false,
  ingredientUnavailableReason,
  onIngredientSelectionChange,
  ingredientSelectionControl = "checkbox",
  ingredientRadioGroupName,
  ingredientVariantOptions,
  selectedIngredientVariantId,
  ingredientPortionBadge,
  ingredientPortionModeOptions,
  selectedIngredientPortionModeId,
  onIngredientPortionModeChange,
  onIngredientVariantChange,
  flattenIngredientListInDetails = false,
}: {
  restaurantId: string;
  item: MenuItem;
  rankIndex?: number;
  isTopRanked?: boolean;
  addons?: RestaurantAddons;
  ingredientItems?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
  commonChanges?: CommonChange[];
  mode?: "menu" | "cart";
  cartQuantity?: number;
  onCartIncrement?: () => void;
  onCartDecrement?: () => void;
  cartSummaryLine?: string;
  cartItemId?: string;
  initialCartVariantId?: string;
  initialCartOptionsLabel?: string;
  initialCartCustomizations?: string[];
  onCartConfigurationChange?: (next: CartConfigurationPayload) => void;
  itemHref?: string;
  displayMode?: "default" | "ingredient-compact";
  isIngredientSelected?: boolean;
  isIngredientLocked?: boolean;
  isIngredientUnavailable?: boolean;
  ingredientUnavailableReason?: string;
  onIngredientSelectionChange?: (item: MenuItem, selected: boolean) => void;
  ingredientSelectionControl?: "checkbox" | "radio";
  ingredientRadioGroupName?: string;
  ingredientVariantOptions?: Array<{ id: string; label: string }>;
  selectedIngredientVariantId?: string;
  ingredientPortionBadge?: string;
  ingredientPortionModeOptions?: Array<{ id: string; label: string; disabled?: boolean }>;
  selectedIngredientPortionModeId?: string;
  onIngredientPortionModeChange?: (modeId: string) => void;
  onIngredientVariantChange?: (variantId: string) => void;
  flattenIngredientListInDetails?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const id = useId();
  const variants = item.variants?.length ? item.variants : null;
  const hasVariantDropdown = Boolean(variants && variants.length > 1 && !item.hideVariantSelector);
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialCartVariantId ?? defaultVariantId);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>(() =>
    mode === "cart" ? getSelectedAddonsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    mode === "cart" ? getSelectedSauceCountsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>(() =>
    mode === "cart" ? getSelectedCommonChangeIdsFromCustomizations(commonChanges, initialCartCustomizations) : []
  );
  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const [isIngredientSelected, setIsIngredientSelected] = useState(controlledIngredientSelected ?? false);
  const { items, addItem, updateQuantity } = useCart();
  const effectiveSelectedVariantId =
    displayMode === "ingredient-compact" && selectedIngredientVariantId
      ? selectedIngredientVariantId
      : selectedVariantId;
  const selectedVariant = variants?.find((variant) => variant.id === effectiveSelectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;

  const applicableCommonChanges = useMemo(
    () => getApplicableCommonChanges(item, commonChanges),
    [item, commonChanges]
  );

  const resolvedIngredients = useMemo(
    () => resolvePanelIngredients(item, ingredientItems, addons, menuItems ?? [], variants, selectedVariantId, customizationRules),
    [addons, customizationRules, ingredientItems, item, menuItems, selectedVariantId, variants]
  );
  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(() =>
    getSelectedIngredientCountsFromCustomizations(
      resolvedIngredients,
      mode === "cart" ? initialCartCustomizations : undefined
    )
  );

  const ingredientLookup = useMemo(() => {
    const lookup = new Map<string, (typeof resolvedIngredients)[number]>();

    resolvedIngredients.forEach((ingredient) => {
      lookup.set(ingredient.id, ingredient);
      lookup.set(ingredient.id.toLowerCase(), ingredient);
      lookup.set(ingredient.label.toLowerCase(), ingredient);
    });

    return lookup;
  }, [resolvedIngredients]);

  const ingredientCounts = useMemo(() => {
    const defaults = getDefaultIngredientCounts(resolvedIngredients);
    return Object.keys(defaults).reduce<Record<string, number>>((acc, ingredientId) => {
      acc[ingredientId] = ingredientId in selectedIngredientCounts
        ? selectedIngredientCounts[ingredientId]
        : defaults[ingredientId];
      return acc;
    }, {});
  }, [resolvedIngredients, selectedIngredientCounts]);
  const selectedSauceOptions = useMemo(() => {
    const sauceOptions = addons?.[sauceRef] ?? [];
    return sauceOptions.flatMap((addon) => Array.from({ length: selectedSauceCounts[addon.name] ?? 0 }, () => addon));
  }, [addons, selectedSauceCounts]);

  const addonTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          fat: sum.fat + addonFat(addon),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [selectedAddons, selectedSauceOptions]
  );

  const addonNutritionTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          totalFat: sum.totalFat + addonFat(addon),
          satFat: sum.satFat + (addon?.satFat ?? 0),
          transFat: sum.transFat + (addon?.transFat ?? 0),
          cholesterol: sum.cholesterol + (addon?.cholesterol ?? 0),
          sodium: sum.sodium + (addon?.sodium ?? 0),
          fiber: sum.fiber + (addon?.fiber ?? 0),
          sugars: sum.sugars + (addon?.sugars ?? 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          totalFat: 0,
          satFat: 0,
          transFat: 0,
          cholesterol: 0,
          sodium: 0,
          fiber: 0,
          sugars: 0,
        }
      ),
    [selectedAddons, selectedSauceOptions]
  );

  const commonChangeTotals = useMemo(
    () =>
      applicableCommonChanges.reduce<MacroDelta>(
        (sum, change) => {
          if (!selectedCommonChangeIds.includes(change.id)) return sum;
          return {
            calories: sum.calories + change.delta.calories,
            protein: sum.protein + change.delta.protein,
            carbs: sum.carbs + change.delta.carbs,
            fat: sum.fat + deltaFat(change),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const ingredientCountTotals = useMemo(
    () =>
      Object.entries(ingredientCounts).reduce<MacroDelta>(
        (sum, [ingredientId, count]) => {
          const ingredient =
            ingredientLookup.get(ingredientId) ??
            ingredientLookup.get(ingredientId.toLowerCase());

          if (!ingredient) return sum;
          const countDelta = count - ingredient.defaultCount;
          if (countDelta === 0) return sum;

          return {
            calories: sum.calories + (ingredient.nutrition.calories ?? 0) * countDelta,
            protein: sum.protein + (ingredient.nutrition.protein ?? 0) * countDelta,
            carbs: sum.carbs + (ingredient.nutrition.carbs ?? 0) * countDelta,
            fat: sum.fat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [ingredientCounts, ingredientLookup]
  );

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs,
      fat: addonTotals.fat + commonChangeTotals.fat + ingredientCountTotals.fat,
    }),
    [addonTotals, commonChangeTotals, ingredientCountTotals]
  );

  const hasMods = useMemo(
    () =>
      Object.values(selectedAddons).some((addon) => addon && addon.name !== "None") ||
      Object.values(selectedSauceCounts).some((count) => count > 0) ||
      selectedCommonChangeIds.length > 0 ||
      resolvedIngredients.some((ingredient) => (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount),
    [ingredientCounts, resolvedIngredients, selectedAddons, selectedCommonChangeIds, selectedSauceCounts]
  );

  const hasActiveCustomization = hasMods;

  function resetMods() {
    setSelectedAddons({});
    setSelectedSauceCounts({});
    setSelectedCommonChangeIds([]);
    setSelectedIngredientCounts(getDefaultIngredientCounts(resolvedIngredients));
  }

  function addNutritionValue(baseValue?: number, deltaValue?: number) {
    if (baseValue === undefined && deltaValue === undefined) return undefined;
    return (baseValue ?? 0) + (deltaValue ?? 0);
  }

  const nutrition = {
    ...baseNutrition,
    calories: sumNutrition(baseNutrition.calories, addonNutritionTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories),
    protein: sumNutrition(baseNutrition.protein, addonNutritionTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein),
    carbs: sumNutrition(baseNutrition.carbs, addonNutritionTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs),
    totalFat: sumNutrition(baseNutrition.totalFat, addonNutritionTotals.totalFat + commonChangeTotals.fat + ingredientCountTotals.fat),
    satFat: addNutritionValue(baseNutrition.satFat, addonNutritionTotals.satFat),
    transFat: addNutritionValue(baseNutrition.transFat, addonNutritionTotals.transFat),
    cholesterol: addNutritionValue(baseNutrition.cholesterol, addonNutritionTotals.cholesterol),
    sodium: addNutritionValue(baseNutrition.sodium, addonNutritionTotals.sodium),
    fiber: addNutritionValue(baseNutrition.fiber, addonNutritionTotals.fiber),
    sugars: addNutritionValue(baseNutrition.sugars, addonNutritionTotals.sugars),
  };

  const calories = nutrition.calories;
  const protein = nutrition.protein;
  const carbs = nutrition.carbs;
  const fat = nutrition.totalFat;

  const rankText = typeof rankIndex === "number" ? pad2(rankIndex + 1) : null;
  const isCartMode = mode === "cart";

  const selectedCommonChanges = useMemo(
    () => applicableCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const retainedCustomizations = useMemo(() => {
    if (!initialCartCustomizations || initialCartCustomizations.length === 0) return [];

    const addonNames = new Set<string>();
    for (const ref of item.addonRefs ?? []) {
      for (const addon of addons?.[ref] ?? []) {
        addonNames.add(addon.name);
      }
    }

    const commonChangeLabels = new Set((commonChanges ?? []).flatMap((change) => [
      change.label.replace(/^\+\s*/, "").trim(),
      formatCommonChangeForCart(change.label).replace(/^\+\s*/, "").trim(),
    ]));
    const ingredientLabels = new Set(
      resolvedIngredients
        .filter((ingredient) => !ingredient.isNoneOption)
        .map((ingredient) => ingredient.label.toLowerCase())
    );

    return initialCartCustomizations.filter((label) => {
      const normalized = label.replace(/^\+\s*/, "").trim();
      const ingredientMatch = normalized.match(/^(.*?):\s*(Removed|(\d+)x|Remove|Extra)$/i);
      const isIngredientCustomization =
        ingredientMatch ? ingredientLabels.has(ingredientMatch[1].trim().toLowerCase()) : false;

      return !addonNames.has(normalized) && !commonChangeLabels.has(normalized) && !isIngredientCustomization;
    });
  }, [addons, commonChanges, initialCartCustomizations, item.addonRefs, resolvedIngredients]);

  const optionsLabel = useMemo(() => {
    const dressingSegments = Object.values(selectedAddons)
      .filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None"))
      .map((addon) => addon.name);
    const sauceSegments = Object.entries(selectedSauceCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => (count === 1 ? name : `${name} x${count}`));

    const segments = [...dressingSegments, ...sauceSegments];
    return segments.length > 0 ? segments.join(" + ") : undefined;
  }, [selectedAddons, selectedSauceCounts]);

  const customizations = useMemo(() => {
    const modifierLabels = selectedCommonChanges.map((change) => formatCommonChangeForCart(change.label));
    const ingredientCountLabels = resolvedIngredients
      .filter((ingredient) => !ingredient.isNoneOption && (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount)
      .flatMap((ingredient) => {
        const ingredientCount = ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
        return [formatIngredientCountCustomizationLabel(ingredient.label, ingredientCount)];
      });

    const labels = [...modifierLabels, ...ingredientCountLabels];
    return labels.length > 0 ? labels : undefined;
  }, [ingredientCounts, resolvedIngredients, selectedCommonChanges]);

  const selectedVariantForCart = useMemo(() => {
    if (!variants || variants.length === 0) return undefined;
    const bySelected = variants.find((variant) => variant.id === selectedVariantId);
    if (bySelected) return bySelected;
    if (defaultVariantId) {
      const byDefault = variants.find((variant) => variant.id === defaultVariantId);
      if (byDefault) return byDefault;
    }
    return variants[0];
  }, [defaultVariantId, selectedVariantId, variants]);

  const matchingCartItem = useMemo(() => {
    if (isCartMode) return undefined;

    const customizationSignature = (customizations ?? []).join("|");

    return items.find((cartItem) => {
      if (cartItem.restaurantId !== restaurantId) return false;
      if (cartItem.itemId !== (item.id ?? item.name)) return false;
      if ((cartItem.variantId ?? "") !== (selectedVariantForCart?.id ?? "")) return false;
      if ((cartItem.optionsLabel ?? "") !== (optionsLabel ?? "")) return false;
      return (cartItem.customizations ?? []).join("|") === customizationSignature;
    });
  }, [
    customizations,
    isCartMode,
    item.id,
    item.name,
    items,
    optionsLabel,
    restaurantId,
    selectedVariantForCart?.id,
  ]);

  const emitCartConfiguration = (
    nextVariantId: string,
    nextAddons: Partial<Record<AddonRef, AddonOption>>,
    nextSauceCounts: Record<string, number>,
    nextSelectedCommonChangeIds: string[] = selectedCommonChangeIds,
    nextSelectedIngredientCounts: Record<string, number> = ingredientCounts
  ) => {
    if (!isCartMode || !onCartConfigurationChange || !cartItemId) return;

    const activeVariant = variants?.find((variant) => variant.id === nextVariantId) ?? selectedVariantForCart;
    const baseForCart = activeVariant?.nutrition ?? item.nutrition;
    const sauceOptions = addons?.[sauceRef] ?? [];
    const expandedSauces = sauceOptions.flatMap((addon) =>
      Array.from({ length: nextSauceCounts[addon.name] ?? 0 }, () => addon)
    );
    const activeAddons = [
      ...Object.values(nextAddons).filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None")),
      ...expandedSauces,
    ];
    const addonTotalsForCart = activeAddons.reduce(
      (sum, addon) => ({
        calories: sum.calories + (addon.calories ?? 0),
        protein: sum.protein + (addon.protein ?? 0),
        carbs: sum.carbs + (addon.carbs ?? 0),
        fat: sum.fat + addonFat(addon),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const commonChangeTotalsForCart = applicableCommonChanges.reduce<MacroDelta>(
      (sum, change) => {
        if (!nextSelectedCommonChangeIds.includes(change.id)) return sum;
        return {
          calories: sum.calories + change.delta.calories,
          protein: sum.protein + change.delta.protein,
          carbs: sum.carbs + change.delta.carbs,
          fat: sum.fat + deltaFat(change),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const ingredientCountTotalsForCart = Object.entries(nextSelectedIngredientCounts).reduce<MacroDelta>(
      (sum, [ingredientId, count]) => {
        const ingredient =
          ingredientLookup.get(ingredientId) ??
          ingredientLookup.get(ingredientId.toLowerCase());

        if (!ingredient) return sum;
        const countDelta = count - ingredient.defaultCount;
        if (countDelta === 0) return sum;

        return {
          calories: sum.calories + (ingredient.nutrition.calories ?? 0) * countDelta,
          protein: sum.protein + (ingredient.nutrition.protein ?? 0) * countDelta,
          carbs: sum.carbs + (ingredient.nutrition.carbs ?? 0) * countDelta,
          fat: sum.fat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const dressingSegments = Object.values(nextAddons)
      .filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None"))
      .map((addon) => addon.name);
    const sauceSegments = Object.entries(nextSauceCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => (count === 1 ? name : `${name} x${count}`));
    const nextOptionsLabel = [...dressingSegments, ...sauceSegments].length > 0
      ? [...dressingSegments, ...sauceSegments].join(" + ")
      : undefined;
    const selectedCommonChangesForCart = applicableCommonChanges
      .filter((change) => nextSelectedCommonChangeIds.includes(change.id))
      .map((change) => formatCommonChangeForCart(change.label));
    const selectedIngredientCustomizationsForCart = resolvedIngredients
      .filter((ingredient) => {
        if (ingredient.isNoneOption) return false;
        const ingredientCount = nextSelectedIngredientCounts[ingredient.id] ?? ingredient.defaultCount;
        return ingredientCount !== ingredient.defaultCount;
      })
      .flatMap((ingredient) => {
        const ingredientCount = nextSelectedIngredientCounts[ingredient.id] ?? ingredient.defaultCount;
        return [formatIngredientCountCustomizationLabel(ingredient.label, ingredientCount)];
      });
    const nextCustomizations = [
      ...retainedCustomizations,
      ...selectedCommonChangesForCart,
      ...selectedIngredientCustomizationsForCart,
    ];

    onCartConfigurationChange({
      variantId: activeVariant?.id,
      variantLabel: activeVariant?.label,
      optionsLabel: nextOptionsLabel,
      customizations: nextCustomizations.length > 0 ? nextCustomizations : undefined,
      image: activeVariant?.image ?? item.image,
      macrosPerItem: {
        calories: (baseForCart.calories ?? 0) + addonTotalsForCart.calories + ingredientCountTotalsForCart.calories,
        protein: (baseForCart.protein ?? 0) + addonTotalsForCart.protein + commonChangeTotalsForCart.protein + ingredientCountTotalsForCart.protein,
        carbs: (baseForCart.carbs ?? 0) + addonTotalsForCart.carbs + commonChangeTotalsForCart.carbs + ingredientCountTotalsForCart.carbs,
        fat: (baseForCart.totalFat ?? 0) + addonTotalsForCart.fat + commonChangeTotalsForCart.fat + ingredientCountTotalsForCart.fat,
      },
    });
  };

  const handleAddToCart = () => {
    if (isAddFeedbackVisible) return;

    const baseForCart = selectedVariantForCart?.nutrition ?? item.nutrition;

    if (matchingCartItem) {
      updateQuantity(matchingCartItem.id, matchingCartItem.quantity + 1);
    } else {
      addItem({
        id: crypto.randomUUID(),
        restaurantId,
        itemId: item.id ?? item.name,
        name: item.name,
        image: selectedVariantForCart?.image ?? item.image,
        variantId: selectedVariantForCart?.id,
        variantLabel: selectedVariantForCart?.label,
        optionsLabel,
        customizations,
        quantity: 1,
        macrosPerItem: {
          calories: (baseForCart.calories ?? 0) + addonTotals.calories + ingredientCountTotals.calories,
          protein: (baseForCart.protein ?? 0) + addonTotals.protein + ingredientCountTotals.protein,
          carbs: (baseForCart.carbs ?? 0) + addonTotals.carbs + ingredientCountTotals.carbs,
          fat: (baseForCart.totalFat ?? 0) + addonTotals.fat + ingredientCountTotals.fat,
        },
      });
    }

    setIsAddFeedbackVisible(true);
  };

  useEffect(() => {
    if (!isAddFeedbackVisible) return;

    const timeout = window.setTimeout(() => {
      setIsAddFeedbackVisible(false);
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isAddFeedbackVisible]);

  const ingredientSelectionState = controlledIngredientSelected ?? isIngredientSelected;
  const isIngredientSelectionDisabled = isIngredientLocked || isIngredientUnavailable;
  const ingredientDisabledReason = isIngredientLocked
    ? "Included in this entree"
    : ingredientUnavailableReason;

  if (displayMode === "ingredient-compact") {
    const activeCompactOptions =
      ingredientPortionModeOptions && ingredientPortionModeOptions.length > 0
        ? ingredientPortionModeOptions
        : ingredientVariantOptions;
    const selectedCompactOptionId = ingredientPortionModeOptions
      ? selectedIngredientPortionModeId
      : selectedIngredientVariantId;

    return (
      <li
        className={`list-none overflow-hidden rounded-2xl bg-white transition ${
          ingredientSelectionState
            ? "border-2 border-lime-500 shadow-[0_4px_12px_rgba(132,204,22,0.25)]"
            : "border border-black/15 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        }`}
      >
        <label
          className={`flex items-center gap-4 px-4 py-3 ${isIngredientSelectionDisabled ? "cursor-not-allowed opacity-95" : "cursor-pointer"}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center border text-sm font-bold transition ${
              ingredientSelectionState
                ? "border-lime-500 bg-lime-500 text-black"
                : "border-black/40 bg-white text-transparent"
            } ${ingredientSelectionControl === "radio" ? "rounded-full" : "rounded-md"}`}
            aria-hidden="true"
          >
            {ingredientSelectionControl === "radio" ? "●" : "✓"}
          </span>
          <input
            type={ingredientSelectionControl}
            className="sr-only"
            checked={ingredientSelectionState}
            name={ingredientSelectionControl === "radio" ? ingredientRadioGroupName : undefined}
            disabled={isIngredientSelectionDisabled}
            onChange={(event) => {
              const nextSelected = event.target.checked;
              if (ingredientSelectionControl === "radio" && !nextSelected) {
                return;
              }
              if (isIngredientSelectionDisabled && nextSelected) {
                return;
              }
              setIsIngredientSelected(nextSelected);
              onIngredientSelectionChange?.(item, nextSelected);
            }}
            aria-label={`${isIngredientSelectionDisabled ? ingredientDisabledReason ?? "Unavailable" : "Select"} ${item.name}`}
          />

          {selectedItemImage ? (
            <img
              className="h-24 w-24 shrink-0 rounded-xl bg-[#efefef] object-cover"
              src={selectedItemImage}
              alt={item.name}
            />
          ) : (
            <div className="h-24 w-24 shrink-0 rounded-xl bg-[#efefef]" />
          )}

          <div className="min-w-0 flex-1">
            {ingredientSelectionState && ingredientPortionBadge ? (
              <div className="mb-1">
                <span className="inline-flex rounded-full bg-lime-500 px-2 py-0.5 text-xs font-bold text-black">
                  {ingredientPortionBadge}
                </span>
              </div>
            ) : null}
            <div className="truncate text-xl font-semibold text-black">{item.name}</div>
            {isIngredientUnavailable && ingredientUnavailableReason ? (
              <div className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {ingredientUnavailableReason}
              </div>
            ) : null}
            {ingredientSelectionState && activeCompactOptions && activeCompactOptions.length > 1 ? (
              <div className="mt-2 flex gap-2">
                {activeCompactOptions.map((variantOption) => (
                  <button
                    key={variantOption.id}
                    type="button"
                    disabled={Boolean(variantOption.disabled)}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (variantOption.disabled) {
                        return;
                      }
                      if (ingredientPortionModeOptions) {
                        onIngredientPortionModeChange?.(variantOption.id);
                      } else {
                        onIngredientVariantChange?.(variantOption.id);
                      }
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedCompactOptionId === variantOption.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-black/20 bg-white text-slate-700 hover:border-black/35"
                    } ${
                      variantOption.disabled ? "cursor-not-allowed opacity-55 hover:border-black/20" : ""
                    }`}
                  >
                    {variantOption.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-8 text-center">
            <div className="flex min-w-[54px] flex-col items-center gap-1">
              <div className="text-2xl leading-none font-bold text-black">{formatCalories(calories)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-black/80">cal</div>
            </div>
            <div className="flex min-w-[54px] flex-col items-center gap-1">
              <div className="text-2xl leading-none font-bold text-[#c2410c]">{formatMacro(protein)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-black/80">protein</div>
            </div>
            <div className="flex min-w-[54px] flex-col items-center gap-1">
              <div className="text-2xl leading-none font-bold text-[#ca8a04]">{formatMacro(carbs)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-black/80">carbs</div>
            </div>
            <div className="flex min-w-[54px] flex-col items-center gap-1">
              <div className="text-2xl leading-none font-bold text-[#2563eb]">{formatMacro(fat)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-black/80">fat</div>
            </div>
          </div>
        </label>
      </li>
    );
  }

  return (
    <li
      className={`list-none overflow-hidden rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${
        isTopRanked ? "border-[1.5px] border-black/80" : "border border-black/15"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        className="group relative flex w-full cursor-pointer items-stretch gap-6 bg-transparent p-4 text-left focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        aria-controls={`${id}-details`}
      >
        <div className="shrink-0">
          {selectedItemImage ? (
            <img
              className={`block h-[210px] w-[210px] rounded-[14px] bg-[#efefef] shadow-[0_0_5px_rgba(0,0,0,0.25)] ${
                isCartMode ? "object-contain p-2" : "object-cover"
              }`}
              src={selectedItemImage}
              alt={item.name}
            />
          ) : (
            <div className="h-[210px] w-[210px] rounded-[14px] bg-[#efefef]" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch py-1">
          <div className="flex flex-col gap-2">
            {rankText && (
              <div>
                <div className="inline-block border-b-[5px] border-b-yellow-500 px-1.5 text-xl font-bold">{rankText}</div>
              </div>
            )}
            <div className="text-[30px] leading-[1.05] font-bold">{item.name}</div>
            <div className="flex flex-wrap items-center">
              <div className="inline-flex items-baseline gap-2">
                <div className="text-lg font-bold text-black/50">{formatCalories(calories)} calories</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.calories)}</span>
                ) : null}
              </div>
              {variants && !item.hideVariantSelector ? (
                <div
                  className="inline-flex items-center"
                  onClick={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
                  onKeyDown={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
                >
                  <div className="mx-[10px] h-5 w-0.5 rounded-full bg-black/50" />
                  {hasVariantDropdown ? (
                    <VariantSelector
                      variants={variants}
                      selectedId={selectedVariantId}
                      onChange={(nextVariantId) => {
                        setSelectedVariantId(nextVariantId);
                        emitCartConfiguration(nextVariantId, selectedAddons, selectedSauceCounts);
                      }}
                      ariaLabel={`${item.name} portion size`}
                    />
                  ) : (
                    <span className="rounded-full bg-[#121212] px-4 py-0.5 text-base font-bold text-white">
                      {selectedVariantForCart?.label ?? variants[0]?.label}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
            {isCartMode && cartSummaryLine ? (
              <p className="mt-0.5 truncate text-xs text-black/55">{cartSummaryLine}</p>
            ) : null}
          </div>

          <div className="mt-auto flex items-end gap-[60px]">
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#c2410c]">{formatMacro(protein)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.protein)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">PROTEIN</div>
            </div>
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#ca8a04]">{formatMacro(carbs)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.carbs)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">CARBS</div>
            </div>
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#2563eb]">{formatMacro(fat)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.fat)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">FAT</div>
            </div>

            <div className="ml-auto inline-flex flex-row items-end gap-2">
              {!isCartMode && itemHref ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-xl border border-black/20 bg-white px-4 py-2 text-[15px] font-bold text-black/85"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(itemHref, { scroll: false });
                  }}
                >
                  Details
                </button>
              ) : null}
              {isCartMode || matchingCartItem ? (
                <div className="inline-flex items-center gap-2">
                  {isCartMode ? (
                    <button
                      type="button"
                      className="cursor-pointer rounded-xl border border-black/20 bg-white px-3 py-2 text-sm font-bold"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(true);
                      }}
                    >
                      Modify
                    </button>
                  ) : null}
                  <div className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white/90 px-2 py-1">
                    <button
                      type="button"
                      className="h-7 w-7 cursor-pointer rounded-lg border border-black/15 bg-white text-lg leading-none"
                      onClick={(event) => {
                        event.stopPropagation();

                        if (isCartMode) {
                          onCartDecrement?.();
                          return;
                        }

                        if (!matchingCartItem) return;
                        updateQuantity(matchingCartItem.id, matchingCartItem.quantity - 1);
                      }}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      -
                    </button>
                    <span className="min-w-6 text-center text-base font-bold">
                      {isCartMode ? cartQuantity : (matchingCartItem?.quantity ?? 0)}
                    </span>
                    <button
                      type="button"
                      className="h-7 w-7 cursor-pointer rounded-lg border border-black/15 bg-white text-lg leading-none"
                      onClick={(event) => {
                        event.stopPropagation();

                        if (isCartMode) {
                          onCartIncrement?.();
                          return;
                        }

                        if (!matchingCartItem) return;
                        updateQuantity(matchingCartItem.id, matchingCartItem.quantity + 1);
                      }}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={`cursor-pointer rounded-xl border px-[18px] py-2 text-base font-bold text-white transition ${
                    isAddFeedbackVisible
                      ? "border-green-700 bg-green-600 -translate-y-px"
                      : "border-black/20 bg-black/90"
                  } disabled:cursor-not-allowed`}
                  disabled={isAddFeedbackVisible}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart();
                  }}
                >
                  {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-[18px] right-[18px] inline-flex items-center gap-2">
          {hasMods && !isCartMode ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Reset customizations"
              className="cursor-pointer text-[26px] leading-none font-medium text-black/75 transition-colors duration-200 group-hover:text-black/95"
              onClick={(event) => {
                event.stopPropagation();
                resetMods();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  resetMods();
                }
              }}
            >
              ↺
            </div>
          ) : null}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Toggle addon options for ${item.name}`}
            className={`text-[26px] leading-none font-medium text-black/75 transition duration-200 group-hover:text-black/95 ${
              open ? "rotate-45" : ""
            }`}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((v) => !v);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                setOpen((v) => !v);
              }
            }}
          >
            +
          </div>
        </div>
      </div>

      <div
        id={`${id}-details`}
        className={`overflow-hidden bg-white transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[5000px]" : "max-h-0"
        }`}
      >
        <div className="p-3">
          <ItemDetailsPanel
            item={item}
            nutrition={nutrition}
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={(nextVariantId) => {
              setSelectedVariantId(nextVariantId);
              emitCartConfiguration(nextVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds);
            }}
            addons={addons}
            ingredientItems={ingredientItems}
            menuItems={menuItems}
            customizationRules={customizationRules}
            selectedAddons={selectedAddons}
            onSelectAddon={(ref, addon) => {
              setSelectedAddons((prev) => {
                const next = { ...prev, [ref]: addon ?? emptyAddon };
                emitCartConfiguration(selectedVariantId, next, selectedSauceCounts, selectedCommonChangeIds);
                return next;
              });
            }}
            sauceSelectionCounts={selectedSauceCounts}
            onIncrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                const next = { ...prev, [addon.name]: (prev[addon.name] ?? 0) + 1 };
                emitCartConfiguration(selectedVariantId, selectedAddons, next, selectedCommonChangeIds);
                return next;
              });
            }}
            onDecrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const current = prev[addon.name] ?? 0;
                if (current <= 0) return prev;
                const next = { ...prev };
                if (current === 1) {
                  delete next[addon.name];
                } else {
                  next[addon.name] = current - 1;
                }
                emitCartConfiguration(selectedVariantId, selectedAddons, next, selectedCommonChangeIds);
                return next;
              });
            }}
            onToggleSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                if (addon.name === "None") {
                  if (Object.keys(prev).length === 0) return prev;
                  emitCartConfiguration(selectedVariantId, selectedAddons, {}, selectedCommonChangeIds);
                  return {};
                }

                const current = prev[addon.name] ?? 0;
                if (current > 0) {
                  const next = { ...prev };
                  delete next[addon.name];
                  emitCartConfiguration(selectedVariantId, selectedAddons, next, selectedCommonChangeIds);
                  return next;
                }

                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                const next = { ...prev, [addon.name]: 1 };
                emitCartConfiguration(selectedVariantId, selectedAddons, next, selectedCommonChangeIds);
                return next;
              });
            }}
            commonChanges={applicableCommonChanges}
            selectedCommonChangeIds={selectedCommonChangeIds}
            onToggleCommonChange={(changeId) =>
              setSelectedCommonChangeIds((prev) => {
                const next = prev.includes(changeId)
                  ? prev.filter((id) => id !== changeId)
                  : [...prev, changeId];
                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, next);
                return next;
              })
            }
            selectedIngredientCounts={ingredientCounts}
            onDecrementIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                const current = ingredientCounts[ingredientId] ?? 0;
                const next = { ...prev, [ingredientId]: Math.max(0, current - 1) };
                if (next[ingredientId] === current) return prev;

                emitCartConfiguration(
                  selectedVariantId,
                  selectedAddons,
                  selectedSauceCounts,
                  selectedCommonChangeIds,
                  next
                );
                return next;
              })
            }
            onIncrementIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                const ingredient =
                  ingredientLookup.get(ingredientId) ??
                  ingredientLookup.get(ingredientId.toLowerCase());
                const maxQuantity = ingredient?.maxQuantity;
                if (typeof maxQuantity !== "number") return prev;

                const current = ingredientCounts[ingredientId] ?? ingredient?.defaultCount ?? 0;
                const next = { ...prev, [ingredientId]: Math.min(maxQuantity, current + 1) };
                if (next[ingredientId] === current) return prev;

                emitCartConfiguration(
                  selectedVariantId,
                  selectedAddons,
                  selectedSauceCounts,
                  selectedCommonChangeIds,
                  next
                );
                return next;
              })
            }
            onToggleIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                const ingredient =
                  ingredientLookup.get(ingredientId) ??
                  ingredientLookup.get(ingredientId.toLowerCase());
                const maxQuantity = ingredient?.maxQuantity;
                if (typeof maxQuantity !== "number") return prev;

                const current = prev[ingredientId] ?? ingredient?.defaultCount ?? 0;
                const next = { ...prev, [ingredientId]: current > 0 ? 0 : 1 };
                if (next[ingredientId] === current) return prev;

                emitCartConfiguration(
                  selectedVariantId,
                  selectedAddons,
                  selectedSauceCounts,
                  selectedCommonChangeIds,
                  next
                );
                return next;
              })
            }
            onSelectSingleIngredient={(ingredientId, ingredientIdsInTab) =>
              setSelectedIngredientCounts((prev) => {
                const next = { ...prev };

                ingredientIdsInTab.forEach((id) => {
                  next[id] = id === ingredientId ? 1 : 0;
                });

                const hasChanged = ingredientIdsInTab.some(
                  (id) => (ingredientCounts[id] ?? ingredientLookup.get(id)?.defaultCount ?? 0) !== next[id]
                );
                if (!hasChanged) return prev;

                emitCartConfiguration(
                  selectedVariantId,
                  selectedAddons,
                  selectedSauceCounts,
                  selectedCommonChangeIds,
                  next
                );
                return next;
              })
            }
            customizationTotals={customizationTotals}
            showCustomizationDeltas={hasActiveCustomization}
            displayMode="full"
            flattenIngredientList={flattenIngredientListInDetails}
          />
        </div>
      </div>
    </li>
  );
}
