"use client";

import type { ReactNode } from "react";
import Image from "@/components/ui/AppImage";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import SurfaceCard from "@/components/ui/SurfaceCard";
import ProteinScorePill from "@/components/menu-item-card/ProteinScorePill";
import MacroSplitChart, { buildMacroSegments, MacroLegendInfo } from "@/components/nutrition/MacroSplitChart";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";

// The gray two-panel wrapper (Nutrition Facts + a selection summary) — the
// single shared layout for every "Nutrition Facts + details card" pairing in
// the app (standard/combo/Build Your Own preview and customize screens, the
// cart item preview, the preset Build Your Own review, and the cart page's
// Nutrition & Meal Details section). Relies on the grid's default
// align-items:stretch so the right card always matches Nutrition Facts'
// height at md+; below md the two cards stack into separate single-item rows
// and this has no effect, so each card is free to grow to its own natural
// height. Use NutritionDetailsGrid below rather than wiring this className
// up by hand, so every screen gets the same breakpoint and order behavior.
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
    <div className={`${SUMMARY_PANELS_GRID_CLASSNAME} ${className}`.trim()}>
      <div className="order-2 md:order-1">{nutritionFacts}</div>
      <div className="order-1 min-w-0 md:order-2">{details}</div>
    </div>
  );
}

// md:h-full stretches to the grid row's height (set by whichever card is
// taller, almost always Nutrition Facts); md:min-h-0 lets this item actually
// shrink below its own content's intrinsic height so the list region below
// can be the thing that scrolls, instead of this card just growing past
// Nutrition Facts' height to fit a long list. Both are scoped to md+ so
// mobile (a single stacked column) gets no height constraint at all — see
// the content wrapper below for the matching min-h-0/overflow-y-auto half of
// this pattern.
const SHELL_ROOT_CLASSNAME = "flex flex-col rounded-2xl border border-black/10 bg-white p-5 md:h-full md:min-h-0";

// Same compact row already established for the Build Your Own order summary
// — a 32px image, a name, and either a tiny muted badge (a size/qualifier —
// "Medium", "Extra", "Removed") or an accessory control (the portion-mode
// quick-edit dropdown), never both. Generic over both use cases rather than
// duplicated per caller.
export function SelectionSummaryRow({
  image,
  fallbackImage,
  name,
  badge,
  accessory,
}: {
  image?: string;
  fallbackImage?: string;
  name: string;
  badge?: string;
  accessory?: ReactNode;
}) {
  return (
    <SurfaceCard as="li" padding="none" radius="default" shadow="none" className="flex items-center gap-2 rounded-xl px-3 py-2">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10 bg-neutral-100">
        {image || fallbackImage ? (
          <Image src={image || fallbackImage || ""} alt={name} width={32} height={32} className="h-full w-full object-cover" />
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
// scroll behavior instead of each screen reimplementing it. At md+ the
// content region (subtitle + children) is the only part that flexes/scrolls
// — via min-h-0 + overflow-y-auto, with no flex-grow — so a short list keeps
// its natural height (no forced stretch, no empty gap before Protein Score)
// while a list taller than the available space (bounded by Nutrition Facts'
// height once this shell is stretched to match it — see SHELL_ROOT_CLASSNAME)
// scrolls internally instead of growing the whole card past it. Protein
// Score and Macro Split are shrink-0 so they always stay visible below the
// list. Below md there's no stretched height to bound against, so the
// content region is unconstrained and grows naturally with the page.
export function SelectionSummaryShell({
  title,
  subtitle,
  totals,
  children,
}: {
  title: string;
  subtitle?: string;
  totals: SummaryMacroTotals;
  children: ReactNode;
}) {
  const proteinScore = getProteinPer100Calories(totals.protein, totals.calories);
  const proteinScoreTier = typeof proteinScore === "number" ? getProteinScoreTier(proteinScore) : undefined;
  const macroSegments = buildMacroSegments({ protein: totals.protein, carbs: totals.carbs, fat: totals.totalFat });

  return (
    <section className={SHELL_ROOT_CLASSNAME}>
      <h2 className="shrink-0 text-2xl font-bold text-neutral-900">{title}</h2>

      <div className="mt-5 flex flex-col gap-2 md:min-h-0 md:overflow-y-auto">
        {subtitle ? (
          <p className="shrink-0 truncate text-sm font-medium normal-case tracking-normal text-slate-500">{subtitle}</p>
        ) : null}
        {children}
      </div>

      <div className="mt-6 shrink-0 space-y-2 border-t border-black/[0.06] pt-6">
        <SectionEyebrow className="text-base text-neutral-500">Protein Score</SectionEyebrow>
        {typeof proteinScore === "number" && proteinScoreTier ? (
          <ProteinScorePill scorePerHundredCalories={proteinScore} tier={proteinScoreTier} />
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
