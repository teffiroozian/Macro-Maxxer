"use client";

import { LayoutGrid, UtensilsCrossed } from "lucide-react";
import Image from "@/components/ui/AppImage";
import { selectableRowClassName } from "@/components/ui/selectableRow";

export type EntreeOption = {
  key: string;
  label: string;
  image?: string;
  selected?: boolean;
  onSelect: () => void;
  showDividerBefore?: boolean;
};

// Reuse the same entree selections in mobile cards and the original desktop rows.
export default function EntreeOptions({ options, onSelect, mobileGrid = false }: { options: EntreeOption[]; onSelect?: () => void; mobileGrid?: boolean }) {
  if (mobileGrid) return <div className="grid grid-cols-2 auto-rows-fr gap-2">
    {options.map((option) => <button key={option.key} type="button" aria-pressed={Boolean(option.selected)} onClick={() => { option.onSelect(); onSelect?.(); }} className={`flex h-full min-h-36 min-w-0 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center font-semibold text-black/88 dark:text-slate-200 focus-ring ${option.selected ? "border-slate-300 dark:border-control bg-slate-50 dark:bg-surface-subtle" : "border-slate-200 dark:border-divider bg-white dark:bg-surface-card hover:bg-slate-50 dark:hover:bg-surface-hover"}`}>
      {option.image ? <span className="relative h-12 w-12 shrink-0"><Image src={option.image} alt={option.label} fill className="object-contain" /></span> : option.key === "choose-entree" ? <UtensilsCrossed className="h-6 w-6 shrink-0" strokeWidth={2.2} /> : <LayoutGrid className="h-6 w-6 shrink-0" strokeWidth={2.2} />}
      <span className="max-w-full whitespace-normal break-words text-[15px] leading-5">{option.label}</span>
    </button>)}
  </div>;
  return <div className="grid gap-1">
    {options.map((option) => <div key={option.key} className="grid">
      {option.showDividerBefore ? <div className="my-1 border-t border-black/10 dark:border-hairline" aria-hidden="true" /> : null}
      <button type="button" aria-pressed={Boolean(option.selected)} onClick={() => { option.onSelect(); onSelect?.(); }} className={selectableRowClassName({ active: Boolean(option.selected), className: "inline-flex py-2" })}>
        {option.image ? <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-divider bg-white dark:bg-image-placeholder!"><Image src={option.image} alt={option.label} fill className="object-cover" /></span> : option.key === "choose-entree" ? <UtensilsCrossed className="h-4 w-4 shrink-0" strokeWidth={2.2} /> : option.key === "view-all-ingredients" ? <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2.2} /> : null}
        <span>{option.label}</span>
      </button>
    </div>)}
  </div>;
}
