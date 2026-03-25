"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Beef,
  CakeSlice,
  ChevronDown,
  ChevronUp,
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
  ShoppingCart,
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
import StickyMacroTotalsBar from "./StickyMacroTotalsBar";
import { useCart } from "@/stores/cartStore";


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

const CHIPOTLE_HIDDEN_MENU_SECTIONS_BY_ENTREE: Record<string, string[]> = {
  "chips-sides": ["toppings"],
};

type EntreeSelection =
  | "bowl"
  | "burrito"
  | "quesadilla"
  | "salad"
  | "tacos"
  | "high-protein-menu"
  | "kids-meal"
  | "chips-sides"
  | "drinks"
  | null;
type TacoShellSelection = "crispy" | "soft";
type TacoCountSelection = 3 | 1;
type KidsMealSelection = "build-your-own" | "quesadilla";
type EntreeConfiguration = {
  label: string;
  imageSrc: string;
  nutritionMultiplier?: number;
  includedIngredientIds?: string[];
  getIncludedIngredientIds?: (options: { tacoShell: TacoShellSelection }) => string[];
};
const CHIPOTLE_TACO_SHELL_INGREDIENT_IDS = [
  "crispy-corn-tortilla",
  "soft-flour-tortilla",
];
const CHIPOTLE_ENTREE_CONFIGURATIONS: Record<
  Exclude<EntreeSelection, null>,
  EntreeConfiguration
> = {
  bowl: { label: "Bowl", imageSrc: "/restaurants/chipotle/entrees/burrito-bowl.png" },
  burrito: {
    label: "Burrito",
    imageSrc: "/restaurants/chipotle/entrees/burrito.png",
    includedIngredientIds: ["tortilla"],
  },
  quesadilla: {
    label: "Quesadilla",
    imageSrc: "/restaurants/chipotle/entrees/quesadilla.png",
    includedIngredientIds: ["tortilla", "cheese"],
  },
  salad: {
    label: "Salad",
    imageSrc: "/restaurants/chipotle/entrees/salad.png",
    includedIngredientIds: ["romaine-lettuce"],
  },
  tacos: {
    label: "Tacos",
    imageSrc: "/restaurants/chipotle/entrees/tacos.png",
    getIncludedIngredientIds: ({ tacoShell }) => [
      tacoShell === "crispy" ? "crispy-corn-tortilla" : "soft-flour-tortilla",
    ],
  },
  "high-protein-menu": {
    label: "High Protein Menu",
    imageSrc: "/restaurants/chipotle/entrees/high-protein-menu.png",
  },
  "kids-meal": {
    label: "Kid's Meal",
    imageSrc: "/restaurants/chipotle/entrees/kids-meal.png",
    nutritionMultiplier: 0.5,
  },
  "chips-sides": {
    label: "Chips & Sides",
    imageSrc: "/restaurants/chipotle/entrees/chips-and-sides.png",
  },
  drinks: {
    label: "Drinks",
    imageSrc: "/restaurants/chipotle/entrees/drinks.png",
  },
};

const CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS = [
  "soft-flour-tortilla",
  "cheese",
];
const CHIPOTLE_KIDS_QUESADILLA_NUTRITION_OVERRIDES: Record<string, IngredientItem["nutrition"]> = {
  "soft-flour-tortilla": {
    calories: 80,
    totalFat: 3,
    protein: 2,
    carbs: 13,
  },
  cheese: {
    calories: 110,
    totalFat: 8,
    protein: 6,
    carbs: 1,
  },
};

function formatValue(value?: number, suffix = "") {
  return value === undefined ? "—" : `${value}${suffix}`;
}

function scaleNutritionValues(
  nutrition: MenuItem["nutrition"] | IngredientItem["nutrition"],
  multiplier: number
) {
  if (multiplier === 1) {
    return nutrition;
  }

  return Object.fromEntries(
    Object.entries(nutrition).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.round(value * multiplier) : value,
    ])
  );
}

export default function RestaurantView({
  restaurantId,
  restaurantName,
  restaurantLogo,
  isBuildYourOwn = false,
  items,
  ingredients = [],
  addons,
  commonChanges,
  customizationRules,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string;
  isBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  customizationRules?: RestaurantCustomizationRules;
}) {
  const isChipotleBuildPage = isBuildYourOwn && restaurantId === "chipotle";
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
  const requestedView = searchParams.get("view");
  const defaultView: ViewOption = isBuildYourOwn ? "ingredients" : "menu";
  const viewMode: ViewOption =
    requestedView === "ingredients"
      ? "ingredients"
      : requestedView === "ranking"
        ? "ranking"
        : defaultView;
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
  const { addItem } = useCart();
  const [selectedIngredientItems, setSelectedIngredientItems] = useState<
    Record<string, { item: MenuItem; quantity: number }>
  >({});
  const [isBuildSummaryExpanded, setIsBuildSummaryExpanded] = useState(false);
  const buildStickyContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedEntree, setSelectedEntree] = useState<EntreeSelection>(null);
  const [selectedTacoShell, setSelectedTacoShell] = useState<TacoShellSelection>("crispy");
  const [selectedTacoCount, setSelectedTacoCount] = useState<TacoCountSelection>(3);
  const [selectedKidsMeal, setSelectedKidsMeal] = useState<KidsMealSelection>("build-your-own");
  const isChipotleChipsSidesSelection = isChipotleBuildPage && selectedEntree === "chips-sides";
  const isChipotleHighProteinSelection =
    isChipotleBuildPage && selectedEntree === "high-protein-menu";
  const isChipotleDrinksSelection = isChipotleBuildPage && selectedEntree === "drinks";
  const effectiveViewMode: ViewOption =
    isChipotleChipsSidesSelection || isChipotleHighProteinSelection || isChipotleDrinksSelection
      ? "menu"
      : viewMode;
  const selectedEntreeConfig = selectedEntree ? CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree] : null;
  const selectedEntreeNutritionMultiplier = selectedEntreeConfig?.nutritionMultiplier ?? 1;
  const tacoServingMultiplier = selectedEntree === "tacos" && selectedTacoCount === 1 ? 1 / 3 : 1;
  const servingMultiplier = tacoServingMultiplier * selectedEntreeNutritionMultiplier;
  const ingredientDisplayMultiplier = servingMultiplier;
  const tacoShellIngredientIds = CHIPOTLE_TACO_SHELL_INGREDIENT_IDS;
  const selectedIncludedIngredientIds = useMemo(
    () => {
      if (selectedEntree === "kids-meal") {
        return selectedKidsMeal === "quesadilla"
          ? CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS
          : [];
      }
      return (
        selectedEntreeConfig?.getIncludedIngredientIds?.({ tacoShell: selectedTacoShell }) ??
        selectedEntreeConfig?.includedIngredientIds ??
        []
      );
    },
    [selectedEntree, selectedEntreeConfig, selectedKidsMeal, selectedTacoShell]
  );

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
      .map((ingredient, index) => {
        const ingredientId =
          ingredient.id ??
          `${restaurantId}-ingredient-${ingredient.name}-${index}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        const resolvedCategory = resolveIngredientCategory(ingredient);
        const shouldPinToIncludedCategory =
          selectedIncludedIngredientIds.includes(ingredientId) ||
          (selectedEntree === "tacos" && tacoShellIngredientIds.includes(ingredientId));
        const displayCategory = shouldPinToIncludedCategory ? "Included Ingredient" : resolvedCategory;

        return {
          id: ingredientId,
          name: ingredient.name,
          nutrition:
            selectedEntree === "kids-meal" && selectedKidsMeal === "quesadilla"
              ? CHIPOTLE_KIDS_QUESADILLA_NUTRITION_OVERRIDES[ingredientId] ??
                scaleNutritionValues(ingredient.nutrition, ingredientDisplayMultiplier)
              : scaleNutritionValues(ingredient.nutrition, ingredientDisplayMultiplier),
          image: ingredient.image,
          categories: [displayCategory],
          portionType: "addon",
        };
      });
  }, [
    ingredientDisplayMultiplier,
    ingredients,
    restaurantId,
    selectedEntree,
    selectedKidsMeal,
    selectedIncludedIngredientIds,
    tacoShellIngredientIds,
  ]);

  const ingredientItemsById = useMemo(
    () =>
      new Map(
        ingredientMenuItems
          .filter((ingredient): ingredient is MenuItem & { id: string } => Boolean(ingredient.id))
          .map((ingredient) => [ingredient.id, ingredient])
      ),
    [ingredientMenuItems]
  );

  const allItems = useMemo(() => {
    const baseItems = [...items, ...addonItems];
    if (
      isChipotleBuildPage &&
      (selectedEntree === "chips-sides" || selectedEntree === "high-protein-menu" || selectedEntree === "drinks")
    ) {
      return baseItems.filter((item) => item.entreeGroup === selectedEntree);
    }
    return baseItems;
  }, [addonItems, isChipotleBuildPage, items, selectedEntree]);
  const sourceItems = effectiveViewMode === "ingredients" ? ingredientMenuItems : allItems;

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
        if (effectiveViewMode !== "ranking") {
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
  }, [effectiveViewMode, sourceItems, filters, searchTerms, rankedAllFilters]);

  const visibleMenuItems = useMemo(() => {
    if (!isChipotleBuildPage || !selectedEntree) {
      return filteredItems;
    }

    const hiddenSections = new Set(
      (CHIPOTLE_HIDDEN_MENU_SECTIONS_BY_ENTREE[selectedEntree] ?? []).map((section) =>
        section.trim().toLowerCase()
      )
    );

    if (hiddenSections.size === 0) {
      return filteredItems;
    }

    return filteredItems
      .map((item) => {
        const nextCategories = (item.categories ?? []).filter(
          (category) => !hiddenSections.has(category.trim().toLowerCase())
        );
        const nextVariants = item.variants?.map((variant) => ({
          ...variant,
          categories: variant.categories?.filter(
            (category) => !hiddenSections.has(category.trim().toLowerCase())
          ),
        }));

        return {
          ...item,
          categories: nextCategories,
          variants: nextVariants,
        };
      })
      .filter((item) => item.categories.length > 0);
  }, [filteredItems, isChipotleBuildPage, selectedEntree]);

  const orderedSections = useMemo(
    () => getOrderedMenuSections(visibleMenuItems, effectiveViewMode === "ranking" ? "menu" : effectiveViewMode),
    [effectiveViewMode, visibleMenuItems]
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
        label: getCategoryLabel(section, effectiveViewMode === "ranking" ? "menu" : effectiveViewMode),
      })),
    [effectiveViewMode, orderedSections]
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
    if (effectiveViewMode === "ranking" || orderedSections.length === 0) {
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
  }, [activeCategory, effectiveViewMode, orderedSections]);

  const handleViewChange = (nextView: ViewOption) => {
    if ((isChipotleChipsSidesSelection || isChipotleDrinksSelection) && nextView !== "menu") {
      return;
    }

    if (nextView === effectiveViewMode) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: true });
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSort(nextSort);
  };

  const selectedIngredientTotals = useMemo(
    () =>
      Object.values(selectedIngredientItems).reduce(
        (acc, selectedIngredient) => ({
          calories:
            acc.calories +
            (selectedIngredient.item.nutrition.calories ?? 0) * selectedIngredient.quantity,
          protein:
            acc.protein +
            (selectedIngredient.item.nutrition.protein ?? 0) * selectedIngredient.quantity,
          carbs:
            acc.carbs +
            (selectedIngredient.item.nutrition.carbs ?? 0) * selectedIngredient.quantity,
          fat:
            acc.fat +
            (selectedIngredient.item.nutrition.totalFat ?? 0) * selectedIngredient.quantity,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [selectedIngredientItems]
  );
  const adjustedSelectedIngredientTotals = useMemo(
    () => ({
      calories: Math.round(selectedIngredientTotals.calories * servingMultiplier),
      protein: Math.round(selectedIngredientTotals.protein * servingMultiplier),
      carbs: Math.round(selectedIngredientTotals.carbs * servingMultiplier),
      fat: Math.round(selectedIngredientTotals.fat * servingMultiplier),
    }),
    [selectedIngredientTotals, servingMultiplier]
  );

  const selectedNutritionLabelTotals = useMemo(
    () =>
      Object.values(selectedIngredientItems).reduce(
        (acc, selectedIngredient) => {
          const { item, quantity } = selectedIngredient;
          return {
            calories: acc.calories + (item.nutrition.calories ?? 0) * quantity,
            totalFat: acc.totalFat + (item.nutrition.totalFat ?? 0) * quantity,
            satFat: acc.satFat + (item.nutrition.satFat ?? 0) * quantity,
            transFat: acc.transFat + (item.nutrition.transFat ?? 0) * quantity,
            cholesterol: acc.cholesterol + (item.nutrition.cholesterol ?? 0) * quantity,
            sodium: acc.sodium + (item.nutrition.sodium ?? 0) * quantity,
            carbs: acc.carbs + (item.nutrition.carbs ?? 0) * quantity,
            fiber: acc.fiber + (item.nutrition.fiber ?? 0) * quantity,
            sugars: acc.sugars + (item.nutrition.sugars ?? 0) * quantity,
            protein: acc.protein + (item.nutrition.protein ?? 0) * quantity,
          };
        },
        {
          calories: 0,
          totalFat: 0,
          satFat: 0,
          transFat: 0,
          cholesterol: 0,
          sodium: 0,
          carbs: 0,
          fiber: 0,
          sugars: 0,
          protein: 0,
        }
      ),
    [selectedIngredientItems]
  );
  const adjustedNutritionLabelTotals = useMemo(
    () => ({
      calories: Math.round(selectedNutritionLabelTotals.calories * servingMultiplier),
      totalFat: Math.round(selectedNutritionLabelTotals.totalFat * servingMultiplier),
      satFat: Math.round(selectedNutritionLabelTotals.satFat * servingMultiplier),
      transFat: Math.round(selectedNutritionLabelTotals.transFat * servingMultiplier),
      cholesterol: Math.round(selectedNutritionLabelTotals.cholesterol * servingMultiplier),
      sodium: Math.round(selectedNutritionLabelTotals.sodium * servingMultiplier),
      carbs: Math.round(selectedNutritionLabelTotals.carbs * servingMultiplier),
      fiber: Math.round(selectedNutritionLabelTotals.fiber * servingMultiplier),
      sugars: Math.round(selectedNutritionLabelTotals.sugars * servingMultiplier),
      protein: Math.round(selectedNutritionLabelTotals.protein * servingMultiplier),
    }),
    [selectedNutritionLabelTotals, servingMultiplier]
  );

  const selectedIngredientCount = Object.values(selectedIngredientItems).reduce(
    (acc, selectedIngredient) => acc + selectedIngredient.quantity,
    0
  );
  const buildName = selectedEntree
    ? `${restaurantName} ${
        selectedEntree === "kids-meal"
          ? selectedKidsMeal === "quesadilla"
            ? "Kid's Quesadilla"
            : "Kid's Build Your Own"
          : CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].label
      } Build`
    : `${restaurantName} Build`;
  const shouldShowBuildStickyBar =
    isBuildYourOwn &&
    effectiveViewMode === "ingredients" &&
    (!isChipotleBuildPage ||
      (selectedEntree !== null &&
        selectedEntree !== "chips-sides" &&
        selectedEntree !== "high-protein-menu" &&
        selectedEntree !== "drinks"));
  const lockedIngredientIds = useMemo(() => {
    if (selectedIncludedIngredientIds.length === 0) {
      return new Set<string>();
    }
    if (selectedEntree === "tacos") {
      return new Set<string>(
        selectedIncludedIngredientIds.filter((ingredientId) => !tacoShellIngredientIds.includes(ingredientId))
      );
    }
    return new Set<string>(selectedIncludedIngredientIds);
  }, [selectedEntree, selectedIncludedIngredientIds, tacoShellIngredientIds]);

  const handleIngredientSelectionChange = (item: MenuItem, selected: boolean) => {
    const itemId = item.id;
    if (!itemId) return;

    if (selectedEntree === "tacos" && tacoShellIngredientIds.includes(itemId)) {
      if (!selected) return;
      const nextTacoShell = itemId === "soft-flour-tortilla" ? "soft" : "crispy";
      setSelectedTacoShell(nextTacoShell);
      applyIncludedIngredients(
        CHIPOTLE_ENTREE_CONFIGURATIONS.tacos.getIncludedIngredientIds?.({ tacoShell: nextTacoShell }) ?? []
      );
      return;
    }

    if (lockedIngredientIds.has(itemId)) return;

    setSelectedIngredientItems((prev) => {
      if (!selected) {
        if (!(itemId in prev)) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { item, quantity: 1 } };
    });
  };

  const applyIncludedIngredients = (nextIncludedIngredientIds: string[]) => {
    const allIncludedIngredientIds = new Set(
      [
        ...Object.values(CHIPOTLE_ENTREE_CONFIGURATIONS).flatMap((configuration) => [
          ...(configuration.includedIngredientIds ?? []),
          ...(configuration.getIncludedIngredientIds?.({ tacoShell: "crispy" }) ?? []),
          ...(configuration.getIncludedIngredientIds?.({ tacoShell: "soft" }) ?? []),
        ]),
        ...CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS,
      ]
    );

    setSelectedIngredientItems((previous) => {
      const next = { ...previous };

      allIncludedIngredientIds.forEach((ingredientId) => {
        if (ingredientId in next) {
          delete next[ingredientId];
        }
      });

      nextIncludedIngredientIds.forEach((includedIngredientId) => {
        const includedIngredientItem = ingredientItemsById.get(includedIngredientId);
        if (!includedIngredientItem || next[includedIngredientId]) {
          return;
        }

        next[includedIngredientId] = { item: includedIngredientItem, quantity: 1 };
      });

      return next;
    });
  };

  const handleEntreeSelection = (entree: Exclude<EntreeSelection, null>) => {
    const nextIncludedIngredientIds =
      entree === "kids-meal"
        ? selectedKidsMeal === "quesadilla"
          ? CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS
          : []
        : CHIPOTLE_ENTREE_CONFIGURATIONS[entree].getIncludedIngredientIds?.({
            tacoShell: selectedTacoShell,
          }) ??
          CHIPOTLE_ENTREE_CONFIGURATIONS[entree].includedIngredientIds ??
          [];
    setSelectedEntree(entree);
    applyIncludedIngredients(nextIncludedIngredientIds);

    const nextView =
      entree === "chips-sides" || entree === "high-protein-menu" || entree === "drinks"
        ? "menu"
        : "ingredients";
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: true });
  };

  const handleAddBuildToCart = () => {
    if (selectedIngredientCount === 0) return;

    addItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId: `${restaurantId}-build`,
      name: buildName,
      customizations: Object.values(selectedIngredientItems).flatMap(({ item, quantity }) =>
        Array.from({ length: quantity }, () => item.name)
      ),
      quantity: 1,
      macrosPerItem: adjustedSelectedIngredientTotals,
      nutritionPerItem: {
        calories: adjustedNutritionLabelTotals.calories,
        totalFat: adjustedNutritionLabelTotals.totalFat,
        satFat: adjustedNutritionLabelTotals.satFat,
        transFat: adjustedNutritionLabelTotals.transFat,
        cholesterol: adjustedNutritionLabelTotals.cholesterol,
        sodium: adjustedNutritionLabelTotals.sodium,
        carbs: adjustedNutritionLabelTotals.carbs,
        fiber: adjustedNutritionLabelTotals.fiber,
        sugars: adjustedNutritionLabelTotals.sugars,
        protein: adjustedNutritionLabelTotals.protein,
      },
    });
  };

  const adjustIngredientQuantity = (ingredientId: string, delta: 1 | -1) => {
    if (lockedIngredientIds.has(ingredientId)) return;

    setSelectedIngredientItems((previous) => {
      const existing = previous[ingredientId];
      if (!existing) return previous;

      const maxQuantity = ingredients.find((ingredient) => ingredient.id === ingredientId)?.maxQuantity ?? 2;
      const nextQuantity = Math.max(0, Math.min(maxQuantity, existing.quantity + delta));
      const next = { ...previous };

      if (nextQuantity === 0) {
        delete next[ingredientId];
        return next;
      }

      next[ingredientId] = { ...existing, quantity: nextQuantity };
      return next;
    });
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

  const selectedIngredientEntries = Object.entries(selectedIngredientItems);

  useEffect(() => {
    if (!isBuildSummaryExpanded) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (buildStickyContainerRef.current?.contains(target)) {
        return;
      }

      setIsBuildSummaryExpanded(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isBuildSummaryExpanded]);

  return (
    <div>
      {isChipotleBuildPage && selectedEntree !== null ? (
        <div className="mb-5 rounded-2xl border border-black/10 bg-white px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Entrée: <span className="text-slate-900">{CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].label}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedEntree(null)}
              className="cursor-pointer text-sm font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Change
            </button>
          </div>
        </div>
      ) : null}

      <StickyRestaurantBar
        restaurantName={restaurantName}
        restaurantLogo={restaurantLogo}
        view={effectiveViewMode}
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
        calorieBounds={calorieBounds}
      />

      {isChipotleBuildPage && selectedEntree === "kids-meal" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {([
            { id: "build-your-own", label: "Kid's Build Your Own" },
            { id: "quesadilla", label: "Kid's Quesadilla" },
          ] as const).map((option) => {
            const isActive = selectedKidsMeal === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedKidsMeal(option.id);
                  applyIncludedIngredients(
                    option.id === "quesadilla"
                      ? CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS
                      : []
                  );
                }}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {isChipotleBuildPage && selectedEntree === null ? (
        <div className="py-6">
          <section className="mx-auto flex min-h-[calc(100vh-260px)] w-full max-w-5xl flex-col items-center justify-center px-4 py-12">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Chipotle</p>
              <h2 className="mt-4 text-center text-5xl font-bold tracking-tight text-slate-900">Choose your entrée</h2>
              <p className="mt-3 text-center text-lg text-slate-600">
                Start your build by selecting a base.
              </p>
              <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
                {(Object.entries(CHIPOTLE_ENTREE_CONFIGURATIONS) as [Exclude<EntreeSelection, null>, EntreeConfiguration][]).map(([entreeKey, entree]) => (
                  <button
                    key={entreeKey}
                    type="button"
                    onClick={() => handleEntreeSelection(entreeKey)}
                    className="cursor-pointer rounded-3xl border border-black/15 bg-white px-6 py-8 text-center text-2xl font-semibold text-slate-900 shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-[0_12px_26px_rgba(0,0,0,0.12)]"
                  >
                    <Image
                      src={entree.imageSrc}
                      alt={entree.label}
                      width={640}
                      height={320}
                      className="mb-4 h-32 w-full rounded-xl object-contain"
                    />
                    {entree.label}
                  </button>
                ))}
              </div>
            </section>
        </div>
      ) : (
        <div className="grid items-start gap-6 [grid-template-columns:240px_minmax(0,1fr)]">
          <aside className="sticky top-[160px] flex max-h-[calc(100vh-160px)] flex-col py-6">
            <h3 className="mb-8 shrink-0 text-2xl font-bold text-slate-900">
              {effectiveViewMode === "ranking"
                ? "Show"
                : effectiveViewMode === "ingredients"
                  ? "Ingredients"
                  : "Categories"}
            </h3>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {effectiveViewMode === "ranking" ? (
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
                    effectiveViewMode === "ingredients"
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
                items={visibleMenuItems}
                sort={sort}
                addons={addons}
                ingredients={ingredients}
                commonChanges={commonChanges}
                customizationRules={customizationRules}
                groupByCategory={effectiveViewMode !== "ranking"}
                categoryMode={effectiveViewMode === "ranking" ? "menu" : effectiveViewMode}
                isBuildYourOwn={isBuildYourOwn}
                selectedIngredientIds={new Set(Object.keys(selectedIngredientItems))}
                lockedIngredientIds={lockedIngredientIds}
                onIngredientSelectionChange={handleIngredientSelectionChange}
                ingredientSelectionControlById={
                  selectedEntree === "tacos"
                    ? Object.fromEntries(
                        tacoShellIngredientIds.map((ingredientId) => [ingredientId, "radio" as const])
                      )
                    : undefined
                }
                ingredientRadioGroupNameById={
                  selectedEntree === "tacos"
                    ? Object.fromEntries(
                        tacoShellIngredientIds.map((ingredientId) => [ingredientId, "chipotle-taco-shell"])
                      )
                    : undefined
                }
                ingredientVariantOptionsById={
                  selectedEntree === "tacos"
                    ? Object.fromEntries(
                        tacoShellIngredientIds.map((ingredientId) => [
                          ingredientId,
                          [
                            { id: "3", label: "3 Tacos" },
                            { id: "1", label: "1 Taco" },
                          ],
                        ])
                      )
                    : undefined
                }
                selectedIngredientVariantIdById={
                  selectedEntree === "tacos"
                    ? Object.fromEntries(
                        tacoShellIngredientIds.map((ingredientId) => [ingredientId, String(selectedTacoCount)])
                      )
                    : undefined
                }
                onIngredientVariantChange={
                  selectedEntree === "tacos"
                    ? (_item, variantId) => setSelectedTacoCount(variantId === "1" ? 1 : 3)
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
      {shouldShowBuildStickyBar ? <div className="h-48" aria-hidden="true" /> : null}
      {shouldShowBuildStickyBar ? (
        <div ref={buildStickyContainerRef}>
          <StickyMacroTotalsBar
            totals={adjustedSelectedIngredientTotals}
            secondaryActionLabel="View Selected"
            secondaryActionExpandedLabel="View Selected"
            primaryActionLabel="Add to Cart"
            SecondaryActionIcon={ChevronDown}
            SecondaryActionExpandedIcon={ChevronUp}
            PrimaryActionIcon={ShoppingCart}
            detailsOpen={isBuildSummaryExpanded}
            detailsContent={
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-[18px]">
                  <h3 className="text-2xl font-bold text-neutral-900">Nutrition Summary</h3>
                  <div className="mt-6 text-xs font-medium text-[rgba(0,0,0,0.55)]">Amount per serving</div>

                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-xl font-bold">Calories</div>
                    <div className="text-xl font-bold">{adjustedNutritionLabelTotals.calories}</div>
                  </div>

                  <div className="my-[12px] mb-2 h-[5px] rounded-[999px] bg-[rgba(0,0,0,0.75)]" />

                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                    <div className="text-lg font-semibold">Total Fat</div>
                    <div className="text-lg font-semibold">{formatValue(adjustedNutritionLabelTotals.totalFat, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sat Fat</div>
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(adjustedNutritionLabelTotals.satFat, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Trans Fat</div>
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(adjustedNutritionLabelTotals.transFat, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                    <div className="text-lg font-semibold">Cholesterol</div>
                    <div className="text-lg font-semibold">{formatValue(adjustedNutritionLabelTotals.cholesterol, "mg")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                    <div className="text-lg font-semibold">Sodium</div>
                    <div className="text-lg font-semibold">{formatValue(adjustedNutritionLabelTotals.sodium, "mg")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                    <div className="text-lg font-semibold">Carbohydrates</div>
                    <div className="text-lg font-semibold">{formatValue(adjustedNutritionLabelTotals.carbs, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Fiber</div>
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(adjustedNutritionLabelTotals.fiber, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sugars</div>
                    <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{formatValue(adjustedNutritionLabelTotals.sugars, "g")}</div>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
                    <div className="text-lg font-semibold">Protein</div>
                    <div className="text-lg font-semibold">{formatValue(adjustedNutritionLabelTotals.protein, "g")}</div>
                  </div>
                </section>

                <section className="flex min-h-0 flex-col rounded-3xl border border-black/10 bg-white p-5">
                  <h3 className="text-2xl font-bold text-neutral-900">Selected Ingredients</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree ?? "bowl"].label} · {selectedIngredientCount} selected
                  </p>
                  <ul className="mt-4 grid gap-2 rounded-xl bg-[#efefef] p-2">
                    {selectedIngredientEntries.map(([ingredientId, selectedIngredient]) => (
                      <li key={ingredientId} className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
                            <Image
                              src={selectedIngredient.item.image || restaurantLogo}
                              alt={selectedIngredient.item.name}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="truncate text-sm font-medium text-slate-900">
                            {selectedIngredient.item.name}
                            {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustIngredientQuantity(ingredientId, -1)}
                            disabled={lockedIngredientIds.has(ingredientId)}
                            className="h-7 w-7 rounded-full border border-black/20 text-base font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-slate-900">{selectedIngredient.quantity}</span>
                          <button
                            type="button"
                            onClick={() => adjustIngredientQuantity(ingredientId, 1)}
                            disabled={lockedIngredientIds.has(ingredientId)}
                            className="h-7 w-7 rounded-full border border-black/20 text-base font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            }
            onSecondaryAction={() => setIsBuildSummaryExpanded((previous) => !previous)}
            onPrimaryAction={handleAddBuildToCart}
          />
        </div>
      ) : null}
    </div>
  );
}
