"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import BuilderEntreeResultRow from "@/components/global-search/BuilderEntreeResultRow";
import BuilderIngredientResultRow from "@/components/global-search/BuilderIngredientResultRow";
import MenuItemResultRow from "@/components/global-search/MenuItemResultRow";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { useMenuItemSearch } from "@/lib/search/useMenuItemSearch";
import { useMenuItemSelectionHandlers } from "@/lib/search/useMenuItemSelectionHandlers";
import { useRecentAndPopularRestaurants } from "@/lib/search/useRecentAndPopularRestaurants";
import { useRecentMenuItems } from "@/lib/search/useRecentMenuItems";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const QUICK_PICK_IDS = ["chickfila", "chipotle", "mcdonalds", "starbucks"];

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong focus-ring">
          See all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: RestaurantIndexEntry }) {
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="flex min-h-24 items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition active:bg-slate-50 focus-ring"
    >
      <RestaurantLogoBadge src={restaurant.logo} alt={`${restaurant.name} logo`} size="md" fit="cover" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-950">{restaurant.name}</span>
        <span className="mt-1 block text-xs text-slate-500">View menu and nutrition</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

export default function NativeHomePage({ restaurants }: { restaurants: RestaurantIndexEntry[] }) {
  const { recentRestaurants } = useRecentAndPopularRestaurants(restaurants);
  const { searchIndex } = useMenuItemSearch("", { enabled: true });
  const { recentResults, addRecent } = useRecentMenuItems(searchIndex);
  const { handleSelectMenuItem, handleStartBuild, handleStartEntreeBuild } = useMenuItemSelectionHandlers({
    addRecentMenuItem: addRecent,
    currentRestaurantId: null,
    onAfterSelect: () => undefined,
  });
  const quickPicks = QUICK_PICK_IDS.flatMap((id) => {
    const restaurant = restaurants.find((candidate) => candidate.id === id);
    return restaurant ? [restaurant] : [];
  });

  return (
    <main className="min-h-[var(--app-viewport-height)] bg-slate-50 pb-8 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-[calc(var(--safe-area-top)+1rem)]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center gap-3 px-1 py-2">
          <span className="relative h-11 w-11 overflow-hidden rounded-xl shadow-sm">
            <Image src="/logo.svg" alt="" fill className="object-contain" priority />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Welcome to</p>
            <h1 className="font-heading text-xl font-bold text-slate-950">Macro Maxxer</h1>
          </div>
        </header>

        <Link
          href="/search"
          className="relative mt-5 flex w-full items-center rounded-2xl border border-black/10 bg-white py-3.5 pl-15 pr-4 text-base text-slate-500 shadow-sm transition active:bg-slate-50 focus-ring"
          aria-label="Search restaurants and menu items"
        >
          Search restaurants, menu items...
          <span className="pointer-events-none absolute inset-y-0 left-4 my-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <Search className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </Link>

        {recentRestaurants.length > 0 ? (
          <section className="mt-8">
            <SectionHeading title="Recently visited" />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recentRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <SectionHeading title="Quick Picks" href="/restaurants" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickPicks.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>

        {recentResults.length > 0 ? (
          <section className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">Recently viewed items</h2>
            </div>
            <ul role="list" className="divide-y divide-black/5 py-1">
              {recentResults.map((result, index) =>
                result.kind === "menu-item" ? (
                  <MenuItemResultRow
                    key={`recent-item-${result.restaurant.id}-${result.item.id}`}
                    item={result.item}
                    restaurant={result.restaurant}
                    isActive={false}
                    onSelect={handleSelectMenuItem}
                    quickAdd={result.quickAdd}
                  />
                ) : result.kind === "builder-entree" ? (
                  <BuilderEntreeResultRow
                    key={`recent-entree-${result.restaurant.id}-${result.entreeId}`}
                    entreeId={result.entreeId}
                    entreeOption={result.entreeOption}
                    restaurant={result.restaurant}
                    isActive={false}
                    onSelect={handleStartEntreeBuild}
                  />
                ) : (
                  <BuilderIngredientResultRow
                    key={`recent-ingredient-${result.restaurant.id}-${result.ingredient.id}-${index}`}
                    ingredient={result.ingredient}
                    restaurant={result.restaurant}
                    categoryLabel={result.categoryLabel}
                    isActive={false}
                    onSelect={(ingredient, restaurant) =>
                      handleStartBuild(ingredient, restaurant, result.categoryLabel)
                    }
                  />
                ),
              )}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
