import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { nativeResultPresentation } from "@/lib/search/nativeSearchPresentation";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";
import type { NativeMenuLayout } from "./NativeLayoutToggle";

export default function NativeMenuItemCard({ result, layout, onSelect }: { result: ContentSearchResult; layout: NativeMenuLayout; onSelect: (r: ContentSearchResult) => void }) {
  const view = nativeResultPresentation(result);
  const list = layout === "list";
  const macros = [["calories", list ? "Cal" : "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;
  const value = (key: typeof macros[number][0]) => {
    const number = view.nutrition?.[key];
    return view.missing.includes(key) || typeof number !== "number" || !Number.isFinite(number) ? null : Math.round(number);
  };
  const macroName = macros.map(([key]) => `${value(key) ?? "unknown"} ${key === "calories" ? "calories" : `grams ${key === "totalFat" ? "fat" : key}`}`).join(", ");
  return (
    <button type="button" onClick={() => onSelect(result)} aria-label={`${view.name}, ${result.restaurant.name}, ${view.nutrition ? macroName : view.note}`} className={`min-w-0 cursor-pointer rounded-[20px] border border-black/8 bg-white text-left shadow-elev-2 transition-transform duration-[120ms] active:scale-[.98] motion-reduce:active:scale-100 motion-reduce:active:bg-slate-50 motion-reduce:transition-none focus-ring ${list ? "flex gap-3 p-2.5" : "p-2"}`}>
      <RestaurantItemImage src={view.image} alt="" imagePresentation={view.imagePresentation} fallbackClassName="object-cover" containerClassName={`flex items-center justify-center overflow-hidden rounded-[14px] bg-slate-100 ${list ? "size-[92px] shrink-0" : "aspect-[1.35] w-full"}`} fallback={<CutleryIcon className="size-7 text-slate-400" />} />
      <div className={`min-w-0 ${list ? "flex flex-1 flex-col justify-between px-0.5 pt-0.5" : ""}`}>
        <div className={list ? "" : "px-[3px] pt-[9px]"}>
          <span className={`block truncate font-bold ${list ? "text-[15px]" : "text-sm"}`}>{view.name}</span>
          <span className="mt-0.5 flex items-center gap-[5px] text-xs text-slate-500"><RestaurantLogoBadge src={result.restaurant.logo} alt="" ring={false} fit="cover" className="!size-3.5" /><span className="truncate">{result.restaurant.name}</span></span>
        </div>
        {view.nutrition ? (
          <div aria-hidden="true" className={list ? "mt-2 grid grid-cols-4 gap-1" : "mt-2.5 grid grid-cols-2 gap-x-1.5 gap-y-[9px] rounded-xl bg-slate-50 p-[9px]"}>
            {macros.map(([key,label]) => <div key={key} className="min-w-0"><span className={`flex items-center font-semibold text-slate-500 ${list ? "gap-[3px] text-[10px]" : "gap-1 text-[10px]"}`}><span className={`${list ? "size-1" : "size-[5px]"} shrink-0 rounded-full ${macroColorTokens[key].segmentClassName}`} />{label}</span><span className={`mt-[3px] block font-heading font-bold leading-none tabular-nums ${list ? "text-[13px]" : "text-sm"} ${value(key) === null ? "text-slate-400" : macroColorTokens[key].valueClassName}`}>{value(key) === null ? "—" : `${value(key)}${key === "calories" ? "" : "g"}`}</span></div>)}
          </div>
        ) : <span className={`flex items-center text-xs font-semibold text-accent-strong ${list ? "min-h-10" : "mt-2.5 min-h-[87px] px-[9px]"}`}>{view.note}</span>}
      </div>
    </button>
  );
}
