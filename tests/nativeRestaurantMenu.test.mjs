import test from "node:test";
import assert from "node:assert/strict";
import { isStandaloneMenuItem } from "../lib/menuItemCalculations.ts";
import { selectCategoryPreset, selectCustomCategories } from "../lib/menuSections/categoryPresets.ts";
import { getDefaultMenuItemNutrition } from "../lib/nutrition.ts";
import { getRestaurantData } from "../lib/restaurants.ts";
import {
  applyGoal, clearNutrition, countActive, createRestaurantMenu, defaultView, exploreGoals, featuredPicks, filterChips, groupRows, isNarrowed,
  menuCategories, menuRows, nutritionControls, presetCount, rankText, reconcile, rowKey, rowTitle, searchRows, selectedPreset,
} from "../lib/native/restaurantMenu.ts";

const load = async (id) => {
  const data = await getRestaurantData(id);
  return createRestaurantMenu(id, data.items.filter(isStandaloneMenuItem), data.menuSizeSelector?.enabled ? data.menuSizeSelector.defaultValue : undefined);
};
const cfa = await load("chickfila");
const start = defaultView(cfa);
const rowsFor = (menu, view) => menuRows(menu, view).rows;
const preset = (menu, id) => menu.presets.find((p) => p.id === id);

test("opens on the restaurant's main menu in menu order, one row per item", () => {
  const { rows, pool } = menuRows(cfa, start);
  assert.equal(rows.length, pool);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  assert.equal(selectedPreset(cfa, start.filters).id, "main");
  assert.deepEqual(groupRows(cfa, rows, start.sort).map((g) => g.title), ["Sandwiches", "Chicken", "Salads", "Wraps", "Breakfast"]);
  assert.ok(!rows.some((r) => /sauce/i.test(r.name)));
  assert.equal(isNarrowed(cfa, start), false);
});

test("every restaurant's presets match what they list", async () => {
  for (const id of ["chickfila", "mcdonalds", "starbucks"]) {
    const menu = await load(id);
    const view = defaultView(menu);
    assert.ok(rowsFor(menu, view).length > 0, id);
    for (const p of menu.presets) assert.equal(presetCount(menu, p, view), rowsFor(menu, { filters: selectCategoryPreset(view.filters, p), sort: "default-order" }).length);
    assert.equal(presetCount(menu, preset(menu, "all"), view), menu.items.length);
  }
});

test("a family shows up in shareables at its large size only", () => {
  const rows = rowsFor(cfa, { filters: selectCategoryPreset(start.filters, preset(cfa, "shareables")), sort: "default-order" });
  assert.equal(rows.length, 4);
  assert.ok(rows.map((r) => rowTitle(r, false)).includes("Grilled Nuggets (30 ct)"));
  assert.equal(rowTitle(rowsFor(cfa, start).find((r) => r.name === "Grilled Nuggets"), false), "Grilled Nuggets");
});

test("categories report counts and mixed, full and empty states", async () => {
  const states = Object.fromEntries(menuCategories(cfa, start.filters).map((c) => [c.id, c]));
  assert.equal(states.chicken.state, "all");
  assert.equal(states.sides.state, "none");
  assert.equal(states.shareables.count, 4);
  const limited = Object.fromEntries(menuCategories(cfa, { ...start.filters, caloriesMax: 200 }).map((c) => [c.id, c.count]));
  assert.ok(limited.chicken < states.chicken.count);
  const starbucks = await load("starbucks");
  const matcha = selectCategoryPreset(defaultView(starbucks).filters, preset(starbucks, "matcha"));
  assert.ok(menuCategories(starbucks, matcha).some((c) => c.state === "some"));
});

test("custom and empty selections", () => {
  const custom = { ...start, filters: selectCustomCategories(start.filters, ["chicken", "salads"]) };
  assert.equal(selectedPreset(cfa, custom.filters), undefined);
  assert.equal(rowsFor(cfa, custom).length, 6);
  assert.equal(isNarrowed(cfa, custom), true);
  assert.equal(rowsFor(cfa, { ...start, filters: selectCustomCategories(start.filters, []) }).length, 0);
});

test("rankings sort both ways and are described", () => {
  const high = rowsFor(cfa, { ...start, sort: "highest-protein" });
  const low = rowsFor(cfa, { ...start, sort: "lowest-protein" });
  assert.equal(high[0].name, "Chick-fil-A Cool Wrap®");
  assert.equal(getDefaultMenuItemNutrition(low[0]).protein, Math.min(...high.map((r) => getDefaultMenuItemNutrition(r).protein)));
  assert.equal(groupRows(cfa, high, "highest-protein").length, 1);
  assert.equal(rankText("highest-protein-score"), "highest Protein Score first");
  assert.equal(rankText("lowest-calories"), "lowest calories first");
  assert.equal(rankText("default-order"), "in menu order");
});

test("nutrition limits narrow the list, show as chips and clear", () => {
  const filters = { ...start.filters, caloriesMax: 500, proteinMin: 25, sodiumMax: 1500 };
  const { rows, pool } = menuRows(cfa, { filters, sort: "default-order" });
  assert.ok(rows.length > 0 && rows.length < pool);
  for (const row of rows) {
    const n = getDefaultMenuItemNutrition(row);
    assert.ok(n.calories <= 500 && n.protein >= 25 && n.sodium <= 1500);
  }
  assert.equal(countActive(filters), 3);
  assert.deepEqual(filterChips(filters).map((c) => c.label), ["Under 500 cal", "25g+ protein", "1,500mg sodium or less"]);
  assert.equal(countActive(clearNutrition(filters)), 0);
  assert.equal(rowsFor(cfa, { filters: clearNutrition(filters), sort: "default-order" }).length, pool);
  assert.ok(nutritionControls(cfa, filters).calories.length > 0);
  assert.equal(reconcile(cfa, { ...start.filters, proteinMin: 400 }).proteinMin, 40);
});

test("sizes and flavors list separately when asked for, with their labels", () => {
  const plain = rowsFor(cfa, { ...start, sort: "highest-protein" });
  const sizes = rowsFor(cfa, { ...start, filters: { ...start.filters, showServingSizeVariants: true }, sort: "highest-protein" });
  const flavors = rowsFor(cfa, { ...start, filters: { ...start.filters, showRecipeVariants: true }, sort: "highest-protein" });
  assert.ok(sizes.length > plain.length);
  assert.ok(flavors.length > plain.length);
  assert.ok(sizes.some((r) => rowTitle(r, true) === "Grilled Nuggets (12 ct)"));
  assert.equal(new Set(sizes.map(rowKey)).size, sizes.length);
  const score = { ...start, sort: "highest-protein-score" };
  assert.ok(rowsFor(cfa, { ...score, filters: { ...start.filters, separateSizesInProteinScore: true } }).length > rowsFor(cfa, score).length);
});

test("goals apply real rankings and limits and never lead nowhere", async () => {
  for (const id of ["chickfila", "mcdonalds", "starbucks"]) {
    const menu = await load(id);
    const goals = exploreGoals(menu);
    assert.ok(goals.length >= 4, id);
    for (const goal of goals) {
      const applied = applyGoal(menu, defaultView(menu), goal.id);
      assert.ok(rowsFor(menu, applied).length > 0, `${id} ${goal.id}`);
      assert.equal(selectedPreset(menu, applied.filters).id, "main");
      assert.equal(applied.goal, goal.id);
    }
  }
  const lowCarb = applyGoal(cfa, { ...start, filters: { ...start.filters, caloriesMax: 300 } }, "low-carb");
  assert.equal(lowCarb.filters.carbsMax, 20);
  assert.equal(lowCarb.filters.caloriesMax, undefined);
  assert.ok(rowsFor(cfa, lowCarb).every((r) => getDefaultMenuItemNutrition(r).carbs <= 20));
});

test("featured picks are distinct and each label is true", async () => {
  for (const id of ["chickfila", "mcdonalds", "starbucks"]) {
    const menu = await load(id);
    const picks = featuredPicks(menu);
    assert.ok(picks.length >= 3 && picks.length <= 4, id);
    assert.equal(new Set(picks.map((p) => p.item.id)).size, picks.length);
    const rows = rowsFor(menu, defaultView(menu));
    const most = picks.find((p) => p.reason === "protein");
    if (most) assert.equal(getDefaultMenuItemNutrition(most.item).protein, Math.max(...rows.map((r) => getDefaultMenuItemNutrition(r).protein ?? 0)));
    const fiber = picks.find((p) => p.reason === "fiber");
    if (fiber) assert.equal(getDefaultMenuItemNutrition(fiber.item).fiber, Math.max(...rows.map((r) => getDefaultMenuItemNutrition(r).fiber ?? 0)));
  }
  assert.deepEqual(featuredPicks(cfa).map((p) => p.label), ["Best Protein Score", "Most protein", "Leanest breakfast", "Most fiber"]);
});

test("search covers the whole menu and leads with the closest names", () => {
  const rows = searchRows(cfa, "grill");
  assert.ok(rows.length >= 6);
  assert.ok(rows[0].name.toLowerCase().startsWith("grill"));
  assert.ok(searchRows(cfa, "lemonade").length > 0);
  assert.deepEqual(searchRows(cfa, "zzzz"), []);
  assert.deepEqual(searchRows(cfa, "  "), []);
});
