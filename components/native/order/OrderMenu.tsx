"use client";
import { useRef } from "react";
import { Bookmark, Download, Trash2 } from "lucide-react";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { card, row } from "@/components/native/saved/savedStyles";

export default function OrderMenu({ onExport, onAddMeal, onClear, onClose }: { onExport: () => void; onAddMeal: () => void; onClear: () => void; onClose: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  const actions = [
    { label: "Export", Icon: Download, run: onExport },
    { label: "Add a saved meal", Icon: Bookmark, run: onAddMeal },
    { label: "Clear order", Icon: Trash2, run: onClear },
  ];
  return (
    <SavedSheet titleId="order-menu-title" onClose={onClose} initialFocusRef={first}>
      <div className="min-h-0 overflow-y-auto px-5 pb-[max(2rem,var(--safe-area-bottom))]">
        <h2 id="order-menu-title" className="py-4 font-heading text-lg font-bold leading-[25px] tracking-[-0.02em]">Your Order</h2>
        <ul className={`overflow-hidden rounded-3xl ${card}`}>
          {actions.map(({ label, Icon, run }, index) => (
            <li key={label} className={row}>
              <button ref={index === 0 ? first : undefined} type="button" onClick={run} className={`flex h-[50px] w-full cursor-pointer items-center gap-3.5 px-[18px] text-left text-base font-medium active:bg-slate-50 dark:active:bg-surface-hover focus-ring ${label === "Clear order" ? "text-error dark:text-red-400" : ""}`}>
                <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SavedSheet>
  );
}
