import test from "node:test";
import assert from "node:assert/strict";
import { getOfficialRankingItems, getMenuItemDetailsHref } from "../lib/menuSections/ranking.ts";
import { getRestaurantData, toItemSlug } from "../lib/restaurants.ts";
import { getRestaurantItemRouteData } from "../lib/restaurantItemRouteData.ts";
import { getDefaultMenuItemNutrition, resolveMenuItemVariantNutrition } from "../lib/nutrition.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { sortItems } from "../lib/menuSections/sorting.ts";
import { SORT_OPTION_VALUES } from "../lib/menuSections/sortOptions.ts";

const restaurant = await getRestaurantData("chickfila");
const salad = restaurant.items.find((item) => item.name === "Cobb Salad");

test("official salad variants rank independently without changing catalog configurations", () => {
  const original = structuredClone(salad);
  const rows = getOfficialRankingItems([salad]);
  assert.equal(rows.length, salad.variants.length);
  assert.ok(rows.some((row) => row.variants[0].label.includes("Chick-n-Strips")));
  assert.ok(rows.some((row) => row.variants[0].label.includes("Grilled Nuggets")));
  for (const row of rows) {
    const source = salad.variants.find((variant) => variant.id === row.defaultVariantId);
    assert.ok(source.source.menu.recordId);
    assert.deepEqual(row.nutrition, resolveMenuItemVariantNutrition(salad, source));
    assert.deepEqual(getDefaultMenuItemNutrition(row), row.nutrition);
    assert.equal(row.image, source.image ?? salad.image);
    assert.equal(row.variants[0].label, source.label);
    assert.deepEqual(row.includedIngredients, salad.includedIngredients);
  }
  for (const sort of [SORT_OPTION_VALUES.HIGHEST_PROTEIN, SORT_OPTION_VALUES.LOWEST_CALORIES, SORT_OPTION_VALUES.HIGHEST_PROTEIN_SCORE]) {
    assert.deepEqual(sortItems(rows, sort).map((row) => row.defaultVariantId).sort(), salad.variants.map((variant) => variant.id).sort());
  }
  assert.deepEqual(salad, original);
});

test("card URLs and detail resolution select the exact ranked variant and retain customization", async () => {
  for (const row of getOfficialRankingItems([salad])) {
    const href = getMenuItemDetailsHref(`/restaurant/chickfila/${toItemSlug(salad)}`, "sort=highest-protein&variant=stale", row.defaultVariantId);
    const url = new URL(href, "https://example.test");
    assert.equal(url.searchParams.get("sort"), "highest-protein");
    assert.equal(url.searchParams.getAll("variant").length, 1);
    const detail = await getRestaurantItemRouteData("chickfila", toItemSlug(salad), url.searchParams.get("variant"));
    assert.equal(detail.initialVariantId, row.defaultVariantId);
    assert.equal(detail.item.variants.length, salad.variants.length);
    const selected = detail.item.variants.find((variant) => variant.id === detail.initialVariantId);
    assert.equal(selected.image ?? detail.item.image, row.image);
    assert.deepEqual(resolveMenuItemVariantNutrition(detail.item, selected), row.nutrition);
    assert.equal(selected.label, row.variants[0].label);
  }
  const invalid = await getRestaurantItemRouteData("chickfila", toItemSlug(salad), "not-an-official-variant");
  assert.equal(invalid.initialVariantId, undefined);
  assert.equal(getMenuItemDetailsHref("/item", "variant=stale&sort=highest-protein"), "/item?sort=highest-protein");
});

test("nutrition filters evaluate each official variant before sorting", () => {
  const rows = getOfficialRankingItems([salad]);
  const cutoff = Math.min(...rows.map((row) => row.nutrition.calories));
  const filtered = filterMenuItems({ items: rows, filters: { caloriesMax: cutoff }, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false });
  assert.deepEqual(filtered.map((row) => row.defaultVariantId), rows.filter((row) => row.nutrition.calories <= cutoff).map((row) => row.defaultVariantId));
});
