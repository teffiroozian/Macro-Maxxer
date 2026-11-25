"use client";
import { useState } from "react";
import { Check, Cookie, Coffee, CupSoda, Droplets, GlassWater, Grid2X2, Leaf, Minus, Soup, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { row } from "@/components/native/saved/savedStyles";
import { selectCategoryPreset, selectCustomCategories, toggleCategoryMembership, type CategoryPresetId } from "@/lib/menuSections/categoryPresets";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { menuCategories, presetCount, selectedPreset, type RestaurantMenu, type RestaurantMenuView } from "@/lib/native/restaurantMenu";
import MenuSheet, { linkButton } from "./MenuSheet";

const ICONS: Record<CategoryPresetId, LucideIcon> = { main: UtensilsCrossed, food: UtensilsCrossed, coffee: Coffee, matcha: Leaf, refreshers: GlassWater, sweets: Cookie, sides: Soup, drinks: CupSoda, shareables: Users, sauces: Droplets, all: Grid2X2 };

export default function MenuSelectionSheet({ menu, view, action, disabled, onChange, onClose }: {
  menu: RestaurantMenu;
  view: RestaurantMenuView;
  action: string;
  disabled: boolean;
  onChange: (filters: Filters) => void;
  onClose: () => void;
}) {
  const { filters } = view;
  const current = selectedPreset(menu, filters);
  // The preset a custom selection started from.
  const [baseId, setBaseId] = useState(current?.id ?? menu.main.id);
  const base = menu.presets.find((preset) => preset.id === baseId) ?? menu.main;
  const categories = menuCategories(menu, filters);
  const selected = filters.categories ?? menu.allIds;
  const pick = (preset: typeof base) => { setBaseId(preset.id); onChange(selectCategoryPreset(filters, preset)); };

  return (
    <MenuSheet title="Menu" action={action} disabled={disabled} onReset={() => pick(menu.main)} onClose={onClose}>
      <div role="group" aria-label="Presets" className="grid grid-cols-2 gap-2">
        {menu.presets.map((preset) => {
          const on = preset.id === current?.id;
          const Icon = ICONS[preset.id];
          return (
            <button key={preset.id} type="button" aria-pressed={on} onClick={() => pick(preset)} className={`flex h-[52px] min-w-0 cursor-pointer items-center gap-2.5 rounded-[18px] pl-[9px] pr-3.5 text-left focus-ring ${on ? "bg-accent-soft text-accent-strong shadow-[inset_0_0_0_2px_var(--product-accent)]" : "bg-surface-card shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] active:bg-slate-100 dark:shadow-[inset_0_0_0_1px_var(--border-hairline)] dark:active:bg-surface-hover"}`}>
              <span className={`flex size-[34px] shrink-0 items-center justify-center rounded-full ${on ? "bg-accent-strong text-white dark:bg-accent dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-surface-hover dark:text-slate-300"}`}><Icon size={17} strokeWidth={2.2} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{preset.label}</span>
              <span className={`text-sm tabular-nums ${on ? "" : "text-slate-500 dark:text-slate-400"}`}>{presetCount(menu, preset, view)}</span>
            </button>
          );
        })}
      </div>
      {current ? null : (
        <div role="status" className="mt-2.5 flex h-12 items-center gap-2.5 rounded-2xl bg-accent-soft pl-3.5 pr-2 text-accent-strong">
          <b className="text-[15px] font-bold">Custom</b>
          <span className="min-w-0 flex-1 truncate text-sm">Edited from {base.label}</span>
          <button type="button" onClick={() => pick(base)} className="h-11 cursor-pointer px-2 text-[15px] font-bold focus-ring">Undo</button>
        </div>
      )}
      <div className="mt-2 flex h-[50px] items-center">
        <h3 className="flex-1 text-base font-bold">Categories</h3>
        <button type="button" onClick={() => onChange(selectCustomCategories(filters, menu.allIds))} className={linkButton}>Select all</button>
        <button type="button" onClick={() => onChange(selectCustomCategories(filters, []))} className={`ml-4 ${linkButton}`}>Clear all</button>
      </div>
      <ul className="border-t border-slate-200 dark:border-divider">
        {categories.map((category) => {
          const { state } = category;
          return (
            <li key={category.id} className={`flex items-center ${row}`}>
              <button type="button" role="checkbox" aria-checked={state === "some" ? "mixed" : state === "all"} onClick={() => onChange(toggleCategoryMembership(filters, selected, category.id, state))} className="flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left focus-ring">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${state === "all" ? "bg-accent-strong text-white dark:bg-accent dark:text-slate-950" : state === "some" ? "bg-accent-soft text-accent-strong shadow-[inset_0_0_0_1.5px_var(--product-accent)]" : "bg-surface-card shadow-[inset_0_0_0_1.5px_var(--border-control)]"}`} aria-hidden="true">
                  {state === "all" ? <Check size={15} strokeWidth={3.4} /> : state === "some" ? <Minus size={15} strokeWidth={3.4} /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-base font-medium">{category.label}</span>
                <span className="text-[15px] tabular-nums text-slate-500 dark:text-slate-400">{category.count}</span>
              </button>
              <button type="button" aria-label={`Only ${category.label}`} onClick={() => onChange(selectCustomCategories(filters, [category.id]))} className="ml-1.5 h-12 w-[52px] shrink-0 cursor-pointer text-right text-[15px] font-semibold text-accent-strong focus-ring">Only</button>
            </li>
          );
        })}
      </ul>
    </MenuSheet>
  );
}
