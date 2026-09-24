import assert from "node:assert/strict";
import test from "node:test";

import { buildIngredientCustomizations } from "../lib/cart/standardItemConfiguration.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateIngredientCountTotals } from "../lib/menuItemCard/totals.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

function resolved(item) {
  return resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, item.variants, item.defaultVariantId, menu.customizationRules);
}

const breakfastIds = ["200424", "200876", "201030", "200145", "200300", "201256", "200302", "200301", "200304", "200307", "200306", "200298", "200161", "200449"];

test("all 14 captured breakfast sandwiches expose only validated cheese and bacon", () => {
  const allowed = new Set(["American Cheese", "American Cheese Slice", "2 Half Strips Bacon"]);
  for (const id of breakfastIds) {
    const item = menu.items.find((candidate) => candidate.id === `mcd-item-${id}`);
    assert.ok(item, id);
    const ingredients = resolved(item);
    assert.ok(ingredients.length > 0, item.name);
    assert.ok(ingredients.every((ingredient) => allowed.has(ingredient.label)), item.name);
    assert.ok(ingredients.every((ingredient) => Object.keys(ingredient.orderingOptionIdByCount ?? {}).length > 0));
  }
});

test("breakfast sandwich ordering IDs, nutrition and cart restoration round-trip", () => {
  const item = menu.items.find((candidate) => candidate.id === "mcd-item-200300");
  const ingredients = resolved(item);
  const cheese = ingredients.find((ingredient) => ingredient.label === "American Cheese");
  const bacon = ingredients.find((ingredient) => ingredient.label === "2 Half Strips Bacon");
  assert.equal(cheese.orderingGroupIdByCount[0], "5820746153");
  assert.equal(cheese.orderingOptionIdByCount[0], "30435527109");
  assert.equal(bacon.orderingGroupIdByCount[2], "5820746154");
  assert.equal(bacon.orderingOptionIdByCount[2], "29645347456");
  const counts = Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, ingredient.defaultCount]));
  counts[cheese.id] = 0;
  counts[bacon.id] = 2;
  const totals = calculateIngredientCountTotals(counts, ingredients);
  assert.ok(Math.abs(totals.calories - (71.8990763346 - 50.113645)) < 1e-9);
  assert.ok(Math.abs(totals.protein - (3.9121939386 - 2.5979595)) < 1e-9);
  const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
  const restored = getSelectedIngredientCountsFromCustomizations(ingredients, saved.map((entry) => entry.label), saved);
  assert.equal(restored[cheese.id], 0);
  assert.equal(restored[bacon.id], 2);
});

for (const [id, groupId, baconOptionId, tomatoOptionId] of [
  ["mcd-item-204401", "9999652021", "45501690905", "45501690906"],
  ["mcd-item-204402", "9999652023", "45501690913", "45501690914"],
]) {
  test(`${id} exposes only validated Bacon and Tomato add-ons`, () => {
    const item = menu.items.find((candidate) => candidate.id === id);
    const ingredients = resolved(item);
    assert.deepEqual(ingredients.map((ingredient) => ingredient.label), ["2 Half Strips Bacon", "2 Tomato Slices"]);
    assert.deepEqual(ingredients.map((ingredient) => ingredient.orderingGroupIdByCount[1]), [groupId, groupId]);
    assert.deepEqual(ingredients.map((ingredient) => ingredient.orderingOptionIdByCount[1]), [baconOptionId, tomatoOptionId]);
    const counts = Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, 1]));
    const totals = calculateIngredientCountTotals(counts, ingredients);
    assert.ok(Math.abs(totals.calories - 74.9806763346) < 1e-9);
    assert.ok(Math.abs(totals.protein - 4.0628499386) < 1e-9);
    assert.ok(Math.abs(totals.carbs - 1.337883538) < 1e-9);
    assert.ok(Math.abs(totals.totalFat - 5.9950907014) < 1e-9);
  });
}

test("Big Breakfast items expose only the exact catalog-mapped ketchup packet", () => {
  for (const [id, groupId, optionId] of [
    ["mcd-item-200322", "5820739917", "23568342394"],
    ["mcd-item-200323", "5820739920", "23568342411"],
  ]) {
    const item = menu.items.find((candidate) => candidate.id === id);
    const [ketchup] = resolved(item);
    assert.equal(ketchup.label, "Ketchup Packet");
    assert.equal(ketchup.orderingGroupIdByCount[1], groupId);
    assert.equal(ketchup.orderingOptionIdByCount[1], optionId);
    assert.deepEqual(calculateIngredientCountTotals({ [ketchup.id]: 1 }, [ketchup]), { calories: 10, protein: 0, carbs: 2, totalFat: 0 });
  }
});

test("Sausage Burrito uses a required captured sauce slot with unresolved salsa hidden", () => {
  const item = menu.items.find((candidate) => candidate.id === "mcd-item-200267");
  const ingredients = resolved(item);
  assert.deepEqual(ingredients.map((ingredient) => ingredient.label), ["Ketchup Packet", "No Sauce"]);
  assert.deepEqual(ingredients.map((ingredient) => ingredient.orderingGroupIdByCount[1]), ["5820746178", "5820746178"]);
  assert.deepEqual(ingredients.map((ingredient) => ingredient.orderingOptionIdByCount[1]), ["23568409567", "23568409568"]);
  const category = item.customization.ingredientCategories[0];
  assert.deepEqual(menu.customizationRules.ingredientCategories[category.id], { minQuantity: 1, maxQuantity: 1, allowNone: false });
});
