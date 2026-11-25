import type { NativeSearchScope } from "@/lib/native/searchResults";

const OPTIONS: { value: NativeSearchScope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "restaurants", label: "Restaurants" },
  { value: "menu-items", label: "Menu Items" },
];

export default function NativeSearchScopeTabs({ scope, onChange }: { scope: NativeSearchScope; onChange: (scope: NativeSearchScope) => void }) {
  const move = (key: string) => {
    const index = OPTIONS.findIndex((option) => option.value === scope);
    const next = key === "Home" ? 0 : key === "End" ? OPTIONS.length - 1 : (index + (key === "ArrowLeft" ? -1 : 1) + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    document.getElementById(`native-scope-${OPTIONS[next].value}`)?.focus();
  };
  return (
    <div role="tablist" aria-label="Search scope" className="grid h-11 grid-cols-3 rounded-2xl bg-slate-200/70 p-1 dark:bg-surface-card">
      {OPTIONS.map(({ value, label }) => {
        const on = scope === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            id={`native-scope-${value}`}
            aria-selected={on}
            aria-controls="native-search-results"
            tabIndex={on ? 0 : -1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(value)}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                move(event.key);
              }
            }}
            className={`relative flex min-w-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl text-[15px] transition-colors duration-150 before:absolute before:-inset-y-1 before:inset-x-0 motion-reduce:transition-none focus-ring ${on ? "bg-white font-bold text-accent-strong shadow-[0_1px_3px_rgba(15,23,42,0.12)] dark:bg-control" : "font-semibold text-slate-600 dark:text-slate-300"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
