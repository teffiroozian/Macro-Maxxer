import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { starbucksAdapter } from "../scripts/pipeline/adapters/starbucks.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";
import { compareStarbucks } from "../scripts/pipeline/parity/starbucks.ts";
import { readStarbucksSizeNutrition } from "../scripts/importers/starbucks.ts";
import { STARBUCKS_GENERATED_RUNTIME_MENU as baseline } from "../lib/restaurantBuilders/starbucks/generatedRuntimeAdapter.ts";

const capture = await starbucksAdapter.load();
const registry = JSON.parse(await readFile(new URL("../data/restaurants/id-registry/starbucks.json", import.meta.url), "utf8"));
const input = starbucksAdapter.translate(capture);
const draft = normalizeRestaurant(input, { now: "2026-11-18T00:00:00Z" });
const projection = projectToRestaurantMenu(draft, { registry });

test("Starbucks shared projection exactly matches existing published menu and every size", () => {
  const parity = compareStarbucks(baseline, draft, projection);
  assert.deepEqual(parity.differences, []);
  assert.deepEqual(checkRuntimeMenu(projection.menu), []);
  assert.equal(parity.runtime.items, 260);
  assert.equal(parity.runtime.sizes, 684);
  assert.equal(parity.runtime.idConflicts, 0);
  assert.equal(parity.runtime.executableCustomizationPlans, 0);
  assert.equal(draft.summary.recordsMissingCoreMacros, 21);
  const validation = validateDraft(draft);
  assert.equal(validation.valid, true);
  assert.equal(validation.readyForApproval, false);
});

test("draft retains milk choices, syrup SKUs, recipe quantities and recommendation defaults as separate evidence", () => {
  const { products, optionSets, defaultValueSets } = draft.configurationEvidence;
  const hot = products["starbucks-407-hot"];
  const tall = hot.sizes["41"];
  assert.ok(optionSets[hot.optionSetId].find((group) => group.name === "Milk").children
    .flatMap((group) => group.products).some((entry) => entry.form.name === "Oatmilk"));
  assert.equal(tall.recipe.default.find((entry) => entry.productOption.productNumber === 63).quantity, 0);
  assert.equal(tall.recipe.default.find((entry) => entry.productOption.productNumber === 82).quantity, 1);
  assert.equal(defaultValueSets[tall.defaultValueSetId].find((entry) => entry.productOption.productNumber === 91).defaultValue, 3);
  assert.equal(tall.recipe.default.some((entry) => entry.productOption.productNumber === 91), false);
  const vanilla = products["starbucks-2122164-hot"];
  const pumps = Object.values(vanilla.sizes).map((size) =>
    size.recipe.default.find((entry) => /vanilla syrup/i.test(entry.skuName)).quantity,
  );
  assert.deepEqual(pumps, [2, 3, 4, 5]);
  assert.equal(draft.items.find((item) => item.id === "starbucks-407-hot").groups.length, 0);
});

test("blank and null calories stay unknown while published zero survives", () => {
  const facts = [{ id: "protein", value: 0 }, { id: "totalCarbs", value: 0 }, { id: "totalFat", value: 0 }];
  for (const value of ["", " ", null, undefined]) {
    assert.equal(readStarbucksSizeNutrition({ calories: { displayValue: value }, additionalFacts: facts }).calories, undefined);
  }
  assert.equal(readStarbucksSizeNutrition({ calories: { displayValue: 0 }, additionalFacts: facts }).calories, 0);
  const via = draft.items.find((item) => item.id === "starbucks-810-via");
  assert.deepEqual(via.variants[0].nutrition.values, {});
  assert.ok(!projection.menu.items.some((item) => item.id === via.id));
});

test("source SKU keeps its ID across label edits, and a missing default never falls back to another size", () => {
  const latte = structuredClone(input.items.find((item) => item.id === "starbucks-407-hot"));
  const original = latte.variants[0].id;
  latte.variants[0].label += " renamed";
  const onlyLatte = { ...input, items: [latte] };
  assert.equal(projectToRestaurantMenu(normalizeRestaurant(onlyLatte), { registry }).menu.items[0].variants[0].id, original);
  latte.variants.find((entry) => entry.isDefault).nutrition = [];
  assert.equal(projectToRestaurantMenu(normalizeRestaurant(onlyLatte), { registry }).menu.items.length, 0);
});

for (const preview of [false, true]) {
  test(`Starbucks app and cart agree on all 684 sizes (preview ${preview})`, () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { getRestaurantData } from "./lib/restaurants.ts";
      import { getRestaurantItemRouteData } from "./lib/restaurantItemRouteData.ts";
      import { getCartRestaurantMenu, resolveCartItemMainItem } from "./lib/cart/cartItemLookup.ts";
      import { buildStandardCartItemPayload } from "./lib/cart/standardItemConfiguration.ts";
      import { serializeCartItems, deserializeCartItems } from "./lib/cart/persistence.ts";
      import { STARBUCKS_GENERATED_RUNTIME_MENU } from "./lib/restaurantBuilders/starbucks/generatedRuntimeAdapter.ts";
      const app = await getRestaurantData("starbucks");
      assert.equal(getCartRestaurantMenu("starbucks").items.length, 260);
      assert.equal(getCartRestaurantMenu("starbucks") === STARBUCKS_GENERATED_RUNTIME_MENU, ${!preview});
      const entries = app.items.flatMap((item) => item.variants.map((variant) => ({
        id: variant.id, restaurantId: "starbucks", itemId: item.id,
        ...buildStandardCartItemPayload({ item, selectedVariant: variant, quantity: 1, nutritionPerItem: variant.nutrition }),
      })));
      const restored = deserializeCartItems(serializeCartItems(entries));
      assert.equal(restored.length, 684);
      for (const entry of restored) assert.deepEqual(resolveCartItemMainItem(entry).nutrition, entry.nutritionPerItem);
      const latte = await getRestaurantItemRouteData("starbucks", "starbucks-407-hot", "starbucks-sku-41");
      assert.equal(latte.initialVariantId, "starbucks-sku-41");
      if (${preview}) {
        const entry = restored.find((item) => item.selection.variantId === "starbucks-sku-41");
        assert.deepEqual(resolveCartItemMainItem({ ...entry, selection: { type: "standard" } }).nutrition, entry.nutritionPerItem);
        const unavailable = { ...entry, selection: { type: "standard", variantId: "starbucks-withheld-size" } };
        assert.equal(resolveCartItemMainItem(unavailable), null);
        assert.equal(await getRestaurantItemRouteData("starbucks", "starbucks-407-hot", "starbucks-withheld-size"), null);
      }
    `], { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_STARBUCKS_PIPELINE_PREVIEW: preview ? "1" : "0" } });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
