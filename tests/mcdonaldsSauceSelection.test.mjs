import assert from "node:assert/strict";
import test from "node:test";

import { buildIngredientCustomizations } from "../lib/cart/standardItemConfiguration.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import {
  areRequiredIngredientSelectionsComplete,
  getSelectedIngredientCountsFromCustomizations,
} from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateIngredientCountTotals } from "../lib/menuItemCard/totals.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const nuggets = menu.items.find((item) => item.id === "mcd-item-200692");
const strips = menu.items.find((item) => item.id === "mcd-item-204386");
assert.ok(nuggets);
assert.ok(strips);

const cases = [
  [nuggets, "mcd-item-200692", ["5831795165"]],
  [nuggets, "mcd-item-200574", ["5831795166"]],
  [nuggets, "mcd-item-200567", ["5831795174", "5831795175"]],
  [nuggets, "mcd-item-200573", ["5831795184", "5831795185", "5831795186"]],
  [nuggets, "mcd-item-200577", ["5830831260", "5830831261", "5830831262", "5830831263", "5830831264", "5830831265"]],
  [strips, "mcd-item-204386", ["9631455505", "9631455506"]],
  [strips, "mcd-item-204385", ["9631455515", "9631455516"]],
];

function resolved(item, variantId) {
  return resolvePanelIngredients(
    item,
    menu.ingredients,
    undefined,
    menu.items,
    item.variants,
    variantId,
    menu.customizationRules,
  );
}

function emptyCounts(ingredients) {
  return Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, 0]));
}

for (const [item, variantId, expectedGroupIds] of cases) {
  test(`${variantId} exposes the captured required sauce slots`, () => {
    const ingredients = resolved(item, variantId);
    const categories = item.customizationByVariantId[variantId].ingredientCategories;
    assert.equal(categories.length, expectedGroupIds.length);
    assert.deepEqual(
      categories.map((category) => menu.customizationRules.ingredientCategories[category.id].minQuantity),
      expectedGroupIds.map(() => 1),
    );
    assert.deepEqual(
      categories.map((category) => menu.customizationRules.ingredientCategories[category.id].maxQuantity),
      expectedGroupIds.map(() => 1),
    );
    assert.deepEqual(
      categories.map((category) => new Set(category.ingredients.map((id) => ingredients.find((entry) => entry.id === id)?.orderingGroupIdByCount?.[1]))),
      expectedGroupIds.map((groupId) => new Set([groupId])),
    );
    assert.ok(categories.every((category) => category.ingredients.some((id) => ingredients.find((entry) => entry.id === id)?.label === "No Sauce")));
    assert.equal(areRequiredIngredientSelectionsComplete({ item, selectedVariantId: variantId, resolvedIngredients: ingredients, ingredientCounts: emptyCounts(ingredients), customizationRules: menu.customizationRules }), false);
  });
}

test("unresolved sauces are hidden from every slot", () => {
  const hidden = new Set(["Tangy BBQ Dipping Sauce", "Sweet N Sour Dipping Sauce", "Honey Packet", "Hot Picante Salsa"]);
  for (const [item, variantId] of cases) {
    assert.ok(resolved(item, variantId).every((ingredient) => !hidden.has(ingredient.label)));
  }
});

test("duplicate sauce selections across slots retain distinct group and option ids", () => {
  const variantId = "mcd-item-200567";
  const ingredients = resolved(nuggets, variantId);
  const ranch = ingredients.filter((ingredient) => ingredient.label === "Creamy Ranch Sauce");
  assert.equal(ranch.length, 2);
  const counts = emptyCounts(ingredients);
  ranch.forEach((ingredient) => { counts[ingredient.id] = 1; });
  const customizations = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
  assert.deepEqual(customizations.map((entry) => entry.orderingGroupId), ["5831795174", "5831795175"]);
  assert.deepEqual(customizations.map((entry) => entry.orderingOptionId), ["23640083579", "23640083590"]);
  assert.equal(areRequiredIngredientSelectionsComplete({ item: nuggets, selectedVariantId: variantId, resolvedIngredients: ingredients, ingredientCounts: counts, customizationRules: menu.customizationRules }), true);
});

test("No Sauce satisfies a required slot and contributes zero nutrition", () => {
  const variantId = "mcd-item-200692";
  const ingredients = resolved(nuggets, variantId);
  const noSauce = ingredients.find((ingredient) => ingredient.label === "No Sauce");
  assert.ok(noSauce);
  const counts = emptyCounts(ingredients);
  counts[noSauce.id] = 1;
  assert.deepEqual(calculateIngredientCountTotals(counts, ingredients), { calories: 0, protein: 0, carbs: 0, totalFat: 0 });
  const [customization] = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
  assert.equal(customization.orderingGroupId, "5831795165");
  assert.equal(customization.orderingOptionId, "30154947524");
});

test("structured cart customizations restore same-named sauces to their original slots", () => {
  const variantId = "mcd-item-200567";
  const ingredients = resolved(nuggets, variantId);
  const ranch = ingredients.filter((ingredient) => ingredient.label === "Creamy Ranch Sauce");
  const counts = emptyCounts(ingredients);
  ranch.forEach((ingredient) => { counts[ingredient.id] = 1; });
  const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
  const restored = getSelectedIngredientCountsFromCustomizations(ingredients, saved.map(() => "Creamy Ranch Sauce: 1x"), saved);
  assert.deepEqual(ranch.map((ingredient) => restored[ingredient.id]), [1, 1]);
  assert.equal(Object.entries(restored).filter(([, count]) => count > 0).length, 2);
});

test("selected sauce nutrition is added once per occupied slot", () => {
  const variantId = "mcd-item-200567";
  const ingredients = resolved(nuggets, variantId);
  const ranch = ingredients.filter((ingredient) => ingredient.label === "Creamy Ranch Sauce");
  const counts = emptyCounts(ingredients);
  ranch.forEach((ingredient) => { counts[ingredient.id] = 1; });
  assert.deepEqual(calculateIngredientCountTotals(counts, ingredients), {
    calories: 220,
    protein: 0,
    carbs: 2,
    totalFat: 24,
  });
});

test("all exposed validated sauces carry live core nutrition", () => {
  const ingredients = resolved(nuggets, "mcd-item-200567");
  const expected = new Map([
    ["Hot Mustard Dipping Sauce", [45, 1, 7, 1.5]],
    ["Ketchup Packet", [10, 0, 2, 0]],
    ["Creamy Ranch Sauce", [110, 0, 1, 12]],
    ["Spicy Buffalo", [30, 0, 1, 3]],
    ["Honey Mustard", [60, 0, 6, 3.5]],
    ["No Sauce", [0, 0, 0, 0]],
  ]);
  for (const [name, values] of expected) {
    const ingredient = ingredients.find((entry) => entry.label === name);
    assert.ok(ingredient, name);
    assert.deepEqual([ingredient.nutrition.calories, ingredient.nutrition.protein, ingredient.nutrition.carbs, ingredient.nutrition.totalFat], values);
  }
  const forty = resolved(nuggets, "mcd-item-200577");
  assert.deepEqual(
    ["Mighty Hot Sauce", "Creamy Chili McCrispy™ Strip Dip"].map((name) => {
      const nutrition = forty.find((entry) => entry.label === name)?.nutrition;
      return [nutrition?.calories, nutrition?.protein, nutrition?.carbs, nutrition?.totalFat];
    }),
    [[25, 0, 6, 0], [110, 0, 3, 11]],
  );
});
