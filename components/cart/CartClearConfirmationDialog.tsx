"use client";

import { useRef } from "react";
import AppButton from "@/components/ui/AppButton";
import Dialog from "@/components/ui/Dialog";

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

  return (
    <Dialog
      onClose={onCancel}
      titleId="clear-cart-dialog-title"
      descriptionId="clear-cart-dialog-description"
      initialFocusRef={cancelButtonRef}
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
    </Dialog>
  );
}
