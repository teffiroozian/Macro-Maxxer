import test from "node:test";
import assert from "node:assert/strict";
import { getRestaurantData, toItemSlug } from "../lib/restaurants.ts";
import { getMenuSizeOptions, ALL_MENU_SIZES } from "../lib/menuSections/menuSizeSelector.ts";
import { getOfficialRankingItems, selectRankingItems } from "../lib/menuSections/ranking.ts";
import { getMenuResultCounts } from "../lib/menuSections/resultCounts.ts";
import { getCategoryPresets, selectCategoryPreset } from "../lib/menuSections/categoryPresets.ts";
import { getRestaurantItemRouteData } from "../lib/restaurantItemRouteData.ts";

const restaurant = await getRestaurantData("starbucks");
const items = restaurant.items.filter((item) => !item.sourceOnly);
const rows = getOfficialRankingItems(items);

test("size capability and its options come from restaurant metadata and actual connected families", () => {
  assert.deepEqual(restaurant.menuSizeSelector, { enabled: true, defaultValue: "Grande", allowedValues: ["Tall", "Grande", "Venti"] });
  const options = getMenuSizeOptions(items, restaurant.menuSizeSelector);
  assert.deepEqual(options.map((option) => option.value), ["Tall", "Grande", "Venti", ALL_MENU_SIZES]);
  for (const option of options.filter((option) => option.value !== ALL_MENU_SIZES)) assert.ok(items.some((item) => item.variants?.some((variant) => variant.label === option.value)));
  assert.deepEqual(getMenuSizeOptions(items, undefined), []);
});

test("Grande picks matching official variants and retains foods and missing-size families", async () => {
  const original = structuredClone(items);
  const selected = selectRankingItems(rows, "highest-protein", {}, "Grande");
  for (const parent of items.filter((item) => item.variants?.some((variant) => variant.label === "Grande") && item.variantGroupKind !== "component")) {
    const candidate = selected.filter((row) => row.id === parent.id);
    assert.equal(candidate.length, 1, parent.name);
    assert.equal(candidate[0].defaultVariantId, parent.variants.find((variant) => variant.label === "Grande").id);
  }
  const food = items.find((item) => item.variants?.every((variant) => variant.label === "1 Serving" || variant.label === "1 Piece"));
  assert.ok(food);
  assert.ok(selected.some((row) => row.id === food.id));
  assert.deepEqual(new Set(selected.map((row) => row.id)), new Set(items.map((item) => item.id)));
  const specific = selected.find((row) => row.variants?.[0]?.label === "Grande");
  const detail = await getRestaurantItemRouteData("starbucks", toItemSlug(specific), specific.defaultVariantId);
  assert.equal(detail.initialVariantId, specific.defaultVariantId);
  assert.ok(detail.item.variants.length > 1);
  assert.deepEqual(items, original);
});

test("missing selected size retains a canonical default, while recipe choices remain distinct", () => {
  const base = { id: "family", name: "Family", image: "/image.png", categories: ["drinks"], servingType: "drink", defaultVariantId: "medium", nutrition: { calories: 100, protein: 5, carbs: 10, totalFat: 2 }, variants: [
    { id: "small", label: "Small", categories: ["drinks"], nutrition: { calories: 80, protein: 4, carbs: 8, totalFat: 1 } },
    { id: "medium", label: "Medium", categories: ["drinks"], nutrition: { calories: 100, protein: 5, carbs: 10, totalFat: 2 } },
  ] };
  const candidates = getOfficialRankingItems([base]);
  assert.equal(selectRankingItems(candidates, "highest-protein", {}, "Grande")[0].defaultVariantId, "medium");
  assert.equal(selectRankingItems(candidates.map((row) => ({ ...row, variantGroupKind: "component" })), "highest-protein", {}, "Grande").length, 2);
});

test("All sizes restores existing settings and category/result counts apply the size preference", () => {
  assert.deepEqual(selectRankingItems(rows, "highest-protein", {}, ALL_MENU_SIZES), selectRankingItems(rows, "highest-protein"));
  assert.deepEqual(selectRankingItems(rows, "highest-protein", { showServingSizeVariants: false }, ALL_MENU_SIZES), selectRankingItems(rows, "highest-protein", { showServingSizeVariants: false }));
  const main = getCategoryPresets(rows, "starbucks").find((preset) => preset.id === "main");
  const input = { items: rows, filters: selectCategoryPreset({}, main), searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };
  const selected = getMenuResultCounts({ ...input, menuSizePreference: "Grande" });
  const all = getMenuResultCounts({ ...input, menuSizePreference: ALL_MENU_SIZES });
  assert.ok(selected.total < all.total);
  assert.equal(selected.matching, selected.total);
  assert.deepEqual(selectRankingItems(rows, "highest-protein-score", { separateSizesInProteinScore: true }, "Grande"), selectRankingItems(rows, "highest-protein-score", {}, "Grande"));
});
