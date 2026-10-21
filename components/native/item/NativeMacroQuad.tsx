import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatMacro, MACRO_KEYS, type Macros } from "./nativeItemModel";

const SHORT: Record<string, string> = { calories: "Cal", protein: "Protein", carbs: "Carbs", totalFat: "Fat" };

export default function NativeMacroQuad({ macros, valueClassName = "text-[12.5px]" }: { macros: Macros; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
      {MACRO_KEYS.map((key) => (
        <div key={key} className="flex min-w-0 flex-col gap-1">
          <span className={`font-heading font-bold leading-none tabular-nums ${valueClassName} ${macroColorTokens[key].valueClassName}`}>{formatMacro(key, macros[key])}</span>
          <span className="text-[7.5px] font-bold uppercase leading-none tracking-[0.03em] text-slate-400">{SHORT[key]}</span>
        </div>
      ))}
    </div>
  );
}
