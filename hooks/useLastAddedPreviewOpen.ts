"use client";

import { useEffect, useState } from "react";
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
  const { lastAddedAt, lastAddedEventId, lastAddedPreviewDismissedEventId } = useCart();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const isOpen = shouldShowLastAddedPreview(
    { lastAddedAt, lastAddedEventId, lastAddedPreviewDismissedEventId },
    currentTime,
    LAST_ADDED_PREVIEW_DURATION_MS,
  );

  useEffect(() => {
    if (lastAddedAt === null) return;

    const timeout = window.setTimeout(
      () => setCurrentTime(Date.now()),
      getRemainingLastAddedPreviewMs(lastAddedAt, Date.now(), LAST_ADDED_PREVIEW_DURATION_MS) + 50,
    );

    return () => window.clearTimeout(timeout);
  }, [lastAddedAt]);

  return isOpen;
}
