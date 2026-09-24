type RemoveRecentSearchButtonProps = {
  label: string;
  onRemove: () => void;
  tone?: "neutral" | "amber";
  className?: string;
};

const toneHoverClassNames: Record<NonNullable<RemoveRecentSearchButtonProps["tone"]>, string> = {
  neutral: "hover:bg-slate-200 hover:text-slate-700",
  amber: "hover:bg-amber-100 hover:text-slate-700",
};

// The "×" control on a Recently Searched result row (nav panel and hero) —
// previously duplicated verbatim, svg markup included, across
// MenuItemResultRow, BuilderEntreeResultRow, and BuilderIngredientResultRow.
export default function RemoveRecentSearchButton({
  label,
  onRemove,
  tone = "neutral",
  className = "",
}: RemoveRecentSearchButtonProps) {
  return (
    <button
      type="button"
      className={`shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition ${toneHoverClassNames[tone]} ${className}`.trim()}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      aria-label={label}
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
