"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/stores/cartStore";
import { useRestaurantUi } from "@/components/RestaurantUiContext";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import CartItemPreviewRow from "@/components/CartItemPreviewRow";
import { ShoppingCart } from "lucide-react";

type CartIconDropdownProps = {
  buttonClassName: string;
};

const SCROLL_CLOSE_THRESHOLD = 90;

export default function CartIconDropdown({
  buttonClassName,
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
      {cartCount > 0 ? (
        <span
          className="ml-1 text-[13px] leading-none font-bold tabular-nums text-slate-900"
        >
          ({cartCount})
        </span>
      ) : null}
    </>
  );

  const addonsLabel = lastAddedItem?.optionsLabel ?? "";

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
          <div className="p-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Just added
            </p>
            <div className="mt-3 flex items-center gap-3">
            {lastAddedItem ? (
              <CartItemPreviewRow
                item={lastAddedItem}
                imageRenderer="native-img"
                imageFallback="initial"
                variantStyle="separate"
                macroStyle="compact"
                customizationsText={addonsLabel}
                customizationsLineClamp={1}
              />
            ) : (
              <p className="text-sm text-slate-600">Your cart is empty.</p>
            )}
            </div>
          </div>

          <div className="my-3 h-px bg-slate-200" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total Macros</p>
            <MacroTotalsGrid macros={totals} size="compact" className="mt-3" />
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
              className="cursor-pointer inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              View Cart
            </button>
            <Link
              href="/cart"
              onClick={() => {
                if (lastAddedAt !== null) {
                  setDismissedAddedAt(lastAddedAt);
                }
              }}
              className="cursor-pointer inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View All Items
            </Link>
          </div>
        </div>
    </div>
  );
}
