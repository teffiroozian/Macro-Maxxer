import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "@/components/ui/AppImage";
import { ArrowRight, Eye, EyeOff, Lock, RotateCcw, Save, Trash2 } from "lucide-react";
import type { MenuItem } from "@/types/menu";
import NutritionFactsPanel, {
  type NutritionFactsPanelProps,
} from "@/components/nutrition/NutritionFactsPanel";
import SurfaceCard from "@/components/ui/SurfaceCard";
import AppButton from "@/components/ui/AppButton";
import QuantityStepper from "@/components/QuantityStepper";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import InlineVariantSelect from "@/components/ui/InlineVariantSelect";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import type { CompactOption } from "@/components/menu-item-card/IngredientCompactCard";
import ProteinScorePill from "@/components/menu-item-card/ProteinScorePill";
import MacroSplitChart, { buildMacroSegments, MacroLegendInfo } from "@/components/nutrition/MacroSplitChart";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";
import { PairedPanelHeightProvider, PairedPanelSource, usePairedPanelHeight } from "@/components/PairedPanelHeight";

// The embedded variant's own two-column layout switches at `lg:`, unlike the
// shared SelectionSummaryShell pairing (which switches at `md:`) — see
// PairedPanelHeight.tsx for why a measured height (not grid stretch) is what
// actually keeps Selected Ingredients from growing past Nutrition Facts. The
// panel variant (View Build) has its own layout below that doesn't need this
// — Nutrition Facts and Selected Ingredients size independently there via
// plain flexbox, so there's nothing to measure/pair.
const BUILD_SUMMARY_PAIR_MEDIA_QUERY = "(min-width: 1024px)";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];

type PortionControl = { options: CompactOption[]; selectedId: string };

const INCLUDED_INGREDIENT_CATEGORY_KEY = "included ingredient";

// Stable empty-set fallback for the `excludedIngredientIds` prop — a fresh
// `new Set()` literal as a default value would be a new reference on every
// render, which would defeat `displayNutritionLabelTotals`'s memoization
// below even though the result never actually changes while nothing's
// excluded.
const EMPTY_EXCLUDED_INGREDIENT_IDS: Set<string> = new Set();

type Props = {
  adjustedNutritionLabelTotals: NutritionFactsPanelProps["totals"];
  selectedBuildName: string;
  // Entree type only (e.g. "Burrito"), no protein — used by the panel
  // variant's Build stat card, which is deliberately simpler than
  // selectedBuildName.
  selectedEntreeLabel: string;
  selectedIngredientCount: number;
  groupedSelectedIngredientEntries: Array<{
    categoryKey: string;
    categoryLabel: string;
    entries: SelectedEntry[];
  }>;
  ingredientPortionLabelById: Record<string, string>;
  lockedIngredientIds: Set<string>;
  restaurantLogo: string;
  onResetOrder?: () => void;
  onSaveOrder?: () => void;
  onAdjustIngredientQuantity: (ingredientId: string, delta: 1 | -1) => void;
  portionControlByIngredientId?: Record<string, PortionControl>;
  onPortionModeChange?: (item: MenuItem, modeId: string) => void;
  onNavigateToCategory?: (categoryKey: string) => void;
  hideActionButtons?: boolean;
  variant?: "embedded" | "panel";
  // Panel variant (View Build) only. Each removable ingredient's own
  // contribution to `adjustedNutritionLabelTotals`, already scaled/rounded
  // the same way — lets the panel subtract an eye-excluded ingredient out of
  // the displayed totals without needing to re-run the parent's full
  // serving-multiplier/rounding pipeline itself.
  ingredientNutritionContributionById?: Record<string, NutritionFactsPanelProps["totals"]>;
  // Panel variant only. Owned by the parent (not local state here) because
  // the sticky footer below this panel — rendered by StickyMacroTotalsBar,
  // outside this component — needs the same set to keep its own totals in
  // sync with the panel's.
  excludedIngredientIds?: Set<string>;
  onToggleExcludeIngredient?: (ingredientId: string) => void;
  // Panel variant only. Fully removes the ingredient from the actual build
  // (as opposed to the eye toggle, which only hides it from this panel's own
  // comparison totals).
  onRemoveIngredient?: (item: MenuItem) => void;
};

function SelectedIngredientRow({
  ingredientId,
  selectedIngredient,
  portionLabel,
  portionControl,
  isLocked,
  isPanel,
  isExcluded = false,
  restaurantLogo,
  onAdjustIngredientQuantity,
  onPortionModeChange,
  onToggleExcludeIngredient,
  onRemoveIngredient,
}: {
  ingredientId: string;
  selectedIngredient: { item: MenuItem; quantity: number };
  portionLabel?: string;
  portionControl?: PortionControl;
  isLocked: boolean;
  isPanel: boolean;
  isExcluded?: boolean;
  restaurantLogo: string;
  onAdjustIngredientQuantity: (ingredientId: string, delta: 1 | -1) => void;
  onPortionModeChange?: (item: MenuItem, modeId: string) => void;
  onToggleExcludeIngredient?: (ingredientId: string) => void;
  onRemoveIngredient?: (item: MenuItem) => void;
}) {
  if (!isPanel) {
    return (
      <SurfaceCard as="li" padding="none" radius="default" shadow="none" className="flex items-center justify-between rounded-xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
            <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={32} height={32} className="h-full w-full object-cover" />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
            {selectedIngredient.item.name}
            {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
            {portionLabel ? ` · ${portionLabel}` : ""}
          </span>
        </div>
        <QuantityStepper
          value={selectedIngredient.quantity}
          onDecrement={() => onAdjustIngredientQuantity(ingredientId, -1)}
          onIncrement={() => onAdjustIngredientQuantity(ingredientId, 1)}
          decrementLabel={`Decrease ${selectedIngredient.item.name}`}
          incrementLabel={`Increase ${selectedIngredient.item.name}`}
          decrementDisabled={isLocked}
          incrementDisabled={isLocked}
          variant="small"
        />
      </SurfaceCard>
    );
  }

  // The panel variant (View Build) is a summary/review surface, not an
  // editor — no quantity steppers, just the same compact
  // image/name/portion-selector row used by the item modal's Selected
  // Ingredients card (see SelectionSummaryRow).
  if (isLocked) {
    return (
      <SurfaceCard as="li" padding="none" radius="default" shadow="none" className="flex items-center gap-2 rounded-xl px-3 py-2 opacity-80">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
          <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={32} height={32} className="h-full w-full object-cover" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-600">
          {selectedIngredient.item.name}
          {portionLabel ? ` · ${portionLabel}` : ""}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Included
        </span>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      as="li"
      padding="none"
      radius="default"
      shadow="none"
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        isExcluded ? "border-dashed! border-slate-300!" : ""
      }`}
    >
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
        <Image src={selectedIngredient.item.image || restaurantLogo} alt={selectedIngredient.item.image ? selectedIngredient.item.name : ""} width={32} height={32} className="h-full w-full object-cover" />
      </div>
      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          isExcluded ? "text-slate-400 line-through" : "text-slate-900"
        }`}
      >
        {selectedIngredient.item.name}
        {selectedIngredient.quantity > 1 ? ` (x${selectedIngredient.quantity})` : ""}
      </span>
      {portionControl && onPortionModeChange ? (
        <InlineVariantSelect
          options={portionControl.options}
          selectedOptionId={portionControl.selectedId}
          onSelectOption={(optionId) => onPortionModeChange(selectedIngredient.item, optionId)}
          ariaLabel={`Change ${selectedIngredient.item.name} portion`}
          disabled={isExcluded}
        />
      ) : portionLabel ? (
        <span
          className={`shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
            isExcluded ? "text-black/30" : "text-black/60"
          }`}
        >
          {portionLabel}
        </span>
      ) : null}
      {isPanel ? (
        <>
          <button
            type="button"
            onClick={() => onToggleExcludeIngredient?.(ingredientId)}
            aria-pressed={isExcluded}
            aria-label={`${isExcluded ? "Include" : "Exclude"} ${selectedIngredient.item.name} from nutrition totals`}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-black/5 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50"
          >
            {isExcluded ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-black/10" />
          <button
            type="button"
            onClick={() => onRemoveIngredient?.(selectedIngredient.item)}
            aria-label={`Remove ${selectedIngredient.item.name}`}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      ) : null}
    </SurfaceCard>
  );
}

// Shared category-group header for both ingredient lists — a muted category
// eyebrow (Proteins, Rice, Beans, ...) with an optional "jump to this
// category in the builder" arrow, shown only in the panel variant (View
// Build; the embedded/edit variant never navigates). Label and arrow are one
// clickable target, not two independent hit areas.
function IngredientCategoryHeader({
  categoryLabel,
  categoryKey,
  canNavigateToCategory,
  onNavigateToCategory,
}: {
  categoryLabel: string;
  categoryKey: string;
  canNavigateToCategory: boolean;
  onNavigateToCategory?: (categoryKey: string) => void;
}) {
  if (canNavigateToCategory) {
    return (
      <button
        type="button"
        onClick={() => onNavigateToCategory?.(categoryKey)}
        aria-label={`Edit ${categoryLabel} in the builder`}
        className="group -ml-1 flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
      >
        <SectionEyebrow className="text-[10px] text-slate-500 group-hover:text-slate-700">{categoryLabel}</SectionEyebrow>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-700" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="px-1">
      <SectionEyebrow className="text-[10px] text-slate-500">{categoryLabel}</SectionEyebrow>
    </div>
  );
}

// Embedded (edit build) variant only. Reads the height PairedPanelSource
// measured off the Nutrition Facts panel (via the provider rendered by
// BuildSummaryDrawer below) and pins this card's root to it, so a long
// ingredient list scrolls internally instead of growing the card past
// Nutrition Facts. Split out from BuildSummaryDrawer because
// usePairedPanelHeight() needs to run in a component nested *inside*
// PairedPanelHeightProvider, not the component that renders the provider
// itself. The panel variant (View Build) has its own ingredients section
// further below — its chrome (no gray background wrapper, inline category
// arrow, no height pairing) differs enough that sharing this component
// wasn't worth the branching.
function SelectedIngredientsCard({
  selectedBuildName,
  selectedIngredientCount,
  groupedSelectedIngredientEntries,
  ingredientPortionLabelById,
  lockedIngredientIds,
  restaurantLogo,
  onAdjustIngredientQuantity,
  portionControlByIngredientId,
  onPortionModeChange,
}: {
  selectedBuildName: string;
  selectedIngredientCount: number;
  groupedSelectedIngredientEntries: Props["groupedSelectedIngredientEntries"];
  ingredientPortionLabelById: Props["ingredientPortionLabelById"];
  lockedIngredientIds: Props["lockedIngredientIds"];
  restaurantLogo: string;
  onAdjustIngredientQuantity: Props["onAdjustIngredientQuantity"];
  portionControlByIngredientId: Props["portionControlByIngredientId"];
  onPortionModeChange: Props["onPortionModeChange"];
}) {
  const pairedHeight = usePairedPanelHeight();

  return (
    <SurfaceCard
      as="section"
      padding="comfortable"
      radius="large"
      shadow="none"
      className="order-1 flex flex-col lg:order-2 lg:overflow-hidden"
      style={pairedHeight !== null ? { height: pairedHeight } : undefined}
    >
      <h3 className="shrink-0 text-2xl font-bold text-neutral-900">Selected Ingredients</h3>
      <p className="mt-2 shrink-0 text-sm font-semibold text-slate-600">{selectedBuildName} · {selectedIngredientCount} selected</p>
      <div className="mt-4 flex-1 rounded-xl bg-[#efefef] p-2 lg:min-h-0 lg:overflow-y-auto">
        <div className="space-y-3">
          {groupedSelectedIngredientEntries.map((group) => (
            <div key={group.categoryKey || "uncategorized"} className="space-y-1.5">
              <IngredientCategoryHeader
                categoryLabel={group.categoryLabel}
                categoryKey={group.categoryKey}
                canNavigateToCategory={false}
              />
              <ul className="grid gap-2">
                {group.entries.map(([ingredientId, selectedIngredient]) => (
                  <SelectedIngredientRow
                    key={ingredientId}
                    ingredientId={ingredientId}
                    selectedIngredient={selectedIngredient}
                    portionLabel={ingredientPortionLabelById[ingredientId]}
                    portionControl={portionControlByIngredientId?.[ingredientId]}
                    isLocked={lockedIngredientIds.has(ingredientId)}
                    isPanel={false}
                    restaurantLogo={restaurantLogo}
                    onAdjustIngredientQuantity={onAdjustIngredientQuantity}
                    onPortionModeChange={onPortionModeChange}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}

// Panel variant (View Build) stat block — a plain (unbordered) column used
// for Protein Score and Macro Split inside the single unified right-side
// card, so the two sit as sections of one card rather than separate
// floating cards.
function ViewBuildStatBlock({
  eyebrow,
  headerExtra,
  className = "",
  children,
}: {
  eyebrow: string;
  headerExtra?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex items-center gap-1.5">
        <SectionEyebrow className="text-[10px] text-neutral-500">{eyebrow}</SectionEyebrow>
        {headerExtra}
      </div>
      {children}
    </div>
  );
}

// Desktop-only (lg+) View Build Nutrition Facts: the exact shared
// NutritionFactsPanel, default variant — no bespoke spacing/type scale, no
// separate design. It's rendered at its normal size and then uniformly
// scaled down (never up) by just enough to fit the fixed-height row it sits
// in, so typography, spacing, dividers, and proportions all stay intact.
// `container` gets its real available height for free from the row's flex
// stretch (same mechanism the row always relied on); `content` is measured
// via `scrollHeight`, which — unlike `getBoundingClientRect` — reports the
// panel's natural, pre-transform size even while a scale is already
// applied, so the computed factor converges instead of oscillating.
function AutoFitNutritionFacts({
  totals,
  className = "",
}: {
  totals: NutritionFactsPanelProps["totals"];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const availableHeight = container.clientHeight;
      const naturalHeight = content.scrollHeight;
      if (availableHeight <= 0 || naturalHeight <= 0) return;
      setScale(Math.min(1, availableHeight / naturalHeight));
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, [totals]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`.trim()}>
      <div
        ref={contentRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
        }}
      >
        <NutritionFactsPanel totals={totals} />
      </div>
    </div>
  );
}

export default function BuildSummaryDrawer({
  adjustedNutritionLabelTotals,
  selectedBuildName,
  selectedEntreeLabel,
  selectedIngredientCount,
  groupedSelectedIngredientEntries,
  ingredientPortionLabelById,
  lockedIngredientIds,
  restaurantLogo,
  onResetOrder,
  onSaveOrder,
  onAdjustIngredientQuantity,
  portionControlByIngredientId,
  onPortionModeChange,
  onNavigateToCategory,
  hideActionButtons = false,
  variant = "embedded",
  ingredientNutritionContributionById,
  excludedIngredientIds = EMPTY_EXCLUDED_INGREDIENT_IDS,
  onToggleExcludeIngredient,
  onRemoveIngredient,
}: Props) {
  const isPanel = variant === "panel";

  // Subtracts each eye-excluded ingredient's own contribution (see
  // `ingredientNutritionContributionById` on Props) out of the real totals —
  // a live "what if" view that never touches `selectedIngredientItems`
  // itself, so it can't leak into the actual build or cart submission (the
  // parent computes the same subtraction independently for the sticky
  // footer's own totals, so the two stay in sync without this panel
  // reaching outside itself). Clamped at 0 as a defensive floor only; it
  // shouldn't normally bite — excluding every ingredient should already
  // land at (near) zero on its own.
  const displayNutritionLabelTotals = useMemo(() => {
    if (excludedIngredientIds.size === 0 || !ingredientNutritionContributionById) {
      return adjustedNutritionLabelTotals;
    }

    const next = { ...adjustedNutritionLabelTotals };
    excludedIngredientIds.forEach((ingredientId) => {
      const contribution = ingredientNutritionContributionById[ingredientId];
      if (!contribution) return;
      (Object.keys(next) as Array<keyof typeof next>).forEach((key) => {
        const current = next[key];
        const amount = contribution[key];
        if (typeof current !== "number" || typeof amount !== "number") return;
        next[key] = Math.max(0, current - amount);
      });
    });
    return next;
  }, [adjustedNutritionLabelTotals, excludedIngredientIds, ingredientNutritionContributionById]);

  // Desktop-only (lg+) Selected Ingredients bottom fade. Declared
  // unconditionally like the other hooks here; the ref simply stays
  // unattached (and this effect a no-op) for the embedded variant and for
  // mobile, where there's no internally-scrolling list to fade. Re-checked
  // on scroll and whenever the list's own content height changes (adding or
  // removing a row can flip whether it overflows at all), not just on
  // mount, so the fade never lingers once the user's actually scrolled to
  // the bottom or once removals shrink the list below the fold.
  const ingredientsScrollRef = useRef<HTMLDivElement | null>(null);
  const [showIngredientsBottomFade, setShowIngredientsBottomFade] = useState(false);

  useLayoutEffect(() => {
    const node = ingredientsScrollRef.current;
    if (!node) return;

    const updateFadeVisibility = () => {
      setShowIngredientsBottomFade(node.scrollHeight - node.scrollTop - node.clientHeight > 1);
    };

    updateFadeVisibility();
    node.addEventListener("scroll", updateFadeVisibility, { passive: true });

    const resizeObserver = new ResizeObserver(updateFadeVisibility);
    resizeObserver.observe(node);
    if (node.firstElementChild) resizeObserver.observe(node.firstElementChild);

    return () => {
      node.removeEventListener("scroll", updateFadeVisibility);
      resizeObserver.disconnect();
    };
  }, []);

  if (isPanel) {
    // Nutrition Facts (left) is a direct flex child of the row below, so the
    // row's default `align-items: stretch` gives it the row's full height
    // automatically — no wrapper div or explicit h-full needed. That row's
    // own height is fixed by `flex-1` on the gray shell (the available
    // space left after the header), so Nutrition Facts always fills exactly
    // that — it's the anchor the rest of the layout is sized around, never
    // clipped, never itself scrolling. The right side (one unified card)
    // stretches to match that same height, which is what gives its Selected
    // Ingredients region a real bounded height to scroll within — the only
    // thing that scrolls here; Protein Score and Macro Split sit below it,
    // shrink-0, always visible. The gray shell is `overflow-y-auto` (not
    // `overflow-hidden`) purely as a non-silent fallback for an unrealistically
    // short window — under normal conditions it never engages.
    const proteinScore = getProteinPer100Calories(displayNutritionLabelTotals.protein, displayNutritionLabelTotals.calories);
    const proteinScoreTier = typeof proteinScore === "number" ? getProteinScoreTier(proteinScore) : undefined;
    const macroSegments = buildMacroSegments({
      protein: displayNutritionLabelTotals.protein,
      carbs: displayNutritionLabelTotals.carbs,
      fat: displayNutritionLabelTotals.totalFat,
    });
    // Category grouping (Proteins, Rice, Beans, ...) is temporarily flattened
    // out of the panel's ingredient list per current design direction — the
    // grouped data and IngredientCategoryHeader are still used by the
    // embedded/edit variant above, so re-grouping here later is a small diff.
    // Included/required ingredients (e.g. the tortilla) sort ahead of
    // optional/customizable ones — `sort` is stable, so within each of those
    // two groups entries keep their original relative order.
    const flatSelectedIngredientEntries = groupedSelectedIngredientEntries
      .flatMap((group) => group.entries)
      .sort(([aIngredientId], [bIngredientId]) => {
        const aIsLocked = lockedIngredientIds.has(aIngredientId) ? 0 : 1;
        const bIsLocked = lockedIngredientIds.has(bIngredientId) ? 0 : 1;
        return aIsLocked - bIsLocked;
      });

    // Shared between the mobile and desktop trees below (same rows, same
    // `<ul>` — only the surrounding card chrome differs), so the row list
    // itself isn't duplicated. Placing the same element twice in the
    // returned tree is fine: only one of the two parent blocks is ever
    // actually laid out at a given viewport (the other is `display: none`),
    // so each mount is independent.
    const selectedIngredientsListNode = (
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {flatSelectedIngredientEntries.map(([ingredientId, selectedIngredient]) => (
          <SelectedIngredientRow
            key={ingredientId}
            ingredientId={ingredientId}
            selectedIngredient={selectedIngredient}
            portionLabel={ingredientPortionLabelById[ingredientId]}
            portionControl={portionControlByIngredientId?.[ingredientId]}
            isLocked={lockedIngredientIds.has(ingredientId)}
            isPanel
            isExcluded={excludedIngredientIds.has(ingredientId)}
            restaurantLogo={restaurantLogo}
            onAdjustIngredientQuantity={onAdjustIngredientQuantity}
            onPortionModeChange={onPortionModeChange}
            onToggleExcludeIngredient={onToggleExcludeIngredient}
            onRemoveIngredient={onRemoveIngredient}
          />
        ))}
      </ul>
    );

    return (
      <div className="flex h-full min-h-0 flex-col p-2.5 sm:p-3">
        <div className="flex shrink-0 items-center gap-2 pb-2.5">
          <RestaurantLogoBadge src={restaurantLogo} alt="" size="sm" ring={false} className="border border-black/10" />
          <h2 className="truncate text-base font-bold text-neutral-900 sm:text-lg">{selectedBuildName}</h2>
        </div>

        {/* Mobile (<lg): one normal block-flow column — every section is a
            full-width card stacked in reading order (Selected Ingredients,
            Protein Score, Macro Split, Nutrition Facts), and this single
            wrapper is the only scroll container. No nested flex-1/min-h-0
            chains and nothing absolutely positioned, so sections can't
            collapse to zero height and stack on top of each other the way
            the old shared (mobile+desktop) layout could. The sticky
            Close Build / Add to Cart footer lives one level up, in
            StickyMacroTotalsBar — outside this scroll area, so it stays
            fixed to the bottom of the modal regardless of content length. */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:hidden">
          <SurfaceCard as="section" padding="compact" radius="large" shadow="none">
            <h3 className="text-lg font-bold text-neutral-900">Selected Ingredients</h3>
            <p className="mt-1 text-sm font-medium text-slate-400">
              {selectedEntreeLabel} · {selectedIngredientCount} ingredient{selectedIngredientCount === 1 ? "" : "s"}
            </p>
            <div className="mt-3">{selectedIngredientsListNode}</div>
          </SurfaceCard>

          <SurfaceCard as="section" padding="compact" radius="large" shadow="none">
            <ViewBuildStatBlock eyebrow="Protein Score">
              {typeof proteinScore === "number" && proteinScoreTier ? (
                <ProteinScorePill scorePerHundredCalories={proteinScore} tier={proteinScoreTier} />
              ) : (
                <p className="text-sm text-neutral-500">—</p>
              )}
            </ViewBuildStatBlock>
          </SurfaceCard>

          <SurfaceCard as="section" padding="compact" radius="large" shadow="none">
            <ViewBuildStatBlock eyebrow="Macro Split" headerExtra={<MacroLegendInfo segments={macroSegments} />}>
              <MacroSplitChart segments={macroSegments} />
            </ViewBuildStatBlock>
          </SurfaceCard>

          {/* Normal/default NutritionFactsPanel — no `compact` variant, no
              scale wrapper. It renders at its natural height and is simply
              the last thing in this scrolling column. */}
          <NutritionFactsPanel totals={displayNutritionLabelTotals} />
        </div>

        {/* Desktop (lg+): unchanged two-column layout. */}
        <div className="hidden min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-app-background p-2 sm:p-2.5 lg:flex lg:flex-row lg:gap-3 lg:overflow-y-auto">
          <AutoFitNutritionFacts
            totals={displayNutritionLabelTotals}
            className="shrink-0 lg:w-[380px]"
          />

          <SurfaceCard
            as="section"
            padding="compact"
            radius="large"
            shadow="none"
            className="flex min-h-0 flex-1 flex-col lg:overflow-hidden"
          >
            <div className="shrink-0">
              <h3 className="text-lg font-bold text-neutral-900">Selected Ingredients</h3>
              <p className="mt-1 text-sm font-medium text-slate-400">
                {selectedEntreeLabel} · {selectedIngredientCount} ingredient{selectedIngredientCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="relative mt-3 min-h-0 flex-1">
              <div ref={ingredientsScrollRef} className="h-full pb-1 lg:overflow-y-auto lg:pb-3">
                {selectedIngredientsListNode}
              </div>
              {/* Very light "more below" affordance — only visible once the
                  list actually overflows and there's more to scroll to. */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-150 ${
                  showIngredientsBottomFade ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>

            <div className="mt-3 flex shrink-0 items-start gap-5 border-t border-black/[0.06] pt-3">
              <ViewBuildStatBlock eyebrow="Protein Score" className="shrink-0">
                {typeof proteinScore === "number" && proteinScoreTier ? (
                  <ProteinScorePill scorePerHundredCalories={proteinScore} tier={proteinScoreTier} />
                ) : (
                  <p className="text-sm text-neutral-500">—</p>
                )}
              </ViewBuildStatBlock>

              <ViewBuildStatBlock
                eyebrow="Macro Split"
                headerExtra={<MacroLegendInfo segments={macroSegments} />}
                className="min-w-0 flex-1"
              >
                <MacroSplitChart segments={macroSegments} />
              </ViewBuildStatBlock>
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideActionButtons ? (
        <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-end gap-2 bg-white/95 px-1 py-1 backdrop-blur-sm">
          <AppButton variant="secondary" size="sm" onClick={onResetOrder} className="h-7 px-3 text-xs text-slate-700">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset order</span>
          </AppButton>
          <AppButton size="sm" onClick={onSaveOrder} className="h-7 border-transparent bg-slate-900 px-3 text-xs hover:bg-slate-800">
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save order</span>
          </AppButton>
        </div>
      ) : null}

      <PairedPanelHeightProvider mediaQuery={BUILD_SUMMARY_PAIR_MEDIA_QUERY}>
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <PairedPanelSource className="order-2 lg:order-1">
            <NutritionFactsPanel totals={adjustedNutritionLabelTotals} />
          </PairedPanelSource>

          <SelectedIngredientsCard
            selectedBuildName={selectedBuildName}
            selectedIngredientCount={selectedIngredientCount}
            groupedSelectedIngredientEntries={groupedSelectedIngredientEntries}
            ingredientPortionLabelById={ingredientPortionLabelById}
            lockedIngredientIds={lockedIngredientIds}
            restaurantLogo={restaurantLogo}
            onAdjustIngredientQuantity={onAdjustIngredientQuantity}
            portionControlByIngredientId={portionControlByIngredientId}
            onPortionModeChange={onPortionModeChange}
          />
        </div>
      </PairedPanelHeightProvider>
    </div>
  );
}
