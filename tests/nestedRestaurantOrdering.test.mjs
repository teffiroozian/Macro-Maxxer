import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { canRestoreSavedOrdering, evaluateOrdering, updateOrderingQuantities, validateOrderingPlan } from "../lib/ordering/evaluate.ts";
import { buildOrderingCartPayload } from "../lib/ordering/cart.ts";
import { deserializeCartItems, serializeCartItems } from "../lib/cart/persistence.ts";
import { resolveCartItemComboSelections } from "../lib/cart/cartItemLookup.ts";
import { chickFilAAdapter } from "../scripts/pipeline/adapters/chick-fil-a.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { seedRegistryFromRuntimeMenu } from "../scripts/pipeline/ids.ts";
import { projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { resolveSavedBuildMode } from "../lib/cart/buildItemAdapters.ts";

const baseline = JSON.parse(await readFile(new URL("../data/restaurants/chick-fil-a/generated/restaurant.json", import.meta.url)));
const source = await chickFilAAdapter.load();
const draft = normalizeRestaurant(chickFilAAdapter.translate(source));
const registry = seedRegistryFromRuntimeMenu("chickfila", baseline);
const { menu } = projectToRestaurantMenu(draft, { registry });
const get = (id) => menu.items.find((item) => item.id === id);
const sandwich = get("cfa-item-1000231");
const fries = get("cfa-group-100371");

function choose(plan, quantities, group, label) {
  const action = Object.fromEntries(group.options.map((entry) => [entry.path, Number(entry.option.label === label)]));
  return updateOrderingQuantities(plan, quantities, action);
}

test("Chick-fil-A combo activates its exact side and drink branches and drops inactive descendants", () => {
  const plan = sandwich.orderingPlan;
  assert.deepEqual(validateOrderingPlan(plan), []);
  const standard = evaluateOrdering(plan, {});
  assert.deepEqual(standard.nutrition, sandwich.nutrition);
  const quantities = choose(plan, {}, standard.groups[0], "Meal with waffle fries and Coca-Cola");
  const combo = evaluateOrdering(plan, quantities);
  const [side, drink] = combo.groups[0].options[1].children;
  assert.deepEqual(side.options.map(({ option }) => option.label), ["Medium", "Large"]);
  assert.equal(drink.options.filter((option) => option.quantity).length, 1);
  assert.equal(combo.nutrition.calories, 1010);
  assert.equal(combo.nutrition.sodium, 1745);
  const back = choose(plan, quantities, combo.groups[0], "Sandwich only");
  assert.deepEqual(Object.keys(back).sort(), ["/meal/100234", "/meal/entree"]);
  assert.deepEqual(evaluateOrdering(plan, back).nutrition, sandwich.nutrition);
});

test("fries sizes select their own official salt portions and enforce the edge limit", () => {
  const plan = fries.orderingPlan;
  for (const [size, mg] of [["Small", 170], ["Medium", 210], ["Large", 310]]) {
    const quantities = choose(plan, {}, evaluateOrdering(plan, {}).groups[0], size);
    const salted = evaluateOrdering(plan, quantities);
    const activeSize = salted.groups[0].options.find((option) => option.quantity);
    const salt = activeSize.children[0].options[0];
    assert.equal(salt.option.effect.nutrition.sodium, mg);
    const unsalted = evaluateOrdering(plan, { ...quantities, [salt.path]: 0 });
    assert.equal(unsalted.nutrition.calories, salted.nutrition.calories);
    assert.equal(unsalted.nutrition.sodium, salted.nutrition.sodium - mg);
    assert.equal(evaluateOrdering(plan, { ...quantities, [salt.path]: 2 }).nutrition, undefined);
    const cart = buildOrderingCartPayload(fries, plan, unsalted.quantities, 1);
    assert.equal(cart.selection.variantId, activeSize.option.variantId);
  }
});

test("Chick-fil-A nested meals save, reload, and update without reusing stale flat nutrition", () => {
  const plan = sandwich.orderingPlan;
  const meal = choose(plan, {}, evaluateOrdering(plan, {}).groups[0], "Meal with waffle fries and Coca-Cola");
  const sides = evaluateOrdering(plan, meal).groups[0].options[1].children[0];
  const large = choose(plan, meal, sides, "Large");
  const salt = evaluateOrdering(plan, large).groups[0].options[1].children[0].options[1].children[0].options[0];
  const noSalt = { ...large, [salt.path]: 0 };
  const payload = buildOrderingCartPayload(sandwich, plan, noSalt, 2);
  const item = { ...payload, restaurantId: "chickfila", id: "test-meal" };
  const [restored] = deserializeCartItems(serializeCartItems([item]));
  assert.deepEqual(restored, JSON.parse(JSON.stringify(item)));
  assert.equal(restored.nutritionPerItem.calories, 1190);
  assert.equal(restored.nutritionPerItem.sodium, 1535);
  assert.equal(restored.customizations.find((entry) => entry.action === "remove").nutritionSnapshot.sodium, 310);
  assert.equal(resolveCartItemComboSelections(restored)[0].nutrition.sodium,
    get("cfa-item-1000124").nutrition.sodium - 310);
  const updated = buildOrderingCartPayload(sandwich, plan, { ...restored.selection.ordering.quantities, [salt.path]: 1 }, 2);
  assert.equal(updated.nutritionPerItem.sodium, 1845);
});

test("shared ordering validates per-edge bounds and nutrition on inactive branches", () => {
  const calories = { calories: 10, protein: 0, carbs: 0, totalFat: 0 };
  const option = { id: "parent", label: "Parent", max: 2, effect: { kind: "none" }, groups: [{
    id: "modifier", label: "Modifier", min: 1, max: 3, options: [{
      id: "a", label: "A", min: 1, max: 2, defaultQuantity: 1, effect: { kind: "add", nutrition: calories },
    }],
  }] };
  const plan = { id: "fixture", baseNutrition: calories, groups: [{ id: "root", label: "Root", min: 0, max: 2, options: [option] }] };
  assert.deepEqual(validateOrderingPlan(plan), []);
  assert.equal(evaluateOrdering(plan, { "/root/parent": 2, "/root/parent/modifier/a": 2 }).nutrition.calories, 50);
  assert.equal(evaluateOrdering(plan, { "/root/parent": 2, "/root/parent/modifier/a": 0 }).nutrition, undefined);
  assert.equal(evaluateOrdering(plan, { "/root/parent": 2, "/root/parent/modifier/a": 3 }).nutrition, undefined);
  delete option.groups[0].options[0].effect.nutrition.carbs;
  assert.match(validateOrderingPlan(plan).join(" "), /incomplete/);
});

test("the generic cart modal reserves Chipotle builder review for Chipotle builds", () => {
  const selection = { type: "build-your-own", buildConfiguration: { ingredients: [] } };
  assert.equal(resolveSavedBuildMode({ restaurantId: "chipotle", selection }), "chipotle");
  assert.equal(resolveSavedBuildMode({ restaurantId: "other", selection }), "snapshot");
  assert.equal(resolveSavedBuildMode({ restaurantId: "chipotle", selection: { type: "standard" } }), "standard");
});

test("invalid nutrition hidden under an inactive choice blocks plan projection", () => {
  const altered = structuredClone(draft);
  const plan = altered.orderingPlans[sandwich.id];
  const side = plan.groups[0].options[1].groups[0];
  delete side.options[0].effect.nutrition.carbs;
  const projection = projectToRestaurantMenu(altered, { registry });
  assert.equal(projection.menu.items.find((item) => item.id === sandwich.id).orderingPlan, undefined);
  assert.match(projection.relationshipErrors.join(" "), /incomplete/);
});

test("family meal preserves four independent side and dessert slots through the cart", () => {
  const item = get("cfa-group-100357");
  const plan = item.orderingPlan;
  const defaults = evaluateOrdering(plan, {});
  assert.deepEqual(defaults.errors, []);
  const slots = defaults.groups[0].options[0].children;
  assert.equal(slots.length, 8);
  const salt = (slot) => slot.options.find((option) => option.quantity).children[0].options[0];
  const first = salt(slots[0]);
  const second = salt(slots[1]);
  assert.notEqual(first.path, second.path);
  const quantities = updateOrderingQuantities(plan, {}, { [first.path]: 0 });
  assert.equal(quantities[second.path], 1);
  const saved = { ...buildOrderingCartPayload(item, plan, quantities, 1), id: "family", restaurantId: "chickfila" };
  const [restored] = deserializeCartItems(serializeCartItems([saved]));
  assert.equal(restored.nutritionPerItem.sodium, defaults.nutrition.sodium - 210);
  assert.equal(restored.selection.variantId, "cfa-item-1006616");
  const sides = resolveCartItemComboSelections(restored);
  assert.equal(sides.length, 4);
  assert.equal(sides[1].nutrition.sodium - sides[0].nutrition.sodium, 210);
  assert.equal(restored.customizations.filter((entry) => entry.comboRole === "included-dessert").length, 4);
});

test("repeated edges can assign separate child state per copy and prune removed copies", () => {
  const plan = structuredClone(fries.orderingPlan);
  const sizes = plan.groups[0];
  sizes.max = 2;
  const medium = sizes.options.find((option) => option.label === "Medium");
  medium.max = 2;
  medium.independentCopies = true;
  assert.deepEqual(validateOrderingPlan(plan), []);
  let result = evaluateOrdering(plan, {});
  const selected = result.groups[0].options.find((option) => option.option === medium);
  let quantities = updateOrderingQuantities(plan, {}, { [selected.path]: 2 });
  result = evaluateOrdering(plan, quantities);
  const [first, second] = result.groups[0].options.find((option) => option.option === medium).instances;
  const firstSalt = first.children[0].options[0].path;
  const secondSalt = second.children[0].options[0].path;
  quantities = updateOrderingQuantities(plan, quantities, { [secondSalt]: 0 });
  assert.equal(quantities[firstSalt], 1);
  assert.equal(evaluateOrdering(plan, quantities).nutrition.sodium, medium.effect.nutrition.sodium * 2 - 210);
  assert.equal(updateOrderingQuantities(plan, quantities, { [selected.path]: 1 })[secondSalt], undefined);
});

test("expanded lunch profiles enforce the captured one-choice ice rule without assigning macros", () => {
  const plan = get("cfa-item-1001285").orderingPlan;
  const start = evaluateOrdering(plan, {});
  const quantities = choose(plan, {}, start.groups[0], "Meal with waffle fries and Coca-Cola");
  const meal = evaluateOrdering(plan, quantities);
  const ice = meal.groups[0].options[1].children[1].options.find((option) => option.quantity).children[0];
  assert.equal(ice.group.max, 1);
  const [first, second] = ice.options;
  const changed = evaluateOrdering(plan, { ...quantities, [first.path]: 1 });
  assert.deepEqual(changed.nutrition, meal.nutrition);
  assert.equal(evaluateOrdering(plan, { ...quantities, [first.path]: 1, [second.path]: 1 }).nutrition, undefined);
});

test("captured breakfast, kids and variant meal plans keep the exact default component and entrée identities", () => {
  const breakfast = get("cfa-item-1009734");
  const plan = breakfast.additionalOrderingPlans.find((entry) => entry.id.startsWith("chickfila-source-100100:"));
  const selection = evaluateOrdering(plan, {});
  assert.deepEqual(selection.errors, []);
  const [sides, drinks] = selection.groups[0].options[0].children.filter((entry) => entry.group.selectionMode);
  assert.equal(sides.group.max, null);
  assert.equal(drinks.group.max, null);
  assert.equal(drinks.options.find((entry) => entry.quantity).option.itemId, "cfa-item-1009674");
  const breakfastPayload = buildOrderingCartPayload(breakfast, plan, {}, 1);
  assert.equal(breakfastPayload.customizations.filter((entry) => entry.comboRole === "side").length, 1);
  assert.equal(breakfastPayload.customizations.filter((entry) => entry.comboRole === "drink").length, 1);

  const kids = get("cfa-group-100357");
  const kidsPlan = kids.additionalOrderingPlans.find((entry) => entry.id.startsWith("chickfila-source-100336:"));
  const kidsResult = evaluateOrdering(kidsPlan, {});
  const prize = kidsResult.groups[0].options[0].children.find((entry) => entry.group.label === "Prize");
  const defaultPrize = prize.options.find((option) => option.quantity);
  assert.equal(defaultPrize.option.effect.kind, "none");
  const edible = prize.options.find((option) => option.option.effect.kind === "add");
  assert.equal(edible.option.role, "included-dessert");
  const withDessert = choose(kidsPlan, {}, prize, edible.option.label);
  assert.equal(evaluateOrdering(kidsPlan, withDessert).nutrition.calories,
    kidsResult.nutrition.calories + edible.option.effect.nutrition.calories);
  const saved = { ...buildOrderingCartPayload(kids, kidsPlan, withDessert, 1), id: "kids", restaurantId: "chickfila" };
  assert.deepEqual(deserializeCartItems(serializeCartItems([saved]))[0].selection, JSON.parse(JSON.stringify(saved.selection)));

  const variantOwner = get("cfa-group-100351");
  const variantPlan = variantOwner.additionalOrderingPlans.find((entry) => entry.id.startsWith("chickfila-source-100237:"));
  assert.equal(buildOrderingCartPayload(variantOwner, variantPlan, {}, 1).selection.variantId, "cfa-item-1003016");
});

test("additional source plans all have valid executable defaults and keep existing previews", () => {
  const plans = menu.items.flatMap((item) => item.additionalOrderingPlans ?? []);
  assert.equal(plans.length, 61);
  for (const plan of plans) {
    assert.deepEqual(validateOrderingPlan(plan), [], plan.id);
    assert.deepEqual(evaluateOrdering(plan, {}).errors, [], plan.id);
  }
  assert.ok(sandwich.orderingPlan.id.startsWith("chickfila-sandwich-fries-cola-v1:"));
});

test("an exact removal is executable with no invented group maximum", () => {
  const profile = sandwich.additionalOrderingPlans.find((entry) => entry.id.startsWith("chickfila-source-100234:"));
  const initial = evaluateOrdering(profile, {});
  const removals = initial.groups[0].options[0].children.find((entry) => entry.group.id === "100227:4");
  assert.equal(removals.group.max, null);
  const pickles = removals.options[0];
  assert.equal(pickles.quantity, 1);
  assert.equal(pickles.option.effect.kind, "included");
  const removed = evaluateOrdering(profile, { [pickles.path]: 0 });
  assert.equal(removed.nutrition.sodium, initial.nutrition.sodium - pickles.option.effect.nutrition.sodium);
  assert.equal(evaluateOrdering(profile, { [pickles.path]: 2 }).nutrition, undefined);
});

test("a single-component picker rejects contradictory source bounds before projection", () => {
  const plan = structuredClone(sandwich.additionalOrderingPlans[0]);
  const group = plan.groups[0].options[0].groups.find((entry) => entry.selectionMode === "single-component");
  group.min = 2;
  assert.match(validateOrderingPlan(plan).join(" "), /source bounds conflict/);
});

test("saved source orders remain read-only when a plan loses a selected branch or changes its bounds", () => {
  const plan = sandwich.orderingPlan;
  const initial = evaluateOrdering(plan, {});
  const quantities = choose(plan, {}, initial.groups[0], "Meal with waffle fries and Coca-Cola");
  const saved = { planId: plan.id, quantities };
  assert.equal(canRestoreSavedOrdering(plan, saved), true);
  assert.equal(canRestoreSavedOrdering({ ...plan, id: "replacement" }, saved), false);
  assert.equal(canRestoreSavedOrdering(plan, {
    ...saved, quantities: { ...quantities, "/removed/choice": 1 },
  }), false);
  assert.equal(canRestoreSavedOrdering(plan, {
    ...saved, quantities: { ...quantities, "/meal/100234": 2 },
  }), false);
});
