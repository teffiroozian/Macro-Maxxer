import assert from "node:assert/strict";
import test from "node:test";

import { buildIngredientCustomizations } from "../lib/cart/standardItemConfiguration.ts";
import { resolvePanelIngredients, resolvePanelIngredientTabs } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations, incrementIngredientCountWithinCategoryLimit } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateIngredientCountTotals } from "../lib/menuItemCard/totals.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const nuggets = menu.items.find((item) => item.id === "mcd-item-200692");
const strips = menu.items.find((item) => item.id === "mcd-item-204386");
assert.ok(nuggets);
assert.ok(strips);

const cases = [
  [nuggets, "mcd-item-200692", 1], [nuggets, "mcd-item-200574", 1],
  [nuggets, "mcd-item-200567", 2], [nuggets, "mcd-item-200573", 3],
  [nuggets, "mcd-item-200577", 6], [strips, "mcd-item-204386", 2],
  [strips, "mcd-item-204385", 2],
];

function resolved(item, variantId) {
  return resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, item.variants, variantId, menu.customizationRules);
}
function emptyCounts(ingredients) {
  return Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, 0]));
}

for (const [item, variantId, allowance] of cases) {
  test(`${variantId} exposes one consolidated quantity sauce selector capped at ${allowance}`, () => {
    const ingredients = resolved(item, variantId);
    const categories = item.customizationByVariantId[variantId].ingredientCategories;
    assert.equal(categories.length, 1);
    assert.equal(categories[0].name, "Sauces");
    assert.equal(categories[0].sectionTitle, "Dipping Sauces");
    assert.equal(categories[0].helperText, `Choose up to ${allowance} sauce${allowance === 1 ? "" : "s"}`);
    assert.deepEqual(menu.customizationRules.ingredientCategories[categories[0].id], { minQuantity: 0, maxQuantity: allowance, allowNone: true });
    assert.ok(ingredients.every((ingredient) => ingredient.maxQuantity === allowance));
    assert.ok(ingredients.every((ingredient) => ingredient.label !== "No Sauce"));
    const tabs = resolvePanelIngredientTabs(item, menu.ingredients, undefined, menu.items, item.variants, variantId, menu.customizationRules);
    assert.deepEqual(tabs.filter((tab) => tab.ingredients.length > 0).map((tab) => tab.label), ["Sauces"]);
    assert.equal(tabs.find((tab) => tab.label === "Sauces")?.sectionTitle, "Dipping Sauces");
    assert.equal(tabs.find((tab) => tab.label === "Sauces")?.helperText, categories[0].helperText);
  });
}

test("every captured sauce with safe full macros is exposed; Hot Picante remains hidden", () => {
  const standard = resolved(nuggets, "mcd-item-200567").map((ingredient) => ingredient.label);
  assert.deepEqual(standard.sort(), [
    "Creamy Ranch Sauce", "Honey Mustard", "Honey Packet", "Hot Mustard Dipping Sauce",
    "Ketchup Packet", "Spicy Buffalo", "Sweet N Sour Dipping Sauce", "Tangy BBQ Dipping Sauce",
  ].sort());
  assert.ok(!standard.includes("Hot Picante Salsa"));
  const forty = resolved(nuggets, "mcd-item-200577").map((ingredient) => ingredient.label);
  assert.ok(forty.includes("Mighty Hot Sauce"));
  assert.ok(forty.includes("Creamy Chili McCrispy™ Strip Dip"));
  assert.ok(!forty.includes("Hot Mustard Dipping Sauce"));
});

test("duplicate sauce quantity respects the allowance and keeps captured slot metadata", () => {
  const ingredients = resolved(nuggets, "mcd-item-200567");
  const ranch = ingredients.find((ingredient) => ingredient.label === "Creamy Ranch Sauce");
  let counts = emptyCounts(ingredients);
  counts = incrementIngredientCountWithinCategoryLimit({ ingredientId: ranch.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  counts = incrementIngredientCountWithinCategoryLimit({ ingredientId: ranch.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  const blocked = incrementIngredientCountWithinCategoryLimit({ ingredientId: ranch.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  assert.equal(counts[ranch.id], 2);
  assert.equal(blocked, counts);
  assert.deepEqual(ranch.orderingGroupIdByCount, { 1: "5831795174", 2: "5831795175" });
  assert.deepEqual(ranch.orderingOptionIdByCount, { 1: "23640083579", 2: "23640083590" });
});

test("the consolidated selector enforces its total across different sauces", () => {
  const ingredients = resolved(nuggets, "mcd-item-200567");
  const [ranch, honey, ketchup] = ["Creamy Ranch Sauce", "Honey Packet", "Ketchup Packet"].map((name) => ingredients.find((entry) => entry.label === name));
  let counts = emptyCounts(ingredients);
  counts = incrementIngredientCountWithinCategoryLimit({ ingredientId: ranch.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  counts = incrementIngredientCountWithinCategoryLimit({ ingredientId: honey.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  const blocked = incrementIngredientCountWithinCategoryLimit({ ingredientId: ketchup.id, resolvedIngredients: ingredients, ingredientCounts: counts, categoryMaxQuantity: 2 });
  assert.equal(blocked, counts);
});

test("sauce quantities add live macros and round-trip through structured cart state", () => {
  const ingredients = resolved(nuggets, "mcd-item-200567");
  const ranch = ingredients.find((ingredient) => ingredient.label === "Creamy Ranch Sauce");
  const counts = { ...emptyCounts(ingredients), [ranch.id]: 2 };
  assert.deepEqual(calculateIngredientCountTotals(counts, ingredients), { calories: 220, protein: 0, carbs: 2, totalFat: 24 });
  const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
  assert.deepEqual([saved[0].quantity, saved[0].orderingGroupId, saved[0].orderingOptionId], [2, "5831795175", "23640083590"]);
  assert.equal(getSelectedIngredientCountsFromCustomizations(ingredients, [], saved)[ranch.id], 2);
});

test("all exposed sauces carry official core nutrition and Hot Mustard artwork", () => {
  const ingredients = resolved(nuggets, "mcd-item-200567");
  const expected = new Map([
    ["Hot Mustard Dipping Sauce", [45, 1, 7, 1.5]], ["Tangy BBQ Dipping Sauce", [45, 0, 11, 0]],
    ["Sweet N Sour Dipping Sauce", [50, 0, 11, 0]], ["Honey Packet", [50, 0, 12, 0]],
    ["Ketchup Packet", [10, 0, 2, 0]], ["Creamy Ranch Sauce", [110, 0, 1, 12]],
    ["Spicy Buffalo", [30, 0, 1, 3]], ["Honey Mustard", [60, 0, 6, 3.5]],
  ]);
  for (const [name, values] of expected) {
    const ingredient = ingredients.find((entry) => entry.label === name);
    assert.ok(ingredient, name);
    assert.deepEqual([ingredient.nutrition.calories, ingredient.nutrition.protein, ingredient.nutrition.carbs, ingredient.nutrition.totalFat], values);
  }
  assert.match(ingredients.find((entry) => entry.label === "Hot Mustard Dipping Sauce")?.ingredientItem.image ?? "", /\/t-hot-mustard-sauce\?fmt=png-alpha$/);
});
