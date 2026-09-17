import assert from "node:assert/strict";
import test from "node:test";

import {
  CHICKFILA_GENERATED_RUNTIME_MENU,
  CHICKFILA_INGREDIENT_CATEGORY_ORDER,
} from "../lib/restaurantBuilders/chickfila/generatedRuntimeAdapter.ts";
import { CATEGORY_ICONS } from "../data/menuCategoryIcons.ts";
import { getRestaurantItemRouteData } from "../lib/restaurantItemRouteData.ts";

test("visible Chick-fil-A ingredients have exactly one canonical browse category", () => {
  const visibleIngredients = CHICKFILA_GENERATED_RUNTIME_MENU.ingredients.filter(
    (ingredient) => ingredient.nutrition,
  );

  assert.equal(visibleIngredients.length, 51);
  assert.ok(
    visibleIngredients.every((ingredient) => ingredient.categories?.length === 1),
  );

  const counts = Object.fromEntries(
    CHICKFILA_INGREDIENT_CATEGORY_ORDER.map((category) => [
      category,
      visibleIngredients.filter((ingredient) => ingredient.categories[0] === category).length,
    ]),
  );

  assert.deepEqual(counts, {
    Proteins: 11,
    "Buns & Bread": 7,
    Cheese: 4,
    Toppings: 5,
    "Salad & Fruit Toppings": 9,
    "Milk & Creamers": 3,
    "Syrups & Sweeteners": 7,
    "Dessert Toppings & Mix-ins": 5,
  });
});

test("every Chick-fil-A ingredient category has a specific sidebar icon", () => {
  CHICKFILA_INGREDIENT_CATEGORY_ORDER.forEach((category) => {
    assert.equal(typeof CATEGORY_ICONS[category.toLowerCase()], "object");
  });
});

test("a Chick-fil-A ingredient resolves through the existing item-details route", async () => {
  const routeData = await getRestaurantItemRouteData(
    "chickfila",
    "cfa-modifier-1000391",
  );

  assert.equal(routeData?.item.name, "Bacon");
  assert.equal(routeData?.item.ingredientRef, "cfa-modifier-1000391");
  assert.equal(routeData?.item.nutrition.calories, 50);
});
