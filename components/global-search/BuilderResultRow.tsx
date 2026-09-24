import type { ReactNode } from "react";
import RemoveRecentSearchButton from "@/components/global-search/RemoveRecentSearchButton";

type BuilderResultRowProps = {
  title: string;
  subtitle: ReactNode;
  badgeLabel: string;
  image: ReactNode;
  isActive: boolean;
  onSelect: () => void;
  // Only passed when this row is rendered inside a "Recently Searched" list
  // (nav panel and hero) — same X control/interaction as MenuItemResultRow.
  onRemoveRecent?: () => void;
  removeRecentLabel: string;
};

// Shared amber-accent "build your own" result row shell (Design System PDF
// "ItemRow"): a BYO entree/build result launches a customization flow
// rather than adding a fixed product, so it never offers View Item or Quick
// Add — just a thumbnail, title/subtitle, and a badge. Previously
// duplicated near-verbatim (including the remove button's inline svg)
// between BuilderEntreeResultRow and BuilderIngredientResultRow; both now
// wrap this with their own data instead of re-authoring the row.
export default function BuilderResultRow({
  title,
  subtitle,
  badgeLabel,
  image,
  isActive,
  onSelect,
  onRemoveRecent,
  removeRecentLabel,
}: BuilderResultRowProps) {
  return (
    <li
      role="option"
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 border-l-2 border-amber-400 bg-amber-50/50 px-4 py-3 text-sm text-slate-700 transition hover:bg-amber-50 ${
        isActive ? "bg-amber-50" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        {image}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{subtitle}</span>
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        {badgeLabel}
      </span>
      {onRemoveRecent ? (
        <RemoveRecentSearchButton label={removeRecentLabel} onRemove={onRemoveRecent} tone="amber" />
      ) : null}
    </li>
  );
}
