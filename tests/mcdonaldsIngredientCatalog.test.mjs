import assert from "node:assert/strict";
import test from "node:test";
import { Diamond, Drumstick, Droplets, Layers3, LeafyGreen, PackageOpen, Sandwich, Soup } from "lucide-react";

import { MCDONALDS_INGREDIENT_CATEGORY_ICON_OVERRIDES as categoryIcons } from "../data/menuCategoryIcons.ts";
import { resolvePanelIngredients } from "../lib/itemDetails/ingredientResolution.ts";
import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const visible = menu.ingredients.filter((ingredient) => !ingredient.hideFromIngredientView);
const viewName = (ingredient) => ingredient.ingredientViewName ?? ingredient.name;
const viewCategory = (ingredient) => (ingredient.ingredientViewCategories ?? ingredient.categories)[0];
const viewImage = (ingredient) => ingredient.ingredientViewImage ?? ingredient.image;

test("McDonald's Ingredients categories use relevant existing sidebar icons", () => {
  assert.deepEqual(categoryIcons, {
    bread: Sandwich,
    cheeses: Diamond,
    hotcakes: Layers3,
    oatmeal: Soup,
    potatoes: PackageOpen,
    protein: Drumstick,
    sauces: Droplets,
    toppings: LeafyGreen,
  });
});

test("McDonald's Ingredients view exposes one canonical card per logical ingredient", () => {
  assert.equal(menu.ingredients.length, 454, "contextual source records remain intact");
  assert.equal(visible.length, 64);
  assert.equal(new Set(visible.map((ingredient) => viewName(ingredient).toLowerCase())).size, visible.length);

  for (const name of ["Potato Roll", "Regular Bun", "American Cheese", "Mac Sauce", "Shredded Lettuce", "Tangy BBQ Dipping Sauce"]) {
    assert.equal(visible.filter((ingredient) => viewName(ingredient) === name).length, 1, name);
  }
});

test("ingredient catalog preserves meaningful product and portion distinctions", () => {
  for (const names of [
    ["100% Beef Patty", "Quarter Pound 100% Beef Patty"],
    ["American Cheese", "American Cheese Half Slice"],
    ["Pickle", "Crinkle Cut Pickle"],
    ["Tomato", "2 Tomato Slices"],
    ["Bacon (2 Half Strips)", "Bacon (3 Half Strips)"],
  ]) {
    assert.ok(names.every((name) => visible.some((ingredient) => viewName(ingredient) === name)), names.join(" / "));
  }
});

test("canonical McDonald's ingredient categories and official artwork stay clean", () => {
  const expectedCounts = {
    Bread: 9,
    Cheeses: 3,
    Hotcakes: 1,
    Oatmeal: 1,
    Potatoes: 1,
    Protein: 15,
    Sauces: 23,
    Toppings: 11,
  };
  assert.deepEqual(
    Object.fromEntries([...Map.groupBy(visible, viewCategory)]
      .map(([category, ingredients]) => [category, ingredients.length])
      .sort(([left], [right]) => left.localeCompare(right))),
    expectedCounts,
  );
  assert.ok(visible.filter((ingredient) => viewName(ingredient) !== "Salt").every((ingredient) =>
    viewImage(ingredient)?.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/")
  ));
  assert.equal(visible.some((ingredient) => viewName(ingredient) === "No Sauce"), false);
});

test("hidden duplicate records still resolve parent-specific customization", () => {
  const potatoRollRecords = menu.ingredients.filter((ingredient) => ingredient.name === "Potato Roll");
  assert.equal(potatoRollRecords.length, 4);
  assert.equal(potatoRollRecords.filter((ingredient) => !ingredient.hideFromIngredientView).length, 1);

  for (const itemId of ["mcd-item-203747", "mcd-item-203745", "mcd-item-203901", "mcd-item-203873"]) {
    const item = menu.items.find((candidate) => candidate.id === itemId);
    const ingredients = resolvePanelIngredients(
      item, menu.ingredients, undefined, menu.items, item.variants, item.defaultVariantId, menu.customizationRules,
    );
    assert.ok(ingredients.some((ingredient) => ingredient.label === "Potato Roll" && ingredient.defaultCount === 1));
  }
});
