import { useState } from "react";
import Image from "next/image";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  IngredientItem,
  ItemVariant,
  MacroDelta,
  MenuItem,
  Nutrition,
  RestaurantAddons,
  RestaurantCustomizationRules,
} from "@/types/menu";
import { Check, ChevronDown, ChevronRight, Pencil, type LucideIcon } from "lucide-react";
import {
  INCLUDED_INGREDIENT_TAB,
  getIngredientTabDisplayLabel,
} from "@/lib/ingredientTabs";
import {
  normalizeIngredientCategory,
  normalizeIngredientToken,
  sortByCalories,
  formatSummaryDetail,
  toNumber,
} from "@/lib/itemDetails/helpers";
import {
  type ResolvedIngredientTab,
  type ResolvedPanelIngredient,
  resolvePanelIngredientTabs,
  resolvePanelIngredients,
} from "@/lib/itemDetails/ingredientResolution";

export {
  resolvePanelIngredients,
  resolvePanelIngredientTabs,
};
export type {
  ResolvedIngredientTab,
  ResolvedPanelIngredient,
};

function format(n?: number, suffix = "") {
  return n === undefined || n === null || Number.isNaN(n) ? `—${suffix}` : `${n}${suffix}`;
}

function formatDelta(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}

function formatPortionBadge(count: number) {
  if (count === 0.5) return "1/2x";
  if (Number.isInteger(count)) return `${count}x`;
  return `${count.toFixed(1)}x`;
}

const addonSectionTitles: Record<AddonRef, string> = {
  sauces: "Sauces",
  dressings: "Dressings",
  condiments: "Condiments",
};

function isIconImage(icon: string) {
  return icon.startsWith("/") || icon.startsWith("http://") || icon.startsWith("https://");
}

export function PortionSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  className = "mt-4",
  layout = "details",
}: {
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  className?: string;
  layout?: "top" | "details";
}) {
  if (!variants || variants.length === 0) return null;

  const isTopLayout = layout === "top";
  const wrapperClasses = isTopLayout
    ? `${className} my-3 flex flex-col items-start justify-between gap-4`
    : `${className} space-y-2`;

  return (
    <div className={wrapperClasses}>
      <div className={`${isTopLayout ? "w-full text-left text-lg font-semibold text-[rgba(0,0,0,0.8)]" : "text-base font-semibold uppercase tracking-wide text-neutral-500"}`}>
        Portion
      </div>
      <div
        className={isTopLayout ? "flex w-full flex-wrap justify-start gap-2" : "grid w-full grid-cols-3 gap-2"}
      >
        {variants.map((variant) => {
          const isActive = variant.id === selectedVariantId;
          const variantColorClasses = isActive
            ? "border-blue-500 bg-blue-50 text-slate-700 shadow-[0_8px_20px_rgba(37,99,235,0.18)]"
            : "border-slate-200 bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50";

          return (
            <button
              key={variant.id}
              type="button"
              className={`${isTopLayout ? "min-w-[140px]" : "w-full"} cursor-pointer rounded-2xl border px-5 py-2.5 text-center text-sm font-bold transition-all duration-150 ${variantColorClasses}`}
              onClick={() => onSelectVariant?.(variant.id)}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ItemDetailsPanel({
  item,
  nutrition,
  variants,
  selectedVariantId,
  onSelectVariant,
  addons,
  ingredientItems,
  menuItems,
  customizationRules,
  selectedAddons,
  onSelectAddon,
  sauceSelectionCounts,
  onIncrementSauce,
  onDecrementSauce,
  onToggleSauce,
  commonChanges,
  selectedCommonChangeIds,
  onToggleCommonChange,
  customizationTotals,
  showCustomizationDeltas,
  displayMode = "full",
  showVariantsInDetails = true,
  selectedIngredientCounts,
  onIncrementIngredient,
  onDecrementIngredient,
  onToggleIngredient,
  onSelectSingleIngredient,
  flattenIngredientList = false,
  lockedIngredientIds = [],
  comboType = "just-item",
  comboSides = [],
  comboDrinks = [],
  selectedComboSideId,
  selectedComboDrinkId,
  onSelectComboSide,
  onSelectComboDrink,
  selectedComboSideVariantId,
  onSelectComboSideVariant,
  selectedComboDrinkVariantId,
  onSelectComboDrinkVariant,
  ingredientsSectionRef,
  sidesSectionRef,
  drinksSectionRef,
  addonSectionRef,
  addonSectionRefType,
  sectionNavItems,
  activeSectionId,
  onSelectSection,
  onCustomizeIngredients,
}: {
  item: MenuItem;
  nutrition: Nutrition;
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  addons?: RestaurantAddons;
  ingredientItems?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
  selectedAddons?: Partial<Record<AddonRef, AddonOption>>;
  onSelectAddon?: (ref: AddonRef, addon?: AddonOption) => void;
  sauceSelectionCounts?: Partial<Record<string, number>>;
  onIncrementSauce?: (addon: AddonOption) => void;
  onDecrementSauce?: (addon: AddonOption) => void;
  onToggleSauce?: (addon: AddonOption) => void;
  commonChanges?: CommonChange[];
  selectedCommonChangeIds?: string[];
  onToggleCommonChange?: (id: string) => void;
  customizationTotals?: MacroDelta;
  showCustomizationDeltas?: boolean;
  displayMode?: "full" | "addonsOnly";
  showVariantsInDetails?: boolean;
  selectedIngredientCounts?: Partial<Record<string, number>>;
  onIncrementIngredient?: (ingredientId: string) => void;
  onDecrementIngredient?: (ingredientId: string) => void;
  onToggleIngredient?: (ingredientId: string) => void;
  onSelectSingleIngredient?: (ingredientId: string, ingredientIdsInTab: string[]) => void;
  flattenIngredientList?: boolean;
  lockedIngredientIds?: string[];
  comboType?: "just-item" | "combo-meal";
  comboSides?: MenuItem[];
  comboDrinks?: MenuItem[];
  selectedComboSideId?: string;
  selectedComboDrinkId?: string;
  onSelectComboSide?: (itemId: string) => void;
  onSelectComboDrink?: (itemId: string) => void;
  selectedComboSideVariantId?: string;
  onSelectComboSideVariant?: (variantId: string) => void;
  selectedComboDrinkVariantId?: string;
  onSelectComboDrinkVariant?: (variantId: string) => void;
  ingredientsSectionRef?: (element: HTMLElement | null) => void;
  sidesSectionRef?: (element: HTMLElement | null) => void;
  drinksSectionRef?: (element: HTMLElement | null) => void;
  addonSectionRef?: (element: HTMLElement | null) => void;
  addonSectionRefType?: AddonRef;
  sectionNavItems?: Array<{ id: "ingredients" | "sides" | "drinks" | "sauces"; label: string; icon: LucideIcon }>;
  activeSectionId?: "ingredients" | "sides" | "drinks" | "sauces" | null;
  onSelectSection?: (sectionId: "ingredients" | "sides" | "drinks" | "sauces") => void;
  onCustomizeIngredients?: () => void;
}) {
  const n = nutrition;
  const selectedMainVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedMainItemImage = selectedMainVariant?.image ?? item.image;
  const proteinGrams = n.protein ?? 0;
  const carbsGrams = n.carbs ?? 0;
  const fatGrams = n.totalFat ?? 0;
  const macroTotalGrams = proteinGrams + carbsGrams + fatGrams;
  const macroSegments = [
    {
      label: "Protein",
      percent: macroTotalGrams > 0 ? (proteinGrams / macroTotalGrams) * 100 : 0,
      color: "bg-[#c2410c] text-white",
    },
    {
      label: "Carbs",
      percent: macroTotalGrams > 0 ? (carbsGrams / macroTotalGrams) * 100 : 0,
      color: "bg-[#ca8a04] text-white",
    },
    {
      label: "Fat",
      percent: macroTotalGrams > 0 ? (fatGrams / macroTotalGrams) * 100 : 0,
      color: "bg-[#2563eb] text-white",
    },
  ];
  const addonRefs = item.addonRefs ?? [];
  const [sectionOpenState, setSectionOpenState] = useState<Record<string, boolean>>({});

  const availableAddonSections = addonRefs
    .map((ref) => {
      const list = addons?.[ref];
      if (!list || list.length === 0) return null;
      return {
        ref,
        title: addonSectionTitles[ref],
        addons: sortByCalories(list),
      };
    })
    .filter((section): section is { ref: AddonRef; title: string; addons: AddonOption[] } =>
      section !== null
    );
  const selectedComboSide = comboSides.find((side) => (side.id ?? side.name) === selectedComboSideId);
  const selectedComboDrink = comboDrinks.find((drink) => (drink.id ?? drink.name) === selectedComboDrinkId);
  const selectedComboSideVariant = selectedComboSide?.variants?.find(
    (variant) =>
      (selectedComboSideVariantId ?? selectedComboSide.defaultVariantId ?? selectedComboSide.variants?.[0]?.id) === variant.id
  );
  const selectedComboDrinkVariant = selectedComboDrink?.variants?.find(
    (variant) =>
      (selectedComboDrinkVariantId ?? selectedComboDrink.defaultVariantId ?? selectedComboDrink.variants?.[0]?.id) === variant.id
  );
  const selectedAddonItems = (Object.entries(selectedAddons ?? {}) as Array<[AddonRef, AddonOption | undefined]>)
    .filter(([, addon]) => Boolean(addon && addon.name !== "None"))
    .map(([ref, addon]) => ({
      id: `${ref}-${addon?.name}`,
      name: addon?.name ?? "",
      quantity: 1,
      image: addon?.image,
      detail: ref === "dressings" ? "Dressing" : ref === "sauces" ? "Sauce" : "Addon",
    }));
  const selectedSauceItems = Object.entries(sauceSelectionCounts ?? {})
    .filter(([name, count]) => name !== "None" && (count ?? 0) > 0)
    .map(([name, count]) => {
      const sauceCount = count ?? 0;
      const matchedSauce = addons?.sauces?.find((addon) => addon.name === name);
      return {
        id: `sauce-${name}`,
        name,
        quantity: sauceCount,
        image: matchedSauce?.image,
        detail: "Sauce",
      };
    });
  const detailItems = [
    {
      id: `main-${item.id ?? item.name}`,
      name: selectedMainVariant ? `${item.name} (${selectedMainVariant.label})` : item.name,
      quantity: 1,
      image: selectedMainItemImage,
      detail: "Main Item",
    },
    ...(comboType === "combo-meal" && selectedComboSide
      ? [
          {
            id: `combo-side-${selectedComboSide.id ?? selectedComboSide.name}`,
            name: selectedComboSideVariant ? `${selectedComboSide.name} (${selectedComboSideVariant.label})` : selectedComboSide.name,
            quantity: 1,
            image: selectedComboSide.image,
            detail: "Side",
          },
        ]
      : []),
    ...(comboType === "combo-meal" && selectedComboDrink
      ? [
          {
            id: `combo-drink-${selectedComboDrink.id ?? selectedComboDrink.name}`,
            name: selectedComboDrinkVariant ? `${selectedComboDrink.name} (${selectedComboDrinkVariant.label})` : selectedComboDrink.name,
            quantity: 1,
            image: selectedComboDrink.image,
            detail: "Drink",
          },
        ]
      : []),
    ...selectedAddonItems,
    ...selectedSauceItems,
  ];

  const activeCustomizationTotals = customizationTotals ?? { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
  const normalizedLockedIngredientIds = new Set(
    lockedIngredientIds.map((ingredientId) => normalizeIngredientToken(ingredientId))
  );
  const isLockedIngredient = (ingredientId: string) => normalizedLockedIngredientIds.has(normalizeIngredientToken(ingredientId));
  const ingredientTabs = resolvePanelIngredientTabs(
    item,
    ingredientItems,
    addons,
    menuItems,
    variants,
    selectedVariantId,
    customizationRules
  );
  const [activeIngredientTab, setActiveIngredientTab] = useState(ingredientTabs[0]?.label ?? INCLUDED_INGREDIENT_TAB);
  const availableIngredientTabs = ingredientTabs.filter((tab) => tab.ingredients.length > 0);
  const visibleIngredientTabs = availableIngredientTabs;
  const flattenedIngredientTab = flattenIngredientList
    ? {
        id: "all-ingredients",
        label: "Ingredients",
        selectionMode: "quantity" as const,
        ingredients: ingredientTabs
          .flatMap((tab) => tab.ingredients)
          .filter((ingredient, index, list) => {
            if (ingredient.isNoneOption) return false;
            return list.findIndex((candidate) => candidate.id === ingredient.id) === index;
          }),
      }
    : undefined;
  const selectedIngredientTab =
    flattenedIngredientTab ??
    availableIngredientTabs.find((tab) => tab.label === activeIngredientTab) ??
    availableIngredientTabs[0] ??
    ingredientTabs.find((tab) => tab.label === activeIngredientTab) ??
    ingredientTabs[0];
  const navigateToSingleSelectTab = (
    ingredientId: string,
    linkedTab?: (typeof ingredientTabs)[number]
  ) => {
    if (!linkedTab) return;

    onSelectSingleIngredient?.(
      ingredientId,
      linkedTab.ingredients.map((candidate) => candidate.id)
    );
    setActiveIngredientTab(linkedTab.label);
  };
  const displayIngredients = (() => {
    if (!selectedIngredientTab) return [];
    const selectedCountFor = (ingredient: ResolvedPanelIngredient) => {
      return selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
    };

    if (flattenIngredientList) {
      return selectedIngredientTab.ingredients
        .filter((ingredient) => selectedCountFor(ingredient) > 0)
        .sort((left, right) => {
          const categoryPriority = (ingredient: ResolvedPanelIngredient) => {
            if (isLockedIngredient(ingredient.id)) return 0;
            const normalizedCategory = normalizeIngredientCategory(
              ingredient.ingredientItem?.categories?.[0] ?? ingredient.ingredientItem?.category ?? ""
            );
            if (normalizedCategory === "proteins") return 1;
            if (normalizedCategory === "rice") return 2;
            if (normalizedCategory === "beans") return 3;
            if (normalizedCategory === "toppings") return 4;
            if (normalizedCategory === "side") return 5;
            return 6;
          };

          const leftPriority = categoryPriority(left);
          const rightPriority = categoryPriority(right);
          if (leftPriority !== rightPriority) return leftPriority - rightPriority;

          const leftOrder = left.ingredientItem?.defaultOrder ?? Number.POSITIVE_INFINITY;
          const rightOrder = right.ingredientItem?.defaultOrder ?? Number.POSITIVE_INFINITY;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;

          return left.label.localeCompare(right.label);
        });
    }
    if (selectedIngredientTab.label !== INCLUDED_INGREDIENT_TAB) {
      return selectedIngredientTab.ingredients;
    }

    const includedIngredients: ResolvedPanelIngredient[] = [];
    const includedIngredientIds = new Set<string>();
    const seenSingleSelectTabs = new Set<string>();

    selectedIngredientTab.ingredients.forEach((ingredient) => {
      const linkedIngredientTab = ingredientTabs.find(
        (tab) =>
          tab.label !== INCLUDED_INGREDIENT_TAB &&
          tab.ingredients.some((candidate) => candidate.id === ingredient.id)
      );
      const linkedIngredient = linkedIngredientTab?.ingredients.find(
        (candidate) => candidate.id === ingredient.id
      );
      const linkedSingleSelectTab = linkedIngredientTab?.selectionMode === "single" ? linkedIngredientTab : undefined;

      if (!linkedSingleSelectTab) {
        includedIngredients.push(linkedIngredient ?? ingredient);
        includedIngredientIds.add(ingredient.id);
        return;
      }

      if (seenSingleSelectTabs.has(linkedSingleSelectTab.label)) {
        return;
      }

      seenSingleSelectTabs.add(linkedSingleSelectTab.label);

      const selectedIngredient =
        linkedSingleSelectTab.ingredients.find((candidate) => selectedCountFor(candidate) > 0) ?? ingredient;

      if (selectedIngredient.isNoneOption) {
        return;
      }

      const includedIngredient = { ...selectedIngredient, tabLabel: linkedSingleSelectTab.label };

      includedIngredients.push(includedIngredient);
      includedIngredientIds.add(includedIngredient.id);
    });

    ingredientTabs.forEach((tab) => {
      if (tab.label === INCLUDED_INGREDIENT_TAB) {
        return;
      }

      if (tab.selectionMode === "single") {
        if (seenSingleSelectTabs.has(tab.label)) {
          return;
        }

        const selectedIngredient = tab.ingredients.find((ingredient) => selectedCountFor(ingredient) > 0);
        if (!selectedIngredient || selectedIngredient.isNoneOption || includedIngredientIds.has(selectedIngredient.id)) {
          return;
        }

        seenSingleSelectTabs.add(tab.label);
        includedIngredients.push({ ...selectedIngredient, tabLabel: tab.label });
        includedIngredientIds.add(selectedIngredient.id);
        return;
      }

      tab.ingredients.forEach((ingredient) => {
        if (selectedCountFor(ingredient) <= 0 || includedIngredientIds.has(ingredient.id)) {
          return;
        }

        includedIngredients.push(ingredient);
        includedIngredientIds.add(ingredient.id);
      });
    });

    return includedIngredients;
  })();
  const shouldShowIngredientSection = flattenIngredientList
    ? (flattenedIngredientTab?.ingredients.some((ingredient) => {
        const ingredientCount = selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
        return ingredientCount > 0;
      }) ?? false)
    : availableIngredientTabs.length > 1 || (availableIngredientTabs[0]?.ingredients.length ?? 0) > 0;
  const shouldShowComboSelections = comboType === "combo-meal";
  const hasBuildContent =
    shouldShowIngredientSection ||
    shouldShowComboSelections ||
    availableAddonSections.length > 0 ||
    (displayMode === "full" && (commonChanges?.length ?? 0) > 0);
  const shouldShowInfoSection = displayMode === "full";

  return (
    <div className="grid gap-16">
      {hasBuildContent ? (
      <div className="grid grid-cols-2 gap-3 rounded-[18px] bg-[#e9e9e9] p-3">
      {sectionNavItems && sectionNavItems.length > 0 ? (
        <div className="col-span-2 sticky top-0 z-[5] w-full rounded-2xl border border-black/10 bg-white/95 px-2 py-1.5 shadow-[0_3px_10px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {sectionNavItems.map((section) => {
              const isActive = activeSectionId === section.id;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  className="cursor-pointer flex min-w-[120px] flex-none flex-col items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-center"
                  onClick={() => onSelectSection?.(section.id)}
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-[13px] ${isActive ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    <Icon size={15} />
                  </span>
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {shouldShowIngredientSection && selectedIngredientTab ? (
        <section ref={ingredientsSectionRef} className="col-span-2 rounded-[14px] border border-black/12 bg-white p-5">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Ingredients</h2>
            {onCustomizeIngredients ? (
              <button
                type="button"
                onClick={onCustomizeIngredients}
                aria-label="Customize ingredients"
                className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {!flattenIngredientList && visibleIngredientTabs.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {visibleIngredientTabs.map((tab) => {
                const isActive = tab.label === selectedIngredientTab.label;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-black bg-black text-white"
                        : "border-black/15 bg-[#f7f7f7] text-black/70"
                    }`}
                    onClick={() => setActiveIngredientTab(tab.label)}
                  >
                    {getIngredientTabDisplayLabel(tab.label)}
                  </button>
                );
              })}
            </div>
          ) : null}
          {displayIngredients.length > 0 ? (
            <ul className="grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
              {displayIngredients.map((ingredient) => {
                const ingredientCount = selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
                const isSelected = ingredientCount > 0;
                const shouldShowPortionBadge = ingredientCount > 0 && ingredientCount !== 1;
                const displayCaloriesMultiplier = ingredientCount > 0 ? ingredientCount : 1;
                const displayedCalories =
                  ingredient.calories !== undefined
                    ? Math.round(ingredient.calories * displayCaloriesMultiplier)
                    : undefined;
                const linkedSingleSelectTab =
                  ingredient.tabLabel
                    ? ingredientTabs.find(
                        (tab) => tab.label === ingredient.tabLabel && tab.selectionMode === "single"
                      )
                    : undefined;
                const shouldShowSingleSelectNavigator =
                  selectedIngredientTab.label === INCLUDED_INGREDIENT_TAB && Boolean(linkedSingleSelectTab);
                const isSingleSelectTab = selectedIngredientTab.selectionMode === "single";
                const canToggleIngredientFromCard =
                  !isLockedIngredient(ingredient.id) &&
                  !shouldShowSingleSelectNavigator &&
                  typeof ingredient.maxQuantity === "number";
                const cardClasses = `box-border flex h-full w-full flex-row items-center gap-3 rounded-[10px] border border-[rgba(0,0,0,0.15)] bg-[#f9f9f9] px-3 py-2 ${
                  isSelected
                    ? isSingleSelectTab
                      ? "shadow-[inset_0_0_0_3px_#16a34a]"
                      : "shadow-[inset_0_0_0_1px_#000000]"
                    : ""
                }`;
                const ingredientContent = (
                  <>
                    <div
                      className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center"
                      aria-hidden="true"
                    >
                      {isIconImage(ingredient.icon) ? (
                        <Image
                          src={ingredient.icon}
                          alt=""
                          width={72}
                          height={72}
                          className="h-[72px] w-[72px] rounded-lg object-cover"
                        />
                      ) : (
                        ingredient.icon
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                      {shouldShowPortionBadge ? (
                        <div className="inline-flex rounded-full bg-lime-500 px-2 py-0.5 text-xs font-bold text-black">
                          {formatPortionBadge(ingredientCount)}
                        </div>
                      ) : null}
                      <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{ingredient.label}</div>
                      <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">
                        {displayedCalories !== undefined ? `${displayedCalories} Cal` : "— Cal"}
                      </div>
                    </div>
                  </>
                );

                return (
                  <li key={ingredient.id} className="flex">
                    {isSingleSelectTab ? (
                      <button
                        type="button"
                        className={`${cardClasses} cursor-pointer text-left`}
                        onClick={() =>
                          onSelectSingleIngredient?.(
                            ingredient.id,
                            selectedIngredientTab.ingredients.map((candidate) => candidate.id)
                          )
                        }
                      >
                        {ingredientContent}
                        <span
                          aria-hidden="true"
                          className={`ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.25)]"
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#16a34a]" : "bg-transparent"}`}
                          />
                        </span>
                      </button>
                    ) : (
                      <div
                        className={`${cardClasses} ${canToggleIngredientFromCard || shouldShowSingleSelectNavigator ? "cursor-pointer text-left" : ""}`}
                        role={canToggleIngredientFromCard || shouldShowSingleSelectNavigator ? "button" : undefined}
                        tabIndex={canToggleIngredientFromCard || shouldShowSingleSelectNavigator ? 0 : undefined}
                        onClick={() => {
                          if (shouldShowSingleSelectNavigator) {
                            navigateToSingleSelectTab(ingredient.id, linkedSingleSelectTab);
                            return;
                          }

                          if (canToggleIngredientFromCard) {
                            onToggleIngredient?.(ingredient.id);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }

                          if (shouldShowSingleSelectNavigator) {
                            event.preventDefault();
                            navigateToSingleSelectTab(ingredient.id, linkedSingleSelectTab);
                            return;
                          }

                          if (canToggleIngredientFromCard) {
                            event.preventDefault();
                            onToggleIngredient?.(ingredient.id);
                          }
                        }}
                      >
                        {ingredientContent}
                        {shouldShowSingleSelectNavigator ? (
                          <button
                            type="button"
                            className="ml-auto inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[rgba(0,0,0,0.2)] bg-white text-black/70 transition hover:bg-black hover:text-white"
                            aria-label={`Customize ${linkedSingleSelectTab?.label ?? ingredient.label}`}
                            onClick={() => {
                              navigateToSingleSelectTab(ingredient.id, linkedSingleSelectTab);
                            }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        ) : typeof ingredient.maxQuantity === "number" ? (
                          <div
                            className="ml-auto inline-flex items-center gap-[6px]"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            {ingredientCount > 0 ? (
                              <>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Remove one ${ingredient.label}`}
                                  onClick={() => onDecrementIngredient?.(ingredient.id)}
                                  disabled={isLockedIngredient(ingredient.id)}
                                >
                                  -
                                </button>
                                <span className="min-w-4 text-center text-base font-bold">{ingredientCount}</span>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label={`Add one more ${ingredient.label}`}
                                  onClick={() => onIncrementIngredient?.(ingredient.id)}
                                  disabled={ingredientCount >= ingredient.maxQuantity}
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none"
                                aria-label={`Add ${ingredient.label}`}
                                onClick={() => onIncrementIngredient?.(ingredient.id)}
                              >
                                +
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-[10px] border border-dashed border-black/12 bg-[#f9f9f9] px-4 py-6 text-sm font-medium text-black/55">
              No ingredients available in this tab.
            </div>
          )}
        </section>
      ) : null}

      {shouldShowComboSelections ? (
        <>
          <section ref={sidesSectionRef} className="col-span-2 rounded-[14px] border border-black/12 bg-white p-5">
            <h2 className="mb-6 text-2xl font-bold">Sides</h2>
            <ul className="grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
              {comboSides.map((side) => {
                const sideId = side.id ?? side.name;
                const isSelected = selectedComboSideId === sideId;
                const sideVariants = side.variants ?? [];
                const selectedSideVariant =
                  isSelected && sideVariants.length > 0
                    ? sideVariants.find(
                        (variant) => (selectedComboSideVariantId ?? side.defaultVariantId ?? sideVariants[0]?.id) === variant.id
                      )
                    : undefined;
                const sideCalories = selectedSideVariant?.nutrition.calories ?? side.nutrition.calories;
                return (
                  <li key={sideId} className="flex">
                    <div
                      className={`box-border flex h-full w-full cursor-pointer flex-col rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-[#fcfcfc] px-3 py-2 text-left ${isSelected ? "shadow-[inset_0_0_0_2px_#16a34a]" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectComboSide?.(sideId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectComboSide?.(sideId);
                        }
                      }}
                    >
                      <div className="flex flex-row items-center gap-3">
                        <div className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center">
                          {side.image ? (
                            <Image src={side.image} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-lg object-cover" />
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                          <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{side.name}</div>
                          <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">{sideCalories ?? "—"} Cal</div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.2)]"
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#16a34a]" : "bg-transparent"}`} />
                        </span>
                      </div>
                      {isSelected && sideVariants.length > 0 ? (
                      <div className="mt-1.5 flex w-full flex-wrap gap-1.5">
                        {sideVariants.map((variant) => {
                          const isVariantSelected = (selectedComboSideVariantId ?? side.defaultVariantId ?? sideVariants[0]?.id) === variant.id;
                          return (
                            <button
                              key={`${sideId}-${variant.id}`}
                              type="button"
                              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                isVariantSelected
                                  ? "border-black bg-black text-white"
                                  : "border-black/20 bg-white text-black/70"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectComboSideVariant?.(variant.id);
                              }}
                            >
                              {variant.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section ref={drinksSectionRef} className="col-span-2 rounded-[14px] border border-black/12 bg-white p-5">
            <h2 className="mb-6 text-2xl font-bold">Drinks</h2>
            <ul className="grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
              {comboDrinks.map((drink) => {
                const drinkId = drink.id ?? drink.name;
                const isSelected = selectedComboDrinkId === drinkId;
                const drinkVariants = drink.variants ?? [];
                const selectedDrinkVariant =
                  isSelected && drinkVariants.length > 0
                    ? drinkVariants.find(
                        (variant) => (selectedComboDrinkVariantId ?? drink.defaultVariantId ?? drinkVariants[0]?.id) === variant.id
                      )
                    : undefined;
                const drinkCalories = selectedDrinkVariant?.nutrition.calories ?? drink.nutrition.calories;
                return (
                  <li key={drinkId} className="flex">
                    <div
                      className={`box-border flex h-full w-full cursor-pointer flex-col rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-[#fcfcfc] px-3 py-2 text-left ${isSelected ? "shadow-[inset_0_0_0_2px_#16a34a]" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectComboDrink?.(drinkId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectComboDrink?.(drinkId);
                        }
                      }}
                    >
                      <div className="flex flex-row items-center gap-3">
                        <div className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center">
                          {drink.image ? (
                            <Image src={drink.image} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-lg object-cover" />
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                          <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{drink.name}</div>
                          <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">{drinkCalories ?? "—"} Cal</div>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.2)]"
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#16a34a]" : "bg-transparent"}`} />
                        </span>
                      </div>
                      {isSelected && drinkVariants.length > 0 ? (
                        <div className="mt-1.5 flex w-full flex-wrap gap-1.5">
                          {drinkVariants.map((variant) => {
                            const isVariantSelected = (selectedComboDrinkVariantId ?? drink.defaultVariantId ?? drinkVariants[0]?.id) === variant.id;
                            return (
                              <button
                                key={`${drinkId}-${variant.id}`}
                                type="button"
                                className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  isVariantSelected
                                    ? "border-black bg-black text-white"
                                    : "border-black/20 bg-white text-black/70"
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onSelectComboDrinkVariant?.(variant.id);
                                }}
                              >
                                {variant.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}

      {availableAddonSections.length > 0 ? (
        <section className="col-span-2 rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white px-[18px] py-[14px]">
          <div className="grid gap-[14px]">
            {availableAddonSections.map((section) => {
              const sectionStateKey = `addon-${section.ref}`;
              const isSectionOpen = sectionOpenState[sectionStateKey] ?? true;
              const selectedAddon = selectedAddons?.[section.ref];
              const sauceSelections =
                section.ref === "sauces"
                  ? section.addons.filter((addon) => addon.name !== "None" && (sauceSelectionCounts?.[addon.name] ?? 0) > 0)
                  : [];
              const sauceSummaryCalories = sauceSelections.reduce(
                (sum, addon) => sum + toNumber(addon.calories) * (sauceSelectionCounts?.[addon.name] ?? 0),
                0
              );
              const summaryDetail =
                section.ref === "sauces"
                  ? formatSummaryDetail(sauceSelections[0]?.name ?? "None", sauceSummaryCalories)
                  : formatSummaryDetail(selectedAddon?.name ?? "None", selectedAddon?.calories ?? 0);
              return (
                <div
                  key={section.ref}
                  ref={section.ref === addonSectionRefType ? addonSectionRef : undefined}
                  className="min-w-0"
                >
                  <div
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-[10px] border-0 bg-transparent p-3 text-left"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSectionOpenState((prev) => ({
                        ...prev,
                        [sectionStateKey]: !(prev[sectionStateKey] ?? true),
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSectionOpenState((prev) => ({
                          ...prev,
                          [sectionStateKey]: !(prev[sectionStateKey] ?? true),
                        }));
                      }
                    }}
                  >
                    <h3 className="m-0 text-2xl font-bold">
                      {section.title}
                      {!isSectionOpen ? <span className="text-[18px] font-semibold text-[rgba(0,0,0,0.5)]"> {summaryDetail}</span> : null}
                    </h3>
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 cursor-inherit items-center justify-center bg-white">
                        <ChevronDown
                          size={24}
                          className={`transition-transform ${isSectionOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </div>
                  </div>
                  {isSectionOpen ? (
                    <ul className="mt-4 grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
                      {section.addons.map((addon) => {
                        const sauceCount = section.ref === "sauces" ? (sauceSelectionCounts?.[addon.name] ?? 0) : 0;
                        const isSelected =
                          section.ref === "sauces"
                            ? sauceCount > 0
                            : selectedAddons?.[section.ref]?.name === addon.name;

                        return (
                        <li key={`${section.ref}-${addon.name}`} className="flex">
                          <button
                            type="button"
                            className={`box-border flex h-full w-full cursor-pointer flex-row items-center gap-3 rounded-[10px] border border-[rgba(0,0,0,0.15)] bg-[#f9f9f9] px-3 py-2 ${isSelected ? "shadow-[inset_0_0_0_3px_#16a34a]" : ""}`}
                            onClick={() => {
                              if (section.ref === "sauces") {
                                onToggleSauce?.(addon);
                                return;
                              }
                              onSelectAddon?.(section.ref, isSelected ? undefined : addon);
                            }}
                          >
                            {addon.image === "none" ? (
                              <div className={`grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black `}>✕</div>
                            ) : addon.image ? (
                              <div
                                className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black"
                                style={{ backgroundImage: `url(${addon.image})` }}
                              />
                            ) : (
                              <div className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black" />
                            )}
                            <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                              <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{addon.name}</div>
                              <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">+{toNumber(addon.calories)} Cal</div>
                            </div>
                            {section.ref === "dressings" ? (
                              <span
                                aria-hidden="true"
                                className={`ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.25)]"}`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#16a34a]" : "bg-transparent"}`}
                                />
                              </span>
                            ) : null}
                            {section.ref === "sauces" && addon.name !== "None" ? (
                              <div
                                className="ml-auto inline-flex items-center gap-[6px]"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                {sauceCount > 0 ? (
                                  <>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none"
                                      aria-label={`Remove one ${addon.name}`}
                                      onClick={() => onDecrementSauce?.(addon)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          onDecrementSauce?.(addon);
                                        }
                                      }}
                                    >
                                      -
                                    </span>
                                    <span className="min-w-4 text-center text-base font-bold">{sauceCount}</span>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none"
                                      aria-label={`Add one more ${addon.name}`}
                                      onClick={() => onIncrementSauce?.(addon)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          onIncrementSauce?.(addon);
                                        }
                                      }}
                                    >
                                      +
                                    </span>
                                  </>
                                ) : (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none"
                                    aria-label={`Add ${addon.name}`}
                                    onClick={() => onIncrementSauce?.(addon)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onIncrementSauce?.(addon);
                                      }
                                    }}
                                  >
                                    +
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </button>
                        </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {displayMode === "full" && commonChanges && commonChanges.length > 0 ? (
        <section className="col-span-2 rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white px-[18px] py-[14px]">
          <div className="grid gap-[14px]">
            <div className="min-w-0">
              {(() => {
                const commonKey = "common-changes";
                const isCommonOpen = sectionOpenState[commonKey] ?? true;
                const selectedCommonChanges = commonChanges.filter((change) =>
                  selectedCommonChangeIds?.includes(change.id)
                );
                const firstSelectedCommon = selectedCommonChanges[0] ?? null;
                const totalCommonCalories = selectedCommonChanges.reduce(
                  (sum, change) => sum + change.delta.calories,
                  0
                );
                const commonSummaryDetail = formatSummaryDetail(
                  firstSelectedCommon?.label ?? "None",
                  firstSelectedCommon ? totalCommonCalories : 0
                );

                return (
                  <>
                    <div
                      className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-[10px] rounded-[10px] border-0 bg-transparent p-3 text-left"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSectionOpenState((prev) => ({
                          ...prev,
                          [commonKey]: !(prev[commonKey] ?? true),
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSectionOpenState((prev) => ({
                            ...prev,
                            [commonKey]: !(prev[commonKey] ?? true),
                          }));
                        }
                      }}
                    >
                      <h3 className="m-0 text-2xl font-bold">
                        Common Changes
                        {!isCommonOpen ? <span className="text-[18px] font-semibold text-[rgba(0,0,0,0.5)]"> {commonSummaryDetail}</span> : null}
                      </h3>
                      <span className="inline-flex h-7 w-7 cursor-inherit items-center justify-center bg-white">
                        <ChevronDown
                          size={24}
                          className={`transition-transform ${isCommonOpen ? "rotate-180" : ""}`}
                        />
                      </span>
                    </div>
                    {isCommonOpen ? (
                      <ul className="mt-4 grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
                        {commonChanges.map((change) => {
                          const isActive = selectedCommonChangeIds?.includes(change.id) ?? false;
                          const calorieDeltaLabel = `${change.delta.calories >= 0 ? "+" : ""}${change.delta.calories}cal`;
                          const proteinDeltaLabel = `${change.delta.protein >= 0 ? "+" : ""}${change.delta.protein}g protein`;
                          return (
                            <li key={change.id} className="flex">
                              <button
                                type="button"
                                className={`box-border flex h-full w-full cursor-pointer flex-row items-center gap-3 rounded-[10px] border border-[rgba(0,0,0,0.15)] bg-[#f9f9f9] px-3 py-2 ${isActive ? "shadow-[inset_0_0_0_3px_#16a34a]" : ""}`}
                                onClick={() => onToggleCommonChange?.(change.id)}
                              >
                                <div className={`grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black `}>↺</div>
                                <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                                  <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{change.label}</div>
                                  <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">{`${calorieDeltaLabel} • ${proteinDeltaLabel}`}</div>
                                </div>
                                <span
                                  className={`ml-auto inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${isActive ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[rgba(0,0,0,0.45)] bg-white text-transparent"}`}
                                  aria-hidden="true"
                                >
                                  <Check size={14} strokeWidth={3} />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </div>
        </section>
      ) : null}

      </div>
      ) : null}

      {shouldShowInfoSection ? (
      <div className="grid grid-cols-1 gap-3 rounded-[18px] border border-black/8 bg-[#efefef] p-3 md:grid-cols-2">
      <section className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">Nutrition Facts</h2>

        <div className="text-xs font-medium text-[rgba(0,0,0,0.55)]">Amount per serving</div>

        <div className="mt-1 flex items-end justify-between">
          <h3 className="text-xl font-bold">Calories</h3>
          <div className="inline-flex items-baseline gap-[6px]">
            <div className="text-xl font-bold">{n.calories === undefined || Number.isNaN(n.calories) ? "—" : n.calories}</div>
            {showCustomizationDeltas ? (
              <span className="text-sm font-bold text-[#16a34a]">{formatDelta(activeCustomizationTotals.calories)}</span>
            ) : null}
          </div>
        </div>

        <div className="my-[12px] mb-2 h-[4px] rounded-[999px] bg-[rgba(0,0,0,0.75)]" />

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
          <div className="text-lg font-semibold">Total Fat</div>
          <div className="inline-flex items-baseline gap-[6px]">
            <div className="text-lg font-semibold">{format(n.totalFat, "g")}</div>
            {showCustomizationDeltas ? <span className="text-sm font-bold text-[#16a34a]">{formatDelta(activeCustomizationTotals.totalFat, "g")}</span> : null}
          </div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sat Fat</div>
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{format(n.satFat, "g")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Trans Fat</div>
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{format(n.transFat, "g")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
          <div className="text-lg font-semibold">Cholesterol</div>
          <div className="text-lg font-semibold">{format(n.cholesterol, "mg")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
          <div className="text-lg font-semibold">Sodium</div>
          <div className="text-lg font-semibold">{format(n.sodium, "mg")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
          <div className="text-lg font-semibold">Carbohydrates</div>
          <div className="inline-flex items-baseline gap-[6px]">
            <div className="text-lg font-semibold">{format(n.carbs, "g")}</div>
            {showCustomizationDeltas ? <span className="text-sm font-bold text-[#16a34a]">{formatDelta(activeCustomizationTotals.carbs, "g")}</span> : null}
          </div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Fiber</div>
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{format(n.fiber, "g")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] pl-5">
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">Sugars</div>
          <div className="text-base font-medium text-[rgba(0,0,0,0.8)]">{format(n.sugars, "g")}</div>
        </div>

        <div className="flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px]">
          <div className="text-lg font-semibold">Protein</div>
          <div className="inline-flex items-baseline gap-[6px]">
            <div className="text-lg font-semibold">{format(n.protein, "g")}</div>
            {showCustomizationDeltas ? <span className="text-sm font-bold text-[#16a34a]">{formatDelta(activeCustomizationTotals.protein, "g")}</span> : null}
          </div>
        </div>

        <div className="mt-3 text-xs font-medium leading-[1.05] text-[rgba(0,0,0,0.55)]">
          2,000 calories a day is used for general nutrition advice, but calorie needs
          vary. Values may vary by location, serving size, and customizations.
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(0,0,0,0.15)] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">Details</h2>

        {showVariantsInDetails ? (
          <>
            <PortionSelector
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={onSelectVariant}
              layout="details"
              className="mt-0"
            />
            <div className="mt-3 h-px bg-[rgba(0,0,0,0.2)]" />
          </>
        ) : null}

        <div className="mt-4 space-y-2">
          <p className="text-base font-semibold uppercase tracking-wide text-neutral-500">Items</p>
          <ul className="max-h-[320px] min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-[#efefef] p-2">
            {detailItems.map((detailItem) => (
              <li
                key={detailItem.id}
                className="flex items-center gap-3 rounded-xl border border-black/10 bg-neutral-50 px-3 py-2"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                  {detailItem.image && detailItem.image !== "none" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detailItem.image} alt={detailItem.name} className="h-full w-full object-contain p-1" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {detailItem.quantity}x {detailItem.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">{detailItem.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-base font-semibold uppercase tracking-wide text-neutral-500">Protein Score</p>
          <div className="rounded-xl bg-[#efefef] px-3 py-2">
            <p className="mt-1 text-sm text-neutral-900">
              {n.calories === undefined || n.protein === undefined || n.calories <= 0 ? (
                "—"
              ) : (
                <>
                  <span className="font-bold">{Math.round((n.protein / n.calories) * 100)}g</span> of protein in{" "}
                  <span className="font-semibold">100 calories</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-base font-semibold uppercase tracking-wide text-neutral-500">Macro Split</p>
          <div className="flex h-11 w-full gap-1 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 p-1">
            {macroSegments.map((segment) => {
              const roundedPercent = Math.round(segment.percent);
              const shortLabel = segment.label === "Protein" ? "P" : segment.label === "Carbs" ? "C" : "F";
              const segmentLabel =
                segment.percent >= 16
                  ? `${shortLabel}: ${roundedPercent}%`
                  : segment.percent >= 9
                    ? `${roundedPercent}%`
                    : "";

              return (
                <div
                  key={segment.label}
                  className={`flex min-w-0 items-center justify-center rounded-xl px-1 text-[11px] font-semibold whitespace-nowrap text-neutral-900 ${segment.color}`}
                  style={{ width: `${segment.percent}%` }}
                >
                  {segmentLabel}
                </div>
              );
            })}
          </div>
        </div>

        {item.restaurant ? (
          <>
            <div className="mt-3 h-px bg-[rgba(0,0,0,0.2)]" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-4 font-semibold text-[rgba(0,0,0,0.8)]">Restaurant</div>
              <div className="text-4 font-semibold">{item.restaurant}</div>
            </div>
          </>
        ) : null}

      </section>
      </div>
      ) : null}
    </div>
  );
}
