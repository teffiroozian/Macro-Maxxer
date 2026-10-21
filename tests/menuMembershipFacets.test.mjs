import test from "node:test";
import assert from "node:assert/strict";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { getCategoryPresets, selectCategoryPreset, selectCustomCategories } from "../lib/menuSections/categoryPresets.ts";
import { getMenuCategoryFacets, getMenuResultCounts } from "../lib/menuSections/resultCounts.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { matchesMenuMembership } from "../lib/menuSections/memberships.ts";

const restaurant = await getRestaurantData("starbucks");
const items = getOfficialRankingItems(restaurant.items.filter((item) => !item.sourceOnly));
const context = { items, filters: {}, menuSizePreference: "Grande", rankingSort: "highest-protein", searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };

test("primary categories remain singular while classification tags span categories", () => {
  assert.ok(restaurant.items.every((item) => item.category && item.categories.length === 1));
  const proteinMatcha = restaurant.items.find((item) => item.name === "Iced Protein Matcha");
  assert.equal(proteinMatcha.category, "Protein Drinks");
  assert.deepEqual(proteinMatcha.categories, ["Protein Drinks"]);
  assert.ok(proteinMatcha.tags.includes("matcha"));
  assert.ok(proteinMatcha.tags.includes("protein"));
  assert.equal(matchesMenuMembership({ category: "Breakfast", tags: ["offer"] }, [], ["offer"]), true);
  assert.equal(matchesMenuMembership({ category: "Lunch", tags: ["offer"] }, ["breakfast"], ["offer"]), true);
  assert.equal(matchesMenuMembership({ category: "Lunch", tags: [] }, ["breakfast"], ["offer"]), false);
});

test("Matcha combines its primary category and cross-category tag without selecting all Protein Drinks", () => {
  const preset = getCategoryPresets(items, "starbucks").find((preset) => preset.id === "matcha");
  assert.deepEqual(preset.ids, ["matcha"]);
  assert.deepEqual(preset.tags, ["matcha"]);
  const filters = selectCategoryPreset({}, preset);
  const selected = filterMenuItems({ ...context, filters });
  assert.ok(selected.some((item) => item.name === "Iced Protein Matcha"));
  assert.ok(selected.some((item) => item.category === "Frappuccino"));
  assert.ok(selected.every((item) => item.category === "Matcha" || item.tags.includes("matcha")));
  assert.equal(selected.length, 20);
  const counts = getMenuResultCounts({ ...context, filters });
  assert.equal(counts.matching, selected.length);
  assert.equal(counts.total, selected.length);
  const manual = selectCustomCategories(filters, ["matcha"]);
  assert.equal(manual.categoryTags, undefined);
  assert.ok(filterMenuItems({ ...context, filters: manual }).every((item) => item.category === "Matcha"));
  assert.equal(filterMenuItems({ ...context, filters: selectCustomCategories(filters, []) }).length, 0);
});

test("facets apply size and variant rules but ignore their own checkbox/tag selection", () => {
  for (const size of ["Tall", "Grande", "Venti"]) {
    const facets = getMenuCategoryFacets({ ...context, menuSizePreference: size, filters: { categories: ["breakfast"] } });
    assert.equal(facets.counts.get("iced coffee"), 15);
    const empty = getMenuCategoryFacets({ ...context, menuSizePreference: size, filters: { categories: [], categoryTags: ["matcha"] } });
    assert.deepEqual(empty.counts, facets.counts);
    const selected = getMenuResultCounts({ ...context, menuSizePreference: size, filters: { categories: ["iced coffee"] } });
    assert.equal(selected.matching, facets.counts.get("iced coffee"));
  }
  const all = getMenuCategoryFacets({ ...context, menuSizePreference: "all-sizes" });
  assert.equal(all.counts.get("iced coffee"), 50);
  const grouped = getMenuCategoryFacets({ ...context, menuSizePreference: "all-sizes", filters: { showServingSizeVariants: false } });
  assert.equal(grouped.counts.get("iced coffee"), 15);
  const constrained = getMenuCategoryFacets({ ...context, filters: { proteinMin: 20, categories: [] } });
  assert.ok(constrained.universe.every((item) => item.nutrition.protein >= 20));
});
