"use client";

import type { ReactNode } from "react";
import Image from "@/components/ui/AppImage";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import SurfaceCard from "@/components/ui/SurfaceCard";
import ProteinScorePill from "@/components/menu-item-card/ProteinScorePill";
import type { ProteinScoreDetailItem } from "@/components/nutrition/ProteinScoreDetails";
import MacroSplitChart, { buildMacroSegments, MacroLegendInfo } from "@/components/nutrition/MacroSplitChart";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";
import { PairedPanelHeightProvider, PairedPanelSource, usePairedPanelHeight } from "@/components/PairedPanelHeight";

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

// Same compact row already established for the Build Your Own order summary
// — a 32px image, a name, and either a tiny muted badge (a size/qualifier —
// "Medium", "Extra", "Removed") or an accessory control (the portion-mode
// quick-edit dropdown), never both. Generic over both use cases rather than
// duplicated per caller.
export function SelectionSummaryRow({
  image,
  fallbackImage,
  name,
  imageAlt,
  badge,
  accessory,
}: {
  image?: string;
  fallbackImage?: string;
  name: string;
  imageAlt?: string;
  badge?: string;
  accessory?: ReactNode;
}) {
  return (
    <SurfaceCard as="li" padding="none" radius="default" shadow="none" className="flex min-w-0 max-w-full items-center gap-2 rounded-xl px-3 py-2">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
        {image || fallbackImage ? (
          <Image src={image || fallbackImage || ""} alt={image ? imageAlt ?? name : ""} width={32} height={32} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{name}</span>
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
export function SelectionSummaryShell({
  title,
  subtitle,
  totals,
  beforeList,
  proteinScoreItems,
  children,
}: {
  title: string;
  subtitle?: string;
  totals: SummaryMacroTotals;
  // Rendered above the scroll region (after title/subtitle, same shrink-0
  // treatment) — for a label like "Items" that should read as part of the
  // card's fixed header, not sit inside the gray scrollable surface.
  beforeList?: ReactNode;
  proteinScoreItems?: ProteinScoreDetailItem[];
  children: ReactNode;
}) {
  const pairedHeight = usePairedPanelHeight();
  const proteinScore = getProteinPer100Calories(totals.protein, totals.calories);
  const proteinScoreTier = typeof proteinScore === "number" ? getProteinScoreTier(proteinScore) : undefined;
  const macroSegments = buildMacroSegments({ protein: totals.protein, carbs: totals.carbs, fat: totals.totalFat });

  return (
    <section
      className={SHELL_ROOT_CLASSNAME}
      style={pairedHeight !== null ? { height: pairedHeight } : undefined}
    >
      <h2 className="shrink-0 text-2xl font-bold text-neutral-900">{title}</h2>

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

      <div className="mt-6 shrink-0 space-y-2 border-t border-black/[0.06] pt-6">
        <SectionEyebrow className="text-base text-neutral-500">Protein Score</SectionEyebrow>
        {typeof proteinScore === "number" && proteinScoreTier ? (
          <ProteinScorePill
            scorePerHundredCalories={proteinScore}
            tier={proteinScoreTier}
            itemName={title}
            items={proteinScoreItems}
            protein={totals.protein}
            calories={totals.calories}
          />
        ) : (
          <p className="text-sm text-neutral-500">—</p>
        )}
      </div>

      <div className="mt-6 shrink-0 space-y-2 border-t border-black/[0.06] pt-6">
        <div className="flex items-center gap-1.5">
          <SectionEyebrow className="text-base text-neutral-500">Macro Split</SectionEyebrow>
          <MacroLegendInfo segments={macroSegments} />
        </div>
        <MacroSplitChart segments={macroSegments} />
      </div>
    </section>
  );
}
