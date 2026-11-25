import test from "node:test";
import assert from "node:assert/strict";
import { parseSavedItems, parseSavedMeals, serializeEntries } from "../lib/native/homeCollections.ts";
import {
  ALL_RESTAURANTS, changeMeal, changeSavedItem, cleanMealName, copyItems, createMeal, duplicateMeal, groupOrders, itemCount, mealMeta,
  narrowItems, narrowMeals, narrowOrders, savedRestaurants,
} from "../lib/native/savedLibrary.ts";

const macros = { calories: 100, protein: 10, carbs: 5, totalFat: 2 };
const item = (id, restaurantId = "chickfila", extra = {}) => ({ id, restaurantId, itemId: id, name: `Item ${id}`, image: `/${id}.png`, quantity: 1, macrosPerItem: macros, nutritionPerItem: macros, selection: { type: "standard" }, ...extra });
const restaurants = [{ id: "chickfila", name: "Chick-fil-A" }, { id: "chipotle", name: "Chipotle" }, { id: "starbucks", name: "Starbucks" }];
const view = { query: "", restaurantId: ALL_RESTAURANTS, sort: "newest" };
const meals = [
  { id: "1", name: "Leg day", savedAt: 10, items: [item("a", "chipotle")] },
  { id: "2", name: "Split dinner", savedAt: 20, items: [item("b"), item("c", "chipotle")] },
];

test("saved items survive a round trip and bad storage", () => {
  for (const raw of [null, "bad", '{"version":9,"entries":[]}', '{"version":1,"entries":[{"id":"x","savedAt":1},{"id":"y","savedAt":1,"item":{"id":"z"}}]}']) assert.deepEqual(parseSavedItems(raw), []);
  const entries = [{ id: "old", savedAt: 1, item: item("a") }, { id: "new", savedAt: 2, item: item("b") }];
  assert.deepEqual(parseSavedItems(serializeEntries(entries)).map((e) => e.id), ["new", "old"]);
  assert.deepEqual(parseSavedMeals(serializeEntries(meals)).map((m) => m.id), ["2", "1"]);
});

test("filters by restaurant, searches names and contents, and sorts both ways", () => {
  const ids = (change) => narrowMeals(meals, { ...view, ...change }, restaurants).map((m) => m.id);
  assert.deepEqual(ids({}), ["2", "1"]);
  assert.deepEqual(ids({ sort: "oldest" }), ["1", "2"]);
  assert.deepEqual(ids({ restaurantId: "chickfila" }), ["2"]);
  assert.deepEqual(ids({ restaurantId: "chipotle" }), ["2", "1"]);
  assert.deepEqual(ids({ query: "leg" }), ["1"]);
  assert.deepEqual(ids({ query: "chick split" }), ["2"]);
  assert.deepEqual(ids({ query: "nope" }), []);
  const customized = [{ id: "1", savedAt: 1, item: item("a", "chickfila", { customizations: [{ action: "remove", kind: "ingredient", ingredientLabel: "Pickles" }] }) }];
  assert.equal(narrowItems(customized, { ...view, query: "pickles" }, restaurants).length, 1);
  assert.equal(narrowOrders([{ id: "1", placedAt: 1, items: [item("a")] }], { ...view, query: "item a" }, restaurants).length, 1);
});

test("only offers restaurants with something saved, in directory order", () => {
  assert.deepEqual(savedRestaurants(restaurants, meals, [], []).map((r) => r.id), ["chickfila", "chipotle"]);
  assert.deepEqual(savedRestaurants(restaurants, [], [], []), []);
});

test("history groups by month then day in the given order", () => {
  const at = (y, m, d, h) => new Date(y, m, d, h).getTime();
  const orders = [at(2026, 10, 22, 18), at(2026, 10, 22, 9), at(2026, 9, 31, 12), at(2025, 10, 22, 9)].map((placedAt, i) => ({ id: String(i), placedAt, items: [item("a")] }));
  const groups = groupOrders(orders, at(2026, 10, 24, 9));
  assert.deepEqual(groups.map((g) => g.label), ["November", "October", "November 2025"]);
  assert.deepEqual(groups[0].days.map((d) => [d.day, d.weekday, d.orders.length]), [["22", "Sun", 2]]);
  assert.deepEqual(groupOrders([...orders].reverse(), at(2026, 10, 24, 9)).map((g) => g.label), ["November 2025", "October", "November"]);
});

test("copies get fresh ids so they never merge or share state", () => {
  const source = [item("a")];
  const [copy] = copyItems(source);
  assert.notEqual(copy.id, "a");
  copy.nutritionPerItem.calories = 1;
  assert.equal(source[0].nutritionPerItem.calories, 100);
  const meal = createMeal("  Sunday   treat ", source, 5);
  assert.equal(meal.name, "Sunday treat");
  assert.notEqual(meal.items[0].id, "a");
});

test("duplicate, rename, edit and customize change only their own entry", () => {
  const next = duplicateMeal(meals, "2");
  assert.deepEqual(narrowMeals(next, view, restaurants).map((m) => m.name), ["Split dinner", "Split dinner copy", "Leg day"]);
  assert.equal(duplicateMeal(meals, "missing"), meals);
  assert.ok(duplicateMeal([{ ...meals[0], name: "x".repeat(40) }], "1")[1].name.length <= 40);
  assert.deepEqual(changeMeal(meals, "1", { name: "New" }).map((m) => m.name), ["New", "Split dinner"]);
  const [changed] = changeSavedItem([{ id: "s", savedAt: 1, item: item("a") }], "s", { quantity: 2, name: "Renamed" });
  assert.deepEqual([changed.item.id, changed.item.quantity, changed.item.name], ["a", 2, "Renamed"]);
  assert.equal(cleanMealName("   "), "");
  assert.equal(itemCount([item("a", "chickfila", { quantity: 2 }), item("b")]), 3);
  assert.equal(mealMeta(meals[1].items, restaurants), "2 restaurants, 2 items");
});
