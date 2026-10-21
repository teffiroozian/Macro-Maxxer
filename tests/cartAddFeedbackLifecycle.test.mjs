import test from "node:test";
import assert from "node:assert/strict";
import { __cartStoreTestUtils as cart } from "../stores/cartStore.ts";
import { shouldShowLastAddedPreview } from "../lib/cart/lastAddedPreview.js";

const item = { id: "added", itemId: "menu-item", restaurantId: "restaurant", name: "Added item", image: "/image.png", quantity: 1, macrosPerItem: { calories: 100, protein: 10, carbs: 10, totalFat: 5 } };
const originalNow = Date.now;
let now = 10000;
Date.now = () => now;
test.after(() => { Date.now = originalNow; });
test.beforeEach(() => { cart.resetCartState(); cart.resetPersistenceForTests(); now = 10000; });
function open() {
  const state = cart.getSnapshot();
  return shouldShowLastAddedPreview({ ...state, lastAddedItem: state.items.find((item) => item.id === state.lastAddedItemId) ?? null }, now);
}

test("successful add opens, dismissal clears feedback and stays closed until another actual add", () => {
  cart.addItem(item);
  assert.equal(open(), true);
  cart.dismissLastAddedPreview();
  assert.equal(open(), false);
  assert.equal(cart.getSnapshot().lastAddedItemId, null);
  assert.equal(cart.getSnapshot().lastAddedAt, null);
  now += 1000;
  cart.updateQuantity(item.id, 2); // ordinary cart changes cannot reopen feedback
  assert.equal(open(), false);
  cart.addItem(item);
  assert.equal(open(), true);
});

test("empty cart or removing the recently added item immediately clears feedback", () => {
  cart.addItem(item);
  cart.addItem({ ...item, id: "other" });
  cart.removeItem("other");
  assert.equal(open(), false);
  assert.equal(cart.getSnapshot().lastAddedItemId, null);
  assert.equal(cart.getSnapshot().items.length, 1);
  cart.addItem(item);
  cart.clearCart();
  assert.equal(open(), false);
  assert.equal(cart.getSnapshot().lastAddedAt, null);
  assert.equal(cart.getSnapshot().items.length, 0);
});

test("fresh event without a live feedback payload cannot open an empty or restored cart sheet", () => {
  cart.resetCartState({ items: [], lastAddedItemId: "missing", lastAddedAt: now, lastAddedEventId: 1 });
  assert.equal(open(), false);
  cart.resetCartState({ items: [item], lastAddedItemId: null, lastAddedAt: now, lastAddedEventId: 1 });
  assert.equal(open(), false);
  cart.resetCartState({ items: [item] }); // refresh/remount restores items, never feedback
  assert.equal(open(), false);
  cart.addItem({ ...item, quantity: 0 });
  assert.equal(open(), false);
});

test("invalidating a recently added quantity clears feedback without reopening", () => {
  cart.addItem(item);
  cart.updateItem(item.id, { quantity: 0 });
  assert.equal(open(), false);
  assert.equal(cart.getSnapshot().lastAddedItemId, null);
});

test("customization saves and non-add quantity edits cannot create fresh add feedback", () => {
  cart.addItem(item);
  cart.dismissLastAddedPreview();
  cart.updateItem(item.id, { name: "Edited item" }, { markAsJustAdded: true });
  assert.equal(open(), false);
  cart.updateQuantity(item.id, 1, { markAsJustAdded: true });
  assert.equal(open(), false);
  now += 100;
  cart.updateQuantity(item.id, 2, { markAsJustAdded: true });
  assert.equal(open(), true);
});
