"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Bean,
  Beef,
  CakeSlice,
  ChevronDown,
  CircleDashed,
  CupSoda,
  Egg,
  EggFried,
  Expand,
  Diamond,
  Droplets,
  Drumstick,
  Ham,
  IceCreamCone,
  SquareUser,
  LeafyGreen,
  Pin,
  Salad,
  Sandwich,
  Shell,
  SquarePlus,
  Sprout,
  Soup,
  Torus,
  Tractor,
  Triangle,
  ToggleLeft,
  Cylinder,
  Shrink,
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
  RestaurantBuilderConfig,
  RestaurantCustomizationRules,
} from "@/types/menu";
import {
  type Filters,
  type ViewOption,
} from "./ControlsRow";
import {
  RANKING_DEFAULT_SORT,
  SORT_OPTION_VALUES,
  isDefaultOrderSort,
  type SortOption,
} from "@/lib/menuSections/sortOptions";
import {
  categorySectionId,
  getCategoryLabel,
  getOrderedMenuSections,
} from "@/lib/menuSections/sorting";
import MenuSections from "./MenuSections";
import StickyRestaurantBar from "./StickyRestaurantBar";
import StickyMacroTotalsBar from "./StickyMacroTotalsBar";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import { useCart, type CartItem } from "@/stores/cartStore";
import BuildSummaryDrawer from "./restaurant-view/BuildSummaryDrawer";
import EntreeSelectionHero from "./restaurant-view/EntreeSelectionHero";
import KidsMealSelector from "./restaurant-view/KidsMealSelector";
import RestaurantCategorySidebar from "./restaurant-view/RestaurantCategorySidebar";
import {
  type ChipotleEntreeSelection,
  type ChipotleKidsMealId,
  type ChipotleTacoCount,
  type ChipotleTacoShell,
  type IncludedIngredientContext,
  type ProteinPortionMode,
  type SplitPortionMode,
  getAllKnownIncludedIngredientIds,
  getIngredientCategoryMaxSelections,
  getProteinBadgeLabel,
  getProteinMultiplier,
  getSplitExtraMultiplier,
  getSplitPortionLabel,
  isChipotleEntreeId,
  isQuesadillaCheeseSelection,
  normalizeIngredientCategory,
  resolveIncludedIngredientIds,
  scaleNutritionValues,
} from "@/lib/chipotleBuild";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sandwiches: Sandwich,
  "sandwich toppings": LeafyGreen,
  toppings: LeafyGreen,
  chicken: Drumstick,
  proteins: Drumstick,
  rice: Sprout,
  beans: Bean,
  "included ingredient": Pin,
  "included ingredients": Pin,
  "breakfast protein": Drumstick,
  condiments: Utensils,
  "salad condiments": Utensils,
  salads: Salad,
  "salad toppings": Salad,
  drinks: CupSoda,
  "fountain drinks": CupSoda,
  "tractor beverages": Tractor,
  "kids drinks": SquareUser,
  breakfast: EggFried,
  "breakfast side": Torus,
  "breakfast sides": Torus,
  kids: SquareUser,
  sides: SquarePlus,
  side: CircleDashed,
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
  "chips & dips": Triangle,
  "single sides": Cylinder,
  "protein meals": UtensilsCrossed,
  "protein cups": Ham,
  treats: IceCreamCone,
};


type EntreeSelection = ChipotleEntreeSelection;
type KidsMealSelection = ChipotleKidsMealId;
type TacoShellSelection = ChipotleTacoShell;
type TacoCountSelection = ChipotleTacoCount;
type BuildConfigurationSnapshot = NonNullable<CartItem["buildConfiguration"]>;

function titleCase(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function isProteinIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === "proteins";
}

function isRiceIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === "rice";
}

function isBeanIngredientItem(item: Pick<MenuItem, "categories">) {
  return normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === "beans";
}

function isSplitPortionIngredientItem(item: Pick<MenuItem, "categories">) {
  return isRiceIngredientItem(item) || isBeanIngredientItem(item);
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
  builderConfig,
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
  builderConfig?: RestaurantBuilderConfig;
}) {
  const isChipotleBuildPage = isBuildYourOwn && restaurantId === "chipotle";
  const chipotleBuilderConfig = useMemo(
    () => (isChipotleBuildPage ? builderConfig : undefined),
    [isChipotleBuildPage, builderConfig]
  );
  const entreeOptions = useMemo(
    () => chipotleBuilderConfig?.entreeOptions ?? {},
    [chipotleBuilderConfig]
  );
  const kidsMealOptions = useMemo(
    () => chipotleBuilderConfig?.kidsMealOptions ?? [],
    [chipotleBuilderConfig]
  );
  const tacoShellIngredientIds = useMemo(
    () => chipotleBuilderConfig?.includedIngredientRules?.tacoShellIngredientIds ?? [],
    [chipotleBuilderConfig]
  );
  const kidsBuildYourOwnDoubleSideIds = useMemo(
    () => new Set(chipotleBuilderConfig?.includedIngredientRules?.kidsBuildYourOwnDoubleSideIds ?? []),
    [chipotleBuilderConfig]
  );
  const kidsQuesadillaIncludedIngredientIds = useMemo(
    () => chipotleBuilderConfig?.includedIngredientRules?.kidsQuesadillaIncludedIngredientIds ?? [],
    [chipotleBuilderConfig]
  );
  const quesadillaTripleCheeseVariantId = useMemo(
    () => chipotleBuilderConfig?.specialVariantIds?.quesadillaTripleCheese ?? "quesadilla-triple-cheese",
    [chipotleBuilderConfig]
  );
  const SECTION_HEADER_TOP_GAP = 24;

  const getStickyOffset = () => {
    const stickyBar = document.querySelector('[data-sticky-nav="true"]');
    const mobileCategoryNav = document.querySelector('[data-mobile-category-nav="true"]');
    const stickyBottom = stickyBar instanceof HTMLElement
      ? Math.max(0, stickyBar.getBoundingClientRect().bottom)
      : 0;
    const mobileCategoryBottom = mobileCategoryNav instanceof HTMLElement
      ? Math.max(0, mobileCategoryNav.getBoundingClientRect().bottom)
      : 0;

    return Math.max(stickyBottom, mobileCategoryBottom);
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editOrigin = searchParams.get("editOrigin");
  const isEditingFromCart = editOrigin === "cart";
  const requestedView = searchParams.get("view");
  const defaultView: ViewOption = isBuildYourOwn ? "ingredients" : "menu";
  const viewMode: ViewOption =
    requestedView === "ingredients"
      ? "ingredients"
      : requestedView === "ranking"
        ? "ranking"
        : defaultView;
  const [sort, setSort] = useState<SortOption>(() =>
    viewMode === "ranking" ? RANKING_DEFAULT_SORT : SORT_OPTION_VALUES.DEFAULT_ORDER
  );
  const [filters, setFilters] = useState<Filters>({});
  type RankedAllFilterKey = "main-entrees" | "breakfast" | "shareables" | "sides" | "drinks";
  const [rankedAllFilters, setRankedAllFilters] = useState<
    Record<RankedAllFilterKey, boolean>
  >({
    "main-entrees": true,
    breakfast: false,
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
  const buildCustomizationModalScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingBuildCustomizationResetRef = useRef<
    | { type: "none" }
    | {
        type: "included";
        context: IncludedIngredientContext;
      }
    | { type: "empty" }
  >({ type: "none" });
  const entreeMenuRef = useRef<HTMLDivElement | null>(null);
  const requestedEntree = searchParams.get("entree");
  const initialSelectedEntree: EntreeSelection =
    isChipotleBuildPage && requestedEntree && isChipotleEntreeId(requestedEntree) && requestedEntree in entreeOptions
      ? requestedEntree
      : null;
  const [selectedEntree, setSelectedEntree] = useState<EntreeSelection>(initialSelectedEntree);
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
  const selectedEntreeConfig = selectedEntree ? entreeOptions[selectedEntree] : null;
  const selectedEntreeNutritionMultiplier = selectedEntreeConfig?.nutritionMultiplier ?? 1;
  const tacoServingMultiplier = selectedEntree === "tacos" ? selectedTacoCount : 1;
  const servingMultiplier =
    selectedEntree === "tacos" ? selectedEntreeNutritionMultiplier : tacoServingMultiplier * selectedEntreeNutritionMultiplier;
  const ingredientDisplayMultiplier = selectedEntreeNutritionMultiplier;
  const tacoBaseServingCount = 3;
  const tacoSharedIngredientMultiplier =
    selectedEntree === "tacos" ? selectedTacoCount / tacoBaseServingCount : 1;
  const getIngredientNutritionMultiplier = useCallback(
    (ingredientId?: string) => {
      if (!ingredientId) return ingredientDisplayMultiplier;
      if (selectedEntree !== "tacos") return ingredientDisplayMultiplier;
      return ingredientDisplayMultiplier * (tacoShellIngredientIds.includes(ingredientId) ? selectedTacoCount : tacoSharedIngredientMultiplier);
    },
    [
      ingredientDisplayMultiplier,
      selectedEntree,
      selectedTacoCount,
      tacoSharedIngredientMultiplier,
      tacoShellIngredientIds,
    ]
  );
  const selectedProteinCountForPortioning = useMemo(
    () =>
      Object.values(selectedIngredientItems).filter((selectedIngredient) =>
        isProteinIngredientItem(selectedIngredient.item)
      ).length,
    [selectedIngredientItems]
  );
  const selectedSplitIngredientIdsByCategory = useMemo(
    () =>
      Object.entries(selectedIngredientItems).reduce<Record<"rice" | "beans", string[]>>(
        (acc, [ingredientId, selectedIngredient]) => {
          const category = normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories));
          if (category === "rice" || category === "beans") {
            acc[category].push(ingredientId);
          }
          return acc;
        },
        { rice: [], beans: [] }
      ),
    [selectedIngredientItems]
  );
  const getSelectedIngredientPortionMultiplier = useCallback(
    (ingredientId: string, category: string) => {
      if (!(ingredientId in selectedIngredientItems)) {
        return 1;
      }

      if (category === "proteins") {
        return getProteinMultiplier(proteinPortionMode, selectedProteinCountForPortioning);
      }

      if (category === "rice" || category === "beans") {
        const selectedSplitIds = selectedSplitIngredientIdsByCategory[category];
        if (selectedSplitIds.length >= 2) {
          return 0.5;
        }
        const portionMode = splitPortionModeById[ingredientId] ?? "normal";
        return portionMode === "light" ? 0.5 : portionMode === "extra" ? getSplitExtraMultiplier() : 1;
      }

      return 1;
    },
    [
      proteinPortionMode,
      selectedIngredientItems,
      selectedProteinCountForPortioning,
      selectedSplitIngredientIdsByCategory,
      splitPortionModeById,
    ]
  );
  const selectedIncludedIngredientIds = useMemo(
    () =>
      resolveIncludedIngredientIds({
        selectedEntree,
        selectedKidsMeal,
        selectedTacoShell,
        builderConfig: chipotleBuilderConfig,
      }),
    [selectedEntree, selectedKidsMeal, selectedTacoShell, chipotleBuilderConfig]
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
          item.buildConfiguration
      ) ?? null
    );
  }, [cartItems, editCartItemId, isChipotleBuildPage, restaurantId]);
  const isEditingBuild = Boolean(editingCartItem);
  const hydratedEditItemIdRef = useRef<string | null>(null);
  const editingBuildBaselineConfigRef = useRef<BuildConfigurationSnapshot | null>(null);

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
            totalFat: option.totalFat,
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
    const normalizeIngredientCategories = (ingredient: IngredientItem) => {
      const normalizedCategories =
        ingredient.categories?.map((category) => category.trim()).filter(Boolean) ?? [];
      if (normalizedCategories.length > 0) {
        return normalizedCategories;
      }

      const normalizedLegacyCategory = ingredient.category?.trim();
      return normalizedLegacyCategory ? [normalizedLegacyCategory] : ["Other"];
    };

    const resolveIngredientCategory = (ingredient: IngredientItem) => {
      const categories = normalizeIngredientCategories(ingredient);
      return categories.find((category) => category.toLowerCase() !== "ingredients") ?? categories[0];
    };

    const includedIngredientOrderById = new Map(
      selectedIncludedIngredientIds.map((ingredientId, index) => [ingredientId, index] as const)
    );

    const mappedIngredientItems = ingredients
      .filter((ingredient) => {
        if (ingredient.hideFromIngredientView) {
          return false;
        }

        const shouldHideFromKidsBuildYourOwn =
          selectedEntree === "kids-meal" &&
          selectedKidsMeal === "build-your-own" &&
          ingredient.id === "tortilla";
        if (shouldHideFromKidsBuildYourOwn) {
          return false;
        }

        const shouldHideTortillaSideForEntree =
          ingredient.id === "tortilla" &&
          (selectedEntree === "salad" || selectedEntree === "tacos");
        if (shouldHideTortillaSideForEntree) {
          return false;
        }

        const isTacoShellIngredient = ingredient.id
          ? tacoShellIngredientIds.includes(ingredient.id)
          : false;
        const isKidsBuildYourOwnTacoShellOption =
          isTacoShellIngredient &&
          selectedEntree === "kids-meal" &&
          selectedKidsMeal === "build-your-own";
        const isIncludedForCurrentBuild = ingredient.id
          ? selectedIncludedIngredientIds.includes(ingredient.id)
          : false;
        if (
          isTacoShellIngredient &&
          selectedEntree !== "tacos" &&
          !isKidsBuildYourOwnTacoShellOption &&
          !isIncludedForCurrentBuild
        ) {
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
        const includedIngredientOrder = includedIngredientOrderById.get(ingredientId);
        const isQuesadillaCheeseIncludedIngredient =
          ingredientId === "cheese" &&
          shouldPinToIncludedCategory &&
          selectedEntree === "quesadilla";
        const hasCustomVariants = Boolean(ingredient.variants?.length);
        const kidsBuildYourOwnDoubleSideMultiplier =
          selectedEntree === "kids-meal" &&
          selectedKidsMeal === "build-your-own" &&
          ingredient.id &&
          kidsBuildYourOwnDoubleSideIds.has(ingredient.id)
            ? 2
            : 1;
        const ingredientPortionMultiplier = getSelectedIngredientPortionMultiplier(
          ingredientId,
          normalizeIngredientCategory(resolvedCategory)
        );
        const ingredientBaseNutrition = scaleNutritionValues(
          ingredient.nutrition,
          getIngredientNutritionMultiplier(ingredient.id) *
            kidsBuildYourOwnDoubleSideMultiplier *
            ingredientPortionMultiplier
        );
        const variants = hasCustomVariants
          ? ingredient.variants?.map((variant) => ({
              ...variant,
              nutrition: scaleNutritionValues(
                variant.nutrition,
                getIngredientNutritionMultiplier(ingredient.id) * ingredientPortionMultiplier
              ),
            }))
          : undefined;
        const tripleCheeseVariant = isQuesadillaCheeseIncludedIngredient
          ? {
              id: quesadillaTripleCheeseVariantId,
              label: "",
              nutrition: scaleNutritionValues(ingredientBaseNutrition, 3),
            }
          : null;
        const defaultVariantId = tripleCheeseVariant
          ? quesadillaTripleCheeseVariantId
          : ingredient.defaultVariantId;

        const menuItem: MenuItem = {
          id: ingredientId,
          name: ingredient.name,
          nutrition: ingredientBaseNutrition,
          defaultOrder:
            shouldPinToIncludedCategory &&
            selectedEntree !== "tacos" &&
            typeof includedIngredientOrder === "number"
              ? includedIngredientOrder
              : ingredient.defaultOrder,
          variants: tripleCheeseVariant ? [...(variants ?? []), tripleCheeseVariant] : variants,
          defaultVariantId,
          hideVariantSelector:
            ingredient.hideVariantSelector || isQuesadillaCheeseIncludedIngredient,
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
    getIngredientNutritionMultiplier,
    ingredients,
    restaurantId,
    selectedEntree,
    selectedKidsMeal,
    selectedIncludedIngredientIds,
    tacoShellIngredientIds,
    kidsBuildYourOwnDoubleSideIds,
    getSelectedIngredientPortionMultiplier,
    quesadillaTripleCheeseVariantId,
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
    if (isChipotleBuildPage && selectedEntree === "chips-sides") {
      return baseItems.filter(
        (item) =>
          item.entreeGroup === "chips-sides" ||
          item.entreeGroup === "high-protein-menu"
      );
    }

    if (
      isChipotleBuildPage &&
      (selectedEntree === "high-protein-menu" || selectedEntree === "drinks")
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
        case "combo":
        case "kids":
        case "entree":
          return "main-entrees";
        case "breakfast":
          return "breakfast";
        case "shareable":
          return "shareables";
        case "drink":
          return "drinks";
        case "side":
          return "sides";
        case "addon":
        case "dessert":
        case undefined:
          return null;
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
      (chipotleBuilderConfig?.hiddenSectionsByEntree?.[selectedEntree] ?? []).map((section) =>
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
  }, [filteredItems, isChipotleBuildPage, selectedEntree, chipotleBuilderConfig]);

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

    if (nextView === "ranking" && isDefaultOrderSort(sort)) {
      setSort(RANKING_DEFAULT_SORT);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: true });
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSort(nextSort);
  };

  const handleKidsMealSelection = (kidsMeal: KidsMealSelection) => {
    setSelectedKidsMeal(kidsMeal);
    applyIncludedIngredientsNextFrame(
      kidsMeal === "quesadilla" ? kidsQuesadillaIncludedIngredientIds : [],
      {
        selectedEntree: "kids-meal",
        selectedKidsMeal: kidsMeal,
      }
    );
  };

  const selectedIngredientTotals = useMemo(
    () =>
      Object.entries(selectedIngredientItems).reduce(
        (acc, [ingredientId, selectedIngredient]) => {
          const baseIngredient = ingredientItemsById.get(ingredientId) ?? selectedIngredient.item;
          const selectedVariantId =
            selectedIngredientVariantIds[ingredientId] ?? baseIngredient.defaultVariantId;
          const selectedVariant = baseIngredient.variants?.find(
            (variant) => variant.id === selectedVariantId
          );
          const nutrition = selectedVariant?.nutrition ?? baseIngredient.nutrition;

          return {
            calories: acc.calories + (nutrition.calories ?? 0) * selectedIngredient.quantity,
            protein: acc.protein + (nutrition.protein ?? 0) * selectedIngredient.quantity,
            carbs: acc.carbs + (nutrition.carbs ?? 0) * selectedIngredient.quantity,
            totalFat: acc.totalFat + (nutrition.totalFat ?? 0) * selectedIngredient.quantity,
          };
        },
        { calories: 0, protein: 0, carbs: 0, totalFat: 0 }
      ),
    [ingredientItemsById, selectedIngredientItems, selectedIngredientVariantIds]
  );
  const adjustedSelectedIngredientTotals = useMemo(
    () => {
      const scaledCalories = selectedIngredientTotals.calories * servingMultiplier;
      const shouldRoundKidsQuesadillaCalories =
        selectedEntree === "kids-meal" && selectedKidsMeal === "quesadilla";

      return {
        calories: shouldRoundKidsQuesadillaCalories
          ? Math.round(scaledCalories / 10) * 10
          : Math.round(scaledCalories),
        protein: Math.round(selectedIngredientTotals.protein * servingMultiplier),
        carbs: Math.round(selectedIngredientTotals.carbs * servingMultiplier),
        totalFat: Math.round(selectedIngredientTotals.totalFat * servingMultiplier),
      };
    },
    [selectedEntree, selectedIngredientTotals, selectedKidsMeal, servingMultiplier]
  );

  const selectedNutritionLabelTotals = useMemo(
    () =>
      Object.entries(selectedIngredientItems).reduce(
        (acc, [ingredientId, selectedIngredient]) => {
          const baseIngredient = ingredientItemsById.get(ingredientId) ?? selectedIngredient.item;
          const selectedVariantId =
            selectedIngredientVariantIds[ingredientId] ?? baseIngredient.defaultVariantId;
          const selectedVariant = baseIngredient.variants?.find(
            (variant) => variant.id === selectedVariantId
          );
          const nutrition = selectedVariant?.nutrition ?? baseIngredient.nutrition;
          const { quantity } = selectedIngredient;
          return {
            calories: acc.calories + (nutrition.calories ?? 0) * quantity,
            totalFat: acc.totalFat + (nutrition.totalFat ?? 0) * quantity,
            satFat: acc.satFat + (nutrition.satFat ?? 0) * quantity,
            transFat: acc.transFat + (nutrition.transFat ?? 0) * quantity,
            cholesterol: acc.cholesterol + (nutrition.cholesterol ?? 0) * quantity,
            sodium: acc.sodium + (nutrition.sodium ?? 0) * quantity,
            carbs: acc.carbs + (nutrition.carbs ?? 0) * quantity,
            fiber: acc.fiber + (nutrition.fiber ?? 0) * quantity,
            sugars: acc.sugars + (nutrition.sugars ?? 0) * quantity,
            protein: acc.protein + (nutrition.protein ?? 0) * quantity,
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
    [ingredientItemsById, selectedIngredientItems, selectedIngredientVariantIds]
  );
  const adjustedNutritionLabelTotals = useMemo(
    () => {
      const scaledCalories = selectedNutritionLabelTotals.calories * servingMultiplier;
      const shouldRoundKidsQuesadillaCalories =
        selectedEntree === "kids-meal" && selectedKidsMeal === "quesadilla";

      return {
        calories: shouldRoundKidsQuesadillaCalories
          ? Math.round(scaledCalories / 10) * 10
          : Math.round(scaledCalories),
        totalFat: Math.round(selectedNutritionLabelTotals.totalFat * servingMultiplier),
        satFat: Math.round(selectedNutritionLabelTotals.satFat * servingMultiplier),
        transFat: Math.round(selectedNutritionLabelTotals.transFat * servingMultiplier),
        cholesterol: Math.round(selectedNutritionLabelTotals.cholesterol * servingMultiplier),
        sodium: Math.round(selectedNutritionLabelTotals.sodium * servingMultiplier),
        carbs: Math.round(selectedNutritionLabelTotals.carbs * servingMultiplier),
        fiber: Math.round(selectedNutritionLabelTotals.fiber * servingMultiplier),
        sugars: Math.round(selectedNutritionLabelTotals.sugars * servingMultiplier),
        protein: Math.round(selectedNutritionLabelTotals.protein * servingMultiplier),
      };
    },
    [selectedEntree, selectedKidsMeal, selectedNutritionLabelTotals, servingMultiplier]
  );

  const selectedIngredientCount = Object.values(selectedIngredientItems).reduce(
    (acc, selectedIngredient) => acc + selectedIngredient.quantity,
    0
  );
  const selectedIngredientIdsForMenu = useMemo(() => {
    const selectedIds = new Set(Object.keys(selectedIngredientItems));
    if (selectedEntree !== "tacos") {
      return selectedIds;
    }

    tacoShellIngredientIds.forEach((ingredientId) => selectedIds.delete(ingredientId));
    selectedIds.add(selectedTacoShell === "soft" ? "soft-flour-tortilla" : "crispy-corn-tortilla");
    return selectedIds;
  }, [selectedEntree, selectedIngredientItems, selectedTacoShell, tacoShellIngredientIds]);
  const selectedBuildProteinNames = useMemo(
    () =>
      Object.values(selectedIngredientItems)
        .filter(({ item }) => isProteinIngredientItem(item))
        .map(({ item }) => titleCase(item.name))
        .filter((name, index, allNames) => allNames.indexOf(name) === index),
    [selectedIngredientItems]
  );
  const selectedBuildEntreeLabel = useMemo(() => {
    if (!selectedEntree) {
      return "Bowl";
    }
    if (selectedEntree === "kids-meal") {
      return selectedKidsMeal === "quesadilla" ? "Quesadilla" : "Build Your Own";
    }
    return entreeOptions[selectedEntree]?.label ?? titleCase(selectedEntree);
  }, [selectedEntree, selectedKidsMeal, entreeOptions]);
  const selectedBuildName = useMemo(() => {
    if (selectedEntree === "kids-meal") {
      const kidsMealLabel = selectedKidsMeal === "quesadilla" ? "Quesadilla" : "Build Your Own";
      const proteinLabel =
        selectedBuildProteinNames.length === 0
          ? "Veggie"
          : selectedBuildProteinNames.length === 1
            ? selectedBuildProteinNames[0]
            : `${selectedBuildProteinNames[0]} and ${selectedBuildProteinNames[1]}`;
      return `Kid's ${proteinLabel} ${kidsMealLabel}`;
    }

    if (selectedBuildProteinNames.length === 0) {
      return `Veggie ${selectedBuildEntreeLabel}`;
    }
    if (selectedBuildProteinNames.length === 1) {
      return `${selectedBuildProteinNames[0]} ${selectedBuildEntreeLabel}`;
    }
    return `${selectedBuildProteinNames[0]} and ${selectedBuildProteinNames[1]} ${selectedBuildEntreeLabel}`;
  }, [selectedBuildEntreeLabel, selectedBuildProteinNames, selectedEntree, selectedKidsMeal]);
  const selectedBuildImageSrc = useMemo(() => {
    if (!selectedEntree) {
      return entreeOptions.bowl?.imageSrc ?? "";
    }
    if (selectedEntree === "kids-meal") {
      return (
        kidsMealOptions.find((option) => option.id === selectedKidsMeal)?.imageSrc ??
        entreeOptions["kids-meal"]?.imageSrc ?? ""
      );
    }
    return entreeOptions[selectedEntree]?.imageSrc ?? "";
  }, [selectedEntree, selectedKidsMeal, entreeOptions, kidsMealOptions]);
  const buildName = selectedBuildName;
  const shouldShowBuildStickyBar =
    isBuildYourOwn &&
    effectiveViewMode === "ingredients" &&
    (!isChipotleBuildPage ||
      (selectedEntree !== null &&
        selectedEntree !== "chips-sides" &&
        selectedEntree !== "high-protein-menu" &&
        selectedEntree !== "drinks"));
  const selectedIncludedIngredientIdSet = useMemo(
    () => new Set<string>(selectedIncludedIngredientIds),
    [selectedIncludedIngredientIds]
  );
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
              normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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
        const multiplier = mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier() : 1;
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

  const getSelectedQuantityForCategory = (
    itemsById: Record<string, { item: MenuItem; quantity: number }>,
    category: string
  ) =>
    Object.values(itemsById).reduce((total, selectedIngredient) => {
      const selectedCategory = normalizeIngredientCategory(
        resolvePrimaryCategory(selectedIngredient.item.categories)
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
      applyIncludedIngredientsNextFrame(
        entreeOptions.tacos?.includedIngredientIdsByOption?.[nextTacoShell] ?? []
      );
      return;
    }

    if (lockedIngredientIds.has(itemId)) return;

    const splitCategory = normalizeIngredientCategory(resolvePrimaryCategory(item.categories));
    const isSplitItem = isSplitPortionIngredientItem(item);
    const currentSelectedSplitIds = Object.entries(selectedIngredientItems)
      .filter(
        ([, selectedIngredient]) =>
          normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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

      const category = normalizeIngredientCategory(resolvePrimaryCategory(item.categories));
      const categoryMaxSelections = getIngredientCategoryMaxSelections({
        category,
        selectedEntree,
        selectedKidsMeal,
      });
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

  const applyIncludedIngredients = useCallback((
    nextIncludedIngredientIds: string[],
    context: IncludedIngredientContext = {
      selectedEntree,
      selectedKidsMeal,
    }
  ) => {
    const allIncludedIngredientIds = getAllKnownIncludedIngredientIds(chipotleBuilderConfig);

    setSelectedIngredientItems((previous) => {
      const next = { ...previous };

      allIncludedIngredientIds.forEach((ingredientId) => {
        if (ingredientId in next) {
          delete next[ingredientId];
        }
      });

      nextIncludedIngredientIds.forEach((includedIngredientId) => {
        const includedIngredientItem =
          ingredientItemsById.get(includedIngredientId) ??
          (() => {
            const fallbackIngredient = ingredients.find(
              (ingredient) => ingredient.id === includedIngredientId
            );
            if (!fallbackIngredient) {
              return null;
            }

            const fallbackNutrition = scaleNutritionValues(
              fallbackIngredient.nutrition,
              getIngredientNutritionMultiplier(includedIngredientId)
            );

            return {
              id: includedIngredientId,
              name: fallbackIngredient.name,
              nutrition: fallbackNutrition,
              variants: fallbackIngredient.variants?.map((variant) => ({
                ...variant,
                nutrition: scaleNutritionValues(
                  variant.nutrition,
                  getIngredientNutritionMultiplier(includedIngredientId)
                ),
              })),
              defaultVariantId: fallbackIngredient.defaultVariantId,
              hideVariantSelector: fallbackIngredient.hideVariantSelector,
              image: fallbackIngredient.image,
              categories: ["Included Ingredient"],
              portionType: "addon" as const,
            } satisfies MenuItem;
          })();
        if (!includedIngredientItem || next[includedIngredientId]) {
          return;
        }

        const useTripleCheese = isQuesadillaCheeseSelection(includedIngredientId, context);
        const defaultVariant = includedIngredientItem.variants?.find(
          (variant) => variant.id === includedIngredientItem.defaultVariantId
        );
        next[includedIngredientId] = {
          item: {
            ...includedIngredientItem,
            nutrition: useTripleCheese
              ? scaleNutritionValues(includedIngredientItem.nutrition, 3)
              : defaultVariant?.nutrition ?? includedIngredientItem.nutrition,
          },
          quantity: 1,
        };
      });

      return applyIngredientPortionNutrition(next);
    });

    setSelectedIngredientVariantIds((previous) => {
      const next = { ...previous };

      allIncludedIngredientIds.forEach((ingredientId) => {
        if (ingredientId in next) {
          delete next[ingredientId];
        }
      });

      nextIncludedIngredientIds.forEach((includedIngredientId) => {
        const includedIngredientItem =
          ingredientItemsById.get(includedIngredientId) ??
          (() => {
            const fallbackIngredient = ingredients.find(
              (ingredient) => ingredient.id === includedIngredientId
            );
            if (!fallbackIngredient) {
              return null;
            }

            return {
              id: includedIngredientId,
              name: fallbackIngredient.name,
              nutrition: scaleNutritionValues(
                fallbackIngredient.nutrition,
                getIngredientNutritionMultiplier(includedIngredientId)
              ),
              variants: fallbackIngredient.variants?.map((variant) => ({
                ...variant,
                nutrition: scaleNutritionValues(
                  variant.nutrition,
                  getIngredientNutritionMultiplier(includedIngredientId)
                ),
              })),
              defaultVariantId: fallbackIngredient.defaultVariantId,
              hideVariantSelector: fallbackIngredient.hideVariantSelector,
              image: fallbackIngredient.image,
              categories: ["Included Ingredient"],
              portionType: "addon" as const,
            } satisfies MenuItem;
          })();
        if (!includedIngredientItem) {
          return;
        }

        if (isQuesadillaCheeseSelection(includedIngredientId, context)) {
          next[includedIngredientId] = quesadillaTripleCheeseVariantId;
          return;
        }

        if (!includedIngredientItem.defaultVariantId) {
          return;
        }

        next[includedIngredientId] = includedIngredientItem.defaultVariantId;
      });

      return next;
    });
  }, [
    applyIngredientPortionNutrition,
    getIngredientNutritionMultiplier,
    ingredients,
    ingredientItemsById,
    selectedEntree,
    selectedKidsMeal,
    chipotleBuilderConfig,
    quesadillaTripleCheeseVariantId,
  ]);

  const applyIncludedIngredientsNextFrame = useCallback((
    nextIncludedIngredientIds: string[],
    context?: IncludedIngredientContext
  ) => {
    window.requestAnimationFrame(() => {
      applyIncludedIngredients(nextIncludedIngredientIds, context);
    });
  }, [applyIncludedIngredients]);

  useEffect(() => {
    if (!isChipotleBuildPage || isEditingBuild) return;

    applyIncludedIngredientsNextFrame(selectedIncludedIngredientIds, {
      selectedEntree,
      selectedKidsMeal,
    });
  }, [
    applyIncludedIngredientsNextFrame,
    isChipotleBuildPage,
    isEditingBuild,
    selectedEntree,
    selectedIncludedIngredientIds,
    selectedKidsMeal,
  ]);

  const handleEntreeSelection = (entree: Exclude<EntreeSelection, null>) => {
    const nextIncludedIngredientIds = resolveIncludedIngredientIds({
      selectedEntree: entree,
      selectedKidsMeal,
      selectedTacoShell,
    });
    setSelectedEntree(entree);
    applyIncludedIngredientsNextFrame(nextIncludedIngredientIds, {
      selectedEntree: entree,
      selectedKidsMeal,
    });

    const nextView =
      entree === "chips-sides" || entree === "high-protein-menu" || entree === "drinks"
        ? "menu"
        : "ingredients";
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("view", nextView);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  useEffect(() => {
    if (!isChipotleBuildPage) return;

    const currentParams = searchParams.toString();
    const nextParams = new URLSearchParams(currentParams);

    if (selectedEntree) {
      nextParams.set("entree", selectedEntree);
    } else {
      nextParams.delete("entree");
    }

    const nextQuery = nextParams.toString();
    if (nextQuery === currentParams) return;

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [isChipotleBuildPage, pathname, router, searchParams, selectedEntree]);

  const buildSelectedItemsFromConfiguration = useCallback((configuration: BuildConfigurationSnapshot) => {
    const next: Record<string, { item: MenuItem; quantity: number }> = {};
    const missingIngredientIds: string[] = [];

    Object.entries(configuration.selectedIngredientItems).forEach(([ingredientId, { quantity }]) => {
      if (quantity <= 0) {
        return;
      }

      const ingredient = ingredientItemsById.get(ingredientId);
      if (!ingredient) {
        missingIngredientIds.push(ingredientId);
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

    return {
      missingIngredientIds,
      selectedItems: applyIngredientPortionNutrition(next, {
        proteinMode: configuration.proteinPortionMode,
        splitModesById: configuration.splitPortionModeById,
      }),
    };
  }, [applyIngredientPortionNutrition, ingredientItemsById]);

  const handleAddBuildToCart = () => {
    if (selectedIngredientCount === 0) return;
    const nextCustomizations = Object.entries(selectedIngredientItems).flatMap(([ingredientId, { item, quantity }]) => {
      const portionLabel = ingredientPortionLabelById[ingredientId];
      const ingredientNameWithPortion = portionLabel ? `${item.name} (${portionLabel})` : item.name;
      return Array.from({ length: quantity }, () => ingredientNameWithPortion);
    });
    const nextBuildConfiguration: BuildConfigurationSnapshot = {
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
    };
    const nextItemPayload = {
      restaurantId,
      itemId: editingCartItem?.itemId ?? `${restaurantId}-build`,
      name: editingCartItem?.name && selectedEntree !== "kids-meal" ? editingCartItem.name : buildName,
      image: editingCartItem?.image ?? selectedBuildImageSrc,
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
      updateItem(editingCartItem.id, nextItemPayload, { markAsJustAdded: true });
    } else {
      addItem({
        id: crypto.randomUUID(),
        ...nextItemPayload,
      });
    }

    hydratedEditItemIdRef.current = editingCartItem ? editingCartItem.id : null;
    pendingBuildCustomizationResetRef.current = {
      type: "included",
      context: {
        selectedEntree,
        selectedKidsMeal,
        selectedTacoShell,
      },
    };
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("editCartItem");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleCloseBuildCustomizationModal = useCallback(() => {
    editingBuildBaselineConfigRef.current = null;
    pendingBuildCustomizationResetRef.current = { type: "empty" };

    if (isEditingFromCart) {
      router.replace("/cart", { scroll: false });
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("editCartItem");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [isEditingFromCart, pathname, router, searchParams]);

  useLayoutEffect(() => {
    if (!isChipotleBuildPage || !isEditingBuild) {
      return;
    }

    if (!buildCustomizationModalScrollRef.current) return;
    buildCustomizationModalScrollRef.current.scrollTop = 0;
    buildCustomizationModalScrollRef.current.scrollLeft = 0;
  }, [editingCartItem?.id, isChipotleBuildPage, isEditingBuild]);

  useEffect(() => {
    if (!isChipotleBuildPage || isEditingBuild) {
      return;
    }

    const pendingReset = pendingBuildCustomizationResetRef.current;
    if (pendingReset.type === "none") {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setIsBuildSummaryExpanded(false);
      setProteinPortionMode("normal");
      setSplitPortionModeById({});
      setSelectedIngredientVariantIds({});

      if (pendingReset.type === "empty") {
        setSelectedIngredientItems({});
        pendingBuildCustomizationResetRef.current = { type: "none" };
        return;
      }

      const nextIncludedIngredientIds = resolveIncludedIngredientIds(pendingReset.context);
      setSelectedIngredientItems(() => {
        const resetSelections: Record<string, { item: MenuItem; quantity: number }> = {};
        nextIncludedIngredientIds.forEach((ingredientId) => {
          const ingredientItem = ingredientItemsById.get(ingredientId);
          if (!ingredientItem) return;
          resetSelections[ingredientId] = { item: ingredientItem, quantity: 1 };
        });
        return applyIngredientPortionNutrition(resetSelections);
      });
      pendingBuildCustomizationResetRef.current = { type: "none" };
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
    };
  }, [
    applyIngredientPortionNutrition,
    ingredientItemsById,
    isChipotleBuildPage,
    isEditingBuild,
  ]);

  useEffect(() => {
    if (!editingCartItem?.buildConfiguration) {
      hydratedEditItemIdRef.current = null;
      editingBuildBaselineConfigRef.current = null;
      return;
    }

    if (hydratedEditItemIdRef.current === editingCartItem.id) {
      return;
    }

    const configuration = editingCartItem.buildConfiguration;
    const configuredEntree = configuration.selectedEntree;
    const isHydrationContextReady =
      selectedEntree === configuredEntree &&
      selectedTacoShell === configuration.selectedTacoShell &&
      selectedTacoCount === configuration.selectedTacoCount &&
      selectedKidsMeal === configuration.selectedKidsMeal;

    if (!isHydrationContextReady) {
      const contextTimer = window.setTimeout(() => {
        setSelectedTacoShell(configuration.selectedTacoShell);
        setSelectedTacoCount(configuration.selectedTacoCount);
        setSelectedKidsMeal(configuration.selectedKidsMeal);
        setSelectedEntree(configuredEntree);
        setProteinPortionMode(configuration.proteinPortionMode);
        setSplitPortionModeById(configuration.splitPortionModeById);
        setSelectedIngredientVariantIds(configuration.selectedIngredientVariantIds);
      }, 0);

      return () => {
        window.clearTimeout(contextTimer);
      };
    }

    const { missingIngredientIds, selectedItems } = buildSelectedItemsFromConfiguration(configuration);
    if (missingIngredientIds.length > 0) {
      return;
    }

    const hydrateTimer = window.setTimeout(() => {
      setProteinPortionMode(configuration.proteinPortionMode);
      setSplitPortionModeById(configuration.splitPortionModeById);
      setSelectedIngredientVariantIds(configuration.selectedIngredientVariantIds);
      setSelectedIngredientItems(() => selectedItems);
      editingBuildBaselineConfigRef.current = configuration;
      hydratedEditItemIdRef.current = editingCartItem.id;
    }, 0);

    return () => {
      window.clearTimeout(hydrateTimer);
    };
  }, [
    buildSelectedItemsFromConfiguration,
    editingCartItem,
    selectedEntree,
    selectedKidsMeal,
    selectedTacoCount,
    selectedTacoShell,
  ]);

  const adjustIngredientQuantity = (ingredientId: string, delta: 1 | -1) => {
    if (lockedIngredientIds.has(ingredientId)) return;

    setSelectedIngredientItems((previous) => {
      const existing = previous[ingredientId];
      if (!existing) return previous;

      const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
      const ingredientMaxQuantity = ingredient?.maxQuantity ?? 2;
      const category = normalizeIngredientCategory(resolvePrimaryCategory(existing.item.categories));
      const categoryMaxSelections = getIngredientCategoryMaxSelections({
        category,
        selectedEntree,
        selectedKidsMeal,
      });
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
    if (isEditingBuild && editingBuildBaselineConfigRef.current) {
      const baselineConfiguration = editingBuildBaselineConfigRef.current;
      setSelectedTacoShell(baselineConfiguration.selectedTacoShell);
      setSelectedTacoCount(baselineConfiguration.selectedTacoCount);
      setSelectedKidsMeal(baselineConfiguration.selectedKidsMeal);
      setSelectedEntree(baselineConfiguration.selectedEntree);
      setProteinPortionMode(baselineConfiguration.proteinPortionMode);
      setSplitPortionModeById(baselineConfiguration.splitPortionModeById);
      setSelectedIngredientVariantIds(baselineConfiguration.selectedIngredientVariantIds);
      setSelectedIngredientItems(() => buildSelectedItemsFromConfiguration(baselineConfiguration).selectedItems);
      return;
    }

    setSelectedIngredientItems(() => {
      const lockedSelections: Record<string, { item: MenuItem; quantity: number }> = {};

      lockedIngredientIds.forEach((ingredientId) => {
        const ingredientItem = ingredientItemsById.get(ingredientId);
        if (!ingredientItem) return;
        lockedSelections[ingredientId] = { item: ingredientItem, quantity: 1 };
      });

      return applyIngredientPortionNutrition(lockedSelections);
    });
    setSelectedIngredientVariantIds({});
    setProteinPortionMode("normal");
    setSplitPortionModeById({});
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

    const categoryPriority = new Map<string, number>(
      (chipotleBuilderConfig?.selectedIngredientCategoryOrder ?? []).map((category, index) => [category, index] as const)
    );
    const ingredientIndexById = new Map(
      ingredientMenuItems.map((ingredient, index) => [ingredient.id ?? `${index}`, index] as const)
    );

    return [...selectedEntries].sort(([leftId, leftIngredient], [rightId, rightIngredient]) => {
      const leftCategory = selectedIncludedIngredientIdSet.has(leftId)
        ? "included ingredient"
        : normalizeIngredientCategory(resolvePrimaryCategory(leftIngredient.item.categories));
      const rightCategory = selectedIncludedIngredientIdSet.has(rightId)
        ? "included ingredient"
        : normalizeIngredientCategory(resolvePrimaryCategory(rightIngredient.item.categories));
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
  }, [ingredientMenuItems, isChipotleBuildPage, selectedIncludedIngredientIdSet, selectedIngredientItems, chipotleBuilderConfig]);
  const groupedSelectedIngredientEntries = useMemo(() => {
    const groupedEntries: Array<{
      categoryKey: string;
      categoryLabel: string;
      entries: Array<[string, { item: MenuItem; quantity: number }]>;
    }> = [];

    selectedIngredientEntries.forEach((entry) => {
      const [ingredientId, selectedIngredient] = entry;
      const categoryKey = selectedIncludedIngredientIdSet.has(ingredientId)
        ? "included ingredient"
        : normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories));
      const existingGroup = groupedEntries.find((group) => group.categoryKey === categoryKey);
      if (existingGroup) {
        existingGroup.entries.push(entry);
        return;
      }

      groupedEntries.push({
        categoryKey,
        categoryLabel: chipotleBuilderConfig?.selectedIngredientCategoryLabels?.[categoryKey] ?? "Ingredient",
        entries: [entry],
      });
    });

    return groupedEntries;
  }, [selectedIncludedIngredientIdSet, selectedIngredientEntries, chipotleBuilderConfig]);
  const selectedProteinCount = selectedProteinCountForPortioning;
  const proteinBadgeLabel =
    selectedProteinCount > 0 ? getProteinBadgeLabel(proteinPortionMode, selectedProteinCount) : undefined;
  const ingredientPortionLabelById = (() => {
    const labelById: Record<string, string> =
      selectedEntree === "kids-meal" && selectedKidsMeal === "build-your-own"
        ? Object.fromEntries(
            Array.from(kidsBuildYourOwnDoubleSideIds).map((ingredientId) => [
              ingredientId,
              "2x",
            ])
          )
        : {};

    Object.entries(selectedIngredientItems).forEach(([ingredientId, selectedIngredient]) => {
      if (isProteinIngredientItem(selectedIngredient.item)) {
        if (proteinBadgeLabel) {
          labelById[ingredientId] = proteinBadgeLabel;
        }
        return;
      }

      const category = normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories));
      const shouldUseKidsBuildYourOwnDoubleLabel =
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own" &&
        kidsBuildYourOwnDoubleSideIds.has(ingredientId);
      if (shouldUseKidsBuildYourOwnDoubleLabel) {
        labelById[ingredientId] = "2x";
        return;
      }

      if (category !== "rice" && category !== "beans") {
        return;
      }

      const selectedSplitIds = Object.entries(selectedIngredientItems)
        .filter(
          ([, splitSelectedIngredient]) =>
            normalizeIngredientCategory(resolvePrimaryCategory(splitSelectedIngredient.item.categories)) === category
        )
        .map(([id]) => id);

      if (selectedSplitIds.length >= 2) {
        labelById[ingredientId] = "1/2x";
        return;
      }

      const portionMode = splitPortionModeById[ingredientId] ?? "normal";
      labelById[ingredientId] = getSplitPortionLabel(portionMode);
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
          resolvePrimaryCategory(selectedIngredient.item.categories)
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

      const category = normalizeIngredientCategory(resolvePrimaryCategory(item.categories));
      const categoryCap = category
        ? getIngredientCategoryMaxSelections({
            category,
            selectedEntree,
            selectedKidsMeal,
            builderConfig: chipotleBuilderConfig,
          })
        : undefined;
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
    selectedKidsMeal,
    selectedIngredientItems,
    visibleMenuItems,
    chipotleBuilderConfig,
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

  if (isChipotleBuildPage && isEditingBuild) {
    const editingBuildItem = editingCartItem;
    if (!editingBuildItem) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[130] flex items-end justify-center p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${editingBuildItem.name} customization`}>
        <button
          type="button"
          className="absolute inset-0 border-0 bg-slate-900/66"
          onClick={handleCloseBuildCustomizationModal}
          aria-label="Close build customization modal"
        />
        <div className="relative flex h-[calc(100vh-1rem)] w-full max-w-[1024px] flex-col overflow-hidden rounded-2xl bg-white px-3 pt-3 sm:h-[calc(100vh-2rem)] sm:px-5 sm:pt-5 lg:px-6 lg:pt-6">
          <button
            type="button"
            className="sticky top-0 z-20 ml-auto h-9 w-9 cursor-pointer rounded-full border border-black/12 bg-white/95 text-2xl"
            onClick={handleCloseBuildCustomizationModal}
            aria-label="Close build customization modal"
          >
            ×
          </button>

          <div ref={buildCustomizationModalScrollRef} className="min-h-0 flex-1 overflow-y-auto pb-10 pr-1 sm:pr-2 [overflow-anchor:none]">
            <div className="grid justify-items-center gap-8">
              <div className="grid justify-items-center gap-5">
                <h1 className="text-center text-2xl font-extrabold sm:text-[32px]">{editingBuildItem.name}</h1>
                <img
                  className="h-[220px] w-[220px] rounded-[14px] bg-[#efefef] object-contain p-2 shadow-[0_0_5px_rgba(0,0,0,0.25)] sm:h-[300px] sm:w-[300px]"
                  src={editingBuildItem.image}
                  alt={editingBuildItem.name}
                />
                <MacroTotalsGrid
                  macros={{
                    calories: Math.round(adjustedSelectedIngredientTotals.calories ?? 0),
                    protein: Math.round(adjustedSelectedIngredientTotals.protein ?? 0),
                    carbs: Math.round(adjustedSelectedIngredientTotals.carbs ?? 0),
                    totalFat: Math.round(adjustedSelectedIngredientTotals.totalFat ?? 0),
                  }}
                  size="panel"
                  className="w-full max-w-[560px] gap-6 sm:gap-10"
                />
              </div>

              {selectedEntree === "kids-meal" ? (
                <div className="w-full max-w-[900px]">
                  <KidsMealSelector
                    selectedKidsMeal={selectedKidsMeal}
                    onSelectKidsMeal={handleKidsMealSelection}
                    options={kidsMealOptions}
                  />
                </div>
              ) : null}

              <div className="w-full rounded-3xl border border-black/10 bg-[#e0e0e0] p-4">
                <MenuSections
                  restaurantId={restaurantId}
                  items={visibleMenuItems}
                  sort={sort}
                  addons={addons}
                  ingredients={ingredients}
                  commonChanges={commonChanges}
                  customizationRules={customizationRules}
                  groupByCategory
                  categoryMode="ingredients"
                  isBuildYourOwn={isBuildYourOwn}
                  selectedIngredientIds={selectedIngredientIdsForMenu}
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
                            normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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
                              normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === splitCategory
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
                              normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
                          )
                          .map(([ingredientId]) => ingredientId);
                        const isSplitSelection = selectedSplitIds.length === 2;

                        visibleMenuItems
                          .filter(
                            (item) =>
                              item.id &&
                              normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === splitCategory
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

                    const splitCategory = normalizeIngredientCategory(resolvePrimaryCategory(item.categories));
                    const selectedSplitCount = Object.values(selectedIngredientItems).filter(
                      (selectedIngredient) =>
                        normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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
                  onIngredientVariantChange={(item, variantId) => {
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
                  }}
                />
              </div>

              <div className="w-full rounded-3xl border border-black/10 bg-[#e0e0e0] p-4">
                <BuildSummaryDrawer
                  adjustedNutritionLabelTotals={adjustedNutritionLabelTotals}
                  selectedBuildName={editingBuildItem.name}
                  selectedIngredientCount={selectedIngredientCount}
                  groupedSelectedIngredientEntries={groupedSelectedIngredientEntries}
                  ingredientPortionLabelById={ingredientPortionLabelById}
                  lockedIngredientIds={lockedIngredientIds}
                  restaurantLogo={restaurantLogo}
                  onResetOrder={handleResetSelectedIngredientOrder}
                  onSaveOrder={handleSaveSelectedIngredientOrder}
                  onAdjustIngredientQuantity={adjustIngredientQuantity}
                  hideActionButtons
                />
              </div>
            </div>
          </div>

          <div className="-mx-3 z-10 flex flex-wrap items-center gap-3 border-t border-black/10 bg-white p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.08)] sm:-mx-5 sm:p-4 lg:-mx-6">
            <MacroTotalsGrid
              macros={{
                calories: Math.round(adjustedSelectedIngredientTotals.calories ?? 0),
                protein: Math.round(adjustedSelectedIngredientTotals.protein ?? 0),
                carbs: Math.round(adjustedSelectedIngredientTotals.carbs ?? 0),
                totalFat: Math.round(adjustedSelectedIngredientTotals.totalFat ?? 0),
              }}
              size="panel"
              className="gap-3 sm:gap-6"
              itemClassName="px-2 py-0.5"
              labelClassName="text-[#64748b]"
            />
            <div className="ml-auto flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-black/20 bg-white px-4 py-2.5 text-base font-bold text-black/80 sm:px-6"
                onClick={handleCloseBuildCustomizationModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-black/20 bg-black/90 px-4 py-2.5 text-base font-bold text-white sm:px-6"
                onClick={handleAddBuildToCart}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              src={entreeOptions[selectedEntree]?.imageSrc ?? ""}
              alt={entreeOptions[selectedEntree]?.label ?? selectedEntree}
              fill
              className="object-cover"
            />
          </span>
          {entreeOptions[selectedEntree]?.label ?? selectedEntree}
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
              {Object.entries(entreeOptions).map(([entreeKey, entree]) => {
                if (!isChipotleEntreeId(entreeKey)) {
                  return null;
                }

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

  const mobileEntreeOptions =
    isChipotleBuildPage && selectedEntree !== null
      ? (Object.entries(entreeOptions)
          .filter(([entreeKey]) => isChipotleEntreeId(entreeKey))
          .map(([entreeKey, entree]) => ({
            key: entreeKey,
            label: entree.label,
            imageSrc: entree.imageSrc,
            selected: entreeKey === selectedEntree,
            onSelect: () => handleEntreeSelection(entreeKey),
          })))
      : [];

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
        mobileEntreeOptions={mobileEntreeOptions}
        hideViewSelector={isBuildYourOwn}
        hideSecondaryNav={isChipotleBuildPage && selectedEntree === null}
      />

      {isChipotleBuildPage && selectedEntree === null ? (
        <div>
          <EntreeSelectionHero entreeOptions={entreeOptions} onSelectEntree={handleEntreeSelection} />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:gap-6 lg:[grid-template-columns:240px_minmax(0,1fr)]">
          <RestaurantCategorySidebar
            effectiveViewMode={effectiveViewMode}
            rankedAllFilters={rankedAllFilters}
            toggleRankedAllFilter={toggleRankedAllFilter}
            categoryOptions={categoryOptions}
            resolvedActiveCategory={resolvedActiveCategory}
            onCategorySelect={handleCategorySelect}
            categoryIcons={CATEGORY_ICONS}
          />

          <div className="min-w-0">
            <div className="mx-auto w-full max-w-[900px]">
              {isChipotleBuildPage && selectedEntree === "kids-meal" ? (
                <KidsMealSelector
                  selectedKidsMeal={selectedKidsMeal}
                  onSelectKidsMeal={handleKidsMealSelection}
                  options={kidsMealOptions}
                />
              ) : null}
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
                selectedIngredientIds={selectedIngredientIdsForMenu}
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
                          normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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
                            normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === splitCategory
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
                            normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
                        )
                        .map(([ingredientId]) => ingredientId);
                      const isSplitSelection = selectedSplitIds.length === 2;

                      visibleMenuItems
                        .filter(
                          (item) =>
                            item.id &&
                            normalizeIngredientCategory(resolvePrimaryCategory(item.categories)) === splitCategory
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

                  const splitCategory = normalizeIngredientCategory(resolvePrimaryCategory(item.categories));
                  const selectedSplitCount = Object.values(selectedIngredientItems).filter(
                    (selectedIngredient) =>
                      normalizeIngredientCategory(resolvePrimaryCategory(selectedIngredient.item.categories)) === splitCategory
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
            SecondaryActionIcon={Expand}
            SecondaryActionExpandedIcon={Shrink}
            PrimaryActionIcon={ShoppingCart}
            detailsOpen={isBuildSummaryExpanded}
            detailsContent={
              <BuildSummaryDrawer
                adjustedNutritionLabelTotals={adjustedNutritionLabelTotals}
                selectedBuildName={selectedBuildName}
                selectedIngredientCount={selectedIngredientCount}
                groupedSelectedIngredientEntries={groupedSelectedIngredientEntries}
                ingredientPortionLabelById={ingredientPortionLabelById}
                lockedIngredientIds={lockedIngredientIds}
                restaurantLogo={restaurantLogo}
                onResetOrder={handleResetSelectedIngredientOrder}
                onSaveOrder={handleSaveSelectedIngredientOrder}
                onAdjustIngredientQuantity={adjustIngredientQuantity}
              />
            }
            onSecondaryAction={() => setIsBuildSummaryExpanded((previous) => !previous)}
            onPrimaryAction={handleAddBuildToCart}
          />
        </div>
      ) : null}
    </div>
  );
}
