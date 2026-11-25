"use client";
import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import type { SavedItem, SavedMeal } from "@/lib/native/homeCollections";
import { cleanMealName, copyItems, customizationLine, MEAL_NAME_LIMIT } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";
import SavedMacros from "./SavedMacros";
import SavedPhoto from "./SavedPhoto";
import SavedSheet from "./SavedSheet";
import { card, field, muted, row, soft, textButton } from "./savedStyles";

const MAX_QUANTITY = 9;
const step = "flex size-11 cursor-pointer items-center justify-center rounded-full disabled:opacity-30 focus-ring";
const stepFace = "flex size-8 items-center justify-center rounded-full bg-slate-200/70 dark:bg-surface-hover";

export default function SavedMealEditor({ meal, savedItems, onSave, onClose }: {
  meal: SavedMeal;
  savedItems: SavedItem[];
  onSave: (change: { name: string; items: CartItem[] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [items, setItems] = useState(meal.items);
  const [adding, setAdding] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const clean = cleanMealName(name);
  const changeQuantity = (id: string, by: number) =>
    setItems((current) => current.flatMap((item) => (item.id !== id ? item : item.quantity + by > 0 ? { ...item, quantity: item.quantity + by } : [])));
  const line = (item: CartItem) => (
    <>
      <SavedPhoto item={item} className="size-12 shrink-0 rounded-[14px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-5">{formatCartItemName(item)}</span>
        <span className={`block truncate text-[13px] leading-[17px] ${muted}`}>{customizationLine({ ...item, quantity: 1 })}</span>
      </span>
    </>
  );
  return (
    <SavedSheet titleId="saved-edit-title" onClose={onClose} initialFocusRef={cancel} tall>
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
        <button ref={cancel} type="button" onClick={onClose} className={`${textButton} font-semibold`}>Cancel</button>
        <h2 id="saved-edit-title" className="truncate font-heading text-base font-bold tracking-[-0.02em]">Edit meal</h2>
        <button type="button" disabled={!clean || !items.length} onClick={() => onSave({ name: clean, items })} className={`${textButton} font-bold`}>Save</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">
        <label className={`block text-sm font-semibold ${soft}`}>
          Meal name
          <input type="text" value={name} maxLength={MEAL_NAME_LIMIT} autoComplete="off" onChange={(event) => setName(event.target.value)} className={field} />
        </label>
        <h3 className="mt-[22px] text-base font-bold">Items</h3>
        {items.length ? (
          <ul className={`mt-2.5 rounded-3xl py-1 pl-3.5 pr-1 ${card}`}>
            {items.map((item) => (
              <li key={item.id} className={`flex items-center gap-3 py-2 ${row}`}>
                {line(item)}
                <span className="flex shrink-0 items-center">
                  <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={item.quantity > 1 ? `One fewer ${formatCartItemName(item)}` : `Remove ${formatCartItemName(item)}`} className={step}>
                    <span className={stepFace}>{item.quantity > 1 ? <Minus size={14} strokeWidth={3} aria-hidden="true" /> : <Trash2 size={15} strokeWidth={2.4} className="text-error dark:text-red-400" aria-hidden="true" />}</span>
                  </button>
                  <span aria-live="polite" aria-label={`Quantity ${item.quantity}`} className="min-w-4 text-center text-base font-bold tabular-nums">{item.quantity}</span>
                  <button type="button" onClick={() => changeQuantity(item.id, 1)} disabled={item.quantity >= MAX_QUANTITY} aria-label={`One more ${formatCartItemName(item)}`} className={step}>
                    <span className={stepFace}><Plus size={14} strokeWidth={3} aria-hidden="true" /></span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className={`mt-2 text-[15px] leading-5 ${soft}`}>A meal needs at least one item.</p>}
        <button type="button" aria-expanded={adding} onClick={() => setAdding((open) => !open)} className="mt-1 flex h-[52px] cursor-pointer items-center gap-2.5 px-1 text-base font-semibold text-accent-strong active:opacity-70 focus-ring">
          <Plus size={19} strokeWidth={2.4} aria-hidden="true" />Add an item
        </button>
        {adding ? (
          savedItems.length ? (
            <ul aria-label="Your saved items" className={`rounded-3xl py-1 pl-3.5 pr-1 ${card}`}>
              {savedItems.map((entry) => (
                <li key={entry.id} className={row}>
                  <button type="button" aria-label={`Add ${formatCartItemName(entry.item)} to this meal`} onClick={() => setItems((current) => [...current, ...copyItems([{ ...entry.item, quantity: 1 }])])} className="flex w-full cursor-pointer items-center gap-3 py-2 text-left active:opacity-70 focus-ring">
                    {line(entry.item)}
                    <span className="flex size-11 shrink-0 items-center justify-center text-accent-strong"><Plus size={18} strokeWidth={2.8} aria-hidden="true" /></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className={`px-1 text-[15px] leading-5 ${soft}`}>Your saved items show up here. You haven’t saved any yet.</p>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-slate-200 px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-3.5 dark:border-divider"><SavedMacros items={items} size="lg" /></div>
    </SavedSheet>
  );
}
