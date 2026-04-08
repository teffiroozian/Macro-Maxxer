"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CartMacros } from "@/stores/cartStore";
import MenuItemCard from "@/components/MenuItemCard";
import StickyMacroTotalsBar from "@/components/StickyMacroTotalsBar";
import CartNutritionSummary from "@/components/cart/CartNutritionSummary";
import restaurants from "@/app/data/index.json";
import { useCart } from "@/stores/cartStore";
import {
  addonsLookupByRestaurant,
  commonChangesLookupByRestaurant,
  customizationRulesLookupByRestaurant,
  ingredientLookupByRestaurant,
  menuLookupByRestaurant,
} from "@/lib/cart/menuRegistry";
import { buildCartNutritionTotals } from "@/lib/cart/nutrition";
import {
  buildCartMenuItemFromState,
  getBuildIngredientCountCustomizations,
  getIncludedIngredientIdsForChipotleBuild,
} from "@/lib/cart/buildItemAdapters";
import { parseOptionLabelCounts } from "@/lib/cartOptionLabels";
import { toItemSlug } from "@/lib/restaurants";

function isIngredientCustomizationLabel(label: string) {
  return /:\s*(Removed|(\d+)x|Remove|Extra)\s*$/i.test(label);
}

function hasComboCustomization(customizations?: string[]) {
  return (customizations ?? []).some((label) => /^(Combo Meal|Side:\s*|Drink:\s*)/i.test(label.trim()));
}

function formatCartItemName(name: string, customizations?: string[]) {
  if (!hasComboCustomization(customizations)) return name;
  return /\bcombo\b/i.test(name) ? name : `${name} Combo`;
}

function summarizeItem(item: { optionsLabel?: string; customizations?: string[] }) {
  const addonNames = new Set(Object.keys(parseOptionLabelCounts(item.optionsLabel)));
  const dedupedCustomizations = (item.customizations ?? []).filter((label) => {
    const normalized = label.replace(/^\+\s*/, "").trim();
    return !addonNames.has(normalized);
  });

  const ingredientCustomizations: string[] = [];
  const sideCustomizations: string[] = [];
  const drinkCustomizations: string[] = [];
  const otherCustomizations: string[] = [];

  dedupedCustomizations.forEach((rawLabel) => {
    const label = rawLabel.trim();
    if (!label || /^Combo Meal$/i.test(label)) return;
    if (/^Side:\s*/i.test(label)) {
      sideCustomizations.push(label);
      return;
    }
    if (/^Drink:\s*/i.test(label)) {
      drinkCustomizations.push(label);
      return;
    }
    if (isIngredientCustomizationLabel(label)) {
      ingredientCustomizations.push(label);
      return;
    }
    otherCustomizations.push(label);
  });

  const segments = [
    ...ingredientCustomizations,
    ...sideCustomizations,
    ...drinkCustomizations,
    ...otherCustomizations,
    item.optionsLabel,
  ].filter(Boolean);

  return segments.join(" • ");
}

function areStringArraysEqual(a?: string[], b?: string[]) {
  if (!a?.length && !b?.length) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function areMacrosEqual(a: CartMacros, b: CartMacros) {
  return a.calories === b.calories && a.protein === b.protein && a.carbs === b.carbs && a.fat === b.fat;
}

export default function CartPage() {
  const { items, totals, updateQuantity, updateItem } = useCart();
  const router = useRouter();
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
  const chipotleEntreeFromCart = useMemo(() => {
    if (cartRestaurantIds.length !== 1 || cartRestaurantIds[0] !== "chipotle") {
      return null;
    }

    const selectedEntree = items.find((item) => item.restaurantId === "chipotle")?.buildConfiguration?.selectedEntree;
    return selectedEntree ?? null;
  }, [cartRestaurantIds, items]);
  const backToMenuHref = cartRestaurantIds[0]
    ? chipotleEntreeFromCart
      ? `/restaurant/${cartRestaurantIds[0]}?entree=${encodeURIComponent(chipotleEntreeFromCart)}`
      : `/restaurant/${cartRestaurantIds[0]}`
    : "/";
  const headerTitle = cartRestaurantIds.length > 1 ? "Mixed Restaurants" : (headerRestaurant?.name ?? "Meal Finalization");
  const headerLogo = cartRestaurantIds.length > 1 ? undefined : headerRestaurant?.logo;

  const nutritionTotals = useMemo(
    () => buildCartNutritionTotals(items, menuLookupByRestaurant, addonsLookupByRestaurant),
    [items]
  );

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
              const itemEditHref = sourceItem
                ? `/restaurant/${cartItem.restaurantId}/items/${toItemSlug(sourceItem)}?editCartItem=${cartItem.id}`
                : undefined;

              const initialIngredientCustomizations = getBuildIngredientCountCustomizations(
                cartItem,
                ingredientItemsForRestaurant
              );
              const includedIngredientIds = getIncludedIngredientIdsForChipotleBuild(cartItem);

              const menuItem = buildCartMenuItemFromState(cartItem, sourceItem, ingredientItemsForRestaurant);
              const displayName = formatCartItemName(menuItem.name, cartItem.customizations);

              return (
                <MenuItemCard
                  key={cartItem.id}
                  restaurantId={cartItem.restaurantId}
                  item={{ ...menuItem, name: displayName }}
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
                    const hasAnyChange =
                      cartItem.variantId !== next.variantId
                      || cartItem.variantLabel !== next.variantLabel
                      || cartItem.image !== next.image
                      || cartItem.optionsLabel !== next.optionsLabel
                      || !areStringArraysEqual(cartItem.customizations, next.customizations)
                      || !areMacrosEqual(cartItem.macrosPerItem, next.macrosPerItem as CartMacros);

                    if (!hasAnyChange) return;

                    updateItem(cartItem.id, {
                      variantId: next.variantId,
                      variantLabel: next.variantLabel,
                      image: next.image,
                      optionsLabel: next.optionsLabel,
                      customizations: next.customizations,
                      macrosPerItem: next.macrosPerItem as CartMacros,
                    });
                  }}
                  onCartModify={
                    itemEditHref
                      ? () => {
                          router.push(itemEditHref, { scroll: false });
                        }
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 rounded-3xl bg-[#e0e0e0] p-4 lg:grid-cols-2">

            <CartNutritionSummary nutritionTotals={nutritionTotals} />
            
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
                      const displayName = formatCartItemName(item.name, item.customizations);

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
                              {item.quantity}x {displayName}
                            </p>
                            {detailLine ? (
                              <p className="truncate text-xs text-neutral-500">{detailLine}</p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="space-y-2 pt-4">
                  <p className="text-md font-semibold uppercase tracking-wide text-neutral-500">Protein Score</p>
                  <div className="rounded-xl bg-[#efefef] px-3 py-2">
                    <p className="mt-1 text-sm text-neutral-900">
                      <span className="font-bold">{proteinPer100Calories}g</span> of protein in <span className="font-semibold">100 calories</span>
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
