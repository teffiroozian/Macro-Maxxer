import assert from "node:assert/strict";
import { test } from "node:test";

import { CHIPOTLE_GENERATED_RUNTIME_MENU as live } from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import { resolveIncludedIngredientIds } from "../lib/restaurantBuilders/chipotle/index.ts";
import { buildChipotleIngredientMenuItems } from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import { CHIPOTLE_PIPELINE_PREVIEW_MENU as preview } from "../lib/restaurantBuilders/chipotle/pipelinePreview.ts";

const ENTREES = ["burrito", "bowl", "salad", "quesadilla", "taco"];

function builderItems(menu, selectedEntree) {
  const { builderConfig, ingredients } = menu;
  const options = { selectedEntree, selectedKidsMeal: "build-your-own", selectedTacoShell: "soft", selectedTacoCount: 3, builderConfig };
  const includedIds = resolveIncludedIngredientIds(options);
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree,
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
    selectedIncludedIngredientIds: includedIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

test("preview menu runs through the live Chipotle runtime adapter", () => {
  assert.equal(preview.hasBuildYourOwn, true);
  assert.deepEqual(Object.keys(preview.builderConfig.entreeOptions).sort(), Object.keys(live.builderConfig.entreeOptions).sort());
  for (const id of ["chipotle-burrito", "chipotle-bowl", "chipotle-cmg-1007"]) assert.ok(preview.items.some((item) => item.id === id), id);
});

test("a drink size the pipeline withholds is dropped, never given another drink's nutrition", () => {
  // The 32 fl oz Caffeine Free Diet Coke has no published carbs, so the
  // pipeline withholds it; its card must not borrow the cup's default flavor.
  const card = preview.items.find((item) => item.id === "chipotle-fountain-22-fl-oz-diet-coke-caffeine-free");
  assert.deepEqual(card.variants.map((variant) => variant.label), ["22 fl oz"]);
  const records = new Map([...preview.items, ...preview.ingredients].flatMap((record) => (record.variants ?? []).map((variant) => [variant.id, variant])));
  for (const item of preview.items) {
    for (const variant of item.variants ?? []) {
      if (!variant.canonicalItemId) continue;
      const own = [...preview.items, ...preview.ingredients].find((record) => record.id === variant.canonicalItemId);
      const source = own?.variants?.find((entry) => entry.id === variant.id) ?? (own && !own.variants ? own : records.get(variant.id));
      if (source?.nutrition) assert.equal(variant.nutrition.calories, source.nutrition.calories, `${item.name} › ${variant.label}`);
    }
  }
});

test("catering builders are not in the preview; the single taco uses official one-tortilla panels", () => {
  for (const id of ["chipotle-byoprotein", "chipotle-byochips"]) assert.ok(!preview.items.some((item) => item.id === id), id);
  const soft = preview.ingredients.find((ingredient) => ingredient.id === "chipotle-tortilla-soft-flour-taco");
  const crispy = preview.ingredients.find((ingredient) => ingredient.id === "chipotle-tortilla-crispy-corn-taco");
  assert.deepEqual([soft.nutrition.calories, soft.nutrition.totalFat, crispy.nutrition.calories], [80, 2.5, 70]);
  assert.ok(!preview.ingredients.some((ingredient) => /contentgroup|^chipotle-proteins-/.test(ingredient.id)));
  // "Cheese Only" is the no-protein choice, not a second portion of cheese.
  const kids = preview.items.find((item) => item.id === "chipotle-kids-quesadilla");
  assert.ok(kids.customization.ingredientCategories.find((category) => category.name === "Protein").allowNone);
  assert.ok(!preview.ingredients.some((ingredient) => ingredient.name === "Cheese Only"));
  assert.ok(preview.items.every((item) => item.name === item.name.trim()));
});

for (const entree of ENTREES) {
  test(`preview menu drives the ${entree} builder like the live menu`, () => {
    const liveItems = builderItems(live, entree);
    const previewItems = builderItems(preview, entree);
    const core = (items) =>
      new Map(items.map((item) => [item.id, [item.nutrition.calories, item.nutrition.protein, item.nutrition.carbs, item.nutrition.totalFat]]));
    const a = core(liveItems);
    const b = core(previewItems);
    const shared = [...a.keys()].filter((id) => b.has(id));
    assert.ok(shared.length >= a.size * 0.8, `${entree}: ${shared.length} of ${a.size} live builder options present`);
    // Shared options must carry the same core macros. Known exception: the
    // kids 16 fl oz soda, whose default flavor is the first PDF row rather
    // than Coca-Cola.
    const known = (id) => id === "chipotle-cmg-5551";
    const differing = shared.filter((id) => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)) && !known(id));
    assert.deepEqual(differing, [], entree);
  });
}
