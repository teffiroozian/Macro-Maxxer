"use client";

import RestaurantResultRow from "@/components/global-search/RestaurantResultRow";
import MenuItemResultRow from "@/components/global-search/MenuItemResultRow";
import BuilderIngredientResultRow from "@/components/global-search/BuilderIngredientResultRow";
import ScopeSwitcher from "@/components/global-search/ScopeSwitcher";
import RestaurantScopeControl from "@/components/global-search/RestaurantScopeControl";
import type { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";

type GlobalSearchPanelProps = ReturnType<typeof useGlobalSearchState>;

// Restaurants + Menu Items (standard items and Chipotle-only build-your-own
// ingredients, ranked per the finalized 6-tier rule) share this one panel.
// Cart page defaults Menu Items to the cart's own restaurant when
// unambiguous (plan §4j); homepage/elsewhere search all restaurants.
//
// Purely presentational — the tabs and results list only. The actual search
// <input> lives one level up (DesktopSearchDropdown / GlobalSearchOverlay),
// which is also where useGlobalSearchState() is called; that's what lets the
// nav's search bar itself be the real, always-mounted input instead of a
// second input nested inside this panel.
export default function GlobalSearchPanel({
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
  restaurantFilterId,
  filteredRestaurantName,
  naturalRestaurantId,
  naturalRestaurant,
  setRestaurantFilterId,
  handleSelectRestaurant,
  handleSelectMenuItem,
  handleStartBuild,
  handleViewAllRestaurants,
}: GlobalSearchPanelProps) {
  const menuItemSuggestions = isEmptyQuery ? recentMenuItems : menuItemResults;

  return (
    <div className="flex flex-col">
      <div className="pt-4">
        <ScopeSwitcher scope={scope} onChange={handleScopeChange} />
      </div>

      {scope === "menu-items" && naturalRestaurantId && naturalRestaurant ? (
        <RestaurantScopeControl
          restaurant={naturalRestaurant}
          isScoped={restaurantFilterId === naturalRestaurantId}
          onToggle={() =>
            setRestaurantFilterId(restaurantFilterId === naturalRestaurantId ? null : naturalRestaurantId)
          }
        />
      ) : null}

      {scope === "restaurants" ? (
        <>
          <ul role="listbox" className="mt-4 max-h-80 overflow-y-auto pb-2">
            {isEmptyQuery ? (
              <>
                {recentRestaurants.length > 0 && (
                  <li className="px-5 pb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Recently Searched
                  </li>
                )}
                {recentRestaurants.map((restaurant, index) => (
                  <RestaurantResultRow
                    key={restaurant.id}
                    restaurant={restaurant}
                    isActive={activeIndex === index}
                    onSelect={handleSelectRestaurant}
                    onRemoveRecent={removeRecent}
                  />
                ))}

                <li className="px-5 pb-1.5 pt-5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Popular Restaurants
                </li>
                {popularRestaurants.map((restaurant, index) => {
                  const absoluteIndex = recentRestaurants.length + index;
                  return (
                    <RestaurantResultRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      isActive={activeIndex === absoluteIndex}
                      onSelect={handleSelectRestaurant}
                    />
                  );
                })}
              </>
            ) : restaurantResults.length > 0 ? (
              restaurantResults.map((restaurant, index) => (
                <RestaurantResultRow
                  key={restaurant.id}
                  restaurant={restaurant}
                  isActive={activeIndex === index}
                  onSelect={handleSelectRestaurant}
                />
              ))
            ) : (
              <li className="px-5 py-6 text-center text-sm text-neutral-500">No restaurants found.</li>
            )}
          </ul>

          {isEmptyQuery ? (
            <div className="border-t border-black/5 px-5 py-3">
              <button
                type="button"
                onClick={handleViewAllRestaurants}
                className="cursor-pointer text-sm font-semibold text-neutral-700 transition hover:text-neutral-900"
              >
                View All Restaurants
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <ul role="listbox" className="mt-4 max-h-80 overflow-y-auto pb-4">
          {isEmptyQuery ? (
            !searchIndex ? (
              <li className="px-5 py-6 text-center text-sm text-neutral-500">Loading menu items…</li>
            ) : recentMenuItems.length > 0 ? (
              <>
                <li className="px-5 pb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Recently Searched
                </li>
                {recentMenuItems.map((result, index) =>
                  result.kind === "menu-item" ? (
                    <MenuItemResultRow
                      key={`recent-item-${result.restaurant.id}-${result.item.id}`}
                      item={result.item}
                      restaurant={result.restaurant}
                      isActive={activeIndex === index}
                      onSelect={handleSelectMenuItem}
                      onRemoveRecent={() => removeRecentMenuItem(result)}
                      quickAdd={result.quickAdd}
                    />
                  ) : (
                    <BuilderIngredientResultRow
                      key={`recent-ingredient-${result.restaurant.id}-${result.ingredient.id}`}
                      ingredient={result.ingredient}
                      restaurant={result.restaurant}
                      categoryLabel={result.categoryLabel}
                      isActive={activeIndex === index}
                      onSelect={(ingredient, restaurant) =>
                        handleStartBuild(ingredient, restaurant, result.categoryLabel)
                      }
                      onRemoveRecent={() => removeRecentMenuItem(result)}
                    />
                  )
                )}
              </>
            ) : restaurantFilterId ? (
              <li className="px-5 py-6 text-center text-sm text-neutral-500">
                Search {filteredRestaurantName}&rsquo;s menu
              </li>
            ) : (
              <li className="px-5 py-6 text-center text-sm text-neutral-500">Start typing to search menu items.</li>
            )
          ) : !searchIndex ? (
            <li className="px-5 py-6 text-center text-sm text-neutral-500">Loading menu items…</li>
          ) : menuItemSuggestions.length > 0 ? (
            menuItemSuggestions.map((result, index) =>
              result.kind === "menu-item" ? (
                <MenuItemResultRow
                  key={`item-${result.restaurant.id}-${result.item.id}`}
                  item={result.item}
                  restaurant={result.restaurant}
                  isActive={activeIndex === index}
                  onSelect={handleSelectMenuItem}
                  quickAdd={result.quickAdd}
                />
              ) : (
                <BuilderIngredientResultRow
                  key={`ingredient-${result.restaurant.id}-${result.ingredient.id}`}
                  ingredient={result.ingredient}
                  restaurant={result.restaurant}
                  categoryLabel={result.categoryLabel}
                  isActive={activeIndex === index}
                  onSelect={(ingredient, restaurant) =>
                    handleStartBuild(ingredient, restaurant, result.categoryLabel)
                  }
                />
              )
            )
          ) : (
            <li className="px-5 py-6 text-center text-sm text-neutral-500">No menu items found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
