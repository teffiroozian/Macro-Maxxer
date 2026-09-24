import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getCustomizationLabels } from "../lib/cart/customizationLabels.ts";
import { resolveStandardItemConfiguration } from "../lib/cart/standardItemConfiguration.ts";
import { resolveComboDrinkOptions, resolveComboSideOptions } from "../lib/comboMeals.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateMcDonaldsCustomizationNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { ingredientIdForComponent } from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const model = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/filet-o-fish.json", import.meta.url), "utf8"));
const report = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/filet-o-fish-report.json", import.meta.url), "utf8"));
const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const item = menu.items.find((candidate) => candidate.id === "mcd-item-200445");
const resolved = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
const cheeseId = ingredientIdForComponent("200445", "300716");
const cheese = resolved.find((ingredient) => ingredient.id === cheeseId);
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);

test("Filet-O-Fish exposes every validated captured option and hides only pickle and ketchup", () => {
  assert.ok(item?.customization);
  assert.equal(model.orderingItemId, "25120693162");
  assert.deepEqual(model.groups.map((group) => group.id), ["9605359052", "9605359053"]);
  assert.equal(model.options.length, 11);
  assert.equal(report.summary.defaultNutritionValidated, true);
  assert.deepEqual(report.unmatched.map((entry) => [entry.optionId, entry.name]), [
    ["43914731853", "Add Pickle"],
    ["43914731857", "Add Ketchup"],
  ]);
  assert.ok(model.options.every((option) => option.id !== "43914731853" && option.id !== "43914731857"));
});

test("Filet-O-Fish exposes the shared sandwich library without replacing its captured defaults", () => {
  const expectedSharedAdds = ["Mac Sauce", "Ketchup", "McCrispy Ranch Sauce", "Pickle", "Diced Onions", "Slivered Onions"];
  for (const label of expectedSharedAdds) {
    const ingredient = resolved.find((candidate) => candidate.label === label);
    assert.ok(ingredient, label);
    assert.equal(ingredient.defaultCount, 0, label);
    assert.deepEqual(ingredient.orderingOptionIdByCount, {}, label);
  }
  assert.match(
    resolved.find((ingredient) => ingredient.label === "McCrispy Ranch Sauce")?.ingredientItem.image ?? "",
    /DC_Ingredient_Condiment_202203_02861-036__0922_CreamyRanch_1564x1564-1\?fmt=png-alpha$/,
  );
  assert.equal(resolved.find((ingredient) => ingredient.label === "Tartar Sauce")?.defaultCount, 1);
  assert.equal(resolved.find((ingredient) => ingredient.label === "American Cheese")?.defaultCount, 1);
  for (const label of ["Shredded Lettuce", "Tomato", "2 Half Strips Bacon", "Mustard", "Mayonnaise"]) {
    assert.equal(resolved.find((ingredient) => ingredient.label === label)?.defaultCount, 0, label);
  }
});

test("removing American cheese subtracts the default half-slice context", () => {
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  const removed = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914731847" }]);
  const halfSlice = model.componentContexts.find((context) => context.id === "filet-o-fish-half-cheese").nutrients;
  for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
    close(base[key] - removed[key], halfSlice[key], `half-slice removal:${key}`);
  }
  assert.equal(cheese.orderingOptionIdByCount[0], "43914731847");
});

test("extra American cheese adds one full-slice context", () => {
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  const extra = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914731851" }]);
  const fullSlice = model.componentContexts.find((context) => context.id === "american-cheese-single").nutrients;
  for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
    close(extra[key] - base[key], fullSlice[key], `full-slice extra:${key}`);
  }
  assert.equal(cheese.orderingOptionIdByCount[2], "43914731851");
});

test("extra cheese state represents one default half-slice plus one full slice", () => {
  const removed = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914731847" }]);
  const extra = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914731851" }]);
  const halfSlice = model.componentContexts.find((context) => context.id === "filet-o-fish-half-cheese").nutrients;
  const fullSlice = model.componentContexts.find((context) => context.id === "american-cheese-single").nutrients;
  for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
    close(extra[key] - removed[key], halfSlice[key] + fullSlice[key], `1.5-slice state:${key}`);
  }
  assert.deepEqual([cheese.defaultCount, cheese.maxQuantity], [1, 2]);
});

test("Filet-O-Fish ordering ids survive cart/edit restoration", () => {
  const configuration = resolveStandardItemConfiguration({
    item, resolvedIngredients: resolved, selectedIngredientCounts: { [cheeseId]: 2 },
    selectedAddons: {}, selectedSauceCounts: {}, comboSides: [], comboDrinks: [],
    isComboEligibleCategory: false, comboType: "just-item",
  });
  const customization = configuration.customizations.find((entry) => entry.ingredientId === cheeseId);
  assert.equal(customization.orderingGroupId, "9605359053");
  assert.equal(customization.orderingOptionId, "43914731851");
  assert.equal(customization.quantity, 2);
  const restored = getSelectedIngredientCountsFromCustomizations(resolved, getCustomizationLabels(configuration.customizations));
  assert.equal(restored[cheeseId], 2);
});

test("Filet-O-Fish customization coexists with its meal side and drink configuration", () => {
  const sides = resolveComboSideOptions("mcdonalds", item, menu.items);
  const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
  assert.equal(sides.length, 1);
  assert.ok(drinks.length > 0);
  const side = sides[0]; const drink = drinks[0];
  const configuration = resolveStandardItemConfiguration({
    item, resolvedIngredients: resolved, selectedIngredientCounts: { [cheeseId]: 2 },
    selectedAddons: {}, selectedSauceCounts: {}, comboSides: sides, comboDrinks: drinks,
    isComboEligibleCategory: true, comboType: "combo-meal",
    selectedComboSideId: side.id, selectedComboSideVariantId: side.variants?.[0]?.id,
    selectedComboDrinkId: drink.id, selectedComboDrinkVariantId: drink.variants?.[0]?.id,
  });
  assert.ok(configuration.customizations.some((entry) => entry.ingredientId === cheeseId && entry.orderingOptionId === "43914731851"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "side"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "drink"));
  assert.ok(configuration.ingredientCountTotals.calories > 0);
  assert.ok(configuration.comboNutritionTotals.calories >= 0);
});
