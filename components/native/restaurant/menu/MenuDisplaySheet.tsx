"use client";
import { LayoutGrid, Rows3 } from "lucide-react";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { card, row } from "@/components/native/saved/savedStyles";
import type { Filters } from "@/lib/menuSections/filterOptions";
import type { CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import { NATIVE_VARIANT_DEFAULTS, type VariantKey } from "@/lib/native/restaurantMenu";
import MenuSheet, { segment, segments } from "./MenuSheet";

export type MenuLayout = "list" | "grid";

const MODES: { mode: CardDisplayMode; label: string; macros: ["calories" | "protein" | "carbs" | "totalFat" | "fiber", string][] }[] = [
  { mode: "standard", label: "Standard", macros: [["calories", "Cal"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] },
  { mode: "fiber", label: "Fiber", macros: [["calories", "Cal"], ["protein", "Protein"], ["fiber", "Fiber"]] },
];
const VARIANTS: { key: VariantKey; title: string; text: string }[] = [
  { key: "showServingSizeVariants", title: "Different serving sizes", text: "Lists each size or count as its own result" },
  { key: "showRecipeVariants", title: "Different flavors", text: "Lists each flavor or protein as its own result" },
  { key: "separateSizesInProteinScore", title: "Separate sizes in Protein Score", text: "Even when the sizes score about the same" },
];

export default function MenuDisplaySheet({ layout, mode, filters, onLayout, onChange, onClose }: {
  layout: MenuLayout;
  mode: CardDisplayMode;
  filters: Filters;
  onLayout: (layout: MenuLayout) => void;
  onChange: (filters: Filters) => void;
  onClose: () => void;
}) {
  return (
    <MenuSheet title="Display" action="Done" onReset={() => { onLayout("list"); onChange({ ...filters, ...NATIVE_VARIANT_DEFAULTS, cardDisplayOverride: undefined }); }} onClose={onClose}>
      <h3 className="pb-2 text-base font-bold">Layout</h3>
      <div role="radiogroup" aria-label="Layout" className={segments}>
        {(["list", "grid"] as const).map((value) => {
          const Icon = value === "list" ? Rows3 : LayoutGrid;
          return <button key={value} type="button" role="radio" aria-checked={layout === value} onClick={() => onLayout(value)} className={segment(layout === value)}><Icon size={17} strokeWidth={2.2} aria-hidden="true" />{value === "list" ? "List" : "Grid"}</button>;
        })}
      </div>
      <h3 className="pb-2 pt-5 text-base font-bold">Card display</h3>
      <div role="radiogroup" aria-label="Card display" className="grid grid-cols-2 gap-2.5">
        {MODES.map((option) => {
          const on = option.mode === mode;
          return (
            <button key={option.mode} type="button" role="radio" aria-checked={on} onClick={() => onChange({ ...filters, cardDisplayOverride: option.mode })} className={`min-w-0 cursor-pointer rounded-[18px] p-3 text-left focus-ring ${on ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--product-accent)]" : "bg-surface-card shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:shadow-[inset_0_0_0_1px_var(--border-hairline)]"}`}>
              <span className="block text-[15px] font-bold leading-5">{option.label}</span>
              <span className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                {option.macros.map(([key, label]) => <span key={key} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><span aria-hidden="true" className={`size-2 rounded-full ${macroColorTokens[key].segmentClassName}`} />{label}</span>)}
              </span>
            </button>
          );
        })}
      </div>
      <h3 className="pb-2 pt-5 text-base font-bold">Variants</h3>
      <div className={`rounded-[20px] px-3.5 ${card}`}>
        {VARIANTS.map(({ key, title, text }) => {
          const on = filters[key] ?? NATIVE_VARIANT_DEFAULTS[key];
          return (
            <button key={key} type="button" role="switch" aria-checked={on} onClick={() => onChange({ ...filters, [key]: !on })} className={`flex w-full cursor-pointer items-center gap-3 py-[11px] text-left focus-ring ${row}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-[19px]">{title}</span>
                <span className="mt-0.5 block text-sm leading-[18px] text-slate-500 dark:text-slate-400">{text}</span>
              </span>
              <span aria-hidden="true" className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none ${on ? "bg-accent-strong dark:bg-accent" : "bg-slate-300 dark:bg-control"}`}>
                <span className={`absolute left-0.5 top-0.5 size-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-150 motion-reduce:transition-none ${on ? "translate-x-5" : ""}`} />
              </span>
            </button>
          );
        })}
      </div>
    </MenuSheet>
  );
}
