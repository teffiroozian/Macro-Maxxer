"use client";
import { useRef, useState } from "react";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { getCartItemImagePresentation } from "@/lib/cart/cartItemLookup";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import { getCartItemCoreMacros } from "@/lib/cart/itemAccessors";
import type { CartItem } from "@/types/cart";
import { formatWhole } from "./cartPresentation";

const REVEAL = 140;
const OPEN_THRESHOLD = 70;
const MACROS = [["calories", "Calories"], ["protein", "Protein"], ["carbs", "Carbs"], ["totalFat", "Fat"]] as const;

export default function NativeCartItemCard({ cartItem, open, onOpenChange, isEditLoading, onEdit, onDelete, onIncrement, onDecrement }: {
  cartItem: CartItem; open: boolean; onOpenChange: (open: boolean) => void; isEditLoading: boolean;
  onEdit: () => void; onDelete: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  const name = formatCartItemName(cartItem);
  const detail = summarizeItem(cartItem) || "Standard";
  const qty = Math.max(cartItem.quantity, 1);
  const core = getCartItemCoreMacros(cartItem);
  const [drag, setDrag] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, base: open ? -REVEAL : 0, horizontal: null };
    moved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (s.horizontal === null && Math.abs(dx) + Math.abs(dy) > 6) s.horizontal = Math.abs(dx) > Math.abs(dy);
    if (!s.horizontal) return;
    moved.current = true;
    setDrag(Math.min(0, Math.max(-REVEAL, s.base + dx)));
  };
  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    if (s?.horizontal && drag !== null) onOpenChange(drag < -OPEN_THRESHOLD);
    setDrag(null);
  };
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const remove = () => {
    setRemoving(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onDelete, reduce ? 0 : 200);
  };
  const offset = drag ?? (open ? -REVEAL : 0);

  return (
    <li className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${removing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`} aria-label={name}>
      <div className="min-h-0 overflow-hidden">
        <div className="relative pb-[10px]">
          <div className="absolute bottom-[10px] right-0 top-0 flex gap-1.5">
            <button type="button" onClick={stop(() => { onOpenChange(false); onEdit(); })} aria-label={`Edit ${name}`} disabled={isEditLoading}
              className="flex w-16 flex-col items-center justify-center gap-[3px] rounded-[20px] bg-slate-500 text-white focus-ring">
              {isEditLoading
                ? <svg className="animate-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="2.5" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              <span className="text-xs font-semibold">Edit</span>
            </button>
            <button type="button" onClick={stop(remove)} aria-label={`Delete ${name}`}
              className="flex w-16 flex-col items-center justify-center gap-[3px] rounded-[20px] bg-[#dc2626] text-white focus-ring">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-xs font-semibold">Delete</span>
            </button>
          </div>
          <div
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
            onClick={() => { if (!moved.current) onOpenChange(!open); }}
            style={{ transform: `translateX(${offset}px)`, transitionDuration: drag !== null ? "0ms" : undefined }}
            className="relative flex touch-pan-y flex-col gap-[10px] rounded-[20px] border border-black/8 bg-white p-3 shadow-elev-2 transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <RestaurantItemImage src={cartItem.image} alt="" imagePresentation={getCartItemImagePresentation(cartItem)} fallbackClassName="object-cover" containerClassName="size-[52px] shrink-0 overflow-hidden rounded-[14px] bg-[#f1f5f9]" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-base font-bold text-slate-900">{name}</p>
                <p className="truncate text-[12.5px] text-slate-500">{detail}</p>
              </div>
              <div className="flex h-[30px] shrink-0 items-center rounded-[15px] bg-[#f1f5f9] text-slate-600" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={stop(onDecrement)} disabled={cartItem.quantity <= 1} aria-label={`Decrease ${name}`} className="flex h-[30px] w-7 items-center justify-center disabled:opacity-30 focus-ring">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                </button>
                <span aria-live="polite" aria-label={`${name}, quantity ${cartItem.quantity}`} className="min-w-3 text-center text-sm font-bold tabular-nums text-slate-900">{cartItem.quantity}</span>
                <button type="button" onClick={stop(onIncrement)} aria-label={`Increase ${name}`} className="flex h-[30px] w-7 items-center justify-center focus-ring">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 rounded-[14px] bg-slate-50 px-3 py-[10px]" aria-hidden="true">
              {MACROS.map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500"><span className={`size-[5px] rounded-full ${macroColorTokens[key].segmentClassName.split(" ")[0]}`} />{label}</span>
                  <span className={`font-heading text-sm font-bold leading-none tabular-nums ${macroColorTokens[key].valueClassName}`}>{formatWhole(core[key] * qty, key === "calories" ? "" : "g")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
