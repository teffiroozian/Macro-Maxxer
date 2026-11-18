import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chickFilAAdapter } from "../scripts/pipeline/adapters/chick-fil-a.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { idKeys, IdResolver, seedRegistryFromRuntimeMenu } from "../scripts/pipeline/ids.ts";
import { compareChickFilA } from "../scripts/pipeline/parity/chick-fil-a.ts";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const baseline = JSON.parse(await readFile(new URL("../data/restaurants/chick-fil-a/generated/restaurant.json", import.meta.url), "utf8"));
const captures = await chickFilAAdapter.load();
const translated = chickFilAAdapter.translate(captures);
const now = "2026-11-17T00:00:00Z";
const draft = normalizeRestaurant(translated, { now });
const registry = seedRegistryFromRuntimeMenu(chickFilAAdapter.id, baseline);
const projection = projectToRestaurantMenu(draft, { registry });

test("Chick-fil-A raw captures reproduce existing IDs, panels, variants and flat customization data", () => {
  const report = compareChickFilA(baseline, draft, projection);
  assert.equal(draft.items.length, baseline.items.length);
  assert.equal(draft.ingredients.length, baseline.ingredients.length);
  assert.equal(draft.items.reduce((total, item) => total + item.variants.length, 0), report.baseline.variants);
  assert.equal(report.baseline.panelsPresent, 647);
  assert.equal(report.baseline.contextualItemPanels, 109);
  for (const [check, differences] of Object.entries(report.differences)) {
    if (check === "defaultVariantParentNutrition") continue;
    assert.deepEqual(differences, [], check);
  }
  assert.equal(report.differences.defaultVariantParentNutrition.length, 18);
  const family = draft.items.find((item) => item.id === "cfa-group-100444");
  const runtimeFamily = projection.menu.items.find((item) => item.id === family.id);
  for (const variant of runtimeFamily.variants) {
    const source = family.variants.find((entry) => entry.id === `${family.id}/${variant.id}`);
    assert.equal(variant.categories[0], source.category);
    assert.equal(variant.servingType, source.servingType);
  }
  assert.equal(report.runtime.idsReused, 435);
  assert.equal(report.runtime.ingredients, 59);
  assert.equal(report.runtime.comboCarriers, 45);
  assert.equal(report.runtime.addonGroups, 208);
  assert.equal(report.runtime.itemContexts, 102);
  assert.equal(report.runtime.variantContexts, 74);
  assert.equal(report.runtime.sourceOnlyWithoutNutrition, 45);
  assert.equal(report.runtimeRelationships.comboCases, 659);
  for (const [check, differences] of Object.entries(report.runtimeRelationships.differences)) {
    assert.deepEqual(differences, [], check);
  }
  assert.equal(report.runtime.variants, 224);
  assert.equal(report.runtime.registryAdditions, 0);
  assert.equal(report.runtime.registryConflicts, 0);
  assert.deepEqual(projection.relationshipErrors, []);
  assert.deepEqual(checkRuntimeMenu(projection.menu), []);
});

test("Chick-fil-A preserves contextual salt units without assigning one global serving", () => {
  const ingredient = draft.ingredients.find((entry) => entry.id === "cfa-modifier-1000058");
  assert.equal(ingredient.contextualNutritionOnly, true);
  assert.deepEqual(ingredient.nutrition.values, {});
  const saltOptions = draft.items.flatMap((item) => [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])])
    .flatMap((group) => group.options).filter((option) => option.ingredientId === ingredient.id);
  const medium = saltOptions.find((option) => option.nutrition.observations[0]?.source.recordId?.endsWith("SALT_MD_FRY"));
  assert.equal(medium.nutrition.values.sodium, 210);
  assert.deepEqual(medium.nutrition.observations[0].basis, { kind: "selected_portion", amount: 125, unit: "g" });
});

test("Chick-fil-A six-count cookie is calculated from the official per-cookie record", () => {
  const six = draft.items.find((entry) => entry.id === "cfa-item-1004057");
  assert.equal(six.nutrition.values.calories, 2220);
  assert.equal(six.nutrition.values.sugars, 156);
  assert.deepEqual(six.nutrition.observations, []);
  assert.equal(six.nutrition.derivation.components[0].quantity, 6);
  assert.equal(six.nutrition.derivation.components[0].refId, "cfa-item-1004056");
});

test("source-only combo carriers are kept for lookup and nested rules remain evidence", () => {
  const validation = validateDraft(draft, { now });
  assert.equal(validation.valid, true);
  assert.equal(validation.readyForApproval, false);
  assert.ok(draft.issues.some((issue) => issue.code === "nested_ordering_graph_not_executable"));
  assert.equal(draft.summary.recordsMissingCoreMacros, 0);
  assert.equal(draft.orderingGraph.groups.length, 474);
  assert.equal(draft.orderingGraph.groups.flatMap((group) => group.options).length, 1946);
  const carrier = projection.menu.items.find((item) => item.id === "cfa-group-100100");
  assert.equal(carrier.sourceOnly, true);
  assert.equal(carrier.nutrition, undefined);
  assert.ok(carrier.comboConfig.entreeItemId);
  assert.deepEqual(projection.excluded.map((item) => item.id).sort(), [
    "cfa-group-100438", "cfa-item-1000158", "cfa-item-1000353", "cfa-item-1002292",
  ]);
});

test("explicit ice preparation options remain selectable without invented macros", () => {
  const preparation = draft.ingredients.filter((item) => item.preparationOnly);
  assert.equal(preparation.length, 3);
  for (const item of preparation) {
    assert.deepEqual(item.nutrition.values, {});
    assert.equal(projection.menu.ingredients.find((entry) => entry.id === item.id).nutrition, undefined);
    assert.ok(projection.menu.items.some((owner) => owner.customization?.ingredientCategories
      ?.some((group) => group.ingredients.includes(item.id))));
  }
});

test("validation rejects an ordering graph that loses a referenced child group", () => {
  const broken = structuredClone(draft);
  const child = broken.orderingGraph.groups.flatMap((group) => group.options).find((option) => option.referencedItemGroupId).referencedItemGroupId;
  broken.orderingGraph.groups = broken.orderingGraph.groups.filter((group) => group.id !== child);
  const result = validateDraft(broken, { now });
  assert.equal(result.valid, false);
  assert.ok(result.context.errors.some((issue) => issue.code === "ordering_group_missing"));
});

test("authoritative source identities prevent equal labels from merging", () => {
  const [first, second] = translated.items;
  const context = { ...translated, ingredients: [], items: [
    { ...first, groups: [], variants: [] },
    { ...second, name: first.name, sourceCategory: first.sourceCategory, groups: [], variants: [] },
  ] };
  assert.equal(normalizeRestaurant(context, { now }).items.length, 2);
  assert.equal(normalizeRestaurant({ ...context, deduplicateBy: "name" }, { now }).items.length, 1);
});

test("the registry can reuse one SKU as a variant under distinct parents", () => {
  const resolver = new IdResolver(seedRegistryFromRuntimeMenu("example", {
    items: ["first", "second"].map((id) => ({
      id, name: id, categories: ["Sides"], variants: [{ id: "shared-sku", label: "Small" }],
    })),
  }));
  for (const owner of ["first", "second"]) {
    assert.deepEqual(resolver.resolve("variant", [idKeys.variant(owner, "Small")], owner, owner), {
      id: "shared-sku", isNew: false,
    });
  }
  assert.deepEqual(resolver.conflicts, []);
});

test("Chick-fil-A preview routes and persisted cart agree on variant identity", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { getRestaurantItemRouteData } from "./lib/restaurantItemRouteData.ts";
    import { resolveCartItemMainItem } from "./lib/cart/cartItemLookup.ts";
    const itemId = "cfa-group-100371";
    const variantId = "cfa-item-1000122";
    const entry = { restaurantId: "chickfila", itemId, selection: { type: "standard", variantId } };
    const route = await getRestaurantItemRouteData(entry.restaurantId, itemId, variantId);
    assert.equal(route.initialVariantId, variantId);
    assert.deepEqual(resolveCartItemMainItem(entry).nutrition, route.item.variants.find((size) => size.id === variantId).nutrition);
    const unavailable = "retired-size";
    assert.equal(await getRestaurantItemRouteData(entry.restaurantId, itemId, unavailable), null);
    assert.equal(resolveCartItemMainItem({ ...entry, selection: { type: "standard", variantId: unavailable } }), null);
  `], { encoding: "utf8", env: { ...process.env, NEXT_PUBLIC_CHICKFILA_PIPELINE_PREVIEW: "1" } });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
