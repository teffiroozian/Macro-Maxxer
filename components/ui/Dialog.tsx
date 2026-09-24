"use client";

import type { ReactNode, RefObject } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";

type DialogProps = {
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  // Widens the panel past the confirm-dialog default (420px) for dialogs
  // that need more room (e.g. a longer options list) without giving up the
  // shared overlay/panel chrome and open/close behavior.
  panelClassName?: string;
};

// Canonical small/centered dialog shell (Design System PDF "Dialog"):
// fixed overlay-scrim backdrop, bottom sheet on mobile / centered on sm+,
// a rounded white panel, and the shared open/close a11y behavior from
// useDialogA11y. This is the exact structure previously duplicated across
// CartClearConfirmationDialog, CrossRestaurantCartDialog, and
// InProgressBuildDialog — use this instead of re-authoring that scaffold.
// For a full-height/custom-layout sheet (e.g. ExportOrderDialog) or a
// slide-in drawer (e.g. MobileNavDrawer, CartPreviewDrawer), keep the
// bespoke markup but still use useDialogA11y directly for the behavior.
export default function Dialog({
  onClose,
  titleId,
  descriptionId,
  initialFocusRef,
  children,
  panelClassName = "",
}: DialogProps) {
  useDialogA11y({ isOpen: true, onClose, initialFocusRef });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[var(--z-dialog)] flex items-end justify-center bg-overlay-scrim p-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-[420px] rounded-[24px] bg-white p-5 shadow-elev-modal ${panelClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
