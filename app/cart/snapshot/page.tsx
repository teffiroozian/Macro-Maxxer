"use client";

import Link from "next/link";
import { useMemo } from "react";
import restaurants from "@/app/data/index.json";
import { useCart } from "@/stores/cartStore";
import { parseOptionsLabel } from "@/lib/addonSelections";

function summarizeItem(item: { variantLabel?: string; optionsLabel?: string; customizations?: string[] }) {
  const addonNames = new Set(parseOptionsLabel(item.optionsLabel).map((selection) => selection.name));
  const dedupedCustomizations = (item.customizations ?? []).filter((label) => {
    const normalized = label.replace(/^\+\s*/, "").trim();
    return !addonNames.has(normalized);
  });

  const segments = [item.variantLabel, item.optionsLabel, ...dedupedCustomizations]
    .filter(Boolean)
    .join(" • ");

  return segments || "No customizations";
}

export default function CartSnapshotPage() {
  const { items, totals } = useCart();

  const restaurantIds = useMemo(() => [...new Set(items.map((item) => item.restaurantId))], [items]);
  const headerRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantIds[0]);
  const restaurantName = restaurantIds.length > 1 ? "Mixed Restaurants" : (headerRestaurant?.name ?? "Meal Snapshot");
  const restaurantLogo = restaurantIds.length > 1 ? undefined : headerRestaurant?.logo;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-neutral-900 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/cart" className="mb-6 inline-flex text-sm font-medium text-neutral-600 underline underline-offset-2">
          ← Back to Cart
        </Link>

        <section className="mt-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-black/10 bg-white">
              {restaurantLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurantLogo} alt={`${restaurantName} logo`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">LOGO</div>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{restaurantName}</h1>
          </div>

          <p className="mt-6 text-base text-neutral-500">Meal Name (optional)</p>

          <div className="my-6 h-px bg-black/20" />

          <h2 className="text-sm font-semibold tracking-[0.2em] text-neutral-600">ITEMS</h2>

          {items.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No items in cart.</p>
          ) : (
            <ul className="mt-4 space-y-5">
              {items.map((item) => (
                <li key={item.id}>
                  <p className="text-lg font-medium">
                    {item.quantity > 1 ? `${item.quantity}x ` : ""}
                    {item.name}
                    {item.variantLabel ? ` • ${item.variantLabel}` : ""}
                  </p>
                  {summarizeItem(item) !== "No customizations" ? (
                    <p className="mt-1 text-sm text-neutral-600">{summarizeItem(item)}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-neutral-800">
                    {item.macrosPerItem.calories * item.quantity} cal | {item.macrosPerItem.protein * item.quantity}p | {item.macrosPerItem.carbs * item.quantity}c | {item.macrosPerItem.fat * item.quantity}f
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="my-6 h-px bg-black/20" />

          <h2 className="text-sm font-semibold tracking-[0.2em] text-neutral-600">TOTAL MACROS</h2>

          <div className="mt-5 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <div>
              <p className="text-3xl font-semibold">{totals.calories}</p>
              <p className="mt-1 text-sm text-neutral-600">Calories</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{totals.protein}g</p>
              <p className="mt-1 text-sm text-neutral-600">Protein</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{totals.carbs}g</p>
              <p className="mt-1 text-sm text-neutral-600">Carbs</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{totals.fat}g</p>
              <p className="mt-1 text-sm text-neutral-600">Fat</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
