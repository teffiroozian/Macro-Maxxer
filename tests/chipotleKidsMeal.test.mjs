import assert from "node:assert/strict";
import { test } from "node:test";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import { resolveCartItemCustomizationCards } from "../lib/cart/cartItemLookup.ts";
import {
  fromUniversalChipotleBuildConfiguration,
  toUniversalChipotleBuildConfiguration,
} from "../lib/restaurantBuilders/chipotle/cartAdapter.ts";
import {
  CHIPOTLE_GENERATED_RUNTIME_MENU,
} from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import {
  buildChipotleIngredientMenuItems,
} from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import {
  isAdultQuesadillaTripleCheeseSelection,
  resolveChipotleTacoShellForIngredientId,
  resolveIncludedIngredientIds,
  resolveLockedIncludedIngredientIds,
} from "../lib/restaurantBuilders/chipotle/index.ts";
import {
  calculateChipotleBuildNutrition,
} from "../lib/restaurantBuilders/chipotle/nutrition.ts";

const TORTILLA_ID = "chipotle-tortilla-soft-flour-taco";
const CHEESE_ID = "chipotle-cmg-5252";
const KIDS_CRISPY_ID = "chipotle-cmg-5403";
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

function runtimeIngredient(id) {
  const match = ingredients.find((ingredient) => ingredient.id === id);
  assert.ok(match, `missing runtime ingredient ${id}`);
  return match;
}

function includedIds(selectedKidsMeal, selectedTacoShell = "crispy") {
  return resolveIncludedIngredientIds({
    selectedEntree: "kids-meal",
    selectedKidsMeal,
    selectedTacoShell,
    selectedTacoCount: 3,
    builderConfig,
  });
}

function kidsMenuItems(selectedKidsMeal) {
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree: "kids-meal",
    selectedTacoCount: 3,
    selectedKidsMeal,
    selectedIncludedIngredientIds: includedIds(selectedKidsMeal),
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

function kidsQuesadillaConfiguration() {
  return {
    selectedEntree: "kids-meal",
    selectedIngredientItems: {
      [TORTILLA_ID]: { quantity: 1 },
      [CHEESE_ID]: { quantity: 1 },
    },
    selectedIngredientVariantIds: {},
    proteinPortionMode: "normal",
    splitPortionModeById: {},
    selectedTacoShell: "soft",
    selectedTacoCount: 3,
    selectedKidsMeal: "quesadilla",
  };
}

test("Kids Quesadilla includes its tortilla and one standard Cheese serving", () => {
  assert.deepEqual(includedIds("quesadilla"), [TORTILLA_ID, CHEESE_ID]);

  const includedItems = kidsMenuItems("quesadilla")
    .filter((item) => item.categories.includes("Included Ingredients"))
    .sort((left, right) => left.defaultOrder - right.defaultOrder);
  assert.deepEqual(
    includedItems.map((item) => [item.id, item.name]),
    [
      [TORTILLA_ID, "Soft Flour Tortilla"],
      [CHEESE_ID, "Cheese"],
    ],
  );

  const cheese = includedItems.find((item) => item.id === CHEESE_ID);
  assert.ok(cheese);
  assert.deepEqual(coreNutrition(cheese.nutrition), {
    calories: 110,
    protein: 6,
    carbs: 1,
    totalFat: 8,
  });
  assert.equal(cheese.defaultVariantId, undefined);
  assert.equal(
    cheese.variants?.some((variant) =>
      variant.id.includes("triple-cheese"),
    ) ?? false,
    false,
  );
  assert.equal(
    isAdultQuesadillaTripleCheeseSelection(CHEESE_ID, {
      selectedEntree: "kids-meal",
      selectedKidsMeal: "quesadilla",
    }),
    false,
  );
  assert.equal(
    isAdultQuesadillaTripleCheeseSelection(CHEESE_ID, {
      selectedEntree: "quesadilla",
      selectedKidsMeal: "build-your-own",
    }),
    true,
  );
});

test("Kids Quesadilla required base is locked and totals tortilla plus 1x Cheese", () => {
  const selectedIncludedIngredientIds = includedIds("quesadilla");
  const lockedIds = resolveLockedIncludedIngredientIds({
    selectedIncludedIngredientIds,
    includedRemovableIngredientIds:
      builderConfig.chipotle.includedRemovableIngredientIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    context: {
      selectedEntree: "kids-meal",
      selectedKidsMeal: "quesadilla",
    },
  });
  assert.deepEqual([...lockedIds], [TORTILLA_ID, CHEESE_ID]);

  assert.deepEqual(
    coreNutrition(
      calculateChipotleBuildNutrition(
        kidsQuesadillaConfiguration(),
        ingredients,
      ),
    ),
    {
      calories: 193,
      protein: 8,
      carbs: 14,
      totalFat: 11,
    },
  );
});

test("Kids Quesadilla cart configuration and summary retain Cheese", () => {
  const configuration = kidsQuesadillaConfiguration();
  const universalConfiguration =
    toUniversalChipotleBuildConfiguration(configuration);
  assert.deepEqual(
    universalConfiguration.ingredients.map(({ id, quantity, variantId }) => ({
      id,
      quantity,
      variantId,
    })),
    [
      { id: TORTILLA_ID, quantity: 1, variantId: undefined },
      { id: CHEESE_ID, quantity: 1, variantId: undefined },
    ],
  );
  assert.deepEqual(
    fromUniversalChipotleBuildConfiguration(universalConfiguration)
      .selectedIngredientItems,
    configuration.selectedIngredientItems,
  );

  const summaryCards = resolveCartItemCustomizationCards({
    id: "kids-quesadilla-test",
    restaurantId: "chipotle",
    itemId: "chipotle-kids-quesadilla",
    name: "Kids Quesadilla",
    image: "",
    quantity: 1,
    macrosPerItem: {
      calories: 193,
      protein: 8,
      carbs: 14,
      totalFat: 11,
    },
    nutritionPerItem: calculateChipotleBuildNutrition(
      configuration,
      ingredients,
    ),
    selection: {
      type: "build-your-own",
      buildConfiguration: universalConfiguration,
    },
  });
  assert.deepEqual(
    summaryCards.map((card) => card.name),
    ["Soft Flour Tortilla", "Cheese"],
  );
  assert.deepEqual(
    coreNutrition(summaryCards.find((card) => card.name === "Cheese").nutrition),
    { calories: 110, protein: 6, carbs: 1, totalFat: 8 },
  );
});

test("switching Kids meal modes restores each mode's exact included base", () => {
  assert.deepEqual(includedIds("build-your-own"), [KIDS_CRISPY_ID]);
  assert.deepEqual(includedIds("quesadilla"), [TORTILLA_ID, CHEESE_ID]);
  assert.deepEqual(includedIds("build-your-own"), [KIDS_CRISPY_ID]);

  const byoIncludedIds = kidsMenuItems("build-your-own")
    .filter((item) => item.categories.includes("Included Ingredients"))
    .map((item) => item.id);
  assert.ok(byoIncludedIds.includes(KIDS_CRISPY_ID));
  assert.ok(byoIncludedIds.includes("chipotle-cmg-5404"));
  assert.ok(!byoIncludedIds.includes(CHEESE_ID));
});

test("Kid's Build Your Own tortilla toggle is a true single-select: Soft -> Crispy -> Soft", () => {
  const KIDS_SOFT_ID = "chipotle-cmg-5404";

  // Neither option is permanently locked in this context.
  const lockedForByo = resolveLockedIncludedIngredientIds({
    selectedIncludedIngredientIds: [KIDS_CRISPY_ID],
    includedRemovableIngredientIds: builderConfig.chipotle.includedRemovableIngredientIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    context: { selectedEntree: "kids-meal", selectedKidsMeal: "build-your-own" },
  });
  assert.equal(lockedForByo.has(KIDS_CRISPY_ID), false);
  assert.equal(lockedForByo.has(KIDS_SOFT_ID), false);

  function selectByClicking(clickedIngredientId) {
    // Mirrors handleIngredientSelectionChange: resolve which shell the
    // clicked card represents (this used to substring-match the id, which
    // silently always resolved to "crispy" for Kid's BYO's plain CMG ids),
    // then resolve that shell's included ingredient.
    const shell = resolveChipotleTacoShellForIngredientId(
      clickedIngredientId,
      builderConfig,
    );
    const [includedId] = includedIds("build-your-own", shell);
    const nutrition = calculateChipotleBuildNutrition(
      {
        selectedEntree: "kids-meal",
        selectedIngredientItems: { [includedId]: { quantity: 1 } },
        selectedIngredientVariantIds: {},
        proteinPortionMode: "normal",
        splitPortionModeById: {},
        selectedTacoShell: shell,
        selectedTacoCount: 3,
        selectedKidsMeal: "build-your-own",
      },
      ingredients,
    );
    return { shell, includedId, nutrition: coreNutrition(nutrition) };
  }

  // Click Soft: selects Soft, deselects Crispy, macros switch to Soft's.
  const afterSoft = selectByClicking(KIDS_SOFT_ID);
  assert.equal(afterSoft.shell, "soft");
  assert.equal(afterSoft.includedId, KIDS_SOFT_ID);
  assert.deepEqual(afterSoft.nutrition, {
    calories: 170,
    protein: 5,
    carbs: 27,
    totalFat: 5,
  });

  // Click Crispy: selects Crispy, deselects Soft, macros switch to Crispy's.
  const afterCrispy = selectByClicking(KIDS_CRISPY_ID);
  assert.equal(afterCrispy.shell, "crispy");
  assert.equal(afterCrispy.includedId, KIDS_CRISPY_ID);
  assert.deepEqual(afterCrispy.nutrition, {
    calories: 130,
    protein: 2,
    carbs: 19,
    totalFat: 6,
  });

  // Click Soft again: must switch back — this is exactly what was broken
  // (clicking Soft after Crispy previously resolved to "crispy" again and
  // silently no-opped).
  const afterSoftAgain = selectByClicking(KIDS_SOFT_ID);
  assert.equal(afterSoftAgain.shell, "soft");
  assert.equal(afterSoftAgain.includedId, KIDS_SOFT_ID);
  assert.deepEqual(afterSoftAgain.nutrition, {
    calories: 170,
    protein: 5,
    carbs: 27,
    totalFat: 5,
  });
});

test("Kids Cheese still uses the untouched generated nutrition record", () => {
  const generatedCheese = generatedChipotle.ingredients.find(
    (ingredient) => ingredient.id === CHEESE_ID,
  );
  assert.ok(generatedCheese);
  const expected = { calories: 110, protein: 6, carbs: 1, totalFat: 8 };
  assert.deepEqual(coreNutrition(generatedCheese.nutrition), expected);
  assert.deepEqual(coreNutrition(runtimeIngredient(CHEESE_ID).nutrition), expected);
  assert.deepEqual(generatedCheese.source.menu.itemIds, ["CMG-5252"]);
});
