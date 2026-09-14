"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import type { CoreMacros, Nutrition } from "@/types/nutrition";

function format(value?: number, suffix = "") {
  return value === undefined || value === null || Number.isNaN(value)
    ? `—${suffix}`
    : `${value}${suffix}`;
}

function formatDelta(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value}${suffix}`;
}

function NutritionFactsInfoTooltip({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const supportsHoverRef = useRef(false);

  useEffect(() => {
    supportsHoverRef.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onMouseEnter={() => {
          if (supportsHoverRef.current) setIsOpen(true);
        }}
        onMouseLeave={() => {
          if (supportsHoverRef.current) setIsOpen(false);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen(true)}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[#16a34a] transition hover:text-[#128a3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute top-full left-1/2 z-10 mt-2 w-56 -translate-x-1/2 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] leading-snug font-medium text-white shadow-lg transition-opacity duration-150 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        {description}
      </span>
    </span>
  );
}

export type NutritionFactsPanelVariant = "default" | "compact";

export type NutritionFactsPanelProps = {
  totals: Nutrition;
  title?: string;
  caption?: string;
  showCustomizationDeltas?: boolean;
  activeCustomizationTotals?: CoreMacros;
  className?: string;
  // "compact" keeps the same data, nutrient order, and visual identity as
  // "default" — it only tightens outer padding, row padding, and the
  // heading/divider/disclaimer spacing so the full label can fit somewhere
  // shorter than the default was designed for (the View Build modal's
  // Nutrition Facts column). Row/heading font sizes are untouched: the
  // spacing reduction alone is enough, and shrinking type on top of it would
  // cost readability without buying back any real height. Every usage that
  // doesn't pass this prop renders exactly as before.
  variant?: NutritionFactsPanelVariant;
};

// The heading and Calories row stay full-size in both variants (they're
// what makes this still read as "Nutrition Facts" rather than a generic
// stat block); "compact" saves its height from spacing plus a one-step font
// reduction on the repeated nutrient rows specifically, since those are the
// rows that repeat 9x and dominate the total height.
const variantSpacing: Record<
  NutritionFactsPanelVariant,
  {
    sectionPadding: string;
    headingMargin: string;
    divider: string;
    bigRow: string;
    bigRowText: string;
    subRow: string;
    subRowText: string;
    disclaimer: string;
  }
> = {
  default: {
    sectionPadding: "p-5",
    headingMargin: "mb-4",
    divider: "my-3 h-[3px]",
    bigRow: "py-3",
    bigRowText: "text-base",
    subRow: "py-2.5 pl-5",
    subRowText: "text-sm",
    disclaimer: "mt-3",
  },
  compact: {
    sectionPadding: "p-4",
    headingMargin: "mb-2",
    divider: "my-1.5 h-[2px]",
    bigRow: "py-1.5",
    bigRowText: "text-sm",
    subRow: "py-1 pl-5",
    subRowText: "text-xs",
    disclaimer: "mt-2",
  },
};

export default function NutritionFactsPanel({
  totals: n,
  title = "Nutrition Facts",
  caption = "Amount per serving",
  showCustomizationDeltas = false,
  activeCustomizationTotals,
  className = "",
  variant = "default",
}: NutritionFactsPanelProps) {
  const spacing = variantSpacing[variant];

  return (
    <section className={`rounded-2xl border border-black/10 bg-white ${spacing.sectionPadding} ${className}`.trim()}>
      <h2 className={`${spacing.headingMargin} text-2xl font-bold text-neutral-900`}>{title}</h2>

      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span>{caption}</span>
        {showCustomizationDeltas ? (
          <NutritionFactsInfoTooltip
            label="What do the green values mean?"
            description="Green values show the difference between your customized order and this item's base nutrition."
          />
        ) : null}
      </div>

      <div className="mt-1 flex items-end justify-between">
        <h3 className="text-xl font-bold text-neutral-900">Calories</h3>
        <div className="inline-flex items-baseline gap-1.5">
          <div className="text-xl font-bold text-neutral-900">
            {n.calories === undefined || Number.isNaN(n.calories)
              ? "—"
              : n.calories}
          </div>
          {showCustomizationDeltas &&
          activeCustomizationTotals &&
          activeCustomizationTotals.calories !== 0 ? (
            <span className="text-sm leading-none font-bold text-[#16a34a]">
              {formatDelta(activeCustomizationTotals.calories)}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`${spacing.divider} rounded-full bg-neutral-900/80`} />

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.bigRow}`}>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          Total Fat
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
            {format(n.totalFat, "g")}
          </div>
          {showCustomizationDeltas &&
          activeCustomizationTotals &&
          activeCustomizationTotals.totalFat !== 0 ? (
            <span className="text-sm leading-none font-bold text-[#16a34a]">
              {formatDelta(activeCustomizationTotals.totalFat, "g")}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.subRow}`}>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>Sat Fat</div>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>
          {format(n.satFat, "g")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.subRow}`}>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>Trans Fat</div>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>
          {format(n.transFat, "g")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.bigRow}`}>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          Cholesterol
        </div>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          {format(n.cholesterol, "mg")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.bigRow}`}>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          Sodium
        </div>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          {format(n.sodium, "mg")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.bigRow}`}>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          Carbohydrates
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
            {format(n.carbs, "g")}
          </div>
          {showCustomizationDeltas &&
          activeCustomizationTotals &&
          activeCustomizationTotals.carbs !== 0 ? (
            <span className="text-sm leading-none font-bold text-[#16a34a]">
              {formatDelta(activeCustomizationTotals.carbs, "g")}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.subRow}`}>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>Fiber</div>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>
          {format(n.fiber, "g")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.subRow}`}>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>Sugars</div>
        <div className={`${spacing.subRowText} font-medium text-slate-500`}>
          {format(n.sugars, "g")}
        </div>
      </div>

      <div className={`flex items-baseline justify-between border-b border-black/10 ${spacing.bigRow}`}>
        <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
          Protein
        </div>
        <div className="inline-flex items-baseline gap-1.5">
          <div className={`${spacing.bigRowText} font-semibold text-neutral-900`}>
            {format(n.protein, "g")}
          </div>
          {showCustomizationDeltas &&
          activeCustomizationTotals &&
          activeCustomizationTotals.protein !== 0 ? (
            <span className="text-sm leading-none font-bold text-[#16a34a]">
              {formatDelta(activeCustomizationTotals.protein, "g")}
            </span>
          ) : null}
        </div>
      </div>

      <p className={`${spacing.disclaimer} text-xs leading-snug text-slate-500`}>
        2,000 calories a day is used for general nutrition advice, but
        calorie needs vary. Values may vary by location, serving size, and
        customizations.
      </p>
    </section>
  );
}
