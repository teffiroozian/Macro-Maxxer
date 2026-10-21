export type ActiveChip = { key: string; label: string; onRemove: () => void };

export default function NativeActiveFilterChips({ chips, onClearAll }: { chips: ActiveChip[]; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex min-w-0 flex-1 justify-end">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <button key={chip.key} type="button" onClick={chip.onRemove} aria-label={`Remove filter: ${chip.label}`} className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-[14px] bg-black/5 px-[10px] text-xs font-semibold text-slate-700 focus-ring">
            {chip.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        ))}
        <button type="button" onClick={onClearAll} className="h-7 shrink-0 whitespace-nowrap rounded-[14px] border border-slate-200 bg-white px-[10px] text-xs font-semibold text-slate-700 focus-ring">Clear All</button>
      </div>
    </div>
  );
}
