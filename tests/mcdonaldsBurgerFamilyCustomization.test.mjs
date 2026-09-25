import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";
import { calculateMcDonaldsCustomizationNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { ingredientIdForComponent } from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { getCustomizationLabels } from "../lib/cart/customizationLabels.ts";
import { resolveStandardItemConfiguration } from "../lib/cart/standardItemConfiguration.ts";
import { resolveComboBundleOptions, resolveComboDrinkOptions, resolveComboSideOptions } from "../lib/comboMeals.ts";

const definitions = [
  { slug: "cheeseburger", itemId: "200480", orderingItemId: "25120693146", groups: ["9605358974", "9605358975"] },
  { slug: "hamburger", itemId: "200477", orderingItemId: "6600487523", groups: ["5831795354", "5831795355"] },
  { slug: "mcdouble", itemId: "200491", orderingItemId: "6600487528", groups: ["7250460590", "7250464459"] },
  { slug: "double-cheeseburger", itemId: "200486", orderingItemId: "6600487519", groups: ["5831795346", "5831795347"] },
  { slug: "quarter-pounder-deluxe", itemId: "200765", orderingItemId: "25120693140", groups: ["9605358944", "9605358945"] },
  { slug: "double-quarter-pounder", itemId: "200476", orderingItemId: "25120693136", groups: ["9605358924", "9605358925"] },
  { slug: "bacon-quarter-pounder", itemId: "203410", orderingItemId: "25120693138", groups: ["9605358934", "9605358935"] },
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
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);

test("all seven fully captured burger models are live", () => {
  for (const definition of definitions) {
    const model = models.get(definition.itemId);
    const report = reports.get(definition.itemId);
    const item = itemFor(definition.itemId);
    assert.ok(item?.customization, definition.slug);
    assert.ok(item.ingredients?.length, definition.slug);
    assert.equal(model.orderingItemId, definition.orderingItemId);
    assert.deepEqual(model.groups.map((group) => group.id), definition.groups);
    assert.equal(report.summary.defaultNutritionValidated, true);
    assert.equal(report.summary.unmatched, definition.slug === "quarter-pounder-deluxe" ? 1 : 2);
    assert.ok(report.unmatched.every((entry) => /salt/i.test(entry.name)));
    assert.ok(model.options.every((option) => !/salt/i.test(option.name)));
  }
});

test("burger presentation uses official component images and customer-facing beef names", () => {
  for (const definition of definitions) {
    const resolved = resolvedFor(definition.itemId);
    const visualRows = resolved.filter((ingredient) =>
      ["Bread", "Protein", "Sauces"].includes(ingredient.tabLabel)
    );
    assert.ok(visualRows.length > 0, definition.slug);
    assert.ok(visualRows.every((ingredient) =>
      ingredient.ingredientItem.image?.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/")
    ), `${definition.slug} should use official McDonald's component images`);
    assert.ok(resolved
      .filter((ingredient) => ingredient.tabLabel === "Protein")
      .every((ingredient) => /100% Beef Patt(?:y|ies)$/.test(ingredient.label)));
  }

  for (const itemId of ["200480", "200477", "200491", "200486"]) {
    const bun = resolvedFor(itemId).find((ingredient) => ingredient.label === "Regular Bun");
    assert.match(bun?.ingredientItem.image ?? "", /\/regular_bun\?fmt=png-alpha$/);
  }
});

test("each burger exposes the shared sauce library while preserving item-specific ordering ids", () => {
  const expectedSauces = {
    "200480": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "200477": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "200491": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "200486": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "200765": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "200476": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
    "203410": ["Mac Sauce", "McCrispy Ranch Sauce", "Mustard", "Ketchup", "Mayonnaise"],
  };
  for (const [itemId, expected] of Object.entries(expectedSauces)) {
    const sauces = resolvedFor(itemId).filter((ingredient) => ingredient.tabLabel === "Sauces");
    assert.deepEqual(sauces.map((ingredient) => ingredient.label).sort(), [...expected].sort(), itemId);
    assert.ok(sauces.every((ingredient) => ingredient.defaultCount > 0 || ingredient.maxQuantity === 1), itemId);
    assert.match(
      sauces.find((ingredient) => ingredient.label === "McCrispy Ranch Sauce")?.ingredientItem.image ?? "",
      /DC_Ingredient_Condiment_202203_02861-036__0922_CreamyRanch_1564x1564-1\?fmt=png-alpha$/,
    );
  }
});

test("burgers expose the complete shared topping library as default or Add", () => {
  for (const definition of definitions) {
    const resolved = resolvedFor(definition.itemId);
    for (const componentId of ["300042", "300041", "301502", "300098", "301407", "300163", "301518"]) {
      assert.ok(
        resolved.some((ingredient) => ingredient.id === ingredientIdForComponent(definition.itemId, componentId)),
        `${definition.slug}:${componentId}`,
      );
    }
  }
});

test("Cheeseburger Mac Sauce adds macros and restores without an ordering id", () => {
  const itemId = "200480";
  const item = itemFor(itemId);
  const resolved = resolvedFor(itemId);
  const macSauce = resolved.find((ingredient) => ingredient.label === "Mac Sauce");
  assert.ok(macSauce);
  const configuration = resolveStandardItemConfiguration({
    item, resolvedIngredients: resolved, selectedIngredientCounts: { [macSauce.id]: 1 },
    selectedAddons: {}, selectedSauceCounts: {}, comboSides: [], comboDrinks: [],
    isComboEligibleCategory: false, comboType: "just-item",
  });
  const customization = configuration.customizations.find((entry) => entry.ingredientId === macSauce.id);
  assert.deepEqual([customization.action, customization.orderingGroupId, customization.orderingOptionId], ["add", undefined, undefined]);
  close(configuration.ingredientCountTotals.calories, macSauce.nutrition.calories, "Cheeseburger Mac Sauce calories");
  const restored = getSelectedIngredientCountsFromCustomizations(
    resolved,
    getCustomizationLabels(configuration.customizations),
    configuration.customizations,
  );
  assert.equal(restored[macSauce.id], 1);
});

test("every supported burger option applies exactly one captured nutrition delta", () => {
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

test("single-patty burgers preserve their captured default and maximum counts", () => {
  const hamburger = resolvedFor("200477");
  const cheeseburger = resolvedFor("200480");
  const hamburgerBeef = hamburger.find((ingredient) => ingredient.id === ingredientIdForComponent("200477", "300038"));
  const cheeseburgerBeef = cheeseburger.find((ingredient) => ingredient.id === ingredientIdForComponent("200480", "300038"));
  const cheese = cheeseburger.find((ingredient) => ingredient.id === ingredientIdForComponent("200480", "301518"));
  assert.deepEqual([hamburgerBeef.defaultCount, hamburgerBeef.maxQuantity], [1, 1]);
  assert.deepEqual([cheeseburgerBeef.defaultCount, cheeseburgerBeef.maxQuantity], [1, 1]);
  assert.deepEqual([cheese.defaultCount, cheese.maxQuantity], [1, 2]);
  assert.equal(hamburgerBeef.orderingOptionIdByCount[0], "23640084803");
  assert.equal(cheese.orderingOptionIdByCount[0], "43914731290");
  assert.equal(cheese.orderingOptionIdByCount[2], "43914731298");
});

test("double-patty burgers expose one, two, and three patties with correct cheese counts", () => {
  for (const [itemId, expectedCheese, removeBeefId, extraBeefId] of [
    ["200491", 1, "31802104021", "31802120721"],
    ["200486", 2, "23640084726", "30184050442"],
  ]) {
    const resolved = resolvedFor(itemId);
    const beef = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(itemId, "300038"));
    const cheese = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent(itemId, "301518"));
    assert.deepEqual([beef.defaultCount, beef.maxQuantity], [2, 3]);
    assert.equal(beef.orderingOptionIdByCount[1], removeBeefId);
    assert.equal(beef.orderingOptionIdByCount[3], extraBeefId);
    assert.equal(cheese.defaultCount, expectedCheese);
    assert.equal(cheese.maxQuantity, expectedCheese + 1);
  }
});

test("Quarter Pounder family preserves patties, cheese, tomato, and bacon portions", () => {
  const deluxe = resolvedFor("200765");
  const double = resolvedFor("200476");
  const bacon = resolvedFor("203410");
  const component = (rows, itemId, componentId) => rows.find((ingredient) => ingredient.id === ingredientIdForComponent(itemId, componentId));
  assert.deepEqual([component(deluxe, "200765", "301574").defaultCount, component(deluxe, "200765", "301574").maxQuantity], [1, 2]);
  assert.deepEqual([component(deluxe, "200765", "301518").defaultCount, component(deluxe, "200765", "301518").maxQuantity], [2, 3]);
  assert.deepEqual([component(deluxe, "200765", "301407").defaultCount, component(deluxe, "200765", "301407").maxQuantity], [1, 2]);
  assert.deepEqual([component(double, "200476", "301574").defaultCount, component(double, "200476", "301574").maxQuantity], [2, 3]);
  assert.deepEqual([component(double, "200476", "301518").defaultCount, component(double, "200476", "301518").maxQuantity], [2, 3]);
  assert.deepEqual([component(bacon, "203410", "300163").defaultCount, component(bacon, "203410", "300163").maxQuantity], [1, 2]);
  assert.equal(component(bacon, "203410", "300163").orderingOptionIdByCount[0], "43914730977");
  assert.equal(component(bacon, "203410", "300163").orderingOptionIdByCount[2], "43914730986");
});

test("each burger family preserves modifier counts and ordering ids through cart/edit restoration", () => {
  const cases = [
    { itemId: "200480", componentId: "300163", count: 1, groupId: "9605358975", optionId: "43914731300" },
    { itemId: "200491", componentId: "300038", count: 3, groupId: "7250464459", optionId: "31802120721" },
    { itemId: "200486", componentId: "301518", count: 1, groupId: "5831795346", optionId: "23640084725" },
    { itemId: "200765", componentId: "301407", count: 2, groupId: "9605358945", optionId: "43914731068" },
    { itemId: "200476", componentId: "301574", count: 1, groupId: "9605358924", optionId: "43914730900" },
    { itemId: "203410", componentId: "300163", count: 0, groupId: "9605358934", optionId: "43914730977" },
  ];
  for (const entry of cases) {
    const item = itemFor(entry.itemId); const resolved = resolvedFor(entry.itemId);
    const ingredientId = ingredientIdForComponent(entry.itemId, entry.componentId);
    const configuration = resolveStandardItemConfiguration({ item, resolvedIngredients: resolved,
      selectedIngredientCounts: { [ingredientId]: entry.count }, selectedAddons: {}, selectedSauceCounts: {},
      comboSides: [], comboDrinks: [], isComboEligibleCategory: false, comboType: "just-item" });
    const customization = configuration.customizations.find((candidate) => candidate.ingredientId === ingredientId);
    assert.equal(customization.orderingGroupId, entry.groupId);
    assert.equal(customization.orderingOptionId, entry.optionId);
    assert.equal(customization.quantity, entry.count);
    const restored = getSelectedIngredientCountsFromCustomizations(resolved, getCustomizationLabels(configuration.customizations));
    assert.equal(restored[ingredientId], entry.count);
  }
});

test("Quarter Pounder family customization coexists with existing combo state", () => {
  for (const itemId of ["200765", "200476", "203410"]) {
    const item = itemFor(itemId); const resolved = resolvedFor(itemId);
    const beefId = ingredientIdForComponent(itemId, "301574");
    const sides = resolveComboSideOptions("mcdonalds", item, menu.items); const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
    const side = sides[0]; const drink = drinks[0]; const sideVariant = side.variants[0]; const drinkVariant = drink.variants?.[0];
    const defaultBeefCount = resolved.find((ingredient) => ingredient.id === beefId).defaultCount;
    const configuration = resolveStandardItemConfiguration({ item, resolvedIngredients: resolved,
      selectedIngredientCounts: { [beefId]: defaultBeefCount + 1 }, selectedAddons: {}, selectedSauceCounts: {},
      comboSides: sides, comboDrinks: drinks, isComboEligibleCategory: true, comboType: "combo-meal",
      selectedComboSideId: side.id, selectedComboSideVariantId: sideVariant.id,
      selectedComboDrinkId: drink.id, selectedComboDrinkVariantId: drinkVariant?.id });
    assert.ok(configuration.customizations.some((entry) => entry.ingredientId === beefId && entry.orderingOptionId));
    assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "side"));
    assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "drink"));
    assert.ok(configuration.ingredientCountTotals.calories > 0);
    assert.ok(configuration.comboNutritionTotals.calories > 0);
  }
});

test("Cheeseburger customization coexists with its required second-entree meal bundle", () => {
  const itemId = "200480"; const item = itemFor(itemId); const resolved = resolvedFor(itemId);
  const cheeseId = ingredientIdForComponent(itemId, "301518");
  const sides = resolveComboSideOptions("mcdonalds", item, menu.items); const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
  const bundles = resolveComboBundleOptions("mcdonalds", item, menu.items);
  const side = sides[0]; const drink = drinks[0]; const bundle = bundles[0];
  const configuration = resolveStandardItemConfiguration({ item, resolvedIngredients: resolved,
    selectedIngredientCounts: { [cheeseId]: 2 }, selectedAddons: {}, selectedSauceCounts: {},
    comboSides: sides, comboDrinks: drinks, comboBundles: bundles, isComboEligibleCategory: true, comboType: "combo-meal",
    selectedComboBundleId: bundle.id, selectedComboSideId: side.id, selectedComboSideVariantId: side.variants[0].id,
    selectedComboDrinkId: drink.id, selectedComboDrinkVariantId: drink.variants?.[0]?.id });
  assert.ok(configuration.customizations.some((entry) => entry.ingredientId === cheeseId && entry.orderingOptionId === "43914731298"));
  assert.ok(configuration.customizations.some((entry) => entry.kind === "combo" && entry.comboRole === "included-entree" && entry.itemId === "mcd-item-204268"));
  assert.ok(configuration.comboNutritionTotals.calories > 0);
});
