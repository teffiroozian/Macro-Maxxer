import type { FullMenuLayout } from "@/lib/native/fullMenu";

const seg = (active: boolean) => `flex size-[34px] items-center justify-center rounded-full transition-colors ${active ? "bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.14)]" : "text-slate-400"}`;

export default function NativeLayoutToggle({ layout, onChange }: { layout: FullMenuLayout; onChange: (layout: FullMenuLayout) => void }) {
  return (
    <div role="radiogroup" aria-label="Layout" className="flex rounded-full bg-slate-100 p-[3px]">
      {(["rows", "grid"] as const).map((value) => (
        <button key={value} type="button" role="radio" aria-checked={layout === value} aria-label={value === "rows" ? "Rows" : "Grid"} onClick={() => onChange(value)} className="relative flex items-center justify-center focus-ring rounded-full before:absolute before:-inset-[5px] before:content-['']">
          <span className={seg(layout === value)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {value === "rows" ? <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" /> : (
                <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
              )}
            </svg>
          </span>
        </button>
      ))}
    </div>
  );
}
