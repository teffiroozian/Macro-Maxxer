import type { ComponentType, ReactNode } from "react";

export type SegmentedControlSize = "compact" | "comfortable";

export type SegmentedControlOption<T extends string> = {
  id: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: SegmentedControlSize;
  className?: string;
};

const sizeClassNames: Record<SegmentedControlSize, string> = {
  compact: "gap-0 px-2 sm:px-3",
  comfortable: "gap-1 px-2 sm:gap-1.5 sm:px-5",
};

// Canonical pill-group single-choice control (Design System PDF
// "SegmentedControl"): a rounded track of equal-width pills, `role="radio"`
// per option, the active pill filled with the accent color. Previously
// duplicated near-verbatim as the portion/variant selector in
// ItemDetailsPanel.tsx and the order-type selector in ItemRouteModal.tsx —
// migrate any new single-choice pill group onto this instead of
// re-authoring the radiogroup/pill markup.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "compact",
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid w-full auto-cols-fr grid-flow-col gap-1 rounded-full bg-slate-100 p-1 ${className}`.trim()}
    >
      {options.map((option) => {
        const isActive = option.id === value;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id)}
            className={`box-border flex h-10 min-w-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full border text-[13px] font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:text-sm ${sizeClassNames[size]} ${
              isActive
                ? "border-transparent bg-accent-strong text-white/95 shadow-sm"
                : "border-transparent text-slate-500 hover:bg-white/70 active:bg-white"
            }`}
          >
            {Icon ? (
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? "text-white/95" : "text-slate-400"}`}
                strokeWidth={2.3}
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
