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
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { INCLUDED_INGREDIENT_TAB, getIngredientTabDisplayLabel, ingredientMatchesTab, isSingleSelectIngredientTab, resolveIngredientTabs } from "@/lib/ingredientTabs";


function format(n?: number, suffix = "") {
  return n === undefined || n === null || Number.isNaN(n) ? `—${suffix}` : `${n}${suffix}`;
}

const toNumber = (value?: number) => value ?? 0;

function calToProteinRatio(calories?: number, protein?: number) {
  if (calories === undefined || protein === undefined || protein === 0) return "—";
  return `${Math.round(calories / protein)}:1`;
}

function formatDelta(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}

const addonSectionTitles: Record<AddonRef, string> = {
  sauces: "Sauces",
  dressings: "Dressings",
  condiments: "Condiments",
};

function normalizeIngredientToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export type ResolvedPanelIngredient = {
  id: string;
  label: string;
  icon: string;
  ingredientItem?: IngredientItem;
  maxQuantity?: number;
  nutrition: Nutrition;
  calories?: number;
  defaultCount: number;
};

export type ResolvedIngredientTab = {
  id: string;
  label: string;
  ingredients: ResolvedPanelIngredient[];
};

export function resolvePanelIngredients(
  item: MenuItem,
  ingredientItems: IngredientItem[] = [],
  addons?: RestaurantAddons,
  menuItems: MenuItem[] = [],
  variants?: ItemVariant[] | null,
  selectedVariantId?: string,
  customizationRules?: RestaurantCustomizationRules
): ResolvedPanelIngredient[] {
  const tabs = resolvePanelIngredientTabs(
    item,
    ingredientItems,
    addons,
    menuItems,
    variants,
    selectedVariantId,
    customizationRules
  );

  const ingredientMap = new Map<string, ResolvedPanelIngredient>();
  tabs.forEach((tab) => {
    tab.ingredients.forEach((ingredient) => {
      if (!ingredientMap.has(ingredient.id)) {
        ingredientMap.set(ingredient.id, ingredient);
      }
    });
  });

  return [...ingredientMap.values()];
}

export function resolvePanelIngredientTabs(
  item: MenuItem,
  ingredientItems: IngredientItem[] = [],
  addons?: RestaurantAddons,
  menuItems: MenuItem[] = [],
  variants?: ItemVariant[] | null,
  selectedVariantId?: string,
  customizationRules?: RestaurantCustomizationRules
): ResolvedIngredientTab[] {
  const ingredientIds = item.ingredients ?? [];
  const includedIngredientIds = new Set(ingredientIds.map((ingredientId) => ingredientId.toLowerCase()));
  const resolvedTabs = resolveIngredientTabs(item, customizationRules);

  const ingredientByIdLookup = new Map<string, IngredientItem>();
  const ingredientByNameLookup = new Map<string, IngredientItem>();
  const addonLookup = new Map<string, AddonOption>();
  const menuItemByIdLookup = new Map<string, MenuItem>();
  const menuItemByNameLookup = new Map<string, MenuItem>();
  const resolvedIngredientLookup = new Map<string, ResolvedPanelIngredient>();

  ingredientItems.forEach((entry) => {
    if (entry.id) ingredientByIdLookup.set(entry.id.toLowerCase(), entry);
    ingredientByNameLookup.set(normalizeIngredientToken(entry.name), entry);
  });

  Object.values(addons ?? {}).forEach((addonGroup) => {
    addonGroup?.forEach((addon) => {
      addonLookup.set(addon.name.toLowerCase(), addon);
    });
  });

  menuItems.forEach((menuItem) => {
    if (menuItem.id) menuItemByIdLookup.set(menuItem.id.toLowerCase(), menuItem);
    menuItemByNameLookup.set(normalizeIngredientToken(menuItem.name), menuItem);
  });

  function getResolvedIngredient(ingredientId: string, explicitIngredientItem?: IngredientItem) {
    const normalizedId = ingredientId.toLowerCase();
    const existing = resolvedIngredientLookup.get(normalizedId);
    if (existing) {
      return existing;
    }

    const fallbackLabel = ingredientId
      .split(/[-_]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

    const match =
      explicitIngredientItem ??
      ingredientByIdLookup.get(ingredientId.toLowerCase()) ??
      ingredientByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      ingredientByNameLookup.get(normalizeIngredientToken(fallbackLabel));
    const menuItemMatch =
      menuItemByIdLookup.get(ingredientId.toLowerCase()) ??
      menuItemByNameLookup.get(normalizeIngredientToken(ingredientId)) ??
      menuItemByNameLookup.get(normalizeIngredientToken(fallbackLabel));

    const label = menuItemMatch?.name ?? match?.name ?? fallbackLabel;
    const addonMatch = addonLookup.get(label.toLowerCase());
    const nutrition =
      menuItemMatch?.nutrition ??
      match?.nutrition ?? {
        calories: addonMatch?.calories,
        protein: addonMatch?.protein,
        carbs: addonMatch?.carbs,
        totalFat: addonMatch?.totalFat ?? addonMatch?.fat,
        satFat: addonMatch?.satFat,
        transFat: addonMatch?.transFat,
        cholesterol: addonMatch?.cholesterol,
        sodium: addonMatch?.sodium,
        fiber: addonMatch?.fiber,
        sugars: addonMatch?.sugars,
      };

    const resolvedIngredient = {
      id: ingredientId,
      label,
      icon: match?.image ?? menuItemMatch?.image ?? addonMatch?.image ?? "🥣",
      ingredientItem: match,
      maxQuantity: match?.maxQuantity,
      nutrition,
      calories: nutrition.calories,
      defaultCount: includedIngredientIds.has(normalizedId) ? 1 : 0,
    };

    resolvedIngredientLookup.set(normalizedId, resolvedIngredient);
    return resolvedIngredient;
  }

  return resolvedTabs.map((tab) => {
    const tabIngredients =
      tab === INCLUDED_INGREDIENT_TAB
        ? ingredientIds.map((ingredientId) => getResolvedIngredient(ingredientId))
        : ingredientItems
            .filter((ingredient) => ingredientMatchesTab(ingredient, tab))
            .map((ingredient) => getResolvedIngredient(ingredient.id ?? ingredient.name, ingredient));

    const uniqueTabIngredients = tabIngredients.filter((ingredient, index) => {
      return tabIngredients.findIndex((candidate) => candidate.id === ingredient.id) === index;
    });

    return {
      id: normalizeIngredientToken(tab),
      label: tab,
      ingredients: uniqueTabIngredients,
    };
  });
}

function sortByCalories(addons: AddonOption[]) {
  return [...addons].sort((a, b) => toNumber(a.calories) - toNumber(b.calories));
}

function formatSummaryDetail(name: string, calories: number) {
  return `• ${name} (${calories >= 0 ? "+" : ""}${calories}cal)`;
}


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
    ? `${className} my-3 flex flex-col items-center justify-between gap-4`
    : `${className} flex flex-col items-start justify-between gap-4`;

  return (
    <div className={wrapperClasses}>
      <div className={`text-lg font-semibold text-[rgba(0,0,0,0.8)] ${isTopLayout ? "w-full text-center" : ""}`}>
        Portion
      </div>
      <div
        className={isTopLayout ? "flex w-full flex-wrap justify-center gap-2" : "grid w-full grid-cols-3 gap-2"}
      >
        {variants.map((variant) => {
          const isActive = variant.id === selectedVariantId;
          const variantColorClasses = isActive
            ? "bg-black text-white"
            : "bg-transparent text-[rgba(0,0,0,0.6)]";

          return (
            <button
              key={variant.id}
              type="button"
              className={`${isTopLayout ? "min-w-[140px]" : "w-full"} cursor-pointer rounded-lg border-2 border-[rgba(0,0,0,0.6)] px-3 py-1.5 text-center text-[18px] font-bold ${variantColorClasses}`}
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
  onSelectSingleIngredientOption,
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
  onSelectSingleIngredientOption?: (ingredientId: string, ingredientIdsInTab: string[]) => void;
}) {
  const n = nutrition;
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

  const activeCustomizationTotals = customizationTotals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
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
  const selectedIngredientTab =
    ingredientTabs.find((tab) => tab.label === activeIngredientTab) ??
    availableIngredientTabs[0] ??
    ingredientTabs[0];
  const isSelectedIngredientTabSingleSelect = selectedIngredientTab
    ? isSingleSelectIngredientTab(selectedIngredientTab.label, customizationRules)
    : false;
  const shouldShowIngredientSection =
    ingredientTabs.length > 1 || (ingredientTabs[0]?.ingredients.length ?? 0) > 0;

  return (
    <div className="grid grid-cols-2 gap-3 rounded-[18px] bg-[#e0e0e0] px-3 py-2">
      {shouldShowIngredientSection && selectedIngredientTab ? (
        <section className="col-span-2 rounded-[14px] border border-black/12 bg-white p-5">
          <h2 className="mb-6 text-2xl font-bold">Ingredients</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {ingredientTabs.map((tab) => {
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
          {selectedIngredientTab.ingredients.length > 0 ? (
            <ul className="grid list-none grid-cols-2 items-stretch gap-[10px] pl-0">
              {selectedIngredientTab.ingredients.map((ingredient) => {
                const ingredientCount = selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
                const isSelected = ingredientCount > 0;
                const linkedSingleSelectTab =
                  selectedIngredientTab.label === INCLUDED_INGREDIENT_TAB
                    ? availableIngredientTabs.find(
                        (tab) =>
                          tab.label !== INCLUDED_INGREDIENT_TAB &&
                          isSingleSelectIngredientTab(tab.label, customizationRules) &&
                          tab.ingredients.some((candidate) => candidate.id === ingredient.id)
                      )
                    : undefined;
                const ingredientIdsInTab = selectedIngredientTab.ingredients.map((candidate) => candidate.id);
                const usesSelectableCard = isSelectedIngredientTabSingleSelect || Boolean(linkedSingleSelectTab);
                const cardClasses = `box-border flex h-full w-full flex-row items-center gap-3 rounded-[10px] border border-[rgba(0,0,0,0.15)] bg-[#f9f9f9] px-3 py-2 text-left ${isSelected ? "shadow-[inset_0_0_0_1px_#000000]" : ""} ${usesSelectableCard ? "cursor-pointer" : "cursor-default"}`;
                const cardContent = (
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
                      <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">{ingredient.label}</div>
                      <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">
                        {ingredient.calories !== undefined ? `${ingredient.calories} Cal` : "— Cal"}
                      </div>
                    </div>
                    {isSelectedIngredientTabSingleSelect ? (
                      <span
                        aria-hidden="true"
                        className={`ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.25)]"}`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${isSelected ? "bg-[#16a34a]" : "bg-transparent"}`}
                        />
                      </span>
                    ) : typeof ingredient.maxQuantity === "number" ? (
                      <div className="ml-auto inline-flex items-center gap-[6px]">
                        {ingredientCount > 0 ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[rgba(0,0,0,0.35)] bg-white text-[18px] font-bold leading-none"
                              aria-label={`Remove one ${ingredient.label}`}
                              onClick={() => onDecrementIngredient?.(ingredient.id)}
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
                    ) : linkedSingleSelectTab ? (
                      <span className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center text-black/55" aria-hidden="true">
                        <ChevronRight size={22} />
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <li key={ingredient.id} className="flex">
                    {usesSelectableCard ? (
                      <button
                        type="button"
                        className={cardClasses}
                        onClick={() => {
                          if (isSelectedIngredientTabSingleSelect) {
                            onSelectSingleIngredientOption?.(ingredient.id, ingredientIdsInTab);
                            return;
                          }

                          if (linkedSingleSelectTab) {
                            setActiveIngredientTab(linkedSingleSelectTab.label);
                          }
                        }}
                      >
                        {cardContent}
                      </button>
                    ) : (
                      <div className={cardClasses}>{cardContent}</div>
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
                <div key={section.ref} className="min-w-0">
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
                    <ul className="mt-4 grid list-none grid-cols-2 items-stretch gap-[10px] pl-0">
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
                                className={`ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-[3px] border-[#16a34a]" : "border-2 border-[rgba(0,0,0,0.25)]"}`}
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
                      <ul className="mt-4 grid list-none grid-cols-2 items-stretch gap-[10px] pl-0">
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

      {displayMode === "full" ? <section className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-5">
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
            {showCustomizationDeltas ? <span className="text-sm font-bold text-[#16a34a]">{formatDelta(activeCustomizationTotals.fat, "g")}</span> : null}
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
      </section> : null}

      {displayMode === "full" ? <section className="rounded-2xl border border-[rgba(0,0,0,0.15)] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">Details</h2>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-[rgba(0,0,0,0.8)]">Category</div>
          <div className="rounded-full border-2 border-[rgba(0,0,0,0.8)] px-3 py-1 text-lg font-extrabold">{item.categories?.join(", ") ?? "—"}</div>
        </div>

        <div className="mt-3 h-px bg-[rgba(0,0,0,0.2)]" />

        <div className="mt-4 flex items-center justify-between gap-[14px]">
          <div className="text-lg font-semibold text-[rgba(0,0,0,0.8)]">Cal to Protein Ratio</div>
          <div className="text-lg font-semibold">
            {calToProteinRatio(n.calories, n.protein)}
          </div>
        </div>

        {showVariantsInDetails ? (
          <>
            <div className="mt-3 h-px bg-[rgba(0,0,0,0.2)]" />
            <PortionSelector
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={onSelectVariant}
              layout="details"
            />
          </>
        ) : null}


        {item.restaurant ? (
          <>
            <div className="mt-3 h-px bg-[rgba(0,0,0,0.2)]" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-4 font-semibold text-[rgba(0,0,0,0.8)]">Restaurant</div>
              <div className="text-4 font-semibold">{item.restaurant}</div>
            </div>
          </>
        ) : null}

      </section> : null}
    </div>
  );
}
