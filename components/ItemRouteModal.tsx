"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ItemDetailsPanel, { PortionSelector } from "@/components/ItemDetailsPanel";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  IngredientModifier,
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

function sumNutrition(base?: number, delta = 0) {
  if (base === undefined) return undefined;
  return base + delta;
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

function resolveIngredientForItemToken(token: string, ingredientItems: IngredientItem[]) {
  const normalizedToken = token.trim().toLowerCase();
  const normalizedByName = token.replace(/[-_]+/g, " ").trim().toLowerCase();

  return ingredientItems.find((ingredient) => {
    const byId = ingredient.id?.trim().toLowerCase();
    const byName = ingredient.name.trim().toLowerCase();
    return byId === normalizedToken || byName === normalizedToken || byName === normalizedByName;
  });
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function buildIngredientModifierChanges(
  item: MenuItem,
  ingredientItems?: IngredientItem[],
  ingredientModifiers?: IngredientModifier[]
) {
  if (!item.ingredients?.length || !ingredientItems?.length || !ingredientModifiers?.length) {
    return [] as CommonChange[];
  }

  const modifierById = new Map(ingredientModifiers.map((modifier) => [modifier.id, modifier]));

  return item.ingredients.flatMap((ingredientToken) => {
    const ingredient = resolveIngredientForItemToken(ingredientToken, ingredientItems);
    if (!ingredient?.allowedModifiers?.length) return [];

    const ingredientId = ingredient.id ?? ingredientToken;
    const ingredientName = ingredient.name;
    const baseCalories = ingredient.nutrition.calories ?? 0;
    const baseProtein = ingredient.nutrition.protein ?? 0;
    const baseCarbs = ingredient.nutrition.carbs ?? 0;
    const baseFat = ingredient.nutrition.totalFat ?? 0;

    return ingredient.allowedModifiers.flatMap((modifierId) => {
      const modifier = modifierById.get(modifierId);
      if (!modifier || modifier.multiplier === 1) return [];

      const multiplierDelta = modifier.multiplier - 1;

      return {
        id: `ingredient:${ingredientId}:${modifier.id}`,
        label: `${ingredientName}: ${modifier.label}`,
        delta: {
          calories: roundMacro(baseCalories * multiplierDelta),
          protein: roundMacro(baseProtein * multiplierDelta),
          carbs: roundMacro(baseCarbs * multiplierDelta),
          fat: roundMacro(baseFat * multiplierDelta),
        },
      } as CommonChange;
    });
  });
}

function getIngredientKeyFromChangeId(changeId: string) {
  if (!changeId.startsWith("ingredient:")) return null;
  const parts = changeId.split(":");
  return parts.length >= 3 ? parts[1] : null;
}


export default function ItemRouteModal({
  restaurantId,
  restaurantPath,
  item,
  addons,
  commonChanges,
  ingredientModifiers,
  ingredients,
  menuItems,
}: {
  restaurantId: string;
  restaurantPath: string;
  item: MenuItem;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredientModifiers?: IngredientModifier[];
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
  const applicableCommonChanges = useMemo(
    () => getApplicableCommonChanges(item, commonChanges),
    [item, commonChanges]
  );
  const ingredientModifierChanges = useMemo(
    () => buildIngredientModifierChanges(item, ingredients, ingredientModifiers),
    [item, ingredients, ingredientModifiers]
  );
  const allCommonChanges = useMemo(
    () => [...applicableCommonChanges, ...ingredientModifierChanges],
    [applicableCommonChanges, ingredientModifierChanges]
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

  const commonChangeTotals = useMemo(
    () =>
      allCommonChanges.reduce<MacroDelta>(
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
    [allCommonChanges, selectedCommonChangeIds]
  );

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs,
      fat: addonTotals.fat + commonChangeTotals.fat,
    }),
    [addonTotals, commonChangeTotals]
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
    calories: sumNutrition(baseNutrition.calories, customizationTotals.calories),
    protein: sumNutrition(baseNutrition.protein, customizationTotals.protein),
    carbs: sumNutrition(baseNutrition.carbs, customizationTotals.carbs),
    totalFat: sumNutrition(baseNutrition.totalFat, customizationTotals.fat),
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
    () => allCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)).map((change) => change.label),
    [allCommonChanges, selectedCommonChangeIds]
  );

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    const cartItem = {
      id: crypto.randomUUID(),
      restaurantId,
      itemId: item.id ?? item.name,
      name: item.name,
      image: selectedVariant?.image ?? item.image,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      optionsLabel,
      customizations: selectedCommonChanges.length ? selectedCommonChanges : undefined,
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
            commonChanges={allCommonChanges}
            selectedCommonChangeIds={selectedCommonChangeIds}
            onToggleCommonChange={(changeId) =>
              setSelectedCommonChangeIds((prev) => {
                const ingredientKey = getIngredientKeyFromChangeId(changeId);

                if (prev.includes(changeId)) {
                  return prev.filter((id) => id !== changeId);
                }

                if (!ingredientKey) {
                  return [...prev, changeId];
                }

                const withoutSameIngredient = prev.filter(
                  (id) => getIngredientKeyFromChangeId(id) !== ingredientKey
                );
                return [...withoutSameIngredient, changeId];
              })
            }
            customizationTotals={customizationTotals}
            showCustomizationDeltas={hasActiveCustomization}
            showVariantsInDetails={true}
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
