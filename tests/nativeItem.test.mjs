import test from "node:test";
import assert from "node:assert/strict";
import { formatDelta, formatMacro, calorieShares, buildCustomizeGroups, buildMealAdjustments, changeCount, changeLabel, percentDV } from "../components/native/item/nativeItemModel.ts";

const n = (calories, protein = 0, carbs = 0, totalFat = 0) => ({ calories, protein, carbs, totalFat });
const tabs = [
  { id: "bun", label: "Bun", selectionMode: "single", ingredients: [
    { id: "white", label: "White Bun", icon: "w.png", nutrition: n(150), defaultCount: 1 },
    { id: "multi", label: "Multigrain", icon: "m.png", nutrition: n(180), defaultCount: 0 },
  ] },
  { id: "toppings", label: "Toppings", selectionMode: "quantity", ingredients: [
    { id: "pickles", label: "Pickles", icon: "p.png", nutrition: n(5), defaultCount: 1, maxQuantity: 2 },
    { id: "lettuce", label: "Lettuce", icon: "l.png", nutrition: n(2), defaultCount: 1, maxQuantity: 2 },
  ] },
];
const base = { tabs, item: { addonRefs: [] }, addons: undefined, selectedAddons: {}, sauceCounts: {}, baselineAddonNames: {}, baselineSauceCounts: {},
  baselineCounts: { white: 1, multi: 0, pickles: 1, lettuce: 1 } };

test("formatting", () => {
  assert.equal(formatMacro("calories", 1234.4), "1,234");
  assert.equal(formatMacro("protein", 45.2), "45g");
  assert.equal(formatDelta("calories", 820), "+820");
  assert.equal(formatDelta("protein", -5), "−5g");
  assert.equal(formatDelta("carbs", 0.2), "");
  assert.equal(percentDV(39, 78), "50%");
});

test("calorie shares sum to 100", () => {
  const s = calorieShares(n(500, 40, 50, 15));
  assert.equal(s.protein + s.carbs + s.totalFat, 100);
  assert.deepEqual(calorieShares(n(0)), { protein: 0, carbs: 0, totalFat: 0 });
});

test("customize groups report changes and zero-count rows keep macros shape", () => {
  const counts = { white: 0, multi: 1, pickles: 0, lettuce: 1 };
  const groups = buildCustomizeGroups({ ...base, ingredientCounts: counts });
  assert.equal(changeCount(groups), 2);
  assert.equal(changeLabel(2), "2 changes");
  assert.equal(changeLabel(0), "Standard preparation");
  const pickles = groups[1].rows.find(r => r.key === "pickles");
  assert.equal(pickles.control.count, 0);
  assert.equal(pickles.macros.calories, 0);
  assert.equal(groups[0].rows.find(r => r.key === "multi").control.selected, true);
  assert.equal(changeCount(buildCustomizeGroups({ ...base, ingredientCounts: { white: 1, multi: 0, pickles: 1, lettuce: 1 } })), 0);
});

test("meal adjustments split added and removed", () => {
  const adj = buildMealAdjustments({ ...base, ingredientCounts: { white: 0, multi: 1, pickles: 0, lettuce: 2 } });
  assert.equal(adj.added.find(r => r.key === "multi").macros.calories, 30);
  assert.equal(adj.added.find(r => r.key === "lettuce").macros.calories, 2);
  assert.equal(adj.removed.find(r => r.key === "pickles").macros.calories, -5);
});
