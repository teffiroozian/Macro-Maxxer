import test from "node:test";
import assert from "node:assert/strict";
import { getCanonicalMenuItemCount } from "../lib/restaurantMenuCount.ts";
import { getAllRestaurantsWithMenuCounts, getRestaurantData } from "../lib/restaurants.ts";
import { loadSearchIndex } from "../lib/search/searchIndex.ts";
import { getOfficialRankingItems, selectRankingItems } from "../lib/menuSections/ranking.ts";
import { getCategoryPresets, getSelectedCategoryPreset, selectCategoryPreset, selectCustomCategories } from "../lib/menuSections/categoryPresets.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";

const macro = (calories, protein) => ({ calories, protein, carbs: 10, totalFat: 5 });
const family = {
  id: "family", name: "Family", image: "/image.png", categories: ["entrees"], servingType: "entree",
  defaultVariantId: "regular", nutrition: macro(200, 20),
  variants: [
    { id: "small", label: "4 ct", categories: ["entrees"], nutrition: macro(100, 10) },
    { id: "regular", label: "8 ct", categories: ["entrees"], nutrition: macro(200, 20) },
    { id: "large", label: "12 ct", categories: ["entrees"], nutrition: macro(300, 30) },
    { id: "recipe", label: "Spicy 8 ct", categories: ["entrees"], nutrition: macro(200, 20) },
    { id: "different-score", label: "16 ct", categories: ["entrees"], nutrition: macro(400, 48) },
  ],
};

test("canonical counts ignore internal records, duplicate IDs and variant expansion", () => {
  const items = [family, { ...family }, { ...family, id: "internal", sourceOnly: true }];
  assert.equal(getCanonicalMenuItemCount(items), 1);
  assert.equal(getCanonicalMenuItemCount(getOfficialRankingItems([family])), 1);
});

test("restaurant summaries, loaded metadata and search metadata share canonical counts", async () => {
  const summaries = await getAllRestaurantsWithMenuCounts();
  const search = await loadSearchIndex();
  for (const summary of summaries.filter((restaurant) => !restaurant.isComingSoon)) {
    const data = await getRestaurantData(summary.id);
    const expected = getCanonicalMenuItemCount(data.items);
    assert.equal(summary.menuItemCount, expected, summary.id);
    assert.equal(data.menuItemCount, expected, summary.id);
    assert.equal(search.find((entry) => entry.restaurant.id === summary.id).restaurant.menuItemCount, expected, summary.id);
  }
});

test("only Protein Score groups all serving sizes and prefers the catalog default", () => {
  const original = structuredClone(family);
  const rows = getOfficialRankingItems([family]);
  for (const metric of ["protein", "calories", "carbs", "fat"]) {
    for (const direction of ["highest", "lowest"]) assert.equal(selectRankingItems(rows, `${direction}-${metric}`).length, 5);
  }
  for (const sort of ["highest-protein-score", "lowest-protein-score"]) {
    assert.deepEqual(selectRankingItems(rows, sort).map((row) => row.defaultVariantId), ["regular", "recipe"]);
    const filtered = rows.filter((row) => row.defaultVariantId !== "regular");
    assert.equal(selectRankingItems(filtered, sort)[0].defaultVariantId, "small");
  }
  assert.deepEqual(family, original);
});

test("Protein Score grouping ignores score differences and preserves product families and component choices", () => {
  const rows = getOfficialRankingItems([family]);
  const closeScore = { ...rows[0], defaultVariantId: "near", variants: [{ ...rows[0].variants[0], id: "near", nutrition: macro(100, 40) }] };
  assert.equal(selectRankingItems([rows[0], closeScore], "highest-protein-score").length, 1);
  assert.equal(selectRankingItems([rows[0], { ...rows[1], id: "other-family" }], "highest-protein-score").length, 2);
  assert.equal(selectRankingItems(rows.map((row) => ({ ...row, variantGroupKind: "component" })), "highest-protein-score").length, 5);
  assert.equal(selectRankingItems([{ ...rows[0], nutrition: macro(0, 10), variants: [{ ...rows[0].variants[0], nutrition: macro(0, 10) }] }], "highest-protein-score").length, 1);
});

test("six category presets, Only and Clear all share category state without losing nutrition", async () => {
  const restaurant = await getRestaurantData("chickfila");
  const rows = getOfficialRankingItems(restaurant.items.filter((item) => !item.sourceOnly));
  const presets = getCategoryPresets(rows, "chickfila");
  assert.deepEqual(presets.map((preset) => preset.label), ["Main menu", "Sides", "Drinks", "Shareables", "Sauces", "All items"]);
  const byId = Object.fromEntries(presets.map((preset) => [preset.id, preset]));
  assert.deepEqual(byId.sauces.ids, ["sauces"]);
  assert.deepEqual(byId.shareables.ids, ["shareables"]);
  assert.ok(!byId.main.ids.includes("shareables"));
  let state = selectCategoryPreset({ proteinMin: 20, rankingGroups: ["drinks"] }, byId.main);
  assert.equal(getSelectedCategoryPreset(state, presets).id, "main");
  state = selectCustomCategories(state, ["sauces"]); // Only sauces
  assert.equal(state.categoryPreset, "custom");
  assert.deepEqual(state.categories, ["sauces"]);
  assert.equal(getSelectedCategoryPreset(state, presets), undefined); // remains Custom even though this matches a preset
  assert.equal(state.proteinMin, 20);
  assert.equal(state.rankingGroups, undefined);
  state = selectCustomCategories(state, []); // Clear all, category-only
  assert.equal(getSelectedCategoryPreset(state, presets), undefined);
  assert.deepEqual(state.categories, []);
  assert.equal(state.proteinMin, 20);
  assert.deepEqual(filterMenuItems({ items: rows, filters: state, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false }), []);
  state = selectCategoryPreset(state, byId.sauces);
  assert.equal(getSelectedCategoryPreset(state, presets).id, "sauces");
  const sauceRows = filterMenuItems({ items: rows, filters: { categories: state.categories }, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false });
  assert.ok(sauceRows.length > 0);
  assert.ok(sauceRows.every((row) => row.categories.map((category) => category.toLowerCase()).includes("sauces")));
  state = selectCategoryPreset(state, byId.all);
  assert.equal(getSelectedCategoryPreset(state, presets).id, "all");
  assert.deepEqual(new Set(state.categories), new Set(rows.flatMap((row) => row.categories.map((category) => category.toLowerCase()))));
  state = selectCustomCategories(state, state.categories.filter((category) => category !== "sauces"));
  assert.equal(getSelectedCategoryPreset(state, presets), undefined);
});

test("Protein Score filters evaluate the default representative instead of substituting another size", () => {
  const rows = getOfficialRankingItems([family]);
  const common = { items: rows, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };
  const score = filterMenuItems({ ...common, rankingSort: "highest-protein-score", filters: { proteinScoreMin: 11 } });
  assert.equal(score.length, 0); // default score is 10, even though a larger size scores 12
  const protein = filterMenuItems({ ...common, rankingSort: "highest-protein", filters: { proteinScoreMin: 11 } });
  assert.deepEqual(protein.map((row) => row.defaultVariantId), ["different-score"]);
});

test("switching an official detail variant recalculates its macros and score without changing the representative", async () => {
  const { getRestaurantItemRouteData } = await import("../lib/restaurantItemRouteData.ts");
  const { toItemSlug } = await import("../lib/restaurants.ts");
  const { resolveMenuItemVariantNutrition, getProteinPer100Calories } = await import("../lib/nutrition.ts");
  const restaurant = await getRestaurantData("chickfila");
  const nuggets = restaurant.items.find((item) => item.id === "cfa-group-100357");
  const snapshot = structuredClone(nuggets);
  const rows = getOfficialRankingItems([nuggets]);
  const candidate = selectRankingItems(rows, "highest-protein-score")[0];
  assert.equal(selectRankingItems(rows, "highest-protein-score").length, 1);
  assert.equal(candidate.defaultVariantId, nuggets.defaultVariantId);
  const detail = await getRestaurantItemRouteData("chickfila", toItemSlug(nuggets), candidate.defaultVariantId);
  assert.equal(detail.item.variants.length, nuggets.variants.length);
  const initial = detail.item.variants.find((variant) => variant.id === detail.initialVariantId);
  const alternate = detail.item.variants.find((variant) => variant.id === "cfa-item-1006616");
  const initialMacros = resolveMenuItemVariantNutrition(detail.item, initial);
  const switchedMacros = resolveMenuItemVariantNutrition(detail.item, alternate);
  assert.deepEqual(switchedMacros, alternate.nutrition);
  assert.notEqual(getProteinPer100Calories(initialMacros.protein, initialMacros.calories), getProteinPer100Calories(switchedMacros.protein, switchedMacros.calories));
  assert.deepEqual(selectRankingItems(rows, "highest-protein-score")[0], candidate);
  assert.deepEqual(nuggets, snapshot);
  const salad = restaurant.items.find((item) => item.id === "cfa-group-100466");
  assert.equal(selectRankingItems(getOfficialRankingItems([salad]), "highest-protein-score").length, salad.variants.length);
});
