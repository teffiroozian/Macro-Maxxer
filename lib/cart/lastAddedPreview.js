export const LAST_ADDED_PREVIEW_DURATION_MS = 4500;

export function isLastAddedPreviewExpired(lastAddedAt, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  return lastAddedAt === null || now - lastAddedAt >= durationMs;
}

export function shouldShowLastAddedPreview({
  lastAddedItem,
  lastAddedAt,
  lastAddedEventId,
  lastAddedPreviewDismissedEventId,
}, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  if (!lastAddedItem?.id || !Number.isFinite(lastAddedItem.quantity) || lastAddedItem.quantity <= 0) return false;
  if (!Number.isFinite(lastAddedAt) || !Number.isFinite(lastAddedEventId) || lastAddedEventId <= 0 || now < lastAddedAt) return false;
  if (lastAddedPreviewDismissedEventId === lastAddedEventId) return false;
  return !isLastAddedPreviewExpired(lastAddedAt, now, durationMs);
}

export function getRemainingLastAddedPreviewMs(lastAddedAt, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  if (lastAddedAt === null) return 0;
  return Math.max(0, lastAddedAt + durationMs - now);
}
