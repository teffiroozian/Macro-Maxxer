import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";
import {
  ingredientIdForComponent,
  orderingOptionIdForIngredientCount,
} from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { calculateMcDonaldsCustomizationNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { getCustomizationLabels } from "../lib/cart/customizationLabels.ts";
import {
  buildIngredientCustomizationLabels,
  resolveStandardIngredientCounts,
  resolveStandardItemConfiguration,
} from "../lib/cart/standardItemConfiguration.ts";
import {
  resolveComboDrinkOptions,
  resolveComboSideOptions,
} from "../lib/comboMeals.ts";

const model = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/big-mac.json", import.meta.url), "utf8"));
const report = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/big-mac-report.json", import.meta.url), "utf8"));
const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const item = menu.items.find((candidate) => candidate.id === "mcd-item-200463");
assert.ok(item);

const contextById = new Map(model.componentContexts.map((context) => [context.id, context]));
const componentIngredientId = (componentId) => ingredientIdForComponent(model.itemId, componentId);
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);

test("Big Mac exposes every supported captured modifier and omits both salt options", () => {
  assert.equal(model.orderingItemId, "25120693132");
  assert.deepEqual(model.groups.map(({ id, maxOptions }) => [id, maxOptions]), [
    ["9605358904", 8],
    ["9605358905", 9],
  ]);
  assert.equal(model.options.length, 15);
  assert.deepEqual(report.unmatched.map(({ optionId, name }) => [optionId, name]), [
    ["43914730751", "No Salt"],
    ["43914730759", "Extra Salt"],
  ]);
  assert.equal(report.ambiguous.length, 0);
  assert.equal(report.summary.validationPassed, true);

  const expectedIds = [
    "43914730745", "43914730746", "43914730747", "43914730748", "43914730749",
    "43914730750", "43914730752", "43914730753", "43914730754", "43914730755",
    "43914730756", "43914730757", "43914730758", "43914730760", "43914730761",
  ];
  assert.deepEqual(model.options.map((option) => option.id), expectedIds);
});

test("every supported Big Mac modifier applies its captured nutrition context", () => {
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  for (const option of model.options) {
    const changed = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: option.id }]);
    const context = contextById.get(option.nutritionContextId);
    assert.ok(context, option.name);
    const sign = option.action === "remove" ? -1 : 1;
    for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
      close(changed[key] - base[key], sign * context.nutrients[key], `${option.name}:${key}`);
    }
  }
});

test("Big Mac beef transitions between one, two, and three patties with one-patty deltas", () => {
  const beefDefault = model.defaultComponents.find((component) => component.componentId === "300038");
  assert.deepEqual(beefDefault, { componentId: "300038", nutritionContextId: "big-mac-beef-single", quantity: 2 });
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  const onePatty = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914730750" }]);
  const threePatties = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914730758" }]);
  const patty = contextById.get("big-mac-beef-single").nutrients;
  for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
    close(base[key] - onePatty[key], patty[key], `remove patty:${key}`);
    close(threePatties[key] - base[key], patty[key], `extra patty:${key}`);
  }

  const resolved = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const beef = resolved.find((ingredient) => ingredient.id === componentIngredientId("300038"));
  assert.ok(beef);
  assert.equal(beef.defaultCount, 2);
  assert.equal(beef.maxQuantity, 3);
  assert.equal(orderingOptionIdForIngredientCount(beef.ingredientItem, 1), "43914730750");
  assert.equal(orderingOptionIdForIngredientCount(beef.ingredientItem, 3), "43914730758");
});

test("Big Mac tomato and mayonnaise additions use their validated portions", () => {
  const tomato = contextById.get("big-mac-tomato-two-slices");
  const mayo = contextById.get("qpc-add-mayonnaise");
  assert.ok(tomato.sourceExpression.startsWith("2 * 200497(301407)"));
  close(tomato.nutrients.calories, 3.0816, "two tomato calories");
  close(tomato.nutrients.protein, 0.150656, "two tomato protein");
  close(tomato.nutrients.carbohydrate, 0.665968, "two tomato carbs");
  close(tomato.nutrients.fat, 0.03424, "two tomato fat");
  close(mayo.nutrients.calories, 100.62572438, "mayo calories");
  assert.equal(model.options.find((option) => option.id === "43914730760").nutritionContextId, tomato.id);
  assert.equal(model.options.find((option) => option.id === "43914730761").nutritionContextId, mayo.id);
});

test("Big Mac customizations restore from cart/edit state with ordering identities intact", () => {
  const resolved = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const beefId = componentIngredientId("300038");
  const tomatoId = componentIngredientId("301407");
  const mayoId = componentIngredientId("300430");
  const counts = resolveStandardIngredientCounts({
    resolvedIngredients: resolved,
    selectedIngredientCounts: { [beefId]: 1, [tomatoId]: 1, [mayoId]: 1 },
  });
  const labels = buildIngredientCustomizationLabels({ resolvedIngredients: resolved, ingredientCounts: counts });
  const restored = getSelectedIngredientCountsFromCustomizations(resolved, labels);
  assert.equal(restored[beefId], 1);
  assert.equal(restored[tomatoId], 1);
  assert.equal(restored[mayoId], 1);

  const byId = new Map(menu.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  assert.equal(orderingOptionIdForIngredientCount(byId.get(beefId), restored[beefId]), "43914730750");
  assert.equal(orderingOptionIdForIngredientCount(byId.get(tomatoId), restored[tomatoId]), "43914730760");
  assert.equal(orderingOptionIdForIngredientCount(byId.get(mayoId), restored[mayoId]), "43914730761");
});

test("Big Mac ingredient customization coexists with meal side and drink state", () => {
  const resolved = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const beefId = componentIngredientId("300038");
  const tomatoId = componentIngredientId("301407");
  const sides = resolveComboSideOptions("mcdonalds", item, menu.items);
  const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
  const side = sides[0];
  const drink = drinks[0];
  const sideVariant = side.variants[0];
  const drinkVariant = drink.variants?.[0];
  const configuration = resolveStandardItemConfiguration({
    item,
    resolvedIngredients: resolved,
    selectedIngredientCounts: { [beefId]: 3, [tomatoId]: 1 },
    selectedAddons: {}, selectedSauceCounts: {},
    comboSides: sides, comboDrinks: drinks,
    isComboEligibleCategory: true, comboType: "combo-meal",
    selectedComboSideId: side.id,
    selectedComboSideVariantId: sideVariant.id,
    selectedComboDrinkId: drink.id,
    selectedComboDrinkVariantId: drinkVariant?.id,
  });
  assert.ok(configuration.ingredientCustomizationLabels.some((label) => label.includes("1/10 Lb Beef: 3x")));
  assert.ok(configuration.ingredientCustomizationLabels.some((label) => label.includes("Tomato: 1x")));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "side"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "drink"));
  assert.ok(configuration.customizations.some((entry) => entry.ingredientId === beefId && entry.orderingGroupId === "9605358905" && entry.orderingOptionId === "43914730758"));
  assert.ok(configuration.customizations.some((entry) => entry.ingredientId === tomatoId && entry.orderingGroupId === "9605358905" && entry.orderingOptionId === "43914730760"));
  assert.ok(configuration.comboNutritionTotals.calories > 0);
  assert.ok(configuration.ingredientCountTotals.calories > 0);

  const restored = getSelectedIngredientCountsFromCustomizations(resolved, getCustomizationLabels(configuration.customizations));
  assert.equal(restored[beefId], 3);
  assert.equal(restored[tomatoId], 1);
});
