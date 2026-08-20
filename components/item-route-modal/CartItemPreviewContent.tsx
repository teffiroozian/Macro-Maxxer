import { useMemo } from "react";
import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PresetIngredientCard } from "@/components/item-route-modal/PresetBuildReview";
import {
  NutritionDetailsGrid,
  SelectionScrollList,
  SelectionSummaryRow,
  SelectionSummaryShell,
} from "@/components/item-route-modal/SelectionSummaryPanels";
import NutritionFactsPanel from "@/components/nutrition/NutritionFactsPanel";
import { macroDisplayConfig, macroOrder, type MacroKey } from "@/components/nutrition/macroDisplay";
import { summaryIconByKind } from "@/components/cart/CartItemCard";
import {
  resolveCartItemComboSelections,
  resolveCartItemCustomizationCards,
  resolveCartItemDressingCards,
  resolveCartItemMainItem,
  resolveCartItemSauceCards,
  type ResolvedCartItemCard,
} from "@/lib/cart/cartItemLookup";
import type { CartItem } from "@/types/cart";
import type { CoreMacros } from "@/types/nutrition";

type PreviewEditSection = "side" | "drink" | "ingredients" | "sauces" | "dressings";

// Same grid the "Included in this Build" ingredient cards use — a single
// card naturally sits at one column's width instead of stretching full
// bleed, and collapses to one column on mobile with no extra work.
const cardGridClassName = "grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 sm:gap-3";

function PreviewSection({
  kind,
  label,
  children,
}: {
  kind: keyof typeof summaryIconByKind;
  label: string;
  children: ReactNode;
}) {
  const Icon = summaryIconByKind[kind];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" strokeWidth={2.25} />
        <h3 className="font-heading text-base font-bold text-neutral-900 sm:text-lg">{label}</h3>
      </div>
      {children}
    </div>
  );
}

// Lighter-weight heading for content nested under Main Item (Customizations/
// Preparation) — smaller and less heavily colored than PreviewSection's
// peer-level heading, so the hierarchy (Main Item > its modifications) reads
// at a glance without a second heavy container.
function NestedSectionHeading({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-slate-400" strokeWidth={2.25} />
      <h4 className="font-heading text-sm font-bold text-neutral-600 sm:text-[15px]">{label}</h4>
    </div>
  );
}

// Understated vertical connector + indent, wrapping whatever renders
// underneath Main Item (Customizations/Preparation in the full section,
// nested ingredient rows in the compact Selected Items panel) so it visually
// reads as that card's child rather than a peer section — just a thin rule
// and padding, not another bordered/shadowed container. Indent is
// deliberately smaller on mobile (and in the already-narrow compact panel)
// so narrow screens don't lose usable width. `compact` skips the top margin
// since the panel's own row gap already provides spacing above it.
function NestedUnderMainItem({ compact = false, children }: { compact?: boolean; children: ReactNode }) {
  return (
    <div className={`relative ${compact ? "pl-3" : "mt-4 pl-3 sm:pl-5"}`}>
      <span className="absolute inset-y-0 left-0 w-px bg-black/10" aria-hidden="true" />
      {children}
    </div>
  );
}

function sumCoreMacros(cards: ResolvedCartItemCard[]): CoreMacros {
  return cards.reduce<CoreMacros>(
    (totals, card) => ({
      calories: totals.calories + (card.nutrition?.calories ?? 0),
      protein: totals.protein + (card.nutrition?.protein ?? 0),
      carbs: totals.carbs + (card.nutrition?.carbs ?? 0),
      totalFat: totals.totalFat + (card.nutrition?.totalFat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
  );
}

// Net difference vs. the standard/base item, shown as a compact secondary
// stat row directly under the Customizations heading — same per-macro color
// tokens as the rest of the app (never a sign-based good/bad color), a zero
// delta renders as a muted "—" instead of "+0"/"0" so it still reads clearly
// as "measured, no change" rather than being hidden. No label/caption of its
// own — the Customizations heading above already provides that context.
function CustomizationImpactSummary({ delta }: { delta: CoreMacros }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 sm:gap-x-5">
      {macroOrder.map((macroKey: MacroKey) => {
        const config = macroDisplayConfig[macroKey];
        const rounded = Math.round(delta[macroKey]);
        const isZero = rounded === 0;
        const label = macroKey === "calories" ? config.shortLabel : config.label;
        const displayValue = isZero ? "—" : `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}${config.unit ?? ""}`;
        const valueClassName = isZero ? "text-slate-400" : config.valueClassNameByVariant.default;

        return (
          <span key={macroKey} className="whitespace-nowrap text-[13px] font-bold sm:text-sm">
            <span className={valueClassName}>{displayValue}</span>
            <span className="ml-1 font-medium text-slate-500">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

// The Selected Items panel's compact counterpart to a Customizations Added/
// Removed card — deliberately lighter than SelectionSummaryRow (no image,
// smaller type, no bordered card), since these read as a sub-list under the
// Main Item row rather than order components in their own right.
function NestedCustomizationSummaryRow({ name, sign }: { name: string; sign: "add" | "remove" }) {
  const isAdd = sign === "add";
  return (
    <li className="flex list-none items-center gap-1.5 py-0.5">
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${isAdd ? "bg-success/15 text-success" : "bg-black/10 text-black/45"}`}
      >
        {isAdd ? <Plus className="h-2 w-2" strokeWidth={3.5} /> : <Minus className="h-2 w-2" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{name}</span>
    </li>
  );
}

// The Added/Removed split within Customizations: the group heading itself
// carries the add/remove meaning (icon + tinted label), so individual cards
// don't need to repeat an "Added"/"Removed" badge — only a genuine nuance
// beyond that (Extra/Light/×N) shows up on the card via qualifierLabel.
function CustomizationGroup({
  tone,
  label,
  cards,
  onCardClick,
}: {
  tone: "add" | "remove";
  label: string;
  cards: ResolvedCartItemCard[];
  onCardClick?: () => void;
}) {
  if (cards.length === 0) return null;
  const isAdd = tone === "add";
  const Icon = isAdd ? Plus : Minus;

  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isAdd ? "bg-success/15 text-success" : "bg-black/10 text-black/45"}`}
        >
          <Icon className="h-3 w-3" strokeWidth={3} />
        </span>
        <span className={`text-xs font-bold uppercase tracking-wide ${isAdd ? "text-success" : "text-black/45"}`}>{label}</span>
      </div>
      <ul className={cardGridClassName}>
        {cards.map((card) => (
          <PresetIngredientCard
            key={card.id}
            image={card.image}
            name={card.name}
            portionLabel={card.qualifierLabel}
            quantity={1}
            isLocked={false}
            nutrition={card.nutrition}
            onClick={onCardClick}
          />
        ))}
      </ul>
    </div>
  );
}

export default function CartItemPreviewContent({
  cartItem,
  onOpenSection,
}: {
  cartItem: CartItem;
  onOpenSection?: (section: PreviewEditSection) => void;
}) {
  const comboSelections = useMemo(() => resolveCartItemComboSelections(cartItem), [cartItem]);
  const customizationCards = useMemo(() => resolveCartItemCustomizationCards(cartItem), [cartItem]);
  const sauceCards = useMemo(() => resolveCartItemSauceCards(cartItem), [cartItem]);
  const dressingCards = useMemo(() => resolveCartItemDressingCards(cartItem), [cartItem]);
  // The base entree itself (e.g. "Spicy Southwest Salad"). Chipotle Build
  // Your Own items never reach this component — they render through
  // PresetBuildReview/SelectedIngredientsReviewCard instead (see
  // ItemRouteModal's usesChipotleBuildReview) — so selection.type is always
  // "standard" here and mainItem is always resolved.
  const mainItem = useMemo(() => resolveCartItemMainItem(cartItem), [cartItem]);

  const sideSelection = comboSelections.find((selection) => selection.role === "side");
  const drinkSelection = comboSelections.find((selection) => selection.role === "drink");
  const addedCustomizationCards = customizationCards.filter((card) => card.sign === "add");
  const removedCustomizationCards = customizationCards.filter((card) => card.sign === "remove");

  // The Main Item card alone is always enough to make this feel complete —
  // a standard/combo item never falls back to the empty state below, even
  // with zero customizations (see the Preparation row instead).
  const hasAnything =
    Boolean(mainItem) ||
    customizationCards.length > 0 ||
    Boolean(sideSelection) ||
    Boolean(drinkSelection) ||
    dressingCards.length > 0 ||
    sauceCards.length > 0;

  // Net macro impact of just the Customizations section's content (ingredient
  // add/remove/extra/light/swap changes plus any non-sauce/dressing addons)
  // — derived by subtracting everything else nutritionPerItem accounts for
  // (the base item at its selected variant, combo side/drink, sauces,
  // dressings) rather than summing the customization cards' own nutrition
  // directly, since those cards carry each ingredient's full per-unit value
  // and can't precisely represent partial actions like "Light" on their own.
  const baseNutrition = mainItem?.nutrition ?? null;
  const customizationImpact = useMemo<CoreMacros | null>(() => {
    if (!baseNutrition || customizationCards.length === 0) return null;

    const sauceTotals = sumCoreMacros(sauceCards);
    const dressingTotals = sumCoreMacros(dressingCards);
    const comboTotals: CoreMacros = {
      calories: (sideSelection?.nutrition?.calories ?? 0) + (drinkSelection?.nutrition?.calories ?? 0),
      protein: (sideSelection?.nutrition?.protein ?? 0) + (drinkSelection?.nutrition?.protein ?? 0),
      carbs: (sideSelection?.nutrition?.carbs ?? 0) + (drinkSelection?.nutrition?.carbs ?? 0),
      totalFat: (sideSelection?.nutrition?.totalFat ?? 0) + (drinkSelection?.nutrition?.totalFat ?? 0),
    };

    return {
      calories: cartItem.nutritionPerItem.calories - baseNutrition.calories - sauceTotals.calories - dressingTotals.calories - comboTotals.calories,
      protein: cartItem.nutritionPerItem.protein - baseNutrition.protein - sauceTotals.protein - dressingTotals.protein - comboTotals.protein,
      carbs: cartItem.nutritionPerItem.carbs - baseNutrition.carbs - sauceTotals.carbs - dressingTotals.carbs - comboTotals.carbs,
      totalFat: cartItem.nutritionPerItem.totalFat - baseNutrition.totalFat - sauceTotals.totalFat - dressingTotals.totalFat - comboTotals.totalFat,
    };
  }, [baseNutrition, customizationCards.length, sauceCards, dressingCards, sideSelection, drinkSelection, cartItem.nutritionPerItem]);

  const goToIngredients = () => onOpenSection?.("ingredients");
  const onCustomizationCardClick = goToIngredients;

  // The compact consolidated summary (Nutrition Facts + a flat "Selected
  // Ingredients"/"Selected Items" list) below — same underlying selections
  // as the category cards above, just rolled into one dense list instead of
  // the rich per-category breakdown. Peer order components (side, drink,
  // dressings, sauces) keep the full SelectionSummaryRow treatment; a
  // standard/combo item's own ingredient customizations are nested under
  // its Main Item row instead (see NestedCustomizationSummaryRow below).
  const peerSummaryRows = useMemo(() => {
    const rows: Array<{ id: string; name: string; image?: string; badge?: string }> = [];
    if (sideSelection) rows.push({ id: "summary-side", name: sideSelection.name, image: sideSelection.image, badge: sideSelection.variantLabel });
    if (drinkSelection) rows.push({ id: "summary-drink", name: drinkSelection.name, image: drinkSelection.image, badge: drinkSelection.variantLabel });
    dressingCards.forEach((card) => rows.push({ id: `summary-${card.id}`, name: card.name, image: card.image, badge: card.qualifierLabel }));
    sauceCards.forEach((card) => rows.push({ id: `summary-${card.id}`, name: card.name, image: card.image, badge: card.qualifierLabel }));
    if (!mainItem) {
      customizationCards.forEach((card) =>
        rows.push({
          id: `summary-${card.id}`,
          name: card.name,
          image: card.image,
          badge: card.qualifierLabel ?? (card.sign === "remove" ? "Removed" : "Added"),
        }),
      );
    }
    return rows;
  }, [mainItem, sideSelection, drinkSelection, dressingCards, sauceCards, customizationCards]);

  const mainItemCustomizationEntries = useMemo(
    () => (mainItem ? customizationCards.map((card) => ({ id: card.id, name: card.name, sign: card.sign })) : []),
    [mainItem, customizationCards],
  );

  const totalSelectedCount = (mainItem ? 1 : 0) + mainItemCustomizationEntries.length + peerSummaryRows.length;

  return (
    <div>
      <div>
        <h2 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">Order Details</h2>
        <p className="mt-1.5 text-sm text-slate-500">Review what&apos;s included in this item. Select a section to make changes.</p>
      </div>

      {hasAnything ? (
        <div className="mt-6 grid gap-5 sm:mt-10 sm:gap-6">
          {mainItem ? (
            <div>
              <PreviewSection kind="mainItem" label="Main Item">
                <ul className={cardGridClassName}>
                  <PresetIngredientCard
                    image={mainItem.image}
                    name={mainItem.name}
                    portionLabel={mainItem.variantLabel}
                    quantity={1}
                    isLocked={false}
                    nutrition={mainItem.nutrition}
                  />
                </ul>
              </PreviewSection>

              {customizationCards.length > 0 ? (
                <NestedUnderMainItem>
                  <NestedSectionHeading icon={summaryIconByKind.customization} label="Customizations" />
                  {customizationImpact ? <CustomizationImpactSummary delta={customizationImpact} /> : null}
                  <div className="grid gap-3">
                    <CustomizationGroup tone="add" label="Added" cards={addedCustomizationCards} onCardClick={onCustomizationCardClick} />
                    <CustomizationGroup tone="remove" label="Removed" cards={removedCustomizationCards} onCardClick={onCustomizationCardClick} />
                  </div>
                </NestedUnderMainItem>
              ) : null}
            </div>
          ) : null}

          {sideSelection ? (
            <PreviewSection kind="side" label="Side">
              <ul className={cardGridClassName}>
                <PresetIngredientCard
                  image={sideSelection.image}
                  name={sideSelection.name}
                  portionLabel={sideSelection.variantLabel}
                  quantity={1}
                  isLocked={false}
                  nutrition={sideSelection.nutrition}
                  onClick={() => onOpenSection?.("side")}
                />
              </ul>
            </PreviewSection>
          ) : null}

          {drinkSelection ? (
            <PreviewSection kind="drink" label="Drink">
              <ul className={cardGridClassName}>
                <PresetIngredientCard
                  image={drinkSelection.image}
                  name={drinkSelection.name}
                  portionLabel={drinkSelection.variantLabel}
                  quantity={1}
                  isLocked={false}
                  nutrition={drinkSelection.nutrition}
                  onClick={() => onOpenSection?.("drink")}
                />
              </ul>
            </PreviewSection>
          ) : null}

          {dressingCards.length > 0 ? (
            <PreviewSection kind="dressing" label="Dressings">
              <ul className={cardGridClassName}>
                {dressingCards.map((card) => (
                  <PresetIngredientCard
                    key={card.id}
                    image={card.image}
                    name={card.name}
                    portionLabel={card.qualifierLabel}
                    quantity={1}
                    isLocked={false}
                    nutrition={card.nutrition}
                    onClick={() => onOpenSection?.("dressings")}
                  />
                ))}
              </ul>
            </PreviewSection>
          ) : null}

          {sauceCards.length > 0 ? (
            <PreviewSection kind="sauce" label="Dipping Sauces">
              <ul className={cardGridClassName}>
                {sauceCards.map((card) => (
                  <PresetIngredientCard
                    key={card.id}
                    image={card.image}
                    name={card.name}
                    portionLabel={card.qualifierLabel}
                    quantity={1}
                    isLocked={false}
                    nutrition={card.nutrition}
                    onClick={() => onOpenSection?.("sauces")}
                  />
                ))}
              </ul>
            </PreviewSection>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-black/[0.06] bg-neutral-50/70 px-5 py-6 text-center sm:mt-10">
          <p className="text-sm font-semibold text-neutral-700">No customizations</p>
          <p className="mt-0.5 text-sm text-neutral-500">Standard preparation</p>
        </div>
      )}

      <NutritionDetailsGrid
        className="mt-6 sm:mt-10"
        nutritionFacts={<NutritionFactsPanel totals={cartItem.nutritionPerItem} />}
        details={
          <SelectionSummaryShell
            title="Selected Items"
            subtitle={`${cartItem.name} · ${totalSelectedCount} selected`}
            totals={{
              calories: cartItem.nutritionPerItem.calories,
              protein: cartItem.nutritionPerItem.protein,
              carbs: cartItem.nutritionPerItem.carbs,
              totalFat: cartItem.nutritionPerItem.totalFat,
            }}
          >
            {totalSelectedCount > 0 ? (
              <SelectionScrollList>
                {mainItem ? <SelectionSummaryRow key="summary-main-item" image={mainItem.image} name={mainItem.name} badge={mainItem.variantLabel} /> : null}
                {mainItemCustomizationEntries.length > 0 ? (
                  <li key="summary-main-item-customizations" className="list-none">
                    <NestedUnderMainItem compact>
                      <ul className="grid list-none gap-0.5 pl-0">
                        {mainItemCustomizationEntries.map((entry) => (
                          <NestedCustomizationSummaryRow key={entry.id} name={entry.name} sign={entry.sign} />
                        ))}
                      </ul>
                    </NestedUnderMainItem>
                  </li>
                ) : null}
                {peerSummaryRows.map((row) => (
                  <SelectionSummaryRow key={row.id} image={row.image} name={row.name} badge={row.badge} />
                ))}
              </SelectionScrollList>
            ) : (
              <p className="text-sm text-neutral-500">No additional selections.</p>
            )}
          </SelectionSummaryShell>
        }
      />
    </div>
  );
}
