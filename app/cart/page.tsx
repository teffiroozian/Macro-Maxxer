"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CartMacros } from "@/stores/cartStore";
import type {
  AddonOption,
  CommonChange,
  IngredientItem,
  MenuItem,
  Nutrition,
  RestaurantAddons,
  RestaurantCustomizationRules,
  RestaurantMenu,
} from "@/types/menu";
import MenuItemCard from "@/components/MenuItemCard";
import StickyMacroTotalsBar from "@/components/StickyMacroTotalsBar";
import restaurants from "@/app/data/index.json";
import chickfilaMenu from "@/app/data/chickfila.json";
import chipotleMenu from "@/app/data/chipotle.json";
import habitMenu from "@/app/data/habit.json";
import mcdonaldsMenu from "@/app/data/mcdonalds.json";
import modMenu from "@/app/data/mod.json";
import pandaMenu from "@/app/data/panda.json";
import paneraMenu from "@/app/data/panera.json";
import starbucksMenu from "@/app/data/starbucks.json";
import subwayMenu from "@/app/data/subway.json";
import { useCart } from "@/stores/cartStore";
import { normalizeAddons } from "@/lib/addons";
import { resolveMenuDataset } from "@/lib/menuResolver";

type MenuDataset = RestaurantMenu;

const chickfilaData = resolveMenuDataset(chickfilaMenu as unknown as MenuDataset);
const chipotleData = resolveMenuDataset(chipotleMenu as unknown as MenuDataset);
const habitData = resolveMenuDataset(habitMenu as unknown as MenuDataset);
const mcdonaldsData = resolveMenuDataset(mcdonaldsMenu as unknown as MenuDataset);
const modData = resolveMenuDataset(modMenu as unknown as MenuDataset);
const pandaData = resolveMenuDataset(pandaMenu as unknown as MenuDataset);
const paneraData = resolveMenuDataset(paneraMenu as unknown as MenuDataset);
const starbucksData = resolveMenuDataset(starbucksMenu as unknown as MenuDataset);
const subwayData = resolveMenuDataset(subwayMenu as unknown as MenuDataset);

const menuLookupByRestaurant: Record<string, MenuItem[]> = {
  chickfila: chickfilaData.items ?? [],
  chipotle: chipotleData.items ?? [],
  habit: habitData.items ?? [],
  mcdonalds: mcdonaldsData.items ?? [],
  mod: modData.items ?? [],
  panda: pandaData.items ?? [],
  panera: paneraData.items ?? [],
  starbucks: starbucksData.items ?? [],
  subway: subwayData.items ?? [],
};

const addonsLookupByRestaurant: Record<string, RestaurantAddons> = {
  chickfila: normalizeAddons(chickfilaData.addons),
  chipotle: normalizeAddons(chipotleData.addons),
  habit: normalizeAddons(habitData.addons),
  mcdonalds: normalizeAddons(mcdonaldsData.addons),
  mod: normalizeAddons(modData.addons),
  panda: normalizeAddons(pandaData.addons),
  panera: normalizeAddons(paneraData.addons),
  starbucks: normalizeAddons(starbucksData.addons),
  subway: normalizeAddons(subwayData.addons),
};

const ingredientLookupByRestaurant: Partial<Record<string, IngredientItem[]>> = {
  chickfila: chickfilaData.ingredients,
  chipotle: chipotleData.ingredients,
};

const commonChangesLookupByRestaurant: Partial<Record<string, CommonChange[]>> = {
  chickfila: chickfilaData.commonChanges,
};

const customizationRulesLookupByRestaurant: Partial<Record<string, RestaurantCustomizationRules>> = {
  chickfila: chickfilaData.customizationRules,
};

type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
};

function toTitleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeIngredientKey(value: string) {
  return value.trim().toLowerCase();
}

function getIncludedIngredientIdsForChipotleBuild(cartItem: ReturnType<typeof useCart>["items"][number]) {
  if (cartItem.restaurantId !== "chipotle" || !cartItem.buildConfiguration) {
    return [] as string[];
  }

  const configuration = cartItem.buildConfiguration;

  if (configuration.selectedEntree === "burrito") {
    return ["tortilla"];
  }

  if (configuration.selectedEntree === "quesadilla") {
    return ["tortilla", "cheese"];
  }

  if (configuration.selectedEntree === "salad") {
    return ["romaine-lettuce"];
  }

  if (configuration.selectedEntree === "tacos") {
    return [configuration.selectedTacoShell === "crispy" ? "crispy-corn-tortilla" : "soft-flour-tortilla"];
  }

  if (configuration.selectedEntree === "kids-meal" && configuration.selectedKidsMeal === "quesadilla") {
    return ["soft-flour-tortilla", "cheese"];
  }

  return [];
}

function getBuildIngredientCountCustomizations(
  cartItem: ReturnType<typeof useCart>["items"][number],
  ingredientItems?: IngredientItem[]
) {
  if (!cartItem.buildConfiguration?.selectedIngredientItems) {
    return cartItem.customizations;
  }

  const ingredientNameLookup = new Map<string, string>();
  (ingredientItems ?? []).forEach((ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    ingredientNameLookup.set(normalizeIngredientKey(ingredientId), ingredient.name);
  });

  const labels = Object.entries(cartItem.buildConfiguration.selectedIngredientItems)
    .filter(([, selection]) => selection.quantity > 1)
    .map(([ingredientId, selection]) => {
      const ingredientLabel = ingredientNameLookup.get(normalizeIngredientKey(ingredientId)) ?? toTitleCase(ingredientId);
      return `${ingredientLabel}: ${selection.quantity}x`;
    });

  return labels.length > 0 ? labels : undefined;
}

function buildCartBuildYourOwnMenuItem(
  cartItem: ReturnType<typeof useCart>["items"][number],
  ingredientItems?: IngredientItem[]
): MenuItem {
  const ingredientCatalog = ingredientItems ?? [];
  const selectedIngredientIds = Object.entries(cartItem.buildConfiguration?.selectedIngredientItems ?? {})
    .filter(([, selection]) => selection.quantity > 0)
    .map(([ingredientId]) => ingredientId);

  const ingredientOptionsByTab = ingredientCatalog.reduce<Record<string, string[]>>((acc, ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    const tabName = toTitleCase((ingredient.categories?.[0] ?? ingredient.category ?? "Ingredients").trim());

    if (!acc[tabName]) {
      acc[tabName] = [];
    }

    acc[tabName].push(ingredientId);
    return acc;
  }, {});

  const tabNames = Object.keys(ingredientOptionsByTab);
  const ingredientTabMaxQuantities = tabNames.reduce<Record<string, number>>((acc, tabName) => {
    acc[tabName] = 10;
    return acc;
  }, {});

  return {
    id: cartItem.itemId,
    name: cartItem.name,
    image: cartItem.image,
    categories: ["Cart"],
    portionType: "single",
    nutrition: {
      calories: cartItem.macrosPerItem.calories,
      protein: cartItem.macrosPerItem.protein,
      carbs: cartItem.macrosPerItem.carbs,
      totalFat: cartItem.macrosPerItem.fat,
    },
    ingredients: selectedIngredientIds,
    customization: {
      ingredientTabs: tabNames,
      ingredientTabMaxQuantities,
      ingredientOptionsByTab,
      singleSelectIngredientTabs: ["Proteins", "Rice", "Beans", "Shell"].filter((tabName) =>
        tabNames.some((candidate) => normalizeIngredientKey(candidate) === normalizeIngredientKey(tabName))
      ),
      tabsWithNoneOption: ["Proteins", "Rice", "Beans", "Shell"].filter((tabName) =>
        tabNames.some((candidate) => normalizeIngredientKey(candidate) === normalizeIngredientKey(tabName))
      ),
    },
  };
}


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

function summarizeItem(item: { variantLabel?: string; optionsLabel?: string; customizations?: string[] }) {
  const addonNames = new Set(Object.keys(parseOptionLabelCounts(item.optionsLabel)));
  const dedupedCustomizations = (item.customizations ?? []).filter((label) => {
    const normalized = label.replace(/^\+\s*/, "").trim();
    return !addonNames.has(normalized);
  });

  const segments = [item.variantLabel, item.optionsLabel, ...dedupedCustomizations]
    .filter(Boolean)
    .join(" • ");

  return segments || "No customizations";
}

function formatValue(value?: number, suffix = "") {
  return value === undefined ? "—" : `${value}${suffix}`;
}

function addOptional(total: number | undefined, next: number | undefined, quantity: number) {
  if (next === undefined) return total;
  return (total ?? 0) + (next * quantity);
}

function getSelectedAddonNutrition(
  optionsLabel: string | undefined,
  sourceItem: MenuItem | undefined,
  restaurantAddons: RestaurantAddons | undefined
) {
  const selectedAddonCounts = parseOptionLabelCounts(optionsLabel);

  if (Object.keys(selectedAddonCounts).length === 0 || !sourceItem || !restaurantAddons) {
    return [] as AddonOption[];
  }

  return (sourceItem.addonRefs ?? [])
    .flatMap((ref) => restaurantAddons[ref] ?? [])
    .flatMap((addon) => Array.from({ length: selectedAddonCounts[addon.name] ?? 0 }, () => addon));
}

function buildCartNutritionTotals(items: ReturnType<typeof useCart>["items"]): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (sum, cartItem) => {
      const sourceItem = menuLookupByRestaurant[cartItem.restaurantId]?.find((item) => (item.id ?? item.name) === cartItem.itemId);
      const restaurantAddons = addonsLookupByRestaurant[cartItem.restaurantId];
      const selectedAddons = getSelectedAddonNutrition(cartItem.optionsLabel, sourceItem, restaurantAddons);
      const selectedVariant = sourceItem?.variants?.find((variant) => variant.id === cartItem.variantId);
      const baseNutrition: Nutrition | undefined =
        selectedVariant?.nutrition ?? sourceItem?.nutrition ?? cartItem.nutritionPerItem;

      const addonNutrition = selectedAddons.reduce(
        (addonSum, addon) => ({
          satFat: addonSum.satFat + (addon.satFat ?? 0),
          transFat: addonSum.transFat + (addon.transFat ?? 0),
          cholesterol: addonSum.cholesterol + (addon.cholesterol ?? 0),
          sodium: addonSum.sodium + (addon.sodium ?? 0),
          fiber: addonSum.fiber + (addon.fiber ?? 0),
          sugars: addonSum.sugars + (addon.sugars ?? 0),
        }),
        { satFat: 0, transFat: 0, cholesterol: 0, sodium: 0, fiber: 0, sugars: 0 }
      );

      sum.calories += cartItem.macrosPerItem.calories * cartItem.quantity;
      sum.protein += cartItem.macrosPerItem.protein * cartItem.quantity;
      sum.carbs += cartItem.macrosPerItem.carbs * cartItem.quantity;
      sum.totalFat += cartItem.macrosPerItem.fat * cartItem.quantity;
      sum.satFat = addOptional(sum.satFat, (baseNutrition?.satFat ?? 0) + addonNutrition.satFat, cartItem.quantity);
      sum.transFat = addOptional(sum.transFat, (baseNutrition?.transFat ?? 0) + addonNutrition.transFat, cartItem.quantity);
      sum.cholesterol = addOptional(
        sum.cholesterol,
        (baseNutrition?.cholesterol ?? 0) + addonNutrition.cholesterol,
        cartItem.quantity
      );
      sum.sodium = addOptional(sum.sodium, (baseNutrition?.sodium ?? 0) + addonNutrition.sodium, cartItem.quantity);
      sum.fiber = addOptional(sum.fiber, (baseNutrition?.fiber ?? 0) + addonNutrition.fiber, cartItem.quantity);
      sum.sugars = addOptional(sum.sugars, (baseNutrition?.sugars ?? 0) + addonNutrition.sugars, cartItem.quantity);

      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
  );
}

export default function CartPage() {
  const { items, totals, updateQuantity, updateItem } = useCart();
  const inlineMacroBarRef = useRef<HTMLDivElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(true);

  useEffect(() => {
    const inlineMacroBar = inlineMacroBarRef.current;
    if (!inlineMacroBar) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px 0px -120px 0px",
        threshold: 0,
      }
    );

    observer.observe(inlineMacroBar);

    return () => {
      observer.disconnect();
    };
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const cartRestaurantIds = useMemo(
    () => [...new Set(items.map((item) => item.restaurantId))],
    [items]
  );

  const headerRestaurant = restaurants.find((restaurant) => restaurant.id === cartRestaurantIds[0]);
  const backToMenuHref = cartRestaurantIds[0] ? `/restaurant/${cartRestaurantIds[0]}` : "/";
  const headerTitle = cartRestaurantIds.length > 1 ? "Mixed Restaurants" : (headerRestaurant?.name ?? "Meal Finalization");
  const headerLogo = cartRestaurantIds.length > 1 ? undefined : headerRestaurant?.logo;

  const nutritionTotals = useMemo(() => buildCartNutritionTotals(items), [items]);

  const macroTotalGrams = totals.protein + totals.carbs + totals.fat;
  const macroSegments = [
    {
      label: "Protein",
      percent: macroTotalGrams > 0 ? (totals.protein / macroTotalGrams) * 100 : 0,
      color: "bg-[#c2410c] text-white",
    },
    {
      label: "Carbs",
      percent: macroTotalGrams > 0 ? (totals.carbs / macroTotalGrams) * 100 : 0,
      color: "bg-[#ca8a04] text-white",
    },
    {
      label: "Fat",
      percent: macroTotalGrams > 0 ? (totals.fat / macroTotalGrams) * 100 : 0,
      color: "bg-[#2563eb] text-white",
    },
  ];
  const proteinPer100Calories = totals.calories > 0 ? Math.round((totals.protein / totals.calories) * 100) : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
      <header className="rounded-3xl border border-black/10 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="mb-4">
          <Link
            href={backToMenuHref}
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            ← Back to menu
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-neutral-50 shadow-sm">
            {headerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headerLogo} alt={`${headerTitle} logo`} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">LOGO</div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{headerTitle}</h1>
            <p className="mt-1 text-sm text-neutral-600">[{itemCount}] Items</p>
          </div>
        </div>
      </header>

      <section className="w-full space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white px-5 py-8 text-center shadow-sm">
            <p className="text-lg font-medium text-neutral-900">Your cart is empty.</p>
            <p className="mt-2 text-sm text-neutral-600">Add items from a restaurant to start meal finalization.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((cartItem) => {
              const ingredientItemsForRestaurant = ingredientLookupByRestaurant[cartItem.restaurantId];
              const sourceItem =
                menuLookupByRestaurant[cartItem.restaurantId]?.find((item) => (item.id ?? item.name) === cartItem.itemId) ?? null;

              const initialIngredientCustomizations = getBuildIngredientCountCustomizations(
                cartItem,
                ingredientItemsForRestaurant
              );
              const includedIngredientIds = getIncludedIngredientIdsForChipotleBuild(cartItem);

              const menuItem: MenuItem = sourceItem
                ?? (cartItem.buildConfiguration
                  ? buildCartBuildYourOwnMenuItem(cartItem, ingredientItemsForRestaurant)
                  : {
                      id: cartItem.itemId,
                      name: cartItem.name,
                      image: cartItem.image,
                      categories: ["Cart"],
                      portionType: "single",
                      nutrition: {
                        calories: cartItem.macrosPerItem.calories,
                        protein: cartItem.macrosPerItem.protein,
                        carbs: cartItem.macrosPerItem.carbs,
                        totalFat: cartItem.macrosPerItem.fat,
                      },
                    });

              return (
                <MenuItemCard
                  key={cartItem.id}
                  restaurantId={cartItem.restaurantId}
                  item={menuItem}
                  addons={addonsLookupByRestaurant[cartItem.restaurantId]}
                  ingredientItems={ingredientItemsForRestaurant}
                  menuItems={menuLookupByRestaurant[cartItem.restaurantId]}
                  customizationRules={customizationRulesLookupByRestaurant[cartItem.restaurantId]}
                  commonChanges={commonChangesLookupByRestaurant[cartItem.restaurantId]}
                  mode="cart"
                  cartQuantity={cartItem.quantity}
                  cartItemId={cartItem.id}
                  initialCartVariantId={cartItem.variantId}
                  initialCartOptionsLabel={cartItem.optionsLabel}
                  initialCartCustomizations={initialIngredientCustomizations}
                  flattenIngredientListInDetails={Boolean(cartItem.buildConfiguration)}
                  lockedIngredientIdsInDetails={includedIngredientIds}
                  suppressRemovedIngredientCustomizationsInCart={Boolean(cartItem.buildConfiguration)}
                  cartSummaryLine={summarizeItem(cartItem)}
                  onCartDecrement={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                  onCartIncrement={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                  onCartConfigurationChange={(next) => {
                    updateItem(cartItem.id, {
                      variantId: next.variantId,
                      variantLabel: next.variantLabel,
                      image: next.image,
                      optionsLabel: next.optionsLabel,
                      customizations: next.customizations,
                      macrosPerItem: next.macrosPerItem as CartMacros,
                    });
                  }}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 rounded-3xl bg-[#e0e0e0] p-4 lg:grid-cols-2">

            <div className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-[18px]">
              <h2 className="mb-6 text-2xl font-bold text-neutral-900">Nutrition Summary</h2>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-xl font-bold">Calories</div>
                <div className="text-xl font-bold">{nutritionTotals.calories}</div>
              </div>

              <div className="my-[12px] mb-2 h-[5px] rounded-[999px] bg-[rgba(0,0,0,0.75)]" />

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                <div className="text-lg font-semibold">Total Fat</div>
                <div className="text-lg font-semibold">{formatValue(nutritionTotals.totalFat, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sat Fat</div>
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.satFat, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Trans Fat</div>
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.transFat, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                <div className="text-lg font-semibold">Cholesterol</div>
                <div className="text-lg font-semibold">{formatValue(nutritionTotals.cholesterol, "mg")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                <div className="text-lg font-semibold">Sodium</div>
                <div className="text-lg font-semibold">{formatValue(nutritionTotals.sodium, "mg")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                <div className="text-lg font-semibold">Carbohydrates</div>
                <div className="text-lg font-semibold">{formatValue(nutritionTotals.carbs, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Fiber</div>
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.fiber, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sugars</div>
                <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(nutritionTotals.sugars, "g")}</div>
              </div>

              <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                <div className="text-lg font-semibold">Protein</div>
                <div className="text-lg font-semibold">{formatValue(nutritionTotals.protein, "g")}</div>
              </div>

              <div className="mt-3 text-xs font-medium leading-[1.05] text-[rgba(0,0,0,0.55)]">
                Aggregated nutrition totals for all items currently in your cart.
              </div>
            </div>
            
            <div className="flex min-h-0 flex-col rounded-3xl border border-black/10 bg-white p-5">
              <h2 className="text-2xl font-bold text-neutral-900">Meal Breakdown</h2>
              <div className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-4">
                <p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Items</p>
                {items.length === 0 ? (
                  <p className="text-sm text-neutral-600">No meal items yet.</p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto max-h-[300px] bg-[#efefef] p-2 rounded-xl">
                    {items.map((item) => {
                      const detailLine = summarizeItem(item);

                      return (
                        <li
                          key={`${item.id}-breakdown`}
                          className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-3 py-2"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              {item.quantity}x {item.name}
                            </p>
                            {detailLine !== "No customizations" ? (
                              <p className="truncate text-xs text-neutral-500">{detailLine}</p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="space-y-2 pt-4">
                  <p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Protein Efficiency</p>
                  <div className="rounded-xl bg-[#efefef] px-3 py-2">
                    <p className="mt-1 text-sm text-neutral-900">
                      <span className="font-bold">{proteinPer100Calories}g</span> of Protein in <span className="font-semibold">100cals</span>
                    </p>
                  </div>
                </div>
                   <div className="space-y-2 pt-4">
                    <p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Macro Split</p>
                    <div className="flex h-11 w-full overflow-hidden p-1 gap-1 rounded-xl border border-black/10 bg-neutral-100">
                      {macroSegments.map((segment) => (
                        <div
                          key={segment.label}
                          className={`flex min-w-0 items-center justify-center px-1 rounded-xl text-[11px] font-semibold text-neutral-900 ${segment.color}`}
                          style={{ width: `${segment.percent}%` }}
                        >
                          {segment.percent >= 18 ? `${segment.label} ${Math.round(segment.percent)}%` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
              </div>
            </div>
            <div ref={inlineMacroBarRef} className="col-span-2">
          <StickyMacroTotalsBar
            totals={totals}
            inline
            layoutPreset="cart"
            onSecondaryAction={() => window.alert("Save Meal coming soon")}
            onPrimaryAction={() => window.alert("Generate Snapshot coming soon")}
          />
        </div>
        </div>
      

        
      </section>

      <StickyMacroTotalsBar
        totals={totals}
        visible={showStickyBar}
        layoutPreset="cart"
        onSecondaryAction={() => window.alert("Save Meal coming soon")}
        onPrimaryAction={() => window.alert("Generate Snapshot coming soon")}
      />
    </main>
  );
}
