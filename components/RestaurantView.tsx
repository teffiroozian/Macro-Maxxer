"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRestaurantSearch } from "@/components/RestaurantSearchContext";
import type {
  AddonRef,
  CommonChange,
  IngredientItem,
  MenuItem,
  RestaurantAddons,
} from "@/types/menu";
import {
  type Filters,
  type SortOption,
  type ViewOption,
} from "./ControlsRow";
import {
  categorySectionId,
  getCategoryLabel,
  getOrderedMenuSections,
} from "./MenuSections";
import MenuSections from "./MenuSections";
import StickyRestaurantBar from "./StickyRestaurantBar";


const CATEGORY_ICONS: Record<string, string> = {
  sandwiches: "🥪",
  chicken: "🍗",
  salads: "🥗",
  drinks: "🥤",
  breakfast: "🍳",
  sides: "🍟",
  desserts: "🍰",
  wraps: "🌯",
  burgers: "🍔",
  entrees: "🍽️",
  "bowls & plates": "🥣",
  dressings: "🥣",
  "dipping sauces": "🫙",
};

export default function RestaurantView({
  restaurantId,
  restaurantName,
  restaurantLogo,
  items,
  ingredients = [],
  addons,
  commonChanges,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
}) {
  const SECTION_HEADER_TOP_GAP = 24;

  const getStickyOffset = () => {
    const stickyBar = document.querySelector('[data-sticky-nav="true"]');
    if (!(stickyBar instanceof HTMLElement)) {
      return 0;
    }

    return Math.max(0, stickyBar.getBoundingClientRect().bottom);
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewMode: ViewOption =
    searchParams.get("view") === "ingredients" ? "ingredients" : "menu";
  const [entireMenu, setEntireMenu] = useState(false);
  const [sort, setSort] = useState<SortOption>("highest-protein");
  const [filters, setFilters] = useState<Filters>({});
  const { searchOpen, searchQuery, setSearchQuery, openSearch, closeSearch } =
    useRestaurantSearch();

  const addonItems = useMemo<MenuItem[]>(() => {
    if (!addons) return [];

    const categoryByAddonRef: Record<AddonRef, string> = {
      sauces: "Dipping Sauces",
      dressings: "Dressings",
      condiments: "Condiments",
    };

    return (Object.entries(addons) as [AddonRef, NonNullable<RestaurantAddons[AddonRef]>][])
      .flatMap(([addonRef, options]) =>
        options.map((option) => ({
          id: `${restaurantId}-${addonRef}-${option.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: option.name,
          nutrition: {
            calories: option.calories,
            protein: option.protein,
            carbs: option.carbs,
            totalFat: option.totalFat ?? option.fat,
            satFat: option.satFat,
            transFat: option.transFat,
            cholesterol: option.cholesterol,
            sodium: option.sodium,
            fiber: option.fiber,
            sugars: option.sugars,
          },
          categories: [categoryByAddonRef[addonRef]],
          portionType: "addon",
          image: option.image,
        }))
      );
  }, [addons, restaurantId]);

  const ingredientMenuItems = useMemo<MenuItem[]>(() => {
    const resolveIngredientCategory = (ingredient: IngredientItem) => {
      if (ingredient.category) {
        return ingredient.category;
      }

      if (ingredient.categories?.length) {
        return (
          ingredient.categories.find(
            (category) => category.toLowerCase() !== "ingredients"
          ) ?? ingredient.categories[0]
        );
      }

      return "Other";
    };

    return ingredients.map((ingredient, index) => ({
      id:
        ingredient.id ??
        `${restaurantId}-ingredient-${ingredient.name}-${index}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
      name: ingredient.name,
      nutrition: ingredient.nutrition,
      image: ingredient.image,
      categories: [resolveIngredientCategory(ingredient)],
      portionType: "addon",
    }));
  }, [ingredients, restaurantId]);

  const allItems = useMemo(() => [...items, ...addonItems], [items, addonItems]);
  const sourceItems = viewMode === "ingredients" ? ingredientMenuItems : allItems;

  const calorieBounds = useMemo(() => {
    if (!sourceItems.length) {
      return { min: 0, max: 0 };
    }

    const calories = sourceItems.map((item) => item.nutrition.calories);
    const minCal = Math.min(...calories);
    const maxCal = Math.max(...calories);

    return {
      min: Math.floor(minCal / 50) * 50,
      max: Math.ceil(maxCal / 50) * 50,
    };
  }, [sourceItems]);

  const searchTerms = searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const filteredItems = useMemo(() => {
    return sourceItems.filter((item) => {
      if (filters.proteinMin && item.nutrition.protein < filters.proteinMin) {
        return false;
      }
      if (filters.caloriesMax && item.nutrition.calories > filters.caloriesMax) {
        return false;
      }
      if (!searchTerms.length) {
        return true;
      }

      const itemCategories = item.categories?.length ? item.categories : ["Other"];

      const categoryVariants = itemCategories.flatMap((rawCategory) => {
        const category = rawCategory.toLowerCase();
        const categoryLabel = getCategoryLabel(rawCategory).toLowerCase();
        return [category, categoryLabel];
      }).flatMap((value) => {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.endsWith("s")) {
          return [trimmed, trimmed.slice(0, -1)];
        }
        return [trimmed, `${trimmed}s`];
      });

      const searchableText = [item.name.toLowerCase(), ...categoryVariants].join(" ");
      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [sourceItems, filters, searchTerms]);

  const orderedSections = useMemo(
    () => getOrderedMenuSections(filteredItems),
    [filteredItems]
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    () => orderedSections[0] ?? ""
  );

  const resolvedActiveCategory = orderedSections.includes(activeCategory)
    ? activeCategory
    : (orderedSections[0] ?? "");

  const categoryOptions = useMemo(
    () =>
      orderedSections.map((section) => ({
        id: section,
        label: getCategoryLabel(section),
      })),
    [orderedSections]
  );

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    const section = document.getElementById(categorySectionId(categoryId));
    if (!section) return;

    const stickyOffset = getStickyOffset();
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    const nextScrollTop = Math.max(0, sectionTop - stickyOffset - SECTION_HEADER_TOP_GAP);

    window.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  };


  useEffect(() => {
    if (entireMenu || orderedSections.length === 0) {
      return;
    }

    const sectionElements = orderedSections
      .map((sectionId) => ({
        id: sectionId,
        element: document.getElementById(categorySectionId(sectionId)),
      }))
      .filter(
        (
          section
        ): section is {
          id: string;
          element: HTMLElement;
        } => Boolean(section.element)
      );

    if (sectionElements.length === 0) {
      return;
    }

    const updateActiveCategoryOnScroll = () => {
      const activationOffset = getStickyOffset() + SECTION_HEADER_TOP_GAP + 1;
      const reachedSections = sectionElements.filter(
        (section) => section.element.getBoundingClientRect().top <= activationOffset
      );

      const nextActive =
        reachedSections[reachedSections.length - 1]?.id ?? sectionElements[0]?.id;

      if (nextActive && nextActive !== activeCategory) {
        setActiveCategory(nextActive);
      }
    };

    updateActiveCategoryOnScroll();
    window.addEventListener("scroll", updateActiveCategoryOnScroll, { passive: true });
    window.addEventListener("resize", updateActiveCategoryOnScroll);

    return () => {
      window.removeEventListener("scroll", updateActiveCategoryOnScroll);
      window.removeEventListener("resize", updateActiveCategoryOnScroll);
    };
  }, [activeCategory, entireMenu, orderedSections]);

  const handleViewChange = (nextView: ViewOption) => {
    if (nextView === viewMode) {
      return;
    }

    window.scrollTo({ top: 220, behavior: "auto" });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSort(nextSort);
  };

  return (
    <div>
      <StickyRestaurantBar
        restaurantName={restaurantName}
        restaurantLogo={restaurantLogo}
        view={viewMode}
        onChange={handleViewChange}
        sort={sort}
        onSortChange={handleSortChange}
        filters={filters}
        onFiltersChange={setFilters}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSearch={openSearch}
        onCloseSearch={closeSearch}
        entireMenu={entireMenu}
        onEntireMenuChange={setEntireMenu}
        calorieBounds={calorieBounds}
      />


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
          marginTop: 16,
        }}
      >
        <aside className="sticky top-[90px] pt-8">
          <h3 className="mb-5 text-2xl font-bold text-slate-900">
            {viewMode === "ingredients" ? "Ingredients" : "Categories"}
          </h3>

          <div className="max-h-[calc(100vh-185px)] overflow-y-auto pr-2">

            <nav
              aria-label={
                viewMode === "ingredients"
                  ? "Ingredient categories"
                  : "Menu categories"
              }
              className="grid gap-3"
            >
              {categoryOptions.map((option) => {
                const isActive = option.id === resolvedActiveCategory;
                const icon = CATEGORY_ICONS[option.label.toLowerCase()] ?? "◻️";

                return (
                  <div key={option.id} className="relative pl-3">
                    {isActive ? (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-blue-600" aria-hidden="true" />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleCategorySelect(option.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-left text-base font-semibold transition-colors ${isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      <span className="text-lg leading-none" aria-hidden="true">
                        {icon}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <MenuSections
              restaurantId={restaurantId}
              items={filteredItems}
              sort={sort}
              addons={addons}
              commonChanges={commonChanges}
              groupByCategory={!entireMenu}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
