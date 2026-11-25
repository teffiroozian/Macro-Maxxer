import type { SavedTab } from "@/lib/native/savedLibrary";

const TABS: { value: SavedTab; label: string }[] = [
  { value: "meals", label: "Meals" },
  { value: "items", label: "Items" },
  { value: "history", label: "History" },
];

export default function SavedTabs({ tab, counts, onChange }: {
  tab: SavedTab;
  // Shown while searching, so matches on the other tabs aren't missed.
  counts?: Record<SavedTab, number>;
  onChange: (tab: SavedTab) => void;
}) {
  const move = (key: string) => {
    const index = TABS.findIndex((option) => option.value === tab);
    const next = key === "Home" ? 0 : key === "End" ? TABS.length - 1 : (index + (key === "ArrowLeft" ? -1 : 1) + TABS.length) % TABS.length;
    onChange(TABS[next].value);
    document.getElementById(`saved-tab-${TABS[next].value}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="Saved" className="grid h-11 grid-cols-3 rounded-2xl bg-slate-200/70 p-1 dark:bg-surface-card">
      {TABS.map(({ value, label }) => {
        const on = tab === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            id={`saved-tab-${value}`}
            aria-selected={on}
            aria-controls="saved-panel"
            tabIndex={on ? 0 : -1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(value)}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                move(event.key);
              }
            }}
            className={`relative flex min-w-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[15px] transition-colors duration-150 before:absolute before:-inset-y-1 before:inset-x-0 motion-reduce:transition-none focus-ring ${on ? "bg-white font-bold text-accent-strong shadow-[0_1px_3px_rgba(15,23,42,0.12)] dark:bg-control" : "font-semibold text-slate-600 dark:text-slate-300"}`}
          >
            {label}
            {counts ? <span className="font-medium tabular-nums">{counts[value]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
