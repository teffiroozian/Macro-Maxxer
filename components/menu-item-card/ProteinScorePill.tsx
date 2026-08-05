import { Zap } from "lucide-react";
import type { ProteinScoreTier } from "@/lib/nutrition";

// Sits in the content column, directly above the nutrition stat row. A soft
// tinted chip (no border/shadow) keeps it grounded and on-brand with the
// 5-tier system without competing with the bolder nutrition stats below it.
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
    chip: "bg-[#FFF6E8]",
    iconWrap: "bg-[#D6A23D]",
    icon: "text-white",
    value: "text-[#B9851C]",
    supporting: "text-[#9D7E49]",
  },
  moderate: {
    chip: "bg-[#FFF1EB]",
    iconWrap: "bg-[#C2410C]",
    icon: "text-white",
    value: "text-[#C2410C]",
    supporting: "text-[#9A5B47]",
  },
  low: {
    chip: "bg-[#F1F5F9]",
    iconWrap: "bg-[#64748B]",
    icon: "text-white",
    value: "text-[#475569]",
    supporting: "text-[#7C899A]",
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
  const roundedScore = Math.round(scorePerHundredCalories * 10) / 10;

  return (
    <div
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-2.5 text-[12px] leading-none ${styles.chip} ${className}`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}>
        <Zap className={`h-2.5 w-2.5 ${styles.icon}`} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>
        <span className={`font-bold ${styles.value}`}>{roundedScore}g protein</span>
        <span className={`ml-0.5 ${styles.supporting}`}>/ 100 cal</span>
      </span>
    </div>
  );
}
