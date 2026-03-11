"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ItemDetailsPanel from "@/components/ItemDetailsPanel";
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
import ingredientsCatalog from "@/data/ingredientsCatalog.json";

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

function isIconImage(icon: string) {
  return icon.startsWith("/") || icon.startsWith("http://") || icon.startsWith("https://");
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


function normalizeIngredientToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function resolveModalIngredients(
  item: MenuItem,
  ingredients: IngredientItem[] = [],
  addons?: RestaurantAddons,
  menuItems: MenuItem[] = []
) {
  const ingredientIds =
    item.ingredients && item.ingredients.length > 0
      ? item.ingredients
      : item.portionType === "single"
        ? [item.id ?? item.name]
        : [];
  const ingredientLookup = ingredientsCatalog as Record<string, { label: string; icon: string }>;
  const ingredientByIdLookup = new Map<string, IngredientItem>();
  const ingredientByNameLookup = new Map<string, IngredientItem>();
  const addonLookup = new Map<string, AddonOption>();
  const menuItemByIdLookup = new Map<string, MenuItem>();
  const menuItemByNameLookup = new Map<string, MenuItem>();

  ingredients.forEach((entry) => {
    if (entry.id) {
      ingredientByIdLookup.set(entry.id.toLowerCase(), entry);
    }
    ingredientByNameLookup.set(normalizeIngredientToken(entry.name), entry);
  });

  Object.values(addons ?? {}).forEach((addonGroup) => {
    addonGroup?.forEach((addon) => {
      addonLookup.set(addon.name.toLowerCase(), addon);
    });
  });

  menuItems.forEach((menuItem) => {
    if (menuItem.id) {
      menuItemByIdLookup.set(menuItem.id.toLowerCase(), menuItem);
    }
    menuItemByNameLookup.set(normalizeIngredientToken(menuItem.name), menuItem);
  });

  return ingredientIds.map((ingredientId) => {
    const catalogEntry = ingredientLookup[ingredientId];
    const fallbackLabel = ingredientId
      .split(/[-_]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

    const match =
      ingredientByIdLookup.get(ingredientId.toLowerCase()) ??
      ingredientByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      ingredientByNameLookup.get(normalizeIngredientToken(fallbackLabel));
    const menuItemMatch =
      menuItemByIdLookup.get(ingredientId.toLowerCase()) ??
      menuItemByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      menuItemByNameLookup.get(normalizeIngredientToken(fallbackLabel));
    const label = catalogEntry?.label ?? match?.name ?? fallbackLabel;
    const addonMatch = addonLookup.get(label.toLowerCase());

    return {
      id: ingredientId,
      label: menuItemMatch?.name ?? label,
      icon: catalogEntry?.icon ?? match?.image ?? menuItemMatch?.image ?? addonMatch?.image ?? "🥣",
      calories: menuItemMatch?.nutrition.calories ?? match?.nutrition.calories ?? addonMatch?.calories,
    };
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
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>({});
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>({});
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>([]);
  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const { addItem } = useCart();
  const modalIngredients = useMemo(
    () => resolveModalIngredients(item, ingredients, addons, menuItems),
    [item, ingredients, addons, menuItems]
  );

  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
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
    () => applicableCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)).map((change) => change.label),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    if (isAddFeedbackVisible) return;

    addItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId: item.id ?? item.name,
      name: item.name,
      image: selectedVariant?.image ?? item.image,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      optionsLabel,
      customizations: selectedCommonChanges.length ? selectedCommonChanges : undefined,
      quantity: 1,
      macrosPerItem: {
        calories: nutrition.calories ?? 0,
        protein: nutrition.protein ?? 0,
        carbs: nutrition.carbs ?? 0,
        fat: nutrition.totalFat ?? 0,
      },
    });

    setIsAddFeedbackVisible(true);
    window.setTimeout(() => setIsAddFeedbackVisible(false), 1000);
  };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={item.name}>
      <button
        type="button"
        className="absolute inset-0 border-0 bg-slate-900/66"
        onClick={handleClose}
        aria-label="Close item modal"
      />
      <div className="relative m-4 h-[calc(100%-32px)] w-[min(1024px,calc(100%-32px))] overflow-auto rounded-2xl bg-white px-6 pt-6 pb-24">
        <button
          type="button"
          className="sticky top-0 ml-auto h-9 w-9 rounded-full border border-black/12 bg-white/95 text-2xl"
          onClick={handleClose}
          aria-label="Close item modal"
        >
          ×
        </button>

        <div className="grid justify-items-center gap-4">
          <h1 className="text-center text-[38px] font-extrabold">{item.name}</h1>
          {selectedItemImage ? (
            <img className="max-h-[300px] w-[min(560px,100%)] rounded-[14px] object-cover" src={selectedItemImage} alt={item.name} />
          ) : null}
          <div className="flex flex-wrap justify-center gap-7">
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

          {variants && variants.length > 1 ? (
            <>
              <div className="h-px w-[min(720px,100%)] bg-black/16" />
              <div className="grid w-[min(720px,100%)] justify-items-center gap-3">
                <div className="text-[13px] font-extrabold tracking-[0.06em] text-black/78">PORTION SIZE</div>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {variants.map((variant) => {
                    const isActive = variant.id === selectedVariantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        className={`min-w-[110px] rounded-full border px-4 py-1.5 text-sm font-bold ${
                          isActive ? "border-neutral-900 bg-neutral-900 text-white" : "border-black/20 bg-white"
                        }`}
                        onClick={() => setSelectedVariantId(variant.id)}
                      >
                        {variant.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-px w-[min(720px,100%)] bg-black/16" />
            </>
          ) : null}
        </div>

        <div className="mt-[18px] grid gap-3.5">
          {modalIngredients.length > 0 ? (
            <section className="rounded-[14px] border border-black/12 bg-white p-3.5">
              <h3 className="mb-3 text-lg font-bold">Ingredients</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
                {modalIngredients.map((ingredient) => (
                  <article
                    key={ingredient.id}
                    className="grid justify-items-center gap-1.5 rounded-xl border border-black/12 bg-zinc-50 p-2.5 text-center"
                  >
                    <div className="text-2xl" aria-hidden="true">
                      {isIconImage(ingredient.icon) ? (
                        <Image src={ingredient.icon} alt="" width={24} height={24} />
                      ) : (
                        ingredient.icon
                      )}
                    </div>
                    <div className="line-clamp-2 text-sm leading-[1.3] font-bold">{ingredient.label}</div>
                    <div className="text-xs font-semibold text-black/60">
                      {ingredient.calories !== undefined ? `${ingredient.calories} Cal` : "— Cal"}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <ItemDetailsPanel
            item={item}
            nutrition={nutrition}
            variants={null}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
            addons={addons}
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
          />
        </div>

        <div className="fixed right-0 bottom-0 left-0 flex justify-center border-t border-black/10 bg-white/95 px-4 py-3">
          <button
            type="button"
            className="rounded-xl border border-black/20 bg-black/90 px-6 py-2.5 text-base font-bold text-white"
            onClick={handleAddToCart}
          >
            {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
