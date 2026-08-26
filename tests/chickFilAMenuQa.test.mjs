import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CATEGORY_ICONS } from "../data/menuCategoryIcons.ts";
import { getCartItemVariantId } from "../lib/cart/itemAccessors.ts";
import { resolveCartItemMainItem } from "../lib/cart/cartItemLookup.ts";
import {
  buildStandardCartItemPayload,
  resolveStandardItemVariant,
} from "../lib/cart/standardItemConfiguration.ts";
import { countItemsByCategory, sortItems } from "../lib/menuSections/sorting.ts";
import { SORT_OPTION_VALUES } from "../lib/menuSections/sortOptions.ts";
import { isStandaloneMenuItem } from "../lib/menuItemCalculations.ts";
import { resolveMenuItemVariantNutrition } from "../lib/nutrition.ts";

const restaurant = JSON.parse(
  await readFile(
    new URL("../data/generated/chick-fil-a/restaurant.json", import.meta.url),
    "utf8",
  ),
);

const visibleItems = restaurant.items.filter(isStandaloneMenuItem);

function visibleIn(category) {
  return visibleItems.filter((item) => item.categories?.includes(category));
}

test("every active Chick-fil-A browse category has a configured icon", () => {
  const taxonomy = [
    "sandwiches",
    "chicken",
    "salads",
    "wraps",
    "breakfast",
    "sides",
    "coffee",
    "beverages",
    "treats",
    "kids",
    "sauces",
    "dressings",
    "condiments",
  ];
  const activeCategories = new Set(
    visibleItems.flatMap((item) => item.categories ?? []).map((category) => category.toLowerCase()),
  );
  for (const category of new Set([...taxonomy, ...activeCategories])) {
    assert.equal(typeof CATEGORY_ICONS[category], "object", `Missing icon for ${category}`);
  }
});

test("cheese SKU families render as one component customization with official variants", () => {
  const expected = new Map([
    ["Chick-fil-A® Deluxe Sandwich", ["American", "Colby Jack", "Pepper Jack", "No Cheese"]],
    ["Spicy Deluxe Sandwich", ["Pepper Jack", "American", "Colby Jack", "No Cheese"]],
    [
      "Chick-fil-A® Grilled Chicken Club Sandwich",
      ["Colby Jack", "American", "Pepper Jack", "No Cheese"],
    ],
  ]);

  const cheeseFamilies = visibleItems.filter((item) => item.variantGroupLabel === "Cheese");
  assert.deepEqual(cheeseFamilies.map((item) => item.name).sort(), [...expected.keys()].sort());
  for (const item of cheeseFamilies) {
    assert.equal(item.variantGroupLabel, "Cheese");
    assert.equal(item.hideVariantSelector, true);
    assert.deepEqual(item.variants.map((variant) => variant.label), expected.get(item.name));
    assert.ok(item.variants.every((variant) => variant.nutrition));
    assert.ok(item.variants.every((variant) => variant.source.menu.retailModifiedItemId));
    assert.ok(item.variants.some((variant) => variant.id === item.defaultVariantId));
  }
});

test("salads remain one logical product with protein customization", () => {
  const expected = ["Cobb Salad", "Spicy Southwest Salad", "Market Salad"];
  for (const name of expected) {
    const matches = visibleItems.filter((item) => item.name === name);
    assert.equal(matches.length, 1, `${name} should appear once total`);
    const [salad] = matches;
    assert.deepEqual(salad.categories, ["Salads"]);
    assert.equal(salad.variantGroupKind, "component");
    assert.equal(salad.variantGroupLabel, "Protein");
    assert.equal(salad.hideVariantSelector, true);
    assert.ok(salad.variants.length >= 9);
    assert.ok(salad.variants.every((variant) => variant.nutrition));
    assert.ok(salad.variants.every((variant) => variant.source.menu.retailModifiedItemId));
  }
  assert.equal(visibleIn("Salads").length, 3);
});

test("scramble protein SKU families are component choices with exact cart identity", () => {
  const expectedChoices = [
    "Nuggets",
    "Sausage",
    "Grilled Filet",
    "Spicy Chicken",
    "Bacon",
    "No Meat",
  ];
  for (const name of ["Hash Brown Scramble Burrito", "Hash Brown Scramble Bowl"]) {
    const matches = visibleItems.filter((item) => item.name === name);
    assert.equal(matches.length, 1, `${name} should appear once total`);
    const [item] = matches;
    assert.equal(item.variantGroupKind, "component");
    assert.equal(item.variantGroupLabel, "Protein");
    assert.equal(item.hideVariantSelector, true);
    assert.deepEqual(item.variants.map((variant) => variant.label), expectedChoices);
    assert.equal(item.variants.find((variant) => variant.id === item.defaultVariantId)?.label, "Nuggets");
    assert.ok(item.variants.every((variant) => variant.nutrition));

    const bacon = item.variants.find((variant) => variant.label === "Bacon");
    assert.ok(bacon);
    const nutrition = resolveMenuItemVariantNutrition(item, bacon);
    const payload = buildStandardCartItemPayload({
      item,
      selectedVariant: bacon,
      quantity: 1,
      nutritionPerItem: nutrition,
    });
    const cartItem = {
      id: `qa-${item.id}`,
      restaurantId: "chickfila",
      itemId: item.id,
      ...payload,
    };
    assert.equal(getCartItemVariantId(cartItem), bacon.id);
    assert.equal(resolveCartItemMainItem(cartItem)?.variantLabel, "Bacon");
    assert.deepEqual(resolveCartItemMainItem(cartItem)?.nutrition, bacon.nutrition);
  }

  const secondaryStates = restaurant.items.filter((item) =>
    /Hash Brown Scramble .* - no hash brown/i.test(item.name),
  );
  assert.equal(secondaryStates.length, 12);
  assert.ok(secondaryStates.every((item) => item.sourceOnly === true));
});

test("Fruit Cup canonicalizes the official Small, Medium, and Large SKUs", () => {
  const fruitCups = visibleItems.filter((item) => item.name === "Fruit Cup");
  assert.equal(fruitCups.length, 1);
  const [fruitCup] = fruitCups;
  assert.deepEqual(fruitCup.variants.map((variant) => variant.label), [
    "Small",
    "Medium",
    "Large",
  ]);
  assert.deepEqual(
    fruitCup.variants.map((variant) => ({
      label: variant.label,
      retailModifiedItemId: variant.source.menu.retailModifiedItemId,
      identitySource: variant.source.menu.identitySource,
      calories: variant.nutrition.calories,
      protein: variant.nutrition.protein,
      carbs: variant.nutrition.carbs,
      totalFat: variant.nutrition.totalFat,
    })),
    [
      { label: "Small", retailModifiedItemId: "1004575", identitySource: "menu", calories: 60, protein: 1, carbs: 14, totalFat: 0 },
      { label: "Medium", retailModifiedItemId: "1004576", identitySource: "menu", calories: 70, protein: 1, carbs: 16, totalFat: 0 },
      { label: "Large", retailModifiedItemId: "1004577", identitySource: "ordering_nutrition", calories: 120, protein: 1, carbs: 28, totalFat: 0 },
    ],
  );
});

test("lemonade families use concise sibling-derived labels", () => {
  for (const name of [
    "Pineapple Dragonfruit Lemonade",
    "Pineapple Dragonfruit Frosted Lemonade",
    "Frosted Lemonade",
  ]) {
    const matches = visibleItems.filter((item) => item.name === name);
    assert.equal(matches.length, 1);
    assert.deepEqual(matches[0].variants.map((variant) => variant.label), [
      "Lemonade",
      "Diet Lemonade",
    ]);
    assert.ok(matches[0].variants.every((variant) => variant.source.menu.names.length > 0));
  }
});

test("six-count cookie derives every additive field from official per-cookie nutrition", () => {
  const cookie = visibleItems.find((item) => item.name === "Chocolate Chunk Cookie");
  assert.ok(cookie);
  const one = cookie.variants.find((variant) => variant.label === "1 Ct");
  const six = cookie.variants.find((variant) => variant.label === "6 Ct");
  assert.ok(one);
  assert.ok(six);
  for (const [field, value] of Object.entries(one.nutrition)) {
    assert.equal(six.nutrition[field], value * 6, field);
  }
  assert.deepEqual(six.source.nutrition.derivation, {
    rule: "official_per_unit_nutrition_times_official_quantity",
    quantity: 6,
    quantitySource: "qtySizeAbbreviation",
    perUnitRetailModifiedItemId: "1004056",
    perUnitNutritionSourceIds: ["10525", "10262"],
  });

  const payload = buildStandardCartItemPayload({
    item: cookie,
    selectedVariant: six,
    quantity: 1,
    nutritionPerItem: resolveMenuItemVariantNutrition(cookie, six),
  });
  const cartItem = {
    id: "qa-cookie-6",
    restaurantId: "chickfila",
    itemId: cookie.id,
    ...payload,
  };
  assert.equal(getCartItemVariantId(cartItem), six.id);
  assert.deepEqual(resolveCartItemMainItem(cartItem)?.nutrition, six.nutrition);
});

test("official Float group renders once with soda-only flavor labels", () => {
  const floats = visibleItems.filter((item) => /float/i.test(item.name));
  assert.equal(floats.length, 1);
  assert.equal(floats[0].name, "Float");
  assert.deepEqual(floats[0].variants.map((variant) => variant.label), [
    "Coke",
    "Coca-Cola Cherry",
    "Diet Coke",
    "Coke Zero Sugar",
    "Barq’s Root Beer",
    "Dr Pepper",
    "Diet Dr Pepper",
    "Hi-C Fruit Punch",
    "Sprite",
    "Powerade Mountain Berry Blast",
  ]);
  assert.ok(floats[0].variants.every((variant) => variant.nutrition));
  assert.ok(
    floats[0].variants.every(
      (variant) => variant.source.menu.retailModifiedItemId,
    ),
  );
});

test("dipping sauces, independently sold 8oz sauces, and dressings remain browseable", () => {
  const sauces = visibleIn("Sauces");
  assert.deepEqual(sauces.map((item) => item.name).sort(), [
    "8oz Barbeque Sauce",
    "8oz Garden Herb Ranch Sauce",
    "8oz Honey Mustard Sauce",
    "8oz Polynesian Sauce",
    "Chick-fil-A® Sauce",
    "Polynesian Sauce",
    "Barbeque Sauce",
    "Garden Herb Ranch Sauce",
    "Honey Mustard Sauce",
    "Zesty Buffalo Sauce",
    "Honey Roasted BBQ Sauce",
    "Sweet & Spicy Sriracha Sauce",
  ].sort());
  assert.deepEqual(
    sortItems(sauces, SORT_OPTION_VALUES.DEFAULT_ORDER).map((item) => item.name),
    [
      "Chick-fil-A® Sauce",
      "Polynesian Sauce",
      "Barbeque Sauce",
      "Garden Herb Ranch Sauce",
      "Honey Mustard Sauce",
      "Zesty Buffalo Sauce",
      "Honey Roasted BBQ Sauce",
      "Sweet & Spicy Sriracha Sauce",
      "8oz Polynesian Sauce",
      "8oz Garden Herb Ranch Sauce",
      "8oz Barbeque Sauce",
      "8oz Honey Mustard Sauce",
    ],
  );

  const dressings = visibleIn("Dressings");
  assert.deepEqual(dressings.map((item) => item.name), [
    "Avocado Lime Ranch Dressing",
    "Garden Herb Ranch Dressing",
    "Fat-Free Honey Mustard Dressing",
    "Light Balsamic Vinaigrette Dressing",
    "Zesty Apple Cider Vinaigrette Dressing",
    "Creamy Salsa Dressing",
    "Light Italian Dressing",
  ]);
  const customizationItemIds = new Set(
    Object.values(restaurant.addonGroups).flatMap((group) => group.itemIds),
  );
  assert.ok(
    sauces
      .filter((item) => item.source.menu.itemClass === "MODIFIER")
      .every((item) => customizationItemIds.has(item.id)),
  );
  assert.ok(dressings.every((item) => customizationItemIds.has(item.id)));
});

test("strong canonical identities do not produce duplicate browse parents", () => {
  const identities = new Set();
  for (const item of visibleItems.filter(
    (candidate) => candidate.source.menu.itemClass === "ITEM_GROUPING" && candidate.variants?.length,
  )) {
    const retailIds = item.variants
      .map((variant) => variant.source.menu.retailModifiedItemId)
      .sort()
      .join(",");
    const identity = `${[...item.source.menu.tags].sort().join(",")}|${retailIds}|${item.categories[0]}`;
    assert.equal(identities.has(identity), false, `Duplicate canonical product: ${item.name}`);
    identities.add(identity);
  }
});

test("a cheese choice keeps its SKU and exact nutrition through cart/edit resolution", () => {
  const item = visibleItems.find((candidate) => candidate.name === "Spicy Deluxe Sandwich");
  assert.ok(item);
  const selectedVariant = resolveStandardItemVariant({
    variants: item.variants,
    selectedVariantId: "cfa-item-1001443",
    defaultVariantId: item.defaultVariantId,
  });
  assert.equal(selectedVariant?.label, "No Cheese");
  const nutrition = resolveMenuItemVariantNutrition(item, selectedVariant);
  assert.equal(nutrition.calories, 460);

  const payload = buildStandardCartItemPayload({
    item,
    selectedVariant,
    quantity: 1,
    nutritionPerItem: nutrition,
  });
  const cartItem = {
    id: "qa-spicy-deluxe",
    restaurantId: "chickfila",
    itemId: item.id,
    ...payload,
  };
  assert.equal(getCartItemVariantId(cartItem), selectedVariant.id);
  assert.deepEqual(resolveCartItemMainItem(cartItem), {
    name: item.name,
    image: selectedVariant.image ?? item.image,
    variantLabel: "No Cheese",
    nutrition,
  });
});

test("limited Chicken & Waffles sandwiches use Sandwiches as their sole browse category", () => {
  const waffles = visibleItems.filter((item) => /Chicken & Waffles/i.test(item.name));
  assert.equal(waffles.length, 6);
  assert.ok(waffles.every((item) => item.status === "limited-time"));
  assert.ok(waffles.every((item) => JSON.stringify(item.categories) === '["Sandwiches"]'));
  assert.ok(
    waffles.some((item) => item.source.menu.officialCategories.includes("Breakfast")),
    "Breakfast provenance should remain intact",
  );
});

test("user-facing names and variant labels contain no raw HTML", () => {
  const displayStrings = [
    ...restaurant.items.flatMap((item) => [item.name, ...(item.variants ?? []).map((v) => v.label)]),
    ...restaurant.ingredients.map((ingredient) => ingredient.name),
  ];
  assert.ok(displayStrings.every((value) => !/<\/?[a-z][^>]*>|&(?:#x?[0-9a-f]+|[a-z]+);/i.test(value)));
  const fries = visibleItems.find((item) => item.name === "Chick-fil-A Waffle Potato Fries®");
  assert.ok(fries);
  assert.ok(fries.source.menu.names.some((name) => name.includes("<sup>")));
});

test("Sides preserve official order, dedupe Berry Parfait, and append Hash Browns", () => {
  const sides = sortItems(visibleIn("Sides"), SORT_OPTION_VALUES.DEFAULT_ORDER).map(
    (item) => item.name,
  );
  assert.deepEqual(sides, [
    "Chick-fil-A Waffle Potato Fries®",
    "Fruit Cup",
    "Side Salad",
    "Mac & Cheese",
    "Chicken Noodle Soup",
    "Kale Crunch Side",
    "Berry Parfait",
    "Original Flavor Waffle Potato Chips",
    "Buddy Fruits® Apple Sauce",
    "Hash Browns",
  ]);
  assert.equal(sides.filter((name) => name === "Berry Parfait").length, 1);
});

test("Bag of Ice and its mixed Gallon Beverages container stay off user surfaces", () => {
  const forbidden = /Bag of Ice|Gallon Beverages/i;
  assert.equal(visibleItems.some((item) => forbidden.test(item.name)), false);
  const retained = restaurant.items.filter((item) => forbidden.test(item.name));
  assert.ok(retained.length >= 2, "source records should remain retained internally");
  assert.ok(retained.every((item) => item.sourceOnly === true));
  assert.ok(retained.every((item) => !isStandaloneMenuItem(item)));
});

test("category counts match visible generated menu items", () => {
  assert.deepEqual(countItemsByCategory(visibleItems), {
    sandwiches: 12,
    breakfast: 12,
    sides: 10,
    chicken: 3,
    wraps: 2,
    coffee: 5,
    treats: 15,
    beverages: 30,
    salads: 3,
    sauces: 12,
    dressings: 7,
  });
});
