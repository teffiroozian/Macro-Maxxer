"use client";

import { useEffect, type RefObject } from "react";

type UseDialogA11yOptions = {
  // Pass `false` (or a falsy `pendingState`) for dialogs that stay mounted
  // and toggle visibility rather than mount-on-open — the effect no-ops
  // until this is true, matching how the mount-on-open dialogs behave.
  isOpen: boolean;
  onClose: () => void;
  // Element to focus once the dialog opens (a specific button ref, e.g. the
  // "Cancel" action) so a keyboard/screen-reader user lands somewhere
  // sensible instead of at the top of the document.
  initialFocusRef?: RefObject<HTMLElement | null>;
  // Locks page scroll for the duration the dialog is open — only the
  // sheet-style dialogs (ExportOrderDialog, CartPreviewDrawer) need this;
  // the small centered confirm dialogs don't scroll the page underneath.
  lockBodyScroll?: boolean;
};

// Shared open/close behavior for every dialog, drawer, and sheet in the app:
// focus the initial element on open, close on Escape, and restore focus to
// whatever was focused before opening once it closes/unmounts. Previously
// duplicated near-verbatim across CartClearConfirmationDialog,
// CrossRestaurantCartDialog, InProgressBuildDialog, ExportOrderDialog,
// MobileNavDrawer, and ControlsRow's filters dialog.
export function useDialogA11y({
  isOpen,
  onClose,
  initialFocusRef,
  lockBodyScroll = false,
}: UseDialogA11yOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    initialFocusRef?.current?.focus();
    if (lockBodyScroll) {
      document.body.style.overflow = "hidden";
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose, initialFocusRef, lockBodyScroll]);
}
