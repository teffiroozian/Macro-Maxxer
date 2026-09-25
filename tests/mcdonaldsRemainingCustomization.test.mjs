import assert from "node:assert/strict";
import test from "node:test";

import { buildIngredientCustomizations } from "../lib/cart/standardItemConfiguration.ts";
import { resolvePanelIngredients, resolvePanelIngredientTabs } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { calculateIngredientCountTotals } from "../lib/menuItemCard/totals.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

function resolved(item) {
  return resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, item.variants, item.defaultVariantId, menu.customizationRules);
}

const breakfastIds = ["200424", "200876", "201030", "200145", "200300", "201256", "200302", "200301", "200304", "200307", "200306", "200298", "200161", "200449"];
const standardizedTabOrder = ["Included", "Bread", "Cheeses", "Protein", "Toppings", "Sauces"];

test("sandwich-style McDonald's customization uses one standardized category order", () => {
  const sandwichItems = menu.items.filter((item) =>
    item.customization?.ingredientCategories?.length &&
    ["Burgers", "Chicken & Fish", "Snack Wraps"].includes(item.categories[0])
  );
  for (const item of sandwichItems) {
    const labels = resolvePanelIngredientTabs(
      item, menu.ingredients, undefined, menu.items, item.variants, item.defaultVariantId, menu.customizationRules,
    ).map((tab) => tab.label);
    assert.ok(labels.every((label) => standardizedTabOrder.includes(label)), `${item.name}: ${labels.join(", ")}`);
    assert.deepEqual(labels, standardizedTabOrder.filter((label) => labels.includes(label)), item.name);
  }
});

test("all 14 captured breakfast sandwiches expose their complete categorized DNA recipes", () => {
  for (const id of breakfastIds) {
    const item = menu.items.find((candidate) => candidate.id === `mcd-item-${id}`);
    assert.ok(item, id);
    const ingredients = resolved(item);
    const componentIds = item.source.generated.menu.componentItemIds;
    const defaultIngredients = ingredients.filter((ingredient) => ingredient.defaultCount > 0);
    const capturedNonDnaDefaults = item.id === "mcd-item-200145" ? 1 : 0;
    assert.equal(defaultIngredients.length, componentIds.length + capturedNonDnaDefaults, item.name);
    assert.ok(defaultIngredients.filter((ingredient) => ingredient.label !== "Salt").every((ingredient) =>
      ingredient.ingredientItem.image?.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/")
    ), `${item.name} official component artwork`);
    assert.ok(item.customization.ingredientCategories.every((category) =>
      ["Bread", "Cheeses", "Protein", "Toppings", "Sauces"].includes(category.name)
    ));
    const categoryNames = item.customization.ingredientCategories.map((category) => category.name);
    assert.deepEqual(categoryNames, standardizedTabOrder.filter((name) => name !== "Included" && categoryNames.includes(name)), item.name);
    for (const ingredient of ingredients) {
      const hasAction = Object.keys(ingredient.orderingOptionIdByCount ?? {}).length > 0;
      assert.equal(ingredient.isReadOnly, !hasAction, `${item.name}:${ingredient.label}`);
    }
  }
});

test("all 14 breakfast ordering graphs expose every captured Remove, Extra, and Add state", () => {
  const expectedControls = new Map([
    ["200424", ["Plain Bagel", "American Cheese Slice", "Folded Egg", "2 Half Strips Bacon", "Breakfast Sauce", "Salted Butter", "Round Egg", "Spicy Pepper Sauce"]],
    ["200876", ["Plain Bagel", "American Cheese Slice", "Folded Egg", "Breakfast Sauce", "Salted Butter", "Spicy Pepper Sauce"]],
    ["201030", ["Plain Bagel", "American Cheese Slice", "Folded Egg", "Sausage Patty", "Breakfast Sauce", "Salted Butter", "Round Egg", "Spicy Pepper Sauce"]],
    ["200145", ["Plain Bagel", "American Cheese Slice", "Breakfast Steak Patty", "Folded Egg", "Grilled Onions", "Breakfast Sauce", "Salted Butter", "Salt", "Round Egg", "Spicy Pepper Sauce"]],
    ["200300", ["Biscuit", "American Cheese", "Folded Egg", "2 Half Strips Bacon", "Round Egg", "Canadian Bacon", "Spicy Pepper Sauce"]],
    ["201256", ["Biscuit", "American Cheese", "Folded Egg"]],
    ["200302", ["Biscuit", "Folded Egg", "Sausage Patty", "American Cheese", "2 Half Strips Bacon", "Round Egg", "Canadian Bacon", "Spicy Pepper Sauce"]],
    ["200301", ["Biscuit", "Sausage Patty", "American Cheese", "2 Half Strips Bacon", "Spicy Pepper Sauce"]],
    ["200304", ["McGriddles Cakes", "American Cheese", "Folded Egg", "2 Half Strips Bacon", "Canadian Bacon", "Round Egg", "Spicy Pepper Sauce"]],
    ["200307", ["McGriddles Cakes", "American Cheese", "Folded Egg", "Sausage Patty", "Round Egg", "2 Half Strips Bacon", "Canadian Bacon", "Spicy Pepper Sauce"]],
    ["200306", ["McGriddles Cakes", "Sausage Patty", "American Cheese", "2 Half Strips Bacon", "Canadian Bacon", "Round Egg", "Folded Egg", "Spicy Pepper Sauce"]],
    ["200298", ["English Muffin", "American Cheese", "Round Egg", "Canadian Bacon", "Salted Butter", "2 Half Strips Bacon", "Spicy Pepper Sauce"]],
    ["200161", ["English Muffin", "American Cheese", "Round Egg", "Sausage Patty", "Salted Butter", "2 Half Strips Bacon", "Canadian Bacon"]],
    ["200449", ["English Muffin", "American Cheese", "Sausage Patty", "Salted Butter", "2 Half Strips Bacon", "Canadian Bacon"]],
  ]);

  for (const [id, expectedLabels] of expectedControls) {
    const item = menu.items.find((candidate) => candidate.id === `mcd-item-${id}`);
    const ingredients = resolved(item);
    const tabs = resolvePanelIngredientTabs(
      item, menu.ingredients, undefined, menu.items, item.variants, item.defaultVariantId, menu.customizationRules,
    );
    assert.ok(tabs.filter((tab) => tab.label !== "Included").every((tab) => tab.selectionMode === "quantity"), item.name);
    const controls = ingredients.filter((ingredient) => Object.keys(ingredient.orderingOptionIdByCount ?? {}).length > 0);
    assert.deepEqual(controls.map((ingredient) => ingredient.label).sort(), [...expectedLabels].sort(), item.name);

    for (const ingredient of controls) {
      for (const [rawCount, optionId] of Object.entries(ingredient.orderingOptionIdByCount)) {
        const count = Number(rawCount);
        assert.ok(optionId, `${item.name}:${ingredient.label}:${count} option`);
        assert.ok(ingredient.orderingGroupIdByCount[count], `${item.name}:${ingredient.label}:${count} group`);
        const counts = Object.fromEntries(ingredients.map((entry) => [entry.id, entry.defaultCount]));
        counts[ingredient.id] = count;
        const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
        const restored = getSelectedIngredientCountsFromCustomizations(ingredients, [], saved);
        assert.equal(restored[ingredient.id], count, `${item.name}:${ingredient.label}:${count} cart/edit`);
      }
    }
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

for (const [id, sauceName, groupId, baconOptionId, tomatoOptionId, cheeseRemoveId, cheeseExtraId] of [
  ["mcd-item-204401", "McCrispy Ranch Sauce", "9999652021", "45501690905", "45501690906", "45501690901", "45501690904"],
  ["mcd-item-204402", "Spicy Pepper Sauce", "9999652023", "45501690913", "45501690914", "45501690909", "45501690912"],
]) {
  test(`${id} exposes its categorized default recipe and validated add-ons`, () => {
    const item = menu.items.find((candidate) => candidate.id === id);
    const ingredients = resolved(item);
    const defaults = ingredients.filter((ingredient) => ingredient.defaultCount === 1);
    assert.deepEqual(defaults.map((ingredient) => ingredient.label).sort(), [
      "Flour Tortilla", "McCrispy Chicken Strip", sauceName, "Shredded Cheese", "Shredded Lettuce",
    ].sort());
    const interactiveDefaults = defaults.filter((ingredient) => !ingredient.isReadOnly);
    assert.deepEqual(interactiveDefaults.map((ingredient) => ingredient.label).sort(), [sauceName, "Shredded Cheese", "Shredded Lettuce"].sort());
    assert.ok(interactiveDefaults.every((ingredient) => ingredient.maxQuantity === 2));
    assert.ok(interactiveDefaults.every((ingredient) => ingredient.orderingOptionIdByCount[0] && ingredient.orderingOptionIdByCount[2]));
    assert.deepEqual(defaults.filter((ingredient) => ingredient.isReadOnly).map((ingredient) => ingredient.label).sort(), [
      "Flour Tortilla", "McCrispy Chicken Strip",
    ].sort());
    assert.ok(defaults.every((ingredient) =>
      ingredient.ingredientItem.image?.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/")
    ));
    assert.deepEqual(item.customization.ingredientCategories.map((category) => category.name), [
      "Bread", "Cheeses", "Protein", "Toppings", "Sauces",
    ]);
    const bacon = ingredients.find((ingredient) => ingredient.label === "2 Half Strips Bacon");
    const tomato = ingredients.find((ingredient) => ingredient.label === "2 Tomato Slices");
    const cheese = ingredients.find((ingredient) => ingredient.label === "Shredded Cheese");
    assert.deepEqual([cheese.defaultCount, cheese.maxQuantity], [1, 2]);
    assert.deepEqual([cheese.orderingOptionIdByCount[0], cheese.orderingOptionIdByCount[2]], [cheeseRemoveId, cheeseExtraId]);
    assert.equal(bacon.tabLabel, "Toppings");
    assert.equal(tomato.tabLabel, "Toppings");
    assert.equal(bacon.defaultCount, 0);
    assert.equal(tomato.defaultCount, 0);
    assert.deepEqual([bacon.orderingGroupIdByCount[1], tomato.orderingGroupIdByCount[1]], [groupId, groupId]);
    assert.deepEqual([bacon.orderingOptionIdByCount[1], tomato.orderingOptionIdByCount[1]], [baconOptionId, tomatoOptionId]);
    assert.match(bacon.icon, /DC_Ingredient_202110_00507-009__6020_ThickCutApplewoodSmokedBacon_1564x1564/);
    assert.match(tomato.icon, /Ingredients_Tomato_180x180/);
    const counts = Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, ingredient.defaultCount]));
    counts[bacon.id] = 1;
    counts[tomato.id] = 1;
    const totals = calculateIngredientCountTotals(counts, ingredients);
    assert.ok(Math.abs(totals.calories - 74.9806763346) < 1e-9);
    assert.ok(Math.abs(totals.protein - 4.0628499386) < 1e-9);
    assert.ok(Math.abs(totals.carbs - 1.337883538) < 1e-9);
    assert.ok(Math.abs(totals.totalFat - 5.9950907014) < 1e-9);
    const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
    const restored = getSelectedIngredientCountsFromCustomizations(ingredients, [], saved);
    assert.equal(restored[bacon.id], 1);
    assert.equal(restored[tomato.id], 1);

    const sauce = ingredients.find((ingredient) => ingredient.label === sauceName);
    const lettuce = ingredients.find((ingredient) => ingredient.label === "Shredded Lettuce");
    const adjustedCounts = Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, ingredient.defaultCount]));
    adjustedCounts[sauce.id] = 0;
    adjustedCounts[lettuce.id] = 2;
    const adjustedTotals = calculateIngredientCountTotals(adjustedCounts, ingredients);
    assert.ok(Math.abs(adjustedTotals.calories - (lettuce.nutrition.calories - sauce.nutrition.calories)) < 1e-9);
    assert.ok(Math.abs(adjustedTotals.protein - (lettuce.nutrition.protein - sauce.nutrition.protein)) < 1e-9);
    assert.ok(Math.abs(adjustedTotals.carbs - (lettuce.nutrition.carbs - sauce.nutrition.carbs)) < 1e-9);
    assert.ok(Math.abs(adjustedTotals.totalFat - (lettuce.nutrition.totalFat - sauce.nutrition.totalFat)) < 1e-9);
    const adjustedSaved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: adjustedCounts });
    const adjustedRestored = getSelectedIngredientCountsFromCustomizations(ingredients, [], adjustedSaved);
    assert.equal(adjustedRestored[sauce.id], 0);
    assert.equal(adjustedRestored[lettuce.id], 2);

    for (const cheeseCount of [0, 2]) {
      const cheeseCounts = Object.fromEntries(ingredients.map((ingredient) => [ingredient.id, ingredient.defaultCount]));
      cheeseCounts[cheese.id] = cheeseCount;
      const cheeseTotals = calculateIngredientCountTotals(cheeseCounts, ingredients);
      const factor = cheeseCount - 1;
      assert.ok(Math.abs(cheeseTotals.calories - factor * cheese.nutrition.calories) < 1e-9);
      assert.ok(Math.abs(cheeseTotals.protein - factor * cheese.nutrition.protein) < 1e-9);
      assert.ok(Math.abs(cheeseTotals.carbs - factor * cheese.nutrition.carbs) < 1e-9);
      assert.ok(Math.abs(cheeseTotals.totalFat - factor * cheese.nutrition.totalFat) < 1e-9);
      const cheeseSaved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: cheeseCounts });
      const cheeseRestored = getSelectedIngredientCountsFromCustomizations(ingredients, [], cheeseSaved);
      assert.equal(cheeseRestored[cheese.id], cheeseCount);
    }
  });
}

test("captured breakfast Spicy Pepper Sauce additions use validated macros and ordering ids", () => {
  const expected = new Map([
    ["mcd-item-200424", "45422012251"], ["mcd-item-200876", "45422012254"],
    ["mcd-item-201030", "45422012252"], ["mcd-item-200145", "45422012253"],
    ["mcd-item-200300", "45142912039"], ["mcd-item-200302", "45142912040"],
    ["mcd-item-200301", "45142912041"], ["mcd-item-200304", "45360452070"],
    ["mcd-item-200307", "45360452072"], ["mcd-item-200306", "45360452071"],
    ["mcd-item-200298", "45422012256"],
  ]);
  for (const [itemId, optionId] of expected) {
    const item = menu.items.find((candidate) => candidate.id === itemId);
    const sauce = resolved(item).find((ingredient) => ingredient.label === "Spicy Pepper Sauce");
    assert.ok(sauce, item.name);
    assert.equal(sauce.defaultCount, 0);
    assert.equal(sauce.orderingOptionIdByCount[1], optionId);
    assert.ok(sauce.orderingGroupIdByCount[1]);
    assert.deepEqual(calculateIngredientCountTotals({ [sauce.id]: 1 }, [sauce]), sauce.nutrition);
  }
});

test("plain bagel and composed breakfast families expose complete captured recipes", () => {
  for (const id of ["201306", "200322", "200323", "200325", "200258", "200284", "200267"]) {
    const item = menu.items.find((candidate) => candidate.id === `mcd-item-${id}`);
    const ingredients = resolved(item);
    const defaultIngredients = ingredients.filter((ingredient) => ingredient.defaultCount > 0);
    assert.equal(defaultIngredients.length, item.source.generated.menu.componentItemIds.length, item.name);
    if (id === "200322" || id === "200323") {
      assert.deepEqual(defaultIngredients.filter((ingredient) => ingredient.isReadOnly).map((ingredient) => ingredient.label), ["Hash Browns"]);
    } else {
      assert.ok(defaultIngredients.every((ingredient) => ingredient.isReadOnly), item.name);
    }
    assert.ok(defaultIngredients.every((ingredient) =>
      ingredient.ingredientItem.image?.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/")
    ), `${item.name} official component artwork`);
  }
});

test("plain Bagel is ingredient-only while remaining available to breakfast recipes", () => {
  const bagel = menu.items.find((candidate) => candidate.id === "mcd-item-201306");
  assert.ok(bagel.sourceOnly);
  assert.equal(bagel.categories[0], "Breakfast");

  const plainBagelIngredients = menu.ingredients.filter((ingredient) =>
    ingredient.canonicalIngredientId === "mcd-component-302369"
  );
  assert.ok(plainBagelIngredients.length > 0);
  assert.ok(plainBagelIngredients.every((ingredient) => ingredient.name === "Plain Bagel"));
  assert.ok(plainBagelIngredients.every((ingredient) => ingredient.categories.includes("Bread")));
  assert.ok(plainBagelIngredients.every((ingredient) => ingredient.image.includes("scene7.com/is/image/mcdonalds/")));
  assert.deepEqual(
    plainBagelIngredients.filter((ingredient) => !ingredient.hideFromIngredientView).map((ingredient) => ingredient.id),
    ["mcd-breakfast-201306-302369"],
  );
});

test("Big Breakfast items make every included component except Hash Browns removable", () => {
  for (const [id, groupId, optionId] of [
    ["mcd-item-200322", "5820739917", "23568342394"],
    ["mcd-item-200323", "5820739920", "23568342411"],
  ]) {
    const item = menu.items.find((candidate) => candidate.id === id);
    const ingredients = resolved(item);
    const ketchup = ingredients.find((ingredient) => ingredient.label === "Ketchup Packet");
    assert.ok(ingredients.filter((ingredient) => ingredient.defaultCount > 0).length >= 6);
    const defaults = ingredients.filter((ingredient) => ingredient.defaultCount > 0);
    const hashBrowns = defaults.find((ingredient) => ingredient.label === "Hash Browns");
    const removable = defaults.filter((ingredient) => ingredient.label !== "Hash Browns");
    assert.ok(hashBrowns?.isReadOnly);
    assert.equal(hashBrowns?.maxQuantity, 1);
    assert.ok(removable.every((ingredient) => !ingredient.isReadOnly && ingredient.maxQuantity === 1));
    assert.ok(removable.every((ingredient) => ingredient.nutritionDeltaByCount?.[0]?.calories === -ingredient.nutrition.calories));
    assert.equal(ketchup.label, "Ketchup Packet");
    assert.equal(ketchup.orderingGroupIdByCount[1], groupId);
    assert.equal(ketchup.orderingOptionIdByCount[1], optionId);
    assert.deepEqual(calculateIngredientCountTotals({ [ketchup.id]: 1 }, [ketchup]), { calories: 10, protein: 0, carbs: 2, totalFat: 0 });

    const removed = removable[0];
    const counts = { [removed.id]: 0 };
    const saved = buildIngredientCustomizations({ resolvedIngredients: ingredients, ingredientCounts: counts });
    const restored = getSelectedIngredientCountsFromCustomizations(ingredients, saved.map((entry) => entry.label), saved);
    assert.equal(restored[removed.id], 0);
    assert.equal(calculateIngredientCountTotals(counts, ingredients).calories, -removed.nutrition.calories);
  }
});

test("Sausage Burrito uses a required captured sauce slot with unresolved salsa hidden", () => {
  const item = menu.items.find((candidate) => candidate.id === "mcd-item-200267");
  const ingredients = resolved(item);
  assert.deepEqual(ingredients.filter((ingredient) => ingredient.defaultCount > 0).map((ingredient) => ingredient.label), [
    "Flour Tortilla", "American Cheese", "Scrambled Egg, Sausage & Vegetable Mix",
  ]);
  const sauces = ingredients.filter((ingredient) => ingredient.tabLabel === "Sauces");
  assert.deepEqual(sauces.map((ingredient) => ingredient.label), ["Ketchup Packet", "No Sauce"]);
  assert.deepEqual(sauces.map((ingredient) => ingredient.orderingGroupIdByCount[1]), ["5820746178", "5820746178"]);
  assert.deepEqual(sauces.map((ingredient) => ingredient.orderingOptionIdByCount[1]), ["23568409567", "23568409568"]);
  const category = item.customization.ingredientCategories.find((candidate) => candidate.name === "Sauces");
  assert.deepEqual(menu.customizationRules.ingredientCategories[category.id], { minQuantity: 1, maxQuantity: 1, allowNone: false });
});
