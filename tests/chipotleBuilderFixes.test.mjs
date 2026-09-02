import assert from "node:assert/strict";
import { test } from "node:test";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import {
  CHIPOTLE_GENERATED_RUNTIME_MENU,
} from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import {
  buildChipotleIngredientMenuItems,
} from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import {
  resolveIncludedIngredientIds,
  resolveLockedIncludedIngredientIds,
} from "../lib/restaurantBuilders/chipotle/index.ts";
import {
  calculateChipotleBuildNutrition,
} from "../lib/restaurantBuilders/chipotle/nutrition.ts";
import {
  fromUniversalChipotleBuildConfiguration,
  toUniversalChipotleBuildConfiguration,
} from "../lib/restaurantBuilders/chipotle/cartAdapter.ts";

const ingredients = CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients;
const builderConfig = CHIPOTLE_GENERATED_RUNTIME_MENU.builderConfig;

function coreNutrition(nutrition) {
  return {
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    totalFat: nutrition.totalFat,
  };
}

function quesadillaMenuItems() {
  const includedIds = resolveIncludedIngredientIds({
    selectedEntree: "quesadilla",
    selectedKidsMeal: "build-your-own",
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    builderConfig,
  });
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree: "quesadilla",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
    selectedIncludedIngredientIds: includedIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

function saladMenuItems() {
  const includedIds = resolveIncludedIngredientIds({
    selectedEntree: "salad",
    selectedKidsMeal: "build-your-own",
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    builderConfig,
  });
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree: "salad",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
    selectedIncludedIngredientIds: includedIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

function burritoMenuItems() {
  const includedIds = resolveIncludedIngredientIds({
    selectedEntree: "burrito",
    selectedKidsMeal: "build-your-own",
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    builderConfig,
  });
  return {
    includedIds,
    items: buildChipotleIngredientMenuItems({
      restaurantId: "chipotle",
      ingredients,
      selectedEntree: "burrito",
      selectedTacoCount: 3,
      selectedKidsMeal: "build-your-own",
      selectedIncludedIngredientIds: includedIds,
      tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
      getIngredientPortionMultiplier: () => 1,
      getSelectedIngredientPortionMultiplier: () => 1,
      builderConfig,
    }),
  };
}

// --- Fix 1: Quesadilla drops Chipotle-Honey Vinaigrette --------------------

test("Quesadilla toppings no longer include Chipotle-Honey Vinaigrette", () => {
  const items = quesadillaMenuItems();
  const vinaigrette = items.find((item) => item.id === "chipotle-cmg-5354");
  assert.equal(vinaigrette, undefined);
  assert.equal(
    items.some((item) => item.name === "Chipotle-Honey Vinaigrette"),
    false,
  );
});

test("Salad's Chipotle-Honey Vinaigrette is untouched: included by default, removable", () => {
  const includedIds = resolveIncludedIngredientIds({
    selectedEntree: "salad",
    selectedKidsMeal: "build-your-own",
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    builderConfig,
  });
  assert.ok(includedIds.includes("chipotle-cmg-5353"));

  const lockedIds = resolveLockedIncludedIngredientIds({
    selectedIncludedIngredientIds: includedIds,
    includedRemovableIngredientIds: builderConfig.chipotle.includedRemovableIngredientIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    context: { selectedEntree: "salad", selectedKidsMeal: "build-your-own" },
  });
  // Included by default, but not locked — the user can remove it.
  assert.equal(lockedIds.has("chipotle-cmg-5353"), false);

  const items = saladMenuItems();
  const vinaigrette = items.find((item) => item.id === "chipotle-cmg-5353");
  assert.ok(vinaigrette, "expected Salad's own Chipotle-Honey Vinaigrette");
  assert.equal(vinaigrette.name, "Chipotle-Honey Vinaigrette");
  assert.deepEqual(coreNutrition(vinaigrette.nutrition), {
    calories: 220,
    protein: 1,
    carbs: 18,
    totalFat: 16,
  });
});

test("chipotle-cmg-5354 still exists untouched in generated/runtime data (not deleted globally)", () => {
  const generated = generatedChipotle.ingredients.find(
    (ingredient) => ingredient.id === "chipotle-cmg-5354",
  );
  assert.ok(generated, "generated record must still exist");
  assert.equal(generated.name, "Chipotle-Honey Vinaigrette");

  const runtime = ingredients.find((ingredient) => ingredient.id === "chipotle-cmg-5354");
  assert.ok(runtime, "runtime ingredient must still exist");
});

// --- Fix 2: Burrito's optional Double Wrap with Tortilla --------------------

test("Burrito shows Double Wrap with Tortilla, unselected by default, separate from the locked included tortilla", () => {
  const { includedIds, items } = burritoMenuItems();

  // Only the real included tortilla is included/locked by default.
  assert.deepEqual(includedIds, ["chipotle-cmg-4026-burrito-base"]);
  const lockedIds = resolveLockedIncludedIngredientIds({
    selectedIncludedIngredientIds: includedIds,
    includedRemovableIngredientIds: builderConfig.chipotle.includedRemovableIngredientIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    context: { selectedEntree: "burrito", selectedKidsMeal: "build-your-own" },
  });
  assert.ok(lockedIds.has("chipotle-cmg-4026-burrito-base"));
  assert.equal(lockedIds.has("chipotle-cmg-4026"), false);

  const includedTortilla = items.find((item) => item.id === "chipotle-cmg-4026-burrito-base");
  assert.ok(includedTortilla, "expected the locked included Burrito tortilla");
  assert.equal(includedTortilla.name, "Tortilla");
  assert.deepEqual(coreNutrition(includedTortilla.nutrition), {
    calories: 320,
    protein: 8,
    carbs: 50,
    totalFat: 9,
  });

  const doubleWrap = items.find((item) => item.id === "chipotle-cmg-4026");
  assert.ok(doubleWrap, "expected the optional Double Wrap with Tortilla add-on");
  assert.equal(doubleWrap.name, "Double Wrap with Tortilla");
  assert.deepEqual(coreNutrition(doubleWrap.nutrition), {
    calories: 320,
    protein: 8,
    carbs: 50,
    totalFat: 9,
  });
  // Not part of the default included/locked set — unselected by default.
  assert.equal(includedIds.includes("chipotle-cmg-4026"), false);
});

test("Selecting Double Wrap with Tortilla adds exactly one extra tortilla serving to Burrito macros", () => {
  const baseConfiguration = {
    selectedEntree: "burrito",
    selectedIngredientItems: {
      "chipotle-cmg-4026-burrito-base": { quantity: 1 },
    },
    selectedIngredientVariantIds: {},
    proteinPortionMode: "normal",
    splitPortionModeById: {},
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
  };
  const withDoubleWrap = {
    ...baseConfiguration,
    selectedIngredientItems: {
      ...baseConfiguration.selectedIngredientItems,
      "chipotle-cmg-4026": { quantity: 1 },
    },
  };

  const baseNutrition = calculateChipotleBuildNutrition(baseConfiguration, ingredients);
  const withDoubleWrapNutrition = calculateChipotleBuildNutrition(withDoubleWrap, ingredients);

  // Exactly one additional tortilla serving (320/8/50/9) on top of the base.
  assert.deepEqual(coreNutrition(withDoubleWrapNutrition), {
    calories: baseNutrition.calories + 320,
    protein: baseNutrition.protein + 8,
    carbs: baseNutrition.carbs + 50,
    totalFat: baseNutrition.totalFat + 9,
  });
});

test("Double Wrap with Tortilla round-trips correctly through the cart adapter", () => {
  const configuration = {
    selectedEntree: "burrito",
    selectedIngredientItems: {
      "chipotle-cmg-4026-burrito-base": { quantity: 1 },
      "chipotle-cmg-4026": { quantity: 1 },
    },
    selectedIngredientVariantIds: {},
    proteinPortionMode: "normal",
    splitPortionModeById: {},
    selectedTacoShell: "crispy",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
  };

  const universalConfiguration = toUniversalChipotleBuildConfiguration(configuration);
  const doubleWrapEntry = universalConfiguration.ingredients.find(
    ({ id }) => id === "chipotle-cmg-4026",
  );
  assert.ok(doubleWrapEntry, "expected Double Wrap with Tortilla in the cart payload");
  assert.equal(doubleWrapEntry.quantity, 1);

  assert.deepEqual(
    fromUniversalChipotleBuildConfiguration(universalConfiguration).selectedIngredientItems,
    configuration.selectedIngredientItems,
  );
});
