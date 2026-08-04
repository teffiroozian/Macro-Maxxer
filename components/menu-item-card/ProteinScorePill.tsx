import { Zap } from "lucide-react";
import type { ProteinScoreTier } from "@/lib/nutrition";

// Sits over the menu card's image, showing the derived protein-per-100-cal
// score rather than the raw protein gram value already shown in the
// nutrition row below. Same shape/spacing/shadow across every tier — only
// the soft surface tint and accent shift. Exact 5-tier palette (never red);
// border is the icon-circle color at low opacity so each tier still reads
// as a single family without a separate color needing to be invented.
const tierStyles: Record<
  ProteinScoreTier,
  { pill: string; iconWrap: string; icon: string; value: string; supporting: string }
> = {
  elite: {
    pill: "border-[#047857]/20 bg-[#ECFDF3]",
    iconWrap: "bg-[#047857]",
    icon: "text-white",
    value: "text-[#047857]",
    supporting: "text-[#4B7F6B]",
  },
  excellent: {
    pill: "border-[#4C84C4]/20 bg-[#EEF4FF]",
    iconWrap: "bg-[#4C84C4]",
    icon: "text-white",
    value: "text-[#2F5F85]",
    supporting: "text-[#6E88A3]",
  },
  good: {
    pill: "border-[#D6A23D]/20 bg-[#FFF6E8]",
    iconWrap: "bg-[#D6A23D]",
    icon: "text-white",
    value: "text-[#B9851C]",
    supporting: "text-[#9D7E49]",
  },
  moderate: {
    pill: "border-[#C2410C]/20 bg-[#FFF1EB]",
    iconWrap: "bg-[#C2410C]",
    icon: "text-white",
    value: "text-[#C2410C]",
    supporting: "text-[#9A5B47]",
  },
  low: {
    pill: "border-[#64748B]/20 bg-[#F1F5F9]",
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
    <span
      className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] leading-none shadow-sm ${styles.pill} ${className}`}
    >
      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}>
        <Zap className={`h-2 w-2 ${styles.icon}`} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span>
        <span className={`font-bold ${styles.value}`}>{roundedScore}g protein</span>
        <span className={styles.supporting}> / 100 cal</span>
      </span>
    </span>
  );
}
