import test from "node:test";
import assert from "node:assert/strict";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getCanonicalMenuItemCount } from "../lib/restaurantMenuCount.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { getMenuResultCounts } from "../lib/menuSections/resultCounts.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { getCategoryPresets, selectCategoryPreset } from "../lib/menuSections/categoryPresets.ts";

for (const id of ["mcdonalds", "chickfila", "starbucks"]) {
  test(`${id}: category-scoped counts agree with rendered candidates and respond to variant/nutrition filters`, async () => {
    const restaurant = await getRestaurantData(id);
    const items = getOfficialRankingItems(restaurant.items.filter((item) => !item.sourceOnly));
    const presets = getCategoryPresets(items, id);
    const filters = selectCategoryPreset({}, presets.find((preset) => preset.id === "main"));
    const input = { items, filters, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };
    const count = getMenuResultCounts(input);
    assert.equal(count.matching, filterMenuItems(input).length);
    assert.equal(count.total, count.matching);
    const grouped = getMenuResultCounts({ ...input, filters: { ...filters, showServingSizeVariants: false } });
    assert.ok(grouped.total < count.total);
    const numeric = getMenuResultCounts({ ...input, filters: { ...filters, caloriesMax: 0 } });
    assert.equal(numeric.total, count.total);
    assert.ok(numeric.matching < numeric.total);
    assert.equal(getCanonicalMenuItemCount(restaurant.items), restaurant.menuItemCount);
    const empty = getMenuResultCounts({ ...input, filters: { ...filters, categories: [] } });
    assert.deepEqual(empty, { matching: 0, total: 0 });
    const allGrouped = getMenuResultCounts({ ...input, filters: { showServingSizeVariants: false, showRecipeVariants: false } });
    assert.equal(allGrouped.total, restaurant.menuItemCount);
    if (id === "mcdonalds") {
      assert.equal(restaurant.menuItemCount, 133);
      assert.equal(count.total, 46);
      const score = getMenuResultCounts({ ...input, filters: {}, rankingSort: "highest-protein-score" });
      assert.equal(score.total, 134); // one legitimate regional milk distinction
    }
  });
}

test("result counts exclude internal records and duplicate candidate identities", () => {
  const row = { id: "parent", name: "Item", image: "/image.png", categories: ["entrees"], servingType: "entree", nutrition: { calories: 100, protein: 10, carbs: 10, totalFat: 5 } };
  const input = { items: [row, row, { ...row, id: "internal", sourceOnly: true }], filters: {}, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };
  assert.deepEqual(getMenuResultCounts(input), { matching: 1, total: 1 });
});

test("Extra Small and Kids are size dimensions, while regional/recipe labels remain separate", async () => {
  const restaurant = await getRestaurantData("mcdonalds");
  for (const id of ["mcd-item-200066", "mcd-item-200611"]) {
    const parent = restaurant.items.find((item) => item.id === id);
    const items = getOfficialRankingItems([parent]);
    const result = getMenuResultCounts({ items, filters: {}, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein-score" });
    assert.equal(result.total, 1);
  }
});
