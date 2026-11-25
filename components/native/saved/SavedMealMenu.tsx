"use client";
import { useRef } from "react";
import { Copy, Eye, Pencil, Plus, TextCursorInput, Trash2 } from "lucide-react";
import type { SavedMeal } from "@/lib/native/homeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import SavedPhoto, { leadItem } from "./SavedPhoto";
import SavedPlace from "./SavedPlace";
import SavedSheet from "./SavedSheet";
import { card, muted, row } from "./savedStyles";

export default function SavedMealMenu({ meal, restaurants, onAdd, onView, onRename, onEdit, onDuplicate, onDelete, onClose }: {
  meal: SavedMeal;
  restaurants: RestaurantIndexEntry[];
  onAdd: () => void;
  onView: () => void;
  onRename: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  const actions = [
    { label: "Add to order", Icon: Plus, run: onAdd },
    { label: "View meal", Icon: Eye, run: onView },
    { label: "Rename", Icon: TextCursorInput, run: onRename },
    { label: "Edit items", Icon: Pencil, run: onEdit },
    { label: "Duplicate", Icon: Copy, run: onDuplicate },
    { label: "Delete", Icon: Trash2, run: onDelete },
  ];
  return (
    <SavedSheet titleId="saved-menu-title" onClose={onClose} initialFocusRef={first}>
      <div className="min-h-0 overflow-y-auto px-5 pb-[max(2rem,var(--safe-area-bottom))]">
        <div className="flex items-center gap-3.5 py-4">
          <SavedPhoto item={leadItem(meal.items)} className="size-[60px] shrink-0 rounded-[18px]" />
          <div className="min-w-0">
            <h2 id="saved-menu-title" className="truncate font-heading text-[17px] font-bold leading-6 tracking-[-0.02em]">{meal.name}</h2>
            <SavedPlace items={meal.items} restaurants={restaurants} withCount className={`mt-0.5 text-sm ${muted}`} />
          </div>
        </div>
        <ul className={`overflow-hidden rounded-3xl ${card}`}>
          {actions.map(({ label, Icon, run }, index) => (
            <li key={label} className={row}>
              <button ref={index === 0 ? first : undefined} type="button" onClick={run} className={`flex h-[50px] w-full cursor-pointer items-center gap-3.5 px-[18px] text-left text-base font-medium active:bg-slate-50 dark:active:bg-surface-hover focus-ring ${label === "Delete" ? "text-error dark:text-red-400" : ""}`}>
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
