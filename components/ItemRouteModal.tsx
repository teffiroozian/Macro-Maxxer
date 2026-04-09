"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CupSoda, Droplets, Salad, SquareStack, Utensils } from "lucide-react";
import ItemDetailsPanel, {
  PortionSelector,
  resolvePanelIngredientTabs,
  resolvePanelIngredients,
} from "@/components/ItemDetailsPanel";
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
import { parseComboCustomization } from "@/lib/menuItemCard/comboCustomizationParser";
import {
  getSelectedAddonsFromLabel,
  getSelectedCommonChangeIdsFromCustomizations,
  getSelectedSauceCountsFromLabel,
} from "@/lib/menuItemCard/cartLabelUtils";
import { getSelectedIngredientCountsFromCustomizations } from "@/lib/menuItemCard/ingredientCountCustomization";
import {
  addonFat,
  deltaFat,
  formatDelta,
  getApplicableCommonChanges,
  getDefaultIngredientCounts,
  getDefaultVariantId,
  isChickfilaBreakfastItem,
  isHashBrowns,
  isWaffleFries,
  menuItemFat,
  normalizeCategory,
  resolveJustItemIcon,
  resolveJustItemLabel,
  sortComboSides,
  sumNutritionWithFallback,
} from "@/lib/menuItemCalculations";
import {
  buildHighProteinBuildConfiguration,
  isChipotleHighProteinMenuItem,
} from "@/lib/chipotleBuild/highProtein";

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
const sectionScrollOffset = 96;

type ModalSectionId = "ingredients" | "sides" | "drinks" | "sauces";

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
  const searchParams = useSearchParams();
  const editCartItemId = searchParams.get("editCartItem");
  const variants = item.variants?.length ? item.variants : null;
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const { addItem, updateItem, items } = useCart();
  const editingCartItem = useMemo(() => {
    if (!editCartItemId) return null;

    return (
      items.find(
        (cartItem) =>
          cartItem.id === editCartItemId &&
          cartItem.restaurantId === restaurantId &&
          cartItem.itemId === (item.id ?? item.name)
      ) ?? null
    );
  }, [editCartItemId, item.id, item.name, items, restaurantId]);
  const isCustomizeMode = Boolean(editingCartItem);
  const canCustomizeViaBuildPage =
    isChipotleHighProteinMenuItem(item, restaurantId) && Boolean(editingCartItem);
  const parsedInitialComboCustomization = useMemo(
    () => parseComboCustomization(editingCartItem?.customizations),
    [editingCartItem?.customizations]
  );
  const [selectedVariantId, setSelectedVariantId] = useState(editingCartItem?.variantId ?? defaultVariantId);
  const [quantity, setQuantity] = useState(editingCartItem?.quantity ?? 1);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>(() =>
    getSelectedAddonsFromLabel(item, addons, editingCartItem?.optionsLabel)
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    getSelectedSauceCountsFromLabel(item, addons, editingCartItem?.optionsLabel)
  );
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>(() =>
    getSelectedCommonChangeIdsFromCustomizations(commonChanges, editingCartItem?.customizations)
  );
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
  const resolvedIngredients = useMemo(
    () => resolvePanelIngredients(item, ingredients, addons, menuItems ?? [], variants, selectedVariantId, customizationRules),
    [addons, customizationRules, ingredients, item, menuItems, selectedVariantId, variants]
  );
  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(() =>
    getSelectedIngredientCountsFromCustomizations(resolvedIngredients, editingCartItem?.customizations)
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
  const [comboType, setComboType] = useState<"just-item" | "combo-meal">(parsedInitialComboCustomization.comboType);
  const [selectedComboSideId, setSelectedComboSideId] = useState<string | undefined>(() => {
    const side = comboSides.find((option) => option.name === parsedInitialComboCustomization.sideName);
    return side ? (side.id ?? side.name) : undefined;
  });
  const [selectedComboDrinkId, setSelectedComboDrinkId] = useState<string | undefined>(() => {
    const drink = comboDrinks.find((option) => option.name === parsedInitialComboCustomization.drinkName);
    return drink ? (drink.id ?? drink.name) : undefined;
  });
  const [selectedComboSideVariantId, setSelectedComboSideVariantId] = useState<string | undefined>(() => {
    const side = comboSides.find((option) => option.name === parsedInitialComboCustomization.sideName);
    return side?.variants?.find((variant) => variant.label === parsedInitialComboCustomization.sideVariantLabel)?.id;
  });
  const [selectedComboDrinkVariantId, setSelectedComboDrinkVariantId] = useState<string | undefined>(() => {
    const drink = comboDrinks.find((option) => option.name === parsedInitialComboCustomization.drinkName);
    return drink?.variants?.find((variant) => variant.label === parsedInitialComboCustomization.drinkVariantLabel)?.id;
  });
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
  const ingredientTabs = useMemo(
    () =>
      resolvePanelIngredientTabs(
        item,
        ingredients,
        addons,
        menuItems,
        variants,
        selectedVariantId,
        customizationRules
      ),
    [addons, customizationRules, ingredients, item, menuItems, selectedVariantId, variants]
  );
  const hasIngredientSection = useMemo(() => {
    const nonEmptyTabs = ingredientTabs.filter((tab) => tab.ingredients.length > 0);
    return nonEmptyTabs.length > 1 || (nonEmptyTabs[0]?.ingredients.length ?? 0) > 0;
  }, [ingredientTabs]);
  const addonNavigationRef = useMemo<AddonRef | null>(() => {
    const itemAddonRefs = new Set(item.addonRefs ?? []);
    if (itemAddonRefs.has("dressings") && (addons?.dressings?.length ?? 0) > 0) return "dressings";
    if (itemAddonRefs.has("sauces") && (addons?.sauces?.length ?? 0) > 0) return "sauces";
    return null;
  }, [addons, item.addonRefs]);
  const addonSectionLabel = addonNavigationRef
    ? addonNavigationRef.charAt(0).toUpperCase() + addonNavigationRef.slice(1)
    : null;
  const hasAddonSection = Boolean(addonNavigationRef);
  const hasComboSections = isComboEligibleCategory && comboType === "combo-meal";
  const visibleSections = useMemo(
    () =>
      [
        hasIngredientSection
          ? { id: "ingredients" as const, label: "Ingredients", icon: Salad }
          : null,
        hasComboSections ? { id: "sides" as const, label: "Sides", icon: SquareStack } : null,
        hasComboSections ? { id: "drinks" as const, label: "Drinks", icon: CupSoda } : null,
        hasAddonSection && addonSectionLabel ? { id: "sauces" as const, label: addonSectionLabel, icon: Droplets } : null,
      ].filter((section): section is { id: ModalSectionId; label: string; icon: typeof Salad } => Boolean(section)),
    [addonSectionLabel, hasAddonSection, hasComboSections, hasIngredientSection]
  );
  const [activeSectionId, setActiveSectionId] = useState<ModalSectionId | null>(visibleSections[0]?.id ?? null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionElementRefs = useRef<Partial<Record<ModalSectionId, HTMLElement | null>>>({});

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || visibleSections.length === 0) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      const threshold = containerTop + sectionScrollOffset + 12;

      let nextActive = visibleSections[0]?.id ?? null;
      visibleSections.forEach((section) => {
        const sectionElement = sectionElementRefs.current[section.id];
        if (!sectionElement) return;
        if (sectionElement.getBoundingClientRect().top <= threshold) {
          nextActive = section.id;
        }
      });

      setActiveSectionId(nextActive);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [visibleSections]);

  const scrollToSection = (sectionId: ModalSectionId) => {
    const container = scrollContainerRef.current;
    const sectionElement = sectionElementRefs.current[sectionId];
    if (!container || !sectionElement) return;

    const containerTop = container.getBoundingClientRect().top;
    const sectionTop = sectionElement.getBoundingClientRect().top;
    const nextScrollTop = container.scrollTop + (sectionTop - containerTop) - sectionScrollOffset;

    container.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: "smooth",
    });
  };

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

  const handleSaveItem = () => {
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

    const nextCartItemPayload = {
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
      buildConfiguration:
        editingCartItem?.buildConfiguration ??
        (isChipotleHighProteinMenuItem(item, restaurantId)
          ? buildHighProteinBuildConfiguration(item, ingredients)
          : undefined),
    };

    handleClose();
    window.setTimeout(() => {
      if (editingCartItem) {
        updateItem(editingCartItem.id, nextCartItemPayload);
        return;
      }

      addItem({
        id: crypto.randomUUID(),
        restaurantId,
        itemId: item.id ?? item.name,
        ...nextCartItemPayload,
      });
    }, 0);
  };
  const handleResetEdits = () => {
    handleClose();
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

        <div ref={scrollContainerRef} className="h-[calc(100%-52px-56px)] overflow-y-auto pr-2 pb-6">
        <div className="grid justify-items-center gap-16">
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
              size="panel"
              className="w-full max-w-[560px] gap-6 sm:gap-10"
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
          </div>

          <div className="w-[min(720px,100%)] grid gap-7">
            {variants && variants.length > 0 && !item.hideVariantSelector ? (
              <div className="w-full">
                <PortionSelector
                  variants={variants}
                  selectedVariantId={selectedVariantId}
                  onSelectVariant={setSelectedVariantId}
                  className="mt-0"
                  layout="top"
                />
              </div>
            ) : null}
            {variants && variants.length > 0 && !item.hideVariantSelector && isComboEligibleCategory ? (
              <div className="mx-auto h-px w-[min(520px,100%)] bg-black/12" />
            ) : null}
            {isComboEligibleCategory ? (
              <div className="w-full">
                <div className="mt-0 my-3 flex flex-col items-center justify-between gap-4">
                  <div className="w-full text-center text-lg font-semibold text-[rgba(0,0,0,0.8)]">
                    Combo Type
                  </div>
                  <div className="flex w-full flex-wrap justify-center gap-2">
                    {comboTypeOptions.map((option) => {
                      const isActive = comboType === option.id;
                      const Icon = option.icon;
                      const variantColorClasses = isActive
                        ? "border-blue-500 bg-blue-50 text-neutral-900 shadow-[0_8px_20px_rgba(37,99,235,0.18)]"
                        : "border-slate-200 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50";
                      const iconClasses = isActive
                        ? "border-blue-500/60 bg-white text-blue-600"
                        : "border-slate-300 bg-slate-50 text-slate-500";
                      const labelClasses = isActive ? "text-slate-700" : "text-slate-500";

                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`inline-flex min-w-[220px] cursor-pointer items-center justify-center gap-3 rounded-2xl border px-5 py-2.5 text-left transition-all duration-150 ${variantColorClasses}`}
                          onClick={() => setComboType(option.id)}
                        >
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${iconClasses}`}>
                            <Icon size={16} strokeWidth={2.4} />
                          </span>
                          <span className={`text-xs font-bold uppercase tracking-[0.08em] ${labelClasses}`}>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="w-full">
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
              setSelectedComboSideVariantId(getDefaultVariantId(nextSide));
            }}
            onSelectComboDrink={(drinkId) => {
              if (selectedComboDrinkId === drinkId) {
                setSelectedComboDrinkId(undefined);
                setSelectedComboDrinkVariantId(undefined);
                return;
              }
              const nextDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === drinkId);
              setSelectedComboDrinkId(drinkId);
              setSelectedComboDrinkVariantId(getDefaultVariantId(nextDrink));
            }}
            selectedComboSideVariantId={selectedComboSideVariantId}
            onSelectComboSideVariant={setSelectedComboSideVariantId}
            selectedComboDrinkVariantId={selectedComboDrinkVariantId}
            onSelectComboDrinkVariant={setSelectedComboDrinkVariantId}
            ingredientsSectionRef={(element) => {
              sectionElementRefs.current.ingredients = element;
            }}
            sidesSectionRef={(element) => {
              sectionElementRefs.current.sides = element;
            }}
            drinksSectionRef={(element) => {
              sectionElementRefs.current.drinks = element;
            }}
            addonSectionRef={(element) => {
              sectionElementRefs.current.sauces = element;
            }}
            addonSectionRefType={addonNavigationRef ?? undefined}
            sectionNavItems={visibleSections}
            activeSectionId={activeSectionId}
            onSelectSection={scrollToSection}
            onCustomizeIngredients={
              canCustomizeViaBuildPage
                ? () => {
                    router.push(
                      `/restaurant/${restaurantId}?view=ingredients&editCartItem=${editingCartItem!.id}`,
                      { scroll: false }
                    );
                  }
                : undefined
            }
          />
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 -mx-6 z-10 flex h-fit flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-white p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.08)]">
          <MacroTotalsGrid
            macros={{
              calories: Math.round(nutrition.calories ?? 0),
              protein: Math.round(nutrition.protein ?? 0),
              carbs: Math.round(nutrition.carbs ?? 0),
              fat: Math.round(nutrition.totalFat ?? 0),
            }}
            size="panel"
            className="gap-3 sm:gap-6"
            itemClassName="px-2 py-0.5"
            labelClassName="text-[#64748b]"
          />
          <div className="ml-auto flex items-center gap-3">
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
            {isCustomizeMode ? (
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-black/20 bg-white px-6 py-2.5 text-base font-bold text-black/80"
                onClick={handleResetEdits}
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-black/20 bg-black/90 px-6 py-2.5 text-base font-bold text-white"
              onClick={handleSaveItem}
            >
              {isCustomizeMode ? "Done" : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
