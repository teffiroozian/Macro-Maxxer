"use client";

import { useEffect, useRef } from "react";
import AppButton from "@/components/ui/AppButton";

type CartClearConfirmationDialogProps = {
  itemCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CartClearConfirmationDialog({
  itemCount,
  onCancel,
  onConfirm,
}: CartClearConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    cancelButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-cart-dialog-title"
      aria-describedby="clear-cart-dialog-description"
      className="fixed inset-0 z-[240] flex items-end justify-center bg-black/35 p-3 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Clear Cart
        </p>
        <h2 id="clear-cart-dialog-title" className="mt-2 text-xl font-bold text-slate-900">
          Remove all cart items?
        </h2>
        <p id="clear-cart-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
          This will remove all {itemCount} {itemCount === 1 ? "item" : "items"} from your cart. You can cancel to keep your cart unchanged.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <AppButton ref={cancelButtonRef} variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            size="md"
            onClick={onConfirm}
            className="border-red-600 bg-red-600 hover:bg-red-700 active:bg-red-800"
          >
            Clear Cart
          </AppButton>
        </div>
      </div>
    </div>
  );
}
