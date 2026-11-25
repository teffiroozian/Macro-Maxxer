import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatWhole } from "@/components/native/cart/cartPresentation";

const MACROS = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;

export default function HomeMacroRow({ totals, large = false, approximate = false }: {
  totals: { calories: number; protein: number; carbs: number; totalFat: number };
  large?: boolean;
  approximate?: boolean;
}) {
  return (
    <div className="grid grid-cols-4">
      {MACROS.map(([key, label]) => (
        <div key={key} className="min-w-0">
          <p className={`font-heading truncate font-bold leading-tight tracking-[-0.02em] tabular-nums ${large ? "text-[17px]" : "text-[15px]"} ${macroColorTokens[key].valueClassName}`}>
            {key === "calories" && approximate ? "~" : ""}{formatWhole(totals[key], key === "calories" ? "" : "g")}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
