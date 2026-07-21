import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAST_ADDED_PREVIEW_DURATION_MS,
  getRemainingLastAddedPreviewMs,
  shouldShowLastAddedPreview,
} from '../lib/cart/lastAddedPreview.js';

const now = 10_000;
const freshEvent = {
  lastAddedAt: now,
  lastAddedEventId: 1,
  lastAddedPreviewDismissedEventId: null,
};

test('adding an item creates a fresh preview event that opens', () => {
  assert.equal(shouldShowLastAddedPreview(freshEvent, now + 1), true);
});

test('preview automatically becomes closed after the duration expires', () => {
  assert.equal(
    shouldShowLastAddedPreview(freshEvent, now + LAST_ADDED_PREVIEW_DURATION_MS + 1),
    false,
  );
  assert.equal(getRemainingLastAddedPreviewMs(freshEvent.lastAddedAt, now + LAST_ADDED_PREVIEW_DURATION_MS + 1), 0);
});

test('navigating or remounting after an event is acknowledged does not reopen it', () => {
  const acknowledgedEvent = {
    ...freshEvent,
    lastAddedPreviewDismissedEventId: freshEvent.lastAddedEventId,
  };

  assert.equal(shouldShowLastAddedPreview(acknowledgedEvent, now + 100), false);
  assert.equal(shouldShowLastAddedPreview(acknowledgedEvent, now + 200), false);
});

test('adding another item creates a new preview event normally', () => {
  const nextEvent = {
    lastAddedAt: now + 1_000,
    lastAddedEventId: 2,
    lastAddedPreviewDismissedEventId: 1,
  };

  assert.equal(shouldShowLastAddedPreview(nextEvent, now + 1_001), true);
});

test('an expired lastAddedAt does not open during hydration or later navigation', () => {
  assert.equal(shouldShowLastAddedPreview(freshEvent, now + 60_000), false);
});
