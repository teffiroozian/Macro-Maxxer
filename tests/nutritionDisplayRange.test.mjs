import test from "node:test";
import assert from "node:assert/strict";
import { getPercentileDisplayBounds, getNutritionDisplayData, buildNutritionHistogram } from "../lib/menuSections/nutritionDisplayRange.ts";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";

const item = (id, calories, protein) => ({ id, name: id, image: "/image.png", categories: ["entrees"], servingType: "entree", nutrition: { calories, protein, carbs: 10, totalFat: 5 } });

test("nearest-rank percentile rounds upward and does not follow rare extreme values", () => {
  assert.deepEqual(getPercentileDisplayBounds([...Array(19).fill(510), 2210], 100), { min: 0, max: 600 });
  assert.deepEqual(getPercentileDisplayBounds([...Array(19).fill(41), 100], 10), { min: 0, max: 50 });
  assert.deepEqual(getPercentileDisplayBounds([NaN, Infinity], 100), { min: 0, max: 100 });
});

test("histogram retains outliers in its final bucket without changing the domain", () => {
  const buckets = buildNutritionHistogram([0, 100, 499, 500, 2210], { min: 0, max: 500 });
  assert.equal(buckets.reduce((sum, count) => sum + count, 0), 5);
  assert.equal(buckets[19], 3);
  assert.equal(buckets[0], 1);
});

test("display bounds are independent of category selection and filtering still uses actual nutrition", () => {
  const catalog = [...Array.from({ length: 19 }, (_, index) => item(`${index}`, 510, 41)), item("outlier", 2210, 100), { ...item("internal", 9000, 900), sourceOnly: true }];
  const snapshot = structuredClone(catalog);
  const display = getNutritionDisplayData(catalog);
  assert.deepEqual(display.calorieBounds, { min: 0, max: 600 });
  assert.deepEqual(display.proteinBounds, { min: 0, max: 50 });
  const rows = getOfficialRankingItems(catalog.filter((candidate) => !candidate.sourceOnly));
  const common = { items: rows, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };
  assert.equal(filterMenuItems({ ...common, filters: {} }).length, 20); // Any retains outliers
  assert.equal(filterMenuItems({ ...common, filters: { caloriesMax: display.calorieBounds.max } }).length, 19);
  assert.deepEqual(filterMenuItems({ ...common, filters: { proteinMin: display.proteinBounds.max } }).map((candidate) => candidate.id), ["outlier"]);
  filterMenuItems({ ...common, filters: { categories: [] } });
  assert.deepEqual(getNutritionDisplayData(catalog), display);
  assert.deepEqual(catalog, snapshot);
});

test("Chick-fil-A range uses all official variants, excludes internal records and includes overflow", async () => {
  const restaurant = await getRestaurantData("chickfila");
  const display = getNutritionDisplayData(restaurant.items);
  assert.deepEqual(getNutritionDisplayData(getOfficialRankingItems(restaurant.items.filter((candidate) => !candidate.sourceOnly))), display);
  assert.equal(display.calorieBounds.max % 100, 0);
  assert.equal(display.proteinBounds.max % 10, 0);
  assert.ok(display.calorieBounds.max < Math.max(...display.calories));
  assert.ok(display.proteinBounds.max < Math.max(...display.proteins));
  assert.equal(buildNutritionHistogram(display.calories, display.calorieBounds).reduce((sum, count) => sum + count, 0), display.calories.length);
});

test("active-category calories use their own percentile plus approximately one histogram bin of headroom", async () => {
  const { getActiveCategoryCalorieData } = await import("../lib/menuSections/nutritionDisplayRange.ts");
  const main = [...Array.from({ length: 19 }, (_, index) => item(`main-${index}`, 760, 30)), item("main-outlier", 2600, 100)];
  const shareables = [...Array.from({ length: 19 }, (_, index) => ({ ...item(`shareable-${index}`, 1280, 80), categories: ["shareables"] })), { ...item("shareable-outlier", 6000, 200), categories: ["shareables"] }];
  const catalog = [...main, ...shareables];
  const selected = getActiveCategoryCalorieData(catalog, ["entrees"]);
  assert.equal(selected.calorieBounds.max, 800);
  assert.equal(selected.calories.length, 20);
  assert.equal(getActiveCategoryCalorieData(catalog, ["shareables"]).calorieBounds.max, 1350);
  assert.equal(getActiveCategoryCalorieData(catalog).calories.length, 40);
  assert.equal(buildNutritionHistogram(selected.calories, selected.calorieBounds).reduce((sum, count) => sum + count, 0), 20);
  assert.equal(buildNutritionHistogram(selected.calories, selected.calorieBounds)[19], 20);
  assert.equal(getActiveCategoryCalorieData(catalog, []).calorieBounds.max, 10);
  assert.equal(getActiveCategoryCalorieData([item("zero", 0, 0)]).calorieBounds.max, 10);
});

test("calorie ceiling leaves approximately one bin after the useful maximum on a continuous range", async () => {
  const { getActiveCategoryCalorieData } = await import("../lib/menuSections/nutritionDisplayRange.ts");
  for (const [usefulMaximum, ceiling] of [[760, 800], [765, 820], [812, 870]]) {
    const catalog = Array.from({ length: 20 }, (_, index) => item(`${index}`, usefulMaximum, 30));
    const bounds = getActiveCategoryCalorieData(catalog).calorieBounds;
    assert.deepEqual(bounds, { min: 0, max: ceiling });
    const common = { items: catalog, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };
    assert.equal(filterMenuItems({ ...common, filters: { caloriesMax: ceiling } }).length, 20);
    assert.equal(filterMenuItems({ ...common, filters: { caloriesMax: usefulMaximum - 10 } }).length, 0);
    assert.equal(filterMenuItems({ ...common, items: [...catalog, item("outlier", 5000, 100)], filters: {} }).length, 21);
  }
});

test("histogram emphasis follows maximum/minimum thresholds and keeps Any fully emphasized", async () => {
  const { isNutritionHistogramBinIncluded } = await import("../lib/menuSections/nutritionDisplayRange.ts");
  const bounds = { min: 0, max: 800 }; // 40 units per bin
  assert.equal(isNutritionHistogramBinIncluded(9, bounds, 400, false), true);
  assert.equal(isNutritionHistogramBinIncluded(11, bounds, 400, false), false);
  assert.equal(isNutritionHistogramBinIncluded(8, bounds, 400, true), false);
  assert.equal(isNutritionHistogramBinIncluded(10, bounds, 400, true), true);
  // Boundary/overlapping bins remain visible as included; overflow can
  // contain items meeting a minimum even above the numeric display ceiling.
  assert.equal(isNutritionHistogramBinIncluded(10, bounds, 400, false), true);
  assert.equal(isNutritionHistogramBinIncluded(19, bounds, 900, true), true);
  for (let index = 0; index < 20; index++) {
    assert.equal(isNutritionHistogramBinIncluded(index, bounds, undefined, true), true);
    assert.equal(isNutritionHistogramBinIncluded(index, bounds, undefined, false), true);
  }
});

test("overflow and threshold-straddling bars use their actual samples for emphasis", async () => {
  const { getNutritionHistogramBinInclusion } = await import("../lib/menuSections/nutritionDisplayRange.ts");
  const bounds = { min: 0, max: 800 };
  assert.equal(getNutritionHistogramBinInclusion([2600], bounds, 800, false)[19], false);
  assert.equal(getNutritionHistogramBinInclusion([780, 2600], bounds, 800, false)[19], true);
  assert.equal(getNutritionHistogramBinInclusion([15], bounds, 30, true)[0], false);
  assert.equal(getNutritionHistogramBinInclusion([15, 35], bounds, 30, true)[0], true);
});
