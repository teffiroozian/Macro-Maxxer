"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Drumstick, EggFried, Salad, Sandwich, Shell, Utensils } from "lucide-react";
import ItemDetailsPanel, { PortionSelector, type ResolvedPanelIngredient, resolvePanelIngredients } from "@/components/ItemDetailsPanel";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  MacroDelta,
  MenuItem,
  RestaurantAddons,
  IngredientItem,
  RestaurantCustomizationRules,
} from "@/types/menu";
import { useCart } from "@/stores/cartStore";

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

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function isChickfilaBreakfastItem(restaurantId: string, menuItem: MenuItem) {
  if (restaurantId !== "chickfila") return false;
  return menuItem.categories.some((category) => normalizeCategory(category) === "breakfast");
}

function isWaffleFries(menuItem: MenuItem) {
  const normalizedName = menuItem.name.trim().toLowerCase();
  return menuItem.id === "chick_fil_a_waffle_potato_fries" || normalizedName.includes("waffle potato fries");
}

function isHashBrowns(menuItem: MenuItem) {
  return menuItem.id === "hash-browns";
}

function compareByDefaultOrder(left: MenuItem, right: MenuItem) {
  const leftOrder = left.defaultOrder ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.defaultOrder ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.name.localeCompare(right.name);
}

function sortComboSides(sides: MenuItem[], prioritizeHashBrowns: boolean) {
  if (!prioritizeHashBrowns) {
    return [...sides].sort(compareByDefaultOrder);
  }

  return [...sides].sort((left, right) => {
    if (isHashBrowns(left) && !isHashBrowns(right)) return -1;
    if (!isHashBrowns(left) && isHashBrowns(right)) return 1;
    return compareByDefaultOrder(left, right);
  });
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function sumNutritionWithFallback(base?: number, delta = 0) {
  if (delta === 0) return base;
  return (base ?? 0) + delta;
}

function addonFat(addon?: AddonOption) {
  return addon?.totalFat ?? addon?.fat ?? 0;
}

function menuItemFat(item?: MenuItem) {
  return item?.nutrition.totalFat ?? 0;
}

function resolveDefaultVariantId(item?: MenuItem) {
  if (!item?.variants || item.variants.length === 0) return undefined;
  if (item.defaultVariantId && item.variants.some((variant) => variant.id === item.defaultVariantId)) {
    return item.defaultVariantId;
  }
  const flaggedDefault = item.variants.find((variant) => variant.isDefault);
  return flaggedDefault?.id ?? item.variants[0]?.id;
}

function resolveJustItemLabel(item: MenuItem) {
  const normalizedCategories = (item.categories ?? []).map((category) => normalizeCategory(category));

  if (normalizedCategories.some((category) => category.includes("sandwich"))) {
    return "Sandwich Only";
  }
  if (normalizedCategories.some((category) => category.includes("salad"))) {
    return "Salad Only";
  }
  if (normalizedCategories.some((category) => category.includes("wrap"))) {
    return "Wrap Only";
  }
  if (normalizedCategories.some((category) => category.includes("nugget") || category.includes("chicken"))) {
    return "Chicken Only";
  }
  if (normalizedCategories.some((category) => category.includes("breakfast"))) {
    return "Breakfast Only";
  }

  return "Item Only";
}

function resolveJustItemIcon(item: MenuItem) {
  const normalizedCategories = (item.categories ?? []).map((category) => normalizeCategory(category));
  if (normalizedCategories.some((category) => category.includes("sandwich"))) {
    return Sandwich;
  }
  if (normalizedCategories.some((category) => category.includes("salad"))) {
    return Salad;
  }
  if (normalizedCategories.some((category) => category.includes("wrap"))) {
    return Shell;
  }
  if (normalizedCategories.some((category) => category.includes("nugget") || category.includes("chicken"))) {
    return Drumstick;
  }
  if (normalizedCategories.some((category) => category.includes("breakfast"))) {
    return EggFried;
  }
  return Sandwich;
}

function deltaFat(change: CommonChange) {
  return change.delta.totalFat ?? change.delta.fat ?? 0;
}

function getDefaultIngredientCounts(
  resolvedIngredients: ResolvedPanelIngredient[]
) {
  return resolvedIngredients.reduce<Record<string, number>>((acc, ingredient) => {
    acc[ingredient.id] = ingredient.defaultCount;
    return acc;
  }, {});
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

export default function ItemRouteModal({
  restaurantId,
  restaurantPath,
  item,
  addons,
  commonChanges,
  ingredients,
  menuItems,
  customizationRules,
}: {
  restaurantId: string;
  restaurantPath: string;
  item: MenuItem;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredients?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
}) {
  const router = useRouter();
  const variants = item.variants?.length ? item.variants : null;
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>({});
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>({});
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>([]);
  const [comboType, setComboType] = useState<"just-item" | "combo-meal">("just-item");
  const [selectedComboSideId, setSelectedComboSideId] = useState<string>();
  const [selectedComboDrinkId, setSelectedComboDrinkId] = useState<string>();
  const [selectedComboSideVariantId, setSelectedComboSideVariantId] = useState<string>();
  const [selectedComboDrinkVariantId, setSelectedComboDrinkVariantId] = useState<string>();
  const { addItem } = useCart();
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
  const resolvedIngredients = useMemo(
    () => resolvePanelIngredients(item, ingredients, addons, menuItems ?? [], variants, selectedVariantId, customizationRules),
    [addons, customizationRules, ingredients, item, menuItems, selectedVariantId, variants]
  );
  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(() =>
    getDefaultIngredientCounts(resolvedIngredients)
  );

  const applicableCommonChanges = useMemo(
    () => getApplicableCommonChanges(item, commonChanges),
    [item, commonChanges]
  );

  const selectedSauceOptions = useMemo(() => {
    const sauceOptions = addons?.[sauceRef] ?? [];
    return sauceOptions.flatMap((addon) =>
      Array.from({ length: selectedSauceCounts[addon.name] ?? 0 }, () => addon)
    );
  }, [addons, selectedSauceCounts]);

  const addonTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          fat: sum.fat + addonFat(addon),
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
          fat: 0,
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

  const selectedCommonChanges = useMemo(
    () => applicableCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)).map((change) => change.label),
    [applicableCommonChanges, selectedCommonChangeIds]
  );
  const selectedIngredientCustomizations = useMemo(
    () =>
      resolvedIngredients
        .filter((ingredient) => !ingredient.isNoneOption && (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount)
        .flatMap((ingredient) => {
          const ingredientCount = ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
          return [ingredientCount === 0 ? `${ingredient.label}: Removed` : `${ingredient.label}: ${ingredientCount}x`];
        }),
    [ingredientCounts, resolvedIngredients]
  );
  const isComboEligibleCategory = useMemo(() => {
    if (restaurantId !== "chickfila") return false;
    const allowed = new Set(["sandwich", "nuggets", "chicken", "salad", "wrap", "breakfast"]);
    return item.categories.some((category) => allowed.has(normalizeCategory(category)));
  }, [item.categories, restaurantId]);
  const comboSides = useMemo(
    () => {
      const breakfastComboItem = isChickfilaBreakfastItem(restaurantId, item);
      const sides = (menuItems ?? []).filter((menuItem) => {
        const normalizedCategories = menuItem.categories.map((category) => normalizeCategory(category));
        if (!breakfastComboItem) {
          return normalizedCategories.includes("side");
        }

        if (isWaffleFries(menuItem)) return false;
        return normalizedCategories.includes("side") || isHashBrowns(menuItem);
      });

      return sortComboSides(sides, breakfastComboItem);
    },
    [item, menuItems, restaurantId]
  );
  const comboDrinks = useMemo(
    () =>
      (menuItems ?? []).filter((menuItem) =>
        menuItem.categories.some((category) => normalizeCategory(category) === "drinks")
      ),
    [menuItems]
  );
  const comboTypeOptions = useMemo(
    () => [
      { id: "just-item" as const, label: resolveJustItemLabel(item), icon: resolveJustItemIcon(item) },
      { id: "combo-meal" as const, label: "Combo Meal", icon: Utensils },
    ],
    [item]
  );
  const selectedComboSide = useMemo(
    () => comboSides.find((side) => (side.id ?? side.name) === selectedComboSideId),
    [comboSides, selectedComboSideId]
  );
  const selectedComboSideVariant = useMemo(
    () => selectedComboSide?.variants?.find((variant) => variant.id === selectedComboSideVariantId),
    [selectedComboSide, selectedComboSideVariantId]
  );
  const selectedComboDrink = useMemo(
    () => comboDrinks.find((drink) => (drink.id ?? drink.name) === selectedComboDrinkId),
    [comboDrinks, selectedComboDrinkId]
  );
  const selectedComboDrinkVariant = useMemo(
    () => selectedComboDrink?.variants?.find((variant) => variant.id === selectedComboDrinkVariantId),
    [selectedComboDrink, selectedComboDrinkVariantId]
  );
  const comboNutritionTotals = useMemo(() => {
    if (!isComboEligibleCategory || comboType !== "combo-meal") {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        satFat: 0,
        transFat: 0,
        cholesterol: 0,
        sodium: 0,
        fiber: 0,
        sugars: 0,
      };
    }

    return [selectedComboDrink].reduce(
      (sum, comboItem) => ({
        calories: sum.calories + ((selectedComboDrinkVariant?.nutrition.calories ?? comboItem?.nutrition.calories) ?? 0),
        protein: sum.protein + ((selectedComboDrinkVariant?.nutrition.protein ?? comboItem?.nutrition.protein) ?? 0),
        carbs: sum.carbs + ((selectedComboDrinkVariant?.nutrition.carbs ?? comboItem?.nutrition.carbs) ?? 0),
        fat: sum.fat + (selectedComboDrinkVariant?.nutrition.totalFat ?? menuItemFat(comboItem)),
        satFat: sum.satFat + ((selectedComboDrinkVariant?.nutrition.satFat ?? comboItem?.nutrition.satFat) ?? 0),
        transFat: sum.transFat + ((selectedComboDrinkVariant?.nutrition.transFat ?? comboItem?.nutrition.transFat) ?? 0),
        cholesterol: sum.cholesterol + ((selectedComboDrinkVariant?.nutrition.cholesterol ?? comboItem?.nutrition.cholesterol) ?? 0),
        sodium: sum.sodium + ((selectedComboDrinkVariant?.nutrition.sodium ?? comboItem?.nutrition.sodium) ?? 0),
        fiber: sum.fiber + ((selectedComboDrinkVariant?.nutrition.fiber ?? comboItem?.nutrition.fiber) ?? 0),
        sugars: sum.sugars + ((selectedComboDrinkVariant?.nutrition.sugars ?? comboItem?.nutrition.sugars) ?? 0),
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        satFat: 0,
        transFat: 0,
        cholesterol: 0,
        sodium: 0,
        fiber: 0,
        sugars: 0,
      }
    );
  }, [comboType, isComboEligibleCategory, selectedComboDrink, selectedComboDrinkVariant]);

  const comboSideNutritionTotals = useMemo(() => {
    if (!selectedComboSide) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        satFat: 0,
        transFat: 0,
        cholesterol: 0,
        sodium: 0,
        fiber: 0,
        sugars: 0,
      };
    }

    const sideNutrition = selectedComboSideVariant?.nutrition ?? selectedComboSide.nutrition;
    return {
      calories: sideNutrition.calories ?? 0,
      protein: sideNutrition.protein ?? 0,
      carbs: sideNutrition.carbs ?? 0,
      fat: sideNutrition.totalFat ?? 0,
      satFat: sideNutrition.satFat ?? 0,
      transFat: sideNutrition.transFat ?? 0,
      cholesterol: sideNutrition.cholesterol ?? 0,
      sodium: sideNutrition.sodium ?? 0,
      fiber: sideNutrition.fiber ?? 0,
      sugars: sideNutrition.sugars ?? 0,
    };
  }, [selectedComboSide, selectedComboSideVariant]);
  const activeComboNutritionTotals = useMemo(
    () =>
      !isComboEligibleCategory || comboType !== "combo-meal"
        ? {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            satFat: 0,
            transFat: 0,
            cholesterol: 0,
            sodium: 0,
            fiber: 0,
            sugars: 0,
          }
        : {
            calories: comboNutritionTotals.calories + comboSideNutritionTotals.calories,
            protein: comboNutritionTotals.protein + comboSideNutritionTotals.protein,
            carbs: comboNutritionTotals.carbs + comboSideNutritionTotals.carbs,
            fat: comboNutritionTotals.fat + comboSideNutritionTotals.fat,
            satFat: comboNutritionTotals.satFat + comboSideNutritionTotals.satFat,
            transFat: comboNutritionTotals.transFat + comboSideNutritionTotals.transFat,
            cholesterol: comboNutritionTotals.cholesterol + comboSideNutritionTotals.cholesterol,
            sodium: comboNutritionTotals.sodium + comboSideNutritionTotals.sodium,
            fiber: comboNutritionTotals.fiber + comboSideNutritionTotals.fiber,
            sugars: comboNutritionTotals.sugars + comboSideNutritionTotals.sugars,
          },
    [comboNutritionTotals, comboSideNutritionTotals, comboType, isComboEligibleCategory]
  );

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories + activeComboNutritionTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein + activeComboNutritionTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs + activeComboNutritionTotals.carbs,
      fat: addonTotals.fat + commonChangeTotals.fat + ingredientCountTotals.fat + activeComboNutritionTotals.fat,
    }),
    [activeComboNutritionTotals, addonTotals, commonChangeTotals, ingredientCountTotals]
  );

  const hasActiveCustomization = useMemo(
    () =>
      customizationTotals.calories !== 0 ||
      customizationTotals.protein !== 0 ||
      customizationTotals.carbs !== 0 ||
      customizationTotals.fat !== 0,
    [customizationTotals]
  );

  const nutrition = {
    ...baseNutrition,
    calories: sumNutritionWithFallback(baseNutrition.calories, customizationTotals.calories),
    protein: sumNutritionWithFallback(baseNutrition.protein, customizationTotals.protein),
    carbs: sumNutritionWithFallback(baseNutrition.carbs, customizationTotals.carbs),
    totalFat: sumNutritionWithFallback(baseNutrition.totalFat, customizationTotals.fat),
    satFat: sumNutritionWithFallback(baseNutrition.satFat, addonTotals.satFat + activeComboNutritionTotals.satFat),
    transFat: sumNutritionWithFallback(baseNutrition.transFat, addonTotals.transFat + activeComboNutritionTotals.transFat),
    cholesterol: sumNutritionWithFallback(baseNutrition.cholesterol, addonTotals.cholesterol + activeComboNutritionTotals.cholesterol),
    sodium: sumNutritionWithFallback(baseNutrition.sodium, addonTotals.sodium + activeComboNutritionTotals.sodium),
    fiber: sumNutritionWithFallback(baseNutrition.fiber, addonTotals.fiber + activeComboNutritionTotals.fiber),
    sugars: sumNutritionWithFallback(baseNutrition.sugars, addonTotals.sugars + activeComboNutritionTotals.sugars),
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    const comboCustomizations =
      isComboEligibleCategory && comboType === "combo-meal"
        ? [
            "Combo Meal",
            selectedComboSide
              ? `Side: ${selectedComboSide.name}${selectedComboSideVariant ? ` (${selectedComboSideVariant.label})` : ""}`
              : undefined,
            selectedComboDrink
              ? `Drink: ${selectedComboDrink.name}${selectedComboDrinkVariant ? ` (${selectedComboDrinkVariant.label})` : ""}`
              : undefined,
          ].filter((entry): entry is string => Boolean(entry))
        : [];
    const customizations = [...selectedCommonChanges, ...selectedIngredientCustomizations, ...comboCustomizations];

    const cartItem = {
      id: crypto.randomUUID(),
      restaurantId,
      itemId: item.id ?? item.name,
      name: item.name,
      image: selectedVariant?.image ?? item.image,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      optionsLabel,
      customizations: customizations.length > 0 ? customizations : undefined,
      quantity,
      macrosPerItem: {
        calories: nutrition.calories ?? 0,
        protein: nutrition.protein ?? 0,
        carbs: nutrition.carbs ?? 0,
        fat: nutrition.totalFat ?? 0,
      },
    };

    handleClose();
    window.setTimeout(() => addItem(cartItem), 0);
  };

  const handleDecrementQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={item.name}>
      <button
        type="button"
        className="cursor-pointer absolute inset-0 border-0 bg-slate-900/66"
        onClick={handleClose}
        aria-label="Close item modal"
      />
      <div className="relative m-4 h-[calc(100%-32px)] w-[min(1024px,calc(100%-32px))] overflow-hidden rounded-2xl bg-white px-6 pt-6">
        <button
          type="button"
          className="cursor-pointer sticky top-0 ml-auto h-9 w-9 rounded-full border border-black/12 bg-white/95 text-2xl"
          onClick={handleClose}
          aria-label="Close item modal"
        >
          ×
        </button>

        <div className="h-[calc(100%-52px-56px)] overflow-y-auto pr-2 pb-4">
        <div className="grid justify-items-center gap-8">
          <h1 className="text-center text-[32px] font-extrabold">{item.name}</h1>
          {selectedItemImage ? (
            <img className="max-h-[300px] w-[300px] bg-[#efefef] shadow-[0_0_5px_rgba(0,0,0,0.25)] rounded-[14px] object-contain" src={selectedItemImage} alt={item.name} />
          ) : null}
          <MacroTotalsGrid
            macros={{
              calories: Math.round(nutrition.calories ?? 0),
              protein: Math.round(nutrition.protein ?? 0),
              carbs: Math.round(nutrition.carbs ?? 0),
              fat: Math.round(nutrition.totalFat ?? 0),
            }}
            className="w-full max-w-[720px] gap-6 sm:gap-10"
            valueExtras={
              hasActiveCustomization
                ? {
                    calories: <span className="ml-1.5 text-sm font-bold text-green-600">{formatDelta(customizationTotals.calories)}</span>,
                    protein: <span className="ml-1.5 text-sm font-bold text-green-600">{formatDelta(customizationTotals.protein)}</span>,
                    carbs: <span className="ml-1.5 text-sm font-bold text-green-600">{formatDelta(customizationTotals.carbs)}</span>,
                    fat: <span className="ml-1.5 text-sm font-bold text-green-600">{formatDelta(customizationTotals.fat)}</span>,
                  }
                : undefined
            }
          />

          {variants && variants.length > 0 && !item.hideVariantSelector ? (
            <>
              <div className="h-px w-[min(720px,100%)] bg-black/16" />
              <div className="w-[min(720px,100%)]">
                <PortionSelector
                  variants={variants}
                  selectedVariantId={selectedVariantId}
                  onSelectVariant={setSelectedVariantId}
                  className="mt-0"
                  layout="top"
                />
              </div>
              <div className="h-px w-[min(720px,100%)] bg-black/16" />
            </>
          ) : null}
          {isComboEligibleCategory ? (
            <>
              {(!variants || variants.length === 0 || item.hideVariantSelector) ? (
                <div className="h-px w-[min(720px,100%)] bg-black/16" />
              ) : null}
              <div className="w-[min(720px,100%)]">
                <div className="mt-0 my-3 flex flex-col items-center justify-between gap-4">
                  <div className="w-full text-center text-lg font-semibold text-[rgba(0,0,0,0.8)]">
                    Combo Type
                  </div>
                  <div className="flex w-full flex-wrap justify-center gap-2">
                    {comboTypeOptions.map((option) => {
                      const isActive = comboType === option.id;
                      const Icon = option.icon;
                      const variantColorClasses = isActive
                        ? "bg-black text-white"
                        : "bg-transparent text-[rgba(0,0,0,0.6)]";

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`inline-flex min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-[rgba(0,0,0,0.6)] px-3 py-1.5 text-center text-[15px] font-semibold ${variantColorClasses}`}
                          onClick={() => setComboType(option.id)}
                        >
                          <Icon size={15} strokeWidth={2.5} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="h-px w-[min(720px,100%)] bg-black/16" />
            </>
          ) : null}
        </div>

        <div className="mt-[18px] grid gap-3">
          <ItemDetailsPanel
            item={item}
            nutrition={nutrition}
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
            addons={addons}
            ingredientItems={ingredients}
            menuItems={menuItems}
            customizationRules={customizationRules}
            selectedAddons={selectedAddons}
            onSelectAddon={(ref, addon) => setSelectedAddons((prev) => ({ ...prev, [ref]: addon ?? emptyAddon }))}
            sauceSelectionCounts={selectedSauceCounts}
            onIncrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                return { ...prev, [addon.name]: (prev[addon.name] ?? 0) + 1 };
              });
            }}
            onDecrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const current = prev[addon.name] ?? 0;
                if (current <= 0) return prev;
                const next = { ...prev };
                if (current === 1) delete next[addon.name];
                else next[addon.name] = current - 1;
                return next;
              });
            }}
            onToggleSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                if (addon.name === "None") return {};
                const current = prev[addon.name] ?? 0;
                if (current > 0) {
                  const next = { ...prev };
                  delete next[addon.name];
                  return next;
                }
                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                return { ...prev, [addon.name]: 1 };
              });
            }}
            commonChanges={applicableCommonChanges}
            selectedCommonChangeIds={selectedCommonChangeIds}
            onToggleCommonChange={(changeId) =>
              setSelectedCommonChangeIds((prev) =>
                prev.includes(changeId) ? prev.filter((id) => id !== changeId) : [...prev, changeId]
              )
            }
            customizationTotals={customizationTotals}
            showCustomizationDeltas={hasActiveCustomization}
            showVariantsInDetails={!item.hideVariantSelector}
            selectedIngredientCounts={ingredientCounts}
            onDecrementIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                const current = ingredientCounts[ingredientId] ?? 0;
                const nextCount = Math.max(0, current - 1);
                if (nextCount === current) return prev;

                return { ...prev, [ingredientId]: nextCount };
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
                const nextCount = Math.min(maxQuantity, current + 1);
                if (nextCount === current) return prev;

                return { ...prev, [ingredientId]: nextCount };
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
                const nextCount = current > 0 ? 0 : 1;
                if (nextCount === current) return prev;

                return { ...prev, [ingredientId]: nextCount };
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

                return next;
              })
            }
            comboType={comboType}
            comboSides={comboSides}
            comboDrinks={comboDrinks}
            selectedComboSideId={selectedComboSideId}
            selectedComboDrinkId={selectedComboDrinkId}
            onSelectComboSide={(sideId) => {
              if (selectedComboSideId === sideId) {
                setSelectedComboSideId(undefined);
                setSelectedComboSideVariantId(undefined);
                return;
              }
              const nextSide = comboSides.find((side) => (side.id ?? side.name) === sideId);
              setSelectedComboSideId(sideId);
              setSelectedComboSideVariantId(resolveDefaultVariantId(nextSide));
            }}
            onSelectComboDrink={(drinkId) => {
              if (selectedComboDrinkId === drinkId) {
                setSelectedComboDrinkId(undefined);
                setSelectedComboDrinkVariantId(undefined);
                return;
              }
              const nextDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === drinkId);
              setSelectedComboDrinkId(drinkId);
              setSelectedComboDrinkVariantId(resolveDefaultVariantId(nextDrink));
            }}
            selectedComboSideVariantId={selectedComboSideVariantId}
            onSelectComboSideVariant={setSelectedComboSideVariantId}
            selectedComboDrinkVariantId={selectedComboDrinkVariantId}
            onSelectComboDrinkVariant={setSelectedComboDrinkVariantId}
          />
        </div>
        </div>

        <div className="sticky bottom-0 -mx-6 z-10 flex h-fit items-center justify-center gap-3 border-t border-black/10 bg-white px-4 py-3 shadow-[0_-4px_10px_rgba(0,0,0,0.08)]">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={handleDecrementQuantity}
              className="cursor-pointer inline-flex size-8 items-center justify-center rounded-lg text-base font-semibold text-slate-700 transition hover:bg-white"
              aria-label={`Decrease quantity of ${item.name}`}
            >
              -
            </button>
            <span className="min-w-8 text-center text-sm font-semibold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={handleIncrementQuantity}
              className="cursor-pointer inline-flex size-8 items-center justify-center rounded-lg text-base font-semibold text-slate-700 transition hover:bg-white"
              aria-label={`Increase quantity of ${item.name}`}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-black/20 bg-black/90 px-6 py-2.5 text-base font-bold text-white"
            onClick={handleAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
