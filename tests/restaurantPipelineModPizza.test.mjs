import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  modPizzaAdapter,
  parseNutritionHtml,
  parseOrderingHtml,
  translateModPizza,
} from "../scripts/pipeline/adapters/mod-pizza.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { resolveSelectionNutrition } from "../scripts/pipeline/nutrition.ts";
import { projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-11-01T00:00:00Z";

const leaf = (id, name, calories, isDefault = false) => ({ id, name, calories, is_default: isDefault, is_available: true, option_groups: [] });
const amount = (prefix, name, [light, regular, extra]) => ({
  id: `${prefix}-amount`,
  description: `${name} Amount`,
  min_selections: 1,
  max_selections: 1,
  is_adv_nested_modifier: true,
  requires_user_selection: false,
  options: [leaf(`${prefix}-l`, "Light", light), leaf(`${prefix}-r`, "Regular", regular, true), leaf(`${prefix}-e`, "Extra", extra)],
});
const ingredient = (prefix, name, amounts) => ({
  id: prefix,
  name,
  calories: null,
  is_default: false,
  is_available: true,
  option_groups: [amount(prefix, name, amounts)],
});
const group = (id, description, min, max, options) => ({ id, description, min_selections: min, max_selections: max, options });

const size = (prefix, name, calories, tomato, mozzarella) => ({
  id: prefix,
  name,
  calories,
  is_default: false,
  is_available: true,
  option_groups: [
    group(`${prefix}-sauces`, "Sauces", 1, 8, [ingredient(`${prefix}-tomato`, "Tomato Sauce", tomato), leaf(`${prefix}-nosauce`, "No Sauce", null)]),
    group(`${prefix}-cheeses`, "Cheeses", 1, 8, [ingredient(`${prefix}-mozz`, "Mozzarella", mozzarella)]),
    group(`${prefix}-meats`, "Meats", null, null, [ingredient(`${prefix}-pepperoni`, "Pepperoni", [25, 50, 75])]),
    group(`${prefix}-bake`, "Cooking Instructions (Optional)", 0, 1, [leaf(`${prefix}-light-bake`, "Light Bake", null)]),
  ],
});

const FIXTURE = {
  stores: [
    {
      storeId: "4080",
      url: "https://orders.modpizza.com/store/4080",
      retrievedAt: "2026-10-20",
      categories: [
        {
          id: "c1",
          name: "Pizza",
          products: [
            {
              id: "p1",
              name: "The MOD ",
              calories: null,
              is_disabled: false,
              option_groups: [
                group("sizes", "Choose a Size", 1, 1, [
                  size("small", 'Small (6" thin crust)', 200, [1, 2, 4], [20, 40, 60]),
                  size("regular", 'Regular (11" thin crust)', 467, [2, 5, 7], [40, 80, 120]),
                ]),
              ],
            },
          ],
        },
        {
          id: "c2",
          name: "Desserts",
          products: [
            { id: "p2", name: "CinnaMOD", calories: 1190, is_disabled: false, option_groups: [] },
            { id: "p3", name: "No Name Cake", calories: 290, is_disabled: false, option_groups: [] },
          ],
        },
        {
          id: "c3",
          name: "Beverages",
          products: [{ id: "p4", name: "Coca-Cola Zero Sugar (20 oz bottle)", calories: null, is_disabled: false, option_groups: [] }],
        },
        {
          id: "c4",
          name: "Kids Meal",
          products: [
            {
              id: "p5",
              name: "Kids Meal",
              calories: null,
              is_disabled: false,
              option_groups: [group("drink", "Choose a drink", 1, 1, [leaf("milk", "Milk", 110), leaf("juice", "Apple Juice", 35)])],
            },
          ],
        },
      ],
    },
  ],
  nutrition: {
    url: "https://modpizza.com/nutrition/",
    retrievedAt: "2026-10-20",
    rows: [
      { category: "Crust", name: "regular (thin 11-inch)", caloriesText: "467" },
      { category: "Sauce", name: "tomato sauce", caloriesText: "5" },
      { category: "Cheese", name: "mozzarella", caloriesText: "90" },
      { category: "Desserts", name: "cinnaMOD", caloriesText: "1182" },
      { category: "Desserts", name: "no name cake", caloriesText: "290" },
      { category: "Pizza", name: "Veg Out", caloriesText: "670" },
      { category: "Beverage", name: "Sprite   (16 fl oz / 24 fl oz)", caloriesText: "200 / 300" },
    ],
  },
};

const fixtureDraft = () => normalizeRestaurant(translateModPizza(FIXTURE), { now: NOW });
const byName = (draft, name) => draft.items.find((item) => item.name === name);

test("MOD adapter: a pizza is build-your-own with size variants and per-size ingredient groups", () => {
  const draft = fixtureDraft();
  const mod = byName(draft, "The MOD");

  assert.equal(mod.model, "build-your-own");
  assert.equal(mod.category, "Pizza");
  assert.deepEqual(mod.variants.map((variant) => variant.label), ['Small (6" thin crust)', 'Regular (11" thin crust)']);
  assert.equal(mod.variants[1].nutrition.values.calories, 467);

  const [sauces, cheeses, meats, bake] = mod.variants[1].groups;
  assert.deepEqual([sauces.role, sauces.minSelections, sauces.maxSelections], ["ingredient_group", 1, 8]);
  assert.deepEqual([cheeses.minSelections, cheeses.maxSelections], [1, 8]);
  assert.deepEqual([meats.minSelections, meats.maxSelections], [null, null]);
  assert.deepEqual([bake.role, bake.maxSelections], ["preparation", 1]);
  assert.equal(sauces.options[1].isExclusive, true);
  assert.equal(sauces.options[1].ingredientId, undefined);
});

test("MOD adapter: Light/Regular/Extra are size-specific leaf amounts", () => {
  const mod = byName(fixtureDraft(), "The MOD");
  const tomato = (variant) => variant.groups[0].options[0];
  const calories = (option, portionLabel) =>
    resolveSelectionNutrition(option, option.portions.find((portion) => portion.label === portionLabel).id).values.calories;

  assert.equal(tomato(mod.variants[1]).portionPolicy, "alternative");
  assert.deepEqual(["Light", "Regular", "Extra"].map((label) => calories(tomato(mod.variants[1]), label)), [2, 5, 7]);
  assert.deepEqual(["Light", "Regular", "Extra"].map((label) => calories(tomato(mod.variants[0]), label)), [1, 2, 4]);
  assert.equal(resolveSelectionNutrition(tomato(mod.variants[1])).values.calories, 5);
});

test("MOD adapter: standard items sit beside the builder, with required choices", () => {
  const draft = fixtureDraft();
  assert.deepEqual(draft.menuModels, ["standard", "build-your-own"]);

  const kids = byName(draft, "Kids Meal");
  assert.equal(kids.model, "standard");
  assert.equal(kids.servingType, "kids");
  assert.deepEqual([kids.groups[0].role, kids.groups[0].minSelections, kids.groups[0].maxSelections], ["required_choice", 1, 1]);
  assert.equal(kids.groups[0].options[0].nutrition.values.calories, 110);

  assert.equal(byName(draft, "No Name Cake").nutrition.values.calories, 290);
  assert.equal(byName(draft, "No Name Cake").nutrition.observations.length, 2);
});

test("MOD adapter: protein, carbs and fat are never filled in", () => {
  const draft = fixtureDraft();
  const records = [
    ...draft.items.flatMap((item) => [item.nutrition, ...item.variants.map((variant) => variant.nutrition)]),
    ...draft.ingredients.map((entry) => entry.nutrition),
  ];
  for (const record of records) {
    for (const nutrient of ["protein", "carbs", "totalFat"]) assert.equal(record.values[nutrient], undefined);
    assert.notEqual(record.completeness, "complete");
  }
  assert.equal(draft.summary.completeNutritionRecords, 0);

  // A null calorie field is unknown, not zero.
  assert.deepEqual(byName(draft, "Coca-Cola Zero Sugar (20 oz bottle)").nutrition.values, {});

  const blockers = draft.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.code);
  assert.ok(blockers.includes("macros_unpublished"));
  assert.ok(blockers.includes("core_nutrition_missing"));
});

test("MOD adapter: national and ordering calories that disagree are flagged, not overwritten", () => {
  const draft = fixtureDraft();

  const cinnamod = byName(draft, "CinnaMOD");
  assert.equal(cinnamod.nutrition.values.calories, undefined);
  assert.deepEqual(cinnamod.nutrition.conflicts[0].observations.map((entry) => entry.value), [1190, 1182]);

  const mozzarella = draft.ingredients.find((entry) => entry.name === "Mozzarella");
  assert.equal(mozzarella.category, "Cheeses");
  assert.deepEqual(mozzarella.nutrition.conflicts[0].observations.map((entry) => entry.value), [80, 90]);

  const tomato = draft.ingredients.find((entry) => entry.name === "Tomato Sauce");
  assert.equal(tomato.nutrition.values.calories, 5);
  assert.equal(tomato.nutrition.conflicts.length, 0);

  assert.equal(draft.summary.nutritionConflicts, 2);
  // Size-less national pizza totals and fountain sizes are left unlinked.
  assert.deepEqual(draft.unmatchedReferenceRows, [
    "mod:reference:pizza:veg-out",
    "mod:reference:beverage:sprite-16-fl-oz",
    "mod:reference:beverage:sprite-24-fl-oz",
  ]);
});

test("MOD adapter: draft is valid, stays in draft, and projects nothing to the runtime schema", () => {
  const draft = fixtureDraft();
  const validation = validateDraft(draft, { now: NOW });
  assert.equal(draft.status, "draft");
  assert.equal(validation.valid, true);
  assert.equal(validation.readyForApproval, false);

  const { menu, excluded } = projectToRestaurantMenu(draft);
  assert.equal(menu.items.length, 0);
  assert.equal(menu.ingredients.length, 0);
  assert.ok(excluded.length > 0);
});

test("MOD adapter: research evidence produces a valid, unpublishable draft", async () => {
  const draft = normalizeRestaurant(modPizzaAdapter.translate(await modPizzaAdapter.load()), { now: NOW });
  const validation = validateDraft(draft, { now: NOW });

  assert.equal(validation.valid, true, JSON.stringify(validation.context.errors.slice(0, 5)));
  assert.equal(validation.readyForApproval, false);
  assert.equal(draft.restaurant.id, "mod");
  assert.equal(draft.sources.length, 3);
  assert.equal(draft.summary.completeNutritionRecords, 0);
  assert.deepEqual(draft.menuModels, ["standard", "build-your-own"]);

  // Catalog union of stores 4080 and 4168.
  assert.equal(draft.items.filter((item) => item.category === "Pizza").length, 14);
  assert.equal(draft.items.filter((item) => item.category === "Salads").length, 5);
  assert.ok(byName(draft, "Mega Cookie"));

  const mod = byName(draft, "The MOD");
  assert.deepEqual(
    mod.variants.map((variant) => variant.nutrition.values.calories),
    [200, 467, 933, 520, 650],
  );
  const regular = mod.variants[1];
  assert.deepEqual(
    regular.groups.map((entry) => [entry.label, entry.minSelections, entry.maxSelections]),
    [
      ["Sauces", 1, 8],
      ["Cheeses", 1, 8],
      ["Meats", null, null],
      ["Veggies, Herbs & Good Stuff", null, null],
      ["Finishing Sauces", null, null],
      ["Cooking Instructions (Optional)", 0, 1],
    ],
  );
  const asiago = regular.groups[1].options.find((option) => option.label === "Asiago");
  assert.deepEqual(asiago.portions.map((portion) => portion.nutrition.values.calories), [65, 130, 195]);

  // Discrepancies recorded in discovery-report.md surface on their own.
  const conflicted = draft.issues.filter((issue) => issue.code === "nutrition_conflict").map((issue) => issue.message);
  for (const label of ["CinnaMOD", "Mozzarella", "Asiago", "Buffalo Sauce"]) {
    assert.ok(conflicted.some((message) => message.includes(label)), label);
  }

  // Every ingredient category comes from a named ordering group.
  assert.ok(draft.ingredients.every((entry) => !/ amount$/i.test(entry.sourceCategory)));
});

test("MOD parsers read the saved evidence", async () => {
  const rows = parseNutritionHtml(await readFile("docs/research/mod-pizza/evidence/nutrition.html", "utf8"));
  assert.equal(rows.length, 109);
  assert.deepEqual(rows[0], { category: "Pizza", name: "Veg Out", caloriesText: "670" });
  assert.deepEqual(
    [...new Set(rows.map((row) => row.category))],
    ["Pizza", "Crust", "Sauce", "Cheese", "Meat", "Veggies & Good Stuff", "Salad", "Salad Dressing", "More Stuff", "Beverage", "Desserts"],
  );
  assert.throws(() => parseOrderingHtml("<html></html>"), /__NEXT_DATA__/);
});
