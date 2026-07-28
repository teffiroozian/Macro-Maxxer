import { Store, UtensilsCrossed } from "lucide-react";

export type SearchScope = "restaurants" | "menu-items";
export type ScopeSwitcherVariant = "default" | "segmented";

type ScopeSwitcherProps = {
  scope: SearchScope;
  onChange: (scope: SearchScope) => void;
  // Icons are only requested for the homepage hero — the nav search tabs
  // stay text-only, so this defaults off and hero opts in explicitly.
  showIcons?: boolean;
  className?: string;
  // "default": original flat tabs (nav's GlobalSearchPanel).
  // "segmented": light track + raised active pill, used by the hero only —
  // additive so every other caller is visually unchanged.
  variant?: ScopeSwitcherVariant;
};

const TABS = [
  { value: "restaurants", label: "Restaurants", Icon: Store },
  { value: "menu-items", label: "Menu Items", Icon: UtensilsCrossed },
] as const;

export default function ScopeSwitcher({
  scope,
  onChange,
  showIcons = false,
  className = "px-5",
  variant = "default",
}: ScopeSwitcherProps) {
  const isSegmented = variant === "segmented";

  return (
    <div
      role="tablist"
      aria-label="Search scope"
      className={`flex gap-1 ${isSegmented ? "rounded-full bg-neutral-100 p-1" : ""} ${className}`}
    >
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={scope === tab.value}
          // Keeps focus on the search input when switching tabs — without
          // this, the browser's default mousedown focus handling would move
          // focus to this button, blurring the input and (on the hero, whose
          // results panel is focus-driven) closing the results in the process.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(tab.value)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            scope === tab.value
              ? isSegmented
                ? "bg-white text-accent-strong shadow-[0_1px_6px_rgba(15,23,42,0.15)]"
                : "bg-neutral-900 text-white"
              : isSegmented
                ? "text-neutral-500 hover:bg-white/60 hover:text-neutral-900"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          }`}
        >
          {showIcons ? <tab.Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : null}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
