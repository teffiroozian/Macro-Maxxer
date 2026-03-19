"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ItemDetailsPanel, { PortionSelector, resolvePanelIngredients } from "@/components/ItemDetailsPanel";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  MacroDelta,
  MenuItem,
  RestaurantAddons,
  IngredientItem,
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
}: {
  restaurantId: string;
  restaurantPath: string;
  item: MenuItem;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredients?: IngredientItem[];
  menuItems?: MenuItem[];
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
  const { addItem } = useCart();
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
  const resolvedIngredients = useMemo(
    () => resolvePanelIngredients(item, ingredients, addons, menuItems ?? [], variants, selectedVariantId),
    [addons, ingredients, item, menuItems, selectedVariantId, variants]
  );
  const initialIngredientCounts = useMemo(() => {
    const resolvedIngredientIds = new Set(resolvedIngredients.map((ingredient) => ingredient.id));

    return (item.ingredients ?? []).reduce<Record<string, number>>((counts, ingredientId) => {
      if (!resolvedIngredientIds.has(ingredientId) || ingredientId in counts) return counts;
      counts[ingredientId] = 1;
      return counts;
    }, {});
  }, [item.ingredients, resolvedIngredients]);
  const [selectedIngredientCounts, setSelectedIngredientCounts] = useState<Record<string, number>>(initialIngredientCounts);

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
      Object.entries(selectedIngredientCounts).reduce<MacroDelta>(
        (sum, [ingredientId, count]) => {
          const countDelta = count - 1;
          if (countDelta === 0) return sum;

          const ingredient =
            ingredientLookup.get(ingredientId) ??
            ingredientLookup.get(ingredientId.toLowerCase());

          if (!ingredient) return sum;

          return {
            calories: sum.calories + (ingredient.nutrition.calories ?? 0) * countDelta,
            protein: sum.protein + (ingredient.nutrition.protein ?? 0) * countDelta,
            carbs: sum.carbs + (ingredient.nutrition.carbs ?? 0) * countDelta,
            fat: sum.fat + (ingredient.nutrition.totalFat ?? 0) * countDelta,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [ingredientLookup, selectedIngredientCounts]
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
      Object.entries(selectedIngredientCounts)
        .filter(([, count]) => count !== 1)
        .flatMap(([ingredientId, count]) => {
          const ingredientName =
            ingredientLookup.get(ingredientId)?.label ??
            ingredientLookup.get(ingredientId.toLowerCase())?.label ??
            ingredientId;

          return [count === 0 ? `${ingredientName}: Removed` : `${ingredientName}: ${count}x`];
        }),
    [ingredientLookup, selectedIngredientCounts]
  );

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    const customizations = [...selectedCommonChanges, ...selectedIngredientCustomizations];

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

          {variants && variants.length > 0 ? (
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
            showVariantsInDetails={true}
            selectedIngredientCounts={selectedIngredientCounts}
            onDecrementIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                if (!(ingredientId in prev)) return prev;

                const current = prev[ingredientId] ?? 0;
                const nextCount = Math.max(0, current - 1);
                if (nextCount === current) return prev;

                return { ...prev, [ingredientId]: nextCount };
              })
            }
            onIncrementIngredient={(ingredientId) =>
              setSelectedIngredientCounts((prev) => {
                if (!(ingredientId in prev)) return prev;

                const ingredient =
                  ingredientLookup.get(ingredientId) ??
                  ingredientLookup.get(ingredientId.toLowerCase());
                const maxQuantity = ingredient?.maxQuantity;

                if (typeof maxQuantity !== "number") return prev;

                const current = prev[ingredientId] ?? 0;
                const nextCount = Math.min(maxQuantity, current + 1);
                if (nextCount === current) return prev;

                return { ...prev, [ingredientId]: nextCount };
              })
            }
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
