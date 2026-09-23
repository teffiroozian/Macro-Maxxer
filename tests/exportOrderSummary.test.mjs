import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCartItemExportSummary, formatCartItemName } from "../lib/cart/displayLabels.ts";

test("Chipotle export summary uses quantity-first structured portion labels", () => {
  const cartItem = {
    id: "chipotle-export-test",
    restaurantId: "chipotle",
    itemId: "chipotle-bowl",
    name: "Bowl",
    image: "",
    quantity: 1,
    macrosPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    nutritionPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    selection: {
      type: "build-your-own",
      buildConfiguration: {
        baseItemId: "bowl",
        ingredients: [
          { id: "chipotle-protein-chicken", quantity: 1 },
          { id: "chipotle-cmg-5001", quantity: 1, portion: "light" },
          { id: "chipotle-cmg-5101", quantity: 1, portion: "extra" },
          { id: "chipotle-cmg-5051", quantity: 1 },
          { id: "chipotle-cmg-5201", quantity: 1 },
        ],
        options: { proteinPortionMode: "double" },
      },
    },
    customizations: [
      { action: "remove", kind: "ingredient", ingredientLabel: "Cheese" },
      { action: "remove", kind: "ingredient", ingredientLabel: "Sour Cream" },
    ],
  };

  assert.deepEqual(
    buildCartItemExportSummary(cartItem).map(({ label, detail }) => `${label}${detail ? ` (${detail})` : ""}`),
    [
      "2x Chicken (Double)",
      "1/2x White Rice (Light)",
      "2x Fajita Veggies (Extra)",
      "1x Black Beans",
      "1x Fresh Tomato Salsa",
      "No Cheese",
      "No Sour Cream",
    ],
  );
});

test("split proteins use the existing half-portion rule", () => {
  const cartItem = {
    id: "chipotle-split-protein-export-test",
    restaurantId: "chipotle",
    itemId: "chipotle-bowl",
    name: "Bowl",
    image: "",
    quantity: 1,
    macrosPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    nutritionPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    selection: {
      type: "build-your-own",
      buildConfiguration: {
        baseItemId: "bowl",
        ingredients: [
          { id: "chipotle-protein-chicken", quantity: 1 },
          { id: "chipotle-protein-steak", quantity: 1 },
        ],
        options: { proteinPortionMode: "normal" },
      },
    },
  };

  const labels = buildCartItemExportSummary(cartItem).map(({ label, detail }) => `${label}${detail ? ` (${detail})` : ""}`);
  assert.equal(labels[0], "1/2x Chicken (Half)");
  assert.match(labels[1], /^1\/2x .+ \(Half\)$/);
});

test("structured combo export uses catalog ids for the parent, entree, side, and drink", () => {
  const cartItem = {
    id: "combo-export-test",
    restaurantId: "chickfila",
    itemId: "cfa-group-100100",
    name: "Stale combo display name",
    image: "",
    quantity: 1,
    macrosPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    nutritionPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    selection: { type: "standard" },
    customizations: [
      { action: "add", kind: "combo", comboRole: "meal" },
      { action: "add", kind: "combo", comboRole: "side", itemId: "cfa-item-1000225" },
      { action: "add", kind: "combo", comboRole: "drink", itemId: "cfa-item-1009674" },
      { action: "add", kind: "ingredient", ingredientLabel: "Honey Roasted BBQ Sauce" },
    ],
  };

  const [summary] = buildCartItemExportSummary(cartItem);
  assert.equal(summary.label, "Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A® Filet Meal");
  assert.equal(formatCartItemName(cartItem), summary.label);
  assert.equal(summary.components[0].role, "Entrée");
  assert.notEqual(summary.components[0].label, cartItem.name);
  assert.equal(summary.components[1].role, "Side");
  assert.equal(summary.components[2].role, "Drink");
  assert.deepEqual(summary.components.at(-1), { role: "Extra", label: "+ Honey Roasted BBQ Sauce" });
});
