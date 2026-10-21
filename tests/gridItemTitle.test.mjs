import test from "node:test";
import assert from "node:assert/strict";
import { getRankedMenuItemTitle, getGridTitleRevealDuration, GRID_TITLE_REVEAL_SPEED } from "../lib/menuItemCard/titlePresentation.ts";

test("ranked Grid and List titles share item-first variant formatting", () => {
  assert.equal(getRankedMenuItemTitle("Iced Protein Matcha", "Grande"), "Iced Protein Matcha (Grande)");
  assert.equal(getRankedMenuItemTitle("Grilled Nuggets", "12 Ct"), "Grilled Nuggets (12 ct)");
  assert.equal(getRankedMenuItemTitle("French Fries", "Large"), "French Fries (Large)");
  assert.equal(getRankedMenuItemTitle("Grilled Nuggets (12 ct)", "12 Count"), "Grilled Nuggets (12 ct)");
  assert.equal(getRankedMenuItemTitle("Plain Item"), "Plain Item");
});

test("forward reveal duration uses the actual travel distance at a constant speed", () => {
  assert.equal(GRID_TITLE_REVEAL_SPEED, 40);
  assert.equal(getGridTitleRevealDuration(40), 1000);
  assert.equal(getGridTitleRevealDuration(120), 3000);
  assert.equal(getGridTitleRevealDuration(15), 375);
  assert.equal(getGridTitleRevealDuration(0), 0);
});

test("generic single-serving variants are suppressed without hiding meaningful variants", async () => {
  const { isGenericSingleServingLabel, getCleanMenuItemName } = await import("../lib/menuItemCard/titlePresentation.ts");
  for (const label of ["1 Serving", "1 serving", "1  SERVING", "1-serving", "1.0 Serving", "Single Serving", "One Serving", "Single Serve", "1_serving"]) {
    assert.equal(isGenericSingleServingLabel(label), true);
    assert.equal(getRankedMenuItemTitle("Turkey Bacon Sandwich", label), "Turkey Bacon Sandwich");
    assert.equal(getCleanMenuItemName(`Protein Box (${label})`), "Protein Box");
  }
  for (const label of ["Tall", "Grande", "Venti", "Small", "Medium", "Large", "1 Piece", "12 ct", "Vanilla", "Grilled Nuggets", "2 Servings"]) {
    assert.equal(isGenericSingleServingLabel(label), false);
    assert.ok(getRankedMenuItemTitle("Example", label).includes("("));
  }
});

test("search and cart display names suppress serving labels without changing saved data", async () => {
  const { getMenuItemSearchResultName } = await import("../lib/search/resultLabels.ts");
  const { formatCartItemName } = await import("../lib/cart/displayLabels.ts");
  assert.equal(getMenuItemSearchResultName({ itemName: "Protein Box", variantLabel: "1 Serving", showVariant: true, restaurantId: "example" }), "Protein Box");
  const saved = { name: "Protein Box (1 Serving)", customizations: [] };
  assert.equal(formatCartItemName(saved), "Protein Box");
  assert.equal(saved.name, "Protein Box (1 Serving)");
});
