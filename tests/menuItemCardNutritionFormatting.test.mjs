import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import MenuItemMacroSummary from "../components/menu-item-card/MenuItemMacroSummary.tsx";
import {
  formatMacroDisplayNumber,
  formatProteinScoreDisplay,
} from "../components/nutrition/macroDisplay.ts";
import { getProteinPer100Calories, getProteinScoreTier } from "../lib/nutrition.ts";

const MenuItemMacroSummaryComponent = MenuItemMacroSummary.default ?? MenuItemMacroSummary;

test("shared macro display formatting removes floating-point noise", () => {
  assert.equal(formatMacroDisplayNumber(193.334), "193");
  assert.equal(formatMacroDisplayNumber(15.033), "15");
  assert.equal(formatMacroDisplayNumber(16.665999999999997), "17");
  assert.equal(formatMacroDisplayNumber(7.467), "7");
  assert.equal(formatProteinScoreDisplay(7.775662842541922), "7.8");
});

test("High Protein Taco card renders clean values without mutating generated nutrition", () => {
  const taco = generatedChipotle.items.find((item) => item.name === "High Protein Taco");
  assert.ok(taco, "expected generated High Protein Taco");

  const nutritionBeforeRender = structuredClone(taco.nutrition);
  const proteinScore = getProteinPer100Calories(taco.nutrition.protein, taco.nutrition.calories);
  assert.equal(typeof proteinScore, "number");

  const markup = renderToStaticMarkup(
    createElement(MenuItemMacroSummaryComponent, {
      displayCalories: taco.nutrition.calories,
      displayProtein: taco.nutrition.protein,
      displayCarbs: taco.nutrition.carbs,
      displayFat: taco.nutrition.totalFat,
      caloriesDelta: 0,
      proteinDelta: 0,
      carbsDelta: 0,
      fatDelta: 0,
      quantityMultiplier: 1,
      hasActiveCustomization: false,
      proteinScore,
      proteinScoreTier: getProteinScoreTier(proteinScore),
      actions: null,
    }),
  );

  assert.match(markup, new RegExp(`>${formatMacroDisplayNumber(taco.nutrition.calories)}<`));
  assert.match(markup, new RegExp(`>${formatMacroDisplayNumber(taco.nutrition.protein)}g<`));
  assert.match(markup, new RegExp(`>${formatMacroDisplayNumber(taco.nutrition.carbs)}g<`));
  assert.match(markup, new RegExp(`>${formatMacroDisplayNumber(taco.nutrition.totalFat)}g<`));
  assert.match(markup, new RegExp(`>${formatProteinScoreDisplay(proteinScore)}g protein<`));
  for (const value of Object.values(taco.nutrition)) {
    if (Number.isInteger(value)) continue;
    assert.doesNotMatch(markup, new RegExp(String(value).replace(".", "\\.")));
  }
  assert.deepEqual(taco.nutrition, nutritionBeforeRender);
});
