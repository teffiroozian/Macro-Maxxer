import { type LucideIcon } from "lucide-react";

import type { ViewOption } from "@/components/controls/types";

type ViewTabsOption = {
  label: string;
  value: ViewOption;
  icon: LucideIcon;
};

type ViewTabsProps = {
  options: ViewTabsOption[];
  value: ViewOption;
  onSelect: (view: ViewOption) => void;
};

// Desktop-only compact tab group replacing the old view dropdown — Menu,
// Ingredients, and Rankings are always visible rather than hidden behind a
// click, per the restaurant secondary-nav refresh. Visually subordinate to
// the global nav: a soft neutral track with a green-tinted selected state
// (not the plain white/shadow "pressed" look used by the mobile segmented
// control), so it reads as its own system rather than a copy-paste.
export default function ViewTabs({ options, value, onSelect }: ViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Menu view"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 p-1"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(option.value)}
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              isActive
                ? "bg-white text-accent-strong shadow-sm"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-700 active:bg-white"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${isActive ? "text-accent-strong" : "text-slate-400"}`}
              strokeWidth={2.3}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
