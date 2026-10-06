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

test("standard rankings use Filters categories without the retired ranking sidebar state", () => {
  const result = filterMenuItems({
    items,
    filters: {},
    searchTerms: [],
    rankedChildSelections: selections,
    isRankingView: true,
    filterRankingCategories: false,
  });

  assert.deepEqual(result.map((item) => item.id), ["lean", "large"]);
});

test("ranking presets constrain mixed-size cards by normalized serving type", () => {
  const mixedItem = {
    id: "nuggets",
    name: "Nuggets",
    categories: ["Chicken"],
    servingType: "entree",
    nutrition: { calories: 200, protein: 20, carbs: 10, totalFat: 5 },
    variants: [
      { id: "regular", label: "8 Ct", servingType: "entree", nutrition: { calories: 200, protein: 20, carbs: 10, totalFat: 5 } },
      { id: "party", label: "30 Ct", servingType: "shareable", nutrition: { calories: 700, protein: 70, carbs: 30, totalFat: 15 } },
    ],
  };
  const common = {
    items: [mixedItem],
    searchTerms: [],
    rankedChildSelections: selections,
    isRankingView: true,
    filterRankingCategories: false,
  };

  const main = filterMenuItems({ ...common, filters: { categories: ["chicken"], rankingGroups: ["main-entrees"] } });
  const shareables = filterMenuItems({ ...common, filters: { categories: ["chicken"], rankingGroups: ["shareables"] } });

  assert.deepEqual(main[0].variants.map((variant) => variant.id), ["regular"]);
  assert.deepEqual(shareables[0].variants.map((variant) => variant.id), ["party"]);
});

test("Chick-fil-A shareable sizes use catalog categories throughout filtering and ranking", async () => {
  const { readFile } = await import("node:fs/promises");
  const { isStandaloneMenuItem } = await import("../lib/menuItemCalculations.ts");
  const { countItemsByCategory, getVisibleVariants } = await import("../lib/menuSections/sorting.ts");
  const { getOfficialRankingItems } = await import("../lib/menuSections/ranking.ts");
  const { RESTAURANT_MAIN_MENU_CATEGORIES } = await import("../data/restaurantControlPresets.ts");
  const catalog = JSON.parse(await readFile(new URL("../data/restaurants/chick-fil-a/generated/restaurant.json", import.meta.url), "utf8"));
  const shareableIds = ["cfa-item-1006616", "cfa-item-1007846", "cfa-item-1009275", "cfa-item-1008141"];
  const visible = catalog.items.filter(isStandaloneMenuItem);
  const common = { items: visible, searchTerms: [], rankedChildSelections: selections, isRankingView: true, filterRankingCategories: false };
  const shareables = filterMenuItems({ ...common, filters: { categories: ["shareables"] } });
  assert.equal(countItemsByCategory(visible).shareables, 4);
  assert.deepEqual(shareables.flatMap((item) => item.variants.map((variant) => variant.id)).sort(), [...shareableIds].sort());
  for (const id of shareableIds) {
    assert.deepEqual(catalog.items.find((item) => item.id === id).categories, ["shareables"]);
    const parent = visible.find((item) => item.variants?.some((variant) => variant.id === id));
    assert.deepEqual(parent.variants.find((variant) => variant.id === id).categories, ["shareables"]);
    assert.ok(getVisibleVariants(parent, "shareables").some((variant) => variant.id === id));
  }
  const main = filterMenuItems({ ...common, filters: { categories: RESTAURANT_MAIN_MENU_CATEGORIES.chickfila } });
  assert.ok(main.flatMap((item) => item.variants ?? []).every((variant) => !shareableIds.includes(variant.id)));
  const all = filterMenuItems({ ...common, filters: {} });
  assert.ok(shareableIds.every((id) => all.some((item) => item.variants?.some((variant) => variant.id === id))));
  const rankedShareables = getOfficialRankingItems(shareables);
  assert.deepEqual(rankedShareables.map((item) => item.defaultVariantId).sort(), [...shareableIds].sort());
  const rankedAll = getOfficialRankingItems(all);
  assert.ok(shareableIds.every((id) => rankedAll.some((item) => item.defaultVariantId === id)));
  const ordinaryMenu = filterMenuItems({ ...common, isRankingView: false, filters: { categories: ["shareables"] } });
  assert.deepEqual(ordinaryMenu.map((item) => item.id), shareables.map((item) => item.id));
});
