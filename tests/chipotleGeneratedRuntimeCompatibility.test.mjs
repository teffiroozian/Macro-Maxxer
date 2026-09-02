import assert from "node:assert/strict";
import { test } from "node:test";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import {
  chipotlePresentationImageForGeneratedId,
} from "../data/restaurants/chipotle-generated-presentation.ts";
import { resolveEffectiveIngredientNutrition } from "../lib/ingredientNutrition.ts";
import {
  CHIPOTLE_GENERATED_RUNTIME_MENU,
} from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import {
  calculateChipotleBuildNutrition,
} from "../lib/restaurantBuilders/chipotle/nutrition.ts";
import {
  buildChipotleIngredientMenuItems,
} from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import { sortItems } from "../lib/menuSections/sorting.ts";
import { SORT_OPTION_VALUES } from "../lib/menuSections/sortOptions.ts";
import { resolveStandardItemVariant } from "../lib/cart/standardItemConfiguration.ts";
import {
  fromUniversalChipotleBuildConfiguration,
  toUniversalChipotleBuildConfiguration,
} from "../lib/restaurantBuilders/chipotle/cartAdapter.ts";
import {
  buildHighProteinBuildConfiguration,
  isChipotleEditablePresetBuildItem,
  isChipotleHighProteinPresetMealArtwork,
} from "../lib/restaurantBuilders/chipotle/highProtein.ts";

const ingredients = CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients;
const items = CHIPOTLE_GENERATED_RUNTIME_MENU.items;

function item(id) {
  const match = items.find((candidate) => candidate.id === id);
  assert.ok(match, `missing generated runtime item ${id}`);
  return match;
}

function ingredient(id) {
  const match = ingredients.find((candidate) => candidate.id === id);
  assert.ok(match, `missing generated runtime ingredient ${id}`);
  return match;
}

function buildConfiguration(ingredientId, variantId) {
  return {
    selectedEntree: "bowl",
    selectedIngredientItems: { [ingredientId]: { quantity: 1 } },
    selectedIngredientVariantIds: variantId ? { [ingredientId]: variantId } : {},
    proteinPortionMode: "normal",
    splitPortionModeById: {},
    selectedTacoShell: "soft",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
  };
}

test("generated protein parent resolves its declared Normal variant by default", () => {
  const steak = ingredient("chipotle-protein-steak");
  assert.equal(steak.nutrition, undefined);
  assert.equal(steak.defaultVariantId, "chipotle-protein-steak-normal");
  assert.deepEqual(resolveEffectiveIngredientNutrition(steak), {
    calories: 150,
    protein: 21,
    carbs: 1,
    totalFat: 6,
    satFat: 2.5,
    transFat: 0,
    cholesterol: 80,
    sodium: 330,
    fiber: 1,
    sugars: 0,
  });
});

test("Side of Pollo Asado presents the entree-standard Pollo Asado nutrition", () => {
  const generatedSide = generatedChipotle.items.find(
    (candidate) => candidate.id === "chipotle-cmg-1141",
  );
  const side = item("chipotle-cmg-1141");
  const pollo = ingredient("chipotle-protein-pollo-asado");

  assert.ok(generatedSide);
  assert.equal(generatedSide.nutrition.calories, 220);
  assert.deepEqual(side.nutrition, resolveEffectiveIngredientNutrition(pollo));
  assert.deepEqual(
    {
      calories: side.nutrition.calories,
      protein: side.nutrition.protein,
      carbs: side.nutrition.carbs,
      totalFat: side.nutrition.totalFat,
    },
    { calories: 180, protein: 29, carbs: 3, totalFat: 7 },
  );
  assert.equal(side.id, generatedSide.id);
  assert.deepEqual(side.source.generated.menu.itemIds, ["CMG-1141"]);
  assert.match(side.image, /cmg-1141-side-of-pollo-asado/);
});

test("Queso Blanco renders last without reordering the other Bowl toppings", () => {
  const builderConfig = CHIPOTLE_GENERATED_RUNTIME_MENU.builderConfig;
  assert.ok(builderConfig?.chipotle);

  const bowlIngredients = buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree: "bowl",
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
    selectedIncludedIngredientIds:
      builderConfig.entreeOptions.bowl.includedIngredientIds ?? [],
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
  const toppingNames = sortItems(
    bowlIngredients,
    SORT_OPTION_VALUES.DEFAULT_ORDER,
    "ingredients",
  )
    .filter((candidate) => candidate.categories.includes("Toppings"))
    .map((candidate) => candidate.name);

  assert.deepEqual(toppingNames, [
    "Cilantro Lime Sauce",
    "Guacamole",
    "Fresh Tomato Salsa",
    "Roasted Chili-Corn Salsa",
    "Tomatillo-Green Chili Salsa",
    "Tomatillo-Red Chili Salsa",
    "Sour Cream",
    "Fajita Veggies",
    "Cheese",
    "Romaine Lettuce",
    "Queso Blanco",
  ]);

  const generatedQueso = generatedChipotle.ingredients.find(
    (candidate) => candidate.id === "chipotle-cmg-1029",
  );
  const runtimeQueso = ingredient("chipotle-cmg-1029");
  assert.ok(generatedQueso);
  assert.equal(generatedQueso.defaultOrder, 2);
  assert.equal(runtimeQueso.id, generatedQueso.id);
  assert.deepEqual(runtimeQueso.nutrition, generatedQueso.nutrition);
  assert.deepEqual(runtimeQueso.categories, ["Toppings"]);
  assert.equal(
    runtimeQueso.image,
    chipotlePresentationImageForGeneratedId(generatedQueso.id).image,
  );
});

test("selected Half and Extra variants resolve their own official nutrition", () => {
  const pollo = ingredient("chipotle-protein-pollo-asado");
  const halfId = "chipotle-protein-pollo-asado-half";
  const extraId = "chipotle-protein-pollo-asado-extra";

  assert.equal(resolveEffectiveIngredientNutrition(pollo, halfId)?.calories, 90);
  assert.equal(resolveEffectiveIngredientNutrition(pollo, extraId)?.calories, 200);
  assert.equal(
    calculateChipotleBuildNutrition(
      buildConfiguration(pollo.id, halfId),
      ingredients,
    ).calories,
    90,
  );
  assert.equal(
    calculateChipotleBuildNutrition(
      buildConfiguration(pollo.id, extraId),
      ingredients,
    ).calories,
    200,
  );
});

test("direct ingredient nutrition remains the fallback unchanged", () => {
  const rice = ingredient("chipotle-cmg-5001");
  assert.equal(rice.variants, undefined);
  assert.strictEqual(resolveEffectiveIngredientNutrition(rice), rice.nutrition);
  assert.equal(resolveEffectiveIngredientNutrition(rice)?.calories, 210);
});

test("missing effective nutrition is skipped before scaling", () => {
  const invalidIngredient = {
    id: "invalid-no-nutrition",
    name: "Invalid",
    categories: ["Toppings"],
    maxQuantity: 1,
    defaultOrder: 0,
  };
  assert.equal(resolveEffectiveIngredientNutrition(invalidIngredient), undefined);
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  let result;
  try {
    assert.doesNotThrow(() => {
      result = calculateChipotleBuildNutrition(
        buildConfiguration(invalidIngredient.id),
        [invalidIngredient],
      );
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(
    result,
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      totalFat: 0,
      satFat: 0,
      transFat: 0,
      cholesterol: 0,
      sodium: 0,
      fiber: 0,
      sugars: 0,
    },
  );
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no effective nutrition/);
});

test("16 fl oz flavor container resolves selected and default flavor nutrition", () => {
  const fountain = ingredient("chipotle-cmg-5551");
  assert.equal(fountain.nutrition, undefined);
  assert.equal(
    resolveEffectiveIngredientNutrition(fountain)?.calories,
    189.091,
  );
  assert.equal(
    resolveEffectiveIngredientNutrition(
      fountain,
      "chipotle-fountain-16-fl-oz-diet-coke",
    )?.calories,
    0,
  );
});

test("22 and 32 fl oz menu containers retain exact flavor variants", () => {
  for (const [size, expectedCalories] of [[22, 260], [32, 380]]) {
    const item = CHIPOTLE_GENERATED_RUNTIME_MENU.items.find(
      (candidate) => candidate.id === `chipotle-fountain-${size}-fl-oz`,
    );
    assert.ok(item);
    const selected = resolveStandardItemVariant({
      variants: item.variants,
      selectedVariantId: `chipotle-fountain-${size}-fl-oz-coca-cola-classic`,
      defaultVariantId: item.defaultVariantId,
    });
    assert.equal(selected.nutrition.calories, expectedCalories);
    assert.equal(selected.source.generated.menu.itemIds[0], size === 22 ? "CMG-2001" : "CMG-2002");
  }
});

test("generated provenance is preserved behind the runtime source boundary", () => {
  const pollo = ingredient("chipotle-protein-pollo-asado");
  assert.deepEqual(pollo.source.menu, { tags: [], pins: [] });
  assert.equal(pollo.source.generated.provider, "Chipotle");
  assert.equal(pollo.source.generated.restaurantId, 469);
  assert.deepEqual(pollo.source.generated.menu.itemIds, [
    "CMG-11",
    "CMG-113",
    "CMG-311",
    "CMG-412",
  ]);
  assert.equal(pollo.source.generated.nutrition.method, "live_full_nutrition");

  const half = pollo.variants.find(
    (variant) => variant.id === "chipotle-protein-pollo-asado-half",
  );
  assert.equal(half.source.generated.nutrition.method, "approved_portion_scaling");
  assert.match(half.source.generated.nutrition.note, /CMG-5609/);
});

test("top-level navigation cards show each group's own label and image, never Bowl's", () => {
  const entreeOptions = CHIPOTLE_GENERATED_RUNTIME_MENU.builderConfig.entreeOptions;
  const bowlImage = entreeOptions.bowl.image;

  assert.equal(entreeOptions.bowl.label, "Bowl");
  assert.equal(entreeOptions.burrito.label, "Burrito");
  assert.equal(entreeOptions.quesadilla.label, "Quesadilla");
  assert.equal(entreeOptions.salad.label, "Salad");
  assert.equal(entreeOptions.tacos.label, "Tacos");
  assert.equal(entreeOptions["kids-meal"].label, "Kid's Meal");

  assert.equal(entreeOptions["high-protein-menu"].label, "High Protein Menu");
  assert.equal(entreeOptions["chips-sides"].label, "Chips & Sides");
  assert.equal(entreeOptions.drinks.label, "Drinks");

  for (const id of ["high-protein-menu", "chips-sides", "drinks"]) {
    assert.notEqual(entreeOptions[id].label, "Bowl");
    assert.notEqual(entreeOptions[id].image, bowlImage);
    assert.ok(entreeOptions[id].image, `${id} is missing an image`);
  }

  // These three are pure browse_groups pseudo-entrees with no single
  // representative generated record, so their thumbnails must be Chipotle's
  // own official category artwork — never derived from an arbitrary member
  // item (e.g. a single preset meal, a plain bag of chips, one Coke bottle).
  assert.equal(
    entreeOptions["high-protein-menu"].image,
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/high-protein/web-desktop/high-protein-meal.png",
  );
  assert.equal(
    entreeOptions["chips-sides"].image,
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/chips-and-guac/web-desktop/order.png",
  );
  assert.equal(
    entreeOptions.drinks.image,
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/pickup-drinks/web-desktop/pickup-drinks.png",
  );
});

test("preset-meal editorial artwork flag matches only wide Protein Meals photography", () => {
  const joshHartBurrito = item("chipotle-meal-653abfb2-3b20-4b17-8638-d6a20b2c340c");
  const proteinCup = item("chipotle-cmg-1125");
  const bowl = item("chipotle-bowl");

  assert.equal(isChipotleHighProteinPresetMealArtwork(joshHartBurrito, "chipotle"), true);
  assert.equal(isChipotleHighProteinPresetMealArtwork(proteinCup, "chipotle"), false);
  assert.equal(isChipotleHighProteinPresetMealArtwork(bowl, "chipotle"), false);
  assert.equal(
    isChipotleHighProteinPresetMealArtwork(joshHartBurrito, "chick-fil-a"),
    false,
  );
});

function assertPresetComposition({ name, entree, kidsMeal, expectedEntries }) {
  const preset = items.find((candidate) => candidate.name === name);
  assert.ok(preset, `missing preset ${name}`);
  assert.equal(isChipotleEditablePresetBuildItem(preset, "chipotle"), true);
  assert.deepEqual(preset.ingredients, expectedEntries);

  const configuration = buildHighProteinBuildConfiguration(preset, ingredients);
  assert.equal(configuration.selectedEntree, entree);
  if (kidsMeal) assert.equal(configuration.selectedKidsMeal, kidsMeal);
  for (const entry of expectedEntries) {
    const ingredientId = entry.split(":", 1)[0];
    assert.ok(
      ingredients.some((candidate) => candidate.id === ingredientId),
      `${name} composition did not resolve runtime ingredient ${ingredientId}`,
    );
    assert.ok(
      configuration.selectedIngredientItems[ingredientId],
      `${name} did not pre-populate ${ingredientId}`,
    );
  }

  const calculated = calculateChipotleBuildNutrition(configuration, ingredients);
  for (const field of ["calories", "protein", "carbs", "totalFat", "satFat", "sodium", "fiber", "sugars"]) {
    if (preset.nutrition[field] === undefined) continue;
    assert.ok(
      Math.abs(calculated[field] - preset.nutrition[field]) < 0.001,
      `${name} ${field} drifted: preset=${preset.nutrition[field]}, builder=${calculated[field]}`,
    );
  }
  return configuration;
}

test("generated presets expose complete source compositions and hydrate exact builder state", () => {
  const josh = assertPresetComposition({
    name: "Josh Hart's High Protein Burrito",
    entree: "burrito",
    expectedEntries: [
      "chipotle-protein-chicken:extra",
      "chipotle-cmg-4026-burrito-base",
      "chipotle-cmg-5051",
      "chipotle-cmg-5201",
      "chipotle-cmg-5202",
      "chipotle-cmg-5251",
      "chipotle-cmg-5252",
      "chipotle-cmg-5001",
    ],
  });
  assert.equal(josh.proteinPortionMode, "double");

  const salish = assertPresetComposition({
    name: "The Salish Matter Meal",
    entree: "kids-meal",
    kidsMeal: "quesadilla",
    expectedEntries: [
      "chipotle-protein-guacamole-kids-quesadilla",
      "chipotle-cmg-5401",
      "chipotle-cmg-5252",
      "chipotle-cmg-5001",
      "chipotle-cmg-5051",
      "chipotle-cmg-1401",
      "chipotle-cmg-5553",
    ],
  });
  assert.equal(salish.selectedKidsMeal, "quesadilla");

  const doubleBowl = assertPresetComposition({
    name: "Double High Protein Bowl",
    entree: "bowl",
    expectedEntries: [
      "chipotle-protein-chicken:extra",
      "chipotle-cmg-5001:light",
      "chipotle-cmg-5051",
      "chipotle-cmg-5101",
      "chipotle-cmg-5201",
      "chipotle-cmg-5252",
      "chipotle-cmg-5351:extra",
    ],
  });
  assert.equal(doubleBowl.proteinPortionMode, "double");
  assert.equal(doubleBowl.selectedIngredientItems["chipotle-cmg-5001"].quantity, 0.5);
  assert.equal(doubleBowl.selectedIngredientItems["chipotle-cmg-5351"].quantity, 2);

  assertPresetComposition({
    name: "Mikal Bridges High Protein Bowl",
    entree: "bowl",
    expectedEntries: [
      "chipotle-protein-chicken:extra",
      "chipotle-cmg-5001",
      "chipotle-cmg-5203",
      "chipotle-cmg-5202",
      "chipotle-cmg-5351",
    ],
  });
});

test("every supported generated Chipotle preset resolves, groups, and round-trips through cart", () => {
  const presets = items.filter(
    (candidate) => candidate.source?.generated?.menu.role === "preconfigured_meal",
  );
  assert.equal(presets.length, 11);

  for (const preset of presets) {
    assert.ok(preset.ingredients?.length > 0, `${preset.name} has no composition`);
    const configuration = buildHighProteinBuildConfiguration(preset, ingredients);
    const roundTripped = fromUniversalChipotleBuildConfiguration(
      toUniversalChipotleBuildConfiguration(configuration),
    );
    assert.deepEqual(roundTripped.selectedIngredientItems, configuration.selectedIngredientItems);
    assert.equal(roundTripped.selectedEntree, configuration.selectedEntree);

    const total = calculateChipotleBuildNutrition(roundTripped, ingredients);
    for (const field of ["calories", "protein", "carbs", "totalFat"]) {
      assert.ok(
        Math.abs(total[field] - preset.nutrition[field]) < 0.001,
        `${preset.name} cart round-trip changed ${field}`,
      );
    }
  }

  const josh = item("chipotle-meal-653abfb2-3b20-4b17-8638-d6a20b2c340c");
  const joshCategories = new Set(
    josh.ingredients.map((entry) =>
      ingredient(entry.split(":", 1)[0]).categories[0],
    ),
  );
  assert.deepEqual(
    [...joshCategories].sort(),
    ["Beans", "Included Ingredients", "Proteins", "Rice", "Toppings"].sort(),
  );

  const salish = item("chipotle-meal-02774ed8-f878-4dc2-b6cd-5e86977b4907");
  const salishCategories = new Set(
    salish.ingredients.map((entry) =>
      ingredient(entry.split(":", 1)[0]).categories[0],
    ),
  );
  assert.equal(salishCategories.has("Side"), true);
  assert.equal(salishCategories.has("Included Ingredients"), true);
});
