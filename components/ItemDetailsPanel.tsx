import { useRef, useState } from "react";
import ingredientsCatalog from "@/data/ingredientsCatalog.json";
import styles from "./ItemDetails.module.css";
import type {
  AddonOption,
  AddonRef,
  CommonChange,
  ItemVariant,
  MacroDelta,
  MenuItem,
  Nutrition,
  RestaurantAddons,
} from "@/types/menu";
import type { AddonCountMap } from "@/lib/addonSelections";

function format(n?: number, suffix = "") {
  return n === undefined || n === null ? "—" : `${n}${suffix}`;
}

function calToProteinRatio(calories: number, protein: number) {
  if (!protein) return "—";
  return `${Math.round(calories / protein)}:1`;
}

function formatDelta(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}

const addonSectionTitles: Record<AddonRef, string> = {
  sauces: "Sauces",
  dressings: "Dressings",
};

const rowScrollPx = 240;

type IngredientEntry = {
  label: string;
  icon: string;
};

function resolveIngredients(ingredientIds?: string[]) {
  if (!ingredientIds || ingredientIds.length === 0) return [];

  return ingredientIds
    .map((ingredientId) => {
      const ingredient = (ingredientsCatalog as Record<string, IngredientEntry>)[ingredientId];
      if (!ingredient) return null;
      return {
        id: ingredientId,
        label: ingredient.label,
        icon: ingredient.icon,
      };
    })
    .filter((ingredient): ingredient is { id: string; label: string; icon: string } => ingredient !== null);
}

function scrollRow(row: HTMLUListElement | null | undefined, direction: "left" | "right") {
  if (!row) return;
  row.scrollBy({
    left: direction === "left" ? -rowScrollPx : rowScrollPx,
    behavior: "smooth",
  });
}

function sortByCalories(addons: AddonOption[]) {
  return [...addons].sort((a, b) => a.calories - b.calories);
}

function withNoneOption(addons: AddonOption[]) {
  return [{ name: "None", calories: 0, protein: 0, carbs: 0, fat: 0, image: "none" }, ...addons];
}

function formatSummaryDetail(name: string, calories: number) {
  return `• ${name} (${calories >= 0 ? "+" : ""}${calories}cal)`;
}

export default function ItemDetailsPanel({
  item,
  nutrition,
  variants,
  selectedVariantId,
  onSelectVariant,
  addons,
  selectedAddonCounts,
  onSelectAddonCountChange,
  commonChanges,
  selectedCommonChangeIds,
  onToggleCommonChange,
  customizationTotals,
  showCustomizationDeltas,
  displayMode = "full",
}: {
  item: MenuItem;
  nutrition: Nutrition;
  variants?: ItemVariant[] | null;
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  addons?: RestaurantAddons;
  selectedAddonCounts?: AddonCountMap;
  onSelectAddonCountChange?: (ref: AddonRef, addon: AddonOption, quantity: number) => void;
  commonChanges?: CommonChange[];
  selectedCommonChangeIds?: string[];
  onToggleCommonChange?: (id: string) => void;
  customizationTotals?: MacroDelta;
  showCustomizationDeltas?: boolean;
  displayMode?: "full" | "addonsOnly";
}) {
  const n = nutrition;
  const addonRefs = item.addonRefs ?? [];
  const [sectionOpenState, setSectionOpenState] = useState<Record<string, boolean>>({});
  const addonRowRefs = useRef<Record<string, HTMLUListElement | null>>({});

  const availableAddonSections = addonRefs
    .map((ref) => {
      const list = addons?.[ref];
      if (!list || list.length === 0) return null;
      return {
        ref,
        title: addonSectionTitles[ref],
        addons: withNoneOption(sortByCalories(list)),
      };
    })
    .filter((section): section is { ref: AddonRef; title: string; addons: AddonOption[] } =>
      section !== null
    );

  const activeCustomizationTotals = customizationTotals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const ingredients = resolveIngredients(item.ingredients);

  return (
    <div className={styles.wrapper}>
      {availableAddonSections.length > 0 ? (
        <section className={styles.addonsCard}>
          <div className={styles.addonsContent}>
            {availableAddonSections.map((section) => {
              const sectionStateKey = `addon-${section.ref}`;
              const isSectionOpen = sectionOpenState[sectionStateKey] ?? true;
              const selectedCounts = selectedAddonCounts?.[section.ref] ?? {};
              const selectedAddons = section.addons.filter((addon) => (selectedCounts[addon.name] ?? 0) > 0);
              const totalSelected = selectedAddons.reduce((sum, addon) => sum + (selectedCounts[addon.name] ?? 0), 0);
              const totalCalories = selectedAddons.reduce(
                (sum, addon) => sum + (addon.calories * (selectedCounts[addon.name] ?? 0)),
                0
              );
              const summaryDetail = totalSelected === 0
                ? formatSummaryDetail("None", 0)
                : `• ${totalSelected} selected (+${totalCalories}cal)`;
              return (
                <div key={section.ref} className={styles.addonGroup}>
                  <div
                    className={styles.addonGroupHeader}
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
                    <h3 className={styles.addonGroupTitle}>
                      {section.title}
                      {!isSectionOpen ? <span className={styles.addonSummaryDetail}> {summaryDetail}</span> : null}
                    </h3>
                    <div className={styles.addonHeaderControls}>
                      {isSectionOpen ? (
                        <div className={styles.addonScrollButtons} onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className={styles.addonArrowButton}
                            aria-label={`Scroll ${section.title} left`}
                            onClick={(event) => {
                              event.stopPropagation();
                              scrollRow(addonRowRefs.current[`addon-row-${section.ref}`], "left");
                            }}
                          >
                            ⬅
                          </button>
                          <button
                            type="button"
                            className={styles.addonArrowButton}
                            aria-label={`Scroll ${section.title} right`}
                            onClick={(event) => {
                              event.stopPropagation();
                              scrollRow(addonRowRefs.current[`addon-row-${section.ref}`], "right");
                            }}
                          >
                            ➡
                          </button>
                        </div>
                      ) : null}
                      <span className={styles.chevronButton} aria-hidden="true">
                        {isSectionOpen ? "˄" : "˅"}
                      </span>
                    </div>
                  </div>
                  {isSectionOpen ? (
                    <ul
                      ref={(element) => {
                        addonRowRefs.current[`addon-row-${section.ref}`] = element;
                      }}
                      className={styles.addonList}
                    >
                      {section.addons.map((addon) => (
                        <li key={`${section.ref}-${addon.name}`} className={styles.addonItem}>
                          <button
                            type="button"
                            className={`${styles.addonTileButton} ${
                              (selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0) > 0
                                ? styles.addonTileButtonActive
                                : ""
                            }`}
                            onClick={() => {
                              const currentQuantity = selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0;
                              if (addon.name === "None") {
                                onSelectAddonCountChange?.(section.ref, addon, 0);
                                return;
                              }
                              onSelectAddonCountChange?.(section.ref, addon, currentQuantity + 1);
                            }}
                          >
                            {addon.image === "none" ? (
                              <div className={`${styles.addonImage} ${styles.addonImageNone}`}>✕</div>
                            ) : addon.image ? (
                              <div
                                className={styles.addonImage}
                                style={{ backgroundImage: `url(${addon.image})` }}
                              />
                            ) : (
                              <div className={styles.addonImage} />
                            )}
                            <div className={styles.addonText}>
                              <div className={styles.addonName}>{addon.name}</div>
                              <div className={styles.addonCalories}>+{addon.calories} Cal</div>
                            </div>
                            {addon.name !== "None" && (selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0) > 0 ? (
                              <div
                                className={styles.addonQuantityControl}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={styles.addonQuantityButton}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const currentQuantity = selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0;
                                    onSelectAddonCountChange?.(section.ref, addon, currentQuantity - 1);
                                  }}
                                  aria-label={`Decrease ${addon.name}`}
                                >
                                  -
                                </button>
                                <span className={styles.addonQuantityValue}>
                                  {selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0}
                                </span>
                                <button
                                  type="button"
                                  className={styles.addonQuantityButton}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const currentQuantity = selectedAddonCounts?.[section.ref]?.[addon.name] ?? 0;
                                    onSelectAddonCountChange?.(section.ref, addon, currentQuantity + 1);
                                  }}
                                  aria-label={`Increase ${addon.name}`}
                                >
                                  +
                                </button>
                              </div>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {displayMode === "full" && commonChanges && commonChanges.length > 0 ? (
        <section className={styles.addonsCard}>
          <div className={styles.addonsContent}>
            <div className={styles.addonGroup}>
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
                      className={styles.addonGroupHeader}
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
                      <h3 className={styles.addonGroupTitle}>
                        Common Changes
                        {!isCommonOpen ? <span className={styles.addonSummaryDetail}> {commonSummaryDetail}</span> : null}
                      </h3>
                      <div className={styles.addonHeaderControls}>
                        {isCommonOpen ? (
                          <div className={styles.addonScrollButtons} onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              className={styles.addonArrowButton}
                              aria-label="Scroll Common Changes left"
                              onClick={(event) => {
                                event.stopPropagation();
                                scrollRow(addonRowRefs.current["common-changes-row"], "left");
                              }}
                            >
                              ⬅
                            </button>
                            <button
                              type="button"
                              className={styles.addonArrowButton}
                              aria-label="Scroll Common Changes right"
                              onClick={(event) => {
                                event.stopPropagation();
                                scrollRow(addonRowRefs.current["common-changes-row"], "right");
                              }}
                            >
                              ➡
                            </button>
                          </div>
                        ) : null}
                        <span className={styles.chevronButton} aria-hidden="true">
                          {isCommonOpen ? "˄" : "˅"}
                        </span>
                      </div>
                    </div>
                    {isCommonOpen ? (
                      <ul
                        ref={(element) => {
                          addonRowRefs.current["common-changes-row"] = element;
                        }}
                        className={styles.addonList}
                      >
                        {commonChanges.map((change) => {
                          const isActive = selectedCommonChangeIds?.includes(change.id) ?? false;
                          const calorieDeltaLabel = `${change.delta.calories >= 0 ? "+" : ""}${change.delta.calories}cal`;
                          const proteinDeltaLabel = `${change.delta.protein >= 0 ? "+" : ""}${change.delta.protein}g protein`;
                          return (
                            <li key={change.id} className={styles.addonItem}>
                              <button
                                type="button"
                                className={`${styles.addonTileButton} ${isActive ? styles.addonTileButtonActive : ""}`}
                                onClick={() => onToggleCommonChange?.(change.id)}
                              >
                                <div className={`${styles.addonImage} ${styles.addonImageNone}`}>↺</div>
                                <div className={styles.addonText}>
                                  <div className={styles.addonName}>{change.label}</div>
                                  <div className={styles.addonCalories}>{`${calorieDeltaLabel} • ${proteinDeltaLabel}`}</div>
                                </div>
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

      {displayMode === "full" ? <section className={styles.labelCard}>
        <div className={styles.amountPerServing}>Amount per serving</div>

        <div className={styles.caloriesRow}>
          <div className={styles.caloriesText}>Calories</div>
          <div className={styles.valueWithDelta}>
            <div className={styles.caloriesValue}>{n.calories}</div>
            {showCustomizationDeltas ? (
              <span className={styles.deltaValue}>{formatDelta(activeCustomizationTotals.calories)}</span>
            ) : null}
          </div>
        </div>

        <div className={styles.thickRule} />

        <div className={styles.row}>
          <div className={styles.rowTitle}>Total Fat</div>
          <div className={styles.valueWithDelta}>
            <div className={styles.rowValue}>{format(n.totalFat, "g")}</div>
            {showCustomizationDeltas ? <span className={styles.deltaValue}>{formatDelta(activeCustomizationTotals.fat, "g")}</span> : null}
          </div>
        </div>

        <div className={styles.subRow}>
          <div className={styles.subTitle}>Sat Fat</div>
          <div className={styles.subValue}>{format(n.satFat, "g")}</div>
        </div>

        <div className={styles.subRow}>
          <div className={styles.subTitle}>Trans Fat</div>
          <div className={styles.subValue}>{format(n.transFat, "g")}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.rowTitle}>Cholesterol</div>
          <div className={styles.rowValue}>{format(n.cholesterol, "mg")}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.rowTitle}>Sodium</div>
          <div className={styles.rowValue}>{format(n.sodium, "mg")}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.rowTitle}>Carbohydrates</div>
          <div className={styles.valueWithDelta}>
            <div className={styles.rowValue}>{format(n.carbs, "g")}</div>
            {showCustomizationDeltas ? <span className={styles.deltaValue}>{formatDelta(activeCustomizationTotals.carbs, "g")}</span> : null}
          </div>
        </div>

        <div className={styles.subRow}>
          <div className={styles.subTitle}>Fiber</div>
          <div className={styles.subValue}>{format(n.fiber, "g")}</div>
        </div>

        <div className={styles.subRow}>
          <div className={styles.subTitle}>Sugars</div>
          <div className={styles.subValue}>{format(n.sugars, "g")}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.rowTitle}>Protein</div>
          <div className={styles.valueWithDelta}>
            <div className={styles.rowValue}>{format(n.protein, "g")}</div>
            {showCustomizationDeltas ? <span className={styles.deltaValue}>{formatDelta(activeCustomizationTotals.protein, "g")}</span> : null}
          </div>
        </div>

        <div className={styles.footerText}>
          2,000 calories a day is used for general nutrition advice, but calorie needs
          vary. Values may vary by location, serving size, and customizations.
        </div>
      </section> : null}

      {displayMode === "full" ? <section className={styles.detailsCard}>
        <div className={styles.detailsTitle}>Details</div>

        <div className={styles.detailsRow}>
          <div className={styles.detailsLabel}>Category</div>
          <div className={styles.pill}>{item.categories?.join(", ") ?? "—"}</div>
        </div>

        <div className={styles.detailsDivider} />

        <div className={styles.detailsRow}>
          <div className={styles.detailsLabel}>Cal to Protein Ratio</div>
          <div className={styles.detailsValue}>
            {calToProteinRatio(n.calories, n.protein)}
          </div>
        </div>

        {variants && variants.length > 0 ? (
          <>
            <div className={styles.detailsDivider} />
            <div className={`${styles.detailsRow} ${styles.portionRow}`}>
              <div className={styles.detailsLabel}>Portion</div>
              <div className={styles.portionOptions}>
                {variants.map((variant) => {
                  const isActive = variant.id === selectedVariantId;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`${styles.portionButton} ${isActive ? styles.portionButtonActive : ""}`}
                      onClick={() => onSelectVariant?.(variant.id)}
                    >
                      {variant.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div className={styles.detailsDivider} />

        {item.restaurant ? (
          <>
            <div className={styles.detailsDivider} />
            <div className={styles.detailsRow}>
              <div className={styles.detailsLabel}>Restaurant</div>
              <div className={styles.detailsValue}>{item.restaurant}</div>
            </div>
          </>
        ) : null}

        {ingredients.length > 0 ? (
          <>
            <div className={styles.detailsDivider} />
            <div className={`${styles.detailsRow} ${styles.ingredientsRow}`}>
              <div className={styles.detailsLabel}>Ingredients</div>
              <div className={styles.ingredientsGrid}>
                {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className={styles.ingredientChip}>
                    <span aria-hidden="true">{ingredient.icon}</span>
                    <span>{ingredient.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </section> : null}
    </div>
  );
}
