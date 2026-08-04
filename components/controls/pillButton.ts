// Shared trigger styling for the secondary nav's Sort and Filters controls
// (SelectorShell's Sort trigger + ControlsRow's Filters button) so both
// pills always share the same height/radius/padding/focus treatment instead
// of drifting apart as each is styled independently.
export function pillTriggerClassName({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return [
    "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
    active
      ? "border-accent/50 bg-accent-soft text-accent-strong"
      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
