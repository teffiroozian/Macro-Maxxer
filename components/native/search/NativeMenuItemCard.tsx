import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { FullMenuMetric } from "@/lib/native/fullMenu";
import { nativeResultPresentation } from "@/lib/search/nativeSearchPresentation";
import type { ContentSearchResult } from "@/lib/search/searchAllContent";
import type { NativeMenuLayout } from "./NativeLayoutToggle";

const MACROS = [["calories", "Calories", "calories"], ["protein", "Protein", "protein"], ["carbs", "Carbs", "carbs"], ["totalFat", "Fat", "fat"]] as const;

export default function NativeMenuItemCard({ result, layout, note = "", rankedBy, onSelect }: {
  result: ContentSearchResult;
  layout: NativeMenuLayout;
  // Value of a ranked metric that is not one of the four macros.
  note?: string;
  rankedBy?: FullMenuMetric;
  onSelect: (r: ContentSearchResult) => void;
}) {
  const view = nativeResultPresentation(result);
  const list = layout === "list";
  const value = (key: typeof MACROS[number][0]) => {
    const number = view.nutrition?.[key];
    return view.missing.includes(key) || typeof number !== "number" || !Number.isFinite(number) ? null : Math.round(number);
  };
  const macroName = MACROS.map(([key]) => `${value(key) ?? "unknown"} ${key === "calories" ? "calories" : `grams ${key === "totalFat" ? "fat" : key}`}`).join(", ");
  const noteLine = <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-accent-strong">{note}</span>;
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      aria-label={[view.name, result.restaurant.name, view.nutrition ? macroName : view.note, note].filter(Boolean).join(", ")}
      className={`w-full min-w-0 cursor-pointer rounded-3xl border border-black/8 bg-surface-card text-left shadow-elev-2 transition-transform duration-[120ms] active:scale-[.98] motion-reduce:transition-none motion-reduce:active:scale-100 dark:border-hairline focus-ring ${list ? "flex items-center gap-3.5 p-3" : "flex flex-col p-2.5 pb-3.5"}`}
    >
      <RestaurantItemImage
        src={view.image}
        alt=""
        imagePresentation={view.imagePresentation}
        fallbackClassName="object-cover"
        containerClassName={`flex items-center justify-center overflow-hidden bg-slate-100 ${view.image ? "dark:bg-image-placeholder" : "dark:bg-surface-hover"} ${list ? "size-[92px] shrink-0 rounded-[18px]" : "h-[108px] w-full rounded-2xl"}`}
        fallback={<CutleryIcon className="size-7 text-slate-400" />}
      />
      <div className={`min-w-0 ${list ? "flex-1" : "flex w-full flex-1 flex-col px-1 pt-[11px]"}`}>
        <span className="flex h-[18px] items-center gap-1.5">
          <RestaurantLogoBadge src={result.restaurant.logo} alt="" ring={false} fit="cover" className="!size-[18px]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-600 dark:text-slate-300">{result.restaurant.name}</span>
          {list && note ? noteLine : null}
        </span>
        <span className={`line-clamp-2 font-bold text-slate-900 dark:text-slate-50 ${list ? "mt-[5px] text-base leading-5" : "mt-1 min-h-[38px] text-[15px] leading-[19px]"}`}>{view.name}</span>
        {!list && note ? <span className="mt-1 block">{noteLine}</span> : null}
        {view.nutrition ? (
          <div aria-hidden="true" className={`-ml-1.5 grid ${list ? "mt-1.5 grid-cols-4" : "mt-auto grid-cols-2 gap-y-0.5 pt-1.5"}`}>
            {MACROS.map(([key, label, metric]) => (
              <div key={key} className={`min-w-0 rounded-[10px] py-1 pl-1.5 ${rankedBy === metric ? "bg-accent-soft" : ""}`}>
                <span className={`block font-heading font-bold leading-[19px] tracking-[-0.02em] tabular-nums ${list ? "text-sm" : "text-[15px]"} ${value(key) === null ? "text-slate-400" : macroColorTokens[key].valueClassName}`}>{value(key) === null ? "—" : `${value(key)?.toLocaleString("en-US")}${key === "calories" ? "" : "g"}`}</span>
                <span className="mt-0.5 block text-xs leading-[14px] text-slate-500 dark:text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        ) : <span className={`block text-sm font-semibold text-accent-strong ${list ? "mt-2" : "mt-auto pt-2.5"}`}>{view.note}</span>}
      </div>
    </button>
  );
}
