import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";
import { calculateMcDonaldsCustomizationNutrition, toMacroMaxxerNutrition } from "../lib/restaurantBuilders/mcdonalds/customization.ts";
import { ingredientIdForComponent } from "../lib/restaurantBuilders/mcdonalds/customizationIngredients.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { getSelectedIngredientCountsFromCustomizations } from "../lib/menuItemCard/ingredientCountCustomization.ts";
import { getCustomizationLabels } from "../lib/cart/customizationLabels.ts";
import { resolveStandardItemConfiguration } from "../lib/cart/standardItemConfiguration.ts";

const model = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/daily-double.json", import.meta.url), "utf8"));
const report = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/customization/generated/daily-double-report.json", import.meta.url), "utf8"));
const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const item = menu.items.find((candidate) => candidate.id === "mcd-item-200497");
assert.ok(item);
const resolved = resolvePanelIngredients(item, menu.ingredients, undefined, menu.items, null, undefined, menu.customizationRules);
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);

test("Daily Double exposes only the ten validated captured options", () => {
  assert.equal(model.orderingItemId, "6600487527");
  assert.deepEqual(model.groups.map((group) => group.id), ["7250468670", "7250475529"]);
  assert.deepEqual(model.options.map((option) => option.id), [
    "31802106324", "31802106325", "31802106326", "31802106327", "31802106329", "31802106331",
    "31802111952", "31802111953", "31802111954", "31802111955",
  ]);
  assert.equal(report.summary.optionsMapped, 10);
  assert.equal(report.summary.unmatched, 7);
  assert.equal(report.summary.defaultNutritionValidated, true);
  const visibleLabels = resolved.map((ingredient) => ingredient.label);
  assert.deepEqual(visibleLabels.sort(), ["1/10 Lb Beef", "American Cheese", "Mayonnaise", "Regular Bun", "Shredded Lettuce", "Slivered Onions"].sort());
  assert.ok(!visibleLabels.some((label) => /tomato|diced|pickle|mustard|ketchup|salt/i.test(label)));
});

test("Daily Double safe options apply exact live macro deltas", () => {
  const contexts = new Map(model.componentContexts.map((context) => [context.id, context]));
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  for (const option of model.options) {
    const changed = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: option.id }]);
    const context = contexts.get(option.nutritionContextId);
    const sign = option.action === "remove" ? -1 : 1;
    for (const key of ["calories", "protein", "carbohydrate", "fat"]) {
      close(changed[key] - base[key], sign * context.nutrients[key], `${option.name}:${key}`);
    }
  }
});

test("Daily Double preserves two patties and one-unit remove behavior", () => {
  const beef = resolved.find((ingredient) => ingredient.id === ingredientIdForComponent("200497", "300038"));
  assert.deepEqual([beef.defaultCount, beef.maxQuantity], [2, 2]);
  assert.equal(beef.orderingGroupIdByCount[1], "7250468670");
  assert.equal(beef.orderingOptionIdByCount[1], "31802106329");
  assert.equal(beef.orderingOptionIdByCount[0], undefined);
  assert.equal(beef.orderingOptionIdByCount[3], undefined);
});

test("Daily Double limited state round-trips through cart/edit with ordering ids", () => {
  const beefId = ingredientIdForComponent("200497", "300038");
  const mayoId = ingredientIdForComponent("200497", "300430");
  const bunId = ingredientIdForComponent("200497", "301578");
  const configuration = resolveStandardItemConfiguration({
    item, resolvedIngredients: resolved, selectedIngredientCounts: { [beefId]: 1, [mayoId]: 2, [bunId]: 0 },
    selectedAddons: {}, selectedSauceCounts: {}, comboSides: [], comboDrinks: [],
    isComboEligibleCategory: false, comboType: "just-item",
  });
  const expected = new Map([
    [beefId, ["7250468670", "31802106329", 1]],
    [mayoId, ["7250475529", "31802111952", 2]],
    [bunId, ["7250468670", "31802106331", 0]],
  ]);
  for (const customization of configuration.customizations) {
    const row = expected.get(customization.ingredientId);
    assert.ok(row);
    assert.deepEqual([customization.orderingGroupId, customization.orderingOptionId, customization.quantity], row);
  }
  const restored = getSelectedIngredientCountsFromCustomizations(resolved, getCustomizationLabels(configuration.customizations));
  assert.equal(restored[beefId], 1);
  assert.equal(restored[mayoId], 2);
  assert.equal(restored[bunId], 0);

  const base = toMacroMaxxerNutrition(calculateMcDonaldsCustomizationNutrition(model, []));
  const selected = toMacroMaxxerNutrition(calculateMcDonaldsCustomizationNutrition(model, [
    { optionId: "31802106329" }, { optionId: "31802111952" }, { optionId: "31802106331" },
  ]));
  close(configuration.nutrition.calories - item.nutrition.calories, selected.calories - base.calories, "cart calories");
  close(configuration.nutrition.protein - item.nutrition.protein, selected.protein - base.protein, "cart protein");
  close(configuration.nutrition.carbs - item.nutrition.carbs, selected.carbs - base.carbs, "cart carbs");
  close(configuration.nutrition.totalFat - item.nutrition.totalFat, selected.totalFat - base.totalFat, "cart fat");
});

test("Daily Double retains its existing non-combo behavior", () => {
  assert.equal(item.comboConfig, undefined);
  assert.equal(item.comboConfigByVariantId, undefined);
});
