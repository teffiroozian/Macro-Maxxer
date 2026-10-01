"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import BuilderEntreeResultRow from "@/components/global-search/BuilderEntreeResultRow";
import BuilderIngredientResultRow from "@/components/global-search/BuilderIngredientResultRow";
import MenuItemResultRow from "@/components/global-search/MenuItemResultRow";
import RestaurantResultRow from "@/components/global-search/RestaurantResultRow";
import ScopeSwitcher from "@/components/global-search/ScopeSwitcher";
import EmptyStateCard from "@/components/EmptyStateCard";
import type { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";

type NativeSearchResultsProps = ReturnType<typeof useGlobalSearchState>;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 text-sm font-bold text-slate-900">{children}</h2>;
}

export default function NativeSearchResults(state: NativeSearchResultsProps) {
  const {
    scope,
    handleScopeChange,
    activeIndex,
    isEmptyQuery,
    restaurantResults,
    recentRestaurants,
    popularRestaurants,
    removeRecent,
    searchIndex,
    menuItemResults,
    recentMenuItems,
    removeRecentMenuItem,
    handleSelectRestaurant,
    handleSelectMenuItem,
    handleStartBuild,
    handleStartEntreeBuild,
  } = state;

  const renderMenuResult = (result: ContentSearchResult, index: number, recent: boolean) =>
    result.kind === "menu-item" ? (
      <MenuItemResultRow
        key={`${recent ? "recent-" : ""}item-${result.restaurant.id}-${result.item.id}`}
        item={result.item}
        restaurant={result.restaurant}
        isActive={activeIndex === index}
        onSelect={handleSelectMenuItem}
        onRemoveRecent={recent ? () => removeRecentMenuItem(result) : undefined}
        quickAdd={result.quickAdd}
      />
    ) : result.kind === "builder-entree" ? (
      <BuilderEntreeResultRow
        key={`${recent ? "recent-" : ""}entree-${result.restaurant.id}-${result.entreeId}`}
        entreeId={result.entreeId}
        entreeOption={result.entreeOption}
        restaurant={result.restaurant}
        isActive={activeIndex === index}
        onSelect={handleStartEntreeBuild}
        onRemoveRecent={recent ? () => removeRecentMenuItem(result) : undefined}
      />
    ) : (
      <BuilderIngredientResultRow
        key={`${recent ? "recent-" : ""}ingredient-${result.restaurant.id}-${result.ingredient.id}`}
        ingredient={result.ingredient}
        restaurant={result.restaurant}
        categoryLabel={result.categoryLabel}
        isActive={activeIndex === index}
        onSelect={(ingredient, restaurant) => handleStartBuild(ingredient, restaurant, result.categoryLabel)}
        onRemoveRecent={recent ? () => removeRecentMenuItem(result) : undefined}
      />
    );

  const resultCount = scope === "restaurants" ? restaurantResults.length : menuItemResults.length;

  return (
    <div className="mt-5">
      <ScopeSwitcher
        scope={scope}
        onChange={handleScopeChange}
        showIcons
        variant="segmented"
        fullWidth
        className="w-full"
      />

      {isEmptyQuery ? (
        scope === "restaurants" ? (
          <div className="mt-7 space-y-7">
            <section>
              <SectionLabel>Recent searches</SectionLabel>
              {recentRestaurants.length > 0 ? (
                <ul role="listbox" className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-sm">
                  {recentRestaurants.map((restaurant, index) => (
                    <RestaurantResultRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      isActive={activeIndex === index}
                      onSelect={handleSelectRestaurant}
                      onRemoveRecent={removeRecent}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-2xl border border-black/10 bg-white px-5 py-5 text-sm leading-6 text-slate-500 shadow-sm">
                  Your recent restaurant searches will appear here.
                </p>
              )}
            </section>

            <section>
              <SectionLabel>Popular restaurants</SectionLabel>
              <ul role="listbox" className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-sm">
                {popularRestaurants.map((restaurant, index) => (
                  <RestaurantResultRow
                    key={restaurant.id}
                    restaurant={restaurant}
                    isActive={activeIndex === recentRestaurants.length + index}
                    onSelect={handleSelectRestaurant}
                  />
                ))}
              </ul>
              <Link
                href="/restaurants"
                className="mt-3 inline-flex px-1 text-sm font-semibold text-accent-strong focus-ring"
              >
                View all restaurants
              </Link>
            </section>
          </div>
        ) : (
          <section className="mt-7">
            <SectionLabel>Recent searches</SectionLabel>
            {!searchIndex ? (
              <p className="mt-3 rounded-2xl border border-black/10 bg-white px-5 py-6 text-center text-sm text-slate-500 shadow-sm">
                Loading menu items…
              </p>
            ) : recentMenuItems.length > 0 ? (
              <ul role="listbox" className="mt-2 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-sm">
                {recentMenuItems.map((result, index) => renderMenuResult(result, index, true))}
              </ul>
            ) : (
              <EmptyStateCard
                variant="transparent"
                title="No recent menu-item searches"
                description="Search for a menu item and it will appear here for quick access."
                className="mt-2 rounded-2xl border border-black/10 bg-white shadow-sm"
              />
            )}
          </section>
        )
      ) : (
        <section className="mt-7">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <SectionLabel>Search results</SectionLabel>
            {(scope === "restaurants" || searchIndex) && resultCount > 0 ? (
              <p className="text-xs font-semibold text-slate-500">
                {resultCount} {resultCount === 1 ? "result" : "results"}
              </p>
            ) : null}
          </div>

          {scope === "restaurants" ? (
            restaurantResults.length > 0 ? (
              <ul role="listbox" className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-sm">
                {restaurantResults.map((restaurant, index) => (
                  <RestaurantResultRow
                    key={restaurant.id}
                    restaurant={restaurant}
                    isActive={activeIndex === index}
                    onSelect={handleSelectRestaurant}
                  />
                ))}
              </ul>
            ) : (
              <EmptyStateCard
                variant="transparent"
                icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
                title="No restaurants found"
                description="Try a different restaurant name."
                className="mt-2 rounded-2xl border border-black/10 bg-white shadow-sm"
              />
            )
          ) : !searchIndex ? (
            <p className="mt-3 rounded-2xl border border-black/10 bg-white px-5 py-6 text-center text-sm text-slate-500 shadow-sm">
              Loading menu items…
            </p>
          ) : menuItemResults.length > 0 ? (
            <ul role="listbox" className="mt-2 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white py-1 shadow-sm">
              {menuItemResults.map((result, index) => renderMenuResult(result, index, false))}
            </ul>
          ) : (
            <EmptyStateCard
              variant="transparent"
              icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
              title="No menu items found"
              description="Try another item name or switch to Restaurants."
              className="mt-2 rounded-2xl border border-black/10 bg-white shadow-sm"
            />
          )}
        </section>
      )}
    </div>
  );
}
