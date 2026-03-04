"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ItemDetailsPanel from "@/components/ItemDetailsPanel";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  MacroDelta,
  MenuItem,
  RestaurantAddons,
  IngredientItem,
} from "@/types/menu";
import { useCart } from "@/stores/cartStore";
import styles from "./ItemRouteModal.module.css";
import ingredientsCatalog from "@/data/ingredientsCatalog.json";

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

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
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

function resolveModalIngredients(item: MenuItem, ingredients: IngredientItem[] = []) {
  const ingredientLookup = ingredientsCatalog as Record<string, { label: string; icon: string }>;

  return (item.ingredients ?? []).map((ingredientId) => {
    const catalogEntry = ingredientLookup[ingredientId];
    const fallbackLabel = ingredientId
      .split(/[-_]/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");

    const label = catalogEntry?.label ?? fallbackLabel;
    const match = ingredients.find((entry) => entry.name.toLowerCase().includes(label.toLowerCase()));

    return {
      id: ingredientId,
      label,
      icon: catalogEntry?.icon ?? "🥣",
      calories: match?.nutrition.calories,
    };
  });
}

export default function ItemRouteModal({
  restaurantId,
  restaurantPath,
  item,
  addons,
  commonChanges,
  ingredients,
}: {
  restaurantId: string;
  restaurantPath: string;
  item: MenuItem;
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredients?: IngredientItem[];
}) {
  const router = useRouter();
  const variants = item.variants?.length ? item.variants : null;
  const defaultVariantId = useMemo(() => {
    if (!variants) return "";
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    const flaggedDefault = variants.find((variant) => variant.isDefault);
    return flaggedDefault?.id ?? variants[0]?.id ?? "";
  }, [item.defaultVariantId, variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId);
  const [selectedAddons, setSelectedAddons] = useState<Partial<Record<AddonRef, AddonOption>>>({});
  const [selectedSauceCounts, setSelectedSauceCounts] = useState<Record<string, number>>({});
  const [selectedCommonChangeIds, setSelectedCommonChangeIds] = useState<string[]>([]);
  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const { addItem } = useCart();
  const modalIngredients = useMemo(() => resolveModalIngredients(item, ingredients), [item, ingredients]);

  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId);
  const baseNutrition = selectedVariant?.nutrition ?? item.nutrition;
  const applicableCommonChanges = useMemo(
    () => getApplicableCommonChanges(item, commonChanges),
    [item, commonChanges]
  );

  const selectedSauceOptions = useMemo(() => {
    const sauceOptions = addons?.[sauceRef] ?? [];
    return sauceOptions.flatMap((addon) =>
      Array.from({ length: selectedSauceCounts[addon.name] ?? 0 }, () => addon)
    );
  }, [addons, selectedSauceCounts]);

  const addonTotals = useMemo(
    () =>
      [...Object.values(selectedAddons), ...selectedSauceOptions].reduce(
        (sum, addon) => ({
          calories: sum.calories + (addon?.calories ?? 0),
          protein: sum.protein + (addon?.protein ?? 0),
          carbs: sum.carbs + (addon?.carbs ?? 0),
          fat: sum.fat + (addon?.fat ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
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
            fat: sum.fat + change.delta.fat,
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

  const hasActiveCustomization = useMemo(
    () =>
      customizationTotals.calories !== 0 ||
      customizationTotals.protein !== 0 ||
      customizationTotals.carbs !== 0 ||
      customizationTotals.fat !== 0,
    [customizationTotals]
  );

  const nutrition = {
    ...baseNutrition,
    calories: baseNutrition.calories + customizationTotals.calories,
    protein: baseNutrition.protein + customizationTotals.protein,
    carbs: baseNutrition.carbs + customizationTotals.carbs,
    totalFat: baseNutrition.totalFat + customizationTotals.fat,
  };

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

  const selectedCommonChanges = useMemo(
    () => applicableCommonChanges.filter((change) => selectedCommonChangeIds.includes(change.id)).map((change) => change.label),
    [applicableCommonChanges, selectedCommonChangeIds]
  );

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(restaurantPath, { scroll: false });
  };

  const handleAddToCart = () => {
    if (isAddFeedbackVisible) return;

    addItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId: item.id ?? item.name,
      name: item.name,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      optionsLabel,
      customizations: selectedCommonChanges.length ? selectedCommonChanges : undefined,
      quantity: 1,
      macrosPerItem: {
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.totalFat,
      },
    });

    setIsAddFeedbackVisible(true);
    window.setTimeout(() => setIsAddFeedbackVisible(false), 1000);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={item.name}>
      <button type="button" className={styles.backdrop} onClick={handleClose} aria-label="Close item modal" />
      <div className={styles.modal}>
        <button type="button" className={styles.close} onClick={handleClose} aria-label="Close item modal">
          ×
        </button>

        <div className={styles.hero}>
          <h1 className={styles.title}>{item.name}</h1>
          {item.image ? <img className={styles.image} src={item.image} alt={item.name} /> : null}
          <div className={styles.macroSummary}>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <span className={styles.macroValue}>{nutrition.calories}</span>
                {hasActiveCustomization ? (
                  <span className={styles.macroDelta}>{formatDelta(customizationTotals.calories)}</span>
                ) : null}
              </div>
              <span className={styles.macroLabel}>CAL</span>
            </div>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <span className={`${styles.macroValue} ${styles.protein}`}>{nutrition.protein}g</span>
                {hasActiveCustomization ? (
                  <span className={styles.macroDelta}>{formatDelta(customizationTotals.protein)}</span>
                ) : null}
              </div>
              <span className={styles.macroLabel}>PROTEIN</span>
            </div>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <span className={`${styles.macroValue} ${styles.carbs}`}>{nutrition.carbs}g</span>
                {hasActiveCustomization ? (
                  <span className={styles.macroDelta}>{formatDelta(customizationTotals.carbs)}</span>
                ) : null}
              </div>
              <span className={styles.macroLabel}>CARBS</span>
            </div>
            <div className={styles.macro}>
              <div className={styles.macroValueWrap}>
                <span className={`${styles.macroValue} ${styles.fat}`}>{nutrition.totalFat}g</span>
                {hasActiveCustomization ? (
                  <span className={styles.macroDelta}>{formatDelta(customizationTotals.fat)}</span>
                ) : null}
              </div>
              <span className={styles.macroLabel}>FAT</span>
            </div>
          </div>

          {variants && variants.length > 1 ? (
            <>
              <div className={styles.heroDivider} />
              <div className={styles.portionWrap}>
                <div className={styles.portionTitle}>PORTION SIZE</div>
                <div className={styles.portionOptions}>
                  {variants.map((variant) => {
                    const isActive = variant.id === selectedVariantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        className={`${styles.portionButton} ${isActive ? styles.portionButtonActive : ""}`}
                        onClick={() => setSelectedVariantId(variant.id)}
                      >
                        {variant.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={styles.heroDivider} />
            </>
          ) : null}
        </div>

        <div className={styles.body}>
          {modalIngredients.length > 0 ? (
            <section className={styles.ingredientsSection}>
              <h3 className={styles.ingredientsTitle}>Ingredients</h3>
              <div className={styles.ingredientsGrid}>
                {modalIngredients.map((ingredient) => (
                  <article key={ingredient.id} className={styles.ingredientCard}>
                    <div className={styles.ingredientIcon} aria-hidden="true">
                      {ingredient.icon}
                    </div>
                    <div className={styles.ingredientName}>{ingredient.label}</div>
                    <div className={styles.ingredientCalories}>
                      {ingredient.calories !== undefined ? `${ingredient.calories} Cal` : "— Cal"}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <ItemDetailsPanel
            item={item}
            nutrition={nutrition}
            variants={null}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
            addons={addons}
            selectedAddons={selectedAddons}
            onSelectAddon={(ref, addon) => setSelectedAddons((prev) => ({ ...prev, [ref]: addon ?? emptyAddon }))}
            sauceSelectionCounts={selectedSauceCounts}
            onIncrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                return { ...prev, [addon.name]: (prev[addon.name] ?? 0) + 1 };
              });
            }}
            onDecrementSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                const current = prev[addon.name] ?? 0;
                if (current <= 0) return prev;
                const next = { ...prev };
                if (current === 1) delete next[addon.name];
                else next[addon.name] = current - 1;
                return next;
              });
            }}
            onToggleSauce={(addon) => {
              setSelectedSauceCounts((prev) => {
                if (addon.name === "None") return {};
                const current = prev[addon.name] ?? 0;
                if (current > 0) {
                  const next = { ...prev };
                  delete next[addon.name];
                  return next;
                }
                const currentTotal = Object.values(prev).reduce((sum, count) => sum + count, 0);
                if (currentTotal >= maxSauceSelections) return prev;
                return { ...prev, [addon.name]: 1 };
              });
            }}
            commonChanges={applicableCommonChanges}
            selectedCommonChangeIds={selectedCommonChangeIds}
            onToggleCommonChange={(changeId) =>
              setSelectedCommonChangeIds((prev) =>
                prev.includes(changeId) ? prev.filter((id) => id !== changeId) : [...prev, changeId]
              )
            }
            customizationTotals={customizationTotals}
            showCustomizationDeltas
          />
        </div>

        <div className={styles.stickyBar}>
          <button type="button" className={styles.addButton} onClick={handleAddToCart}>
            {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
