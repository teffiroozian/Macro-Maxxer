import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import type { Nutrition } from "@/types/nutrition";

type Variant = "standard" | "dense" | "grid";
const STATS = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;

const styles: Record<Variant, { wrap: string; stat: string; value: string; label: string }> = {
  standard: { wrap: "flex gap-[22px]", stat: "flex flex-col items-center gap-[5px]", value: "text-sm", label: "text-[9.5px] tracking-[0.06em]" },
  dense: { wrap: "flex gap-[14px]", stat: "flex flex-col items-center gap-[5px]", value: "text-[13px]", label: "text-[8.5px] tracking-[0.03em]" },
  grid: { wrap: "grid grid-cols-2 gap-x-2 gap-y-[10px]", stat: "flex flex-col items-start gap-1", value: "text-[13px]", label: "text-[9px] tracking-[0.06em]" },
};

function format(key: (typeof STATS)[number][0], nutrition: Nutrition) {
  const value = nutrition[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return key === "calories" ? rounded.toLocaleString("en-US") : `${rounded}g`;
}

export default function NativeMacroRow({ nutrition, variant = "standard" }: { nutrition: Nutrition; variant?: Variant }) {
  const s = styles[variant];
  return (
    <div className={s.wrap} aria-hidden="true">
      {STATS.map(([key, label]) => (
        <div key={key} className={s.stat}>
          <span className={`font-heading font-bold leading-none tabular-nums ${s.value} ${macroColorTokens[key].valueClassName}`}>{format(key, nutrition)}</span>
          <span className={`font-bold uppercase leading-none text-slate-500 ${s.label}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}
