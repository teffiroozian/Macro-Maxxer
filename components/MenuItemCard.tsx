"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
import ItemDetailsPanel, { resolvePanelIngredients } from "./ItemDetailsPanel";
import VariantSelector from "./VariantSelector";
import {
  addonFat,
  deltaFat,
  formatCalories,
  formatDelta,
  formatMacro,
  getApplicableCommonChanges,
  getDefaultIngredientCounts,
  getDefaultVariantId,
  isChickfilaBreakfastItem,
  isHashBrowns,
  isWaffleFries,
  menuItemFatWithFallback,
  normalizeCategory,
  sortComboSides,
  sumNutrition,
} from "@/lib/menuItemCalculations";
import { formatOptionLabelCounts } from "@/lib/cartOptionLabels";
import { buildOptionLabelCounts, formatCommonChangeForCart } from "@/lib/menuItemCard/cartLabelUtils";
import { formatIngredientCountCustomizationLabel } from "@/lib/menuItemCard/ingredientCountCustomization";
import IngredientCompactCard from "./menu-item-card/IngredientCompactCard";
import MenuCardActions from "./menu-item-card/MenuCardActions";
import CartCardActions from "./menu-item-card/CartCardActions";
import { useMenuItemCartAdapter } from "./menu-item-card/useMenuItemCartAdapter";
import { useMenuItemConfiguration } from "./menu-item-card/useMenuItemConfiguration";
import {
  buildHighProteinBuildConfiguration,
  isChipotleHighProteinMenuItem,
} from "@/lib/chipotleBuild/highProtein";
import { parseIncludedIngredientEntry } from "@/lib/itemIngredients";
import { normalizeNutrition } from "@/lib/nutrition";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMacroNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.round(value);
}

function QuickMacro({
  value,
  label,
  tone,
}: {
  value?: number;
  label: string;
  tone: "calories" | "protein" | "carbs" | "totalFat";
}) {
  const toneClass =
    tone === "protein"
      ? "text-[#c2410c]"
      : tone === "carbs"
        ? "text-[#ca8a04]"
        : tone === "totalFat"
          ? "text-[#2563eb]"
          : "text-slate-700";

  return (
    <div className="flex min-w-0 flex-col items-center justify-center">
      <span className={`text-sm leading-4 font-bold ${toneClass}`}>{toMacroNumber(value)}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-600">{label}</span>
    </div>
  );
}

function QuickVariantDropdown({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value?: string;
  options: Array<{ id: string; label: string }>;
  ariaLabel: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option.id === value)?.label ?? options[0]?.label ?? "Select";

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, wrapperRef]);

  return (
    <div ref={(node) => { wrapperRef.current = node; }} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-7 max-w-[160px] items-center justify-between gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-white"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-40 w-max min-w-full overflow-hidden rounded-xl border border-black/15 bg-white p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
          {options.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  active ? "bg-black text-white" : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}



const emptyAddon: AddonOption = {
  name: "None",
  calories: 0,
  protein: 0,
  carbs: 0,
  totalFat: 0,
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
    totalFat: number;
  };
};



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
  onCartModify,
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
  ingredientVariantOptions,
  selectedIngredientVariantId,
  ingredientPortionBadge,
  ingredientPortionModeOptions,
  selectedIngredientPortionModeId,
  onIngredientPortionModeChange,
  onIngredientVariantChange,
  flattenIngredientListInDetails = false,
  lockedIngredientIdsInDetails,
  suppressRemovedIngredientCustomizationsInCart = false,
  showDetailsButton = true,
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
  onCartModify?: () => void;
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
  lockedIngredientIdsInDetails?: string[];
  suppressRemovedIngredientCustomizationsInCart?: boolean;
  showDetailsButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const shouldOpenModalOnCardClick = mode !== "cart" && Boolean(itemHref) && showDetailsButton;
  const variants = item.variants?.length ? item.variants : null;
  const hasVariantDropdown = Boolean(variants && variants.length > 1 && !item.hideVariantSelector);
  const variantSelectorDisabled = Boolean(item.disableVariantSelector);
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialCartVariantId ?? defaultVariantId);
  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const [isIngredientSelected, setIsIngredientSelected] = useState(controlledIngredientSelected ?? false);
  const { addItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
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

  const {
    selectedAddons,
    setSelectedAddons,
    selectedSauceCounts,
    setSelectedSauceCounts,
    selectedCommonChangeIds,
    setSelectedCommonChangeIds,
    selectedIngredientCounts,
    setSelectedIngredientCounts,
    comboType,
    parsedInitialComboCustomization,
    resetConfiguration,
  } = useMenuItemConfiguration({
    mode,
    item,
    addons,
    commonChanges,
    initialCartOptionsLabel,
    initialCartCustomizations,
    resolvedIngredients,
  });

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
          totalFat: sum.totalFat + addonFat(addon),
        }),
        { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
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
            totalFat: sum.totalFat + deltaFat(change),
          };
        },
        { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
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
            totalFat: sum.totalFat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
          };
        },
        { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
      ),
    [ingredientCounts, ingredientLookup]
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
  const [selectedComboSideId, setSelectedComboSideId] = useState<string | undefined>(() => {
    const matchedSide = comboSides.find((side) => side.name === parsedInitialComboCustomization.sideName);
    return matchedSide ? (matchedSide.id ?? matchedSide.name) : undefined;
  });
  const [selectedComboDrinkId, setSelectedComboDrinkId] = useState<string | undefined>(() => {
    const matchedDrink = comboDrinks.find((drink) => drink.name === parsedInitialComboCustomization.drinkName);
    return matchedDrink ? (matchedDrink.id ?? matchedDrink.name) : undefined;
  });
  const [selectedComboSideVariantId, setSelectedComboSideVariantId] = useState<string | undefined>(() => {
    const matchedSide = comboSides.find((side) => side.name === parsedInitialComboCustomization.sideName);
    const sideVariants = matchedSide?.variants ?? [];
    const matchedVariant = sideVariants.find((variant) => variant.label === parsedInitialComboCustomization.sideVariantLabel);
    return matchedVariant?.id ?? getDefaultVariantId(matchedSide);
  });
  const [selectedComboDrinkVariantId, setSelectedComboDrinkVariantId] = useState<string | undefined>(() => {
    const matchedDrink = comboDrinks.find((drink) => drink.name === parsedInitialComboCustomization.drinkName);
    const drinkVariants = matchedDrink?.variants ?? [];
    const matchedVariant = drinkVariants.find((variant) => variant.label === parsedInitialComboCustomization.drinkVariantLabel);
    return matchedVariant?.id ?? getDefaultVariantId(matchedDrink);
  });
  const selectedComboSide = useMemo(
    () => comboSides.find((side) => (side.id ?? side.name) === selectedComboSideId),
    [comboSides, selectedComboSideId]
  );
  const selectedComboDrink = useMemo(
    () => comboDrinks.find((drink) => (drink.id ?? drink.name) === selectedComboDrinkId),
    [comboDrinks, selectedComboDrinkId]
  );
  const selectedComboSideVariant = useMemo(
    () => selectedComboSide?.variants?.find((variant) => variant.id === selectedComboSideVariantId),
    [selectedComboSide, selectedComboSideVariantId]
  );
  const selectedComboDrinkVariant = useMemo(
    () => selectedComboDrink?.variants?.find((variant) => variant.id === selectedComboDrinkVariantId),
    [selectedComboDrink, selectedComboDrinkVariantId]
  );
  const comboNutritionTotals = useMemo(() => {
    if (!isComboEligibleCategory || comboType !== "combo-meal") {
      return { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
    }

    const drinkNutrition = selectedComboDrinkVariant?.nutrition ?? selectedComboDrink?.nutrition;
    const sideNutrition = selectedComboSideVariant?.nutrition ?? selectedComboSide?.nutrition;
    return {
      calories: (drinkNutrition?.calories ?? 0) + (sideNutrition?.calories ?? 0),
      protein: (drinkNutrition?.protein ?? 0) + (sideNutrition?.protein ?? 0),
      carbs: (drinkNutrition?.carbs ?? 0) + (sideNutrition?.carbs ?? 0),
      totalFat: (drinkNutrition?.totalFat ?? menuItemFatWithFallback(selectedComboDrink)) + (sideNutrition?.totalFat ?? menuItemFatWithFallback(selectedComboSide)),
    };
  }, [comboType, isComboEligibleCategory, selectedComboDrink, selectedComboDrinkVariant, selectedComboSide, selectedComboSideVariant]);

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories + comboNutritionTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein + comboNutritionTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs + comboNutritionTotals.carbs,
      totalFat: addonTotals.totalFat + commonChangeTotals.totalFat + ingredientCountTotals.totalFat + comboNutritionTotals.totalFat,
    }),
    [addonTotals, comboNutritionTotals, commonChangeTotals, ingredientCountTotals]
  );

  const hasMods = useMemo(
    () =>
      Object.values(selectedAddons).some((addon) => addon && addon.name !== "None") ||
      Object.values(selectedSauceCounts).some((count) => count > 0) ||
      selectedCommonChangeIds.length > 0 ||
      resolvedIngredients.some((ingredient) => (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount) ||
      (isComboEligibleCategory && comboType === "combo-meal" && Boolean(selectedComboSide || selectedComboDrink)),
    [
      comboType,
      ingredientCounts,
      isComboEligibleCategory,
      resolvedIngredients,
      selectedAddons,
      selectedComboDrink,
      selectedComboSide,
      selectedCommonChangeIds,
      selectedSauceCounts,
    ]
  );

  const hasActiveCustomization = useMemo(
    () =>
      customizationTotals.calories !== 0 ||
      customizationTotals.protein !== 0 ||
      customizationTotals.carbs !== 0 ||
      customizationTotals.totalFat !== 0,
    [customizationTotals]
  );

  function resetMods() {
    resetConfiguration();
  }

  function addNutritionValue(baseValue?: number, deltaValue?: number) {
    if (baseValue === undefined && deltaValue === undefined) return undefined;
    return (baseValue ?? 0) + (deltaValue ?? 0);
  }

  const nutrition = normalizeNutrition({
    ...baseNutrition,
    calories: sumNutrition(baseNutrition.calories, addonNutritionTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories + comboNutritionTotals.calories),
    protein: sumNutrition(baseNutrition.protein, addonNutritionTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein + comboNutritionTotals.protein),
    carbs: sumNutrition(baseNutrition.carbs, addonNutritionTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs + comboNutritionTotals.carbs),
    totalFat: sumNutrition(baseNutrition.totalFat, addonNutritionTotals.totalFat + commonChangeTotals.totalFat + ingredientCountTotals.totalFat + comboNutritionTotals.totalFat),
    satFat: addNutritionValue(baseNutrition.satFat, addonNutritionTotals.satFat),
    transFat: addNutritionValue(baseNutrition.transFat, addonNutritionTotals.transFat),
    cholesterol: addNutritionValue(baseNutrition.cholesterol, addonNutritionTotals.cholesterol),
    sodium: addNutritionValue(baseNutrition.sodium, addonNutritionTotals.sodium),
    fiber: addNutritionValue(baseNutrition.fiber, addonNutritionTotals.fiber),
    sugars: addNutritionValue(baseNutrition.sugars, addonNutritionTotals.sugars),
  });

  const calories = nutrition.calories;
  const protein = nutrition.protein;
  const carbs = nutrition.carbs;
  const totalFat = nutrition.totalFat;
  const mainItemOnlyNutrition = useMemo(
    () =>
      normalizeNutrition({
        ...baseNutrition,
        calories: sumNutrition(
          baseNutrition.calories,
          addonNutritionTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories
        ),
        protein: sumNutrition(
          baseNutrition.protein,
          addonNutritionTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein
        ),
        carbs: sumNutrition(
          baseNutrition.carbs,
          addonNutritionTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs
        ),
        totalFat: sumNutrition(
          baseNutrition.totalFat,
          addonNutritionTotals.totalFat + commonChangeTotals.totalFat + ingredientCountTotals.totalFat
        ),
      }),
    [addonNutritionTotals, baseNutrition, commonChangeTotals, ingredientCountTotals]
  );
  const quickMainName =
    comboType === "combo-meal"
      ? item.name.replace(/\s+combo\b/i, "").trim()
      : item.name;

  const rankText = typeof rankIndex === "number" ? pad2(rankIndex + 1) : null;
  const isCartMode = mode === "cart";
  const quantityMultiplier = isCartMode ? Math.max(cartQuantity, 1) : 1;
  const displayCalories = (calories ?? 0) * quantityMultiplier;
  const displayProtein = (protein ?? 0) * quantityMultiplier;
  const displayCarbs = (carbs ?? 0) * quantityMultiplier;
  const displayFat = (totalFat ?? 0) * quantityMultiplier;
  const highProteinIngredientSummaryLine = useMemo(() => {
    if (!isChipotleHighProteinMenuItem(item, restaurantId)) return undefined;
    const ingredientLabelById = new Map(
      (ingredientItems ?? []).map((ingredient) => [
        (ingredient.id ?? ingredient.name).toLowerCase(),
        ingredient.name,
      ])
    );
    const labels = (item.ingredients ?? [])
      .map((entry) => {
        const parsed = parseIncludedIngredientEntry(entry);
        if (!parsed) return null;
        const ingredientName =
          ingredientLabelById.get(parsed.ingredientId.toLowerCase()) ?? parsed.ingredientId;
        const countLabel = Number.isInteger(parsed.defaultCount)
          ? parsed.defaultCount.toFixed(0)
          : parsed.defaultCount.toString();
        return `${ingredientName} (${countLabel}x)`;
      })
      .filter((label): label is string => Boolean(label));

    return labels.length > 0 ? labels.join(" • ") : undefined;
  }, [ingredientItems, item, restaurantId]);
  const isCartPage = pathname === "/cart";
  const useCartQuickEditPanel = isCartMode && isCartPage;

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
      const ingredientMatch = normalized.match(/^(.*?):\s*(Removed|(\d+(?:\.\d+)?)x|Remove|Extra)$/i);
      const isIngredientCustomization =
        ingredientMatch ? ingredientLabels.has(ingredientMatch[1].trim().toLowerCase()) : false;

      return !addonNames.has(normalized) && !commonChangeLabels.has(normalized) && !isIngredientCustomization && normalized !== "Combo Meal" && !/^Side:\s*/i.test(normalized) && !/^Drink:\s*/i.test(normalized);
    });
  }, [addons, commonChanges, initialCartCustomizations, item.addonRefs, resolvedIngredients]);

  const optionsLabel = useMemo(() => {
    return formatOptionLabelCounts(buildOptionLabelCounts(selectedAddons, selectedSauceCounts));
  }, [selectedAddons, selectedSauceCounts]);

  const customizations = useMemo(() => {
    const modifierLabels = selectedCommonChanges.map((change) => formatCommonChangeForCart(change.label));
    const ingredientCountLabels = resolvedIngredients
      .filter((ingredient) => !ingredient.isNoneOption && (ingredientCounts[ingredient.id] ?? ingredient.defaultCount) !== ingredient.defaultCount)
      .flatMap((ingredient) => {
        const ingredientCount = ingredientCounts[ingredient.id] ?? ingredient.defaultCount;
        if (suppressRemovedIngredientCustomizationsInCart && ingredientCount <= 0) {
          return [];
        }
        return [formatIngredientCountCustomizationLabel(ingredient.label, ingredientCount)];
      });

    const comboLabels =
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

    const labels = [...modifierLabels, ...ingredientCountLabels, ...comboLabels];
    return labels.length > 0 ? labels : undefined;
  }, [comboType, ingredientCounts, isComboEligibleCategory, resolvedIngredients, selectedComboDrink, selectedComboDrinkVariant, selectedComboSide, selectedComboSideVariant, selectedCommonChanges, suppressRemovedIngredientCustomizationsInCart]);

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

    return getMatchingItem({
      restaurantId,
      itemId: item.id ?? item.name,
      variantId: selectedVariantForCart?.id,
      optionsLabel,
      customizations,
    });
  }, [customizations, getMatchingItem, isCartMode, item.id, item.name, optionsLabel, restaurantId, selectedVariantForCart?.id]);

  const emitCartConfiguration = (
    nextVariantId: string,
    nextAddons: Partial<Record<AddonRef, AddonOption>>,
    nextSauceCounts: Record<string, number>,
    nextSelectedCommonChangeIds: string[] = selectedCommonChangeIds,
    nextSelectedIngredientCounts: Record<string, number> = ingredientCounts,
    nextComboType: "just-item" | "combo-meal" = comboType,
    nextComboSideId: string | undefined = selectedComboSideId,
    nextComboDrinkId: string | undefined = selectedComboDrinkId,
    nextComboSideVariantId: string | undefined = selectedComboSideVariantId,
    nextComboDrinkVariantId: string | undefined = selectedComboDrinkVariantId
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
        totalFat: sum.totalFat + addonFat(addon),
      }),
      { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
    );

    const commonChangeTotalsForCart = applicableCommonChanges.reduce<MacroDelta>(
      (sum, change) => {
        if (!nextSelectedCommonChangeIds.includes(change.id)) return sum;
        return {
          calories: sum.calories + change.delta.calories,
          protein: sum.protein + change.delta.protein,
          carbs: sum.carbs + change.delta.carbs,
          totalFat: sum.totalFat + deltaFat(change),
        };
      },
      { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
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
          totalFat: sum.totalFat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
        };
      },
      { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
    );

    const nextOptionsLabel = formatOptionLabelCounts(buildOptionLabelCounts(nextAddons, nextSauceCounts));
    const selectedCommonChangesForCart = applicableCommonChanges
      .filter((change) => nextSelectedCommonChangeIds.includes(change.id))
      .map((change) => formatCommonChangeForCart(change.label));
    const nextComboSide = comboSides.find((side) => (side.id ?? side.name) === nextComboSideId);
    const nextComboDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === nextComboDrinkId);
    const nextComboSideVariant = nextComboSide?.variants?.find((variant) => variant.id === nextComboSideVariantId);
    const nextComboDrinkVariant = nextComboDrink?.variants?.find((variant) => variant.id === nextComboDrinkVariantId);
    const comboCustomizations =
      isComboEligibleCategory && nextComboType === "combo-meal"
        ? [
            "Combo Meal",
            nextComboSide
              ? `Side: ${nextComboSide.name}${nextComboSideVariant ? ` (${nextComboSideVariant.label})` : ""}`
              : undefined,
            nextComboDrink
              ? `Drink: ${nextComboDrink.name}${nextComboDrinkVariant ? ` (${nextComboDrinkVariant.label})` : ""}`
              : undefined,
          ].filter((entry): entry is string => Boolean(entry))
        : [];
    const comboMacros =
      isComboEligibleCategory && nextComboType === "combo-meal"
        ? {
            calories: (nextComboDrinkVariant?.nutrition.calories ?? nextComboDrink?.nutrition.calories ?? 0)
              + (nextComboSideVariant?.nutrition.calories ?? nextComboSide?.nutrition.calories ?? 0),
            protein: (nextComboDrinkVariant?.nutrition.protein ?? nextComboDrink?.nutrition.protein ?? 0)
              + (nextComboSideVariant?.nutrition.protein ?? nextComboSide?.nutrition.protein ?? 0),
            carbs: (nextComboDrinkVariant?.nutrition.carbs ?? nextComboDrink?.nutrition.carbs ?? 0)
              + (nextComboSideVariant?.nutrition.carbs ?? nextComboSide?.nutrition.carbs ?? 0),
            totalFat: (nextComboDrinkVariant?.nutrition.totalFat ?? menuItemFatWithFallback(nextComboDrink))
              + (nextComboSideVariant?.nutrition.totalFat ?? menuItemFatWithFallback(nextComboSide)),
          }
        : { calories: 0, protein: 0, carbs: 0, totalFat: 0 };

    const selectedIngredientCustomizationsForCart = resolvedIngredients
      .filter((ingredient) => {
        if (ingredient.isNoneOption) return false;
        const ingredientCount = nextSelectedIngredientCounts[ingredient.id] ?? ingredient.defaultCount;
        return ingredientCount !== ingredient.defaultCount;
      })
      .flatMap((ingredient) => {
        const ingredientCount = nextSelectedIngredientCounts[ingredient.id] ?? ingredient.defaultCount;
        if (suppressRemovedIngredientCustomizationsInCart && ingredientCount <= 0) {
          return [];
        }
        return [formatIngredientCountCustomizationLabel(ingredient.label, ingredientCount)];
      });
    const nextCustomizations = [
      ...retainedCustomizations,
      ...selectedCommonChangesForCart,
      ...selectedIngredientCustomizationsForCart,
      ...comboCustomizations,
    ];

    onCartConfigurationChange({
      variantId: activeVariant?.id,
      variantLabel: activeVariant?.label,
      optionsLabel: nextOptionsLabel,
      customizations: nextCustomizations.length > 0 ? nextCustomizations : undefined,
      image: activeVariant?.image ?? item.image,
      macrosPerItem: {
        calories: (baseForCart.calories ?? 0) + addonTotalsForCart.calories + ingredientCountTotalsForCart.calories + comboMacros.calories,
        protein: (baseForCart.protein ?? 0) + addonTotalsForCart.protein + commonChangeTotalsForCart.protein + ingredientCountTotalsForCart.protein + comboMacros.protein,
        carbs: (baseForCart.carbs ?? 0) + addonTotalsForCart.carbs + commonChangeTotalsForCart.carbs + ingredientCountTotalsForCart.carbs + comboMacros.carbs,
        totalFat: (baseForCart.totalFat ?? 0) + addonTotalsForCart.totalFat + commonChangeTotalsForCart.totalFat + ingredientCountTotalsForCart.totalFat + comboMacros.totalFat,
      },
    });
  };

  useEffect(() => {
    if (!isCartMode || !isComboEligibleCategory) return;

    emitCartConfiguration(
      selectedVariantId,
      selectedAddons,
      selectedSauceCounts,
      selectedCommonChangeIds,
      ingredientCounts,
      comboType,
      selectedComboSideId,
      selectedComboDrinkId,
      selectedComboSideVariantId,
      selectedComboDrinkVariantId
    );
  }, [
    comboType,
    ingredientCounts,
    isCartMode,
    isComboEligibleCategory,
    selectedAddons,
    selectedComboDrinkId,
    selectedComboDrinkVariantId,
    selectedComboSideId,
    selectedComboSideVariantId,
    selectedCommonChangeIds,
    selectedSauceCounts,
    selectedVariantId,
  ]);

  const handleAddToCart = () => {
    if (isAddFeedbackVisible) return;

    const baseForCart = selectedVariantForCart?.nutrition ?? item.nutrition;
    const highProteinBuildConfiguration = isChipotleHighProteinMenuItem(item, restaurantId)
      ? buildHighProteinBuildConfiguration(item, ingredientItems)
      : undefined;

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
        buildConfiguration: highProteinBuildConfiguration,
        macrosPerItem: {
          calories: (baseForCart.calories ?? 0) + addonTotals.calories + ingredientCountTotals.calories,
          protein: (baseForCart.protein ?? 0) + addonTotals.protein + ingredientCountTotals.protein,
          carbs: (baseForCart.carbs ?? 0) + addonTotals.carbs + ingredientCountTotals.carbs,
          totalFat: (baseForCart.totalFat ?? 0) + addonTotals.totalFat + ingredientCountTotals.totalFat,
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
      <IngredientCompactCard
        item={item}
        selectedItemImage={selectedItemImage}
        ingredientSelectionState={ingredientSelectionState}
        isIngredientSelectionDisabled={isIngredientSelectionDisabled}
        ingredientSelectionControl={ingredientSelectionControl}
        ingredientDisabledReason={ingredientDisabledReason}
        ingredientPortionBadge={ingredientPortionBadge}
        isIngredientUnavailable={isIngredientUnavailable}
        ingredientUnavailableReason={ingredientUnavailableReason}
        activeCompactOptions={activeCompactOptions}
        selectedCompactOptionId={selectedCompactOptionId}
        calories={calories}
        protein={protein}
        carbs={carbs}
        totalFat={totalFat}
        onSelectionChange={(nextSelected) => {
          if (ingredientSelectionControl === "radio" && !nextSelected) {
            return;
          }
          if (isIngredientSelectionDisabled && nextSelected) {
            return;
          }
          setIsIngredientSelected(nextSelected);
          onIngredientSelectionChange?.(item, nextSelected);
        }}
        onCompactOptionSelect={(optionId) => {
          if (ingredientPortionModeOptions) {
            onIngredientPortionModeChange?.(optionId);
          } else {
            onIngredientVariantChange?.(optionId);
          }
        }}
      />
    );
  }


  return (
    <li
      className={`list-none rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${
        open && useCartQuickEditPanel ? "overflow-visible" : "overflow-hidden"
      } ${
        isTopRanked ? "border-[1.5px] border-black/80" : "border border-black/15"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        className="group relative flex w-full cursor-pointer flex-col items-stretch gap-4 bg-transparent p-3 text-left focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px] sm:gap-6 sm:p-4 lg:flex-row"
        onClick={() => {
          if (shouldOpenModalOnCardClick && itemHref) {
            router.push(itemHref, { scroll: false });
            return;
          }
          setOpen((v) => !v);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (shouldOpenModalOnCardClick && itemHref) {
              router.push(itemHref, { scroll: false });
              return;
            }
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        aria-controls={`${id}-details`}
      >
        <div className="w-full shrink-0 lg:mx-0 lg:w-auto">
          {selectedItemImage ? (
            <img
              className={`block h-[200px] w-full rounded-[14px] bg-[#efefef] object-contain p-2 shadow-[0_0_5px_rgba(0,0,0,0.25)] lg:h-[210px] lg:w-[210px] ${
                isCartMode ? "lg:object-contain lg:p-2" : "lg:object-cover lg:p-0"
              }`}
              src={selectedItemImage}
              alt={item.name}
            />
          ) : (
            <div className="h-[200px] w-full rounded-[14px] bg-[#efefef] lg:h-[210px] lg:w-[210px]" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch py-1">
          <div className="flex flex-col gap-2">
            {rankText && (
              <div>
                <div className="inline-block border-b-[5px] border-b-yellow-500 px-1.5 text-xl font-bold">{rankText}</div>
              </div>
            )}
            <div className="text-[26px] leading-[1.05] font-bold sm:text-[30px]">{item.name}</div>
            <div className="flex items-center">
              <div className="inline-flex items-baseline gap-2">
                <div className="text-lg font-bold text-black/50">{formatCalories(displayCalories)} calories</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.calories * quantityMultiplier)}</span>
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
                      disabled={variantSelectorDisabled}
                      onChange={(nextVariantId) => {
                        if (variantSelectorDisabled) {
                          return;
                        }
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
            {!isCartMode && highProteinIngredientSummaryLine ? (
              <p className="mt-0.5 truncate text-[13px] text-black/55">{highProteinIngredientSummaryLine}</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 sm:mt-auto sm:gap-x-8">
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#c2410c]">{formatMacro(displayProtein)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.protein * quantityMultiplier)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">PROTEIN</div>
            </div>
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#ca8a04]">{formatMacro(displayCarbs)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.carbs * quantityMultiplier)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">CARBS</div>
            </div>
            <div className="flex flex-col items-center justify-start">
              <div className="inline-flex items-baseline gap-1.5">
                <div className="text-2xl font-bold text-[#2563eb]">{formatMacro(displayFat)}</div>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.totalFat * quantityMultiplier)}</span>
                ) : null}
              </div>
              <div className="text-[10px] font-bold">FAT</div>
            </div>

            <div className="ml-0 inline-flex w-full flex-row items-end justify-end gap-2 sm:ml-auto sm:w-auto">
              {isCartMode ? (
                <CartCardActions
                  itemName={item.name}
                  quantity={cartQuantity}
                  onModify={() => {
                    if (onCartModify) {
                      onCartModify();
                      return;
                    }
                    setOpen(true);
                  }}
                  onIncrement={() => onCartIncrement?.()}
                  onDecrement={() => onCartDecrement?.()}
                />
              ) : (
                <MenuCardActions
                  isAddFeedbackVisible={isAddFeedbackVisible}
                  onAddToCart={() => {
                    if (itemHref && showDetailsButton) {
                      router.push(itemHref, { scroll: false });
                      return;
                    }
                    handleAddToCart();
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="absolute right-3 top-3 hidden items-center gap-2 sm:right-[18px] sm:top-[18px] sm:inline-flex">
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
            aria-label={shouldOpenModalOnCardClick ? `Open details for ${item.name}` : `Toggle addon options for ${item.name}`}
            className={`text-[26px] leading-none font-medium text-black/75 transition duration-200 group-hover:text-black/95 ${
              open ? "rotate-45" : ""
            }`}
            onClick={(event) => {
              event.stopPropagation();
              if (shouldOpenModalOnCardClick && itemHref) {
                router.push(itemHref, { scroll: false });
                return;
              }
              setOpen((v) => !v);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                if (shouldOpenModalOnCardClick && itemHref) {
                  router.push(itemHref, { scroll: false });
                  return;
                }
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
        className={`rounded-b-2xl ${open && useCartQuickEditPanel ? "overflow-x-visible overflow-y-visible" : "overflow-hidden"} bg-white transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[5000px]" : "max-h-0"
        }`}
      >
        <div className="p-3">
          {useCartQuickEditPanel ? (
            <div className="rounded-2xl border border-black/10 bg-[#efefef] p-3">
              <div className="space-y-3">
                <section>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Main</p>
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-black/10 bg-white">
                      {selectedItemImage ? (
                        <img src={selectedItemImage} alt={item.name} className="h-full w-full object-contain p-1" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{quickMainName}</p>
                        {hasVariantDropdown ? (
                          <QuickVariantDropdown
                            ariaLabel={`${item.name} quick portion`}
                            value={selectedVariantId}
                            options={(variants ?? []).map((variant) => ({ id: variant.id, label: variant.label }))}
                            onChange={(nextVariantId) => {
                              setSelectedVariantId(nextVariantId);
                              emitCartConfiguration(nextVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds);
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                        <QuickMacro value={mainItemOnlyNutrition.calories} label="Cal" tone="calories" />
                        <QuickMacro value={mainItemOnlyNutrition.protein} label="Protein" tone="protein" />
                        <QuickMacro value={mainItemOnlyNutrition.carbs} label="Carbs" tone="carbs" />
                        <QuickMacro value={mainItemOnlyNutrition.totalFat} label="Fat" tone="totalFat" />
                      </div>
                    </div>
                  </div>
                </section>

                {comboType === "combo-meal" && selectedComboSide ? (
                  <section>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Side</p>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-black/10 bg-white">
                        {selectedComboSide.image ? (
                          <img src={selectedComboSide.image} alt={selectedComboSide.name} className="h-full w-full object-contain p-1" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{selectedComboSide.name}</p>
                          {selectedComboSide.variants && selectedComboSide.variants.length > 1 ? (
                            <QuickVariantDropdown
                              ariaLabel={`${selectedComboSide.name} size`}
                              value={selectedComboSideVariantId}
                              options={selectedComboSide.variants.map((variant) => ({ id: variant.id, label: variant.label }))}
                              onChange={(variantId) => {
                                setSelectedComboSideVariantId(variantId);
                                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, selectedComboSideId, selectedComboDrinkId, variantId, selectedComboDrinkVariantId);
                              }}
                            />
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                          <QuickMacro value={selectedComboSideVariant?.nutrition.calories ?? selectedComboSide.nutrition.calories} label="Cal" tone="calories" />
                          <QuickMacro value={selectedComboSideVariant?.nutrition.protein ?? selectedComboSide.nutrition.protein} label="Protein" tone="protein" />
                          <QuickMacro value={selectedComboSideVariant?.nutrition.carbs ?? selectedComboSide.nutrition.carbs} label="Carbs" tone="carbs" />
                          <QuickMacro value={selectedComboSideVariant?.nutrition.totalFat ?? selectedComboSide.nutrition.totalFat} label="Fat" tone="totalFat" />
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {comboType === "combo-meal" && selectedComboDrink ? (
                  <section>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Drink</p>
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-black/10 bg-white">
                        {selectedComboDrink.image ? (
                          <img src={selectedComboDrink.image} alt={selectedComboDrink.name} className="h-full w-full object-contain p-1" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{selectedComboDrink.name}</p>
                          {selectedComboDrink.variants && selectedComboDrink.variants.length > 1 ? (
                            <QuickVariantDropdown
                              ariaLabel={`${selectedComboDrink.name} size`}
                              value={selectedComboDrinkVariantId}
                              options={selectedComboDrink.variants.map((variant) => ({ id: variant.id, label: variant.label }))}
                              onChange={(variantId) => {
                                setSelectedComboDrinkVariantId(variantId);
                                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, selectedComboSideId, selectedComboDrinkId, selectedComboSideVariantId, variantId);
                              }}
                            />
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                          <QuickMacro value={selectedComboDrinkVariant?.nutrition.calories ?? selectedComboDrink.nutrition.calories} label="Cal" tone="calories" />
                          <QuickMacro value={selectedComboDrinkVariant?.nutrition.protein ?? selectedComboDrink.nutrition.protein} label="Protein" tone="protein" />
                          <QuickMacro value={selectedComboDrinkVariant?.nutrition.carbs ?? selectedComboDrink.nutrition.carbs} label="Carbs" tone="carbs" />
                          <QuickMacro value={selectedComboDrinkVariant?.nutrition.totalFat ?? selectedComboDrink.nutrition.totalFat} label="Fat" tone="totalFat" />
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {item.addonRefs?.includes("sauces") &&
                (addons?.sauces?.length ?? 0) > 0 &&
                addons?.sauces?.some((addon) => (selectedSauceCounts[addon.name] ?? 0) > 0) ? (
                  <section>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Sauces</p>
                    <div className="space-y-1.5">
                      {addons?.sauces?.filter((addon) => addon.name !== "None" && (selectedSauceCounts[addon.name] ?? 0) > 0).map((addon) => {
                        const count = selectedSauceCounts[addon.name] ?? 0;
                        return (
                          <div
                            key={addon.name}
                            className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-black/10 bg-white">
                              {addon.image ? (
                                <img src={addon.image} alt={addon.name} className="h-full w-full object-contain p-1" />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{addon.name}</p>
                              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-1 py-1">
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-md border border-black/15 text-base font-semibold text-slate-800"
                                  onClick={() => {
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
                                >
                                  -
                                </button>
                                <span className="min-w-4 text-center text-sm font-semibold">{count}</span>
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-md border border-black/15 text-base font-semibold text-slate-800"
                                  onClick={() => {
                                    setSelectedSauceCounts((prev) => {
                                      const currentTotal = Object.values(prev).reduce((sum, selectedCount) => sum + selectedCount, 0);
                                      if (currentTotal >= maxSauceSelections) return prev;
                                      const next = { ...prev, [addon.name]: (prev[addon.name] ?? 0) + 1 };
                                      emitCartConfiguration(selectedVariantId, selectedAddons, next, selectedCommonChangeIds);
                                      return next;
                                    });
                                  }}
                                >
                                  +
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                                <QuickMacro value={addon.calories * count} label="Cal" tone="calories" />
                                <QuickMacro value={addon.protein * count} label="Protein" tone="protein" />
                                <QuickMacro value={addon.carbs * count} label="Carbs" tone="carbs" />
                                <QuickMacro value={addon.totalFat * count} label="Fat" tone="totalFat" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {item.addonRefs?.includes("dressings") &&
                selectedAddons.dressings &&
                selectedAddons.dressings.name !== "None" ? (
                  <section>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Dressings</p>
                    <div className="space-y-1.5">
                      <div className="grid w-full grid-cols-[72px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left">
                        <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border border-black/10 bg-white">
                          {selectedAddons.dressings.image ? (
                            <img src={selectedAddons.dressings.image} alt={selectedAddons.dressings.name} className="h-full w-full object-contain p-1" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{selectedAddons.dressings.name}</p>
                          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                            <QuickMacro value={selectedAddons.dressings.calories} label="Cal" tone="calories" />
                            <QuickMacro value={selectedAddons.dressings.protein} label="Protein" tone="protein" />
                            <QuickMacro value={selectedAddons.dressings.carbs} label="Carbs" tone="carbs" />
                            <QuickMacro value={selectedAddons.dressings.totalFat} label="Fat" tone="totalFat" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

              </div>
            </div>
          ) : (
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
              comboType={comboType}
              comboSides={comboSides}
              comboDrinks={comboDrinks}
              selectedComboSideId={selectedComboSideId}
              selectedComboDrinkId={selectedComboDrinkId}
              selectedComboSideVariantId={selectedComboSideVariantId}
              selectedComboDrinkVariantId={selectedComboDrinkVariantId}
              onSelectComboSide={(sideId) => {
                const isDeselecting = selectedComboSideId === sideId;
                const nextSideId = isDeselecting ? undefined : sideId;
                const nextSide = comboSides.find((side) => (side.id ?? side.name) === nextSideId);
                const nextSideVariantId = isDeselecting ? undefined : getDefaultVariantId(nextSide);
                setSelectedComboSideId(nextSideId);
                setSelectedComboSideVariantId(nextSideVariantId);
                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, nextSideId, selectedComboDrinkId, nextSideVariantId, selectedComboDrinkVariantId);
              }}
              onSelectComboDrink={(drinkId) => {
                const isDeselecting = selectedComboDrinkId === drinkId;
                const nextDrinkId = isDeselecting ? undefined : drinkId;
                const nextDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === nextDrinkId);
                const nextDrinkVariantId = isDeselecting ? undefined : getDefaultVariantId(nextDrink);
                setSelectedComboDrinkId(nextDrinkId);
                setSelectedComboDrinkVariantId(nextDrinkVariantId);
                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, selectedComboSideId, nextDrinkId, selectedComboSideVariantId, nextDrinkVariantId);
              }}
              onSelectComboSideVariant={(variantId) => {
                setSelectedComboSideVariantId(variantId);
                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, selectedComboSideId, selectedComboDrinkId, variantId, selectedComboDrinkVariantId);
              }}
              onSelectComboDrinkVariant={(variantId) => {
                setSelectedComboDrinkVariantId(variantId);
                emitCartConfiguration(selectedVariantId, selectedAddons, selectedSauceCounts, selectedCommonChangeIds, ingredientCounts, comboType, selectedComboSideId, selectedComboDrinkId, selectedComboSideVariantId, variantId);
              }}
              customizationTotals={customizationTotals}
              showCustomizationDeltas={hasActiveCustomization}
              displayMode="full"
              flattenIngredientList={flattenIngredientListInDetails}
              lockedIngredientIds={lockedIngredientIdsInDetails}
            />
          )}
        </div>
      </div>
    </li>
  );
}
