"use client";

import { useEffect, useRef } from "react";
import { Pencil, ShoppingCart, Trash2, X } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";

export default function InProgressBuildDialog() {
  const { pendingNavigation, confirmAddToCart, confirmDiscardBuild, cancelPendingNavigation } =
    useBuildInProgressGuard();
  const keepEditingButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pendingNavigation) {
      return;
    }

    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    keepEditingButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        cancelPendingNavigation();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [pendingNavigation, cancelPendingNavigation]);

  if (!pendingNavigation) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-progress-build-dialog-title"
      aria-describedby="in-progress-build-dialog-description"
      className="fixed inset-0 z-[240] flex items-end justify-center bg-black/35 p-3 sm:items-center sm:p-4"
      onClick={cancelPendingNavigation}
    >
      <div
        className="relative w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={cancelPendingNavigation}
          aria-label="Close and keep editing"
          className="absolute right-4 top-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-900/5 hover:text-slate-600 active:bg-slate-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="pr-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Unfinished Build
          </p>
          <h2 id="in-progress-build-dialog-title" className="mt-2 text-xl font-bold text-slate-900">
            You have an unfinished build
          </h2>
          <p id="in-progress-build-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
            Leaving now will lose your current selections. Add your build to the cart, discard it, or keep editing.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <AppButton variant="primary" size="md" onClick={confirmAddToCart}>
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            Add to Cart
          </AppButton>
          <AppButton
            variant="secondary"
            size="md"
            onClick={confirmDiscardBuild}
            className="border-red-100 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200"
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            Leave and Discard Build
          </AppButton>
          <AppButton
            ref={keepEditingButtonRef}
            variant="secondary"
            size="md"
            onClick={cancelPendingNavigation}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
            Stay and Keep Editing
          </AppButton>
        </div>
      </div>
    </div>
  );
}
