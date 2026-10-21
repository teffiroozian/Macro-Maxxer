import type { FullMenuDirection } from "@/lib/native/fullMenu";

export default function NativeSortDirectionButton({ direction, onToggle }: { direction: FullMenuDirection; onToggle: () => void }) {
  const high = direction === "high";
  return (
    <button type="button" onClick={onToggle} aria-label={`Sort: ${high ? "highest" : "lowest"} first`} className="flex size-11 shrink-0 items-center justify-center rounded-full active:bg-slate-100 focus-ring">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={high ? "m3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4" : "m3 8 4-4 4 4M7 4v16M11 12h4M11 16h7M11 20h10"} />
      </svg>
    </button>
  );
}
