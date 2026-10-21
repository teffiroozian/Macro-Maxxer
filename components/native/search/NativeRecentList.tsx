import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { nativeResultKey } from "@/lib/search/nativeSearchPresentation";
import type { SearchResult } from "@/types/search";
function label(result: SearchResult) {
  return result.kind === "restaurant" ? result.restaurant.name : result.kind === "menu-item" ? result.item.name : result.kind === "builder-entree" ? result.entreeOption.label : result.ingredient.name;
}
function RecentRow({ result, onSelect, onRemove }: { result: SearchResult; onSelect: (r: SearchResult) => void; onRemove: (r: SearchResult) => void }) {
  const [removing, setRemoving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const name = label(result);
  const remove = () => {
    if (removing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onRemove(result); return; }
    setRemoving(true);
    timer.current = setTimeout(() => onRemove(result),180);
  };
  return <li inert={removing} className={`grid overflow-hidden [&:last-child_.native-recent-divider]:border-0 transition-[grid-template-rows,opacity] duration-[180ms] motion-reduce:transition-none ${removing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}><div className="min-h-0 overflow-hidden"><div className="native-recent-divider flex h-[52px] items-center border-b border-slate-200 pr-2"><button type="button" onClick={() => onSelect(result)} className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-3 text-left active:bg-slate-900/[.04] focus-ring"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="shrink-0 text-slate-400" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg><span className="flex min-w-0 items-center gap-2.5">{result.kind === "restaurant" ? <RestaurantLogoBadge src={result.restaurant.logo} alt="" fit="cover" className="!size-[30px] !border-black/[.06] !shadow-none" /> : <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><CutleryIcon /></span>}<span className="truncate text-base">{name}</span></span></button><button type="button" onClick={remove} aria-label={`Remove ${name} from recent searches`} className="flex size-11 shrink-0 cursor-pointer items-center justify-center text-slate-400 focus-ring"><X size={14} strokeWidth={2.4} aria-hidden="true" /></button></div></div></li>;
}
export default function NativeRecentList({ results, onSelect, onRemove, onClear }: { results: SearchResult[]; onSelect: (r: SearchResult) => void; onRemove: (r: SearchResult) => void; onClear: () => void }) {
  if (!results.length) return null;
  return <section><div className="mx-5 mb-3 mt-7 flex items-baseline justify-between"><h2 className="text-xl font-bold">Recent</h2><button type="button" onClick={onClear} className="relative text-[15px] font-semibold text-accent-strong before:absolute before:-inset-y-3 before:inset-x-0 focus-ring">Clear</button></div><ul className="ml-5">{results.map(result => <RecentRow key={nativeResultKey(result)} result={result} onSelect={onSelect} onRemove={onRemove} />)}</ul></section>;
}
