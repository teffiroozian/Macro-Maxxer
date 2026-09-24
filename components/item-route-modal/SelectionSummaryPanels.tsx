"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import ProteinScorePill from "@/components/menu-item-card/ProteinScorePill";
import ProteinScoreDetails from "@/components/nutrition/ProteinScoreDetails";
import MacroSplitChart from "@/components/nutrition/MacroSplitChart";
import { buildMacroSegments } from "@/components/nutrition/macroSegments";
import MacroSplitDetails from "@/components/nutrition/MacroSplitDetails";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";
import { PairedPanelHeightProvider, PairedPanelSource, usePairedPanelHeight } from "@/components/PairedPanelHeight";
import type { MacroBreakdownItem } from "@/types/macroBreakdown";
import type { ItemImagePresentation } from "@/types/menu";

// The shared eyebrow style for every section label across the app's Meal
// Details surfaces (ITEMS, PROTEIN SCORE, MACRO SPLIT) — one constant so the
// cart page, item overview modal, and customize modal can never drift from
// each other again. Matches the cart page's original "Items" label exactly.
export const MEAL_DETAILS_SECTION_LABEL_CLASSNAME = "text-sm text-slate-500";

// The gray two-panel wrapper (Nutrition Facts + a selection summary) — the
// single shared layout for every "Nutrition Facts + details card" pairing in
// the app (standard/combo/Build Your Own preview and customize screens, the
// cart item preview, the preset Build Your Own review, and the cart page's
// Nutrition & Meal Details section). At md+, PairedPanelHeightProvider
// measures the Nutrition Facts side and SelectionSummaryShell applies that
// as an explicit height (see PairedPanelHeight.tsx for why plain grid
// stretch isn't enough); below md the two cards stack into separate
// single-item rows and each is free to grow to its own natural height. Use
// NutritionDetailsGrid below rather than wiring this className up by hand,
// so every screen gets the same breakpoint, order, and height behavior.
export const SUMMARY_PANELS_GRID_CLASSNAME =
  "grid grid-cols-1 gap-3 rounded-3xl border border-black/8 bg-app-background p-3 md:grid-cols-2";

// Pairs a Nutrition Facts panel with its details card (Selected Items,
// Selected Ingredients, Meal Breakdown, ...) using the app's one shared
// height/scroll behavior — see SUMMARY_PANELS_GRID_CLASSNAME and
// SelectionSummaryShell. `details` swaps to the top on mobile (order-1) so
// it reads before Nutrition Facts there, matching every existing screen.
export function NutritionDetailsGrid({
  nutritionFacts,
  details,
  className = "",
}: {
  nutritionFacts: ReactNode;
  details: ReactNode;
  className?: string;
}) {
  return (
    <PairedPanelHeightProvider>
      <div className={`${SUMMARY_PANELS_GRID_CLASSNAME} ${className}`.trim()}>
        <PairedPanelSource className="order-2 md:order-1">{nutritionFacts}</PairedPanelSource>
        <div className="order-1 min-w-0 md:order-2">{details}</div>
      </div>
    </PairedPanelHeightProvider>
  );
}

// No height utility here — the root's height is set inline (see render
// below) from usePairedPanelHeight() once measured at md+, since that's the
// one thing that reliably caps this card at Nutrition Facts' rendered height
// (a percentage/stretch height doesn't — see PairedPanelHeight.tsx).
// md:overflow-hidden is a backstop so nothing can visually spill past that
// height even if the internal flex math is ever off by a pixel.
const SHELL_ROOT_CLASSNAME = "flex flex-col rounded-2xl border border-black/10 bg-white p-5 md:overflow-hidden";

export type SelectionSummaryRowState = "default" | "muted" | "excluded";

// "muted": the row is locked/already-included (BuildSummaryDrawer's View
// Build panel) — dims the whole row and softens the name text, but doesn't
// strike it through since it's still part of the build, just not editable
// here. "excluded": the row has been toggled out of nutrition totals — a
// dashed border plus a struck-through, faded name marks it as present but
// not counted.
const rowStateClassNames: Record<SelectionSummaryRowState, { wrapper: string; name: string }> = {
  default: { wrapper: "", name: "text-slate-900" },
  muted: { wrapper: "opacity-80", name: "text-slate-600" },
  excluded: { wrapper: "border-dashed! border-slate-300!", name: "text-slate-400 line-through" },
};

// Same compact row already established for the Build Your Own order summary
// — a 32px image, a name, and either a tiny muted badge (a size/qualifier —
// "Medium", "Extra", "Removed") or an accessory control (the portion-mode
// quick-edit dropdown, a quantity stepper, or a set of row actions), never
// more than one accessory slot. Generic over every "selected ingredient/item
// row" use case in the app (the standard item modal's Selected Ingredients
// card, the prebuilt-meal review card, and BuildSummaryDrawer's editable and
// read-only ingredient rows) rather than duplicated per caller.
export function SelectionSummaryRow({
  image,
  fallbackImage,
  imagePresentation,
  name,
  imageAlt,
  badge,
  accessory,
  state = "default",
}: {
  image?: string;
  fallbackImage?: string;
  // Item-level image display override — same shared metadata every other
  // item card/modal reads (see lib/itemImagePresentation.ts), routed
  // through RestaurantItemImage so this row respects it exactly like every
  // other rendered item image does.
  imagePresentation?: ItemImagePresentation;
  name: string;
  imageAlt?: string;
  badge?: string;
  accessory?: ReactNode;
  state?: SelectionSummaryRowState;
}) {
  const { wrapper: stateWrapperClassName, name: stateNameClassName } = rowStateClassNames[state];

  return (
    <SurfaceCard
      as="li"
      padding="none"
      radius="default"
      shadow="none"
      className={`flex min-w-0 max-w-full items-center gap-2 rounded-xl px-3 py-2 ${stateWrapperClassName}`.trim()}
    >
      <RestaurantItemImage
        src={image || fallbackImage}
        alt={image ? imageAlt ?? name : ""}
        imagePresentation={imagePresentation}
        fallbackClassName="object-cover"
        containerClassName="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-slate-100"
      />
      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${stateNameClassName}`}>{name}</span>
      {badge ? (
        <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/60">{badge}</span>
      ) : null}
      {accessory}
    </SurfaceCard>
  );
}

// Generic row list — works with any row content (SelectionSummaryRow or
// otherwise) instead of being locked to the Build Your Own ingredient shape.
// Deliberately has no max-height/overflow of its own: SelectionSummaryShell's
// content wrapper is the one shared scroll container for this content at
// md+, and the modal/page body handles scrolling below that.
export function SelectionScrollList({ children }: { children: ReactNode }) {
  return <ul className="grid list-none gap-2 pl-0">{children}</ul>;
}

// The one shared item row for every Meal Details "Items" list (cart page,
// item overview modal, customize modal) — an image, the item's name, an
// optional secondary line for its size/variant/configuration underneath the
// name, and quantity pinned to the far right as its own "×N" badge. Secondary
// text and quantity are deliberately separate slots (never combined into one
// badge) so a row scales from a plain "×1" item up to "×2 · Medium" without
// the two ever competing for the same space. Modeled directly on the cart
// page's Meal Breakdown row, which is this app's reference implementation.
export function MealDetailItemRow({
  image,
  imagePresentation,
  imageFallbackClassName = "object-contain p-1",
  imageFallbackBackgroundColor,
  name,
  secondaryText,
  quantity = 1,
  onClick,
  activateLabel,
}: {
  image?: string;
  imagePresentation?: ItemImagePresentation;
  imageFallbackClassName?: string;
  imageFallbackBackgroundColor?: string;
  name: string;
  secondaryText?: string;
  quantity?: number;
  onClick?: () => void;
  activateLabel?: string;
}) {
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": activateLabel ?? `View details for ${name}`,
        onClick,
        onKeyDown: (event: KeyboardEvent<HTMLLIElement>) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onClick();
        },
      }
    : {};

  return (
    <li
      {...interactiveProps}
      className={`flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 outline-none transition ${
        onClick
          ? "cursor-pointer hover:border-black/20 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          : ""
      }`}
    >
      <RestaurantItemImage
        src={image}
        alt={name}
        imagePresentation={imagePresentation}
        fallbackClassName={imageFallbackClassName}
        fallbackBackgroundColor={imageFallbackBackgroundColor}
        containerClassName="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-50"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        {secondaryText ? (
          <p className="line-clamp-2 min-w-0 break-words text-xs text-slate-500">{secondaryText}</p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/60">
        ×{quantity}
      </span>
    </li>
  );
}

export type SummaryMacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  totalFat: number;
};

// The shared shell: title, an optional subtitle, the (already-built) row
// list, then Protein Score and Macro Split below it — reused by every
// details card in the app (Selected Items, Selected Ingredients, Meal
// Breakdown, Meal Details) so they all share the same layout, height, and
// scroll behavior instead of each screen reimplementing it. At md+ (inside a
// NutritionDetailsGrid, which supplies the measured height via
// usePairedPanelHeight — see PairedPanelHeight.tsx), the root's height is
// pinned to Nutrition Facts' real rendered height; title/subtitle and
// Protein Score/Macro Split are shrink-0 so they always stay visible, and
// only the list region between them (flex-1 + min-h-0 + overflow-y-auto) can
// scroll — it can never make the card itself taller. A short list still just
// keeps its natural height with no forced stretch. Below md (or outside any
// provider) the measured height is null, so the card is unconstrained and
// grows naturally with the page. The scroll region itself gets a flat,
// solid bg-app-background surface + inset padding + soft radius (same muted
// tone used elsewhere for "list sits inside a card" framing) purely so it
// reads as a distinct scrollable area — individual rows stay white via
// SelectionSummaryRow/SurfaceCard. Deliberately a plain background-color,
// not a gradient/fade utility (background-attachment tricks etc.) — those
// clobber the flat color with a `background` shorthand, which read as an
// uneven gradient instead of a uniform surface.

// Shared hover/click treatment for the Protein Score and Macro Split
// sections below — the whole section is one clickable row (not just the
// score chip/chart), with a soft neutral hover background and a trailing
// chevron, so the two read as sibling analytical sections that behave the
// same way. `-mx-2`/`px-2` lets the hover background bleed slightly past the
// content column without moving the section's own border-t divider, which
// stays at the shell's existing inset. Generous py-4 makes the hoverable/
// tappable area feel like a full-height card rather than a thin strip.
const CLICKABLE_SECTION_CLASSNAME =
  "group -mx-2 flex w-full cursor-pointer flex-col gap-2 rounded-xl px-2 py-4 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

function SectionHeaderRow({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <SectionEyebrow className={MEAL_DETAILS_SECTION_LABEL_CLASSNAME}>{label}</SectionEyebrow>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </span>
  );
}

export function SelectionSummaryShell({
  title,
  subtitle,
  totals,
  beforeList,
  proteinScoreItems,
  proteinScoreImageClassName,
  proteinScoreImageBackgroundColor,
  children,
}: {
  title: string;
  subtitle?: string;
  totals: SummaryMacroTotals;
  // Rendered above the scroll region (after title/subtitle, same shrink-0
  // treatment) — for a label like "Items" that should read as part of the
  // card's fixed header, not sit inside the gray scrollable surface.
  beforeList?: ReactNode;
  // Backs both the Protein Score item-by-item list and the Macro Split
  // "Where it's coming from" ranking — a superset of ProteinScoreDetailItem
  // (see types/macroBreakdown.ts) so this one list can drive both modals.
  proteinScoreItems?: MacroBreakdownItem[];
  // Restaurant-level image display defaults for the Protein Score modal's
  // item thumbnails (each proteinScoreItems entry can still override via
  // its own imagePresentation) — see lib/itemImagePresentation.ts.
  proteinScoreImageClassName?: string;
  proteinScoreImageBackgroundColor?: string;
  children: ReactNode;
}) {
  const pairedHeight = usePairedPanelHeight();
  const [isProteinScoreOpen, setIsProteinScoreOpen] = useState(false);
  const [isMacroSplitOpen, setIsMacroSplitOpen] = useState(false);
  const proteinScore = getProteinPer100Calories(totals.protein, totals.calories);
  const proteinScoreTier = typeof proteinScore === "number" ? getProteinScoreTier(proteinScore) : undefined;
  const macroSegments = buildMacroSegments({ protein: totals.protein, carbs: totals.carbs, fat: totals.totalFat });

  return (
    <section
      className={SHELL_ROOT_CLASSNAME}
      style={pairedHeight !== null ? { height: pairedHeight } : undefined}
    >
      <h2 className="shrink-0 text-2xl font-bold text-slate-900">{title}</h2>

      {subtitle ? (
        <p className="mt-5 shrink-0 truncate text-sm font-medium normal-case tracking-normal text-slate-500">{subtitle}</p>
      ) : null}

      {beforeList ? (
        <div className={`shrink-0 ${subtitle ? "mt-2" : "mt-5"}`}>{beforeList}</div>
      ) : null}

      <div
        className={`flex-1 md:min-h-0 md:overflow-y-auto md:rounded-xl md:bg-app-background md:p-2 ${subtitle || beforeList ? "mt-2" : "mt-5"}`}
      >
        {children}
      </div>

      <div className="mt-3 shrink-0 border-t border-black/[0.06] pt-2">
        {typeof proteinScore === "number" && proteinScoreTier ? (
          <button
            type="button"
            className={CLICKABLE_SECTION_CLASSNAME}
            onClick={() => setIsProteinScoreOpen(true)}
            aria-haspopup="dialog"
          >
            <SectionHeaderRow label="Protein Score" />
            <ProteinScorePill
              interactive={false}
              scorePerHundredCalories={proteinScore}
              tier={proteinScoreTier}
              itemName={title}
              imageClassName={proteinScoreImageClassName}
              imageBackgroundColor={proteinScoreImageBackgroundColor}
              protein={totals.protein}
              calories={totals.calories}
            />
          </button>
        ) : (
          <div className="space-y-2 px-2 py-4">
            <SectionEyebrow className={MEAL_DETAILS_SECTION_LABEL_CLASSNAME}>Protein Score</SectionEyebrow>
            <p className="text-sm text-slate-500">—</p>
          </div>
        )}
      </div>

      <div className="mt-1 shrink-0 border-t border-black/[0.06] pt-2">
        <button
          type="button"
          className={CLICKABLE_SECTION_CLASSNAME}
          onClick={() => setIsMacroSplitOpen(true)}
          aria-haspopup="dialog"
        >
          <SectionHeaderRow label="Macro Split" />
          <MacroSplitChart segments={macroSegments} />
        </button>
      </div>

      {typeof proteinScore === "number" && proteinScoreTier && isProteinScoreOpen ? (
        <ProteinScoreDetails
          open
          onClose={() => setIsProteinScoreOpen(false)}
          score={proteinScore}
          protein={totals.protein}
          calories={totals.calories}
          name={title}
          imageClassName={proteinScoreImageClassName}
          imageBackgroundColor={proteinScoreImageBackgroundColor}
          items={proteinScoreItems}
        />
      ) : null}

      {isMacroSplitOpen ? (
        <MacroSplitDetails open onClose={() => setIsMacroSplitOpen(false)} totals={totals} items={proteinScoreItems} />
      ) : null}
    </section>
  );
}
