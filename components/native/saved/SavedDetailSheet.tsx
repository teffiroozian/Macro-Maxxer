"use client";
import { useRef } from "react";
import { Ellipsis } from "lucide-react";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import { customizationLine } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import SavedMacros from "./SavedMacros";
import SavedPhoto from "./SavedPhoto";
import SavedPlace from "./SavedPlace";
import SavedSheet from "./SavedSheet";
import { card, muted, primaryButton, quietButton, row } from "./savedStyles";

export type SavedDetailAction = { label: string; run: () => void; danger?: boolean };

// One sheet for a meal, a saved item or a past order.
export default function SavedDetailSheet({ title, items, restaurants, when, hero, listTitle, changes, primary, actions, onMore, onClose }: {
  title: string;
  items: CartItem[];
  restaurants: RestaurantIndexEntry[];
  // A past order shows when it was placed instead of what is in it.
  when?: string;
  hero?: CartItem;
  listTitle: string;
  // A saved item lists its changes; otherwise the items themselves.
  changes?: string[];
  primary: SavedDetailAction;
  actions: SavedDetailAction[];
  onMore?: () => void;
  onClose: () => void;
}) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  return (
    <SavedSheet titleId="saved-detail-title" onClose={onClose} initialFocusRef={primaryRef}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
        {hero?.image ? <SavedPhoto item={hero} className="mb-[18px] h-[190px] w-full rounded-3xl" /> : null}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="saved-detail-title" className="font-heading text-[22px] font-bold leading-[29px] tracking-[-0.02em] [overflow-wrap:anywhere]">{title}</h2>
            <div className={`mt-[5px] flex min-w-0 items-center text-[15px] leading-5 ${muted}`}>
              <SavedPlace items={items} restaurants={restaurants} size={22} label={when} withCount={!changes} className="min-w-0" />
            </div>
          </div>
          {onMore ? <button type="button" aria-label="More" onClick={onMore} className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring ${card}`}><Ellipsis size={20} strokeWidth={2.4} aria-hidden="true" /></button> : null}
        </div>
        <SavedMacros items={items} size="lg" className="mt-[18px]" />
        {changes && !changes.length ? null : (
          <>
            <h3 className="mt-[22px] text-base font-bold">{listTitle}</h3>
            <ul className={`mt-2.5 rounded-3xl px-3.5 py-1 ${card}`}>
              {changes
                ? changes.map((change, index) => <li key={`${index}-${change}`} className={`py-3 text-[15px] font-semibold leading-5 ${row}`}>{change}</li>)
                : items.map((item) => (
                    <li key={item.id} className={`flex items-center gap-3 py-2.5 ${row}`}>
                      <SavedPhoto item={item} className="size-12 shrink-0 rounded-[14px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-5">{formatCartItemName(item)}</span>
                        <span className={`block truncate text-[13px] leading-[17px] ${muted}`}>{customizationLine({ ...item, quantity: 1 })}</span>
                      </span>
                      <span className={`shrink-0 text-sm ${muted}`}>×{item.quantity}</span>
                    </li>
                  ))}
            </ul>
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-200 px-5 pb-[max(1.5rem,var(--safe-area-bottom))] pt-3 dark:border-divider">
        <button ref={primaryRef} type="button" onClick={primary.run} className={primaryButton}>{primary.label}</button>
        <div className="flex gap-2">
          {actions.map((action) => <button key={action.label} type="button" onClick={action.run} className={`${quietButton} ${action.danger ? "text-error dark:text-red-400" : ""}`}>{action.label}</button>)}
        </div>
      </div>
    </SavedSheet>
  );
}
