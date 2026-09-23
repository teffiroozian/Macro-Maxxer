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
