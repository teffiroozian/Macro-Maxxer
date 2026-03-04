"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CartMacros } from "@/stores/cartStore";
import type { AddonOption, MenuItem, Nutrition, RestaurantAddons } from "@/types/menu";
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
import styles from "@/components/ItemDetails.module.css";

const menuLookupByRestaurant: Record<string, MenuItem[]> = {
  chickfila: chickfilaMenu.items,
  chipotle: chipotleMenu.items,
  habit: habitMenu.items,
  mcdonalds: mcdonaldsMenu.items,
  mod: modMenu.items,
  panda: pandaMenu.items,
  panera: paneraMenu.items,
  starbucks: starbucksMenu.items,
  subway: subwayMenu.items,
};

const addonsLookupByRestaurant: Record<string, RestaurantAddons> = {
  chickfila: chickfilaMenu.addons,
  chipotle: chipotleMenu.addons,
  habit: habitMenu.addons,
  mcdonalds: mcdonaldsMenu.addons,
  mod: modMenu.addons,
  panda: pandaMenu.addons,
  panera: paneraMenu.addons,
  starbucks: starbucksMenu.addons,
  subway: subwayMenu.addons,
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
      const baseNutrition: Nutrition | undefined = selectedVariant?.nutrition ?? sourceItem?.nutrition;

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
  const router = useRouter();
  const { items, totals, updateQuantity, updateItem } = useCart();
  const expandedTotalsRef = useRef<HTMLElement | null>(null);
  const [expandedTotalsInView, setExpandedTotalsInView] = useState(false);

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

  useEffect(() => {
    const node = expandedTotalsRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setExpandedTotalsInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showStickyBar = items.length > 0 && !expandedTotalsInView;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 pb-72 pt-8 sm:px-6 sm:pt-10">
      <header className="rounded-3xl border border-black/10 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="mb-4">
          <Link
            href={backToMenuHref}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
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

      <section className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white px-5 py-8 text-center shadow-sm">
            <p className="text-lg font-medium text-neutral-900">Your cart is empty.</p>
            <p className="mt-2 text-sm text-neutral-600">Add items from a restaurant to start meal finalization.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((cartItem) => {
              const sourceItem =
                menuLookupByRestaurant[cartItem.restaurantId]?.find((item) => (item.id ?? item.name) === cartItem.itemId) ?? null;

              const menuItem: MenuItem = sourceItem ?? {
                id: cartItem.itemId,
                name: cartItem.name,
                categories: ["Cart"],
                portionType: "single",
                nutrition: {
                  calories: cartItem.macrosPerItem.calories,
                  protein: cartItem.macrosPerItem.protein,
                  carbs: cartItem.macrosPerItem.carbs,
                  totalFat: cartItem.macrosPerItem.fat,
                },
              };

              return (
                <MenuItemCard
                  key={cartItem.id}
                  restaurantId={cartItem.restaurantId}
                  item={menuItem}
                  addons={addonsLookupByRestaurant[cartItem.restaurantId]}
                  mode="cart"
                  cartQuantity={cartItem.quantity}
                  cartItemId={cartItem.id}
                  initialCartVariantId={cartItem.variantId}
                  initialCartOptionsLabel={cartItem.optionsLabel}
                  initialCartCustomizations={cartItem.customizations}
                  cartSummaryLine={cartItem.optionsLabel ? summarizeItem(cartItem) : undefined}
                  onCartDecrement={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                  onCartIncrement={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                  onCartConfigurationChange={(next) => {
                    updateItem(cartItem.id, {
                      variantId: next.variantId,
                      variantLabel: next.variantLabel,
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

      <section ref={expandedTotalsRef} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Meal Breakdown</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">No meal items yet.</p>
          ) : (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
              {items.map((item) => (
                <li key={`${item.id}-breakdown`}>
                  {item.quantity}x {item.name}
                  {summarizeItem(item) !== "No customizations" ? ` — ${summarizeItem(item)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-neutral-900">Nutrition Summary</h2>

          <section className={`${styles.labelCard} mt-4`}>
            <div className={styles.amountPerServing}>Amount per serving</div>

            <div className={styles.caloriesRow}>
              <div className={styles.caloriesText}>Calories</div>
              <div className={styles.caloriesValue}>{nutritionTotals.calories}</div>
            </div>

            <div className={styles.thickRule} />

            <div className={styles.row}>
              <div className={styles.rowTitle}>Total Fat</div>
              <div className={styles.rowValue}>{formatValue(nutritionTotals.totalFat, "g")}</div>
            </div>

            <div className={styles.subRow}>
              <div className={styles.subTitle}>Sat Fat</div>
              <div className={styles.subValue}>{formatValue(nutritionTotals.satFat, "g")}</div>
            </div>

            <div className={styles.subRow}>
              <div className={styles.subTitle}>Trans Fat</div>
              <div className={styles.subValue}>{formatValue(nutritionTotals.transFat, "g")}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowTitle}>Cholesterol</div>
              <div className={styles.rowValue}>{formatValue(nutritionTotals.cholesterol, "mg")}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowTitle}>Sodium</div>
              <div className={styles.rowValue}>{formatValue(nutritionTotals.sodium, "mg")}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowTitle}>Carbohydrates</div>
              <div className={styles.rowValue}>{formatValue(nutritionTotals.carbs, "g")}</div>
            </div>

            <div className={styles.subRow}>
              <div className={styles.subTitle}>Fiber</div>
              <div className={styles.subValue}>{formatValue(nutritionTotals.fiber, "g")}</div>
            </div>

            <div className={styles.subRow}>
              <div className={styles.subTitle}>Sugars</div>
              <div className={styles.subValue}>{formatValue(nutritionTotals.sugars, "g")}</div>
            </div>

            <div className={styles.row}>
              <div className={styles.rowTitle}>Protein</div>
              <div className={styles.rowValue}>{formatValue(nutritionTotals.protein, "g")}</div>
            </div>

            <div className={styles.footerText}>
              Aggregated nutrition totals for all items currently in your cart.
            </div>
          </section>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white px-4 py-4">
            <h3 className="text-lg font-semibold text-neutral-900">Macro Totals</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-black/10 px-3 py-2 text-center">
                <p className="text-lg font-semibold">{totals.calories}</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Calories</p>
              </div>
              <div className="rounded-xl border border-black/10 px-3 py-2 text-center">
                <p className="text-lg font-semibold">{totals.protein}g</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Protein</p>
              </div>
              <div className="rounded-xl border border-black/10 px-3 py-2 text-center">
                <p className="text-lg font-semibold">{totals.carbs}g</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Carbs</p>
              </div>
              <div className="rounded-xl border border-black/10 px-3 py-2 text-center">
                <p className="text-lg font-semibold">{totals.fat}g</p>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Fat</p>
              </div>
            </div>

                        <div className="my-4 h-px w-full bg-black/10" />

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.alert("Save Meal coming soon")}
                className="rounded-xl border border-black/15 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-200"
              >
                Save Meal
              </button>
              <button
                type="button"
                onClick={() => router.push("/cart/snapshot")}
                className="rounded-xl border border-black/90 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
              >
                Generate Snapshot
              </button>
            </div>
          </div>
        </div>
      </section>

      <StickyMacroTotalsBar
        totals={totals}
        visible={showStickyBar}
        onSaveMeal={() => window.alert("Save Meal coming soon")}
        onGenerateSnapshot={() => router.push("/cart/snapshot")}
      />
    </main>
  );
}
