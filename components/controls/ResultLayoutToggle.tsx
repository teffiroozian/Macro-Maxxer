"use client";

import { LayoutGrid, List } from "lucide-react";

export default function ResultLayoutToggle({ value, onChange }: { value: "list" | "grid"; onChange: (layout: "list" | "grid") => void }) {
  return <div className="ml-1 flex shrink-0 rounded-full bg-slate-100 dark:bg-surface-subtle p-[3px]" role="group" aria-label="Results layout">
    {([{ value: "list", label: "List view", icon: List }, { value: "grid", label: "Grid view", icon: LayoutGrid }] as const).map((option) => {
      const Icon = option.icon;
      const active = value === option.value;
      return <button key={option.value} type="button" aria-label={option.label} aria-pressed={active} onClick={() => onChange(option.value)} className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full transition ${active ? "bg-white dark:bg-surface-hover text-slate-950 dark:text-slate-50 shadow-sm" : "text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}><Icon className="h-4 w-4" strokeWidth={2.2} /></button>;
    })}
  </div>;
}
