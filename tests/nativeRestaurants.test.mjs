import test from "node:test";
import assert from "node:assert/strict";
import { formatViewedAgo } from "../lib/restaurants/formatViewedAgo.ts";
import { addNativeRecentRestaurant, readNativeRecentRestaurants, NATIVE_RECENT_RESTAURANTS_KEY } from "../lib/restaurants/nativeRecentRestaurants.ts";
const storage = new Map();
globalThis.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } };

test("formatViewedAgo labels", () => {
  const now = new Date(2026, 9, 20, 15, 0, 0).getTime();
  assert.equal(formatViewedAgo(now - 30000, now), "Just now");
  assert.equal(formatViewedAgo(now - 5 * 60000, now), "5m ago");
  assert.equal(formatViewedAgo(now - 2 * 3600000, now), "2h ago");
  assert.equal(formatViewedAgo(new Date(2026, 9, 19, 9).getTime(), now), "Yesterday");
  assert.equal(formatViewedAgo(new Date(2026, 9, 17, 9).getTime(), now), "3d ago");
  assert.equal(formatViewedAgo(new Date(2026, 9, 4, 9).getTime(), now), "Oct 4");
});

test("recent restaurants dedupe, cap and seed", () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addNativeRecentRestaurant(list, `r${i}`, i);
  assert.equal(list.length, 10);
  assert.equal(list[0].id, "r11");
  list = addNativeRecentRestaurant(list, "r5", 99);
  assert.equal(list[0].id, "r5");
  assert.equal(list.filter(e => e.id === "r5").length, 1);
  storage.clear();
  storage.set("recentlySearchedRestaurants", '["a","b"]');
  assert.deepEqual(readNativeRecentRestaurants(), [{ id: "a", viewedAt: null }, { id: "b", viewedAt: null }]);
  storage.set(NATIVE_RECENT_RESTAURANTS_KEY, "[]");
  assert.deepEqual(readNativeRecentRestaurants(), []);
});
