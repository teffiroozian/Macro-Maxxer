import type { ProteinScoreTier } from "@/lib/nutrition";

// Shared by interactive in-app pills and static/export renderers so every
// Protein Score surface uses the same tier language and visual treatment.
export const proteinScoreTierStyles: Record<
  ProteinScoreTier,
  { chip: string; iconWrap: string; icon: string; value: string; supporting: string }
> = {
  elite: {
    chip: "bg-[#ECFDF3] dark:bg-accent-soft",
    iconWrap: "bg-[#047857] dark:bg-accent",
    icon: "text-white dark:text-slate-950",
    value: "text-[#047857] dark:text-accent-strong",
    supporting: "text-[#4B7F6B] dark:text-slate-400",
  },
  excellent: {
    chip: "bg-[#EEF4FF] dark:bg-blue-400/10",
    iconWrap: "bg-[#4C84C4] dark:bg-[#4C84C4]",
    icon: "text-white dark:text-white",
    value: "text-[#2F5F85] dark:text-blue-300",
    supporting: "text-[#6E88A3] dark:text-slate-400",
  },
  good: {
    chip: "bg-[#FFFBEB] dark:bg-yellow-400/10",
    iconWrap: "bg-[#F3E8CE] dark:bg-yellow-400/15",
    icon: "text-[#B08A3E] dark:text-[#fde047]",
    value: "text-[#8A6D2F] dark:text-[#facc15]",
    supporting: "text-[#64748B] dark:text-slate-400",
  },
  moderate: {
    chip: "bg-[#F1F5F9] dark:bg-surface-hover",
    iconWrap: "bg-[#E2E8F0] dark:bg-control",
    icon: "text-[#64748B] dark:text-[#94a3b8]",
    value: "text-[#334155] dark:text-[#e2e8f0]",
    supporting: "text-[#7C8798] dark:text-[#94a3b8]",
  },
  low: {
    chip: "bg-[#F8FAFC] dark:bg-surface-subtle",
    iconWrap: "bg-[#EEF2F6] dark:bg-surface-hover",
    icon: "text-[#94A3B8] dark:text-slate-400",
    value: "text-[#64748B] dark:text-slate-300",
    supporting: "text-[#9AA5B1] dark:text-slate-400",
  },
};
