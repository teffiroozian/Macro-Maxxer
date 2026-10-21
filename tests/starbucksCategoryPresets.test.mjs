import test from "node:test";
import assert from "node:assert/strict";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { getCategoryPresets, getSelectedCategoryPreset, selectCategoryPreset, selectCustomCategories } from "../lib/menuSections/categoryPresets.ts";
import { getMenuResultCounts } from "../lib/menuSections/resultCounts.ts";

const restaurant = await getRestaurantData("starbucks");
const items = getOfficialRankingItems(restaurant.items.filter((item) => !item.sourceOnly));
const presets = getCategoryPresets(items, "starbucks");
const expected = {
  main: ["breakfast", "lunch", "snacks", "bakery & treats", "protein drinks"],
  food: ["breakfast", "lunch", "snacks", "bakery & treats"],
  drinks: ["protein drinks", "frappuccino", "hot coffee", "iced coffee", "espresso drinks", "tea & chai", "matcha", "refreshers", "other drinks"],
  coffee: ["hot coffee", "iced coffee", "espresso drinks"],
  matcha: ["matcha"],
  refreshers: ["refreshers"],
  sweets: ["bakery & treats"],
};
test("Starbucks owns its ordered chip definitions and exact normalized category mappings", () => {
  assert.deepEqual(presets.map((preset) => preset.label), ["Main menu", "Food", "Drinks", "Coffee", "Matcha", "Refreshers", "Sweets", "All items"]);
  for (const [id, categories] of Object.entries(expected)) assert.deepEqual(presets.find((preset) => preset.id === id).ids, categories);
  assert.deepEqual(new Set(presets.find((preset) => preset.id === "all").ids), new Set(items.flatMap((item) => item.categories.map((category) => category.toLowerCase()))));
});
test("preset state, manual state and representative-size result counts stay consistent", () => {
  for (const preset of presets) {
    const selected = selectCategoryPreset({ proteinMin: 0 }, preset);
    assert.deepEqual(selected.categories, preset.ids);
    assert.equal(getSelectedCategoryPreset(selected, presets).id, preset.id);
    assert.equal(getSelectedCategoryPreset(selectCustomCategories(selected, preset.ids), presets), undefined);
    const counts = getMenuResultCounts({ items, filters: selected, menuSizePreference: "Grande", rankingSort: "highest-protein", searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false });
    assert.ok(counts.total > 0, preset.id);
    assert.equal(counts.matching, counts.total);
  }
});
test("other restaurants keep their preset rows and mappings with the renamed main label", async () => {
  for (const id of ["chickfila", "mcdonalds"]) {
    const data = await getRestaurantData(id);
    const configured = getCategoryPresets(getOfficialRankingItems(data.items.filter((item) => !item.sourceOnly)), id);
    assert.deepEqual(configured.map((preset) => preset.label), ["Main menu", "Sides", "Drinks", "Shareables", "Sauces", "All items"]);
    assert.deepEqual(configured.find((preset) => preset.id === "sauces").ids, id === "mcdonalds" ? ["sauces & condiments"] : ["sauces"]);
  }
});
