import { useEffect } from "react";

// Shared by GlobalSearchOverlay (mobile) and DesktopSearchDropdown (desktop) —
// the one piece of open/close behavior that's genuinely identical between them.
export function useCloseOnEscape(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);
}
