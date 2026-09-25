import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculateMcDonaldsCustomizationNutrition,
  toMacroMaxxerNutrition,
  validateMcDonaldsCustomizationSelections,
} from "../lib/restaurantBuilders/mcdonalds/customization.ts";

const model = JSON.parse(await readFile("data/restaurants/mcdonalds/customization/generated/quarter-pounder.json", "utf8"));
const report = JSON.parse(await readFile("data/restaurants/mcdonalds/customization/generated/report.json", "utf8"));

const validation = new Map(report.validationCases.map((entry) => [entry.id, entry]));

test("McDonald's generated customization mappings are conservative", () => {
  assert.equal(model.options.length, 17);
  assert.deepEqual(report.unmatched.map((entry) => entry.name), ["No Salt", "Extra Salt"]);
  assert.equal(report.ambiguous.length, 0);
  assert.ok(model.options.every((option) => option.componentId && option.nutritionContextId));
});

test("Quarter Pounder default component sum matches the official calculator raw panel", () => {
  const calculated = calculateMcDonaldsCustomizationNutrition(model, []);
  const expected = validation.get("qpc-component-sum").expected;
  for (const [key, value] of Object.entries(expected)) assert.ok(Math.abs(calculated[key] - value) < 1e-6, key);
});

test("Quarter Pounder removals match official calculator configurations", () => {
  const cases = [
    ["43914730822", "qpc-no-cheese"],
    ["43914730819", "qpc-no-ketchup"],
  ];
  for (const [optionId, validationId] of cases) {
    const calculated = calculateMcDonaldsCustomizationNutrition(model, [{ optionId }]);
    const expected = validation.get(validationId).expected;
    for (const [key, value] of Object.entries(expected)) assert.ok(Math.abs(calculated[key] - value) < 1e-6, `${validationId}:${key}`);
  }
});

test("extra cheese uses a single-slice context instead of the two-slice default context", () => {
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  const extra = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914730830" }]);
  const context = model.componentContexts.find((entry) => entry.id === "american-cheese-single");
  assert.equal(context.displayedNutrients.calories, 50);
  assert.ok(Math.abs((extra.calories - base.calories) - context.nutrients.calories) < 1e-6);
});

test("remove plus extra is deterministic and leaves one extra portion", () => {
  const left = calculateMcDonaldsCustomizationNutrition(model, [
    { optionId: "43914730830" },
    { optionId: "43914730822" },
  ]);
  const right = calculateMcDonaldsCustomizationNutrition(model, [
    { optionId: "43914730822" },
    { optionId: "43914730830" },
  ]);
  assert.deepEqual(left, right);
  const without = validation.get("qpc-no-cheese").expected;
  const slice = model.componentContexts.find((entry) => entry.id === "american-cheese-single").nutrients;
  assert.ok(Math.abs(left.calories - without.calories - slice.calories) < 1e-6);
});

test("add bacon contributes the official three-half-strip nutrition context", () => {
  const base = calculateMcDonaldsCustomizationNutrition(model, []);
  const bacon = calculateMcDonaldsCustomizationNutrition(model, [{ optionId: "43914730833" }]);
  const context = model.componentContexts.find((entry) => entry.id === "qpc-add-bacon");
  assert.equal(context.displayedNutrients.calories, 110);
  assert.ok(Math.abs((bacon.totalFat ?? bacon.fat) - (base.totalFat ?? base.fat) - context.nutrients.fat) < 1e-6);
});

test("selection validation enforces captured group maximums", () => {
  const removeOptions = model.options.filter((option) => option.action === "remove");
  const valid = validateMcDonaldsCustomizationSelections(model, removeOptions.map((option) => ({ optionId: option.id })));
  assert.equal(valid.length, 0);
  const tooMany = validateMcDonaldsCustomizationSelections(model, [
    ...removeOptions.map((option) => ({ optionId: option.id })),
    { optionId: removeOptions[0].id },
    { optionId: removeOptions[1].id },
  ]);
  assert.ok(tooMany.some((issue) => issue.code === "above_group_max"));
});

test("official nutrient keys convert to the existing Macro Maxxer nutrition schema", () => {
  const nutrition = toMacroMaxxerNutrition(calculateMcDonaldsCustomizationNutrition(model, []));
  assert.ok(nutrition.calories > 0);
  assert.ok(nutrition.protein > 0);
  assert.ok(nutrition.carbs > 0);
  assert.ok(nutrition.totalFat > 0);
  assert.ok(nutrition.sodium > 0);
});
