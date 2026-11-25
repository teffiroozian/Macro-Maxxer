import test from "node:test";
import assert from "node:assert/strict";
import { parseOrderHistory, serializeEntries } from "../lib/native/homeCollections.ts";
import { createOrder, factRows, findMatchingMeal, restoreLine, restoreOrder } from "../lib/native/orderWorkspace.ts";
import { createMeal } from "../lib/native/savedLibrary.ts";

const macros = { calories: 100, protein: 10, carbs: 5, totalFat: 2 };
const item = (id, extra = {}) => ({ id, restaurantId: "chickfila", itemId: id, name: `Item ${id}`, image: `/${id}.png`, quantity: 1, macrosPerItem: macros, nutritionPerItem: macros, selection: { type: "standard" }, ...extra });

test("a finished order reads back in the shape Home and Saved use", () => {
  const order = createOrder([item("a", { quantity: 2 })], 50);
  const [stored] = parseOrderHistory(serializeEntries([order]));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(order)));
  assert.equal(stored.placedAt, 50);
  assert.equal(stored.items[0].quantity, 2);
  assert.notEqual(stored.items[0].id, "a");
});

test("a saved order is recognised until it changes", () => {
  const order = [item("a"), item("b", { selection: { variantId: "lg", type: "standard", variantLabel: undefined } })];
  const meals = [createMeal("Lunch", [order[1], order[0]])];
  assert.equal(findMatchingMeal(meals, order)?.name, "Lunch");
  assert.equal(findMatchingMeal(meals, [order[0], { ...order[1], quantity: 2 }]), undefined);
  assert.equal(findMatchingMeal(meals, [order[0]]), undefined);
  assert.equal(findMatchingMeal(meals, [order[0], { ...order[1], customizations: [{ action: "remove", ingredientId: "x" }] }]), undefined);
  assert.equal(findMatchingMeal([], []), undefined);
});

test("undo restores lines without losing later changes", () => {
  const [a, b, c] = ["a", "b", "c"].map((id) => item(id));
  assert.deepEqual(restoreLine([a, { ...c, quantity: 4 }], b, 1).map((i) => [i.id, i.quantity]), [["a", 1], ["b", 1], ["c", 4]]);
  assert.deepEqual(restoreLine([a, b], b, 1).map((i) => i.id), ["a", "b"]);
  assert.deepEqual(restoreOrder([c, a], [a, b]).map((i) => i.id), ["a", "b", "c"]);
});

test("nutrition facts list the whole label", () => {
  const rows = factRows({ calories: 980, protein: 117, carbs: 52.04, totalFat: 33.5, sodium: 2285.4, fiber: 14 });
  assert.deepEqual(rows.map((r) => r.label), ["Total fat", "Saturated fat", "Trans fat", "Cholesterol", "Sodium", "Total carbohydrate", "Dietary fiber", "Total sugars", "Protein"]);
  const by = Object.fromEntries(rows.map((r) => [r.key, [r.value, r.daily]]));
  assert.deepEqual(by.totalFat, ["33.5g", "43%"]);
  assert.deepEqual(by.sodium, ["2,285mg", "99%"]);
  assert.deepEqual(by.carbs, ["52g", "19%"]);
  assert.deepEqual(by.satFat, ["—", ""]);
  assert.deepEqual(by.transFat, ["—", ""]);
});
