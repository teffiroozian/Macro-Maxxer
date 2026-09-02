import assert from "node:assert/strict";
import { test } from "node:test";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import {
  CHIPOTLE_GENERATED_RUNTIME_MENU,
} from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import {
  buildChipotleIngredientMenuItems,
} from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import { resolveIncludedIngredientIds } from "../lib/restaurantBuilders/chipotle/index.ts";
import {
  calculateChipotleBuildNutrition,
} from "../lib/restaurantBuilders/chipotle/nutrition.ts";

const ingredients = CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients;
const builderConfig = CHIPOTLE_GENERATED_RUNTIME_MENU.builderConfig;

const expectedById = {
  "chipotle-tortilla-crispy-corn-tacos-3": {
    calories: 200,
    protein: 3,
    carbs: 29,
    totalFat: 9,
  },
  "chipotle-tortilla-soft-flour-tacos-3": {
    calories: 250,
    protein: 7,
    carbs: 40,
    totalFat: 8,
  },
  "chipotle-tortilla-crispy-corn-taco": {
    calories: 67,
    protein: 1,
    carbs: 10,
    totalFat: 3,
  },
  "chipotle-tortilla-soft-flour-taco": {
    calories: 83,
    protein: 2,
    carbs: 13,
    totalFat: 3,
  },
  "chipotle-cmg-5403": {
    calories: 130,
    protein: 2,
    carbs: 19,
    totalFat: 6,
  },
  "chipotle-cmg-5404": {
    calories: 170,
    protein: 5,
    carbs: 27,
    totalFat: 5,
  },
  "chipotle-cmg-5401": {
    calories: 80,
    protein: 2,
    carbs: 13,
    totalFat: 2.5,
  },
};

function coreNutrition(nutrition) {
  return {
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    totalFat: nutrition.totalFat,
  };
}

function runtimeIngredient(id) {
  const match = ingredients.find((ingredient) => ingredient.id === id);
  assert.ok(match, `missing runtime ingredient ${id}`);
  return match;
}

function shellOnlyConfiguration({
  id,
  selectedEntree,
  selectedTacoCount,
  selectedKidsMeal = "build-your-own",
}) {
  return {
    selectedEntree,
    selectedIngredientItems: { [id]: { quantity: 1 } },
    selectedIngredientVariantIds: {},
    proteinPortionMode: "normal",
    splitPortionModeById: {},
    selectedTacoShell: id.includes("soft") || id === "chipotle-cmg-5404" ? "soft" : "crispy",
    selectedTacoCount,
    selectedKidsMeal,
  };
}

function contextMenuItems({
  selectedEntree,
  selectedTacoCount,
  selectedKidsMeal = "build-your-own",
  selectedTacoShell = "crispy",
}) {
  const selectedIncludedIngredientIds = resolveIncludedIngredientIds({
    selectedEntree,
    selectedKidsMeal,
    selectedTacoShell,
    selectedTacoCount,
    builderConfig,
  });
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree,
    selectedTacoCount,
    selectedKidsMeal,
    selectedIncludedIngredientIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

test("generated tortilla records preserve context identities and direct nutrition", () => {
  for (const [id, expected] of Object.entries(expectedById)) {
    const generated = generatedChipotle.ingredients.find(
      (ingredient) => ingredient.id === id,
    );
    assert.ok(generated, `missing generated tortilla ${id}`);
    assert.deepEqual(coreNutrition(generated.nutrition), expected);
    assert.deepEqual(coreNutrition(runtimeIngredient(id).nutrition), expected);
    assert.ok(generated.source.menu.itemIds[0]?.startsWith("CMG-"));
  }
});

test("adult Taco and Tacos (3) select and total their own context records", () => {
  const cases = [
    { count: 3, shell: "crispy", id: "chipotle-tortilla-crispy-corn-tacos-3" },
    { count: 3, shell: "soft", id: "chipotle-tortilla-soft-flour-tacos-3" },
    { count: 1, shell: "crispy", id: "chipotle-tortilla-crispy-corn-taco" },
    { count: 1, shell: "soft", id: "chipotle-tortilla-soft-flour-taco" },
  ];

  for (const { count, shell, id } of cases) {
    assert.deepEqual(
      resolveIncludedIngredientIds({
        selectedEntree: "tacos",
        selectedKidsMeal: "build-your-own",
        selectedTacoShell: shell,
        selectedTacoCount: count,
        builderConfig,
      }),
      [id],
    );
    const visibleShellIds = contextMenuItems({
      selectedEntree: "tacos",
      selectedTacoCount: count,
      selectedTacoShell: shell,
    })
      .filter((ingredient) => ingredient.id?.startsWith("chipotle-tortilla-"))
      .map((ingredient) => ingredient.id);
    assert.deepEqual(
      visibleShellIds.sort(),
      Object.values(builderConfig.chipotle.tacoShellIngredientIdsByCount[count])
        .flat()
        .sort(),
    );
    assert.deepEqual(
      coreNutrition(
        calculateChipotleBuildNutrition(
          shellOnlyConfiguration({
            id,
            selectedEntree: "tacos",
            selectedTacoCount: count,
          }),
          ingredients,
        ),
      ),
      expectedById[id],
    );
  }
});

test("Kids BYO treats each two-tortilla record as one selectable serving", () => {
  for (const [shell, id] of [
    ["crispy", "chipotle-cmg-5403"],
    ["soft", "chipotle-cmg-5404"],
  ]) {
    assert.deepEqual(
      resolveIncludedIngredientIds({
        selectedEntree: "kids-meal",
        selectedKidsMeal: "build-your-own",
        selectedTacoShell: shell,
        selectedTacoCount: 3,
        builderConfig,
      }),
      [id],
    );
    const menuItem = contextMenuItems({
      selectedEntree: "kids-meal",
      selectedTacoCount: 3,
      selectedKidsMeal: "build-your-own",
      selectedTacoShell: shell,
    }).find((ingredient) => ingredient.id === id);
    assert.ok(menuItem);
    assert.deepEqual(coreNutrition(menuItem.nutrition), expectedById[id]);
    assert.deepEqual(
      coreNutrition(
        calculateChipotleBuildNutrition(
          shellOnlyConfiguration({
            id,
            selectedEntree: "kids-meal",
            selectedTacoCount: 3,
          }),
          ingredients,
        ),
      ),
      expectedById[id],
    );
  }
});

test("Kids Quesadilla uses the accurate 1-Taco Soft Flour Tortilla panel, not the rounded CMG-5401 record", () => {
  const id = "chipotle-tortilla-soft-flour-taco";
  const menuItem = contextMenuItems({
    selectedEntree: "kids-meal",
    selectedTacoCount: 3,
    selectedKidsMeal: "quesadilla",
  }).find((ingredient) => ingredient.id === id);
  assert.ok(menuItem);
  assert.deepEqual(coreNutrition(menuItem.nutrition), expectedById[id]);
  assert.deepEqual(
    coreNutrition(
      calculateChipotleBuildNutrition(
        shellOnlyConfiguration({
          id,
          selectedEntree: "kids-meal",
          selectedTacoCount: 3,
          selectedKidsMeal: "quesadilla",
        }),
        ingredients,
      ),
    ),
    expectedById[id],
  );

  // The old, less accurate 80-cal CMG-5401 record is no longer offered at
  // all for Kids Quesadilla.
  const legacyTortilla = contextMenuItems({
    selectedEntree: "kids-meal",
    selectedTacoCount: 3,
    selectedKidsMeal: "quesadilla",
  }).find((ingredient) => ingredient.id === "chipotle-cmg-5401");
  assert.equal(legacyTortilla, undefined);
});
