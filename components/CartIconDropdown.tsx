"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/stores/cartStore";
import { useRestaurantUi } from "@/components/RestaurantUiContext";
import { ShoppingCart } from "lucide-react";

type CartIconDropdownProps = {
  buttonClassName: string;
  countFormat?: "compact" | "parenthesized";
};

const SCROLL_CLOSE_THRESHOLD = 90;

export default function CartIconDropdown({
  buttonClassName,
  countFormat = "compact",
}: CartIconDropdownProps) {
  const { openCart } = useRestaurantUi();
  const { items, totals, lastAddedItem, lastAddedAt } = useCart();
  const [dismissedAddedAt, setDismissedAddedAt] = useState<number | null>(() => lastAddedAt);
  const containerRef = useRef<HTMLDivElement>(null);
  const openScrollYRef = useRef<number | null>(null);
  const isOpen = lastAddedAt !== null && lastAddedAt !== dismissedAddedAt;


  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        if (lastAddedAt !== null) {
          setDismissedAddedAt(lastAddedAt);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, lastAddedAt]);

  useEffect(() => {
    if (!isOpen) {
      openScrollYRef.current = null;
      return;
    }

    openScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (openScrollYRef.current === null) {
        openScrollYRef.current = window.scrollY;
        return;
      }

      if (Math.abs(window.scrollY - openScrollYRef.current) > SCROLL_CLOSE_THRESHOLD) {
        if (lastAddedAt !== null) {
          setDismissedAddedAt(lastAddedAt);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen, lastAddedAt]);

  const countLabel = (
  <>
    <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
    {cartCount > 0 && ` (${cartCount})`}
  </>
);

  const itemMeta = [lastAddedItem?.variantLabel, lastAddedItem?.optionsLabel]
    .filter(Boolean)
    .join(" • ");
  const itemInitial = (lastAddedItem?.name?.trim().charAt(0) || "+").toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          openCart();
          if (lastAddedAt !== null) {
            setDismissedAddedAt(lastAddedAt);
          }
        }}
        className={buttonClassName}
        aria-label={cartCount > 0 ? `Cart (${cartCount})` : "Cart"}
        aria-expanded={isOpen}
      >
        {countLabel}
      </button>

      <div
        aria-hidden={!isOpen}
        className={`absolute right-0 top-[calc(100%+0.55rem)] z-[130] w-[22rem] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Just added
            </p>
            <div className="mt-2 flex gap-3">
            {lastAddedItem ? (
              <>
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-base font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {itemInitial}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                    {lastAddedItem.name}
                  </p>
                  {itemMeta ? <p className="line-clamp-1 text-xs text-slate-500">{itemMeta}</p> : null}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-none">
                    <p className="whitespace-nowrap text-slate-600">
                      Cal <span className="font-semibold text-slate-900">{lastAddedItem.macrosPerItem.calories}</span>
                    </p>
                    <p className="whitespace-nowrap text-slate-600">
                      Protein <span className="font-semibold text-emerald-700">{lastAddedItem.macrosPerItem.protein}g</span>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Your cart is empty.</p>
            )}
            </div>
          </div>

          <div className="my-3 h-px bg-slate-200" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Totals</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-base font-semibold leading-none text-slate-900">{totals.calories}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Calories</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
                <p className="text-base font-semibold leading-none text-emerald-700">{totals.protein}g</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-emerald-700/80">Protein</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                <p className="text-base font-semibold leading-none text-amber-700">{totals.carbs}g</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-700/80">Carbs</p>
              </div>
              <div className="rounded-lg bg-sky-50 px-2 py-1.5">
                <p className="text-base font-semibold leading-none text-sky-700">{totals.fat}g</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-sky-700/80">Fat</p>
              </div>
            </div>
          </div>

          <div className="my-3 h-px bg-slate-200" />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openCart();
                if (lastAddedAt !== null) {
                  setDismissedAddedAt(lastAddedAt);
                }
              }}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Open Cart
            </button>
            <Link
              href="/cart"
              onClick={() => {
                if (lastAddedAt !== null) {
                  setDismissedAddedAt(lastAddedAt);
                }
              }}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View Full Page
            </Link>
          </div>
        </div>
    </div>
  );
}
