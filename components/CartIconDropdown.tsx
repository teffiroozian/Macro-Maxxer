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

  const countValue = cartCount > 0
    ? countFormat === "parenthesized"
      ? ` (${cartCount})`
      : ` ${cartCount}`
    : "";

  const countLabel = (
    <>
      <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
      
      {countValue ? <span className="ml-1">({countValue})</span> : null}
    </>
  );

  const addonsLabel = lastAddedItem?.optionsLabel ?? "";
  const itemInitial = (lastAddedItem?.name?.trim().charAt(0) || "+").toUpperCase();
  const lastAddedMacros = lastAddedItem?.macrosPerItem;

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
              <>
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {lastAddedItem.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lastAddedItem.image}
                      alt={lastAddedItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="inline-flex h-full w-full items-center justify-center text-base font-semibold text-slate-600">
                      {itemInitial}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-base font-semibold leading-tight text-slate-900">
                    <span>{lastAddedItem.name}</span>
                    {lastAddedItem.variantLabel ? (
                      <>
                        <span className="mx-1.5">•</span>
                        <span>{lastAddedItem.variantLabel}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-none">
                    <p className="whitespace-nowrap text-slate-500">
                      Cal:<span className="ml-1 font-semibold text-slate-900">{lastAddedMacros?.calories ?? 0}</span>
                    </p>
                    <p className="whitespace-nowrap text-slate-500">
                      P:<span className="ml-1 font-semibold text-slate-900">{lastAddedMacros?.protein ?? 0}g</span>
                    </p>
                    <p className="whitespace-nowrap text-slate-500">
                      C:<span className="ml-1 font-semibold text-slate-900">{lastAddedMacros?.carbs ?? 0}g</span>
                    </p>
                    <p className="whitespace-nowrap text-slate-500">
                      F:<span className="ml-1 font-semibold text-slate-900">{lastAddedMacros?.fat ?? 0}g</span>
                    </p>
                  </div>
                  {addonsLabel ? <p className="line-clamp-1 text-xs text-slate-500">{addonsLabel}</p> : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Your cart is empty.</p>
            )}
            </div>
          </div>

          <div className="my-3 h-px bg-slate-200" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total Macros</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="px-1 py-1">
                <p className="text-xl font-bold leading-none text-slate-900">{totals.calories}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Calories</p>
              </div>
              <div className="px-1 py-1">
                <p className="text-xl font-bold leading-none text-[#c2410c]">{totals.protein}g</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Protein</p>
              </div>
              <div className="px-1 py-1">
                <p className="text-xl font-bold leading-none text-[#ca8a04]">{totals.carbs}g</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Carbs</p>
              </div>
              <div className="px-1 py-1">
                <p className="text-xl font-bold leading-none text-[#2563eb]">{totals.fat}g</p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Fat</p>
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
              View Cart
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
              View All Items
            </Link>
          </div>
        </div>
    </div>
  );
}
