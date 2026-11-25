import { Clock, X } from "lucide-react";

export default function NativeRecentQueries({ queries, onSelect, onRemove, onClear }: {
  queries: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <section>
      <div className="flex h-11 items-center justify-between px-0.5">
        <h2 className="text-xl font-bold">Recent</h2>
        <button type="button" onClick={onClear} className="-mr-1 flex h-11 cursor-pointer items-center px-1.5 text-[15px] font-semibold text-accent-strong focus-ring">Clear All</button>
      </div>
      <ul aria-label="Recent searches" className="mt-1 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-black/8 bg-surface-card shadow-elev-2 dark:divide-divider dark:border-hairline">
        {queries.map((query) => (
          <li key={query.toLowerCase()} className="flex items-center">
            <button type="button" onClick={() => onSelect(query)} className="flex h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-l-3xl pl-4 text-left text-base active:bg-slate-900/[.04] dark:active:bg-surface-hover focus-ring">
              <Clock size={19} strokeWidth={2.1} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{query}</span>
            </button>
            <button type="button" onClick={() => onRemove(query)} aria-label={`Remove ${query} from recent searches`} className="flex h-14 w-12 shrink-0 cursor-pointer items-center justify-center text-slate-500 dark:text-slate-400 focus-ring">
              <X size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
