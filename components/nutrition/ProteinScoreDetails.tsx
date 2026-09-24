"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, X, Zap } from "lucide-react";
import { formatMacroDisplayNumber, formatProteinScoreDisplay } from "@/components/nutrition/macroDisplay";
import {
  ELITE_VISUAL_CEILING,
  getProteinPer100Calories,
  getProteinScoreTier,
  PROTEIN_SCORE_TIER_ORDER,
  PROTEIN_SCORE_TIER_SCALE,
  type ProteinScoreTier,
} from "@/lib/nutrition";
import type { ItemImagePresentation } from "@/types/menu";
import type { MacroBreakdownEntry, MacroBreakdownNestedKind } from "@/types/macroBreakdown";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";

export type ProteinScoreDetailItem = {
  id: string;
  name: string;
  image?: string;
  // Item-level override for how this item's own image is displayed here —
  // same shared metadata every other item card/modal reads (see
  // lib/itemImagePresentation.ts). Falls back to the restaurant-level
  // defaults passed to ProteinScoreDetails/ProteinScorePill.
  imagePresentation?: ItemImagePresentation;
  calories: number;
  protein: number;
  // "Ingredients" for a fully build-your-own item (Chipotle), "Items" for a
  // composite/menu item (a combo's side/drink, sauces, addons) — rendered
  // as its own drill-down-free breakdown underneath this item's own Protein
  // Score/How It's Calculated/Where It Lands sections. Every render site
  // below only shows this section once nestedItems has more than one entry
  // — "items" nesting always includes the parent itself as one entry, so a
  // lone entry means there's nothing beyond the parent to break down.
  nestedKind?: MacroBreakdownNestedKind;
  nestedItems?: MacroBreakdownEntry[];
};

// The scale-tick/marker bar color for each tier — the one color this modal
// needs that proteinScoreTierStyles doesn't already provide (that file
// covers the pill/detail-card chip, icon background, icon, and value text).
// Every other field below is derived from proteinScoreTierStyles instead of
// re-declaring the same hex values a second time.
const tierBarColors: Record<ProteinScoreTier, string> = {
  low: "bg-[#94A3B8]",
  moderate: "bg-[#64748B]",
  good: "bg-[#B08A3E]",
  excellent: "bg-[#4C84C4]",
  elite: "bg-[#047857]",
};

const tierColors: Record<ProteinScoreTier, { bar: string; text: string; soft: string; iconBg: string; icon: string }> =
  Object.fromEntries(
    PROTEIN_SCORE_TIER_ORDER.map((tier) => [
      tier,
      {
        bar: tierBarColors[tier],
        text: proteinScoreTierStyles[tier].value,
        soft: proteinScoreTierStyles[tier].chip,
        iconBg: proteinScoreTierStyles[tier].iconWrap,
        icon: proteinScoreTierStyles[tier].icon,
      },
    ]),
  ) as Record<ProteinScoreTier, { bar: string; text: string; soft: string; iconBg: string; icon: string }>;

function ScoreScale({ score }: { score: number }) {
  const tier = getProteinScoreTier(score);
  const styles = tierColors[tier];
  const tierIndex = PROTEIN_SCORE_TIER_ORDER.indexOf(tier);
  const range = PROTEIN_SCORE_TIER_SCALE[tier];
  const upper = range.max ?? ELITE_VISUAL_CEILING;
  const progress = Math.max(0, Math.min(1, (score - range.min) / (upper - range.min)));
  const markerPosition = ((tierIndex + progress) / PROTEIN_SCORE_TIER_ORDER.length) * 100;

  return (
    <div className="mt-6 border-t border-black/[0.06] pt-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Where it lands</h3>
      <div className="relative mt-8">
        <div
          className={`absolute -top-7 -translate-x-1/2 text-xs font-bold ${styles.text}`}
          style={{ left: `${Math.max(2, Math.min(98, markerPosition))}%` }}
        >
          {formatProteinScoreDisplay(score)}
        </div>
        <div
          className={`absolute -top-2 h-4 w-0.5 -translate-x-1/2 rounded-full ${styles.bar}`}
          style={{ left: `${Math.max(2, Math.min(98, markerPosition))}%` }}
          aria-hidden="true"
        />
        <div className="grid grid-cols-5 gap-1" aria-label={`Protein score ${formatProteinScoreDisplay(score)}, ${PROTEIN_SCORE_TIER_SCALE[tier].label}`}>
          {PROTEIN_SCORE_TIER_ORDER.map((scaleTier) => (
            <div key={scaleTier} className={`h-2 rounded-full ${tierColors[scaleTier].bar} ${tier === scaleTier ? "opacity-100" : "opacity-25"}`} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {PROTEIN_SCORE_TIER_ORDER.map((scaleTier) => (
            <div key={scaleTier} className="min-w-0">
              <p className={`truncate text-[10px] font-semibold sm:text-xs ${tier === scaleTier ? tierColors[scaleTier].text : "text-slate-500"}`}>
                {PROTEIN_SCORE_TIER_SCALE[scaleTier].label}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{PROTEIN_SCORE_TIER_SCALE[scaleTier].tickLabel}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreDetail({ label, score, protein, calories }: { label: string; score: number; protein: number; calories: number }) {
  const tier = getProteinScoreTier(score);
  const styles = tierColors[tier];
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className={`mt-4 rounded-2xl p-5 ${styles.soft}`}>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.iconBg}`}>
            <Zap className={`h-5 w-5 ${styles.icon}`} fill="currentColor" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm font-medium text-slate-500 sm:text-base">
            <span className={`text-3xl font-bold leading-none ${styles.text}`}>{formatProteinScoreDisplay(score)}g</span>
            <span className="ml-2.5">per 100 calories</span>
          </p>
        </div>
      </div>
      <div className="mt-6 border-t border-black/[0.06] pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">How it&apos;s calculated</h3>
        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-normal tabular-nums text-slate-600">
          {formatProteinScoreDisplay(protein)}g protein <span className="text-slate-400">÷</span> {formatProteinScoreDisplay(calories)} cal <span className="text-slate-400">×</span> 100 <span className="text-slate-400">=</span> <span className={`font-bold ${styles.text}`}>{formatProteinScoreDisplay(score)}</span>
        </div>
      </div>
      <ScoreScale score={score} />
    </>
  );
}

// The item-level drill-down's own nested breakdown — "Ingredients" for a
// fully build-your-own item (Chipotle), "Items" for a composite/menu item
// (a combo's side/drink, sauces, addons). Ranked highest Protein Score
// first; an entry with no resolvable score (0 calories) or a genuine
// 0-protein entry both fall to the bottom rather than being hidden, since
// -1 sorts below every real score (scores are always >= 0).
function NestedProteinScoreBreakdown({
  kind,
  items,
  imageClassName,
  imageBackgroundColor,
}: {
  kind: MacroBreakdownNestedKind;
  items: MacroBreakdownEntry[];
  imageClassName?: string;
  imageBackgroundColor?: string;
}) {
  const label = kind === "items" ? "Items" : "Ingredients";
  const rankedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftScore = getProteinPer100Calories(left.protein, left.calories) ?? -1;
        const rightScore = getProteinPer100Calories(right.protein, right.calories) ?? -1;
        return rightScore - leftScore;
      }),
    [items],
  );

  return (
    <div className="mt-6 border-t border-black/[0.06] pt-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</h3>
      <div className="mt-3 divide-y divide-black/[0.06]">
        {rankedItems.map((nestedItem) => {
          const nestedScore = getProteinPer100Calories(nestedItem.protein, nestedItem.calories);
          const hasScore = typeof nestedScore === "number";
          const nestedTier = hasScore ? getProteinScoreTier(nestedScore) : undefined;
          return (
            <div key={nestedItem.id} className="flex w-full items-center gap-3 py-3">
              <RestaurantItemImage
                src={nestedItem.image}
                alt=""
                imagePresentation={nestedItem.imagePresentation}
                fallbackClassName={imageClassName ?? "object-contain p-1"}
                fallbackBackgroundColor={imageBackgroundColor}
                containerClassName="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-50"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{nestedItem.name}</span>
                <span
                  className={`mt-0.5 block text-xs font-semibold ${hasScore && nestedTier ? tierColors[nestedTier].text : tierColors.low.text}`}
                >
                  {hasScore && nestedTier
                    ? `${formatProteinScoreDisplay(nestedScore)}g / 100 cal · ${PROTEIN_SCORE_TIER_SCALE[nestedTier].label}`
                    : `0g / 100 cal · ${PROTEIN_SCORE_TIER_SCALE.low.label}`}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProteinScoreDetails({
  open,
  onClose,
  score,
  protein,
  calories,
  name = "This item",
  image,
  imagePresentation,
  imageClassName,
  imageBackgroundColor,
  items = [],
}: {
  open: boolean;
  onClose: () => void;
  score: number;
  protein?: number;
  calories?: number;
  name?: string;
  image?: string;
  // Item-level override for `image`, plus the restaurant-level fallbacks
  // (imageClassName/imageBackgroundColor) — same shared metadata resolution
  // used by every other item card/modal (see lib/itemImagePresentation.ts),
  // so this modal's thumbnails match how the same image renders elsewhere.
  imagePresentation?: ItemImagePresentation;
  imageClassName?: string;
  imageBackgroundColor?: string;
  items?: ProteinScoreDetailItem[];
}) {
  const [selectedItem, setSelectedItem] = useState<ProteinScoreDetailItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isAggregate = items.length > 1;
  // A single-item cart has no item-by-item list to drill into (the overall
  // score already *is* that one item's score), but its nested breakdown
  // should still show rather than only ever appearing behind a click that
  // never has anything to click.
  const singleItem = !isAggregate && items.length === 1 ? items[0] : undefined;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  const selectedScore = selectedItem
    ? getProteinPer100Calories(selectedItem.protein, selectedItem.calories)
    : undefined;
  const headerImage = selectedItem?.image ?? (!isAggregate ? image : undefined);
  // Mirrors headerImage's own selection logic so the presentation always
  // matches whichever image is actually being shown (a drilled-into item's
  // own metadata, or the top-level single-item metadata).
  const headerImagePresentation = selectedItem
    ? selectedItem.imagePresentation
    : !isAggregate
      ? imagePresentation
      : undefined;

  const modal = (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="protein-score-title"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-white shadow-2xl sm:max-h-[min(720px,calc(100dvh-3rem))] sm:max-w-[520px] sm:rounded-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {selectedItem ? (
              <button type="button" className="-ml-2 cursor-pointer rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" onClick={() => setSelectedItem(null)} aria-label="Back to overall Protein Score">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            {headerImage ? (
              <RestaurantItemImage
                src={headerImage}
                alt=""
                imagePresentation={headerImagePresentation}
                fallbackClassName={imageClassName ?? "object-contain p-0.5"}
                fallbackBackgroundColor={imageBackgroundColor}
                containerClassName="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-50"
              />
            ) : null}
            <h2 id="protein-score-title" className="truncate font-heading text-xl font-bold text-slate-900">
              {selectedItem ? selectedItem.name : isAggregate ? "Protein Score" : name}
            </h2>
          </div>
          <button ref={closeButtonRef} type="button" className="-mr-2 cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" onClick={onClose} aria-label="Close Protein Score">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6">
          {selectedItem && typeof selectedScore === "number" ? (
            <>
              <ScoreDetail label="Protein Score" score={selectedScore} protein={selectedItem.protein} calories={selectedItem.calories} />
              {selectedItem.nestedItems && selectedItem.nestedItems.length > 1 ? (
                <NestedProteinScoreBreakdown
                  kind={selectedItem.nestedKind ?? "ingredients"}
                  items={selectedItem.nestedItems}
                  imageClassName={imageClassName}
                  imageBackgroundColor={imageBackgroundColor}
                />
              ) : null}
            </>
          ) : (
            <>
              <ScoreDetail
                label={isAggregate ? "Meal Protein Score" : "Protein Score"}
                score={score}
                protein={protein ?? score}
                calories={calories ?? 100}
              />
              {singleItem?.nestedItems && singleItem.nestedItems.length > 1 ? (
                <NestedProteinScoreBreakdown
                  kind={singleItem.nestedKind ?? "ingredients"}
                  items={singleItem.nestedItems}
                  imageClassName={imageClassName}
                  imageBackgroundColor={imageBackgroundColor}
                />
              ) : null}
              {isAggregate ? (
                <div className="mt-6 border-t border-black/[0.06] pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Item-by-item</h3>
                  <div className="mt-3 divide-y divide-black/[0.06]">
                    {[...items]
                      .sort((left, right) => {
                        const leftScore = getProteinPer100Calories(left.protein, left.calories) ?? -1;
                        const rightScore = getProteinPer100Calories(right.protein, right.calories) ?? -1;
                        return rightScore - leftScore;
                      })
                      .map((item) => {
                      const itemScore = getProteinPer100Calories(item.protein, item.calories);
                      const hasScore = typeof itemScore === "number";
                      const itemTier = hasScore ? getProteinScoreTier(itemScore) : undefined;
                      const rowContent = (
                        <>
                          <RestaurantItemImage
                            src={item.image}
                            alt=""
                            imagePresentation={item.imagePresentation}
                            fallbackClassName={imageClassName ?? "object-contain p-1"}
                            fallbackBackgroundColor={imageBackgroundColor}
                            containerClassName="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-50"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{item.name}</span>
                            <span className={`mt-0.5 block text-xs font-semibold ${hasScore && itemTier ? tierColors[itemTier].text : "text-slate-400"}`}>
                              {hasScore && itemTier
                                ? `${formatProteinScoreDisplay(itemScore)}g / 100 cal · ${PROTEIN_SCORE_TIER_SCALE[itemTier].label}`
                                : `N/A · ${formatMacroDisplayNumber(item.protein)}g protein · ${formatMacroDisplayNumber(item.calories)} cal`}
                            </span>
                          </span>
                          {hasScore ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> : null}
                        </>
                      );

                      return hasScore ? (
                        <button key={item.id} type="button" className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50" onClick={() => setSelectedItem(item)}>
                          {rowContent}
                        </button>
                      ) : (
                        <div key={item.id} className="flex w-full items-center gap-3 py-3 text-left">
                          {rowContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
