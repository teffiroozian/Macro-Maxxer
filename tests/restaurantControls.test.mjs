import test from "node:test";
import assert from "node:assert/strict";

import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { sortItems } from "../lib/menuSections/sorting.ts";
import { SORT_OPTION_VALUES, getNaturalRankDirection, getRankState, toRankSort } from "../lib/menuSections/sortOptions.ts";

const selections = {
  "main-entrees": new Set(), breakfast: new Set(), shareables: new Set(), sides: new Set(), drinks: new Set(),
};

const items = [
  { id: "lean", name: "Lean", categories: ["Entrees"], servingType: "entree", nutrition: { calories: 200, protein: 30, carbs: 8, totalFat: 4, fiber: 3, sodium: 400, sugars: 2 } },
  { id: "large", name: "Large", categories: ["Sides"], servingType: "side", nutrition: { calories: 600, protein: 40, carbs: 70, totalFat: 20, sodium: 900 } },
];

test("rank state supports every metric and direction", () => {
  assert.deepEqual(getRankState(toRankSort("fat", "lowest")), { metric: "fat", direction: "lowest" });
  assert.equal(getNaturalRankDirection("calories"), "lowest");
  assert.equal(getNaturalRankDirection("protein-score"), "highest");
});

test("ranking handles protein score, carbs and fat", () => {
  assert.equal(sortItems(items, SORT_OPTION_VALUES.HIGHEST_PROTEIN_SCORE)[0].id, "lean");
  assert.equal(sortItems(items, SORT_OPTION_VALUES.HIGHEST_CARBS)[0].id, "large");
  assert.equal(sortItems(items, SORT_OPTION_VALUES.LOWEST_FAT)[0].id, "lean");
});

test("unified filters combine categories and nutrition", () => {
  const result = filterMenuItems({
    items,
    filters: { categories: ["entrees"], caloriesMax: 300, proteinMin: 20, proteinScoreMin: 9, carbsMax: 10, fatMax: 5, fiberMin: 2, sodiumMax: 500, sugarMax: 3 },
    searchTerms: [], rankedChildSelections: selections, isRankingView: false,
  });
  assert.deepEqual(result.map((item) => item.id), ["lean"]);
});

test("missing optional nutrition does not pass an active minimum", () => {
  const result = filterMenuItems({ items, filters: { fiberMin: 1 }, searchTerms: [], rankedChildSelections: selections, isRankingView: false });
  assert.deepEqual(result.map((item) => item.id), ["lean"]);
});
