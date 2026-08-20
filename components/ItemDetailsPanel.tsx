import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import type {
  IngredientItem,
  ItemVariant,
  MenuItem,
  ResolvedAddonGroups,
  RestaurantCustomizationRules,
} from "@/types/menu";
import type { CoreMacros, Nutrition } from "@/types/nutrition";
import {
  ChevronDown,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import {
  INCLUDED_INGREDIENT_TAB,
  getIngredientTabDisplayLabel,
} from "@/lib/ingredientTabs";
import { gramMacroOrder, macroDisplayConfig } from "@/components/nutrition/macroDisplay";
import {
  normalizeIngredientCategory,
  normalizeIngredientToken,
  sortByCalories,
  formatSummaryDetail,
  toNumber,
} from "@/lib/itemDetails/helpers";
import {
  type ResolvedIngredientTab,
  resolvePanelIngredientTabs,
  resolvePanelIngredients,
} from "@/lib/itemDetails/ingredientResolution";
import type { ResolvedPanelIngredient } from "@/lib/itemDetails/types";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";
import {
  NutritionDetailsGrid,
  SelectionSummaryShell,
} from "@/components/item-route-modal/SelectionSummaryPanels";

export { resolvePanelIngredients, resolvePanelIngredientTabs };
export { MacroInlineSummary };

// DOM anchors for the cart page's "jump straight to this section" shortcuts
// (see ItemRouteModal's initialScrollSectionId) — the only stable handles
// onto these sections from outside this file, since none of them otherwise
// expose an id/ref.
export const ITEM_DETAILS_SECTION_IDS = {
  ingredients: "item-details-ingredients-section",
  side: "item-details-side-section",
  drink: "item-details-drink-section",
  sauces: "item-details-sauces-section",
  dressings: "item-details-dressings-section",
  // The Portion/Order Type controls actually live in ItemRouteModal's own
  // persistent overview header (outside this file's rendered sections), but
  // share this same scroll-target registry so the Preview state's shortcut
  // buttons can reuse the identical handleOpenCartPreviewSection plumbing
  // the other section cards already use.
  portion: "item-details-portion-section",
  orderType: "item-details-order-type-section",
} as const;

function formatPortionBadge(count: number) {
  if (count === 0.5) return "1/2x";
  if (Number.isInteger(count)) return `${count}x`;
  return `${count.toFixed(1)}x`;
}

function MacroInlineSummary({
  calories,
  protein,
  carbs,
  totalFat,
  className = "",
}: {
  calories?: number;
  protein?: number;
  carbs?: number;
  totalFat?: number;
  className?: string;
}) {
  const gramValues: Record<"protein" | "carbs" | "totalFat", number | undefined> = {
    protein,
    carbs,
    totalFat,
  };

  return (
    <p
      className={`flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs ${className}`}
    >
      <span className="font-medium text-slate-600">
        {calories !== undefined ? `${calories} Cal` : "— Cal"}
      </span>
      {gramMacroOrder.map((macroKey) => {
        const value = gramValues[macroKey];
        return (
          <span key={macroKey} className="whitespace-nowrap">
            <span className="text-black">· </span>
            <span
              className={`font-medium ${macroDisplayConfig[macroKey].valueClassNameByVariant.default}`}
            >
              {value !== undefined
                ? `${value}g ${macroDisplayConfig[macroKey].shortLabel}`
                : `—g ${macroDisplayConfig[macroKey].shortLabel}`}
            </span>
          </span>
        );
      })}
    </p>
  );
}

function isIconImage(icon: string) {
  return (
    icon.startsWith("/") ||
    icon.startsWith("http://") ||
    icon.startsWith("https://")
  );
}

// Included-tab-only status describing how a row currently compares to the
// item's default build: "included" (unchanged default), "customized"
// (default ingredient with an adjusted quantity), "replaced" (a swappable
// default, e.g. the bun, currently set to a different option), "removed"
// (a default that's been zeroed out or swapped to "None"), or "added" (not
// part of the default build, selected anyway). Undefined outside the
// Included tab, where the concept doesn't apply.
type IncludedStatus = "included" | "customized" | "replaced" | "removed" | "added";

type DisplayIngredient = ResolvedPanelIngredient & {
  displayCount: number;
  isSelected: boolean;
  shouldShowPortionBadge: boolean;
  portionBadge?: string;
  displayedCalories?: number;
  displayedProtein: number;
  displayedCarbs: number;
  displayedFat: number;
  linkedSingleSelectTab?: ResolvedIngredientTab;
  shouldShowSingleSelectNavigator: boolean;
  isSingleSelectTab: boolean;
  canToggleIngredientFromCard: boolean;
  includedStatus?: IncludedStatus;
};

type DisplayAddonSection = AvailableAddonSection & {
  summaryDetail: string;
  items: Array<{
    addon: MenuItem;
    sauceCount: number;
    isSelected: boolean;
    calories: number;
  }>;
};

function prepareAddonSections({
  item,
  addons,
  selectedAddons,
  sauceSelectionCounts,
}: {
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  selectedAddons?: Partial<Record<string, MenuItem>>;
  sauceSelectionCounts?: Partial<Record<string, number>>;
}): DisplayAddonSection[] {
  return (item.addonRefs ?? []).flatMap((ref) => {
    const group = addons?.[ref];
    if (!group || group.items.length === 0) return [];
    const sortedAddons = sortByCalories(group.items);
    const sauceSelections =
      ref === "sauces"
        ? sortedAddons.filter(
            (addon) =>
              addon.name !== "None" &&
              (sauceSelectionCounts?.[addon.name] ?? 0) > 0,
          )
        : [];
    const sauceSummaryCalories = sauceSelections.reduce(
      (sum, addon) =>
        sum +
        toNumber(addon.nutrition.calories) *
          (sauceSelectionCounts?.[addon.name] ?? 0),
      0,
    );
    const selectedAddon = selectedAddons?.[ref];
    return [
      {
        ref,
        title: group.label,
        addons: sortedAddons,
        maxPerItem: group.maxPerItem,
        summaryDetail:
          ref === "sauces"
            ? formatSummaryDetail(
                sauceSelections[0]?.name ?? "None",
                sauceSummaryCalories,
              )
            : formatSummaryDetail(
                selectedAddon?.name ?? "None",
                selectedAddon?.nutrition.calories ?? 0,
              ),
        items: sortedAddons.map((addon) => {
          const sauceCount =
            ref === "sauces" ? (sauceSelectionCounts?.[addon.name] ?? 0) : 0;
          return {
            addon,
            sauceCount,
            isSelected:
              ref === "sauces"
                ? sauceCount > 0
                : selectedAddons?.[ref]?.name === addon.name,
            calories: toNumber(addon.nutrition.calories),
          };
        }),
      },
    ];
  });
}

function prepareDisplayIngredients({
  ingredientTabs,
  selectedIngredientTab,
  selectedIngredientCounts,
  flattenIngredientList,
  isLockedIngredient,
}: {
  ingredientTabs: ResolvedIngredientTab[];
  selectedIngredientTab?: ResolvedIngredientTab;
  selectedIngredientCounts?: Partial<Record<string, number>>;
  flattenIngredientList: boolean;
  isLockedIngredient: (ingredientId: string) => boolean;
}): DisplayIngredient[] {
  const selectedCountFor = (ingredient: ResolvedPanelIngredient) =>
    selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
  const resolvedIngredients = (() => {
    if (!selectedIngredientTab) return [];
    if (flattenIngredientList) {
      return selectedIngredientTab.ingredients
        .filter((ingredient) => selectedCountFor(ingredient) > 0)
        .sort((left, right) => {
          const categoryPriority = (ingredient: ResolvedPanelIngredient) => {
            if (isLockedIngredient(ingredient.id)) return 0;
            const normalizedCategory = normalizeIngredientCategory(
              ingredient.ingredientItem?.categories?.[0] ?? "",
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
          if (leftPriority !== rightPriority)
            return leftPriority - rightPriority;
          const leftOrder =
            left.ingredientItem?.defaultOrder ?? Number.POSITIVE_INFINITY;
          const rightOrder =
            right.ingredientItem?.defaultOrder ?? Number.POSITIVE_INFINITY;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.label.localeCompare(right.label);
        });
    }
    if (selectedIngredientTab.label !== INCLUDED_INGREDIENT_TAB)
      return selectedIngredientTab.ingredients;

    const includedIngredients: Array<
      ResolvedPanelIngredient & { forcedIncludedStatus?: IncludedStatus }
    > = [];
    const includedIngredientIds = new Set<string>();
    const seenSingleSelectTabs = new Set<string>();
    selectedIngredientTab.ingredients.forEach((ingredient) => {
      const linkedIngredientTab = ingredientTabs.find(
        (tab) =>
          tab.label !== INCLUDED_INGREDIENT_TAB &&
          tab.ingredients.some((candidate) => candidate.id === ingredient.id),
      );
      const linkedIngredient = linkedIngredientTab?.ingredients.find(
        (candidate) => candidate.id === ingredient.id,
      );
      const linkedSingleSelectTab =
        linkedIngredientTab?.selectionMode === "single"
          ? linkedIngredientTab
          : undefined;
      if (!linkedSingleSelectTab) {
        includedIngredients.push(linkedIngredient ?? ingredient);
        includedIngredientIds.add(ingredient.id);
        return;
      }
      if (seenSingleSelectTabs.has(linkedSingleSelectTab.label)) return;
      seenSingleSelectTabs.add(linkedSingleSelectTab.label);
      const selectedIngredient = linkedSingleSelectTab.ingredients.find(
        (candidate) => selectedCountFor(candidate) > 0,
      );
      // Swapped away from every option in this tab (including the default)
      // down to "None" — keep the original default visible rather than
      // dropping the row, so the item's original build stays legible; its
      // count naturally resolves to 0 below, which reads as "removed".
      if (!selectedIngredient || selectedIngredient.isNoneOption) {
        includedIngredients.push({
          ...ingredient,
          tabLabel: linkedSingleSelectTab.label,
        });
        includedIngredientIds.add(ingredient.id);
        return;
      }
      const includedIngredient = {
        ...selectedIngredient,
        tabLabel: linkedSingleSelectTab.label,
        forcedIncludedStatus: (selectedIngredient.id !== ingredient.id
          ? "replaced"
          : undefined) as IncludedStatus | undefined,
      };
      includedIngredients.push(includedIngredient);
      includedIngredientIds.add(includedIngredient.id);
    });
    ingredientTabs.forEach((tab) => {
      if (tab.label === INCLUDED_INGREDIENT_TAB) return;
      if (tab.selectionMode === "single") {
        if (seenSingleSelectTabs.has(tab.label)) return;
        const selectedIngredient = tab.ingredients.find(
          (ingredient) => selectedCountFor(ingredient) > 0,
        );
        if (
          !selectedIngredient ||
          selectedIngredient.isNoneOption ||
          includedIngredientIds.has(selectedIngredient.id)
        )
          return;
        seenSingleSelectTabs.add(tab.label);
        includedIngredients.push({
          ...selectedIngredient,
          tabLabel: tab.label,
          forcedIncludedStatus: "added",
        });
        includedIngredientIds.add(selectedIngredient.id);
        return;
      }
      tab.ingredients.forEach((ingredient) => {
        if (
          selectedCountFor(ingredient) <= 0 ||
          includedIngredientIds.has(ingredient.id)
        )
          return;
        includedIngredients.push({ ...ingredient, forcedIncludedStatus: "added" });
        includedIngredientIds.add(ingredient.id);
      });
    });
    return includedIngredients;
  })();

  const isIncludedTab = selectedIngredientTab?.label === INCLUDED_INGREDIENT_TAB;

  return resolvedIngredients.map((ingredient) => {
    const displayCount = selectedCountFor(ingredient);
    const linkedSingleSelectTab = ingredient.tabLabel
      ? ingredientTabs.find(
          (tab) =>
            tab.label === ingredient.tabLabel && tab.selectionMode === "single",
        )
      : undefined;
    const shouldShowSingleSelectNavigator =
      isIncludedTab && Boolean(linkedSingleSelectTab);
    const forcedIncludedStatus = (
      ingredient as { forcedIncludedStatus?: IncludedStatus }
    ).forcedIncludedStatus;
    const includedStatus: IncludedStatus | undefined = isIncludedTab
      ? (forcedIncludedStatus ??
        (displayCount === 0
          ? "removed"
          : displayCount !== ingredient.defaultCount
            ? "customized"
            : "included"))
      : undefined;
    return {
      ...ingredient,
      displayCount,
      isSelected: displayCount > 0,
      shouldShowPortionBadge: displayCount > 0 && displayCount !== 1,
      portionBadge:
        displayCount > 0 && displayCount !== 1
          ? formatPortionBadge(displayCount)
          : undefined,
      displayedCalories:
        ingredient.calories !== undefined
          ? Math.round(
              ingredient.calories * (displayCount > 0 ? displayCount : 1),
            )
          : undefined,
      displayedProtein: Math.round(
        ingredient.nutrition.protein * (displayCount > 0 ? displayCount : 1),
      ),
      displayedCarbs: Math.round(
        ingredient.nutrition.carbs * (displayCount > 0 ? displayCount : 1),
      ),
      displayedFat: Math.round(
        ingredient.nutrition.totalFat * (displayCount > 0 ? displayCount : 1),
      ),
      linkedSingleSelectTab,
      shouldShowSingleSelectNavigator,
      isSingleSelectTab: selectedIngredientTab?.selectionMode === "single",
      canToggleIngredientFromCard:
        !isLockedIngredient(ingredient.id) &&
        !shouldShowSingleSelectNavigator &&
        typeof ingredient.maxQuantity === "number",
      includedStatus,
    };
  });
}

export function PortionSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  className = "mt-4",
  layout = "details",
  id,
}: {
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  className?: string;
  layout?: "top" | "details";
  // Scroll target for the Preview state's Portion shortcut button — only
  // meaningful for the "top" layout (ItemRouteModal's overview header); the
  // "details" layout's own Meal Details card has no equivalent shortcut.
  id?: string;
}) {
  if (!variants || variants.length === 0) return null;

  if (layout === "top") {
    return (
      <div id={id} className={className}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Portion
        </p>
        <div
          role="radiogroup"
          aria-label="Portion"
          className="mt-1.5 grid w-full auto-cols-fr grid-flow-col gap-1 rounded-full bg-slate-100 p-1"
        >
          {variants.map((variant) => {
            const isActive = variant.id === selectedVariantId;

            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onSelectVariant?.(variant.id)}
                className={`box-border flex h-9 min-w-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border px-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:px-3 sm:text-sm ${
                  isActive
                    ? "border-transparent bg-accent-strong text-white/95 shadow-sm"
                    : "border-transparent text-slate-500 hover:bg-white/70 active:bg-white"
                }`}
              >
                {variant.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-2`}>
      <div className="text-base font-semibold uppercase tracking-wide text-neutral-500">
        Portion
      </div>
      <div className="grid w-full grid-flow-col auto-cols-fr gap-2">
        {variants.map((variant) => {
          const isActive = variant.id === selectedVariantId;
          const variantColorClasses = isActive
            ? "border-blue-500 bg-blue-50 text-slate-700 shadow-[0_8px_20px_rgba(37,99,235,0.18)]"
            : "border-slate-200 bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50";

          return (
            <button
              key={variant.id}
              type="button"
              className={`w-full cursor-pointer rounded-2xl border px-5 py-2.5 text-center text-sm font-bold transition-all duration-150 ${variantColorClasses}`}
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

type AvailableAddonSection = {
  ref: string;
  title: string;
  addons: MenuItem[];
  maxPerItem?: number;
};

type VariantConfig = {
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  showInDetails: boolean;
};

type MealDetailItem = {
  id: string;
  name: string;
  quantity: number;
  image?: string;
  // Display-only — a meaningful size/portion variant label (e.g. "Medium",
  // "Extra"), never a generic role name like "Main Item"/"Side"/"Drink".
  // Meal Details is a read-only summary; changing a size/portion happens
  // through the item's own selector (variantConfig) or the combo side/drink
  // picker (ComboCustomizationSection), not from this list.
  variantLabel?: string;
};

type IngredientConfig = {
  onCustomize?: () => void;
  flattenList: boolean;
  isIncludedTab: boolean;
  visibleTabs: ResolvedIngredientTab[];
  selectedTab: ResolvedIngredientTab;
  setActiveTab: Dispatch<SetStateAction<string>>;
  displayIngredients: DisplayIngredient[];
  isLocked: (ingredientId: string) => boolean;
  navigateToSingleSelectTab: (
    ingredientId: string,
    linkedTab?: ResolvedIngredientTab,
  ) => void;
  onSelectSingle?: (ingredientId: string, ingredientIdsInTab: string[]) => void;
  onToggle?: (ingredientId: string) => void;
  onDecrement?: (ingredientId: string) => void;
  onIncrement?: (ingredientId: string) => void;
};

type IngredientCustomizationSectionProps = {
  config: IngredientConfig;
};

const includedStatusMeta: Record<
  IncludedStatus,
  { label: string; className: string }
> = {
  included: { label: "Included", className: "text-slate-400" },
  customized: {
    label: "Customized",
    className: "rounded-full bg-amber-50 px-2 py-0.5 text-amber-700",
  },
  replaced: {
    label: "Replaced",
    className: "rounded-full bg-amber-50 px-2 py-0.5 text-amber-700",
  },
  removed: {
    label: "Removed",
    className: "rounded-full bg-slate-100 px-2 py-0.5 text-slate-500",
  },
  added: {
    label: "Added",
    className: "rounded-full bg-accent-soft px-2 py-0.5 text-accent-strong",
  },
};

// "Cheeses" -> "No Cheese", "Sauces" -> "No Sauce" — just enough
// singularizing to read naturally for the common "-s" plural tab names in
// use today; worst case it leaves a trailing "s", which still reads fine.
function formatNoneOptionLabel(tabLabel: string) {
  return `No ${tabLabel.replace(/s$/i, "")}`;
}

function IngredientThumb({
  icon,
  size = 48,
}: {
  icon: string;
  size?: number;
}) {
  if (icon === "none") {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <X size={Math.round(size * 0.4)} strokeWidth={2.5} />
      </div>
    );
  }
  if (isIconImage(icon)) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-xl bg-slate-50"
        style={{ width: size, height: size }}
      >
        <Image src={icon} alt="" fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl bg-slate-50 text-xl"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

function QuantityStepper({
  count,
  maxQuantity,
  disabled,
  label,
  onIncrement,
  onDecrement,
  hideAddLabel = false,
  compact = false,
}: {
  count: number;
  maxQuantity: number;
  disabled?: boolean;
  label: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  hideAddLabel?: boolean;
  compact?: boolean;
}) {
  return (
      <div
          className="inline-flex shrink-0 items-center"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
      >
          {count > 0 ? (
              <div
                  className={`inline-flex shrink-0 items-center rounded-full border border-accent/25 bg-white shadow-sm ${
                      compact ? "h-6 gap-0.5 p-0.5" : "h-8 gap-1 p-1"
                  }`}
              >
                  <button
                      type="button"
                      onClick={onDecrement}
                      aria-label={`Remove one ${label}`}
                      disabled={disabled}
                      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-accent-soft text-slate-600 shadow-sm transition hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                          compact ? "h-5 w-5" : "h-6 w-6"
                      }`}
                  >
                      <Minus size={compact ? 10 : 12} strokeWidth={2.5} />
                  </button>
                  <span
                      className={`min-w-[1.25rem] text-center font-bold text-neutral-900 ${
                          compact ? "text-xs" : "text-sm"
                      }`}
                  >
                      {count}
                  </span>
                  <button
                      type="button"
                      onClick={onIncrement}
                      aria-label={`Add one more ${label}`}
                      disabled={count >= maxQuantity}
                      className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-accent-soft text-slate-600 shadow-sm transition hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50 disabled:cursor-not-allowed disabled:opacity-30 ${
                          compact ? "h-5 w-5" : "h-6 w-6"
                      }`}
                  >
                      <Plus size={compact ? 10 : 12} strokeWidth={2.5} />
                  </button>
              </div>
          ) : hideAddLabel ? (
              <button
                  type="button"
                  onClick={onIncrement}
                  aria-label={`Add ${label}`}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-accent-strong hover:text-accent-strong"
              >
                  <Plus size={14} strokeWidth={2.5} />
              </button>
          ) : (
              <>
                  <button
                      type="button"
                      onClick={onIncrement}
                      aria-label={`Add ${label}`}
                      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-accent-strong hover:text-accent-strong sm:hidden"
                  >
                      <Plus size={13} strokeWidth={2.5} />
                  </button>
                  <button
                      type="button"
                      onClick={onIncrement}
                      aria-label={`Add ${label}`}
                      className="hidden cursor-pointer items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-accent-strong hover:text-accent-strong sm:inline-flex sm:text-sm"
                  >
                      <Plus size={13} strokeWidth={2.5} />
                      Add
                  </button>
              </>
          )}
      </div>
  );
}

function IngredientCategoryTabs({
  visibleTabs,
  selectedTab,
  setActiveTab,
}: {
  visibleTabs: ResolvedIngredientTab[];
  selectedTab: ResolvedIngredientTab;
  setActiveTab: Dispatch<SetStateAction<string>>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState, visibleTabs.length]);

  return (
    <div className="relative min-w-0 mb-3 border-b border-black/[0.06] pb-3">
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Ingredient categories"
        onScroll={updateScrollState}
        className="hide-scrollbar flex min-w-0 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain"
      >
        {visibleTabs.map((tab) => {
          const isActive = tab.label === selectedTab.label;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? "bg-accent-soft text-accent-strong"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab(tab.label)}
            >
              {getIngredientTabDisplayLabel(tab.label)}
            </button>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 bottom-3 left-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-150 ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 right-0 bottom-3 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-150 ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function IngredientCustomizationSection({
  config,
}: IngredientCustomizationSectionProps) {
  const {
    onCustomize,
    flattenList,
    isIncludedTab,
    visibleTabs,
    selectedTab,
    setActiveTab,
    displayIngredients,
    isLocked,
    navigateToSingleSelectTab,
    onSelectSingle,
    onToggle,
    onDecrement,
    onIncrement,
  } = config;
  return (
    <section id={ITEM_DETAILS_SECTION_IDS.ingredients} className="min-w-0 overflow-x-hidden rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            Customize ingredients
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add, remove, or swap ingredients.
          </p>
        </div>
        {onCustomize ? (
          <button
            type="button"
            onClick={onCustomize}
            aria-label="Customize ingredients"
            className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {!flattenList && visibleTabs.length > 1 ? (
        <IngredientCategoryTabs
          visibleTabs={visibleTabs}
          selectedTab={selectedTab}
          setActiveTab={setActiveTab}
        />
      ) : null}
      {displayIngredients.length > 0 ? (
        <ul className="flex list-none flex-col divide-y divide-black/[0.06] pl-0">
          {displayIngredients.map((ingredient) => {
            const ingredientCount = ingredient.displayCount;
            const isSelected = ingredient.isSelected;
            const displayedCalories = ingredient.displayedCalories;
            const linkedSingleSelectTab = ingredient.linkedSingleSelectTab;
            const shouldShowSingleSelectNavigator =
              ingredient.shouldShowSingleSelectNavigator;
            const isSingleSelectTab = ingredient.isSingleSelectTab;
            const canToggleIngredientFromCard =
              ingredient.canToggleIngredientFromCard;
            const includedStatus = ingredient.includedStatus;
            const isRemoved = includedStatus === "removed";
            const hasQuantityControl =
              !shouldShowSingleSelectNavigator &&
              typeof ingredient.maxQuantity === "number";
            const displayLabel = ingredient.isNoneOption
              ? formatNoneOptionLabel(selectedTab.label)
              : ingredient.label;

            const nameAndMeta = (
              <div className="min-w-0 flex-1">
                <p
                  className={`line-clamp-2 break-words text-sm font-semibold sm:line-clamp-1 sm:truncate sm:text-base ${
                    isRemoved
                      ? "text-slate-400 line-through decoration-slate-300"
                      : "text-neutral-900"
                  }`}
                >
                  {displayLabel}
                </p>
                <MacroInlineSummary
                  calories={displayedCalories}
                  protein={ingredient.displayedProtein}
                  carbs={ingredient.displayedCarbs}
                  totalFat={ingredient.displayedFat}
                  className={`mt-0.5 ${isRemoved ? "opacity-50" : ""}`}
                />
                {(ingredient.shouldShowPortionBadge && !hasQuantityControl) ||
                includedStatus ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    {ingredient.shouldShowPortionBadge && !hasQuantityControl ? (
                      <span className="font-semibold text-slate-400">
                        {ingredient.portionBadge}
                      </span>
                    ) : null}
                    {includedStatus ? (
                      <span
                        className={`font-semibold ${includedStatusMeta[includedStatus].className}`}
                      >
                        {includedStatusMeta[includedStatus].label}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {hasQuantityControl && ingredientCount > 0 && !isSingleSelectTab ? (
                  <div
                    className="mt-2 flex justify-end sm:hidden"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <QuantityStepper
                      count={ingredientCount}
                      maxQuantity={ingredient.maxQuantity as number}
                      disabled={isLocked(ingredient.id)}
                      label={ingredient.label}
                      onIncrement={() => onIncrement?.(ingredient.id)}
                      onDecrement={() => onDecrement?.(ingredient.id)}
                      compact
                    />
                  </div>
                ) : null}
                {shouldShowSingleSelectNavigator ? (
                  <div className="mt-1.5 flex justify-end sm:hidden">
                    <button
                      type="button"
                      aria-label={`${isRemoved ? "Restore" : "Change"} ${ingredient.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigateToSingleSelectTab(
                          ingredient.id,
                          linkedSingleSelectTab,
                        );
                      }}
                      className="inline-flex cursor-pointer items-center gap-0.5 rounded-full py-1.5 pr-2 pl-0 text-xs font-semibold text-slate-500 transition hover:text-neutral-900"
                    >
                      {isRemoved ? "Add back" : "Change"}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            );

            if (isSingleSelectTab) {
              return (
                <li key={ingredient.id} className="flex py-1">
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-2 py-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 sm:px-3 ${
                      isSelected
                        ? "border-[1.5px] border-accent bg-white"
                        : "border-black/10 bg-white hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                    }`}
                    onClick={() =>
                      onSelectSingle?.(
                        ingredient.id,
                        selectedTab.ingredients.map(
                          (candidate) => candidate.id,
                        ),
                      )
                    }
                  >
                    <IngredientThumb icon={ingredient.icon} />
                    {nameAndMeta}
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                        isSelected ? "border-accent-strong" : "border-slate-300"
                      }`}
                    >
                      {isSelected ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-accent-strong" />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            }

            const rowContent = (
              <>
                <IngredientThumb icon={ingredient.icon} />
                {nameAndMeta}
                {shouldShowSingleSelectNavigator ? (
                  <button
                    type="button"
                    aria-label={`${isRemoved ? "Restore" : "Change"} ${ingredient.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigateToSingleSelectTab(
                        ingredient.id,
                        linkedSingleSelectTab,
                      );
                    }}
                    className="hidden shrink-0 cursor-pointer items-center gap-0.5 rounded-full py-1.5 pr-2 pl-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-neutral-900 sm:inline-flex sm:text-sm"
                  >
                    {isRemoved ? "Add back" : "Change"}
                    <ChevronRight size={14} />
                  </button>
                ) : hasQuantityControl ? (
                  <div
                    className={
                      ingredientCount > 0
                        ? "hidden shrink-0 sm:block"
                        : "shrink-0"
                    }
                  >
                    <QuantityStepper
                      count={ingredientCount}
                      maxQuantity={ingredient.maxQuantity as number}
                      disabled={isLocked(ingredient.id)}
                      label={ingredient.label}
                      onIncrement={() => onIncrement?.(ingredient.id)}
                      onDecrement={() => onDecrement?.(ingredient.id)}
                    />
                  </div>
                ) : null}
              </>
            );

            const isRowInteractive =
              shouldShowSingleSelectNavigator || canToggleIngredientFromCard;
            const isActiveSelectedRow = isSelected && !isIncludedTab;

            return (
              <li key={ingredient.id} className="flex py-1">
                <div
                  className={`flex w-full items-start gap-3 rounded-xl border px-2 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 sm:items-center sm:px-3 ${
                    isActiveSelectedRow
                      ? "border-[1.5px] border-accent bg-white"
                      : `border-black/10 bg-white ${isRowInteractive ? "hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]" : ""}`
                  } ${isRowInteractive ? "cursor-pointer" : ""}`}
                  role={isRowInteractive ? "button" : undefined}
                  tabIndex={isRowInteractive ? 0 : undefined}
                  onClick={() => {
                    if (shouldShowSingleSelectNavigator) {
                      navigateToSingleSelectTab(
                        ingredient.id,
                        linkedSingleSelectTab,
                      );
                      return;
                    }

                    if (canToggleIngredientFromCard) {
                      onToggle?.(ingredient.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    if (shouldShowSingleSelectNavigator) {
                      event.preventDefault();
                      navigateToSingleSelectTab(
                        ingredient.id,
                        linkedSingleSelectTab,
                      );
                      return;
                    }

                    if (canToggleIngredientFromCard) {
                      event.preventDefault();
                      onToggle?.(ingredient.id);
                    }
                  }}
                >
                  {rowContent}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-black/10 bg-slate-50 px-4 py-6 text-sm font-medium text-slate-500">
          No ingredients available in this tab.
        </div>
      )}
    </section>
  );
}

type ComboConfig = {
  sides: MenuItem[];
  drinks: MenuItem[];
  selectedSideId?: string;
  selectedDrinkId?: string;
  selectedSideVariantId?: string;
  selectedDrinkVariantId?: string;
  onSelectSide?: (itemId: string) => void;
  onSelectDrink?: (itemId: string) => void;
  onSelectSideVariant?: (variantId: string) => void;
  onSelectDrinkVariant?: (variantId: string) => void;
};

type ComboCustomizationSectionProps = {
  config: ComboConfig;
};

function ComboOptionRow({
  item,
  isSelected,
  selectedVariantId,
  onSelect,
  onSelectVariant,
}: {
  item: MenuItem;
  isSelected: boolean;
  selectedVariantId?: string;
  onSelect?: (itemId: string) => void;
  onSelectVariant?: (variantId: string) => void;
}) {
  const itemId = item.id ?? item.name;
  const variants = item.variants ?? [];
  const activeVariant =
    isSelected && variants.length > 0
      ? variants.find(
          (variant) =>
            (selectedVariantId ?? item.defaultVariantId ?? variants[0]?.id) ===
            variant.id,
        )
      : undefined;
  const activeNutrition = activeVariant?.nutrition ?? item.nutrition;
  const calories = activeNutrition.calories;
  const protein = activeNutrition.protein;
  const carbs = activeNutrition.carbs;
  const fat = activeNutrition.totalFat;

  return (
    <li className="flex py-1">
      <div
        className={`flex w-full flex-1 flex-col overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 ${
          isSelected
            ? "border-[1.5px] border-accent bg-white"
            : "border-black/10 bg-white hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
        }`}
      >
        <button
          type="button"
          className="flex w-full flex-1 cursor-pointer items-center gap-3 px-2 py-2.5 text-left sm:px-3"
          onClick={() => onSelect?.(itemId)}
        >
          <IngredientThumb icon={item.image ?? ""} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words text-sm font-semibold text-neutral-900 sm:line-clamp-1 sm:truncate sm:text-base">
              {item.name}
            </p>
            <MacroInlineSummary
              calories={calories}
              protein={protein}
              carbs={carbs}
              totalFat={fat}
              className="mt-0.5"
            />
          </div>
          <span
            aria-hidden="true"
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
              isSelected ? "border-accent-strong" : "border-slate-300"
            }`}
          >
            {isSelected ? (
              <span className="h-2.5 w-2.5 rounded-full bg-accent-strong" />
            ) : null}
          </span>
        </button>
        {isSelected && variants.length > 0 ? (
          <div className="flex w-full flex-wrap gap-1.5 px-2 pb-2.5 pl-[52px] sm:px-3 sm:pl-[60px]">
            <div className="inline-flex w-fit items-center gap-0.5 rounded-full bg-black/5 p-0.5">
              {variants.map((variant) => {
                const isVariantSelected =
                  (selectedVariantId ?? item.defaultVariantId ?? variants[0]?.id) ===
                  variant.id;
                return (
                  <button
                    key={`${itemId}-${variant.id}`}
                    type="button"
                    className={`inline-flex min-h-[30px] cursor-pointer items-center justify-center rounded-full px-3 py-[1px] text-[11px] font-semibold transition md:min-h-0 md:px-3.5 md:py-[5px] ${
                      isVariantSelected
                        ? "bg-white text-black shadow-sm"
                        : "text-black/50 hover:text-black/70"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectVariant?.(variant.id);
                    }}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function SauceOptionRow({
  addon,
  sauceCount,
  isSelected,
  calories,
  onToggleSauce,
  onIncrementSauce,
  onDecrementSauce,
}: {
  addon: MenuItem;
  sauceCount: number;
  isSelected: boolean;
  calories: number;
  onToggleSauce?: (addon: MenuItem) => void;
  onIncrementSauce?: (addon: MenuItem) => void;
  onDecrementSauce?: (addon: MenuItem) => void;
}) {
  const isNoneOption = addon.name === "None";
  return (
    <li className="flex py-1">
      <div
        role="button"
        tabIndex={0}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-2 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 sm:items-center sm:px-3 ${
          isSelected
            ? "border-[1.5px] border-accent bg-white"
            : "border-black/10 bg-white hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
        }`}
        onClick={() => onToggleSauce?.(addon)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onToggleSauce?.(addon);
        }}
      >
        <IngredientThumb icon={addon.image} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-sm font-semibold text-neutral-900 sm:line-clamp-1 sm:truncate sm:text-base">
            {addon.name}
          </p>
          <MacroInlineSummary
            calories={calories}
            protein={addon.nutrition.protein}
            carbs={addon.nutrition.carbs}
            totalFat={addon.nutrition.totalFat}
            className="mt-0.5"
          />
          {!isNoneOption && sauceCount > 0 ? (
            <div
              className="mt-2 flex justify-end sm:hidden"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <QuantityStepper
                count={sauceCount}
                maxQuantity={Number.POSITIVE_INFINITY}
                label={addon.name}
                hideAddLabel
                compact
                onIncrement={() => onIncrementSauce?.(addon)}
                onDecrement={() => onDecrementSauce?.(addon)}
              />
            </div>
          ) : null}
        </div>
        {!isNoneOption ? (
          <div
            className={
              sauceCount > 0 ? "hidden shrink-0 sm:block" : "shrink-0"
            }
          >
            <QuantityStepper
              count={sauceCount}
              maxQuantity={Number.POSITIVE_INFINITY}
              label={addon.name}
              hideAddLabel
              onIncrement={() => onIncrementSauce?.(addon)}
              onDecrement={() => onDecrementSauce?.(addon)}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function SauceOptionList({
  items,
  onToggleSauce,
  onIncrementSauce,
  onDecrementSauce,
}: {
  items: Array<{
    addon: MenuItem;
    sauceCount: number;
    isSelected: boolean;
    calories: number;
  }>;
  onToggleSauce?: (addon: MenuItem) => void;
  onIncrementSauce?: (addon: MenuItem) => void;
  onDecrementSauce?: (addon: MenuItem) => void;
}) {
  const columnBreak = Math.ceil(items.length / 2);
  const columns = [items.slice(0, columnBreak), items.slice(columnBreak)];
  const hasSecondColumn = columns[1].length > 0;

  return (
    <div
      className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-x-6"
      style={
        hasSecondColumn
          ? { gridTemplateRows: `repeat(${columnBreak}, auto)` }
          : undefined
      }
    >
      {columns.map((columnItems, columnIndex) =>
        columnItems.length > 0 ? (
          <ul
            key={columnIndex}
            className={`flex list-none flex-col divide-y divide-black/[0.06] pl-0 ${
              columnIndex === 1 ? "border-t border-black/[0.06] sm:border-t-0" : ""
            }`}
            style={
              hasSecondColumn
                ? {
                    gridRow: `span ${columnBreak} / span ${columnBreak}`,
                    gridTemplateRows: "subgrid",
                  }
                : undefined
            }
          >
            {columnItems.map(({ addon, sauceCount, isSelected, calories }) => (
              <SauceOptionRow
                key={addon.id ?? addon.name}
                addon={addon}
                sauceCount={sauceCount}
                isSelected={isSelected}
                calories={calories}
                onToggleSauce={onToggleSauce}
                onIncrementSauce={onIncrementSauce}
                onDecrementSauce={onDecrementSauce}
              />
            ))}
          </ul>
        ) : null,
      )}
    </div>
  );
}

function ComboOptionList({
  items,
  selectedId,
  selectedVariantId,
  onSelect,
  onSelectVariant,
}: {
  items: MenuItem[];
  selectedId?: string;
  selectedVariantId?: string;
  onSelect?: (itemId: string) => void;
  onSelectVariant?: (variantId: string) => void;
}) {
  const columnBreak = Math.ceil(items.length / 2);
  const columns = [items.slice(0, columnBreak), items.slice(columnBreak)];
  const hasSecondColumn = columns[1].length > 0;

  return (
    <div
      className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-x-6"
      style={
        hasSecondColumn
          ? { gridTemplateRows: `repeat(${columnBreak}, auto)` }
          : undefined
      }
    >
      {columns.map((columnItems, columnIndex) =>
        columnItems.length > 0 ? (
          <ul
            key={columnIndex}
            className={`flex list-none flex-col divide-y divide-black/[0.06] pl-0 ${
              columnIndex === 1 ? "border-t border-black/[0.06] sm:border-t-0" : ""
            }`}
            style={
              hasSecondColumn
                ? {
                    gridRow: `span ${columnBreak} / span ${columnBreak}`,
                    gridTemplateRows: "subgrid",
                  }
                : undefined
            }
          >
            {columnItems.map((item) => {
              const itemId = item.id ?? item.name;
              return (
                <ComboOptionRow
                  key={itemId}
                  item={item}
                  isSelected={selectedId === itemId}
                  selectedVariantId={selectedVariantId}
                  onSelect={onSelect}
                  onSelectVariant={onSelectVariant}
                />
              );
            })}
          </ul>
        ) : null,
      )}
    </div>
  );
}

function ComboCustomizationSection({ config }: ComboCustomizationSectionProps) {
  const {
    sides,
    drinks,
    selectedSideId,
    selectedDrinkId,
    selectedSideVariantId,
    selectedDrinkVariantId,
    onSelectSide,
    onSelectDrink,
    onSelectSideVariant,
    onSelectDrinkVariant,
  } = config;
  return (
    <>
      <section id={ITEM_DETAILS_SECTION_IDS.side} className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            Choose a side
          </h2>
          <p className="mt-1 text-sm text-slate-500">Select one option.</p>
        </div>
        <ComboOptionList
          items={sides}
          selectedId={selectedSideId}
          selectedVariantId={selectedSideVariantId}
          onSelect={onSelectSide}
          onSelectVariant={onSelectSideVariant}
        />
      </section>
      <section id={ITEM_DETAILS_SECTION_IDS.drink} className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            Choose a drink
          </h2>
          <p className="mt-1 text-sm text-slate-500">Select one option.</p>
        </div>
        <ComboOptionList
          items={drinks}
          selectedId={selectedDrinkId}
          selectedVariantId={selectedDrinkVariantId}
          onSelect={onSelectDrink}
          onSelectVariant={onSelectDrinkVariant}
        />
      </section>
    </>
  );
}

type AddonConfig = {
  sections: DisplayAddonSection[];
  openState: Record<string, boolean>;
  setOpenState: Dispatch<SetStateAction<Record<string, boolean>>>;
  onToggleSauce?: (addon: MenuItem) => void;
  onSelectAddon?: (ref: string, addon?: MenuItem) => void;
  onDecrementSauce?: (addon: MenuItem) => void;
  onIncrementSauce?: (addon: MenuItem) => void;
};

type AddonCustomizationSectionProps = {
  config: AddonConfig;
};

function AddonCustomizationSection({ config }: AddonCustomizationSectionProps) {
  const {
    sections,
    openState,
    setOpenState,
    onToggleSauce,
    onSelectAddon,
    onDecrementSauce,
    onIncrementSauce,
  } = config;
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
      <div className="grid gap-4">
        {sections.map((section) => {
          const isAlwaysExpandedSection =
            section.ref === "sauces" || section.ref === "dressings";
          const sectionStateKey = `addon-${section.ref}`;
          const isSectionOpen = isAlwaysExpandedSection
            ? true
            : (openState[sectionStateKey] ?? true);
          const summaryDetail = section.summaryDetail;
          return (
            <div
              key={section.ref}
              className="min-w-0"
              id={
                section.ref === "sauces"
                  ? ITEM_DETAILS_SECTION_IDS.sauces
                  : section.ref === "dressings"
                    ? ITEM_DETAILS_SECTION_IDS.dressings
                    : undefined
              }
            >
              <div
                className={`flex min-h-[44px] w-full items-center justify-between gap-[10px] rounded-[10px] border-0 bg-transparent py-1 text-left ${
                  isAlwaysExpandedSection ? "" : "cursor-pointer"
                }`}
                role={isAlwaysExpandedSection ? undefined : "button"}
                tabIndex={isAlwaysExpandedSection ? undefined : 0}
                onClick={
                  isAlwaysExpandedSection
                    ? undefined
                    : () =>
                        setOpenState((prev) => ({
                          ...prev,
                          [sectionStateKey]: !(prev[sectionStateKey] ?? true),
                        }))
                }
                onKeyDown={
                  isAlwaysExpandedSection
                    ? undefined
                    : (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenState((prev) => ({
                            ...prev,
                            [sectionStateKey]: !(prev[sectionStateKey] ?? true),
                          }));
                        }
                      }
                }
              >
                <h3 className="m-0 text-lg font-bold text-neutral-900 sm:text-xl">
                  {section.title}
                  {!isSectionOpen ? (
                    <span className="text-[18px] font-semibold text-[rgba(0,0,0,0.5)]">
                      {" "}
                      {summaryDetail}
                    </span>
                  ) : null}
                </h3>
                {isAlwaysExpandedSection ? null : (
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 cursor-inherit items-center justify-center bg-white">
                      <ChevronDown
                        size={24}
                        className={`transition-transform ${isSectionOpen ? "rotate-180" : ""}`}
                      />
                    </span>
                  </div>
                )}
              </div>
              {isSectionOpen ? (
                section.ref === "sauces" ? (
                  <div className="mt-4">
                    <SauceOptionList
                      items={section.items}
                      onToggleSauce={onToggleSauce}
                      onIncrementSauce={onIncrementSauce}
                      onDecrementSauce={onDecrementSauce}
                    />
                  </div>
                ) : section.ref === "dressings" ? (
                  <div className="mt-4">
                    <ComboOptionList
                      items={section.items.map(({ addon }) => addon)}
                      selectedId={
                        section.items.find((entry) => entry.isSelected)?.addon
                          .id ??
                        section.items.find((entry) => entry.isSelected)?.addon
                          .name
                      }
                      onSelect={(itemId) => {
                        const target = section.items.find(
                          ({ addon }) => (addon.id ?? addon.name) === itemId,
                        )?.addon;
                        if (!target) return;
                        const isCurrentlySelected = section.items.some(
                          (entry) =>
                            entry.isSelected &&
                            (entry.addon.id ?? entry.addon.name) === itemId,
                        );
                        onSelectAddon?.(
                          section.ref,
                          isCurrentlySelected ? undefined : target,
                        );
                      }}
                    />
                  </div>
                ) : (
                  <ul className="mt-4 grid list-none grid-cols-1 items-stretch gap-[10px] pl-0 sm:grid-cols-2">
                    {section.items.map(({ addon, isSelected, calories }) => (
                      <li key={`${section.ref}-${addon.name}`} className="flex">
                        <button
                          type="button"
                          className={`box-border flex h-full w-full cursor-pointer flex-row items-center gap-3 rounded-[10px] border px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 ${
                            isSelected
                              ? "border-[1.5px] border-accent bg-white"
                              : "border-black/10 bg-white hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                          }`}
                          onClick={() => {
                            onSelectAddon?.(
                              section.ref,
                              isSelected ? undefined : addon,
                            );
                          }}
                        >
                          {addon.image === "none" ? (
                            <div
                              className={`grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black `}
                            >
                              ✕
                            </div>
                          ) : addon.image ? (
                            <div
                              className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black"
                              style={{ backgroundImage: `url(${addon.image})` }}
                            />
                          ) : (
                            <div className="grid h-[72px] w-[72px] min-w-[72px] place-items-center rounded-lg bg-cover bg-center text-[32px] font-bold text-black" />
                          )}
                          <div className="flex min-w-0 flex-col items-start justify-center gap-[6px]">
                            <div className="line-clamp-2 break-words text-left text-base font-bold leading-[1.2]">
                              {addon.name}
                            </div>
                            <div className="text-sm font-bold text-[rgba(0,0,0,0.5)]">
                              +{calories} Cal
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Scroll/height handling for this list lives entirely in the shared
// SelectionSummaryShell content wrapper this renders inside of (see
// SelectionSummaryPanels.tsx) — it deliberately has no max-height/overflow
// of its own, so there is exactly one scroll container per screen instead of
// a local one nested inside the shared one.
function MealDetailItemsList({ items }: { items: MealDetailItem[] }) {
  return (
    <ul className="flex list-none flex-col divide-y divide-black/[0.06] pl-0">
      {items.map((detailItem) => (
        <li
          key={detailItem.id}
          className="flex items-center gap-3 py-2.5"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
            {detailItem.image && detailItem.image !== "none" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detailItem.image}
                alt={detailItem.name}
                className="h-full w-full object-contain p-1"
              />
            ) : null}
          </div>
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900"
            title={`${detailItem.quantity}x ${detailItem.name}`}
          >
            {detailItem.quantity}x {detailItem.name}
          </p>
          {detailItem.variantLabel ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              {detailItem.variantLabel}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
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
  onCustomizeIngredients,
  quantityMultiplier = 1,
}: {
  item: MenuItem;
  nutrition: Nutrition;
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  addons?: ResolvedAddonGroups;
  ingredientItems?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
  selectedAddons?: Partial<Record<string, MenuItem>>;
  onSelectAddon?: (ref: string, addon?: MenuItem) => void;
  sauceSelectionCounts?: Partial<Record<string, number>>;
  onIncrementSauce?: (addon: MenuItem) => void;
  onDecrementSauce?: (addon: MenuItem) => void;
  onToggleSauce?: (addon: MenuItem) => void;
  customizationTotals?: CoreMacros;
  showCustomizationDeltas?: boolean;
  displayMode?: "full" | "addonsOnly";
  showVariantsInDetails?: boolean;
  selectedIngredientCounts?: Partial<Record<string, number>>;
  onIncrementIngredient?: (ingredientId: string) => void;
  onDecrementIngredient?: (ingredientId: string) => void;
  onToggleIngredient?: (ingredientId: string) => void;
  onSelectSingleIngredient?: (
    ingredientId: string,
    ingredientIdsInTab: string[],
  ) => void;
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
  onCustomizeIngredients?: () => void;
  quantityMultiplier?: number;
}) {
  const safeQuantityMultiplier = Math.max(quantityMultiplier ?? 1, 1);
  const scaleNutritionValue = (value?: number) =>
    value === undefined || Number.isNaN(value)
      ? undefined
      : Math.round(value * safeQuantityMultiplier);
  const n: Nutrition = {
    ...nutrition,
    calories: scaleNutritionValue(nutrition.calories) ?? 0,
    protein: scaleNutritionValue(nutrition.protein) ?? 0,
    carbs: scaleNutritionValue(nutrition.carbs) ?? 0,
    totalFat: scaleNutritionValue(nutrition.totalFat) ?? 0,
    satFat: scaleNutritionValue(nutrition.satFat),
    transFat: scaleNutritionValue(nutrition.transFat),
    cholesterol: scaleNutritionValue(nutrition.cholesterol),
    sodium: scaleNutritionValue(nutrition.sodium),
    fiber: scaleNutritionValue(nutrition.fiber),
    sugars: scaleNutritionValue(nutrition.sugars),
  };
  const selectedMainVariant = variants?.find(
    (variant) => variant.id === selectedVariantId,
  );
  const selectedMainItemImage = selectedMainVariant?.image ?? item.image;
  const [sectionOpenState, setSectionOpenState] = useState<
    Record<string, boolean>
  >({});

  const availableAddonSections = prepareAddonSections({
    item,
    addons,
    selectedAddons,
    sauceSelectionCounts,
  });
  const selectedComboSide = comboSides.find(
    (side) => (side.id ?? side.name) === selectedComboSideId,
  );
  const selectedComboDrink = comboDrinks.find(
    (drink) => (drink.id ?? drink.name) === selectedComboDrinkId,
  );
  const selectedComboSideVariant = selectedComboSide?.variants?.find(
    (variant) =>
      (selectedComboSideVariantId ??
        selectedComboSide.defaultVariantId ??
        selectedComboSide.variants?.[0]?.id) === variant.id,
  );
  const selectedComboDrinkVariant = selectedComboDrink?.variants?.find(
    (variant) =>
      (selectedComboDrinkVariantId ??
        selectedComboDrink.defaultVariantId ??
        selectedComboDrink.variants?.[0]?.id) === variant.id,
  );
  const selectedAddonItems = (
    Object.entries(selectedAddons ?? {}) as Array<
      [string, MenuItem | undefined]
    >
  )
    .filter(([, addon]) => Boolean(addon && addon.name !== "None"))
    .map(([, addon]) => ({
      id: `addon-${addon?.name}`,
      name: addon?.name ?? "",
      quantity: 1,
      image: addon?.image,
    }));
  const selectedSauceItems = Object.entries(sauceSelectionCounts ?? {})
    .filter(([name, count]) => name !== "None" && (count ?? 0) > 0)
    .map(([name, count]) => {
      const sauceCount = count ?? 0;
      const matchedSauce = addons?.sauces?.items.find(
        (addon) => addon.name === name,
      );
      return {
        id: `sauce-${name}`,
        name,
        quantity: sauceCount,
        image: matchedSauce?.image,
      };
    });

  const detailItems: MealDetailItem[] = [
    {
      id: `main-${item.id ?? item.name}`,
      name: item.name,
      quantity: 1,
      image: selectedMainItemImage,
      variantLabel: selectedMainVariant?.label,
    },
    ...(comboType === "combo-meal" && selectedComboSide
      ? [
          {
            id: `combo-side-${selectedComboSide.id ?? selectedComboSide.name}`,
            name: selectedComboSide.name,
            quantity: 1,
            image: selectedComboSide.image,
            variantLabel: selectedComboSideVariant?.label,
          },
        ]
      : []),
    ...(comboType === "combo-meal" && selectedComboDrink
      ? [
          {
            id: `combo-drink-${selectedComboDrink.id ?? selectedComboDrink.name}`,
            name: selectedComboDrink.name,
            quantity: 1,
            image: selectedComboDrink.image,
            variantLabel: selectedComboDrinkVariant?.label,
          },
        ]
      : []),
    ...selectedAddonItems,
    ...selectedSauceItems,
  ];

  const activeCustomizationTotals = {
    calories: Math.round(
      (customizationTotals?.calories ?? 0) * safeQuantityMultiplier,
    ),
    protein: Math.round(
      (customizationTotals?.protein ?? 0) * safeQuantityMultiplier,
    ),
    carbs: Math.round(
      (customizationTotals?.carbs ?? 0) * safeQuantityMultiplier,
    ),
    totalFat: Math.round(
      (customizationTotals?.totalFat ?? 0) * safeQuantityMultiplier,
    ),
  };
  const normalizedLockedIngredientIds = new Set(
    lockedIngredientIds.map((ingredientId) =>
      normalizeIngredientToken(ingredientId),
    ),
  );
  const isLockedIngredient = (ingredientId: string) =>
    normalizedLockedIngredientIds.has(normalizeIngredientToken(ingredientId));
  const ingredientTabs = resolvePanelIngredientTabs(
    item,
    ingredientItems,
    addons,
    menuItems,
    variants,
    selectedVariantId,
    customizationRules,
  );
  const [activeIngredientTab, setActiveIngredientTab] = useState(
    ingredientTabs[0]?.label ?? INCLUDED_INGREDIENT_TAB,
  );
  const availableIngredientTabs = ingredientTabs.filter(
    (tab) => tab.ingredients.length > 0,
  );
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
            return (
              list.findIndex((candidate) => candidate.id === ingredient.id) ===
              index
            );
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
    linkedTab?: (typeof ingredientTabs)[number],
  ) => {
    if (!linkedTab) return;

    onSelectSingleIngredient?.(
      ingredientId,
      linkedTab.ingredients.map((candidate) => candidate.id),
    );
    setActiveIngredientTab(linkedTab.label);
  };
  const displayIngredients = prepareDisplayIngredients({
    ingredientTabs,
    selectedIngredientTab,
    selectedIngredientCounts,
    flattenIngredientList,
    isLockedIngredient,
  });
  const shouldShowIngredientSection = flattenIngredientList
    ? (flattenedIngredientTab?.ingredients.some((ingredient) => {
        const ingredientCount =
          selectedIngredientCounts?.[ingredient.id] ?? ingredient.defaultCount;
        return ingredientCount > 0;
      }) ?? false)
    : availableIngredientTabs.length > 1 ||
      (availableIngredientTabs[0]?.ingredients.length ?? 0) > 0;
  const shouldShowComboSelections = comboType === "combo-meal";
  const hasBuildContent =
    shouldShowIngredientSection ||
    shouldShowComboSelections ||
    availableAddonSections.length > 0;
  const shouldShowInfoSection = displayMode === "full";

  const variantConfig: VariantConfig = {
    variants,
    selectedVariantId,
    onSelectVariant,
    showInDetails: showVariantsInDetails,
  };
  const ingredientConfig: IngredientConfig | undefined = selectedIngredientTab
    ? {
        onCustomize: onCustomizeIngredients,
        flattenList: flattenIngredientList,
        isIncludedTab: selectedIngredientTab.label === INCLUDED_INGREDIENT_TAB,
        visibleTabs: visibleIngredientTabs,
        selectedTab: selectedIngredientTab,
        setActiveTab: setActiveIngredientTab,
        displayIngredients,
        isLocked: isLockedIngredient,
        navigateToSingleSelectTab,
        onSelectSingle: onSelectSingleIngredient,
        onToggle: onToggleIngredient,
        onDecrement: onDecrementIngredient,
        onIncrement: onIncrementIngredient,
      }
    : undefined;
  const addonConfig: AddonConfig = {
    sections: availableAddonSections,
    openState: sectionOpenState,
    setOpenState: setSectionOpenState,
    onToggleSauce,
    onSelectAddon,
    onDecrementSauce,
    onIncrementSauce,
  };
  const comboConfig: ComboConfig = {
    sides: comboSides,
    drinks: comboDrinks,
    selectedSideId: selectedComboSideId,
    selectedDrinkId: selectedComboDrinkId,
    selectedSideVariantId: selectedComboSideVariantId,
    selectedDrinkVariantId: selectedComboDrinkVariantId,
    onSelectSide: onSelectComboSide,
    onSelectDrink: onSelectComboDrink,
    onSelectSideVariant: onSelectComboSideVariant,
    onSelectDrinkVariant: onSelectComboDrinkVariant,
  };
  return (
    <div className="grid gap-10">
      {hasBuildContent ? (
        <div className="grid gap-3 rounded-3xl bg-app-background p-3 sm:gap-4 sm:p-5">
          {shouldShowIngredientSection && ingredientConfig ? (
            <IngredientCustomizationSection config={ingredientConfig} />
          ) : null}

          {shouldShowComboSelections ? (
            <ComboCustomizationSection config={comboConfig} />
          ) : null}

          {addonConfig.sections.length > 0 ? (
            <AddonCustomizationSection config={addonConfig} />
          ) : null}
        </div>
      ) : null}

      {shouldShowInfoSection ? (
        <NutritionDetailsGrid
          nutritionFacts={
            <NutritionFactsPanel
              totals={n}
              showCustomizationDeltas={showCustomizationDeltas}
              activeCustomizationTotals={activeCustomizationTotals}
            />
          }
          details={
            <SelectionSummaryShell
              title="Meal Details"
              totals={{
                calories: n.calories ?? 0,
                protein: n.protein ?? 0,
                carbs: n.carbs ?? 0,
                totalFat: n.totalFat ?? 0,
              }}
            >
              {variantConfig.showInDetails ? (
                <>
                  <PortionSelector
                    variants={variantConfig.variants}
                    selectedVariantId={variantConfig.selectedVariantId}
                    onSelectVariant={variantConfig.onSelectVariant}
                    layout="details"
                    className="mt-0"
                  />
                  <div className="mt-3 h-px bg-black/10" />
                </>
              ) : null}

              <SectionEyebrow className="text-base text-neutral-500">
                Items
              </SectionEyebrow>
              <MealDetailItemsList items={detailItems} />
            </SelectionSummaryShell>
          }
        />
      ) : null}
    </div>
  );
}
