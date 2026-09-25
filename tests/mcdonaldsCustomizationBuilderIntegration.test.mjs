import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MCDONALDS_BREAKFAST_COMBO_ENTREE_IDS,
  MCDONALDS_GENERATED_RUNTIME_MENU,
  MCDONALDS_STANDARD_COMBO_ENTREE_IDS,
} from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";
import {
  ingredientIdForComponent,
  orderingOptionIdForIngredientCount,
} from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { calculateMcDonaldsCustomizationNutrition, toMacroMaxxerNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { resolvePanelIngredientTabs } from "../lib/itemDetails/ingredientResolution.ts";
import { getDefaultIngredientCounts } from "../lib/menuItemCalculations.ts";
import { calculateIngredientCountTotals } from "../lib/menuItemCard/totals.ts";
import {
  buildIngredientCustomizationLabels,
  resolveStandardIngredientCounts,
} from "../lib/cart/standardItemConfiguration.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import {
  isComboMealSelectionComplete,
  isComboMealEligible,
  resolveComboBundleOptions,
  resolveComboChoiceVariantId,
  resolveComboDrinkOptions,
  resolveComboMealConfig,
  resolveComboSideOptions,
} from "../lib/comboMeals.ts";
import {
  buildComboCustomizations,
  buildStandardCartItemPayload,
  calculateStandardItemNutrition,
  resolveStandardComboSelection,
} from "../lib/cart/standardItemConfiguration.ts";
import { getCartItemVariantId } from "../lib/cart/itemAccessors.ts";
import { calculateFullComboNutritionTotals } from "../lib/menuItemCard/totals.ts";

const model = JSON.parse(
  await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/quarter-pounder.json", import.meta.url), "utf8"),
);
const mealItemPage = JSON.parse(
  await readFile(new URL("../data/restaurants/mcdonalds/research/ordering/raw/quarter-pounder-meal-item-page.json", import.meta.url), "utf8"),
);

const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const item = menu.items.find((candidate) => candidate.id === "mcd-item-200466");
const generatedRestaurant = JSON.parse(
  await readFile(new URL("../data/restaurants/mcdonalds/generated/restaurant.json", import.meta.url), "utf8"),
);

function componentIngredientId(componentId) {
  return ingredientIdForComponent("200466", componentId);
}

test("Quarter Pounder with Cheese exposes generic ingredient customization data", () => {
  assert.ok(item, "mcd-item-200466 should exist in the runtime menu");
  assert.equal(item.ingredients.length, model.defaultComponents.length);
  const groupNames = item.customization.ingredientCategories.map((category) => category.name).sort();
  assert.deepEqual(groupNames, ["Bread", "Cheeses", "Protein", "Sauces", "Toppings"]);

  const mappedIngredientIds = new Set(item.customization.ingredientCategories.flatMap((category) => category.ingredients));
  const capturedComponentIds = new Set(model.options.map((option) => componentIngredientId(option.componentId)));
  assert.ok([...capturedComponentIds].every((ingredientId) => mappedIngredientIds.has(ingredientId)));
  assert.ok(mappedIngredientIds.size > capturedComponentIds.size, "shared sandwich ingredients should supplement captured components");
  assert.deepEqual(item.customization.ingredientCategories.map((category) => category.name), [
    "Bread", "Cheeses", "Protein", "Toppings", "Sauces",
  ]);
});

test("lunch salt modifiers stay hidden while captured steak-bagel salt removal is preserved", () => {
  const lunchSalt = menu.ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase() === "salt" && !ingredient.id.startsWith("mcd-safe-200145-")
  );
  assert.equal(lunchSalt.length, 0);
  const breakfastSalt = menu.ingredients.find((ingredient) => ingredient.id === "mcd-safe-200145-salt");
  assert.equal(breakfastSalt.orderingOptionIdByCount[0], "35958009426");
});

test("a non-customizable McDonald's item keeps the plain item view", () => {
  const fries = menu.items.find((candidate) => candidate.name === "French Fries");
  assert.ok(fries);
  assert.equal(fries.ingredients, undefined);
});

test("resolved ingredient tabs merge remove/default/extra states with a live nutrition delta", () => {
  const tabs = resolvePanelIngredientTabs(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const cheeseTab = tabs.find((tab) => tab.label === "Cheeses");
  assert.ok(cheeseTab, "Cheeses tab should render");

  const cheeseId = componentIngredientId("301518");
  const cheese = cheeseTab.ingredients.find((ingredient) => ingredient.id === cheeseId);
  assert.ok(cheese);
  assert.equal(cheese.label, "American Cheese");
  assert.equal(cheese.defaultCount, 1);
  assert.equal(cheese.maxQuantity, 2);
  assert.equal(cheese.orderingOptionIdByCount[0], "43914730822");
  assert.equal(cheese.orderingOptionIdByCount[2], "43914730830");

  // Selecting "No American Cheese" + "Extra Bacon" through the generic
  // count-based pipeline must land on exactly the same nutrition the
  // authoritative McDonald's calculation engine produces for the same two
  // ordering options — proving the builder UI and the ordering-accurate math
  // stay in sync.
  const addBaconId = componentIngredientId("300163");
  const selectedIngredientCounts = { [cheeseId]: 0, [addBaconId]: 1 };
  const ingredientCounts = resolveStandardIngredientCounts({
    resolvedIngredients: resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules),
    selectedIngredientCounts,
  });
  const resolvedIngredients = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const totals = calculateIngredientCountTotals(ingredientCounts, resolvedIngredients);

  const expected = toMacroMaxxerNutrition(
    calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914730822" }, { optionId: "43914730833" }]),
  );
  const expectedBase = toMacroMaxxerNutrition(calculateMcDonaldsCustomizationNutrition(model, []));

  assert.ok(Math.abs(totals.calories - (expected.calories - expectedBase.calories)) < 1e-6);
  assert.ok(Math.abs(totals.protein - (expected.protein - expectedBase.protein)) < 1e-6);
  assert.ok(Math.abs(totals.totalFat - (expected.totalFat - expectedBase.totalFat)) < 1e-6);
});

test("selections round-trip into cart customization labels and back", () => {
  const resolvedIngredients = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const removeBunId = componentIngredientId("301516");
  const addMayoId = componentIngredientId("300430");
  const ingredientCounts = resolveStandardIngredientCounts({
    resolvedIngredients,
    selectedIngredientCounts: { [removeBunId]: 0, [addMayoId]: 1 },
  });

  const labels = buildIngredientCustomizationLabels({ resolvedIngredients, ingredientCounts });
  assert.ok(labels.some((label) => label.includes("Removed")));
  assert.ok(labels.some((label) => label.includes("1x")));

  const roundTrippedCounts = getSelectedIngredientCountsFromCustomizations(resolvedIngredients, labels);
  assert.equal(roundTrippedCounts[removeBunId], 0);
  assert.equal(roundTrippedCounts[addMayoId], 1);

  // Labels remain sufficient for legacy restoration, while new structured
  // cart customizations also persist these ids directly.
  const bun = menu.ingredients.find((ingredient) => ingredient.id === removeBunId);
  const mayo = menu.ingredients.find((ingredient) => ingredient.id === addMayoId);
  assert.equal(orderingOptionIdForIngredientCount(bun, 0), "43914730825");
  assert.equal(orderingOptionIdForIngredientCount(mayo, 1), "43914730836");
});

test("Quarter Pounder meal uses required variant-aware side and drink groups", () => {
  const config = resolveComboMealConfig("mcdonalds", item, menu.items);
  assert.ok(config);
  assert.equal(config.defaultSideId, undefined);
  assert.equal(config.defaultDrinkId, undefined);
  assert.equal(config.sideOptions, undefined);
  assert.equal(config.drinkOptions, undefined);
  assert.deepEqual(
    [config.sideGroup.minSelections, config.sideGroup.maxSelections, config.drinkGroup.minSelections, config.drinkGroup.maxSelections],
    [1, 1, 1, 1],
  );

  const sides = resolveComboSideOptions("mcdonalds", item, menu.items);
  const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
  assert.deepEqual(sides.map((side) => side.id), ["mcd-item-200066"]);
  assert.deepEqual(sides[0].variants.map((variant) => variant.id), ["mcd-item-201234", "mcd-item-200083"]);
  assert.equal(drinks.length, 64);
  assert.deepEqual(drinks.slice(0, 6).map((drink) => drink.id), [
    "mcd-item-200611", "mcd-item-200612", "mcd-item-203057", "mcd-item-203957",
    "mcd-item-200613", "mcd-item-200627",
  ]);
  assert.equal(config.sizeGroup.orderingGroupId, "5831777633");
  assert.equal(config.sideGroup.orderingGroupId, "5831777634");
  assert.equal(config.drinkGroup.orderingGroupId, "5831777635");
  assert.equal(config.drinkGroup.options[0].orderingOptionId, "23640085807");
  assert.deepEqual(config.sizeGroup.defaultOrderingOptionIds, []);
  assert.deepEqual(config.sideGroup.defaultOrderingOptionIds, ["23640085806"]);
  assert.deepEqual(config.drinkGroup.defaultOrderingOptionIds, []);
  // Every enabled drink identity originates in the saved DoorDash group;
  // nutrition/catalog identity is joined separately by the adapter.
  const rawDrinkIds = new Set(mealItemPage.data.itemPage.optionLists.find((group) => group.id === "5831777635").options.map((option) => option.id));
  assert.ok(config.drinkGroup.options.every((option) => rawDrinkIds.has(option.orderingOptionId)));

  const fountain = drinks.find((drink) => drink.id === "mcd-item-200611");
  assert.deepEqual(fountain.variants.map((variant) => variant.id), ["mcd-item-200639", "mcd-item-200632"]);
  assert.notEqual(fountain.hideVariantSelector, true);
  assert.equal(fountain.comboOrdering.optionId, "23640085807");
  const fixedFrappe = drinks.find((drink) => drink.id === "mcd-item-200149");
  assert.deepEqual(fixedFrappe.variants.map((variant) => variant.id), ["mcd-item-200564"]);
  assert.equal(fixedFrappe.comboOrdering.optionId, "29982629327");

  assert.equal(isComboMealSelectionComplete({ config, comboType: "combo-meal" }), false);
  assert.equal(isComboMealSelectionComplete({
    config,
    comboType: "combo-meal",
    selectedSideId: sides[0].id,
    selectedSideVariantId: sides[0].variants[0].id,
    selectedDrinkId: drinks[0].id,
    selectedDrinkVariantId: drinks[0].variants[0].id,
  }), true);
});

test("verified standard lunch entrees reuse the generic side and drink builder", () => {
  for (const itemId of MCDONALDS_STANDARD_COMBO_ENTREE_IDS) {
    const entree = menu.items.find((candidate) => candidate.id === itemId);
    assert.ok(entree, `missing standard combo entree ${itemId}`);
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items);
    assert.ok(config, `${entree.name} should expose a combo`);
    assert.equal(config.entreeItemId, entree.id);
    assert.equal(resolveComboSideOptions("mcdonalds", entree, menu.items).length, 1);
    assert.equal(resolveComboDrinkOptions("mcdonalds", entree, menu.items).length, 64);
    assert.equal(config.sizeGroup.orderingGroupId, "5831777633");
    assert.equal(config.sideGroup.orderingGroupId, "5831777634");
    assert.equal(config.drinkGroup.orderingGroupId, "5831777635");
  }
});

test("reviewed breakfast meal links use only hash browns and captured coffee", () => {
  for (const itemId of MCDONALDS_BREAKFAST_COMBO_ENTREE_IDS) {
    const entree = menu.items.find((candidate) => candidate.id === itemId);
    assert.ok(entree, `missing breakfast combo entree ${itemId}`);
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items);
    assert.ok(config, `${entree.name} should expose a breakfast combo`);
    assert.equal(config.entreeItemId, entree.id);
    assert.deepEqual(config.sideOptions, ["mcd-item-200340"]);
    assert.deepEqual(config.drinkOptions, ["mcd-item-200020"]);
    assert.deepEqual(
      resolveComboSideOptions("mcdonalds", entree, menu.items).map((option) => option.id),
      ["no-side", "mcd-item-200340"],
    );
    assert.deepEqual(
      resolveComboDrinkOptions("mcdonalds", entree, menu.items).map((option) => option.id),
      ["no-drink", "mcd-item-200020"],
    );
  }
});

test("breakfast combo nutrition and structured cart selections round-trip without invented ordering ids", () => {
  const entree = menu.items.find((candidate) => candidate.id === "mcd-item-200298");
  const sides = resolveComboSideOptions("mcdonalds", entree, menu.items);
  const drinks = resolveComboDrinkOptions("mcdonalds", entree, menu.items);
  const side = sides.find((candidate) => candidate.id === "mcd-item-200340");
  const drink = drinks.find((candidate) => candidate.id === "mcd-item-200020");
  const drinkVariant = drink.variants.find((variant) => variant.id === "mcd-item-200543");
  assert.ok(side);
  assert.ok(drinkVariant);

  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboSide: side,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  assert.equal(comboNutrition.calories, side.nutrition.calories + drinkVariant.nutrition.calories);

  const customizations = buildComboCustomizations({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboSide: side,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  const componentRows = customizations.filter((entry) => entry.comboRole !== "meal");
  assert.deepEqual(componentRows.map(({ comboRole, itemId, variantId }) => ({ comboRole, itemId, variantId })), [
    { comboRole: "side", itemId: "mcd-item-200340", variantId: undefined },
    { comboRole: "drink", itemId: "mcd-item-200020", variantId: "mcd-item-200543" },
  ]);
  assert.ok(componentRows.every((entry) => entry.orderingGroupId === undefined && entry.orderingOptionId === undefined));

  const restored = resolveStandardComboSelection({
    comboSides: sides,
    comboDrinks: drinks,
    selectedComboSideId: componentRows[0].itemId,
    selectedComboDrinkId: componentRows[1].itemId,
    selectedComboDrinkVariantId: componentRows[1].variantId,
  });
  assert.equal(restored.selectedComboSide.id, side.id);
  assert.equal(restored.selectedComboDrink.id, drink.id);
  assert.equal(restored.selectedComboDrinkVariant.id, drinkVariant.id);
});

test("reviewed McDonald's meal records link to their actual entrees", () => {
  const expectedLinks = {
    "mcd-item-200714": "mcd-item-200307",
    "mcd-item-200715": "mcd-item-200304",
    "mcd-item-200717": "mcd-item-200306",
    "mcd-item-200723": "mcd-item-200300",
    "mcd-item-200724": "mcd-item-200161",
    "mcd-item-200731": "mcd-item-200302",
    "mcd-item-200739": "mcd-item-200298",
    "mcd-item-204534": "mcd-item-203410",
    "mcd-item-204535": "mcd-item-200765",
    "mcd-item-204558": "mcd-item-200424",
    "mcd-item-200716": "mcd-item-200267",
    "mcd-item-204559": "mcd-item-200145",
    "mcd-item-204409": "mcd-item-204401",
    "mcd-item-204410": "mcd-item-204402",
  };
  for (const [mealId, entreeId] of Object.entries(expectedLinks)) {
    const meal = generatedRestaurant.items.find((candidate) => candidate.id === mealId);
    assert.ok(meal, `missing reviewed meal ${mealId}`);
    assert.equal(meal.comboConfig.entreeItemId, entreeId);
    assert.ok(!meal.comboConfig.includedItemIds?.includes(entreeId));
  }
});

test("every captured McDonald's meal component is represented by its routed entree, fixed bundle, side, or drink", () => {
  const capturedMeals = generatedRestaurant.items.filter((candidate) => ["combo", "kids"].includes(candidate.servingType));
  assert.equal(capturedMeals.length, 33);
  const capturedSelectableSideIds = new Set(["mcd-item-201234", "mcd-item-200340"]);
  const capturedSelectableDrinkIds = new Set(["mcd-item-201191", "mcd-item-201228", "mcd-item-200020", "mcd-item-200610"]);

  for (const capturedMeal of capturedMeals) {
    const capturedComponentIds = capturedMeal.source.generated.nutrition.componentItemIds.map((id) => `mcd-item-${id}`);
    const entreeId = capturedMeal.comboConfig.entreeItemId;
    const entree = menu.items.find((candidate) => candidate.id === entreeId);
    assert.ok(entree, `${capturedMeal.name}: missing routed entree ${entreeId}`);
    const selectedVariantId = entree.variants?.find((variant) => capturedComponentIds.includes(variant.id))?.id;
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items, selectedVariantId);
    assert.ok(config, `${capturedMeal.name}: routed entree has no combo configuration`);

    const represented = new Set([selectedVariantId ?? entree.id]);
    const matchingBundle = config.bundleOptions?.find((option) => option.mealItemId === capturedMeal.id);
    matchingBundle?.components.forEach((component) => represented.add(component.variantId ?? component.itemId));

    const sideOptions = resolveComboSideOptions("mcdonalds", entree, menu.items, selectedVariantId);
    const drinkOptions = resolveComboDrinkOptions("mcdonalds", entree, menu.items, selectedVariantId);
    for (const option of sideOptions) {
      if (capturedComponentIds.includes(option.id)) represented.add(option.id);
      option.variants?.forEach((variant) => {
        if (capturedComponentIds.includes(variant.id)) represented.add(variant.id);
      });
    }
    for (const option of drinkOptions) {
      if (capturedComponentIds.includes(option.id)) represented.add(option.id);
      option.variants?.forEach((variant) => {
        if (capturedComponentIds.includes(variant.id)) represented.add(variant.id);
      });
    }
    if (sideOptions.length) capturedComponentIds.filter((id) => capturedSelectableSideIds.has(id)).forEach((id) => represented.add(id));
    if (drinkOptions.length) capturedComponentIds.filter((id) => capturedSelectableDrinkIds.has(id)).forEach((id) => represented.add(id));

    assert.deepEqual(
      [...represented].filter((id) => capturedComponentIds.includes(id)).sort(),
      [...capturedComponentIds].sort(),
      `${capturedMeal.name}: captured component coverage`,
    );
  }
});

test("McNuggets variants keep Happy Meal routing separate from the 10-piece adult meal", () => {
  const nuggets = menu.items.find((candidate) => candidate.id === "mcd-item-200692");
  assert.ok(nuggets);
  const expectedEligibility = {
    "mcd-item-200692": true,
    "mcd-item-200574": true,
    "mcd-item-200567": true,
    "mcd-item-200573": false,
    "mcd-item-200577": false,
  };
  for (const [variantId, expected] of Object.entries(expectedEligibility)) {
    assert.equal(isComboMealEligible("mcdonalds", nuggets, menu.items, variantId), expected, variantId);
    assert.equal(Boolean(resolveComboMealConfig("mcdonalds", nuggets, menu.items, variantId)), expected, variantId);
  }

  const config = resolveComboMealConfig("mcdonalds", nuggets, menu.items, "mcd-item-200567");
  assert.equal(config.mealItemIdByEntreeVariantId["mcd-item-200567"], "mcd-item-200734");
  assert.deepEqual(Object.keys(config.mealItemIdByEntreeVariantId), ["mcd-item-200567"]);
  assert.equal(resolveComboMealConfig("mcdonalds", nuggets, menu.items, "mcd-item-200692").bundleOptions[0].mealItemId, "mcd-item-203634");
  assert.equal(resolveComboMealConfig("mcdonalds", nuggets, menu.items, "mcd-item-200574").bundleOptions[0].mealItemId, "mcd-item-203635");
  assert.equal(resolveComboSideOptions("mcdonalds", nuggets, menu.items, "mcd-item-200567").length, 1);
  assert.equal(resolveComboDrinkOptions("mcdonalds", nuggets, menu.items, "mcd-item-200567").length, 64);
});

test("captured Happy Meals use fixed kids fries, apples, toy, and kids drinks", () => {
  const cases = [
    ["mcd-item-200692", "mcd-item-200692", "mcd-item-203634"],
    ["mcd-item-200692", "mcd-item-200574", "mcd-item-203635"],
    ["mcd-item-200477", undefined, "mcd-item-203633"],
  ];
  for (const [entreeId, variantId, mealId] of cases) {
    const entree = menu.items.find((candidate) => candidate.id === entreeId);
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items, variantId);
    assert.equal(config.bundleOptions[0].mealItemId, mealId);
    const sides = resolveComboSideOptions("mcdonalds", entree, menu.items, variantId);
    const drinks = resolveComboDrinkOptions("mcdonalds", entree, menu.items, variantId);
    const bundles = resolveComboBundleOptions("mcdonalds", entree, menu.items, variantId);
    assert.deepEqual(sides, []);
    assert.deepEqual(drinks.map((drink) => drink.id), [
      "mcd-item-200610", "mcd-item-200607", "mcd-item-200609", "mcd-item-203082",
    ]);
    assert.deepEqual(config.bundleOptions[0].components, [
      { itemId: "mcd-item-200066", variantId: "mcd-item-200092", role: "included-side" },
      { itemId: "mcd-item-200068", role: "included-side" },
      { itemId: "mcd-happy-meal-toy", role: "non-nutrition" },
    ]);
    assert.equal(bundles[0].nutrition.calories, 125);
    assert.equal(config.sideGroup, undefined);
    assert.ok(config.drinkGroup.options.every((option) => !option.orderingOptionId));
  }
});

test("Happy Meal nutrition and fixed components survive structured cart state", () => {
  const nuggets = menu.items.find((candidate) => candidate.id === "mcd-item-200692");
  const variant = nuggets.variants.find((candidate) => candidate.id === "mcd-item-200574");
  const config = resolveComboMealConfig("mcdonalds", nuggets, menu.items, variant.id);
  const drink = resolveComboDrinkOptions("mcdonalds", nuggets, menu.items, variant.id).find((candidate) => candidate.id === "mcd-item-200610");
  const bundle = resolveComboBundleOptions("mcdonalds", nuggets, menu.items, variant.id)[0];
  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
    selectedComboDrink: drink,
  });
  assert.equal(comboNutrition.calories, 110 + 15 + drink.nutrition.calories);
  const total = calculateStandardItemNutrition({
    baseNutrition: variant.nutrition,
    addonTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    ingredientCountTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    comboNutritionTotals: comboNutrition,
  });
  assert.equal(total.calories, variant.nutrition.calories + 110 + 15 + drink.nutrition.calories);
  const customizations = buildComboCustomizations({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
    selectedComboDrink: drink,
  });
  assert.deepEqual(customizations.filter((entry) => entry.bundleId).map(({ comboRole, bundleId, itemId, variantId }) => ({ comboRole, bundleId, itemId, variantId })), [
    { comboRole: "included-side", bundleId: config.defaultBundleId, itemId: "mcd-item-200066", variantId: "mcd-item-200092" },
    { comboRole: "included-side", bundleId: config.defaultBundleId, itemId: "mcd-item-200068", variantId: undefined },
    { comboRole: "non-nutrition", bundleId: config.defaultBundleId, itemId: "mcd-happy-meal-toy", variantId: undefined },
  ]);
  assert.ok(!nuggets.addonRefs?.length, "no captured Happy Meal sauce group should be exposed");
});

test("10-piece McNuggets combo preserves nugget count and totals selected components", () => {
  const nuggets = menu.items.find((candidate) => candidate.id === "mcd-item-200692");
  const nuggetVariant = nuggets.variants.find((variant) => variant.id === "mcd-item-200567");
  const side = resolveComboSideOptions("mcdonalds", nuggets, menu.items, nuggetVariant.id)[0];
  const sideVariant = side.variants.find((variant) => variant.id === "mcd-item-201234");
  const drink = resolveComboDrinkOptions("mcdonalds", nuggets, menu.items, nuggetVariant.id)[0];
  const drinkVariant = drink.variants.find((variant) => variant.id === "mcd-item-200639");
  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboSide: side,
    selectedComboSideVariant: sideVariant,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  const total = calculateStandardItemNutrition({
    baseNutrition: nuggetVariant.nutrition,
    addonTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    ingredientCountTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    comboNutritionTotals: comboNutrition,
  });
  assert.equal(total.calories, nuggetVariant.nutrition.calories + sideVariant.nutrition.calories + drinkVariant.nutrition.calories);

  const payload = buildStandardCartItemPayload({
    item: nuggets,
    selectedVariant: nuggetVariant,
    quantity: 1,
    nutritionPerItem: total,
    customizations: buildComboCustomizations({
      isComboEligibleCategory: true,
      comboType: "combo-meal",
      selectedComboSide: side,
      selectedComboSideVariant: sideVariant,
      selectedComboDrink: drink,
      selectedComboDrinkVariant: drinkVariant,
    }),
  });
  assert.equal(payload.variantId, "mcd-item-200567");
  assert.equal(getCartItemVariantId(payload), "mcd-item-200567");
});

test("Snack Wrap anchors expose distinct captured bundle compositions", () => {
  const ranch = menu.items.find((candidate) => candidate.id === "mcd-item-204401");
  const spicy = menu.items.find((candidate) => candidate.id === "mcd-item-204402");
  const ranchBundles = resolveComboBundleOptions("mcdonalds", ranch, menu.items);
  const spicyBundles = resolveComboBundleOptions("mcdonalds", spicy, menu.items);
  assert.deepEqual(ranchBundles.map((bundle) => [bundle.id, bundle.name, bundle.nutrition.calories]), [
    ["mcd-bundle-204409", "2 Ranch Snack Wraps", 390],
    ["mcd-bundle-204406-ranch", "1 Ranch + 1 Spicy Snack Wrap", spicy.nutrition.calories],
  ]);
  assert.deepEqual(spicyBundles.map((bundle) => [bundle.id, bundle.name, bundle.nutrition.calories]), [
    ["mcd-bundle-204410", "2 Spicy Snack Wraps", 380],
    ["mcd-bundle-204406-spicy", "1 Ranch + 1 Spicy Snack Wrap", ranch.nutrition.calories],
  ]);
  assert.deepEqual(
    ranch.comboConfig.bundleOptions.map(({ mealItemId, components }) => ({ mealItemId, components })),
    [
      { mealItemId: "mcd-item-204409", components: [{ itemId: "mcd-item-204408", role: "included-entree" }] },
      { mealItemId: "mcd-item-204406", components: [{ itemId: "mcd-item-204402", role: "included-entree" }] },
    ],
  );
  assert.deepEqual(
    spicy.comboConfig.bundleOptions.map(({ mealItemId, components }) => ({ mealItemId, components })),
    [
      { mealItemId: "mcd-item-204410", components: [{ itemId: "mcd-item-204407", role: "included-entree" }] },
      { mealItemId: "mcd-item-204406", components: [{ itemId: "mcd-item-204401", role: "included-entree" }] },
    ],
  );
});

test("Snack Wrap bundle nutrition and structured cart identity round-trip", () => {
  const ranch = menu.items.find((candidate) => candidate.id === "mcd-item-204401");
  const bundle = resolveComboBundleOptions("mcdonalds", ranch, menu.items).find((candidate) => candidate.id === "mcd-bundle-204406-ranch");
  const side = resolveComboSideOptions("mcdonalds", ranch, menu.items)[0];
  const sideVariant = side.variants.find((variant) => variant.id === "mcd-item-201234");
  const drink = resolveComboDrinkOptions("mcdonalds", ranch, menu.items)[0];
  const drinkVariant = drink.variants.find((variant) => variant.id === "mcd-item-200639");
  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
    selectedComboSide: side,
    selectedComboSideVariant: sideVariant,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  const total = calculateStandardItemNutrition({
    baseNutrition: ranch.nutrition,
    addonTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    ingredientCountTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    comboNutritionTotals: comboNutrition,
  });
  assert.equal(total.calories, ranch.nutrition.calories + bundle.nutrition.calories + sideVariant.nutrition.calories + drinkVariant.nutrition.calories);
  const customizations = buildComboCustomizations({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
    selectedComboSide: side,
    selectedComboSideVariant: sideVariant,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  const included = customizations.find((entry) => entry.comboRole === "included-entree");
  assert.deepEqual(
    { bundleId: included.bundleId, itemId: included.itemId, orderingGroupId: included.orderingGroupId, orderingOptionId: included.orderingOptionId },
    { bundleId: "mcd-bundle-204406-ranch", itemId: "mcd-item-204402", orderingGroupId: undefined, orderingOptionId: undefined },
  );
  const restored = resolveStandardComboSelection({
    comboBundles: resolveComboBundleOptions("mcdonalds", ranch, menu.items),
    comboSides: [side],
    comboDrinks: [drink],
    selectedComboBundleId: included.bundleId,
    selectedComboSideId: side.id,
    selectedComboSideVariantId: sideVariant.id,
    selectedComboDrinkId: drink.id,
    selectedComboDrinkVariantId: drinkVariant.id,
  });
  assert.equal(restored.selectedComboBundle.id, "mcd-bundle-204406-ranch");
  assert.equal(restored.selectedComboSideVariant.id, sideVariant.id);
  assert.equal(restored.selectedComboDrinkVariant.id, drinkVariant.id);
});

test("unusual captured meals preserve their required fixed component, role, nutrition, and cart identity", () => {
  const cases = [
    ["mcd-item-203745", "mcd-item-204364", "mcd-item-200007", "included-dessert", 230],
    ["mcd-item-200480", "mcd-item-203451", "mcd-item-204268", "included-entree", 300],
    ["mcd-item-200267", "mcd-item-200716", "mcd-item-204339", "included-entree", 310],
  ];
  for (const [entreeId, mealItemId, componentId, role, calories] of cases) {
    const entree = menu.items.find((candidate) => candidate.id === entreeId);
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items);
    const bundle = resolveComboBundleOptions("mcdonalds", entree, menu.items)[0];
    assert.equal(config.bundleOptions[0].mealItemId, mealItemId);
    assert.deepEqual(config.bundleOptions[0].components, [{ itemId: componentId, role }]);
    assert.equal(bundle.nutrition.calories, calories);
    const customizations = buildComboCustomizations({
      isComboEligibleCategory: true,
      comboType: "combo-meal",
      selectedComboBundle: bundle,
    });
    const fixedComponent = customizations.find((entry) => entry.bundleId === bundle.id);
    assert.deepEqual(
      { comboRole: fixedComponent.comboRole, itemId: fixedComponent.itemId, bundleId: fixedComponent.bundleId },
      { comboRole: role, itemId: componentId, bundleId: bundle.id },
    );
    const restored = resolveStandardComboSelection({
      comboBundles: [bundle],
      comboSides: [],
      comboDrinks: [],
      selectedComboBundleId: fixedComponent.bundleId,
    });
    assert.equal(restored.selectedComboBundle.id, bundle.id);
  }
});

test("captured value deals expose only their exact fixed components", () => {
  const cases = [
    ["mcd-item-200438", "mcd-item-204350", ["mcd-item-200692", "mcd-item-200066", "mcd-item-201677"]],
    ["mcd-item-200491", "mcd-item-204349", ["mcd-item-200692", "mcd-item-200066", "mcd-item-201677"]],
    ["mcd-item-200301", "mcd-item-204650", ["mcd-item-200340", "mcd-item-200020"]],
    ["mcd-item-200449", "mcd-item-204651", ["mcd-item-200340", "mcd-item-200020"]],
  ];
  for (const [itemId, mealItemId, includedItemIds] of cases) {
    const entree = menu.items.find((candidate) => candidate.id === itemId);
    const config = resolveComboMealConfig("mcdonalds", entree, menu.items);
    const bundles = resolveComboBundleOptions("mcdonalds", entree, menu.items);
    assert.equal(config.bundleOptions[0].mealItemId, mealItemId);
    assert.deepEqual(config.bundleOptions[0].components.map((component) => component.itemId), includedItemIds);
    assert.equal(config.defaultBundleId, bundles[0].id);
    assert.deepEqual(resolveComboSideOptions("mcdonalds", entree, menu.items), []);
    assert.deepEqual(resolveComboDrinkOptions("mcdonalds", entree, menu.items), []);
    assert.equal(isComboMealSelectionComplete({
      config,
      comboType: "combo-meal",
      selectedBundleId: bundles[0].id,
    }), true);
  }
});

test("fixed deal nutrition and component identity round-trip through cart state", () => {
  const entree = menu.items.find((candidate) => candidate.id === "mcd-item-200438");
  const bundle = resolveComboBundleOptions("mcdonalds", entree, menu.items)[0];
  assert.equal(bundle.nutrition.calories, 170 + 230 + 200);
  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
  });
  assert.equal(comboNutrition.calories, 600);
  const customizations = buildComboCustomizations({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboBundle: bundle,
  });
  assert.deepEqual(
    customizations.filter((entry) => entry.bundleId).map((entry) => entry.itemId),
    ["mcd-item-200692", "mcd-item-200066", "mcd-item-201677"],
  );
  assert.deepEqual(customizations.filter((entry) => entry.bundleId).map((entry) => entry.comboRole), [
    "included-entree", "included-side", "included-drink",
  ]);
  const restored = resolveStandardComboSelection({
    comboBundles: [bundle],
    comboSides: [],
    comboDrinks: [],
    selectedComboBundleId: customizations.find((entry) => entry.comboRole === "included-entree")?.bundleId,
  });
  assert.equal(restored.selectedComboBundle.id, bundle.id);
  assert.equal(restored.selectedComboSide, undefined);
  assert.equal(restored.selectedComboDrink, undefined);
});

test("source-only meal records remain relationship data rather than duplicate browse cards", () => {
  assert.ok(menu.items.filter((candidate) => candidate.id !== "mcd-item-200720" && candidate.sourceOnly && ["combo", "kids"].includes(candidate.servingType))
    .every((candidate) => candidate.comboConfig === undefined));
});

test("Quarter Pounder meal nutrition and cart state use the selected component variants", () => {
  const sides = resolveComboSideOptions("mcdonalds", item, menu.items);
  const drinks = resolveComboDrinkOptions("mcdonalds", item, menu.items);
  const side = sides[0];
  const sideVariant = side.variants[1];
  const drink = drinks[0];
  const drinkVariant = drink.variants[1];
  const comboNutrition = calculateFullComboNutritionTotals({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboSide: side,
    selectedComboSideVariant: sideVariant,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  const customizedEntreeNutrition = { ...item.nutrition, calories: item.nutrition.calories - 10 };
  const total = calculateStandardItemNutrition({
    baseNutrition: customizedEntreeNutrition,
    addonTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    ingredientCountTotals: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    comboNutritionTotals: comboNutrition,
  });
  assert.equal(total.calories, customizedEntreeNutrition.calories + sideVariant.nutrition.calories + drinkVariant.nutrition.calories);
  for (const macro of ["calories", "protein", "carbs", "totalFat"]) {
    assert.equal(comboNutrition[macro], sideVariant.nutrition[macro] + drinkVariant.nutrition[macro]);
  }

  const customizations = buildComboCustomizations({
    isComboEligibleCategory: true,
    comboType: "combo-meal",
    selectedComboSide: side,
    selectedComboSideVariant: sideVariant,
    selectedComboDrink: drink,
    selectedComboDrinkVariant: drinkVariant,
  });
  assert.deepEqual(
    customizations.filter((entry) => entry.comboRole !== "meal").map(({ comboRole, itemId, variantId, orderingGroupId, orderingOptionId }) => ({ comboRole, itemId, variantId, orderingGroupId, orderingOptionId })),
    [
      { comboRole: "size", itemId: undefined, variantId: undefined, orderingGroupId: "5831777633", orderingOptionId: "28828769447" },
      { comboRole: "side", itemId: side.id, variantId: sideVariant.id, orderingGroupId: "5831777634", orderingOptionId: "23640085806" },
      { comboRole: "drink", itemId: drink.id, variantId: drinkVariant.id, orderingGroupId: "5831777635", orderingOptionId: "23640085807" },
    ],
  );
});

test("meal size switches fries and verified fountains but not fixed drinks", () => {
  const config = resolveComboMealConfig("mcdonalds", item, menu.items);
  assert.equal(resolveComboChoiceVariantId({ config, role: "side", itemId: "mcd-item-200066", mealSize: "medium" }), "mcd-item-201234");
  assert.equal(resolveComboChoiceVariantId({ config, role: "side", itemId: "mcd-item-200066", mealSize: "large" }), "mcd-item-200083");
  assert.equal(resolveComboChoiceVariantId({ config, role: "drink", itemId: "mcd-item-200611", mealSize: "medium" }), "mcd-item-200639");
  assert.equal(resolveComboChoiceVariantId({ config, role: "drink", itemId: "mcd-item-200611", mealSize: "large" }), "mcd-item-200632");
  assert.equal(resolveComboChoiceVariantId({ config, role: "drink", itemId: "mcd-item-200149", mealSize: "medium" }), "mcd-item-200564");
  assert.equal(resolveComboChoiceVariantId({ config, role: "drink", itemId: "mcd-item-200149", mealSize: "large" }), "mcd-item-200564");
});

test("included rows use normal names and official component images in requested order", () => {
  const tabs = resolvePanelIngredientTabs(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const included = tabs.find((tab) => tab.label === "Included");
  assert.ok(included);
  assert.deepEqual(included.ingredients.map((ingredient) => ingredient.label), [
    "Sesame Seed Bun", "American Cheese", "Quarter Pound 100% Beef Patty", "Slivered Onions", "Pickle", "Mustard", "Ketchup",
  ]);
  assert.ok(included.ingredients.every((ingredient) => !ingredient.label.startsWith("No ")));
  assert.ok(included.ingredients.every((ingredient) => ingredient.icon.includes("s7d1.scene7.com/is/image/mcdonalds/")));
  const bacon = tabs.find((tab) => tab.label === "Toppings").ingredients.find((ingredient) => ingredient.label.includes("Bacon"));
  assert.equal(bacon.defaultCount, 0);
  assert.equal(bacon.maxQuantity, 1);
});

test("default selections produce zero nutrition delta", () => {
  const resolvedIngredients = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
  const defaults = getDefaultIngredientCounts(resolvedIngredients);
  const totals = calculateIngredientCountTotals(defaults, resolvedIngredients);
  assert.equal(totals.calories, 0);
  assert.equal(totals.protein, 0);
  assert.equal(totals.carbs, 0);
  assert.equal(totals.totalFat, 0);
});
