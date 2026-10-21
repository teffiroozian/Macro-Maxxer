"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/stores/cartStore";
import {
  getRemainingLastAddedPreviewMs,
  LAST_ADDED_PREVIEW_DURATION_MS,
  shouldShowLastAddedPreview,
} from "@/lib/cart/lastAddedPreview";

// Single source of truth for "is the Just Added preview currently open" —
// shared by CartIconDropdown (which renders it) and anything else that needs
// to react to its open state (e.g. hiding another fixed surface underneath
// it while it's up). Re-evaluates on a timer so the result flips back to
// `false` on its own once the preview auto-dismisses, not just when the
// store's dismissed-event-id changes.
export function useLastAddedPreviewOpen() {
  const { lastAddedItem, lastAddedAt, lastAddedEventId, lastAddedPreviewDismissedEventId, dismissLastAddedPreview } = useCart();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const isOpen = shouldShowLastAddedPreview(
    { lastAddedItem, lastAddedAt, lastAddedEventId, lastAddedPreviewDismissedEventId },
    Math.max(currentTime, lastAddedAt ?? currentTime),
    LAST_ADDED_PREVIEW_DURATION_MS,
  );

  useEffect(() => {
    if (lastAddedAt === null) return;

    const timeout = window.setTimeout(
      () => { dismissLastAddedPreview(); setCurrentTime(Date.now()); },
      getRemainingLastAddedPreviewMs(lastAddedAt, Date.now(), LAST_ADDED_PREVIEW_DURATION_MS) + 50,
    );

    return () => window.clearTimeout(timeout);
  }, [lastAddedAt, lastAddedEventId, dismissLastAddedPreview]);

  useEffect(() => {
    if (previousPath.current !== pathname) dismissLastAddedPreview();
    previousPath.current = pathname;
  }, [pathname, dismissLastAddedPreview]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const changed = () => dismissLastAddedPreview();
    desktop.addEventListener("change", changed);
    return () => desktop.removeEventListener("change", changed);
  }, [dismissLastAddedPreview]);

  return isOpen;
}
