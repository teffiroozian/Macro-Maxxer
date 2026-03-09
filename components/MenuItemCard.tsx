"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AddonOption, AddonRef, CommonChange, MacroDelta, MenuItem, RestaurantAddons } from "@/types/menu";
import styles from "./MenuItemCard.module.css";
import { useCart } from "@/stores/cartStore";
import ItemDetailsPanel from "./ItemDetailsPanel";
import VariantSelector from "./VariantSelector";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function caloriesPerProtein(item: { calories: number; protein: number }) {
  if (!item.protein) return Number.POSITIVE_INFINITY;
  return item.calories / item.protein;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatMacro(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—g" : `${value}g`;
}

function formatCalories(value?: number) {
  return value === undefined || Number.isNaN(value) ? "—" : String(value);
}

function sumNutrition(base?: number, delta = 0) {
  if (base === undefined) return undefined;
  return base + delta;
}

function formatCommonChangeForCart(label: string) {
  const [firstSegment] = label.split("→");
  const normalized = firstSegment.trim();

  if (!normalized) {
    return label;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}


function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function addonFat(addon?: AddonOption) {
  return addon?.totalFat ?? addon?.fat ?? 0;
}

function deltaFat(change: CommonChange) {
  return change.delta.totalFat ?? change.delta.fat ?? 0;
}

function getApplicableCommonChanges(item: MenuItem, commonChanges?: CommonChange[]) {
  if (!commonChanges || commonChanges.length === 0) return [];
  const itemCategories = new Set(
    (item.categories ?? []).map((category) => normalizeCategory(category))
  );
  return commonChanges.filter((change) => {
    const categories = change.appliesTo?.categories;
    if (!categories || categories.length === 0) return false;
    return categories.some((category) => itemCategories.has(normalizeCategory(category)));
  });
}

const emptyAddon: AddonOption = {
  name: "None",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  image: "none",
};

const sauceRef: AddonRef = "sauces";
const maxSauceSelections = 5;

type CartConfigurationPayload = {
  variantId?: string;
  variantLabel?: string;
  image?: string;
  optionsLabel?: string;
  customizations?: string[];
  macrosPerItem: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

function parseOptionLabelCounts(optionsLabel?: string) {
  const counts: Record<string, number> = {};

  for (const rawSegment of (optionsLabel ?? "").split("+")) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    const match = segment.match(/^(.*?)(?:\s*x(\d+))?$/i);
    const name = match?.[1]?.trim() ?? segment;
    const quantity = Number(match?.[2] ?? "1");
    if (!name) continue;

    counts[name] = (counts[name] ?? 0) + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }

  return counts;
}

function getSelectedAddonsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  if (!optionsLabel) return {} as Partial<Record<AddonRef, AddonOption>>;

  const selectedCounts = parseOptionLabelCounts(optionsLabel);
  const selectedMap: Partial<Record<AddonRef, AddonOption>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (ref === sauceRef) continue;
    const options = addons?.[ref] ?? [];
    const matched = options.find((addon) => (selectedCounts[addon.name] ?? 0) > 0);
    if (matched) {
      selectedMap[ref] = matched;
    }
  }

  return selectedMap;
}

function getSelectedSauceCountsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  const selectedCounts = parseOptionLabelCounts(optionsLabel);
  const sauceOptions = addons?.[sauceRef] ?? [];

  if (!(item.addonRefs ?? []).includes(sauceRef) || sauceOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return sauceOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedCounts[addon.name] ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}

export default function MenuItemCard({
  restaurantId,
  item,
  rankIndex,
  showRatio = false,
  isTopRanked,
  addons,
  commonChanges,
  mode = "menu",
  cartQuantity = 1,
  onCartIncrement,
  onCartDecrement,
  cartSummaryLine,
  cartItemId,
  initialCartVariantId,
  initialCartOptionsLabel,
  initialCartCustomizations,
  onCartConfigurationChange,
  itemHref,
}: {
  restaurantId: string;
  item: MenuItem;
  rankIndex?: number;
  showRatio?: boolean;
  isTopRanked?: boolean;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  mode?: "menu" | "cart";
  cartQuantity?: number;
  onCartIncrement?: () => void;
  onCartDecrement?: () => void;
  cartSummaryLine?: string;
  cartItemId?: string;
  initialCartVariantId?: string;
  initialCartOptionsLabel?: string;
  initialCartCustomizations?: string[];
  onCartConfigurationChange?: (next: CartConfigurationPayload) => void;
  itemHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const id = useId();
  const variants = item.variants?.length ? item.variants : null;
  const hasVariantDropdown = Boolean(variants && variants.length > 1);
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(initialCartVariantId ?? defaultVariantId);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>(() =>
    mode === "cart" ? getSelectedAddonsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>(() =>
    mode === "cart" ? getSelectedSauceCountsFromLabel(item, addons, initialCartOptionsLabel) : {}
  );
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>([]);
  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const { items, addItem, updateQuantity } = useCart();
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const selectedItemImage = selectedVariant?.image ?? item.image;
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
  const applicableCommonChanges = useMemo(
    () => getApplicableCommonChanges(item, commonChanges),
    [item, commonChanges]
  );

  const selectedSauceOptions = useMemo(() => {
    const sauceOptions = addons?.[sauceRef] ?? [];
    return sauceOptions.flatMap((addon) => Array.from({ length: selectedSauceCounts[addon.name] ?? 0 }, () => addon));
  }, [addons, selectedSauceCounts]);

  const addonTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          fat: sum.fat + addonFat(addon),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [selectedAddons, selectedSauceOptions]
  );

  const addonNutritionTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          totalFat: sum.totalFat + addonFat(addon),
          satFat: sum.satFat + (addon?.satFat ?? 0),
          transFat: sum.transFat + (addon?.transFat ?? 0),
          cholesterol: sum.cholesterol + (addon?.cholesterol ?? 0),
          sodium: sum.sodium + (addon?.sodium ?? 0),
          fiber: sum.fiber + (addon?.fiber ?? 0),
          sugars: sum.sugars + (addon?.sugars ?? 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          totalFat: 0,
          satFat: 0,
          transFat: 0,
          cholesterol: 0,
          sodium: 0,
          fiber: 0,
          sugars: 0,
        }
      ),
    [selectedAddons, selectedSauceOptions]
  );

  const commonChangeTotals = useMemo(
    () =>
      applicableCommonChanges.reduce<MacroDelta>(
        (sum, change) => {
          if (!selectedCommonChangeIds.includes(change.id)) return sum;
          return {
            calories: sum.calories + change.delta.calories,
            protein: sum.protein + change.delta.protein,
            carbs: sum.carbs + change.delta.carbs,
            fat: sum.fat + deltaFat(change),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const customizationTotals = useMemo(
    () => ({
      calories: addonTotals.calories + commonChangeTotals.calories,
      protein: addonTotals.protein + commonChangeTotals.protein,
      carbs: addonTotals.carbs + commonChangeTotals.carbs,
      fat: addonTotals.fat + commonChangeTotals.fat,
    }),
    [addonTotals, commonChangeTotals]
  );

  const hasMods = useMemo(
    () =>
      Object.values(selectedAddons).some((addon) => addon && addon.name !== "None") ||
      Object.values(selectedSauceCounts).some((count) => count > 0) ||
      selectedCommonChangeIds.length > 0,
    [selectedAddons, selectedCommonChangeIds, selectedSauceCounts]
  );

  const hasActiveCustomization = hasMods;

  function resetMods() {
    setSelectedAddons({});
    setSelectedSauceCounts({});
    setSelectedCommonChangeIds([]);
  }

  function addNutritionValue(baseValue?: number, deltaValue?: number) {
    if (baseValue === undefined && deltaValue === undefined) return undefined;
    return (baseValue ?? 0) + (deltaValue ?? 0);
  }

  const nutrition = {
    ...baseNutrition,
    calories: sumNutrition(baseNutrition.calories, addonNutritionTotals.calories + commonChangeTotals.calories),
    protein: sumNutrition(baseNutrition.protein, addonNutritionTotals.protein + commonChangeTotals.protein),
    carbs: sumNutrition(baseNutrition.carbs, addonNutritionTotals.carbs + commonChangeTotals.carbs),
    totalFat: sumNutrition(baseNutrition.totalFat, addonNutritionTotals.totalFat + commonChangeTotals.fat),
    satFat: addNutritionValue(baseNutrition.satFat, addonNutritionTotals.satFat),
    transFat: addNutritionValue(baseNutrition.transFat, addonNutritionTotals.transFat),
    cholesterol: addNutritionValue(baseNutrition.cholesterol, addonNutritionTotals.cholesterol),
    sodium: addNutritionValue(baseNutrition.sodium, addonNutritionTotals.sodium),
    fiber: addNutritionValue(baseNutrition.fiber, addonNutritionTotals.fiber),
    sugars: addNutritionValue(baseNutrition.sugars, addonNutritionTotals.sugars),
  };

  const calories = nutrition.calories;
  const protein = nutrition.protein;
  const carbs = nutrition.carbs;
  const fat = nutrition.totalFat;

  const rankText = typeof rankIndex === "number" ? pad2(rankIndex + 1) : null;
  const isCartMode = mode === "cart";

  const ratio = Math.round(caloriesPerProtein({ calories: calories ?? 0, protein: protein ?? 0 }));

  const selectedCommonChanges = useMemo(
    () => applicableCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const hasAddonSections = useMemo(
    () =>
      (item.addonRefs ?? []).some((ref) => {
        const options = addons?.[ref];
        return Boolean(options && options.length > 0);
      }),
    [addons, item.addonRefs]
  );

  const retainedCustomizations = useMemo(() => {
    if (!initialCartCustomizations || initialCartCustomizations.length === 0) return [];

    const addonNames = new Set<string>();
    for (const ref of item.addonRefs ?? []) {
      for (const addon of addons?.[ref] ?? []) {
        addonNames.add(addon.name);
      }
    }

    return initialCartCustomizations.filter((label) => {
      const normalized = label.replace(/^\+\s*/, "").trim();
      return !addonNames.has(normalized);
    });
  }, [addons, initialCartCustomizations, item.addonRefs]);

  const optionsLabel = useMemo(() => {
    const dressingSegments = Object.values(selectedAddons)
      .filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None"))
      .map((addon) => addon.name);
    const sauceSegments = Object.entries(selectedSauceCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => (count === 1 ? name : `${name} x${count}`));

    const segments = [...dressingSegments, ...sauceSegments];
    return segments.length > 0 ? segments.join(" + ") : undefined;
  }, [selectedAddons, selectedSauceCounts]);

  const customizations = useMemo(() => {
    const modifierLabels = selectedCommonChanges.map((change) => formatCommonChangeForCart(change.label));
    return modifierLabels.length > 0 ? modifierLabels : undefined;
  }, [selectedCommonChanges]);

  const selectedVariantForCart = useMemo(() => {
    if (!variants || variants.length === 0) return undefined;
    const bySelected = variants.find((variant) => variant.id === selectedVariantId);
    if (bySelected) return bySelected;
    if (defaultVariantId) {
      const byDefault = variants.find((variant) => variant.id === defaultVariantId);
      if (byDefault) return byDefault;
    }
    return variants[0];
  }, [defaultVariantId, selectedVariantId, variants]);

  const matchingCartItem = useMemo(() => {
    if (isCartMode) return undefined;

    const customizationSignature = (customizations ?? []).join("|");

    return items.find((cartItem) => {
      if (cartItem.restaurantId !== restaurantId) return false;
      if (cartItem.itemId !== (item.id ?? item.name)) return false;
      if ((cartItem.variantId ?? "") !== (selectedVariantForCart?.id ?? "")) return false;
      if ((cartItem.optionsLabel ?? "") !== (optionsLabel ?? "")) return false;
      return (cartItem.customizations ?? []).join("|") === customizationSignature;
    });
  }, [
    customizations,
    isCartMode,
    item.id,
    item.name,
    items,
    optionsLabel,
    restaurantId,
    selectedVariantForCart?.id,
  ]);

  const emitCartConfiguration = (
    nextVariantId: string,
    nextAddons: Partial<Record<AddonRef, AddonOption>>,
    nextSauceCounts: Record<string, number>
  ) => {
    if (!isCartMode || !onCartConfigurationChange || !cartItemId) return;

    const activeVariant = variants?.find((variant) => variant.id === nextVariantId) ?? selectedVariantForCart;
    const baseForCart = activeVariant?.nutrition ?? item.nutrition;
    const sauceOptions = addons?.[sauceRef] ?? [];
    const expandedSauces = sauceOptions.flatMap((addon) =>
      Array.from({ length: nextSauceCounts[addon.name] ?? 0 }, () => addon)
    );
    const activeAddons = [
      ...Object.values(nextAddons).filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None")),
      ...expandedSauces,
    ];
    const addonTotalsForCart = activeAddons.reduce(
      (sum, addon) => ({
        calories: sum.calories + (addon.calories ?? 0),
        protein: sum.protein + (addon.protein ?? 0),
        carbs: sum.carbs + (addon.carbs ?? 0),
        fat: sum.fat + addonFat(addon),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const dressingSegments = Object.values(nextAddons)
      .filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None"))
      .map((addon) => addon.name);
    const sauceSegments = Object.entries(nextSauceCounts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => (count === 1 ? name : `${name} x${count}`));
    const nextOptionsLabel = [...dressingSegments, ...sauceSegments].length > 0
      ? [...dressingSegments, ...sauceSegments].join(" + ")
      : undefined;
    const nextCustomizations = [...retainedCustomizations];

    onCartConfigurationChange({
      variantId: activeVariant?.id,
      variantLabel: activeVariant?.label,
      optionsLabel: nextOptionsLabel,
      customizations: nextCustomizations.length > 0 ? nextCustomizations : undefined,
      image: activeVariant?.image ?? item.image,
      macrosPerItem: {
        calories: (baseForCart.calories ?? 0) + addonTotalsForCart.calories,
        protein: (baseForCart.protein ?? 0) + addonTotalsForCart.protein,
        carbs: (baseForCart.carbs ?? 0) + addonTotalsForCart.carbs,
        fat: (baseForCart.totalFat ?? 0) + addonTotalsForCart.fat,
      },
    });
  };

  const handleAddToCart = () => {
    if (isAddFeedbackVisible) return;

    const baseForCart = selectedVariantForCart?.nutrition ?? item.nutrition;

    if (matchingCartItem) {
      updateQuantity(matchingCartItem.id, matchingCartItem.quantity + 1);
    } else {
      addItem({
        id: crypto.randomUUID(),
        restaurantId,
        itemId: item.id ?? item.name,
        name: item.name,
        image: selectedVariantForCart?.image ?? item.image,
        variantId: selectedVariantForCart?.id,
        variantLabel: selectedVariantForCart?.label,
        optionsLabel,
        customizations,
        quantity: 1,
        macrosPerItem: {
          calories: (baseForCart.calories ?? 0) + addonTotals.calories,
          protein: (baseForCart.protein ?? 0) + addonTotals.protein,
          carbs: (baseForCart.carbs ?? 0) + addonTotals.carbs,
          fat: (baseForCart.totalFat ?? 0) + addonTotals.fat,
        },
      });
    }

    setIsAddFeedbackVisible(true);
  };

  useEffect(() => {
    if (!isAddFeedbackVisible) return;

    const timeout = window.setTimeout(() => {
      setIsAddFeedbackVisible(false);
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isAddFeedbackVisible]);

  return (
    <li
      className={styles.card}
      style={{
        border: isTopRanked ? "1.5px solid rgba(0,0,0,0.8)" : "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <div
        role={!isCartMode || hasAddonSections ? "button" : undefined}
        tabIndex={!isCartMode || hasAddonSections ? 0 : undefined}
        className={styles.header}
        onClick={!isCartMode || hasAddonSections ? () => setOpen((v) => !v) : undefined}
        onKeyDown={
          !isCartMode || hasAddonSections
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpen((v) => !v);
                }
              }
            : undefined
        }
        aria-expanded={!isCartMode || hasAddonSections ? open : undefined}
        aria-controls={!isCartMode || hasAddonSections ? `${id}-details` : undefined}
      >
        <div className={styles.leftMedia}>
          {selectedItemImage ? (
            <img className={styles.image} src={selectedItemImage} alt={item.name} />
          ) : (
            <div className={styles.imagePlaceholder} />
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.topBlock}>
            {rankText && (
              <div className={styles.rankWrap}>
                <div className={styles.rank}>{rankText}</div>
              </div>
            )}
            <div className={styles.title}>{item.name}</div>
            <div className={styles.caloriesRow}>
              <div className={styles.caloriesWrap}>
                <div className={styles.calories}>{formatCalories(calories)} calories</div>
                {hasActiveCustomization ? (
                  <span className={styles.macroDelta}>{formatDelta(customizationTotals.calories)}</span>
                ) : null}
              </div>
              {variants ? (
                <div
                  className={styles.variantSelect}
                  onClick={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
                  onKeyDown={hasVariantDropdown ? (event) => event.stopPropagation() : undefined}
                >
                  <div className={styles.divider} />
                  {hasVariantDropdown ? (
                    <VariantSelector
                      variants={variants}
                      selectedId={selectedVariantId}
                      onChange={(nextVariantId) => {
                        setSelectedVariantId(nextVariantId);
                        emitCartConfiguration(nextVariantId, selectedAddons, selectedSauceCounts);
                      }}
                      ariaLabel={`${item.name} portion size`}
                    />
                  ) : (
                    <span className={styles.variantLabel}>{selectedVariantForCart?.label ?? variants[0]?.label}</span>
                  )}
                </div>
              ) : null}
            </div>
            {isCartMode && cartSummaryLine ? (
              <p className={styles.cartSummaryLine}>{cartSummaryLine}</p>
            ) : null}
          </div>

          <div className={styles.macros}>
            {showRatio && Number.isFinite(ratio) && (
              <div className={styles.macro}>
                <div className={`${styles.macroValue}`}>{ratio}:1</div>
                <div className={styles.macroLabel}>RATIO</div>
              </div>
            )}
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <div className={`${styles.macroValue} ${styles.protein}`}>{formatMacro(protein)}</div>
                {hasActiveCustomization ? <span className={styles.macroDelta}>{formatDelta(customizationTotals.protein)}</span> : null}
              </div>
              <div className={styles.macroLabel}>PROTEIN</div>
            </div>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <div className={`${styles.macroValue} ${styles.carbs}`}>{formatMacro(carbs)}</div>
                {hasActiveCustomization ? <span className={styles.macroDelta}>{formatDelta(customizationTotals.carbs)}</span> : null}
              </div>
              <div className={styles.macroLabel}>CARBS</div>
            </div>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <div className={`${styles.macroValue} ${styles.fat}`}>{formatMacro(fat)}</div>
                {hasActiveCustomization ? <span className={styles.macroDelta}>{formatDelta(customizationTotals.fat)}</span> : null}
              </div>
              <div className={styles.macroLabel}>FAT</div>
            </div>

            <div className={styles.actionsWrap}>
              {!isCartMode && itemHref ? (
                <button
                  type="button"
                  className={styles.detailsButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(itemHref, { scroll: false });
                  }}
                >
                  Details
                </button>
              ) : null}
              {isCartMode || matchingCartItem ? (
                <div className={styles.qtyStepper}>
                  <button
                    type="button"
                    className={styles.qtyStepButton}
                    onClick={(event) => {
                      event.stopPropagation();

                      if (isCartMode) {
                        onCartDecrement?.();
                        return;
                      }

                      if (!matchingCartItem) return;
                      updateQuantity(matchingCartItem.id, matchingCartItem.quantity - 1);
                    }}
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{isCartMode ? cartQuantity : matchingCartItem.quantity}</span>
                  <button
                    type="button"
                    className={styles.qtyStepButton}
                    onClick={(event) => {
                      event.stopPropagation();

                      if (isCartMode) {
                        onCartIncrement?.();
                        return;
                      }

                      if (!matchingCartItem) return;
                      updateQuantity(matchingCartItem.id, matchingCartItem.quantity + 1);
                    }}
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.addToCartButton} ${isAddFeedbackVisible ? styles.addToCartButtonAdded : ""}`}
                  disabled={isAddFeedbackVisible}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart();
                  }}
                >
                  {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
                </button>
              )}
            </div>
          </div>
        </div>

        {(!isCartMode || hasAddonSections) ? <div className={styles.iconActions}>
          {hasMods && !isCartMode ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Reset customizations"
              className={`${styles.iconButton} ${styles.resetIcon}`}
              onClick={(event) => {
                event.stopPropagation();
                resetMods();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  resetMods();
                }
              }}
            >
              ↺
            </div>
          ) : null}
          <div
              role={isCartMode ? "button" : undefined}
              tabIndex={isCartMode ? 0 : undefined}
              aria-label={isCartMode ? `Toggle addon options for ${item.name}` : undefined}
              className={`${styles.iconButton} ${styles.expandIcon} ${open ? styles.expandIconOpen : ""}`}
              onClick={(event) => {
                if (!isCartMode || !hasAddonSections) return;
                event.stopPropagation();
                setOpen((v) => !v);
              }}
              onKeyDown={(event) => {
                if (!isCartMode || !hasAddonSections) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen((v) => !v);
                }
              }}
            >
              +
            </div>
        </div> : null}
      </div>

      {(!isCartMode || hasAddonSections) ? (
        <div id={`${id}-details`} className={`${styles.details} ${open ? styles.detailsOpen : ""}`}>
          <div className={styles.detailsInner}>
            <ItemDetailsPanel
              item={item}
              nutrition={nutrition}
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={(nextVariantId) => {
                setSelectedVariantId(nextVariantId);
                emitCartConfiguration(nextVariantId, selectedAddons, selectedSauceCounts);
              }}
              addons={addons}
              selectedAddons={selectedAddons}
              onSelectAddon={(ref, addon) => {
                setSelectedAddons((prev) => {
                  const next = { ...prev, [ref]: addon ?? emptyAddon };
                  emitCartConfiguration(selectedVariantId, next, selectedSauceCounts);
                  return next;
                });
              }}
              sauceSelectionCounts={selectedSauceCounts}
              onIncrementSauce={(addon) => {
                setSelectedSauceCounts((prev) => {
                  const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                  if (currentTotal >= maxSauceSelections) return prev;
                  const next = { ...prev, [addon.name]: (prev[addon.name] ?? 0) + 1 };
                  emitCartConfiguration(selectedVariantId, selectedAddons, next);
                  return next;
                });
              }}
              onDecrementSauce={(addon) => {
                setSelectedSauceCounts((prev) => {
                  const current = prev[addon.name] ?? 0;
                  if (current <= 0) return prev;
                  const next = { ...prev };
                  if (current === 1) {
                    delete next[addon.name];
                  } else {
                    next[addon.name] = current - 1;
                  }
                  emitCartConfiguration(selectedVariantId, selectedAddons, next);
                  return next;
                });
              }}
              onToggleSauce={(addon) => {
                setSelectedSauceCounts((prev) => {
                  if (addon.name === "None") {
                    if (Object.keys(prev).length === 0) return prev;
                    emitCartConfiguration(selectedVariantId, selectedAddons, {});
                    return {};
                  }

                  const current = prev[addon.name] ?? 0;
                  if (current > 0) {
                    const next = { ...prev };
                    delete next[addon.name];
                    emitCartConfiguration(selectedVariantId, selectedAddons, next);
                    return next;
                  }

                  const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                  if (currentTotal >= maxSauceSelections) return prev;
                  const next = { ...prev, [addon.name]: 1 };
                  emitCartConfiguration(selectedVariantId, selectedAddons, next);
                  return next;
                });
              }}
              commonChanges={isCartMode ? undefined : applicableCommonChanges}
              selectedCommonChangeIds={isCartMode ? undefined : selectedCommonChangeIds}
              onToggleCommonChange={
                isCartMode
                  ? undefined
                  : (changeId) =>
                      setSelectedCommonChangeIds((prev) =>
                        prev.includes(changeId)
                          ? prev.filter((id) => id !== changeId)
                          : [...prev, changeId]
                      )
              }
              customizationTotals={customizationTotals}
              showCustomizationDeltas={hasActiveCustomization}
              displayMode={isCartMode ? "addonsOnly" : "full"}
            />

          </div>
        </div>
      ) : null}
    </li>
  );
}
