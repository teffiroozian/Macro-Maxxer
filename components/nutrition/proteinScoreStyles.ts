import type { ProteinScoreTier } from "@/lib/nutrition";

// Shared by interactive in-app pills and static/export renderers so every
// Protein Score surface uses the same tier language and visual treatment.
export const proteinScoreTierStyles: Record<
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
    chip: "bg-[#FFFBEB] dark:bg-[rgb(234_179_8_/_0.13)]",
    iconWrap: "bg-[#F3E8CE] dark:bg-[rgb(234_179_8_/_0.28)]",
    icon: "text-[#B08A3E] dark:text-[#fde047]",
    value: "text-[#8A6D2F] dark:text-[#facc15]",
    supporting: "text-[#64748B] dark:text-[#a3a08f]",
  },
  moderate: {
    chip: "bg-[#F1F5F9] dark:bg-[#243149]",
    iconWrap: "bg-[#E2E8F0] dark:bg-[#3a4a66]",
    icon: "text-[#64748B] dark:text-[#94a3b8]",
    value: "text-[#334155] dark:text-[#e2e8f0]",
    supporting: "text-[#7C8798] dark:text-[#94a3b8]",
  },
  low: {
    chip: "bg-[#F8FAFC]",
    iconWrap: "bg-[#EEF2F6]",
    icon: "text-[#94A3B8]",
    value: "text-[#64748B]",
    supporting: "text-[#9AA5B1]",
  },
};
