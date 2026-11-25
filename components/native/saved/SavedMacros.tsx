import { formatWhole } from "@/components/native/cart/cartPresentation";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import type { CartItem } from "@/types/cart";

const MACROS = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;
const VALUE = { sm: "text-sm", md: "text-[17px]", lg: "text-[19px]" };

const INLINE = { calories: "cal", protein: "pro", carbs: "carb", totalFat: "fat" };

function macroValues(items: CartItem[]) {
  const totals = buildCartMacroTotals(items);
  const approximate = items.length > 0 && hasPartialCartNutritionData(items);
  return MACROS.map(([key, label]) => ({
    key, label,
    value: `${key === "calories" && approximate ? "~" : ""}${formatWhole(totals[key], key === "calories" ? "" : "g")}`,
    color: macroColorTokens[key].valueClassName,
  }));
}

export function SavedInlineMacros({ items, className = "" }: { items: CartItem[]; className?: string }) {
  return (
    <span className={`flex flex-wrap gap-x-2.5 text-[13px] leading-[18px] tabular-nums ${className}`}>
      {macroValues(items).map(({ key, value, color }) => (
        <span key={key} className="whitespace-nowrap"><span className={`font-bold ${color}`}>{value}</span> <span className="text-slate-500 dark:text-slate-400">{INLINE[key]}</span></span>
      ))}
    </span>
  );
}

export default function SavedMacros({ items, size, className = "" }: { items: CartItem[]; size: keyof typeof VALUE; className?: string }) {
  return (
    <span className={`grid grid-cols-4 ${className}`}>
      {macroValues(items).map(({ key, label, value, color }) => (
        <span key={key} className="block min-w-0">
          <span className={`block truncate font-heading font-bold leading-tight tracking-[-0.02em] tabular-nums ${VALUE[size]} ${color}`}>{value}</span>
          <span className={`mt-0.5 block text-slate-500 dark:text-slate-400 ${size === "lg" ? "text-[13px]" : "text-xs"}`}>{label}</span>
        </span>
      ))}
    </span>
  );
}
