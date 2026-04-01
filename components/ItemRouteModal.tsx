"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ItemDetailsPanel, { PortionSelector, type ResolvedPanelIngredient, resolvePanelIngredients } from "@/components/ItemDetailsPanel";
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

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function sumNutritionWithFallback(base?: number, delta = 0) {
  if (delta === 0) return base;
  return (base ?? 0) + delta;
}

function formatMacro(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—g" : `${value}g`;
}

function formatCalories(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : String(value);
}

function addonFat(addon?: AddonOption) {
  return addon?.totalFat ?? addon?.fat ?? 0;
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

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories + ingredientCountTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein + ingredientCountTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs + ingredientCountTotals.carbs,
      fat: addonTotals.fat + commonChangeTotals.fat + ingredientCountTotals.fat,
    }),
    [addonTotals, commonChangeTotals, ingredientCountTotals]
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
    satFat: sumNutritionWithFallback(baseNutrition.satFat, addonTotals.satFat),
    transFat: sumNutritionWithFallback(baseNutrition.transFat, addonTotals.transFat),
    cholesterol: sumNutritionWithFallback(baseNutrition.cholesterol, addonTotals.cholesterol),
    sodium: sumNutritionWithFallback(baseNutrition.sodium, addonTotals.sodium),
    fiber: sumNutritionWithFallback(baseNutrition.fiber, addonTotals.fiber),
    sugars: sumNutritionWithFallback(baseNutrition.sugars, addonTotals.sugars),
  };

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
    const allowed = new Set(["sandwich", "nuggets", "chicken", "salad", "wrap"]);
    return item.categories.some((category) => allowed.has(normalizeCategory(category)));
  }, [item.categories, restaurantId]);
  const comboSides = useMemo(
    () =>
      (menuItems ?? []).filter((menuItem) =>
        menuItem.categories.some((category) => normalizeCategory(category) === "side")
      ),
    [menuItems]
  );
  const comboDrinks = useMemo(
    () =>
      (menuItems ?? []).filter((menuItem) =>
        menuItem.categories.some((category) => normalizeCategory(category) === "drinks")
      ),
    [menuItems]
  );

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    const comboSide = comboSides.find((side) => (side.id ?? side.name) === selectedComboSideId);
    const comboDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === selectedComboDrinkId);
    const comboCustomizations =
      isComboEligibleCategory && comboType === "combo-meal"
        ? [
            "Combo Meal",
            comboSide ? `Side: ${comboSide.name}` : undefined,
            comboDrink ? `Drink: ${comboDrink.name}` : undefined,
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
          <div className="flex flex-wrap justify-center gap-14">
            <div className="flex flex-col items-center">
              <div className="inline-flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">{formatCalories(nutrition.calories)}</span>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.calories)}</span>
                ) : null}
              </div>
              <span className="text-[10px] font-bold">CAL</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="inline-flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-orange-700">{formatMacro(nutrition.protein)}</span>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.protein)}</span>
                ) : null}
              </div>
              <span className="text-[10px] font-bold">PROTEIN</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="inline-flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-yellow-600">{formatMacro(nutrition.carbs)}</span>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.carbs)}</span>
                ) : null}
              </div>
              <span className="text-[10px] font-bold">CARBS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="inline-flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-600">{formatMacro(nutrition.totalFat)}</span>
                {hasActiveCustomization ? (
                  <span className="text-sm font-bold text-green-600">{formatDelta(customizationTotals.fat)}</span>
                ) : null}
              </div>
              <span className="text-[10px] font-bold">FAT</span>
            </div>
          </div>

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
            showComboTypeSelector={isComboEligibleCategory}
            comboType={comboType}
            onComboTypeChange={setComboType}
            comboSides={comboSides}
            comboDrinks={comboDrinks}
            selectedComboSideId={selectedComboSideId}
            selectedComboDrinkId={selectedComboDrinkId}
            onSelectComboSide={setSelectedComboSideId}
            onSelectComboDrink={setSelectedComboDrinkId}
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
