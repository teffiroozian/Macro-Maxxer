import type { CartMacros } from "@/stores/cartStore";
import type { ReactNode } from "react";

export type MacroKey = keyof CartMacros;
export type MacroTotalsInput = Pick<CartMacros, "calories" | "protein" | "carbs" | "totalFat">;

type MacroDisplayConfig = {
  label: string;
  unit?: string;
  valueClassNameByVariant: Record<"default" | "bar", string>;
};

export const macroDisplayConfig: Record<MacroKey, MacroDisplayConfig> = {
  calories: {
    label: "Calories",
    valueClassNameByVariant: {
      default: "text-slate-900",
      bar: "text-[#111318]",
    },
  },
  protein: {
    label: "Protein",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#c2410c]",
      bar: "text-[#C75A1B]",
    },
  },
  carbs: {
    label: "Carbs",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#ca8a04]",
      bar: "text-[#D0A700]",
    },
  },
  totalFat: {
    label: "Fat",
    unit: "g",
    valueClassNameByVariant: {
      default: "text-[#2563eb]",
      bar: "text-[#2563eb]",
    },
  },
};

const macroOrder: MacroKey[] = ["calories", "protein", "carbs", "totalFat"];

type MacroTotalsGridProps = {
  macros: MacroTotalsInput;
  size?: "compact" | "full" | "panel";
  variant?: "default" | "bar";
  className?: string;
  itemClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  valueExtras?: Partial<Record<MacroKey, ReactNode>>;
};

export default function MacroTotalsGrid({
  macros,
  size = "full",
  variant = "default",
  className = "",
  itemClassName = "",
  labelClassName = "",
  valueClassName = "",
  valueExtras,
}: MacroTotalsGridProps) {
  const sizeClassNames = {
    value:
      size === "compact"
        ? "text-xl"
        : size === "panel"
          ? "text-2xl"
          : "text-2xl sm:text-3xl",
    label: size === "full" ? "mt-2 text-xs" : "mt-2 text-[10px]",
  };

  return (
    <div className={`grid grid-cols-4 gap-2 text-center ${className}`.trim()}>
      {macroOrder.map((macroKey) => {
        const config = macroDisplayConfig[macroKey];

        return (
          <div key={macroKey} className={`px-1 py-1 ${itemClassName}`.trim()}>
            <p
              className={`font-bold leading-none ${sizeClassNames.value} ${config.valueClassNameByVariant[variant]} ${valueClassName}`.trim()}
            >
              {macros[macroKey]}
              {config.unit ?? ""}
              {valueExtras?.[macroKey]}
            </p>
            <p
              className={`${sizeClassNames.label} font-semibold uppercase tracking-wide text-slate-500 ${labelClassName}`.trim()}
            >
              {config.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
