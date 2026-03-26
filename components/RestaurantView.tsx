"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  UtensilsCrossed,
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
const CHIPOTLE_CATEGORY_MAX_SELECTIONS: Record<string, number> = {
  proteins: 2,
  rice: 2,
  beans: 2,
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
type ProteinPortionMode = "normal" | "double";
type SplitPortionMode = "light" | "normal" | "extra";
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

function normalizeIngredientCategory(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

const CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_ORDER = [
  "included ingredient",
  "proteins",
  "rice",
  "beans",
  "toppings",
  "side",
] as const;

const CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  "included ingredient": "Included ingredients",
  proteins: "Protein",
  rice: "Rice",
  beans: "Beans",
  toppings: "Toppings",
  side: "Side",
};

function isProteinIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(item.categories?.[0]) === "proteins";
}

function isRiceIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(item.categories?.[0]) === "rice";
}

function isBeanIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(item.categories?.[0]) === "beans";
}

function isSplitPortionIngredientItem(item: Pick<MenuItem, "categories">) {
  return isRiceIngredientItem(item) || isBeanIngredientItem(item);
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

function getProteinMultiplier(mode: ProteinPortionMode, selectedProteinCount: number) {
  if (selectedProteinCount <= 0) return 0;
  if (mode === "double") {
    return selectedProteinCount === 1 ? 2 : 1;
  }

  return selectedProteinCount === 1 ? 1 : 0.5;
}

function getProteinBadgeLabel(mode: ProteinPortionMode, selectedProteinCount: number) {
  const multiplier = getProteinMultiplier(mode, selectedProteinCount);
  return multiplier === 0.5 ? "1/2x" : `${multiplier}x`;
}

function formatMultiplierLabel(multiplier: number) {
  if (multiplier === 0.5) return "1/2x";
  if (Number.isInteger(multiplier)) return `${multiplier}x`;
  return `${multiplier.toFixed(1)}x`;
}

function getNutritionMultiplier(
  baseNutrition: MenuItem["nutrition"],
  nextNutrition: MenuItem["nutrition"]
) {
  const comparableKeys: Array<keyof MenuItem["nutrition"]> = ["calories", "protein", "carbs", "totalFat"];
  for (const key of comparableKeys) {
    const baseValue = baseNutrition[key];
    const nextValue = nextNutrition[key];
    if (typeof baseValue === "number" && baseValue > 0 && typeof nextValue === "number") {
      return nextValue / baseValue;
    }
  }

  return 1;
}

function getSplitExtraMultiplier(item: MenuItem) {
  const extraVariant = item.variants?.find((variant) => {
    const label = variant.label?.trim().toLowerCase() ?? "";
    const id = variant.id?.trim().toLowerCase() ?? "";
    return label === "extra" || id === "extra";
  });

  if (!extraVariant) {
    return 1.5;
  }

  return getNutritionMultiplier(item.nutrition, extraVariant.nutrition);
}

function getSplitPortionLabel(item: MenuItem, mode: SplitPortionMode) {
  const multiplier = mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier(item) : 1;
  return formatMultiplierLabel(multiplier);
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
  const { addItem, items: cartItems, updateItem } = useCart();
  const [selectedIngredientItems, setSelectedIngredientItems] = useState<
    Record<string, { item: MenuItem; quantity: number }>
  >({});
  const [selectedIngredientVariantIds, setSelectedIngredientVariantIds] = useState<Record<string, string>>({});
  const [proteinPortionMode, setProteinPortionMode] = useState<ProteinPortionMode>("normal");
  const [splitPortionModeById, setSplitPortionModeById] = useState<Record<string, SplitPortionMode>>({});
  const [isBuildSummaryExpanded, setIsBuildSummaryExpanded] = useState(false);
  const buildStickyContainerRef = useRef<HTMLDivElement | null>(null);
  const entreeMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedIngredientsListRef = useRef<HTMLUListElement | null>(null);
  const [selectedEntree, setSelectedEntree] = useState<EntreeSelection>(null);
  const [isEntreeMenuOpen, setIsEntreeMenuOpen] = useState(false);
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
  const editCartItemId = searchParams.get("editCartItem");
  const editingCartItem = useMemo(() => {
    if (!isChipotleBuildPage || !editCartItemId) {
      return null;
    }

    return (
      cartItems.find(
        (item) =>
          item.id === editCartItemId &&
          item.restaurantId === restaurantId &&
          item.itemId === `${restaurantId}-build` &&
          item.buildConfiguration
      ) ?? null
    );
  }, [cartItems, editCartItemId, isChipotleBuildPage, restaurantId]);
  const isEditingBuild = Boolean(editingCartItem);
  const hydratedEditItemIdRef = useRef<string | null>(null);

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
          portionType: "addon" as const,
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

    const mappedIngredientItems = ingredients
      .filter((ingredient) => {
        if (ingredient.hideFromIngredientView) {
          return false;
        }

        const isTacoShellIngredient = ingredient.id
          ? tacoShellIngredientIds.includes(ingredient.id)
          : false;
        if (isTacoShellIngredient && selectedEntree !== "tacos") {
          return false;
        }

        return true;
      })
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
        const hasCustomVariants = Boolean(ingredient.variants?.length);
        const ingredientBaseNutrition =
          selectedEntree === "kids-meal" && selectedKidsMeal === "quesadilla"
            ? CHIPOTLE_KIDS_QUESADILLA_NUTRITION_OVERRIDES[ingredientId] ??
              scaleNutritionValues(ingredient.nutrition, ingredientDisplayMultiplier)
            : scaleNutritionValues(ingredient.nutrition, ingredientDisplayMultiplier);
        const variants = hasCustomVariants
          ? ingredient.variants?.map((variant) => ({
              ...variant,
              nutrition: scaleNutritionValues(variant.nutrition, ingredientDisplayMultiplier),
            }))
          : undefined;
        const defaultVariantId = ingredient.defaultVariantId;

        const menuItem: MenuItem = {
          id: ingredientId,
          name: ingredient.name,
          nutrition: ingredientBaseNutrition,
          variants,
          defaultVariantId,
          hideVariantSelector: ingredient.hideVariantSelector,
          image: ingredient.image,
          categories: [displayCategory],
          portionType: "addon",
        };
        return menuItem;
      });

    if (selectedEntree !== "burrito") {
      return mappedIngredientItems;
    }

    const burritoTortillaItem = mappedIngredientItems.find((item) => item.id === "tortilla");
    if (!burritoTortillaItem) {
      return mappedIngredientItems;
    }

    return [
      ...mappedIngredientItems,
      {
        ...burritoTortillaItem,
        id: "extra-tortilla",
        name: "Extra Tortilla",
        categories: ["Side"],
      },
    ];
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
  const applyProteinPortionNutrition = useCallback(
    (
      itemsById: Record<string, { item: MenuItem; quantity: number }>,
      mode: ProteinPortionMode = proteinPortionMode
    ) => {
      const proteinIds = Object.entries(itemsById)
        .filter(([, selectedIngredient]) => isProteinIngredientItem(selectedIngredient.item))
        .map(([ingredientId]) => ingredientId);

      if (proteinIds.length === 0) {
        return itemsById;
      }

      const perProteinMultiplier = getProteinMultiplier(mode, proteinIds.length);
      const nextItems = { ...itemsById };

      proteinIds.forEach((ingredientId) => {
        const selectedIngredient = nextItems[ingredientId];
        const baseIngredient = ingredientItemsById.get(ingredientId);
        if (!selectedIngredient || !baseIngredient) {
          return;
        }

        nextItems[ingredientId] = {
          ...selectedIngredient,
          item: {
            ...selectedIngredient.item,
            nutrition: scaleNutritionValues(baseIngredient.nutrition, perProteinMultiplier),
          },
        };
      });

      return nextItems;
    },
    [ingredientItemsById, proteinPortionMode]
  );
  const applySplitPortionNutrition = useCallback(
    (
      itemsById: Record<string, { item: MenuItem; quantity: number }>,
      portionModesById: Record<string, SplitPortionMode> = splitPortionModeById
    ) => {
      const nextItems = { ...itemsById };
      const splitCategories = ["rice", "beans"] as const;

      splitCategories.forEach((splitCategory) => {
        const selectedSplitIds = Object.entries(itemsById)
          .filter(
            ([, selectedIngredient]) =>
              normalizeIngredientCategory(selectedIngredient.item.categories?.[0]) === splitCategory
          )
          .map(([ingredientId]) => ingredientId);

        if (selectedSplitIds.length === 0) {
          return;
        }

        if (selectedSplitIds.length >= 2) {
          selectedSplitIds.forEach((ingredientId) => {
            const selectedIngredient = nextItems[ingredientId];
            const baseIngredient = ingredientItemsById.get(ingredientId);
            if (!selectedIngredient || !baseIngredient) return;

            nextItems[ingredientId] = {
              ...selectedIngredient,
              item: {
                ...selectedIngredient.item,
                nutrition: scaleNutritionValues(baseIngredient.nutrition, 0.5),
              },
            };
          });
          return;
        }

        const [splitId] = selectedSplitIds;
        const selectedIngredient = nextItems[splitId];
        const baseIngredient = ingredientItemsById.get(splitId);
        if (!selectedIngredient || !baseIngredient) {
          return;
        }

        const mode = portionModesById[splitId] ?? "normal";
        const multiplier =
          mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier(baseIngredient) : 1;
        nextItems[splitId] = {
          ...selectedIngredient,
          item: {
            ...selectedIngredient.item,
            nutrition: scaleNutritionValues(baseIngredient.nutrition, multiplier),
          },
        };
      });

      return nextItems;
    },
    [ingredientItemsById, splitPortionModeById]
  );
  const applyIngredientPortionNutrition = useCallback(
    (
      itemsById: Record<string, { item: MenuItem; quantity: number }>,
      options?: {
        proteinMode?: ProteinPortionMode;
        splitModesById?: Record<string, SplitPortionMode>;
      }
    ) => {
      const withProtein = applyProteinPortionNutrition(itemsById, options?.proteinMode);
      return applySplitPortionNutrition(withProtein, options?.splitModesById);
    },
    [applyProteinPortionNutrition, applySplitPortionNutrition]
  );

  const getIngredientCategoryMaxSelections = (item: MenuItem) => {
    const category = normalizeIngredientCategory(item.categories[0]);
    return CHIPOTLE_CATEGORY_MAX_SELECTIONS[category];
  };

  const getSelectedQuantityForCategory = (
    itemsById: Record<string, { item: MenuItem; quantity: number }>,
    category: string
  ) =>
    Object.values(itemsById).reduce((total, selectedIngredient) => {
      const selectedCategory = normalizeIngredientCategory(
        selectedIngredient.item.categories[0]
      );
      return selectedCategory === category ? total + selectedIngredient.quantity : total;
    }, 0);

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

    const splitCategory = normalizeIngredientCategory(item.categories?.[0]);
    const isSplitItem = isSplitPortionIngredientItem(item);
    const currentSelectedSplitIds = Object.entries(selectedIngredientItems)
      .filter(
        ([, selectedIngredient]) =>
          normalizeIngredientCategory(selectedIngredient.item.categories?.[0]) === splitCategory
      )
      .map(([ingredientId]) => ingredientId);
    const nextSplitPortionModes = (() => {
      if (!isSplitItem) return { ...splitPortionModeById };

      const nextModes = { ...splitPortionModeById };
      if (!selected) {
        delete nextModes[itemId];
        if (currentSelectedSplitIds.length === 2) {
          const remainingSplitId = currentSelectedSplitIds.find((splitId) => splitId !== itemId);
          if (remainingSplitId) {
            nextModes[remainingSplitId] = "normal";
          }
        }
        return nextModes;
      }

      if (currentSelectedSplitIds.length === 1 && !currentSelectedSplitIds.includes(itemId)) {
        nextModes[currentSelectedSplitIds[0]] = "normal";
        nextModes[itemId] = "normal";
        return nextModes;
      }

      nextModes[itemId] = nextModes[itemId] ?? "normal";
      return nextModes;
    })();

    setSelectedIngredientItems((prev) => {
      if (!selected) {
        if (!(itemId in prev)) return prev;
        const next = { ...prev };
        delete next[itemId];
        return applyIngredientPortionNutrition(next, { splitModesById: nextSplitPortionModes });
      }

      const category = normalizeIngredientCategory(item.categories[0]);
      const categoryMaxSelections = getIngredientCategoryMaxSelections(item);
      if (category && typeof categoryMaxSelections === "number") {
        const selectedQuantityInCategory = getSelectedQuantityForCategory(prev, category);
        if (selectedQuantityInCategory >= categoryMaxSelections) {
          return prev;
        }
      }

      const selectedVariantId = selectedIngredientVariantIds[itemId] ?? item.defaultVariantId;
      const selectedVariant = item.variants?.find((variant) => variant.id === selectedVariantId);
      const next = {
        ...prev,
        [itemId]: {
          item: {
            ...item,
            nutrition: selectedVariant?.nutrition ?? item.nutrition,
          },
          quantity: 1,
        },
      };
      return applyIngredientPortionNutrition(next, { splitModesById: nextSplitPortionModes });
    });
    if (isSplitItem) {
      setSplitPortionModeById(nextSplitPortionModes);
    }

    if (!selected) {
      setSelectedIngredientVariantIds((prev) => {
        if (!(itemId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return;
    }

    if (item.defaultVariantId) {
      setSelectedIngredientVariantIds((prev) =>
        prev[itemId] ? prev : { ...prev, [itemId]: item.defaultVariantId as string }
      );
    }
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

      return applyIngredientPortionNutrition(next);
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
    const nextCustomizations = Object.entries(selectedIngredientItems).flatMap(([ingredientId, { item, quantity }]) => {
      const portionLabel = ingredientPortionLabelById[ingredientId];
      const ingredientNameWithPortion = portionLabel ? `${item.name} (${portionLabel})` : item.name;
      return Array.from({ length: quantity }, () => ingredientNameWithPortion);
    });
    const nextBuildConfiguration = {
      selectedEntree,
      selectedIngredientItems: Object.fromEntries(
        Object.entries(selectedIngredientItems).map(([ingredientId, selectedIngredient]) => [
          ingredientId,
          { quantity: selectedIngredient.quantity },
        ])
      ),
      selectedIngredientVariantIds,
      proteinPortionMode,
      splitPortionModeById,
      selectedTacoShell,
      selectedTacoCount,
      selectedKidsMeal,
    } as const;
    const nextItemPayload = {
      restaurantId,
      itemId: `${restaurantId}-build`,
      name: buildName,
      customizations: nextCustomizations,
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
      buildConfiguration: nextBuildConfiguration,
    };

    if (editingCartItem) {
      updateItem(editingCartItem.id, nextItemPayload);
    } else {
      addItem({
        id: crypto.randomUUID(),
        ...nextItemPayload,
      });
    }

    hydratedEditItemIdRef.current = null;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("editCartItem");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    setIsBuildSummaryExpanded(false);
    setProteinPortionMode("normal");
    setSplitPortionModeById({});
    setSelectedIngredientVariantIds({});
    const nextIncludedIngredientIds =
      selectedEntree === "kids-meal"
        ? selectedKidsMeal === "quesadilla"
          ? CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS
          : []
        : selectedEntree
          ? CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].getIncludedIngredientIds?.({
              tacoShell: selectedTacoShell,
            }) ??
            CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].includedIngredientIds ??
            []
          : [];
    setSelectedIngredientItems(() => {
      const resetSelections: Record<string, { item: MenuItem; quantity: number }> = {};
      nextIncludedIngredientIds.forEach((ingredientId) => {
        const ingredientItem = ingredientItemsById.get(ingredientId);
        if (!ingredientItem) return;
        resetSelections[ingredientId] = { item: ingredientItem, quantity: 1 };
      });
      return applyIngredientPortionNutrition(resetSelections);
    });
  };

  useEffect(() => {
    if (!editingCartItem?.buildConfiguration) {
      hydratedEditItemIdRef.current = null;
      return;
    }

    if (hydratedEditItemIdRef.current === editingCartItem.id) {
      return;
    }

    const configuration = editingCartItem.buildConfiguration;
    hydratedEditItemIdRef.current = editingCartItem.id;
    const hydrateTimer = window.setTimeout(() => {
      setSelectedTacoShell(configuration.selectedTacoShell);
      setSelectedTacoCount(configuration.selectedTacoCount);
      setSelectedKidsMeal(configuration.selectedKidsMeal);
      setSelectedEntree((configuration.selectedEntree as EntreeSelection) ?? null);
      setProteinPortionMode(configuration.proteinPortionMode);
      setSplitPortionModeById(configuration.splitPortionModeById);
      setSelectedIngredientVariantIds(configuration.selectedIngredientVariantIds);
      setSelectedIngredientItems(() => {
        const next: Record<string, { item: MenuItem; quantity: number }> = {};

        Object.entries(configuration.selectedIngredientItems).forEach(([ingredientId, { quantity }]) => {
          const ingredient = ingredientItemsById.get(ingredientId);
          if (!ingredient || quantity <= 0) {
            return;
          }

          const selectedVariantId =
            configuration.selectedIngredientVariantIds[ingredientId] ?? ingredient.defaultVariantId;
          const selectedVariant = ingredient.variants?.find((variant) => variant.id === selectedVariantId);

          next[ingredientId] = {
            item: {
              ...ingredient,
              nutrition: selectedVariant?.nutrition ?? ingredient.nutrition,
            },
            quantity,
          };
        });

        return applyIngredientPortionNutrition(next, {
          proteinMode: configuration.proteinPortionMode,
          splitModesById: configuration.splitPortionModeById,
        });
      });
    }, 0);

    return () => {
      window.clearTimeout(hydrateTimer);
    };
  }, [applyIngredientPortionNutrition, editingCartItem, ingredientItemsById]);

  const adjustIngredientQuantity = (ingredientId: string, delta: 1 | -1) => {
    if (lockedIngredientIds.has(ingredientId)) return;

    setSelectedIngredientItems((previous) => {
      const existing = previous[ingredientId];
      if (!existing) return previous;

      const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
      const ingredientMaxQuantity = ingredient?.maxQuantity ?? 2;
      const category = normalizeIngredientCategory(existing.item.categories[0]);
      const categoryMaxSelections = getIngredientCategoryMaxSelections(existing.item);
      const selectedQuantityInCategory = category
        ? getSelectedQuantityForCategory(previous, category)
        : 0;
      const categoryRemainingSelections =
        delta > 0 && typeof categoryMaxSelections === "number"
          ? Math.max(0, categoryMaxSelections - (selectedQuantityInCategory - existing.quantity))
          : undefined;
      const nextQuantityCap =
        typeof categoryRemainingSelections === "number"
          ? Math.min(ingredientMaxQuantity, categoryRemainingSelections)
          : ingredientMaxQuantity;
      const nextQuantity = Math.max(0, Math.min(nextQuantityCap, existing.quantity + delta));
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

  const handleResetSelectedIngredientOrder = () => {
    selectedIngredientsListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.alert("Ingredient order reset to default.");
    }
  };

  const handleSaveSelectedIngredientOrder = () => {
    if (typeof window !== "undefined") {
      window.alert("Ingredient order saved.");
    }
  };

  const selectedIngredientEntries = useMemo(() => {
    const selectedEntries = Object.entries(selectedIngredientItems);

    if (!isChipotleBuildPage) {
      return selectedEntries;
    }

    const categoryPriority = new Map(
      CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_ORDER.map((category, index) => [category, index] as const)
    );
    const ingredientIndexById = new Map(
      ingredientMenuItems.map((ingredient, index) => [ingredient.id ?? `${index}`, index] as const)
    );

    return [...selectedEntries].sort(([leftId, leftIngredient], [rightId, rightIngredient]) => {
      const leftCategory = normalizeIngredientCategory(leftIngredient.item.categories?.[0]);
      const rightCategory = normalizeIngredientCategory(rightIngredient.item.categories?.[0]);
      const leftCategoryPriority = categoryPriority.get(leftCategory) ?? Number.POSITIVE_INFINITY;
      const rightCategoryPriority = categoryPriority.get(rightCategory) ?? Number.POSITIVE_INFINITY;

      if (leftCategoryPriority !== rightCategoryPriority) {
        return leftCategoryPriority - rightCategoryPriority;
      }

      const leftIngredientIndex = ingredientIndexById.get(leftId) ?? Number.POSITIVE_INFINITY;
      const rightIngredientIndex = ingredientIndexById.get(rightId) ?? Number.POSITIVE_INFINITY;

      if (leftIngredientIndex !== rightIngredientIndex) {
        return leftIngredientIndex - rightIngredientIndex;
      }

      return leftIngredient.item.name.localeCompare(rightIngredient.item.name);
    });
  }, [ingredientMenuItems, isChipotleBuildPage, selectedIngredientItems]);
  const selectedProteinCount = selectedIngredientEntries.reduce((total, [, selectedIngredient]) => {
    return total + (isProteinIngredientItem(selectedIngredient.item) ? 1 : 0);
  }, 0);
  const proteinBadgeLabel =
    selectedProteinCount > 0 ? getProteinBadgeLabel(proteinPortionMode, selectedProteinCount) : undefined;
  const ingredientPortionLabelById = (() => {
    const labelById: Record<string, string> = {};

    Object.entries(selectedIngredientItems).forEach(([ingredientId, selectedIngredient]) => {
      if (isProteinIngredientItem(selectedIngredient.item)) {
        if (proteinBadgeLabel) {
          labelById[ingredientId] = proteinBadgeLabel;
        }
        return;
      }

      const category = normalizeIngredientCategory(selectedIngredient.item.categories?.[0]);
      if (category !== "rice" && category !== "beans") {
        return;
      }

      const selectedSplitIds = Object.entries(selectedIngredientItems)
        .filter(
          ([, splitSelectedIngredient]) =>
            normalizeIngredientCategory(splitSelectedIngredient.item.categories?.[0]) === category
        )
        .map(([id]) => id);

      if (selectedSplitIds.length >= 2) {
        labelById[ingredientId] = "1/2x";
        return;
      }

      const portionMode = splitPortionModeById[ingredientId] ?? "normal";
      labelById[ingredientId] = getSplitPortionLabel(selectedIngredient.item, portionMode);
    });

    return labelById;
  })();
  const unavailableIngredientIds = useMemo(() => {
    if (!isChipotleBuildPage || !selectedEntree) {
      return new Set<string>();
    }

    const selectedCategoryQuantities = Object.values(selectedIngredientItems).reduce<Record<string, number>>(
      (acc, selectedIngredient) => {
        const category = normalizeIngredientCategory(
          selectedIngredient.item.categories[0]
        );
        if (!category) return acc;
        acc[category] = (acc[category] ?? 0) + selectedIngredient.quantity;
        return acc;
      },
      {}
    );

    const unavailableIds = new Set<string>();
    visibleMenuItems.forEach((item) => {
      const itemId = item.id;
      if (!itemId) return;
      if (itemId in selectedIngredientItems) return;
      if (lockedIngredientIds.has(itemId)) return;

      const category = normalizeIngredientCategory(item.categories[0]);
      const categoryCap = category ? CHIPOTLE_CATEGORY_MAX_SELECTIONS[category] : undefined;
      if (typeof categoryCap !== "number") return;

      if ((selectedCategoryQuantities[category] ?? 0) >= categoryCap) {
        unavailableIds.add(itemId);
      }
    });

    return unavailableIds;
  }, [
    isChipotleBuildPage,
    lockedIngredientIds,
    selectedEntree,
    selectedIngredientItems,
    visibleMenuItems,
  ]);

  const unavailableIngredientReasonById = useMemo(
    () =>
      Object.fromEntries(
        Array.from(unavailableIngredientIds).map((ingredientId) => [ingredientId, "Category max reached"])
      ),
    [unavailableIngredientIds]
  );

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

  useEffect(() => {
    if (!isEntreeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (entreeMenuRef.current?.contains(target)) return;
      setIsEntreeMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isEntreeMenuOpen]);

  const entreeSelectionControl =
    isChipotleBuildPage && selectedEntree !== null ? (
      <div ref={entreeMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setIsEntreeMenuOpen((prev) => !prev)}
          className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-black/20 bg-white px-[14px] py-[6px] font-semibold text-black/85"
          aria-haspopup="menu"
          aria-expanded={isEntreeMenuOpen}
        >
          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
            <Image
              src={CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].imageSrc}
              alt={CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].label}
              fill
              className="object-cover"
            />
          </span>
          {CHIPOTLE_ENTREE_CONFIGURATIONS[selectedEntree].label}
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {isEntreeMenuOpen ? (
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+8px)] z-20 w-[260px] rounded-[14px] border border-black/15 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)]"
          >
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedEntree(null);
                  setIsEntreeMenuOpen(false);
                }}
                className="cursor-pointer inline-flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 hover:bg-slate-900/5"
              >
                <UtensilsCrossed className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span>Choose entrée</span>
              </button>
              {(Object.entries(CHIPOTLE_ENTREE_CONFIGURATIONS) as [Exclude<EntreeSelection, null>, EntreeConfiguration][]).map(([entreeKey, entree]) => {
                const isActive = entreeKey === selectedEntree;
                return (
                  <button
                    key={entreeKey}
                    type="button"
                    onClick={() => {
                      handleEntreeSelection(entreeKey);
                      setIsEntreeMenuOpen(false);
                    }}
                    className={`cursor-pointer inline-flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-left font-semibold text-black/88 transition-colors duration-100 ${
                      isActive ? "bg-black/10" : "hover:bg-slate-900/5"
                    }`}
                  >
                    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                      <Image
                        src={entree.imageSrc}
                        alt={entree.label}
                        fill
                        className="object-cover"
                      />
                    </span>
                    <span>{entree.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div>
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
        secondaryNavLeading={entreeSelectionControl}
        hideViewSelector={isBuildYourOwn}
        hideSecondaryNav={isChipotleBuildPage && selectedEntree === null}
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
                unavailableIngredientIds={unavailableIngredientIds}
                unavailableIngredientReasonById={unavailableIngredientReasonById}
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
                  (() => {
                    const variantOptionsById = Object.fromEntries(
                      visibleMenuItems
                        .filter(
                          (item) =>
                            item.id &&
                            item.variants &&
                            item.variants.length > 1 &&
                            !isProteinIngredientItem(item)
                        )
                        .map((item) => [
                          item.id as string,
                          item.variants!.map((variant) => ({ id: variant.id, label: variant.label })),
                        ])
                    );

                    if (selectedEntree === "tacos") {
                      tacoShellIngredientIds.forEach((ingredientId) => {
                        variantOptionsById[ingredientId] = [
                          { id: "3", label: "3 Tacos" },
                          { id: "1", label: "1 Taco" },
                        ];
                      });
                    }

                    return Object.keys(variantOptionsById).length > 0 ? variantOptionsById : undefined;
                  })()
                }
                selectedIngredientVariantIdById={
                  (() => {
                    const selectedById = Object.fromEntries(
                      visibleMenuItems
                        .filter(
                          (item) =>
                            item.id &&
                            item.variants &&
                            item.variants.length > 1 &&
                            !isProteinIngredientItem(item)
                        )
                        .map((item) => [
                          item.id as string,
                          selectedIngredientVariantIds[item.id as string] ??
                            item.defaultVariantId ??
                            item.variants?.[0]?.id,
                        ])
                    );

                    if (selectedEntree === "tacos") {
                      tacoShellIngredientIds.forEach((ingredientId) => {
                        selectedById[ingredientId] = String(selectedTacoCount);
                      });
                    }

                    return Object.keys(selectedById).length > 0 ? selectedById : undefined;
                  })()
                }
                ingredientPortionBadgeById={
                  Object.keys(ingredientPortionLabelById).length > 0 ? ingredientPortionLabelById : undefined
                }
                ingredientPortionModeOptionsById={
                  (() => {
                    const optionsById: Record<
                      string,
                      Array<{ id: string; label: string; disabled?: boolean }>
                    > = Object.fromEntries(
                      visibleMenuItems
                        .filter((item) => item.id && isProteinIngredientItem(item))
                        .map((item) => [
                          item.id as string,
                          [
                            { id: "normal", label: "Normal" },
                            { id: "double", label: "Double" },
                          ],
                        ])
                    );

                    (["rice", "beans"] as const).forEach((splitCategory) => {
                      const selectedSplitCount = Object.values(selectedIngredientItems).filter(
                        (selectedIngredient) =>
                          normalizeIngredientCategory(selectedIngredient.item.categories?.[0]) === splitCategory
                      ).length;
                      const splitModeOptions =
                        selectedSplitCount === 2
                          ? [
                              { id: "light", label: "Light", disabled: true },
                              { id: "normal", label: "Normal", disabled: true },
                              { id: "extra", label: "Extra", disabled: true },
                            ]
                          : [
                              { id: "light", label: "Light" },
                              { id: "normal", label: "Normal" },
                              { id: "extra", label: "Extra" },
                            ];
                      visibleMenuItems
                        .filter(
                          (item) =>
                            item.id &&
                            normalizeIngredientCategory(item.categories?.[0]) === splitCategory
                        )
                        .forEach((item) => {
                          optionsById[item.id as string] = splitModeOptions;
                        });
                    });

                    return Object.keys(optionsById).length > 0 ? optionsById : undefined;
                  })()
                }
                selectedIngredientPortionModeIdById={
                  (() => {
                    const selectedModeById: Record<string, string> = Object.fromEntries(
                      visibleMenuItems
                        .filter((item) => item.id && isProteinIngredientItem(item))
                        .map((item) => [item.id as string, proteinPortionMode])
                    );
                    (["rice", "beans"] as const).forEach((splitCategory) => {
                      const selectedSplitIds = Object.entries(selectedIngredientItems)
                        .filter(
                          ([, selectedIngredient]) =>
                            normalizeIngredientCategory(selectedIngredient.item.categories?.[0]) === splitCategory
                        )
                        .map(([ingredientId]) => ingredientId);
                      const isSplitSelection = selectedSplitIds.length === 2;

                      visibleMenuItems
                        .filter(
                          (item) =>
                            item.id &&
                            normalizeIngredientCategory(item.categories?.[0]) === splitCategory
                        )
                        .forEach((item) => {
                          const itemId = item.id as string;
                          selectedModeById[itemId] = isSplitSelection
                            ? "normal"
                            : (splitPortionModeById[itemId] ?? "normal");
                        });
                    });

                    return Object.keys(selectedModeById).length > 0 ? selectedModeById : undefined;
                  })()
                }
                onIngredientPortionModeChange={(item, modeId) => {
                  if (isProteinIngredientItem(item)) {
                    if (modeId !== "normal" && modeId !== "double") return;
                    setSelectedIngredientItems((previous) =>
                      applyIngredientPortionNutrition(previous, { proteinMode: modeId })
                    );
                    setProteinPortionMode(modeId);
                    return;
                  }

                  if (!isSplitPortionIngredientItem(item) || !item.id) return;
                  if (modeId !== "light" && modeId !== "normal" && modeId !== "extra") return;

                  const splitCategory = normalizeIngredientCategory(item.categories?.[0]);
                  const selectedSplitCount = Object.values(selectedIngredientItems).filter(
                    (selectedIngredient) =>
                      normalizeIngredientCategory(selectedIngredient.item.categories?.[0]) === splitCategory
                  ).length;
                  if (selectedSplitCount >= 2) return;

                  const nextSplitModesById: Record<string, SplitPortionMode> = {
                    ...splitPortionModeById,
                    [item.id]: modeId,
                  };
                  setSplitPortionModeById(nextSplitModesById);
                  setSelectedIngredientItems((previous) =>
                    applyIngredientPortionNutrition(previous, {
                      splitModesById: nextSplitModesById,
                    })
                  );
                }}
                onIngredientVariantChange={
                  (item, variantId) => {
                    if (selectedEntree === "tacos" && item.id && tacoShellIngredientIds.includes(item.id)) {
                      setSelectedTacoCount(variantId === "1" ? 1 : 3);
                      return;
                    }

                    const itemId = item.id;
                    if (!itemId) return;

                    setSelectedIngredientVariantIds((prev) => ({ ...prev, [itemId]: variantId }));
                    setSelectedIngredientItems((prev) => {
                      const selectedIngredient = prev[itemId];
                      if (!selectedIngredient) return prev;

                      const nextVariantNutrition =
                        item.variants?.find((variant) => variant.id === variantId)?.nutrition ??
                        selectedIngredient.item.nutrition;

                      return {
                        ...prev,
                        [itemId]: {
                          ...selectedIngredient,
                          item: {
                            ...selectedIngredient.item,
                            nutrition: nextVariantNutrition,
                          },
                        },
                      };
                    });
                  }
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
            primaryActionLabel={isEditingBuild ? "Save & Add" : "Add to Cart"}
            SecondaryActionIcon={ChevronDown}
            SecondaryActionExpandedIcon={ChevronUp}
            PrimaryActionIcon={ShoppingCart}
            detailsOpen={isBuildSummaryExpanded}
            detailsContent={
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleResetSelectedIngredientOrder}
                    className="rounded-full border border-black/20 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset Order
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSelectedIngredientOrder}
                    className="rounded-full border border-transparent bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-slate-800"
                  >
                    Save Order
                  </button>
                </div>

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
                  <ul
                    ref={selectedIngredientsListRef}
                    className="mt-4 grid max-h-[300px] gap-2 overflow-y-auto rounded-xl bg-[#efefef] p-2"
                  >
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
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              {CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_LABELS[
                                normalizeIngredientCategory(selectedIngredient.item.categories?.[0])
                              ] ?? "Ingredient"}
                            </p>
                            <span className="truncate text-sm font-medium text-slate-900">
                              {selectedIngredient.item.name}
                              {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
                              {ingredientPortionLabelById[ingredientId]
                                ? ` · ${ingredientPortionLabelById[ingredientId]}`
                                : ""}
                            </span>
                          </div>
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
