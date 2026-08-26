import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveIngredientRelationshipNutrition } from "../lib/nutrition.ts";

const restaurant = JSON.parse(
  await readFile(
    new URL("../data/generated/chick-fil-a/restaurant.json", import.meta.url),
    "utf8",
  ),
);
const unresolved = JSON.parse(
  await readFile(
    new URL("../data/generated/chick-fil-a/unresolved.json", import.meta.url),
    "utf8",
  ),
);

const ingredientIds = {
  bacon: "cfa-modifier-1004304",
  chocolate: "cfa-modifier-1000019",
  cookie: "cfa-modifier-1007260",
  strawberry: "cfa-modifier-1000047",
};

function item(id) {
  const value = restaurant.items.find((candidate) => candidate.id === id);
  assert.ok(value, `Missing generated item ${id}`);
  return value;
}

function ingredient(id) {
  const value = restaurant.ingredients.find((candidate) => candidate.id === id);
  assert.ok(value, `Missing generated ingredient ${id}`);
  return value;
}

function relationship(parentId, ingredientId) {
  const value = item(parentId).ingredientNutritionContexts?.[ingredientId];
  assert.ok(value, `Missing ${parentId} -> ${ingredientId} nutrition context`);
  return value;
}

function assertContext(
  parentId,
  ingredientId,
  tag,
  expectedServingWeight,
  expectedNutrition,
) {
  const value = relationship(parentId, ingredientId);
  assert.equal(value.source.tag, tag);
  assert.equal(value.source.sourceType, "ordering_system");
  assert.equal(
    value.source.sourceId,
    `retailModifiedItemId:${value.source.retailModifiedItemId}|tag:${tag}`,
  );
  assert.match(value.source.sourceUrl, /^https:\/\/order\.api\.my\.chick-fil-a\.com\//);
  assert.deepEqual(value.source.servingWeight, {
    amount: expectedServingWeight,
    unit: "g",
  });
  assert.deepEqual(
    {
      calories: value.nutrition.calories,
      protein: value.nutrition.protein,
      carbs: value.nutrition.carbs,
      totalFat: value.nutrition.totalFat,
    },
    expectedNutrition,
  );
}

test("Chick-fil-A parent relationships select the official modifier nutrition unit", () => {
  assertContext("cfa-item-1004265", ingredientIds.bacon, "BACON_CRUMB", 9, {
    calories: 35,
    protein: 3,
    carbs: 0,
    totalFat: 2.5,
  });
  assertContext("cfa-item-1006211", ingredientIds.bacon, "BACON_CRUMB_2SCOOPS", 17, {
    calories: 70,
    protein: 6,
    carbs: 0,
    totalFat: 5,
  });

  assertContext("cfa-item-1000104", ingredientIds.chocolate, "CHOCOLATE_SYRUP_1PUMP", 12, {
    calories: 30,
    protein: 0,
    carbs: 7,
    totalFat: 0,
  });
  assertContext("cfa-item-1002073", ingredientIds.chocolate, "CHOCOLATE_SYRUP", 24, {
    calories: 60,
    protein: 0,
    carbs: 15,
    totalFat: 0,
  });
  assertContext("cfa-item-1009677", ingredientIds.chocolate, "CHOCOLATE_SYRUP_MOD", 37, {
    calories: 100,
    protein: 1,
    carbs: 23,
    totalFat: 0,
  });

  assertContext("cfa-item-1000104", ingredientIds.cookie, "COOKIE_CRUMBLES_1PUMP_WITHPRICE", 9, {
    calories: 40,
    protein: 0,
    carbs: 6,
    totalFat: 1.5,
  });
  assertContext("cfa-item-1002071", ingredientIds.cookie, "COOKIE_CRUMBLES_2PULLS", 16, {
    calories: 70,
    protein: 1,
    carbs: 11,
    totalFat: 3,
  });

  assertContext("cfa-item-1000104", ingredientIds.strawberry, "STRAWBERRY_SYRUP", 35, {
    calories: 50,
    protein: 0,
    carbs: 12,
    totalFat: 0,
  });
  assertContext("cfa-item-1002071", ingredientIds.strawberry, "STRAWBERRY_SYRUP_2PUMPS", 71, {
    calories: 100,
    protein: 0,
    carbs: 25,
    totalFat: 0,
  });
});

test("context-dependent modifiers remain one visible identity and leave unresolved review", () => {
  for (const [key, id] of Object.entries(ingredientIds)) {
    const matches = restaurant.ingredients.filter((candidate) => candidate.id === id);
    assert.equal(matches.length, 1, `${key} must remain one visible ingredient identity`);
    assert.equal(matches[0].nutritionResolvedByContext, true);
    assert.equal(
      unresolved.records.some((record) => record.standardizedRecordId === id),
      false,
    );
  }
});

test("off-menu and unreferenced ordering units are not runtime candidates", () => {
  const cookieTags = ingredient(ingredientIds.cookie).contextualNutritionUnits.map(
    (unit) => unit.source.tag,
  );
  const strawberryTags = ingredient(ingredientIds.strawberry).contextualNutritionUnits.map(
    (unit) => unit.source.tag,
  );
  assert.equal(cookieTags.includes("COOKIE_CRUMBLES"), false);
  assert.equal(strawberryTags.includes("STRAWBERRY_SYRUP_3PUMPS"), false);
});

test("runtime relationship resolution prefers the selected parent variant", () => {
  const macAndCheese = item("cfa-group-100373");
  const medium = macAndCheese.variants.find(
    (variant) => variant.id === "cfa-item-1006280",
  );
  const large = macAndCheese.variants.find(
    (variant) => variant.id === "cfa-item-1006211",
  );
  assert.equal(
    resolveIngredientRelationshipNutrition(macAndCheese, ingredientIds.bacon, medium)
      ?.calories,
    35,
  );
  assert.equal(
    resolveIngredientRelationshipNutrition(macAndCheese, ingredientIds.bacon, large)
      ?.calories,
    70,
  );
});
