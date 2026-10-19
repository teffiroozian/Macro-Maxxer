import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import panelModule from "../components/controls/RestaurantFiltersPanel.tsx";
import { getChipotleNutritionFilters } from "../lib/menuSections/filterOptions.ts";

const Panel = panelModule.default ?? panelModule;
const items = [
  { id: "chicken", name: "Chicken", categories: ["proteins"], servingType: "addon", nutrition: { calories: 180, protein: 32, carbs: 0, totalFat: 7, fiber: 0 } },
  { id: "rice", name: "Rice", categories: ["rice"], servingType: "addon", nutrition: { calories: 210, protein: 4, carbs: 40, totalFat: 4, fiber: 1 } },
];

test("Chipotle discards stale category and variant filters while retaining nutrition", () => {
  const previous = { categories: [], categoryPreset: "custom", categoryTags: ["drinks"], categoryExclusions: ["rice"], rankingGroups: [], showServingSizeVariants: false, showRecipeVariants: false, separateSizesInProteinScore: true, proteinMin: 10, caloriesMax: 300, fiberMin: 1, cardDisplayOverride: "fiber" };
  assert.deepEqual(getChipotleNutritionFilters(previous), { proteinMin: 10, caloriesMax: 300, fiberMin: 1, cardDisplayOverride: "fiber" });
  assert.deepEqual(previous.categories, []);
});

test("only Chipotle hides Categories and Variants while preserving Nutrition", () => {
  const render = (restaurantId) => renderToStaticMarkup(React.createElement(Panel, {
    restaurantId, items, value: {}, matchingCount: 2,
    onChange() {}, onClose() {}, onApply() {},
  }));
  const chipotle = render("chipotle");
  assert.doesNotMatch(chipotle, />Categories<|>Variants<|Select all|Clear all|Show different serving sizes/);
  assert.match(chipotle, />Nutrition</);
  assert.match(chipotle, /Max calories/);
  assert.match(chipotle, /Show 2 items/);
  const standard = render("chickfila");
  assert.match(standard, />Categories</);
  assert.match(standard, />Variants</);
});
