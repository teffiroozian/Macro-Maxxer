import test from "node:test";
import assert from "node:assert/strict";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { getCategoryPresets, selectCategoryPreset, selectCustomCategories, toggleCategoryMembership } from "../lib/menuSections/categoryPresets.ts";
import { getMenuCategoryFacets, getMenuResultCounts } from "../lib/menuSections/resultCounts.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";

const restaurant = await getRestaurantData("starbucks");
const items = getOfficialRankingItems(restaurant.items);
const presets = getCategoryPresets(items, "starbucks");
const context = { items, filters: {}, menuSizePreference: "Grande", rankingSort: "highest-protein", searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };

test("tag memberships generate full, partial and unchecked states without broadening categories", () => {
  const matcha = presets.find((preset) => preset.id === "matcha");
  let filters = selectCategoryPreset({}, matcha);
  const facets = getMenuCategoryFacets({ ...context, filters });
  assert.equal(facets.states.get("matcha"), "all");
  assert.equal(facets.states.get("protein drinks"), "some");
  assert.equal(facets.states.get("hot coffee"), "none");
  assert.ok(!filters.categories.includes("protein drinks"));
  const previous = filterMenuItems({ ...context, filters });
  filters = toggleCategoryMembership(filters, filters.categories, "protein drinks", "some");
  assert.equal(filters.categoryPreset, "custom");
  assert.equal(getMenuCategoryFacets({ ...context, filters }).states.get("protein drinks"), "all");
  const promoted = filterMenuItems({ ...context, filters });
  assert.ok(previous.every((item) => promoted.some((candidate) => candidate.id === item.id && candidate.defaultVariantId === item.defaultVariantId)));
  filters = toggleCategoryMembership(filters, filters.categories, "protein drinks", "all");
  assert.equal(getMenuCategoryFacets({ ...context, filters }).states.get("protein drinks"), "none");
  assert.ok(filterMenuItems({ ...context, filters }).every((item) => item.category !== "Protein Drinks"));
  const only = selectCustomCategories(filters, ["protein drinks"]);
  assert.equal(only.categoryTags, undefined);
  assert.equal(only.categoryExclusions, undefined);
  assert.equal(getMenuCategoryFacets({ ...context, filters: only }).states.get("protein drinks"), "all");
  assert.equal(getMenuResultCounts({ ...context, filters: selectCategoryPreset(filters, matcha) }).matching, 20);
});

test("coffee uses source drink family before temperature and retains one primary category", () => {
  const hotFamilies = new Set(["Brewed Coffee", "Coffee Traveler"]);
  const icedFamilies = new Set(["Iced Coffee", "Cold Brew", "Nitro Cold Brew"]);
  for (const item of restaurant.items) {
    if (!["Hot Coffee", "Iced Coffee", "Espresso Drinks"].includes(item.category)) continue;
    const paths = item.source.generated.menu.officialCategoryPaths.filter((path) => path.startsWith("Coffee & Espresso >"));
    assert.ok(paths.length);
    const family = paths[0].split(" > ")[2];
    assert.equal(item.category, hotFamilies.has(family) ? "Hot Coffee" : icedFamilies.has(family) ? "Iced Coffee" : "Espresso Drinks");
    assert.deepEqual(item.categories, [item.category]);
  }
  assert.equal(restaurant.items.find((item) => item.name === "Iced Caffè Americano").category, "Espresso Drinks");
  assert.deepEqual(presets.find((preset) => preset.id === "coffee").ids, ["hot coffee", "iced coffee", "espresso drinks"]);
});

test("coffee facets, result counts and size preferences agree across the new categories", () => {
  const categories = ["hot coffee", "iced coffee", "espresso drinks"];
  for (const size of ["Tall", "Grande", "Venti", "all-sizes"]) {
    const input = { ...context, menuSizePreference: size };
    const facets = getMenuCategoryFacets(input);
    const counts = categories.map((category) => facets.counts.get(category));
    assert.deepEqual(counts, size === "all-sizes" ? [14, 50, 136] : [7, 15, 54]);
    for (const category of categories) {
      const result = getMenuResultCounts({ ...input, filters: { categories: [category] } });
      assert.equal(result.matching, facets.counts.get(category));
      assert.equal(result.total, result.matching);
    }
  }
});
