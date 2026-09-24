import assert from "node:assert/strict";
import test from "node:test";

import quarterPounderMealItemPage from "../data/restaurants/mcdonalds/research/ordering/raw/quarter-pounder-meal-item-page.json" with { type: "json" };
import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";

const menu = MCDONALDS_GENERATED_RUNTIME_MENU;
const meal = menu.items.find((item) => item.id === "mcd-item-200720");
const sourceOptions = quarterPounderMealItemPage.data.itemPage.optionLists.find((group) => group.name === "Select Drink").options;
const ambiguous = new Set([
  "Frozen Fanta® Wild Cherry", "Reduced Sugar Dirty Dr Pepper®", "POWERADE®",
  "Hi-C® Orange", "Iced Latte", "Iced Mocha",
]);

test("reviewed McDonald's beverage records are consolidated into size families", () => {
  const expected = {
    "mcd-item-203057": ["mcd-item-203057", "mcd-item-203058", "mcd-item-203063"],
    "mcd-item-203957": ["mcd-item-203957", "mcd-item-203958", "mcd-item-203962"],
    "mcd-item-201038": ["mcd-item-201038", "mcd-item-201459", "mcd-item-201074"],
    "mcd-item-204209": ["mcd-item-204209", "mcd-item-204216", "mcd-item-204184"],
    "mcd-item-200390": ["mcd-item-200390", "mcd-item-200389", "mcd-item-200388"],
    "mcd-item-204695": ["mcd-item-204695", "mcd-item-204687", "mcd-item-204689"],
  };
  for (const [id, variantIds] of Object.entries(expected)) {
    const item = menu.items.find((candidate) => candidate.id === id);
    assert.ok(item, `missing ${id}`);
    assert.deepEqual(item.variants.map((variant) => variant.id), variantIds);
    assert.ok(item.variants.every((variant) => Number.isFinite(variant.nutrition.calories)));
  }
});

test("64 of 70 combo drinks map and only the six audited ambiguities remain", () => {
  const mappedIds = new Set(meal.comboConfig.drinkGroup.options.map((option) => option.orderingOptionId));
  assert.equal(mappedIds.size, 64);
  assert.deepEqual(sourceOptions.filter((option) => !mappedIds.has(option.id)).map((option) => option.name), [...ambiguous]);
});

test("runtime beverage sections contain the reconciled product counts", () => {
  assert.equal(menu.items.filter((item) => item.categories[0] === "Drinks" && !item.sourceOnly).length, 25);
  assert.equal(menu.items.filter((item) => item.categories[0] === "McCafé" && !item.sourceOnly).length, 43);
});

test("McCafé branding stays in source metadata but not presentation names", () => {
  const sourceNamed = menu.items.filter((item) => /^McCafé(?:®)?\s/i.test(item.source?.generated?.menu?.originalName ?? ""));
  assert.ok(sourceNamed.length > 0);
  assert.ok(sourceNamed.every((item) => !/^McCafé(?:®)?\s/i.test(item.name)));
  assert.ok(sourceNamed.every((item) => /^McCafé(?:®)?\s/i.test(item.source.generated.menu.originalName)));
});

test("selected fries and beverage variants use loadable exact or same-family images", () => {
  const fries = menu.items.find((item) => item.id === "mcd-item-200066");
  const mediumFries = fries.variants.find((variant) => variant.id === "mcd-item-201234");
  const largeFries = fries.variants.find((variant) => variant.id === "mcd-item-200083");
  assert.equal(mediumFries.image, fries.image);
  assert.equal(largeFries.image, fries.image);

  const coke = menu.items.find((item) => item.id === "mcd-item-200611");
  assert.ok(coke.variants.every((variant) => variant.image.includes("scene7.com/is/image/mcdonalds/")));
  assert.ok(coke.variants.every((variant) => /coke/i.test(variant.image)));

  const fanta = menu.items.find((item) => item.id === "mcd-item-203057");
  const fantaFamilyImage = menu.items.find((item) => item.id === "mcd-item-204716").image;
  assert.equal(fanta.image, fantaFamilyImage);
  assert.ok(fanta.variants.every((variant) => variant.image === fantaFamilyImage));

  const dietDrPepper = menu.items.find((item) => item.id === "mcd-item-200614");
  const drPepperFamilyImage = menu.items.find((item) => item.id === "mcd-item-200613").image;
  assert.equal(dietDrPepper.image, drPepperFamilyImage);
  assert.ok(dietDrPepper.variants.every((variant) => variant.image === drPepperFamilyImage));

  assert.ok(menu.items.flatMap((item) => [item.image, ...(item.variants ?? []).map((variant) => variant.image)])
    .every((image) => image === "none" || !/\/h-mcdonalds-|\/mcdonalds-/i.test(image)));
});

test("reviewed beverage families use their official same-family fallback before no-image", () => {
  const fallbackPairs = [
    ["mcd-item-204484", "mcd-item-204498"],
    ["mcd-item-204702", "mcd-item-204688"],
    ["mcd-item-203967", "mcd-item-203957"],
    ["mcd-item-203964", "mcd-item-203957"],
    ["mcd-item-200591", "mcd-item-204219"],
    ["mcd-item-200223", "mcd-item-204209"],
    ["mcd-item-200333", "mcd-item-200223"],
    ["mcd-item-200706", "mcd-item-204209"],
    ["mcd-item-200390", "mcd-item-200186"],
    ["mcd-item-204695", "mcd-item-200149"],
    ["mcd-item-204697", "mcd-item-204208"],
    ["mcd-item-204693", "mcd-item-204205"],
    ["mcd-item-204691", "mcd-item-204189"],
  ];
  for (const [itemId, fallbackId] of fallbackPairs) {
    const item = menu.items.find((candidate) => candidate.id === itemId);
    const fallback = menu.items.find((candidate) => candidate.id === fallbackId);
    assert.equal(item.image, fallback.image, `${item.name} should use ${fallback.name}'s family image`);
    assert.notEqual(item.image, "none");
    assert.ok((item.variants ?? []).every((variant) => variant.image === item.image));
  }
});
