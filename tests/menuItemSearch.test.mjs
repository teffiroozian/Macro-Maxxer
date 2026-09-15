import test from "node:test";
import assert from "node:assert/strict";
import { searchAllContent } from "../lib/search/searchAllContent.ts";
import { getMenuItemSearchResultName } from "../lib/search/resultLabels.ts";

const restaurant = { id: "starbucks", name: "Starbucks", logo: "/starbucks.png" };
const item = (name, defaultOrder) => ({
  id: name.toLowerCase().replaceAll(" ", "-"),
  name,
  image: "/item.png",
  categories: ["Drinks"],
  servingType: "drink",
  defaultOrder,
  nutrition: { calories: 100, protein: 10, carbs: 10, totalFat: 2 },
});
const index = [{
  restaurant,
  items: [
    item("Lavender Matcha", 1),
    item("Iced Lavender Cream Matcha", 2),
    item("Iced Caramel Protein Latte", 3),
    item("Matcha Lavender", 4),
  ],
  ingredients: [],
}];

test("menu search matches name tokens in order with intervening words", () => {
  assert.deepEqual(
    searchAllContent(index, "lavender matcha").map((result) => result.item.name),
    ["Lavender Matcha", "Iced Lavender Cream Matcha"],
  );
  assert.equal(searchAllContent(index, "caramel latte")[0].item.name, "Iced Caramel Protein Latte");
  assert.equal(searchAllContent(index, "lavender matcha").some((result) => result.item.name === "Matcha Lavender"), false);
});

test("Starbucks search result names omit selected size suffixes", () => {
  assert.equal(getMenuItemSearchResultName({
    itemName: "Iced Lavender Cream Matcha",
    restaurantId: "starbucks",
    variantLabel: "Grande",
    showVariant: true,
  }), "Iced Lavender Cream Matcha");

  assert.equal(getMenuItemSearchResultName({
    itemName: "Example Drink",
    restaurantId: "chick-fil-a",
    variantLabel: "Large",
    showVariant: true,
  }), "Example Drink (Large)");
});
