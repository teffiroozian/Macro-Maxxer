export const LAST_ADDED_PREVIEW_DURATION_MS = 4500;

export function isLastAddedPreviewExpired(lastAddedAt, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  return lastAddedAt === null || now - lastAddedAt > durationMs;
}

export function shouldShowLastAddedPreview({
  lastAddedAt,
  lastAddedEventId,
  lastAddedPreviewDismissedEventId,
}, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  if (lastAddedAt === null || lastAddedEventId === null) return false;
  if (lastAddedPreviewDismissedEventId === lastAddedEventId) return false;
  return !isLastAddedPreviewExpired(lastAddedAt, now, durationMs);
}

export function getRemainingLastAddedPreviewMs(lastAddedAt, now, durationMs = LAST_ADDED_PREVIEW_DURATION_MS) {
  if (lastAddedAt === null) return 0;
  return Math.max(0, lastAddedAt + durationMs - now);
}
