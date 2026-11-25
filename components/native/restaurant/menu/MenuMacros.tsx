import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { getRankingCardMacroKeys, type CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import type { Nutrition } from "@/types/nutrition";

const LABELS = { calories: "Calories", protein: "Protein", carbs: "Carbs", totalFat: "Fat", fiber: "Fiber" } as const;

export default function MenuMacros({ nutrition, mode = "standard", columns = 4, className = "" }: {
  nutrition: Nutrition;
  mode?: CardDisplayMode;
  columns?: 2 | 4;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`grid ${columns === 4 ? "grid-cols-4" : mode === "fiber" ? "grid-cols-3" : "grid-cols-2 gap-y-1.5"} ${className}`}>
      {getRankingCardMacroKeys(undefined, mode).map((key) => {
        const value = nutrition[key];
        const known = typeof value === "number" && Number.isFinite(value);
        return (
          <span key={key} className="block min-w-0">
            <span className={`block truncate font-heading text-sm font-bold leading-[18px] tracking-[-0.02em] tabular-nums ${known ? macroColorTokens[key].valueClassName : "text-slate-400"}`}>{known ? `${Math.round(value).toLocaleString("en-US")}${key === "calories" ? "" : "g"}` : "—"}</span>
            <span className="mt-px block text-[10.5px] min-[360px]:text-xs leading-[15px] text-slate-500 dark:text-slate-400">{LABELS[key]}</span>
          </span>
        );
      })}
    </span>
  );
}
