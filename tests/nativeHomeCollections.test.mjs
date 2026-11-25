import test from "node:test";
import assert from "node:assert/strict";
import { parseFavorites, parseOrderHistory, parseSavedMeals, toggleFavorite } from "../lib/native/homeCollections.ts";
import { formatOrderDate, orderItemNames, orderPhotos, orderPlaceName } from "../components/native/home/orderPresentation.ts";
import { getHomeExploreSpots } from "../lib/native/exploreSpots.ts";
import { getAllRestaurants } from "../lib/restaurants.ts";
const macros = { calories: 100, protein: 10, carbs: 5, totalFat: 2 };
const item = (id, restaurantId = "chickfila") => ({ id, restaurantId, itemId: id, name: `Item ${id}`, image: `/${id}.png`, quantity: 1, macrosPerItem: macros, nutritionPerItem: macros, selection: { type: "standard" } });
const store = (entries) => JSON.stringify({ version: 1, entries });

test("favorites tolerate bad storage, dedupe and toggle in order", () => {
  for (const raw of [null, "bad", "{}"]) assert.deepEqual(parseFavorites(raw), []);
  assert.deepEqual(parseFavorites('["a",1,"a","b",""]'), ["a", "b"]);
  assert.deepEqual(toggleFavorite(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleFavorite(["a", "b"], "a"), ["b"]);
});

test("saved meals and orders sort newest first and drop invalid records", () => {
  for (const raw of [null, "bad", '{"version":9,"entries":[]}']) {
    assert.deepEqual(parseSavedMeals(raw), []);
    assert.deepEqual(parseOrderHistory(raw), []);
  }
  assert.deepEqual(parseOrderHistory(store([{ id: "a", placedAt: 1, items: [item("x")] }, null, { id: "b", placedAt: 2, items: [item("y"), { id: "bad" }] }, { id: "c", placedAt: 3, items: [] }])).map((o) => [o.id, o.items.length]), [["b", 1], ["a", 1]]);
  assert.deepEqual(parseSavedMeals(store([{ id: "a", name: "Leg day", savedAt: 1, items: [item("x")] }, { id: "b", savedAt: 2, items: [item("y")] }])).map((m) => m.name), ["Leg day"]);
});

test("order cards show at most three photos, names, place and date", () => {
  const items = ["a", "b", "c", "d"].map((id) => item(id));
  assert.equal(orderPhotos(items).length, 3);
  assert.equal(orderPhotos([item("a"), item("a")]).length, 1);
  assert.equal(orderItemNames(items.slice(0, 2)), "Item a, Item b");
  assert.equal(orderPlaceName(items, [{ id: "chickfila", name: "Chick-fil-A" }]), "Chick-fil-A");
  assert.equal(orderPlaceName([item("a"), item("b", "chipotle")], []), "2 restaurants");
  assert.equal(formatOrderDate(new Date(2026, 10, 22).getTime(), new Date(2026, 10, 24).getTime()), "Nov 22");
});

test("explore has one photographed item per live restaurant", async () => {
  const live = getAllRestaurants().filter((r) => !r.isComingSoon);
  const spots = await getHomeExploreSpots(getAllRestaurants());
  assert.deepEqual(spots.map((s) => s.id), live.map((r) => r.id));
  assert.ok(spots.every((s) => s.image));
});
