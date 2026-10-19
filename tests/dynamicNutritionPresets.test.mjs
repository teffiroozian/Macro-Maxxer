import test from "node:test";
import assert from "node:assert/strict";
import { getCalorieShortcuts, getProteinShortcuts, getMobileProteinShortcuts, getNutritionControlData, reconcileNutritionThresholds } from "../lib/menuSections/nutritionPresets.ts";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";

const values = (presets) => presets.map((preset) => preset.value);
test("protein shortcut bands cover low, medium, high and boundary values", () => {
  for (const [maximum, expected] of [
    [10, [undefined, 5]], [15, [undefined, 5, 10]], [20, [undefined, 5, 10, 15]],
    [30, [undefined, 10, 15, 20]], [40, [undefined, 10, 20, 30]], [50, [undefined, 20, 30, 40]],
    [60, [undefined, 20, 40, 50]], [80, [undefined, 20, 40, 60]], [100, [undefined, 25, 50, 75]],
    [150, [undefined, 50, 75, 100]], [151, [undefined, 50, 100, 150]],
  ]) assert.deepEqual(values(getProteinShortcuts(maximum)), expected, String(maximum));
  assert.deepEqual(values(getProteinShortcuts(0)), [undefined]);
  assert.deepEqual(values(getProteinShortcuts(100, 40)), [undefined, 25]);
});
test("calorie shortcut bands follow the specified maxima", () => {
  for (const [maximum, expected] of [
    [300, [undefined, 100, 200, 250]], [500, [undefined, 200, 300, 400]],
    [700, [undefined, 300, 500, 600]], [900, [undefined, 300, 500, 700]],
    [1200, [undefined, 400, 700, 1000]], [1600, [undefined, 500, 1000, 1500]],
    [2200, [undefined, 500, 1000, 1500]],
  ]) assert.deepEqual(values(getCalorieShortcuts(maximum)), expected, String(maximum));
});
test("outlier bands still provide three distinct in-range calorie shortcuts", () => {
  for (const ceiling of [20, 100, 250, 850]) {
    const numeric = values(getCalorieShortcuts(2200, ceiling)).slice(1);
    assert.equal(new Set(numeric).size, 3);
    assert.ok(numeric.every((value) => value >= 0 && value <= ceiling && value % 10 === 0));
  }
});
test("current category, size and variant rules define the distribution, without nutrition feedback loops", async () => {
  const restaurant = await getRestaurantData("starbucks");
  const items = getOfficialRankingItems(restaurant.items);
  const input = { items, filters: { categories: ["espresso drinks"] }, menuSizePreference: "Grande", rankingSort: "highest-protein", searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };
  const grande = getNutritionControlData(input);
  const venti = getNutritionControlData({ ...input, menuSizePreference: "Venti" });
  assert.notDeepEqual(grande.calories, venti.calories);
  const food = getNutritionControlData({ ...input, filters: { categories: ["breakfast"] } });
  assert.notDeepEqual(grande.proteins, food.proteins);
  const constrained = getNutritionControlData({ ...input, filters: { ...input.filters, caloriesMax: 0, proteinMin: 200, fiberMin: 100 } });
  assert.deepEqual(constrained, grande);
  const all = getNutritionControlData({ ...input, menuSizePreference: "all-sizes" });
  const grouped = getNutritionControlData({ ...input, menuSizePreference: "all-sizes", filters: { ...input.filters, showServingSizeVariants: false } });
  assert.ok(all.calories.length > grouped.calories.length);
});
test("threshold reconciliation preserves valid values and unrelated state", () => {
  const data = { calorieBounds: { min: 0, max: 850 }, proteinBounds: { min: 0, max: 40 }, maxProtein: 50 };
  const valid = { caloriesMax: 700, proteinMin: 20, categoryPreset: "custom", categories: ["breakfast"], fiberMin: 3 };
  assert.equal(reconcileNutritionThresholds(valid, data), valid);
  assert.equal(reconcileNutritionThresholds(valid, { ...data, eligibleCount: 0 }), valid);
  assert.deepEqual(reconcileNutritionThresholds({ ...valid, caloriesMax: 1500, proteinMin: 60 }, data), { ...valid, caloriesMax: 850, proteinMin: 40 });
  assert.equal(reconcileNutritionThresholds({ proteinMin: 10 }, { ...data, maxProtein: 0 }).proteinMin, undefined);
});


test("mobile protein shortcuts always provide Any and three distinct slider-compatible thresholds", () => {
  for (const maximum of [0, 1, 2, 3, 5, 10, 15, 20, 30, 40, 80, 150, 300]) {
    for (const displayMaximum of [10, 20, 40, 100, 300]) {
      const shortcuts = getMobileProteinShortcuts(maximum, displayMaximum);
      assert.equal(shortcuts.length, 4);
      assert.deepEqual(shortcuts[0], { label: "Any" });
      const numeric = values(shortcuts).slice(1);
      assert.equal(new Set(numeric).size, 3);
      assert.ok(numeric.every((value) => Number.isInteger(value) && value > 0 && value <= displayMaximum));
      assert.deepEqual(numeric, [...numeric].sort((a, b) => a - b));
      if (maximum >= 3) assert.ok(numeric.every((value) => value <= maximum));
    }
  }
  assert.deepEqual(values(getMobileProteinShortcuts(10, 10)), [undefined, 2, 5, 8]);
  assert.deepEqual(values(getMobileProteinShortcuts(40, 40)), [undefined, 10, 20, 30]);
  assert.deepEqual(values(getMobileProteinShortcuts(100, 40)), [undefined, 13, 27, 40]);
});
