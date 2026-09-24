// Shared styling for a single-choice menu/list row (Design System PDF
// "SelectableRow"): a rounded row that fills solid when active and gets a
// faint hover tint otherwise. Previously duplicated — with a drifted
// accessibility gap — between RestaurantCategorySidebar's mobile category
// menu (which had the focus-visible ring) and ChipotleRestaurantBuilderView's
// entrée/"View All Ingredients" dropdown rows (which didn't). Both now share
// this, so every selectable row gets the same keyboard-focus treatment.
export function selectableRowClassName({
  active = false,
  // Callers supply their own display utility (`flex` for a full-width list
  // row vs `inline-flex` for a content-width dropdown row) since that
  // differs by context — everything else here is shared.
  className = "",
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return [
    "cursor-pointer items-center gap-2 rounded-[10px] px-2.5 text-left font-semibold text-black/88 transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong",
    active ? "bg-black/10" : "hover:bg-slate-900/5",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
