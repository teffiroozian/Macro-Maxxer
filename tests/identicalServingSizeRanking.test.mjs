import test from "node:test";
import assert from "node:assert/strict";
import { getOfficialRankingItems, selectRankingItems } from "../lib/menuSections/ranking.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { getRestaurantData, toItemSlug } from "../lib/restaurants.ts";
import { getRestaurantItemRouteData } from "../lib/restaurantItemRouteData.ts";

const zero = { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
const family = { id: "drink", name: "Drink", image: "/image.png", categories: ["drinks"], servingType: "drink", defaultVariantId: "medium", nutrition: zero, variants: [
  { id: "small", label: "Small", categories: ["drinks"], nutrition: zero },
  { id: "medium", label: "Medium", categories: ["drinks"], nutrition: zero },
  { id: "large", label: "Large", categories: ["drinks"], nutrition: zero },
] };

test("identical size macros dedupe in every ranking mode, even when separate sizes are enabled", () => {
  const original = structuredClone(family);
  const rows = getOfficialRankingItems([family]);
  for (const metric of ["protein", "calories", "carbs", "fat", "protein-score"]) {
    for (const direction of ["highest", "lowest"]) {
      const result = selectRankingItems(rows, `${direction}-${metric}`, { separateSizesInProteinScore: true });
      assert.deepEqual(result.map((row) => row.defaultVariantId), ["medium"]);
    }
  }
  assert.deepEqual(family, original);
});

test("equality is exact across all four macros and limited to the same parent and recipe", () => {
  const rows = getOfficialRankingItems([family]);
  for (const field of ["calories", "protein", "carbs", "totalFat"]) {
    const changed = { ...rows[2], nutrition: { ...zero, [field]: 0.000001 }, variants: [{ ...rows[2].variants[0], nutrition: { ...zero, [field]: 0.000001 } }] };
    assert.equal(selectRankingItems([rows[0], rows[1], changed], "highest-protein").length, 2, field);
  }
  assert.equal(selectRankingItems([rows[0], { ...rows[1], id: "other-family" }], "highest-protein").length, 2);
  assert.equal(selectRankingItems(rows.map((row) => ({ ...row, variantGroupKind: "component" })), "highest-protein").length, 3);
  const flavored = { ...rows[2], variants: [{ ...rows[2].variants[0], label: "Lemon Large" }] };
  assert.equal(selectRankingItems([rows[0], rows[1], flavored], "highest-protein").length, 2);
});

test("different macros still follow the serving-size toggle and normal filtering", () => {
  const varied = { ...family, variants: family.variants.map((variant, index) => ({ ...variant, nutrition: { ...zero, calories: index * 10 } })) };
  const rows = getOfficialRankingItems([varied]);
  assert.equal(selectRankingItems(rows, "highest-calories").length, 3);
  assert.deepEqual(selectRankingItems(rows, "highest-calories", { showServingSizeVariants: false }).map((row) => row.defaultVariantId), ["medium"]);
  const common = { items: getOfficialRankingItems([family]), filters: {}, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };
  assert.equal(filterMenuItems(common).length, 1);
  assert.equal(filterMenuItems({ ...common, isRankingView: false }).length, 3);
});

test("real unsweetened tea uses the normalized default while details retain every official size", async () => {
  const restaurant = await getRestaurantData("chickfila");
  const tea = restaurant.items.find((item) => item.name === "Freshly-Brewed Unsweetened Iced Tea" && !item.sourceOnly);
  const result = selectRankingItems(getOfficialRankingItems([tea]), "highest-protein");
  assert.equal(result.length, 1);
  assert.equal(result[0].defaultVariantId, tea.defaultVariantId ?? tea.variants[0].id);
  const detail = await getRestaurantItemRouteData("chickfila", toItemSlug(tea), result[0].defaultVariantId);
  assert.deepEqual(detail.item.variants, tea.variants);
});
