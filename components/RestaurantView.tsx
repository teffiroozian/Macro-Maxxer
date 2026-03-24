"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Beef,
  CakeSlice,
  Circle,
  CircleDashed,
  CupSoda,
  Egg,
  EggFried,
  Diamond,
  Droplets,
  Drumstick,
  IceCreamCone,
  SquareUser,
  LeafyGreen,
  Salad,
  Sandwich,
  Shell,
  SquarePlus,
  Soup,
  ToggleLeft,
  Utensils,
  Waves,
} from "lucide-react";
import { useRestaurantSearch } from "@/components/RestaurantSearchContext";
import type {
  AddonRef,
  CommonChange,
  IngredientItem,
  MenuItem,
  RestaurantAddons,
  RestaurantCustomizationRules,
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


const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sandwiches: Sandwich,
  "sandwich toppings": LeafyGreen,
  toppings: Sandwich,
  chicken: Drumstick,
  proteins: Drumstick,
  "breakfast protein": Drumstick,
  condiments: Utensils,
  "salad condiments": Utensils,
  salads: Salad,
  "salad toppings": Salad,
  drinks: CupSoda,
  breakfast: EggFried,
  kids: SquareUser,
  sides: SquarePlus,
  desserts: CakeSlice,
  wraps: Shell,
  "wrap toppings": Waves,
  burgers: Beef,
  entrees: Utensils,
  "bowls & plates": Soup,
  buns: CircleDashed,
  "breakfast buns": CircleDashed,
  cheeses: Diamond,
  eggs: Egg,
  "soup toppings": Soup,
  "parfait toppings": IceCreamCone,
  "treat toppings": IceCreamCone,
  dressings: Droplets,
  "dipping sauces": ToggleLeft,
  treats: IceCreamCone,
};

export default function RestaurantView({
  restaurantId,
  restaurantName,
  restaurantLogo,
  items,
  ingredients = [],
  addons,
  commonChanges,
  customizationRules,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  customizationRules?: RestaurantCustomizationRules;
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
  type RankedAllFilterKey = "main-entrees" | "shareables" | "sides" | "drinks";
  const [rankedAllFilters, setRankedAllFilters] = useState<
    Record<RankedAllFilterKey, boolean>
  >({
    "main-entrees": true,
    shareables: false,
    sides: false,
    drinks: false,
  });
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

    return ingredients
      .filter((ingredient) => !ingredient.hideFromIngredientView)
      .map((ingredient, index) => ({
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
    const calories = sourceItems
      .map((item) => item.nutrition.calories)
      .filter((calories): calories is number => typeof calories === "number");

    if (!calories.length) {
      return { min: 0, max: 0 };
    }

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
    const getRankedAllFilterKey = (
      portionType: MenuItem["portionType"] | undefined
    ): RankedAllFilterKey | null => {
      switch (portionType) {
        case "single":
          return "main-entrees";
        case "shareable":
          return "shareables";
        case "drink":
          return "drinks";
        case "side":
          return "sides";
        default:
          return null;
      }
    };

    return sourceItems
      .map((item) => {
        if (!(entireMenu && viewMode === "menu")) {
          return item;
        }

        const selectedRankedKeys = new Set<RankedAllFilterKey>(
          (Object.entries(rankedAllFilters) as [RankedAllFilterKey, boolean][])
            .filter(([, isEnabled]) => isEnabled)
            .map(([key]) => key)
        );

        const filteredVariants = item.variants?.filter((variant) => {
          const variantKey = getRankedAllFilterKey(variant.portionType);
          if (!variantKey) {
            return false;
          }

          return selectedRankedKeys.has(variantKey);
        });

        const itemKey = getRankedAllFilterKey(item.portionType);
        const itemKeyMatches = itemKey ? selectedRankedKeys.has(itemKey) : false;
        const hasMatchingVariants = Boolean(filteredVariants && filteredVariants.length > 0);

        if (!itemKeyMatches && !hasMatchingVariants) {
          return null;
        }

        if (!item.variants || item.variants.length === 0) {
          return item;
        }

        return {
          ...item,
          variants: hasMatchingVariants ? filteredVariants : [],
        };
      })
      .filter((item): item is MenuItem => Boolean(item))
      .filter((item) => {
      const protein = item.nutrition.protein ?? 0;
      const calories = item.nutrition.calories ?? 0;

      if (filters.proteinMin && protein < filters.proteinMin) {
        return false;
      }
      if (filters.caloriesMax && calories > filters.caloriesMax) {
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
  }, [sourceItems, filters, searchTerms, entireMenu, rankedAllFilters, viewMode]);

  const orderedSections = useMemo(
    () => getOrderedMenuSections(filteredItems, viewMode),
    [filteredItems, viewMode]
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
        label: getCategoryLabel(section, viewMode),
      })),
    [orderedSections, viewMode]
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

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: true });
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSort(nextSort);
  };

  const toggleRankedAllFilter = (key: RankedAllFilterKey) => {
    setRankedAllFilters((previous) => {
      const isCurrentlyChecked = previous[key];
      const checkedCount = Object.values(previous).filter(Boolean).length;
      if (isCurrentlyChecked && checkedCount === 1) {
        return previous;
      }

      return {
        ...previous,
        [key]: !isCurrentlyChecked,
      };
    });
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


      <div className="grid items-start gap-6 [grid-template-columns:240px_minmax(0,1fr)]">
        <aside className="sticky top-[160px] flex max-h-[calc(100vh-160px)] flex-col py-6">
          <h3 className="mb-8 shrink-0 text-2xl font-bold text-slate-900">
            {entireMenu && viewMode === "menu"
              ? "Show"
              : viewMode === "ingredients"
                ? "Ingredients"
                : "Categories"}
          </h3>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {entireMenu && viewMode === "menu" ? (
              <div className="grid gap-3">
                {[
                  { key: "main-entrees" as const, label: "Main Entrees" },
                  { key: "shareables" as const, label: "Shareables" },
                  { key: "sides" as const, label: "Sides" },
                  { key: "drinks" as const, label: "Drinks" },
                ].map((option) => {
                  const isChecked = rankedAllFilters[option.key];

                  return (
                    <label
                      key={option.key}
                      className="inline-flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-1.5 text-base font-semibold text-slate-800 hover:bg-slate-200/70"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRankedAllFilter(option.key)}
                        className="h-4 w-4 cursor-pointer rounded border border-black/30 accent-black"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <nav
                aria-label={
                  viewMode === "ingredients"
                    ? "Ingredient categories"
                    : "Menu categories"
                }
                className="grid gap-4"
              >
                {categoryOptions.map((option) => {
                  const isActive = option.id === resolvedActiveCategory;
                  const Icon = CATEGORY_ICONS[option.label.toLowerCase()] ?? Circle;

                  return (
                    <div key={option.id} className="relative pl-3">
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white" aria-hidden="true" />
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCategorySelect(option.id)}
                        className={`cursor-pointer inline-flex items-center gap-3 rounded-full px-4 py-2 text-left text-base font-semibold transition-colors duration-50 ease-in ${isActive
                            ? "shadow-[0px_0_8px_rgba(0,0,0,0.25)] bg-white text-slate-800"
                            : "text-slate-700 hover:bg-slate-200"
                          }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    </div>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mx-auto max-w-[900px]">
            <MenuSections
              restaurantId={restaurantId}
              items={filteredItems}
              sort={sort}
              addons={addons}
              ingredients={ingredients}
              commonChanges={commonChanges}
              customizationRules={customizationRules}
              groupByCategory={!entireMenu}
              categoryMode={viewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
