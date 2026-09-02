import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CHIPOTLE_GENERATED_RUNTIME_MENU,
} from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import IngredientCompactCardModule from "../components/menu-item-card/IngredientCompactCard.tsx";

const IngredientCompactCard = IngredientCompactCardModule.default ?? IngredientCompactCardModule;
import {
  buildAllChipotleIngredientMenuItems,
} from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import {
  CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID,
} from "../data/restaurants/chipotle-generated-presentation.ts";
import { getOrderedMenuSections } from "../lib/menuSections/sorting.ts";

const ingredients = CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients;
const builderConfig = CHIPOTLE_GENERATED_RUNTIME_MENU.builderConfig;

const allIngredientMenuItems = buildAllChipotleIngredientMenuItems({
  restaurantId: "chipotle",
  ingredients,
  builderConfig,
});

const byId = new Map(allIngredientMenuItems.map((item) => [item.id, item]));

test("View All Ingredients renames Included Ingredients to Base", () => {
  const baseItems = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Base"),
  );
  assert.ok(baseItems.length > 0, "expected at least one Base-category card");
  assert.ok(
    allIngredientMenuItems.every((item) => !item.categories.includes("Included Ingredients")),
    "no card should still carry the old Included Ingredients label",
  );
});

test("Base category exposes exactly the 4 user-facing items", () => {
  const baseItems = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Base"),
  );
  const names = baseItems.map((item) => item.name).sort();
  assert.deepEqual(names, [
    "Crispy Corn Tortilla",
    "Soft Flour Tortilla",
    "Supergreens Salad Mix",
    "Tortilla",
  ]);
});

test("Crispy Corn Tortilla is one card with 1 Taco / 2 Tacos / 3 Tacos variants", () => {
  const card = byId.get("chipotle-tortilla-crispy-corn-taco");
  assert.ok(card, "expected the primary Crispy Corn Tortilla card");
  assert.equal(card.name, "Crispy Corn Tortilla");
  assert.deepEqual(
    card.variants.map((variant) => variant.label),
    ["1 Taco", "2 Tacos", "3 Tacos"],
  );
  assert.equal(card.nutrition.calories, 67);
  const twoTacos = card.variants.find((variant) => variant.id === "chipotle-cmg-5403");
  assert.equal(twoTacos.nutrition.calories, 130);
  const threeTacos = card.variants.find((variant) => variant.id === "chipotle-tortilla-crispy-corn-tacos-3");
  assert.equal(threeTacos.nutrition.calories, 200);
  // The sibling context records must not also render as their own cards.
  assert.equal(byId.has("chipotle-tortilla-crispy-corn-tacos-3"), false);
  assert.equal(byId.has("chipotle-cmg-5403"), false);
});

test("Soft Flour Tortilla is one card with only 1 Taco / 2 Tacos / 3 Tacos — no separate Kids Quesadilla variant", () => {
  const card = byId.get("chipotle-tortilla-soft-flour-taco");
  assert.ok(card, "expected the primary Soft Flour Tortilla card");
  assert.deepEqual(
    card.variants.map((variant) => variant.label),
    ["1 Taco", "2 Tacos", "3 Tacos"],
  );
  assert.equal(card.nutrition.calories, 83);
  const twoTacos = card.variants.find((variant) => variant.id === "chipotle-cmg-5404");
  assert.equal(twoTacos.nutrition.calories, 170);
  const threeTacos = card.variants.find((variant) => variant.id === "chipotle-tortilla-soft-flour-tacos-3");
  assert.equal(threeTacos.nutrition.calories, 250);
  assert.equal(byId.has("chipotle-tortilla-soft-flour-tacos-3"), false);
  assert.equal(byId.has("chipotle-cmg-5404"), false);
  // The old, less accurate 80-cal Kids Quesadilla tortilla record is fully
  // retired — no separate variant and no standalone duplicate card.
  assert.equal(byId.has("chipotle-cmg-5401"), false);
});

test("Base category items expose the correct official image per item", () => {
  const crispyCorn = byId.get("chipotle-tortilla-crispy-corn-taco");
  assert.match(crispyCorn.image, /crispy-corn-tortilla/);
  const softFlour = byId.get("chipotle-tortilla-soft-flour-taco");
  assert.match(softFlour.image, /flour-tortilla-taco-size/);
  const tortilla = byId.get("chipotle-cmg-4026-burrito-base");
  assert.match(tortilla.image, /flour-tortilla-burrito-size/);
  const supergreens = byId.get("chipotle-salad-supergreens-base");
  assert.match(supergreens.image, /romaine-lettuce/);
});

test("plain Tortilla stays one standalone card with no variants, deduped against its identical twin", () => {
  const card = byId.get("chipotle-cmg-4026-burrito-base");
  assert.ok(card, "expected the standalone Tortilla card");
  assert.equal(card.name, "Tortilla");
  assert.equal(card.variants, undefined);
  assert.equal(card.nutrition.calories, 320);
  // chipotle-cmg-4026 ("Double Wrap with Tortilla") is the identical
  // official tortilla under a second id and must not get its own card.
  assert.equal(byId.has("chipotle-cmg-4026"), false);
});

test("Supergreens Salad Mix stays one standalone card with no variants", () => {
  const card = byId.get("chipotle-salad-supergreens-base");
  assert.ok(card, "expected the Supergreens Salad Mix card");
  assert.equal(card.variants, undefined);
  assert.equal(card.nutrition.calories, 15);
});

test("Supergreens Salad Mix uses the official lettuce artwork, not the whole Salad bowl photo", () => {
  const image = CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID["chipotle-salad-supergreens-base"];
  assert.equal(image, CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID["chipotle-cmg-5351"]);
  assert.notEqual(image, CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID["chipotle-salad"]);
});

test("Proteins category shows each of the 6 real proteins exactly once", () => {
  const proteinItems = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Proteins"),
  );
  const names = proteinItems.map((item) => item.name).sort();
  assert.deepEqual(names, [
    "Beef Barbacoa",
    "Carnitas",
    "Chicken",
    "Pollo Asado",
    "Sofritas",
    "Steak",
  ]);
});

test("Guacamole and Queso Blanco kids protein-slot records never appear in Proteins", () => {
  const proteinItems = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Proteins"),
  );
  assert.ok(!proteinItems.some((item) => item.name === "Guacamole"));
  assert.ok(!proteinItems.some((item) => item.name === "Queso Blanco"));
  assert.equal(byId.has("chipotle-protein-guacamole-kids-byo"), false);
  assert.equal(byId.has("chipotle-protein-guacamole-kids-quesadilla"), false);
  assert.equal(byId.has("chipotle-protein-queso-blanco-kids-byo"), false);
});

test("Steak carries no variants and shows the Normal-portion nutrition as its base", () => {
  const card = byId.get("chipotle-protein-steak");
  assert.ok(card, "expected the primary Steak card");
  // Half/Extra/Taco/Kids must not be exposed as variants on this
  // comparison page — Normal/Double is handled by the same read-only
  // portion-mode toggle the normal builder uses, not by a variants array.
  assert.equal(card.variants, undefined);
  assert.equal(card.defaultVariantId, undefined);
  assert.equal(card.nutrition.calories, 150);
  // Context duplicates (and the numerically-identical Kids Quesadilla twin)
  // must not render as their own standalone cards either.
  for (const duplicateId of [
    "chipotle-protein-steak-taco",
    "chipotle-protein-steak-tacos-3",
    "chipotle-protein-steak-kids-byo",
    "chipotle-protein-steak-kids-quesadilla",
  ]) {
    assert.equal(byId.has(duplicateId), false, `${duplicateId} must not have its own card`);
  }
});

test("every real protein card has no variants and hides its Taco/Kids/Half/Extra context duplicates", () => {
  const expectedNormalCalories = {
    steak: 150,
    chicken: 180,
    carnitas: 210,
    "beef-barbacoa": 170,
    sofritas: 150,
    "pollo-asado": 180,
  };
  for (const [slug, normalCalories] of Object.entries(expectedNormalCalories)) {
    const card = byId.get(`chipotle-protein-${slug}`);
    assert.ok(card, `expected a primary card for ${slug}`);
    assert.equal(card.variants, undefined, `${slug} must not expose a variants array`);
    assert.equal(card.nutrition.calories, normalCalories);
    for (const suffix of ["-taco", "-tacos-3", "-kids-byo", "-kids-quesadilla"]) {
      assert.equal(byId.has(`chipotle-protein-${slug}${suffix}`), false);
    }
  }
});

test("Proteins on this page render only a Normal/Double portion toggle and switch macros correctly", () => {
  const steak = byId.get("chipotle-protein-steak");
  assert.ok(steak);
  const normalOptions = [
    { id: "normal", label: "Normal" },
    { id: "double", label: "Double" },
  ];

  function renderCard(selectedCompactOptionId, multiplier) {
    return renderToStaticMarkup(
      createElement(IngredientCompactCard, {
        item: steak,
        ingredientSelectionState: false,
        isIngredientSelectionDisabled: false,
        ingredientSelectionControl: "checkbox",
        activeCompactOptions: normalOptions,
        selectedCompactOptionId,
        calories: Math.round(steak.nutrition.calories * multiplier),
        protein: Math.round(steak.nutrition.protein * multiplier),
        carbs: Math.round(steak.nutrition.carbs * multiplier),
        totalFat: Math.round(steak.nutrition.totalFat * multiplier),
        onSelectionChange: () => {},
        onCompactOptionSelect: () => {},
        readOnly: true,
      }),
    );
  }

  // Only Normal/Double are offered — no Half, Extra, 1 Taco, 3 Tacos, Kids.
  const normalMarkup = renderCard("normal", 1);
  assert.match(normalMarkup, /Normal/);
  assert.match(normalMarkup, /Double/);
  for (const removedLabel of ["Half", "Extra", "1 Taco", "3 Tacos", "Kids"]) {
    assert.doesNotMatch(normalMarkup, new RegExp(removedLabel));
  }
  assert.match(normalMarkup, />150</); // steak Normal calories

  // Double must show exactly 2x the Normal macros (300/42/2/24 for steak).
  const doubleMarkup = renderCard("double", 2);
  assert.match(doubleMarkup, />300</);
  assert.equal(steak.nutrition.calories * 2, 300);
});

test("Proteins count in the grouped list reflects 6 cards, not the ~30 hidden source records", () => {
  const proteinCount = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Proteins"),
  ).length;
  assert.equal(proteinCount, 6);
});

test("Base sorts first among the sidebar's ingredient category sections", () => {
  const orderedSections = getOrderedMenuSections(allIngredientMenuItems, "ingredients");
  assert.equal(orderedSections[0], "base");
  assert.ok(orderedSections.includes("proteins"));
  assert.ok(orderedSections.indexOf("base") < orderedSections.indexOf("proteins"));
});

test("Toppings shows each normal-builder topping exactly once, matching the regular builder's list", () => {
  const toppingItems = allIngredientMenuItems.filter((item) =>
    item.categories.includes("Toppings"),
  );
  const names = toppingItems.map((item) => item.name).sort();
  assert.deepEqual(names, [
    "Cheese",
    "Chipotle-Honey Vinaigrette",
    "Cilantro Lime Sauce",
    "Fajita Veggies",
    "Fresh Tomato Salsa",
    "Guacamole",
    "Queso Blanco",
    "Roasted Chili-Corn Salsa",
    "Romaine Lettuce",
    "Sour Cream",
    "Tomatillo-Green Chili Salsa",
    "Tomatillo-Red Chili Salsa",
  ]);
  // No two cards may share a name — that's the duplicate-card bug being fixed.
  assert.equal(new Set(names).size, names.length);
});

test("Guacamole and Chipotle-Honey Vinaigrette dedupe their identical-nutrition context records", () => {
  const guac = byId.get("chipotle-cmg-1001");
  assert.ok(guac, "expected the canonical Guacamole card");
  assert.equal(guac.variants, undefined);
  for (const duplicateId of ["chipotle-cmg-5301", "chipotle-cmg-1207"]) {
    assert.equal(byId.has(duplicateId), false, `${duplicateId} must not have its own card`);
  }

  const vinaigrette = byId.get("chipotle-cmg-5353");
  assert.ok(vinaigrette, "expected the canonical Chipotle-Honey Vinaigrette card");
  assert.equal(vinaigrette.variants, undefined);
  assert.equal(byId.has("chipotle-cmg-5354"), false);
});

test("Queso Blanco is one card with Standard/Quesadilla variants using real distinct nutrition", () => {
  const card = byId.get("chipotle-cmg-1029");
  assert.ok(card, "expected the primary Queso Blanco card");
  assert.deepEqual(
    card.variants.map((variant) => variant.label),
    ["Standard", "Quesadilla"],
  );
  assert.equal(card.nutrition.calories, 120);
  const quesadilla = card.variants.find((variant) => variant.id === "chipotle-cmg-4134");
  assert.equal(quesadilla.nutrition.calories, 240);
  // The single-Taco duplicate (identical nutrition to Standard) is hidden.
  assert.equal(byId.has("chipotle-cmg-1034"), false);
});

test("Cilantro Lime Sauce is one card with Standard/Quesadilla & Tacos variants", () => {
  const card = byId.get("chipotle-cmg-5412");
  assert.ok(card, "expected the primary Cilantro Lime Sauce card");
  assert.deepEqual(
    card.variants.map((variant) => variant.label),
    ["Standard", "Quesadilla & Tacos"],
  );
  assert.equal(card.nutrition.calories, 80);
  const quesadillaTacos = card.variants.find((variant) => variant.id === "chipotle-cmg-5414");
  assert.equal(quesadillaTacos.nutrition.calories, 160);
});

test("Side and Beverages categories are removed from View All Ingredients entirely", () => {
  const categoriesPresent = new Set(allIngredientMenuItems.flatMap((item) => item.categories));
  assert.equal(categoriesPresent.has("Side"), false);
  assert.equal(categoriesPresent.has("Beverages"), false);

  const orderedSections = getOrderedMenuSections(allIngredientMenuItems, "ingredients");
  assert.equal(orderedSections.includes("side"), false);
  assert.equal(orderedSections.includes("beverages"), false);

  // Known Side/Beverage-only records (drinks, chips, kids sides, the Bowl
  // side-tortilla add-on) must not appear as their own cards here.
  for (const sideOnlyId of [
    "chipotle-cmg-5551", // 16 fl oz Soda/Iced Tea (carries variant-level "Beverages" categories too)
    "chipotle-cmg-5362", // Chili Lime Chips
    "chipotle-cmg-1401", // Kid's Chips
    "chipotle-cmg-1402", // Kid's Fruit
    "chipotle-cmg-5552", // Organic Apple Juice
    "chipotle-cmg-5553", // Organic Chocolate Milk
    "chipotle-cmg-5554", // Organic Milk
    "chipotle-cmg-4025-bowl-side", // Side Tortilla
  ]) {
    assert.equal(byId.has(sideOnlyId), false, `${sideOnlyId} must not appear on this page`);
  }
});

test("removed Side/Beverages ingredients still exist untouched in the runtime ingredient catalog", () => {
  const runtimeIds = new Set(ingredients.map((ingredient) => ingredient.id));
  for (const sideOnlyId of [
    "chipotle-cmg-5551",
    "chipotle-cmg-5362",
    "chipotle-cmg-1401",
    "chipotle-cmg-1402",
  ]) {
    assert.ok(runtimeIds.has(sideOnlyId), `${sideOnlyId} must remain in runtime data`);
  }
});

test("All Ingredients total count reflects only the remaining grouped comparison items", () => {
  // 4 Base + 12 Toppings + 6 Proteins + 2 Rice + 2 Beans = 26, with Side and
  // Beverages contributing 0 — not the ~40+ hidden source records.
  assert.equal(allIngredientMenuItems.length, 26);
  const countByCategory = {};
  for (const item of allIngredientMenuItems) {
    for (const category of item.categories) {
      countByCategory[category] = (countByCategory[category] ?? 0) + 1;
    }
  }
  assert.deepEqual(countByCategory, {
    Base: 4,
    Toppings: 12,
    Proteins: 6,
    Rice: 2,
    Beans: 2,
  });
});

test("normal builder ingredient categories are untouched by the View All Ingredients rename", () => {
  assert.equal(
    builderConfig.selectedIngredientCategoryLabels["included ingredients"],
    "Included Ingredients",
  );
});
