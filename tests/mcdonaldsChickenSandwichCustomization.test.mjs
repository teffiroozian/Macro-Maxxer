import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getCustomizationLabels } from "../lib/cart/customizationLabels.ts";
import { resolveStandardItemConfiguration } from "../lib/cart/standardItemConfiguration.ts";
import { resolveComboBundleOptions, resolveComboDrinkOptions, resolveComboSideOptions } from "../lib/comboMeals.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateMcDonaldsCustomizationNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { ingredientIdForComponent } from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const definitions = [
  { slug: "mccrispy", itemId: "203747", orderingItemId: "25120693150", groups: ["9605358994", "9605358995"], optionCount: 12 },
  { slug: "deluxe-mccrispy", itemId: "203745", orderingItemId: "25120693152", groups: ["9605359004", "9605359005"], optionCount: 14 },
  { slug: "spicy-mccrispy", itemId: "203901", orderingItemId: "25120693154", groups: ["9605359014", "9605359015"], optionCount: 11 },
  { slug: "spicy-deluxe-mccrispy", itemId: "203873", orderingItemId: "25120693156", groups: ["9605359024", "9605359025"], optionCount: 15 },
  { slug: "mcchicken", itemId: "200438", orderingItemId: "6600487530", groups: ["7250447673", "7250476487"], optionCount: 11 },
];

const models = new Map();
const reports = new Map();
for (const definition of definitions) {
  models.set(definition.itemId, JSON.parse(await readFile(new URL(`../data/restaurants/mcdonalds/customization/generated/${definition.slug}.json`, import.meta.url), "utf8")));
  reports.set(definition.itemId, JSON.parse(await readFile(new URL(`../data/restaurants/mcdonalds/customization/generated/${definition.slug}-report.json`, import.meta.url), "utf8")));
}

const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const itemFor = (itemId) => menu.items.find((item) => item.id === `mcd-item-${itemId}`);
const resolvedFor = (itemId) => resolvePanelIngredients(itemFor(itemId), menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
const componentFor = (itemId, componentId) => resolvedFor(itemId).find((ingredient) => ingredient.id === ingredientIdForComponent(itemId, componentId));
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);

test("all five chicken sandwich customization models are live and preserve captured identities", () => {
  for (const definition of definitions) {
    const model = models.get(definition.itemId);
    const report = reports.get(definition.itemId);
    const item = itemFor(definition.itemId);
    assert.ok(item?.customization, definition.slug);
    assert.ok(item.ingredients?.length, definition.slug);
    assert.equal(model.orderingItemId, definition.orderingItemId);
    assert.deepEqual(model.groups.map((group) => group.id), definition.groups);
    assert.equal(model.options.length, definition.optionCount);
    assert.equal(report.summary.defaultNutritionValidated, true);
    assert.ok(report.unmatched.every((entry) => entry.name === "Add Ketchup" || (definition.slug === "mcchicken" && entry.name === "Add Pickle")));
    assert.ok(model.options.every((option) => option.name !== "Add Ketchup" && !(definition.slug === "mcchicken" && option.name === "Add Pickle")));
  }
});

test("every supported chicken option applies its validated macro delta", () => {
  for (const definition of definitions) {
    const model = models.get(definition.itemId);
    const contexts = new Map(model.componentContexts.map((context) => [context.id, context]));
    const base = calculateMcDonaldsCustomizationNutrition(model, []);
    for (const option of model.options) {
      const changed = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: option.id }]);
      const context = contexts.get(option.nutritionContextId);
      const sign = option.action === "remove" ? -1 : 1;
      for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
        close(changed[key] - base[key], sign * context.nutrients[key], `${definition.slug}:${option.name}:${key}`);
      }
    }
  }
});

test("standard, deluxe, spicy, and non-spicy recipes retain distinct defaults", () => {
  const defaults = (itemId) => new Map(models.get(itemId).defaultComponents.map((entry) => [entry.componentId, entry.quantity]));
  const standard = defaults("203747");
  const deluxe = defaults("203745");
  const spicy = defaults("203901");
  const spicyDeluxe = defaults("203873");

  assert.equal(standard.get("300310"), 1, "McCrispy defaults butter");
  assert.equal(standard.get("302415"), 1, "McCrispy defaults crinkle pickle");
  assert.equal(standard.has("302376"), false);
  assert.equal(spicy.get("302376"), 1, "Spicy McCrispy defaults spicy sauce");
  assert.equal(spicy.get("302415"), 1);
  assert.equal(spicy.has("300310"), false);

  for (const recipe of [deluxe, spicyDeluxe]) {
    assert.equal(recipe.get("301407"), 1, "Deluxe defaults three-slice tomato portion");
    assert.equal(recipe.get("300098"), 1, "Deluxe defaults lettuce");
    assert.equal(recipe.has("302415"), false, "Deluxe pickle remains add-only");
  }
  assert.equal(deluxe.get("300430"), 1, "regular Deluxe defaults mayonnaise");
  assert.equal(deluxe.has("302376"), false);
  assert.equal(spicyDeluxe.get("302376"), 1, "Spicy Deluxe defaults spicy sauce");
  assert.equal(spicyDeluxe.has("300430"), false, "Spicy Deluxe mayonnaise remains add-only");
});

test("chicken sandwiches expose shared sauces and toppings as nutrition-only Add options", () => {
  for (const definition of definitions) {
    const resolved = resolvedFor(definition.itemId);
    for (const label of ["Mac Sauce", "Ketchup", "McCrispy Ranch Sauce", "Pickle", "Diced Onions", "Slivered Onions"]) {
      const ingredient = resolved.find((candidate) => candidate.label === label);
      assert.ok(ingredient, `${definition.slug}:${label}`);
      assert.equal(ingredient.defaultCount, 0, `${definition.slug}:${label}`);
      if (label !== "McCrispy Ranch Sauce") {
        assert.deepEqual(ingredient.orderingOptionIdByCount, {}, `${definition.slug}:${label}`);
      }
    }
    assert.ok(resolved.some((ingredient) => ingredient.label === "Shredded Lettuce"));
    assert.ok(resolved.some((ingredient) => ingredient.label === "Tomato"));
    assert.ok(resolved.some((ingredient) => /Bacon$/.test(ingredient.label)));
    assert.ok(resolved.some((ingredient) => ingredient.label === "American Cheese"));
  }
});

test("every McCrispy variant uses official captured roll, filet, pickle, sauce, and ranch artwork", () => {
  for (const definition of definitions.filter(({ itemId }) => itemId !== "200438")) {
    const resolved = resolvedFor(definition.itemId);
    const roll = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, "302402"));
    const filet = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, "302309"));
    const ranch = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, "204161"));
    const pickle = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, "302415"));
    const spicySauce = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, "302376"));
    assert.match(roll?.ingredientItem.image ?? "", /\/t-potato-roll\?fmt=png-alpha$/);
    assert.match(filet?.ingredientItem.image ?? "", /\/t-crispy-chicken-fillet\?fmt=png-alpha$/);
    assert.match(ranch?.ingredientItem.image ?? "", /\/DC_Ingredient_Condiment_202203_02861-036__0922_CreamyRanch_1564x1564-1\?fmt=png-alpha$/);
    assert.match(pickle?.ingredientItem.image ?? "", /\/t-crinkle-cut-pickle\?fmt=png-alpha$/);
    assert.match(spicySauce?.ingredientItem.image ?? "", /\/t-original-spicy-sauce\?fmt=png-alpha$/);
  }
});

test("McChicken uses its specific patty, bun, and two-half-strip bacon contexts", () => {
  const patty = componentFor("200438", "300708");
  const bun = componentFor("200438", "301578");
  const bacon = componentFor("200438", "300163");
  assert.match(patty.ingredientItem.image ?? "", /\/mcchicken\?fmt=png-alpha$/);
  assert.deepEqual([patty.defaultCount, patty.maxQuantity], [1, 2]);
  assert.equal(patty.orderingOptionIdByCount[0], "40538345648");
  assert.equal(patty.orderingOptionIdByCount[2], "40538308605");
  assert.deepEqual([bun.defaultCount, bun.maxQuantity], [1, 1]);
  assert.equal(bun.orderingOptionIdByCount[0], "31802108807");
  assert.deepEqual([bacon.defaultCount, bacon.maxQuantity], [0, 1]);
  assert.equal(bacon.label, "2 Half Strips Bacon");
  close(bacon.nutrition.calories, 71.8990763346, "McChicken bacon calories");
  close(bacon.nutrition.protein, 3.9121939386, "McChicken bacon protein");
  assert.equal(bacon.orderingOptionIdByCount[1], "31802112909");
});

test("chicken modifiers retain ordering ids through cart/edit restoration", () => {
  const cases = [
    { itemId: "203747", componentId: "300310", count: 0, groupId: "9605358994", optionId: "43914731436" },
    { itemId: "203745", componentId: "301407", count: 2, groupId: "9605359005", optionId: "43914731506" },
    { itemId: "203901", componentId: "302376", count: 2, groupId: "9605359015", optionId: "43914731570" },
    { itemId: "203873", componentId: "300430", count: 1, groupId: "9605359025", optionId: "43914731638" },
    { itemId: "200438", componentId: "300708", count: 2, groupId: "7250476487", optionId: "40538308605" },
  ];
  for (const entry of cases) {
    const item = itemFor(entry.itemId);
    const resolved = resolvedFor(entry.itemId);
    const ingredientId = ingredientIdForComponent(entry.itemId, entry.componentId);
    const configuration = resolveStandardItemConfiguration({
      item, resolvedIngredients: resolved, selectedIngredientCounts: { [ingredientId]: entry.count },
      selectedAddons: {}, selectedSauceCounts: {}, comboSides: [], comboDrinks: [],
      isComboEligibleCategory: false, comboType: "just-item",
    });
    const customization = configuration.customizations.find((candidate) => candidate.ingredientId === ingredientId);
    assert.equal(customization.orderingGroupId, entry.groupId);
    assert.equal(customization.orderingOptionId, entry.optionId);
    const restored = getSelectedIngredientCountsFromCustomizations(resolved, getCustomizationLabels(configuration.customizations));
    assert.equal(restored[ingredientId], entry.count);
  }
});

test("McCrispy customization coexists with existing meal side and drink selections", () => {
  for (const definition of definitions.filter(({ itemId }) => itemId !== "200438")) {
    const item = itemFor(definition.itemId);
    const resolved = resolvedFor(definition.itemId);
    const proteinComponent = definition.itemId === "200438" ? "300708" : "302309";
    const proteinId = ingredientIdForComponent(definition.itemId, proteinComponent);
    const protein = resolved.find((ingredient) => ingredient.id === proteinId);
    const sides = resolveComboSideOptions("mcdonalds", item, menu.items);
    const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
    assert.ok(sides.length, `${definition.slug} side choices`);
    assert.ok(drinks.length, `${definition.slug} drink choices`);
    const side = sides[0]; const drink = drinks[0];
    const configuration = resolveStandardItemConfiguration({
      item, resolvedIngredients: resolved, selectedIngredientCounts: { [proteinId]: protein.defaultCount + 1 },
      selectedAddons: {}, selectedSauceCounts: {}, comboSides: sides, comboDrinks: drinks,
      isComboEligibleCategory: true, comboType: "combo-meal",
      selectedComboSideId: side.id, selectedComboSideVariantId: side.variants?.[0]?.id,
      selectedComboDrinkId: drink.id, selectedComboDrinkVariantId: drink.variants?.[0]?.id,
    });
    assert.ok(configuration.customizations.some((entry) => entry.ingredientId === proteinId && entry.orderingOptionId));
    assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "side"));
    assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "drink"));
    assert.ok(configuration.ingredientCountTotals.calories > 0);
    assert.ok(configuration.comboNutritionTotals.calories >= 0);
  }
});

test("McChicken customization coexists with its fixed value-deal bundle", () => {
  const itemId = "200438";
  const item = itemFor(itemId);
  const resolved = resolvedFor(itemId);
  const pattyId = ingredientIdForComponent(itemId, "300708");
  const bundles = resolveComboBundleOptions("mcdonalds", item, menu.items);
  assert.equal(bundles.length, 1);
  const configuration = resolveStandardItemConfiguration({
    item, resolvedIngredients: resolved, selectedIngredientCounts: { [pattyId]: 2 },
    selectedAddons: {}, selectedSauceCounts: {}, comboSides: [], comboDrinks: [], comboBundles: bundles,
    isComboEligibleCategory: true, comboType: "combo-meal", selectedComboBundleId: bundles[0].id,
  });
  assert.ok(configuration.customizations.some((entry) => entry.ingredientId === pattyId && entry.orderingOptionId === "40538308605"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "included-entree"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "included-side"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "included-drink"));
  assert.ok(configuration.ingredientCountTotals.calories > 0);
  assert.ok(configuration.comboNutritionTotals.calories > 0);
});
