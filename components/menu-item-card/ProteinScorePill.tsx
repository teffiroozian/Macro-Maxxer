import { Zap } from "lucide-react";
import { formatProteinScoreDisplay } from "@/components/nutrition/macroDisplay";
import type { ProteinScoreTier } from "@/lib/nutrition";

// Sits in the content column, directly above the nutrition stat row. A soft
// tinted chip (no border/shadow) keeps it grounded and on-brand with the
// 5-tier system without competing with the bolder nutrition stats below it.
//
// Emphasis is intentionally asymmetric: a middling protein score isn't an
// error state, so only Elite/Excellent get saturated, high-contrast
// treatments. Good/Moderate/Low step down in saturation and contrast so a
// below-average score reads as neutral information rather than a warning.
const tierStyles: Record<
  ProteinScoreTier,
  { chip: string; iconWrap: string; icon: string; value: string; supporting: string }
> = {
  elite: {
    chip: "bg-[#ECFDF3]",
    iconWrap: "bg-[#047857]",
    icon: "text-white",
    value: "text-[#047857]",
    supporting: "text-[#4B7F6B]",
  },
  excellent: {
    chip: "bg-[#EEF4FF]",
    iconWrap: "bg-[#4C84C4]",
    icon: "text-white",
    value: "text-[#2F5F85]",
    supporting: "text-[#6E88A3]",
  },
  good: {
    chip: "bg-[#FFFBEB]",
    iconWrap: "bg-[#F3E8CE]",
    icon: "text-[#B08A3E]",
    value: "text-[#8A6D2F]",
    supporting: "text-[#64748B]",
  },
  moderate: {
    chip: "bg-[#F1F5F9]",
    iconWrap: "bg-[#E2E8F0]",
    icon: "text-[#64748B]",
    value: "text-[#334155]",
    supporting: "text-[#7C8798]",
  },
  low: {
    chip: "bg-[#F8FAFC]",
    iconWrap: "bg-[#EEF2F6]",
    icon: "text-[#94A3B8]",
    value: "text-[#64748B]",
    supporting: "text-[#9AA5B1]",
  },
};

export default function ProteinScorePill({
  scorePerHundredCalories,
  tier,
  className = "",
}: {
  scorePerHundredCalories: number;
  tier: ProteinScoreTier;
  className?: string;
}) {
  const styles = tierStyles[tier];
  const displayScore = formatProteinScoreDisplay(scorePerHundredCalories);

  return (
    <div
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 text-[12px] leading-none ${styles.chip} ${className}`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}>
        <Zap className={`h-2.5 w-2.5 ${styles.icon}`} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>
        <span className={`font-bold ${styles.value}`}>{displayScore}g protein</span>
        <span className={`ml-0.5 ${styles.supporting}`}>/ 100 cal</span>
      </span>
    </div>
  );
}
