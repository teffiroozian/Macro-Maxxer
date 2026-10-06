import test from "node:test";
import assert from "node:assert/strict";
import { getOfficialRankingItems, selectRankingItems } from "../lib/menuSections/ranking.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
import { getVariantSettings, countVariantSettingsChanges, VARIANT_FILTER_DEFAULTS } from "../lib/menuSections/filterOptions.ts";

const nutrition = (n) => ({ calories: n * 10, protein: n, carbs: n, totalFat: n });
const sized = { id: "sizes", name: "Sizes", image: "/image.png", categories: ["entrees"], servingType: "entree", defaultVariantId: "plain-8", nutrition: nutrition(8), variants: [
  ...[5, 8, 12].map((size) => ({ id: `plain-${size}`, label: `${size} ct`, categories: ["entrees"], nutrition: nutrition(size) })),
  ...[5, 8, 12].map((size) => ({ id: `spicy-${size}`, label: `Spicy ${size} ct`, categories: ["entrees"], nutrition: nutrition(size + 1) })),
] };
const recipe = { id: "recipes", name: "Recipes", image: "/image.png", categories: ["salads"], servingType: "entree", variantGroupKind: "component", defaultVariantId: "a", nutrition: nutrition(3), variants: [
  ...["a", "b", "c"].map((id, index) => ({ id, label: `Protein ${id}`, categories: ["salads"], nutrition: nutrition(index + 3) })),
] };
const rows = getOfficialRankingItems([sized, recipe]);
const common = { items: rows, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false };

test("variant defaults are explicit and restoring them preserves other draft filters", () => {
  assert.deepEqual(getVariantSettings({}), VARIANT_FILTER_DEFAULTS);
  assert.equal(countVariantSettingsChanges({ ...VARIANT_FILTER_DEFAULTS }), 0);
  const draft = { categories: ["salads"], proteinMin: 20, showServingSizeVariants: false, showRecipeVariants: false, separateSizesInProteinScore: true };
  assert.equal(countVariantSettingsChanges(draft), 3);
  const restored = { ...draft, ...VARIANT_FILTER_DEFAULTS };
  assert.equal(countVariantSettingsChanges(restored), 0);
  assert.equal(restored.proteinMin, 20);
  assert.deepEqual(restored.categories, ["salads"]);
});

test("general size and recipe switches group independent variant dimensions for every metric", () => {
  for (const metric of ["protein", "calories", "carbs", "fat"]) {
    const sort = `highest-${metric}`;
    assert.equal(selectRankingItems(rows, sort).length, 9);
    assert.equal(selectRankingItems(rows, sort, { showServingSizeVariants: false }).length, 5);
    assert.equal(selectRankingItems(rows, sort, { showRecipeVariants: false }).length, 4);
    const grouped = selectRankingItems(rows, sort, { showServingSizeVariants: false, showRecipeVariants: false });
    assert.deepEqual(grouped.map((row) => row.defaultVariantId), ["plain-8", "a"]);
  }
});

test("Protein Score override controls sizes independently of the general size switch", () => {
  for (const sort of ["highest-protein-score", "lowest-protein-score"]) {
    assert.equal(selectRankingItems(rows, sort).length, 5);
    assert.equal(selectRankingItems(rows, sort, { showServingSizeVariants: false }).length, 5);
    assert.equal(selectRankingItems(rows, sort, { separateSizesInProteinScore: true }).length, 9);
    assert.equal(selectRankingItems(rows, sort, { showServingSizeVariants: false, separateSizesInProteinScore: true }).length, 9);
    assert.equal(selectRankingItems(rows, sort, { showRecipeVariants: false }).length, 2);
    assert.equal(selectRankingItems(rows, sort, { showRecipeVariants: false, separateSizesInProteinScore: true }).length, 4);
  }
});

test("draft previews and applied results use identical grouping without mutating the dataset", () => {
  const original = structuredClone([sized, recipe]);
  const applied = { proteinMin: 3 };
  const draft = { ...applied, showServingSizeVariants: false, showRecipeVariants: false };
  const preview = filterMenuItems({ ...common, rankingSort: "highest-protein", filters: draft });
  assert.equal(preview.length, 2);
  assert.equal(filterMenuItems({ ...common, rankingSort: "highest-protein", filters: applied }).length, 9);
  assert.deepEqual(filterMenuItems({ ...common, rankingSort: "highest-protein", filters: { ...draft } }), preview);
  assert.equal(filterMenuItems({ ...common, isRankingView: false, rankingSort: "highest-protein", filters: draft }).length, 9);
  assert.deepEqual([sized, recipe], original);
});
