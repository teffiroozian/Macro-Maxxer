"use client";
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { formatOrderDate, orderItemNames, orderPhotos } from "@/components/native/home/orderPresentation";
import SavedMacros from "@/components/native/saved/SavedMacros";
import SavedPhoto from "@/components/native/saved/SavedPhoto";
import SavedSheet from "@/components/native/saved/SavedSheet";
import { addCircle, card, muted, soft } from "@/components/native/saved/savedStyles";
import type { PastOrder, SavedMeal } from "@/lib/native/homeCollections";
import type { CartItem } from "@/types/cart";
import { segment, segments } from "./menu/MenuSheet";
import type { YoursTab } from "./RestaurantShortcuts";

// onClose must be stable, see SavedSheet.
export default function RestaurantYoursSheet({ name, meals, orders, initial, onAdd, onClose }: {
  name: string;
  meals: SavedMeal[];
  orders: PastOrder[];
  initial: YoursTab;
  onAdd: (label: string, items: CartItem[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(initial);
  const close = useRef<HTMLButtonElement>(null);
  const rows = tab === "meals"
    ? meals.map((meal) => ({ id: meal.id, title: meal.name, items: meal.items }))
    : orders.map((order) => ({ id: order.id, title: formatOrderDate(order.placedAt), items: order.items }));
  return (
    <SavedSheet titleId="restaurant-yours-title" onClose={onClose} initialFocusRef={close}>
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 px-5">
        <h2 id="restaurant-yours-title" className="min-w-0 flex-1 truncate font-heading text-xl font-bold tracking-[-0.02em]">Yours at {name}</h2>
        <button ref={close} type="button" aria-label="Close" onClick={onClose} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-ring"><span className="flex size-10 items-center justify-center rounded-full bg-slate-200/70 dark:bg-surface-hover"><X size={17} strokeWidth={2.4} aria-hidden="true" /></span></button>
      </div>
      <div className="shrink-0 px-5">
        <div role="radiogroup" aria-label="Show" className={segments}>
          {([["meals", "Saved meals"], ["orders", "Previous orders"]] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={tab === value} onClick={() => setTab(value)} className={segment(tab === value)}>{label}</button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,var(--safe-area-bottom))] pt-3.5">
        {rows.length ? (
          <ul className="flex flex-col gap-3">
            {rows.map(({ id, title, items }) => (
              <li key={id} className={`rounded-3xl p-3.5 ${card}`}>
                <div className="flex items-center gap-3">
                  <span className="flex shrink-0" aria-hidden="true">{orderPhotos(items).slice(0, 2).map((item, index) => <span key={item.id} className={`relative rounded-[18px] border-2 border-white dark:border-surface-card ${index ? "-ml-[19px]" : ""}`}><SavedPhoto item={item} className="size-12 rounded-2xl" /></span>)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold leading-5">{title}</span>
                    <span className={`mt-0.5 block truncate text-sm leading-[18px] ${muted}`}>{orderItemNames(items)}</span>
                  </span>
                  <button type="button" aria-label={`Add ${title} to your order`} onClick={() => onAdd(title, items)} className="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring"><span className={`size-9 ${addCircle}`}><Plus size={17} strokeWidth={2.8} aria-hidden="true" /></span></button>
                </div>
                <SavedMacros items={items} size="sm" className="mt-2.5" />
              </li>
            ))}
          </ul>
        ) : <p className={`px-4 pb-6 pt-4 text-center text-base leading-[22px] ${soft}`}>{tab === "meals" ? `No saved meals from ${name} yet.` : `No previous orders from ${name} yet.`}</p>}
      </div>
    </SavedSheet>
  );
}
