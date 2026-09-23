"use client";

import { useState } from "react";
import { ChevronRight, Zap } from "lucide-react";
import { formatProteinScoreDisplay } from "@/components/nutrition/macroDisplay";
import type { ProteinScoreTier } from "@/lib/nutrition";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import ProteinScoreDetails, { type ProteinScoreDetailItem } from "@/components/nutrition/ProteinScoreDetails";
import type { ItemImagePresentation } from "@/types/menu";

// Sits in the content column, directly above the nutrition stat row. A soft
// tinted chip (no border/shadow) keeps it grounded and on-brand with the
// 5-tier system without competing with the bolder nutrition stats below it.
//
// Emphasis is intentionally asymmetric: a middling protein score isn't an
// error state, so only Elite/Excellent get saturated, high-contrast
// treatments. Good/Moderate/Low step down in saturation and contrast so a
// below-average score reads as neutral information rather than a warning.
export const tierStyles = proteinScoreTierStyles;

export default function ProteinScorePill({
  scorePerHundredCalories,
  tier,
  className = "",
  itemName,
  itemImage,
  itemImagePresentation,
  imageClassName,
  imageBackgroundColor,
  items,
  protein,
  calories,
  interactive = true,
}: {
  scorePerHundredCalories: number;
  tier: ProteinScoreTier;
  className?: string;
  itemName?: string;
  itemImage?: string;
  // Item-level override for `itemImage`, plus the restaurant-level
  // fallbacks — same shared image display metadata used elsewhere (see
  // lib/itemImagePresentation.ts), forwarded through to the Protein Score
  // modal so its thumbnails match how the same image renders on the card.
  itemImagePresentation?: ItemImagePresentation;
  imageClassName?: string;
  imageBackgroundColor?: string;
  items?: ProteinScoreDetailItem[];
  protein?: number;
  calories?: number;
  // false renders just the chip's visual content (no button/modal of its
  // own) — used inside Meal Details' Protein Score section, where the
  // *entire* section is already one clickable row/button (see
  // SelectionSummaryShell) and nesting this pill's own button inside it
  // would be invalid HTML as well as a second, redundant click target.
  interactive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const styles = tierStyles[tier];
  const displayScore = formatProteinScoreDisplay(scorePerHundredCalories);

  const chipContent = (
    <>
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}>
        <Zap className={`h-2.5 w-2.5 ${styles.icon}`} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>
        <span className={`font-bold ${styles.value}`}>{displayScore}g protein</span>
        <span className={`ml-0.5 ${styles.supporting}`}>/ 100 cal</span>
      </span>
      {interactive ? (
        <ChevronRight className={`h-3 w-3 shrink-0 ${styles.supporting}`} strokeWidth={2.5} aria-hidden="true" />
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 text-[12px] leading-none ${styles.chip} ${className}`}>
        {chipContent}
      </span>
    );
  }

  return (
    <>
    <button
      type="button"
      className={`inline-flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 text-[12px] leading-none transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${styles.chip} ${className}`}
      onClick={(event) => { event.stopPropagation(); setIsOpen(true); }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-haspopup="dialog"
      aria-label={`View Protein Score details${itemName ? ` for ${itemName}` : ""}`}
    >
      {chipContent}
    </button>
    {isOpen ? (
      <ProteinScoreDetails
        open
        onClose={() => setIsOpen(false)}
        score={scorePerHundredCalories}
        protein={protein}
        calories={calories}
        name={itemName}
        image={itemImage}
        imagePresentation={itemImagePresentation}
        imageClassName={imageClassName}
        imageBackgroundColor={imageBackgroundColor}
        items={items}
      />
    ) : null}
    </>
  );
}
