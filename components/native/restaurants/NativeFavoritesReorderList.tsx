"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Menu } from "lucide-react";
import type { NativeRestaurantSummary } from "@/lib/restaurants/useNativeRecentRestaurants";
import NativeRestaurantLogo from "./NativeRestaurantLogo";

const ROW = 56;
type Drag = { id: string; from: number; startY: number; dy: number };

export default function NativeFavoritesReorderList({ favorites, className, onMove, renderRemove }: {
  favorites: NativeRestaurantSummary[];
  className: string;
  onMove: (id: string, targetId: string) => void;
  renderRemove: (restaurant: NativeRestaurantSummary) => ReactNode;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  // The order is saved on release; this only eases the row into its slot.
  const [settle, setSettle] = useState<{ id: string; offset: number } | null>(null);
  const [message, setMessage] = useState("");
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const last = favorites.length - 1;
  const slot = drag ? Math.max(0, Math.min(last, drag.from + Math.round(drag.dy / ROW))) : 0;

  const moveTo = (index: number, target: number) => {
    const restaurant = favorites[index];
    if (!restaurant || target < 0 || target > last || target === index) return;
    onMove(restaurant.id, favorites[target].id);
    setMessage(`${restaurant.name} moved to position ${target + 1} of ${favorites.length}`);
  };
  const start = (event: PointerEvent<HTMLButtonElement>, id: string, from: number) => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cancelAnimationFrame(frame.current);
    setSettle(null);
    setDrag({ id, from, startY: event.clientY, dy: 0 });
  };
  const track = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag || !event.isPrimary) return;
    const min = -drag.from * ROW;
    const max = (last - drag.from) * ROW;
    const raw = event.clientY - drag.startY;
    // Past either end the row follows at a quarter speed instead of stopping.
    const dy = raw < min ? min + (raw - min) / 4 : raw > max ? max + (raw - max) / 4 : raw;
    setDrag({ ...drag, dy });
  };
  const drop = (event: PointerEvent<HTMLButtonElement>, commit: boolean) => {
    if (!drag || !event.isPrimary) return;
    const target = commit ? slot : drag.from;
    moveTo(drag.from, target);
    setSettle({ id: drag.id, offset: drag.dy - (target - drag.from) * ROW });
    setDrag(null);
    frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => setSettle(null)); });
  };
  const onKey = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    moveTo(index, event.key === "ArrowUp" ? index - 1 : index + 1);
  };

  return (
    <>
      <ul className={className}>
        {favorites.map((restaurant, index) => {
          const dragging = drag?.id === restaurant.id;
          const settling = settle?.id === restaurant.id;
          const shift = drag && !dragging
            ? index > drag.from && index <= slot ? -ROW : index < drag.from && index >= slot ? ROW : 0
            : 0;
          const y = dragging ? drag.dy : settling ? settle.offset : shift;
          // Neighbors glide while a drag is live. Once it ends the saved order
          // already places them, so their offset clears without animating.
          const animate = drag ? !dragging : !settle;
          return (
            <li
              key={restaurant.id}
              style={{ transform: y ? `translateY(${y}px)` : undefined }}
              className={`relative flex h-14 items-center rounded-[18px] px-1.5 ${animate ? "transition-transform duration-200 ease-out motion-reduce:transition-none" : ""} ${dragging || settling ? "z-10 bg-surface-card shadow-elev-3" : ""}`}
            >
              {index && !dragging ? <span className="absolute inset-x-0 top-0 h-px bg-slate-200 dark:bg-divider" aria-hidden="true" /> : null}
              {renderRemove(restaurant)}
              <NativeRestaurantLogo src={restaurant.logo} size={40} />
              <span className="min-w-0 flex-1 truncate px-3 text-base font-semibold">{restaurant.name}</span>
              <button
                type="button"
                aria-label={`Reorder ${restaurant.name}, position ${index + 1} of ${favorites.length}`}
                aria-describedby="native-favorites-hint"
                onPointerDown={(event) => start(event, restaurant.id, index)}
                onPointerMove={track}
                onPointerUp={(event) => drop(event, true)}
                onPointerCancel={(event) => drop(event, false)}
                onKeyDown={(event) => onKey(event, index)}
                className="flex size-11 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full text-slate-500 active:cursor-grabbing dark:text-slate-400 focus-ring"
              >
                <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">{message}</p>
    </>
  );
}
