import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { MCDONALDS_GENERATED_RUNTIME_MENU as live } from "../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter.ts";
import { mcdonaldsAdapter } from "../scripts/pipeline/adapters/mcdonalds.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { compareMcDonalds } from "../scripts/pipeline/parity/mcdonalds.ts";
import { projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const capture = await mcdonaldsAdapter.load();
const registry = JSON.parse(await readFile(new URL("../data/restaurants/id-registry/mcdonalds.json", import.meta.url), "utf8"));
const draft = normalizeRestaurant(mcdonaldsAdapter.translate(capture), { now: "2026-11-18T00:00:00Z" });
const projection = projectToRestaurantMenu(draft, { registry });

test("McDonald's captures reproduce item, size, combo, and verified modifier parity", () => {
  const report = compareMcDonalds(live, draft, projection);
  assert.deepEqual(report.differences, []);
  assert.deepEqual(report.runtime.runtimeReferenceErrors, []);
  assert.equal(report.runtime.items, 174);
  assert.equal(report.runtime.sizePanels, 180);
  assert.equal(report.runtime.comboCases, 354);
  assert.equal(report.runtime.ingredients, 337);
  assert.equal(report.runtime.issuedIds, 0);
  assert.equal(report.runtime.idConflicts, 0);
  assert.equal(report.runtime.normalizedDefaultPanels.length, 52);
  assert.equal(report.runtime.enrichedPackets.length, 3);
  assert.equal(capture.summary.sourceRecords, 153);
  assert.equal(capture.summary.generatedItems, 173);
  assert.equal(validateDraft(draft).readyForApproval, false);
});

test("unknown modifier macros remain absent, while non-food and published zero keep their own meanings", () => {
  assert.equal(draft.summary.recordsMissingCoreMacros, 117);
  const expectedUnknown = draft.ingredients.find((item) => item.id === "mcd-safe-204401-shredded-cheese");
  assert.deepEqual(expectedUnknown.nutrition.values, { calories: 50 });
  assert.ok(projection.excluded.some((entry) => entry.id === expectedUnknown.id));
  assert.ok(!projection.menu.ingredients.some((entry) => entry.id === expectedUnknown.id));
  const noSauce = projection.menu.ingredients.find((entry) => entry.id === "mcd-safe-200267-no-sauce");
  assert.deepEqual(noSauce.nutrition, { calories: 0, protein: 0, carbs: 0, totalFat: 0 });
  const toy = projection.menu.items.find((item) => item.id === "mcd-happy-meal-toy");
  assert.equal(toy.sourceOnly, true);
  assert.equal(toy.nutrition, undefined);
});

for (const preview of [false, true]) {
  test(`McDonald's menu, variants and persisted cart agree (preview ${preview})`, () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { getRestaurantData } from "./lib/restaurants.ts";
      import { getRestaurantItemRouteData } from "./lib/restaurantItemRouteData.ts";
      import { getCartRestaurantMenu, resolveCartItemMainItem, hasUnavailablePreviewCustomization } from "./lib/cart/cartItemLookup.ts";
      import { buildStandardCartItemPayload } from "./lib/cart/standardItemConfiguration.ts";
      import { serializeCartItems, deserializeCartItems } from "./lib/cart/persistence.ts";
      import { resolveComboBundleOptions } from "./lib/comboMeals.ts";
      const app = await getRestaurantData("mcdonalds");
      const menu = getCartRestaurantMenu("mcdonalds");
      const variants = app.items.flatMap((item) => (item.variants ?? []).map((size) => ({item, size})));
      const entries = variants.map(({ item, size }) => ({
        id: item.id + "/" + size.id, restaurantId: "mcdonalds", itemId: item.id,
        ...buildStandardCartItemPayload({ item, selectedVariant: size, quantity: 1, nutritionPerItem: size.nutrition }),
      }));
      const restored = deserializeCartItems(serializeCartItems(entries));
      assert.equal(restored.length, 180);
      for (const entry of restored) assert.deepEqual(resolveCartItemMainItem(entry).nutrition, entry.nutritionPerItem);
      const route = await getRestaurantItemRouteData("mcdonalds", "mcd-item-200692", "mcd-item-200574");
      assert.equal(route.initialVariantId, "mcd-item-200574");
      const bundles = resolveComboBundleOptions("mcdonalds", route.item, menu.items, route.initialVariantId);
      assert.ok(bundles.length > 0);
      assert.ok(bundles.every((item) => Number.isFinite(item.nutrition.calories)));
      const wrap = menu.items.find((item) => item.id === "mcd-item-204401");
      const previous = {
        restaurantId: "mcdonalds", itemId: wrap.id, selection: {type:"standard"},
        customizations: [{ action:"remove", ingredientId:"mcd-safe-204401-shredded-cheese" }],
      };
      assert.equal(hasUnavailablePreviewCustomization(previous), ${preview});
    `], { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_MCDONALDS_PIPELINE_PREVIEW: preview ? "1" : "0" } });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}

test("verified signed modifier deltas update optional totals and survive cart persistence", async () => {
  const { calculateIngredientCountTotals } = await import("../lib/menuItemCard/totals.ts");
  const { calculateStandardItemNutrition, buildStandardCartItemPayload } = await import("../lib/cart/standardItemConfiguration.ts");
  const { deserializeCartItems, serializeCartItems } = await import("../lib/cart/persistence.ts");
  const { buildCartMenuItemFromState } = await import("../lib/cart/buildItemAdapters.ts");
  const { default: menu } = await import("../data/restaurants/staging/mcdonalds/runtime-menu.json", { with: { type: "json" } });
  const item = menu.items.find(({ id }) => id === "mcd-item-200463");
  const sauce = menu.ingredients.find(({ id }) => id === "mcd-200463-component-301554");
  const resolved = { ...sauce, label: sauce.name, defaultCount: 1 };
  const zero = { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
  function withoutSauce(ingredient) {
    return calculateStandardItemNutrition({
      baseNutrition: item.nutrition, addonTotals: zero, comboNutritionTotals: zero,
      ingredientCountTotals: calculateIngredientCountTotals({ [ingredient.id]: 0 }, [ingredient], true),
    });
  }
  const nutrition = withoutSauce(resolved);
  assert.equal(nutrition.calories, item.nutrition.calories + sauce.nutritionDeltaByCount[0].calories);
  assert.equal(nutrition.sodium, item.nutrition.sodium + sauce.nutritionDeltaByCount[0].sodium);
  const partialDelta = { ...sauce.nutritionDeltaByCount[0] };
  delete partialDelta.sodium;
  const withUnknownSodium = withoutSauce({ ...resolved, nutritionDeltaByCount: { 0: partialDelta } });
  assert.equal(withUnknownSodium.sodium, undefined);
  const saved = { id: "saved", itemId: item.id, restaurantId: "mcdonalds",
    ...buildStandardCartItemPayload({ item, quantity: 1, nutritionPerItem: nutrition }) };
  const [restored] = deserializeCartItems(serializeCartItems([saved]));
  assert.deepEqual(restored, JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(buildCartMenuItemFromState(restored, null).nutrition, nutrition);
});
