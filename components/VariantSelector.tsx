import { ChevronDown } from "lucide-react";
import type { ItemVariant } from "@/types/menu";

type VariantSelectorProps = {
  variants: ItemVariant[];
  selectedId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  // When true (e.g. a Rankings-view row locked to one variant), the compact
  // pill drops its chevron and right-side padding entirely — no dropdown
  // affordance — so it reads as a fixed value rather than an interactive
  // control, while still showing the same pill/size as the enabled state.
  disabled?: boolean;
  // Compact styling: the same near-black filled pill as the default style,
  // real ChevronDown icon instead of a CSS-gradient arrow, sized down
  // (shorter, smaller text) so it reads as a secondary control beneath the
  // item title and comparative/status badges, without losing the
  // interactive, filled-pill look.
  compact?: boolean;
  // Only affects the compact pill — tightens it further (text size, chevron
  // size, horizontal padding) to match a small sibling Quick Add pill, e.g.
  // in global search results. The plain `compact` scale stays as-is for
  // contexts pairing this with a larger Quick Add control (the menu card
  // grid), so this is opt-in per caller rather than changing `compact`
  // globally.
  dense?: boolean;
  // Only affects the non-compact pill — "sm" shortens it and reduces its
  // horizontal padding for contexts like the standard menu card where it
  // should read as secondary to the item name, without changing its
  // dark-filled/white-text/rounded visual style. `compact` is unaffected by
  // this prop.
  size?: "default" | "sm";
};

export default function VariantSelector({
  variants,
  selectedId,
  onChange,
  ariaLabel = "Select portion",
  disabled = false,
  compact = false,
  dense = false,
  size = "default",
}: VariantSelectorProps) {
  const darkClassName =
    size === "sm"
      ? `w-fit appearance-none rounded-full bg-[#121212] py-[1px] pr-5 pl-3 text-sm font-bold text-white [field-sizing:content] [background-image:linear-gradient(45deg,transparent_50%,#ffffff_50%),linear-gradient(135deg,#ffffff_50%,transparent_50%),linear-gradient(to_right,transparent,transparent)] [background-position:calc(100%-12px)_55%,calc(100%-8px)_55%,100%_0] [background-size:4px_4px,4px_4px,2em_2em] bg-no-repeat focus:outline focus:outline-1 focus:outline-black/20 focus:outline-offset-2 ${disabled ? "cursor-not-allowed opacity-85" : "cursor-pointer"}`
      : `w-fit appearance-none rounded-full bg-[#121212] py-[2px] pr-6 pl-4 text-base font-bold text-white [field-sizing:content] [background-image:linear-gradient(45deg,transparent_50%,#ffffff_50%),linear-gradient(135deg,#ffffff_50%,transparent_50%),linear-gradient(to_right,transparent,transparent)] [background-position:calc(100%-15px)_55%,calc(100%-10px)_55%,100%_0] [background-size:5px_5px,5px_5px,2.5em_2.5em] bg-no-repeat focus:outline focus:outline-1 focus:outline-black/20 focus:outline-offset-2 ${disabled ? "cursor-not-allowed opacity-85" : "cursor-pointer"}`;

  const showCompactChevron = compact && !disabled;
  const className = compact
    ? `w-fit appearance-none rounded-full bg-[#121212] ${dense ? "py-1" : "py-0.75"} ${
        dense ? (showCompactChevron ? "pr-6" : "pr-3") : showCompactChevron ? "pr-7" : "pr-4"
      } ${dense ? "pl-3" : "pl-4"} ${dense ? "text-xs" : "text-[13px]"} font-bold text-white [field-sizing:content] focus:outline focus:outline-1 focus:outline-white/30 focus:outline-offset-2 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`
    : darkClassName;

  return (
    <span className="inline-flex w-fit items-center gap-2">
      <label className={`inline-flex w-fit items-center ${compact ? "relative" : ""}`}>
        <span className="sr-only">{ariaLabel}</span>
        <select
          className={className}
          value={selectedId}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
        {showCompactChevron ? (
          <ChevronDown
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-white ${
              dense ? "right-2 h-3 w-3" : "right-2.5 h-3.5 w-3.5"
            }`}
            strokeWidth={3}
            aria-hidden="true"
          />
        ) : null}
      </label>
    </span>
  );
}
