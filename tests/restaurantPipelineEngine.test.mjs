import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import {
  reconcileNutrition,
  resolveSelectionNutrition,
  sumNutrition,
  toRuntimeNutrition,
} from "../scripts/pipeline/nutrition.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-11-01T00:00:00Z";
const SOURCES = [
  { id: "menu", kind: "ordering_structured_data", authority: "ordering_system", url: "https://example.test/menu", retrievedAt: "2026-10-20" },
  { id: "pdf", kind: "official_document", authority: "official", url: "https://example.test/nutrition.pdf", retrievedAt: "2026-10-20" },
];
const FULL = { calories: 400, protein: 30, carbs: 35, totalFat: 14 };

const seen = (values, sourceId = "menu") => [{ source: { sourceId }, values }];

function standardItem(overrides = {}) {
  return {
    id: "item:sandwich",
    name: "Chicken Sandwich",
    model: "standard",
    sourceCategory: "Entrees",
    servingType: "entree",
    isAvailable: true,
    nutrition: seen(FULL),
    variants: [],
    groups: [],
    sources: [{ sourceId: "menu", recordId: "1" }],
    ...overrides,
  };
}

function bowlItem(overrides = {}) {
  return {
    id: "item:bowl",
    name: "Bowl",
    model: "build-your-own",
    sourceCategory: "Bowls",
    servingType: "entree",
    isAvailable: true,
    nutrition: [],
    variants: [],
    groups: [
      {
        id: "item:bowl:protein",
        label: "Protein",
        role: "ingredient_group",
        minSelections: 1,
        maxSelections: 2,
        options: [
          {
            id: "item:bowl:protein:chicken",
            label: "Chicken",
            ingredientId: "ingredient:chicken",
            isDefault: false,
            isAvailable: true,
            nutrition: [],
            portionPolicy: "alternative",
            portions: [
              { id: "chicken:light", label: "Light", isDefault: false, nutrition: seen({ calories: 90, protein: 16, carbs: 0, totalFat: 3 }) },
              { id: "chicken:regular", label: "Regular", isDefault: true, nutrition: seen({ calories: 180, protein: 32, carbs: 0, totalFat: 7 }) },
              { id: "chicken:extra", label: "Extra", isDefault: false, nutrition: seen({ calories: 250, protein: 44, carbs: 0, totalFat: 10 }) },
            ],
          },
          {
            id: "item:bowl:protein:none",
            label: "No Protein",
            isDefault: false,
            isAvailable: true,
            isExclusive: true,
            nutrition: [],
          },
        ],
      },
      {
        id: "item:bowl:toppings",
        label: "Toppings",
        role: "ingredient_group",
        minSelections: null,
        maxSelections: null,
        options: [
          {
            id: "item:bowl:toppings:salsa",
            label: "Salsa",
            ingredientId: "ingredient:salsa",
            isDefault: false,
            isAvailable: true,
            nutrition: seen({ calories: 25 }),
          },
        ],
      },
    ],
    sources: [{ sourceId: "menu", recordId: "2" }],
    ...overrides,
  };
}

const INGREDIENTS = [
  { id: "ingredient:chicken", name: "Chicken", sourceCategory: "Protein", nutrition: seen({ calories: 180, protein: 32, carbs: 0, totalFat: 7 }), sources: [{ sourceId: "menu" }] },
  { id: "ingredient:salsa", name: "Salsa", sourceCategory: "Toppings", nutrition: seen({ calories: 25 }), sources: [{ sourceId: "menu" }] },
];

function normalize(overrides = {}) {
  return normalizeRestaurant(
    {
      restaurant: { id: "test", name: "Test Kitchen" },
      sources: SOURCES,
      items: [standardItem(), bowlItem()],
      ingredients: INGREDIENTS,
      categoryMap: { Entrees: "Sandwiches", Bowls: "Build Your Own" },
      ...overrides,
    },
    { now: NOW },
  );
}

const codes = (draft, severity) => draft.issues.filter((issue) => !severity || issue.severity === severity).map((issue) => issue.code);

test("standard and build-your-own items coexist in one draft", () => {
  const draft = normalize();
  assert.equal(draft.status, "draft");
  assert.deepEqual(draft.menuModels, ["standard", "build-your-own"]);
  assert.equal(draft.summary.standardItems, 1);
  assert.equal(draft.summary.buildYourOwnItems, 1);
  assert.deepEqual(draft.items.map((item) => item.category), ["Sandwiches", "Build Your Own"]);
});

test("stray whitespace in source names is trimmed, so labels still merge", () => {
  const bowl = bowlItem();
  bowl.groups[0].label = " Protein ";
  bowl.groups[0].options[0].label = "Chicken  ";
  const draft = normalize({
    items: [standardItem({ name: "Chicken Sandwich " }), standardItem({ id: "item:sandwich-2", name: " Chicken Sandwich" }), bowl],
    ingredients: [...INGREDIENTS.slice(1), { ...INGREDIENTS[0], name: ` ${INGREDIENTS[0].name}` }],
  });
  assert.deepEqual(draft.items.map((item) => item.name), ["Chicken Sandwich", "Bowl"]);
  assert.equal(draft.items[1].groups[0].label, "Protein");
  assert.equal(draft.items[1].groups[0].options[0].label, "Chicken");
  assert.ok(draft.ingredients.every((ingredient) => ingredient.name === ingredient.name.trim()));
});

test("unmapped source categories are kept and flagged, not guessed", () => {
  const draft = normalize({ categoryMap: { Entrees: "Sandwiches" } });
  assert.equal(draft.items[1].category, "Bowls");
  assert.ok(codes(draft, "warning").includes("unmapped_category"));
});

test("duplicate items merge their sources, variants and nutrition observations", () => {
  const first = standardItem({
    nutrition: [],
    variants: [{ id: "v:small", label: "Small", isDefault: true, nutrition: seen({ ...FULL, calories: 300 }) }],
  });
  const second = standardItem({
    id: "item:sandwich-copy",
    name: "  chicken sandwich® ",
    nutrition: [],
    sources: [{ sourceId: "pdf", recordId: "row-9" }],
    variants: [
      { id: "v:small-2", label: "small", isDefault: true, nutrition: seen({ ...FULL, calories: 300 }, "pdf") },
      { id: "v:large", label: "Large", isDefault: false, nutrition: seen({ ...FULL, calories: 520 }, "pdf") },
    ],
  });
  const draft = normalize({ items: [first, second], ingredients: [] });

  assert.equal(draft.items.length, 1);
  const [item] = draft.items;
  assert.equal(item.id, "item:sandwich");
  assert.deepEqual(item.sources.map((ref) => ref.sourceId), ["menu", "pdf"]);
  assert.deepEqual(item.variants.map((variant) => variant.label), ["Small", "Large"]);
  assert.equal(item.variants[0].nutrition.observations.length, 2);
  assert.equal(item.variants[0].nutrition.values.calories, 300);
  assert.ok(codes(draft, "info").includes("duplicate_item_merged"));
});

test("two different items sharing an id are a blocker", () => {
  const draft = normalize({ items: [standardItem(), standardItem({ name: "Fish Sandwich" })], ingredients: [] });
  assert.ok(codes(draft, "blocker").includes("duplicate_item_id"));
});

test("duplicate ingredients merge and option references follow the kept record", () => {
  const draft = normalize({
    ingredients: [
      ...INGREDIENTS,
      { id: "ingredient:chicken-2", name: "chicken", sourceCategory: "Protein", nutrition: seen({ calories: 180 }, "pdf"), sources: [{ sourceId: "pdf" }] },
    ],
    items: [
      bowlItem({
        groups: [
          {
            id: "g",
            label: "Protein",
            role: "ingredient_group",
            minSelections: 0,
            maxSelections: 1,
            options: [{ id: "o", label: "Chicken", ingredientId: "ingredient:chicken-2", isDefault: false, isAvailable: true, nutrition: seen(FULL) }],
          },
        ],
      }),
    ],
  });
  assert.equal(draft.ingredients.length, 2);
  assert.equal(draft.items[0].groups[0].options[0].ingredientId, "ingredient:chicken");
  assert.deepEqual(draft.ingredients[0].sources.map((ref) => ref.sourceId), ["menu", "pdf"]);
});

test("missing macros stay missing and block the record", () => {
  const draft = normalize();
  const salsa = draft.ingredients.find((ingredient) => ingredient.id === "ingredient:salsa");
  assert.deepEqual(salsa.nutrition.values, { calories: 25 });
  assert.equal(salsa.nutrition.completeness, "partial");
  assert.deepEqual(salsa.nutrition.missingCore, ["protein", "carbs", "totalFat"]);
  assert.equal(toRuntimeNutrition(salsa.nutrition), null);

  const missing = draft.issues.find((issue) => issue.code === "core_nutrition_missing");
  assert.equal(missing.severity, "blocker");
  assert.ok(missing.entityIds.includes("ingredient:salsa"));
  assert.ok(draft.summary.recordsMissingCoreMacros > 0);
});

test("conflicting sources leave the nutrient empty unless precedence is declared", () => {
  const observations = [...seen(FULL), ...seen({ ...FULL, calories: 420 }, "pdf")];

  const unresolved = reconcileNutrition(observations);
  assert.equal(unresolved.values.calories, undefined);
  assert.equal(unresolved.values.protein, 30);
  assert.deepEqual(unresolved.missingCore, ["calories"]);
  assert.equal(unresolved.conflicts[0].resolvedBySourceId, undefined);

  const resolved = reconcileNutrition(observations, ["pdf", "menu"]);
  assert.equal(resolved.values.calories, 420);
  assert.equal(resolved.conflicts[0].resolvedBySourceId, "pdf");

  const draft = normalize({ items: [standardItem({ nutrition: observations })], ingredients: [] });
  assert.ok(codes(draft, "blocker").includes("nutrition_conflict"));
  assert.equal(draft.summary.nutritionConflicts, 1);
  assert.equal(draft.summary.completeNutritionRecords, 0);

  const withPrecedence = normalize({ items: [standardItem({ nutrition: observations })], ingredients: [], nutritionPrecedence: ["pdf"] });
  assert.ok(codes(withPrecedence, "info").includes("nutrition_conflict_resolved"));
  assert.equal(withPrecedence.summary.completeNutritionRecords, 1);
});

test("a published zero is a value; an absent value is not zero", () => {
  const record = reconcileNutrition(seen({ calories: 0 }));
  assert.equal(record.values.calories, 0);
  assert.equal(record.values.protein, undefined);
  assert.equal(reconcileNutrition([]).completeness, "none");
});

test("reference nutrition joins by crosswalk, then exact name, never ambiguously", () => {
  const row = (id, name, category, values) => ({ id, name, category, observation: { source: { sourceId: "pdf", recordId: name }, values } });
  const draft = normalize({
    items: [
      standardItem({ nutrition: [] }),
      standardItem({ id: "item:wrap", name: "Wrap", nutrition: [] }),
      standardItem({ id: "item:wrap-kids", name: "Wrap", sourceCategory: "Kids", nutrition: [] }),
    ],
    ingredients: [{ id: "ingredient:salsa", name: "Salsa", sourceCategory: "Toppings", nutrition: [], sources: [{ sourceId: "menu" }] }],
    referenceNutrition: [
      row("r:sandwich", "CHICKEN SANDWICH", "Entrees", FULL),
      row("r:wrap", "Wrap", "Entrees", FULL),
      row("r:salsa", "Fresh Tomato Salsa", "Toppings", { calories: 25, protein: 0, carbs: 4, totalFat: 0 }),
      row("r:orphan", "Discontinued Soup", "Entrees", FULL),
    ],
    nutritionCrosswalk: { "ingredient:salsa": "r:salsa", "item:gone": "r:wrap" },
  });

  assert.equal(draft.items[0].nutrition.completeness, "complete");
  assert.equal(draft.ingredients[0].nutrition.values.carbs, 4);
  assert.equal(draft.items[1].nutrition.completeness, "none");
  assert.ok(codes(draft, "warning").includes("reference_match_ambiguous"));
  assert.ok(codes(draft, "warning").includes("crosswalk_target_missing"));
  assert.deepEqual(draft.unmatchedReferenceRows, ["r:wrap", "r:orphan"]);
});

test("reference rows are only name-matched inside vouched-for categories", () => {
  const draft = normalize({
    items: [],
    ingredients: [
      { id: "i:sauce", name: "Ranch", sourceCategory: "Sauces", nutrition: [], sources: [{ sourceId: "menu" }] },
      { id: "i:dressing", name: "Ranch", sourceCategory: "Dressings", nutrition: [], sources: [{ sourceId: "menu" }] },
    ],
    referenceNutrition: [
      { id: "r:ranch", name: "ranch", category: "Sauce", observation: { source: { sourceId: "pdf" }, values: { calories: 50 } } },
      { id: "r:soup", name: "Ranch", category: "Soups", observation: { source: { sourceId: "pdf" }, values: { calories: 999 } } },
    ],
    referenceCategoryMap: { Sauce: ["Sauces"] },
  });
  assert.equal(draft.ingredients[0].nutrition.values.calories, 50);
  assert.equal(draft.ingredients[1].nutrition.values.calories, undefined);
  assert.deepEqual(draft.unmatchedReferenceRows, ["r:soup"]);
});

test("portions are alternative amounts: Extra is never derived from Regular", () => {
  const draft = normalize();
  const chicken = draft.items[1].groups[0].options[0];

  assert.equal(resolveSelectionNutrition(chicken).values.calories, 180);
  assert.equal(resolveSelectionNutrition(chicken, "chicken:extra").values.calories, 250);
  assert.equal(resolveSelectionNutrition(chicken, "chicken:light").values.protein, 16);
  assert.equal(resolveSelectionNutrition(chicken, "chicken:double"), null);
});

test("multiplier portions apply only a factor the source states", () => {
  const draft = normalize({
    items: [
      bowlItem({
        groups: [
          {
            id: "g",
            label: "Protein",
            role: "ingredient_group",
            minSelections: 0,
            maxSelections: 1,
            options: [
              {
                id: "o",
                label: "Steak",
                isDefault: false,
                isAvailable: true,
                nutrition: [],
                portionPolicy: "multiplier",
                portions: [
                  { id: "p:regular", label: "Regular", isDefault: true, multiplier: 1, nutrition: seen({ calories: 200, protein: 20, carbs: 2, totalFat: 12 }) },
                  { id: "p:double", label: "Double", isDefault: false, multiplier: 2, nutrition: [] },
                  { id: "p:extra", label: "Extra", isDefault: false, nutrition: [] },
                ],
              },
            ],
          },
        ],
      }),
    ],
    ingredients: [],
  });
  const steak = draft.items[0].groups[0].options[0];
  assert.deepEqual(resolveSelectionNutrition(steak, "p:double").values, { calories: 400, protein: 40, carbs: 4, totalFat: 24 });
  assert.equal(resolveSelectionNutrition(steak, "p:extra"), null);
  assert.ok(codes(draft, "warning").includes("portion_multiplier_missing"));
});

test("totals are withheld for any nutrient a part does not publish", () => {
  const draft = normalize();
  const chicken = resolveSelectionNutrition(draft.items[1].groups[0].options[0]);
  const salsa = draft.items[1].groups[1].options[0].nutrition;
  const total = sumNutrition([chicken, salsa]);
  assert.deepEqual(total.values, { calories: 205 });
  assert.deepEqual(total.unknown, ["protein", "carbs", "totalFat"]);
});

test("selection rules: null bounds are preserved and impossible rules are flagged", () => {
  const draft = normalize();
  const toppings = draft.items[1].groups[1];
  assert.equal(toppings.minSelections, null);
  assert.equal(toppings.maxSelections, null);
  assert.equal(draft.items[1].groups[0].options[1].isExclusive, true);

  const group = (overrides) => ({
    id: "g",
    label: "Sauce",
    role: "modification",
    minSelections: 0,
    maxSelections: 1,
    options: [
      { id: "a", label: "Ranch", isDefault: true, isAvailable: true, nutrition: seen(FULL) },
      { id: "b", label: "BBQ", isDefault: true, isAvailable: false, nutrition: seen(FULL) },
    ],
    ...overrides,
  });
  const broken = normalize({
    items: [
      standardItem({ groups: [group({ minSelections: 3, maxSelections: 1 })] }),
      standardItem({ id: "item:two", name: "Two", groups: [group({ minSelections: 2, maxSelections: 2, options: [group({}).options[0], { ...group({}).options[1], id: "a" }] })] }),
    ],
    ingredients: [],
  });
  const found = codes(broken);
  for (const code of ["selection_rule_invalid", "defaults_exceed_max", "duplicate_option_id", "required_group_unsatisfiable"]) {
    assert.ok(found.includes(code), code);
  }
});

test("variant-specific groups and conflicting limits across duplicates", () => {
  const sized = (id, max) =>
    standardItem({
      id,
      nutrition: [],
      variants: [
        {
          id: `${id}:6pc`,
          label: "6 pc",
          isDefault: true,
          nutrition: seen(FULL),
          groups: [{ id: `${id}:sauce`, label: "Sauces", role: "modification", minSelections: 0, maxSelections: max, options: [{ id: `${id}:ranch`, label: "Ranch", isDefault: false, isAvailable: true, nutrition: seen({ calories: 110 }) }] }],
        },
      ],
    });
  const draft = normalize({ items: [sized("item:nuggets", 1), sized("item:nuggets-b", 2)], ingredients: [] });
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].variants[0].groups[0].maxSelections, 1);
  assert.ok(codes(draft, "warning").includes("selection_rule_conflict"));
});

test("an option pointing at an unknown ingredient is a blocker", () => {
  const draft = normalize({ ingredients: [] });
  assert.ok(codes(draft, "blocker").includes("ingredient_reference_missing"));
});

test("validation separates structural validity from readiness for approval", () => {
  const complete = normalize({ items: [standardItem()], ingredients: [] });
  const ready = validateDraft(complete, { now: NOW });
  assert.equal(ready.valid, true);
  assert.equal(ready.readyForApproval, true);

  const incomplete = validateDraft(normalize(), { now: NOW });
  assert.equal(incomplete.valid, true);
  assert.equal(incomplete.readyForApproval, false);

  const untraceable = validateDraft(normalize({ items: [standardItem({ sources: [], nutrition: seen({ ...FULL, calories: -5 }, "unknown") })], ingredients: [] }), { now: NOW });
  assert.equal(untraceable.valid, false);
  const errorCodes = untraceable.context.errors.map((finding) => finding.code);
  for (const code of ["untraceable_record", "unknown_source", "nutrition_value_invalid"]) assert.ok(errorCodes.includes(code), code);

  const stale = validateDraft(complete, { now: "2027-06-01T00:00:00Z" });
  assert.ok(stale.context.warnings.some((finding) => finding.code === "source_stale"));
});

test("normalization does not mutate the adapter output", () => {
  const output = {
    restaurant: { id: "test", name: "Test Kitchen" },
    sources: SOURCES,
    items: [standardItem(), standardItem({ id: "dup" })],
    ingredients: INGREDIENTS,
    referenceNutrition: [{ id: "r", name: "Salsa", observation: { source: { sourceId: "pdf" }, values: { protein: 1 } } }],
  };
  const before = structuredClone(output);
  normalizeRestaurant(output, { now: NOW });
  assert.deepEqual(output, before);
});

// ── Per-portion policy and calculated portions ───────────────────────────

const STEAK = { calories: 200, protein: 20, carbs: 2, totalFat: 12 };
function steakBowl(portions, optionOverrides = {}) {
  return bowlItem({
    groups: [
      {
        id: "g",
        label: "Protein",
        role: "ingredient_group",
        minSelections: 0,
        maxSelections: 1,
        options: [{ id: "o", label: "Steak", isDefault: false, isAvailable: true, nutrition: [], portionPolicy: "multiplier", portions, ...optionOverrides }],
      },
    ],
  });
}
const regular = { id: "p:regular", label: "Regular", isDefault: true, multiplier: 1, nutrition: seen(STEAK) };

test("a portion's own published panel beats its multiplier; a sibling without one is scaled", () => {
  const published = { calories: 230, protein: 23, carbs: 5, totalFat: 10 };
  const draft = normalize({
    items: [
      steakBowl([
        regular,
        { id: "p:extra", label: "Extra", isDefault: false, multiplier: 2, nutrition: seen(published, "pdf") },
        { id: "p:half", label: "Half", isDefault: false, multiplier: 0.5, multiplierEvidence: "75 of 150 published calories", nutrition: [] },
      ]),
    ],
    ingredients: [],
  });
  const [, extra, half] = draft.items[0].groups[0].options[0].portions;

  assert.deepEqual(extra.nutrition.values, published);
  assert.equal(extra.nutrition.derivation, undefined);
  assert.equal(extra.nutrition.observations[0].source.sourceId, "pdf");

  assert.deepEqual(half.nutrition.values, { calories: 100, protein: 10, carbs: 1, totalFat: 6 });
  assert.deepEqual(half.nutrition.derivation, { method: "scaled", baseId: "p:regular", factor: 0.5, evidence: "75 of 150 published calories" });
  assert.deepEqual(half.nutrition.observations, []);
  assert.equal(resolveSelectionNutrition(draft.items[0].groups[0].options[0], "p:half"), half.nutrition);
});

test("calculated portions count as complete nutrition and raise no blocker", () => {
  const draft = normalize({
    items: [steakBowl([regular, { id: "p:double", label: "Double", isDefault: false, multiplier: 2, nutrition: [] }])],
    ingredients: [],
  });
  assert.equal(draft.summary.nutritionRecords, 2);
  assert.equal(draft.summary.completeNutritionRecords, 2);
  assert.equal(draft.summary.recordsMissingCoreMacros, 0);
  assert.deepEqual(codes(draft, "blocker"), []);
  assert.equal(validateDraft(draft, { now: NOW }).readyForApproval, true);
});

test("a portion with no panel and no factor stays unknown and is still flagged", () => {
  const draft = normalize({
    items: [steakBowl([regular, { id: "p:extra", label: "Extra", isDefault: false, nutrition: [] }])],
    ingredients: [],
  });
  const extra = draft.items[0].groups[0].options[0].portions[1];
  assert.deepEqual(extra.nutrition.values, {});
  assert.equal(extra.nutrition.derivation, undefined);
  assert.ok(codes(draft, "warning").includes("portion_multiplier_missing"));
  assert.ok(codes(draft, "blocker").includes("core_nutrition_missing"));
});

test("scaling never fills a nutrient the base portion does not publish", () => {
  const draft = normalize({
    items: [
      steakBowl([
        { ...regular, nutrition: seen({ calories: 200, protein: 20, totalFat: 12 }) },
        { id: "p:double", label: "Double", isDefault: false, multiplier: 2, nutrition: [] },
      ]),
    ],
    ingredients: [],
  });
  const double = draft.items[0].groups[0].options[0].portions[1];
  assert.deepEqual(double.nutrition.values, { calories: 400, protein: 40, totalFat: 24 });
  assert.deepEqual(double.nutrition.missingCore, ["carbs"]);
});

test("portion policy can be set per portion; alternative portions are never scaled", () => {
  const draft = normalize({
    items: [
      steakBowl(
        [
          regular,
          { id: "p:light", label: "Light", isDefault: false, multiplier: 0.5, nutrition: [] },
          { id: "p:double", label: "Double", isDefault: false, multiplier: 2, policy: "multiplier", nutrition: [] },
        ],
        { portionPolicy: "alternative" },
      ),
    ],
    ingredients: [],
  });
  const [, light, double] = draft.items[0].groups[0].options[0].portions;
  assert.deepEqual(light.nutrition.values, {});
  assert.equal(double.nutrition.values.calories, 400);
  assert.equal(double.nutrition.derivation.method, "scaled");
});

test("a partially published multiplier portion is calculated, keeping its own observations", () => {
  const draft = normalize({
    items: [steakBowl([regular, { id: "p:half", label: "Half", isDefault: false, multiplier: 0.5, nutrition: seen({ calories: 100 }) }])],
    ingredients: [],
  });
  const half = draft.items[0].groups[0].options[0].portions[1];
  assert.deepEqual(half.nutrition.values, { calories: 100, protein: 10, carbs: 1, totalFat: 6 });
  assert.deepEqual(half.nutrition.observations[0].values, { calories: 100 });
});

// ── Composed nutrition ───────────────────────────────────────────────────

const TORTILLA = { calories: 320, protein: 8, carbs: 50, totalFat: 9, sodium: 600 };
const CHEESE = { calories: 110, protein: 6, carbs: 1, totalFat: 8, sodium: 190 };
const composedBowl = (composition, overrides = {}) => bowlItem({ composition, ...overrides });
const component = (label, role, rest) => ({ label, quantity: 1, role, source: { sourceId: "menu" }, ...rest });

test("a builder's default build is totalled from implicit components and default selections", () => {
  const draft = normalize({
    items: [
      composedBowl([
        component("Tortilla", "implicit", { nutrition: seen(TORTILLA, "pdf") }),
        component("Cheese", "implicit", { quantity: 3, nutrition: seen(CHEESE) }),
        component("Chicken", "default_selection", { ref: { kind: "option", id: "item:bowl:protein:chicken" } }),
      ]),
    ],
  });
  const bowl = draft.items[0];
  // 320 + 3×110 + 180 (the chicken option's default portion)
  assert.deepEqual(bowl.nutrition.values, { calories: 830, protein: 58, carbs: 53, totalFat: 40 });
  assert.equal(bowl.nutrition.completeness, "complete");
  assert.deepEqual(bowl.nutrition.derivation, {
    method: "composed",
    components: [
      { label: "Tortilla", quantity: 1, role: "implicit" },
      { label: "Cheese", quantity: 3, role: "implicit" },
      { label: "Chicken", quantity: 1, role: "default_selection", refId: "item:bowl:protein:chicken" },
    ],
    publishedNutrients: [],
  });
  // Inline component nutrition keeps its own provenance in the draft.
  assert.equal(bowl.composition[0].nutrition.observations[0].source.sourceId, "pdf");
  // Sodium is published by the tortilla and cheese but not by the chicken, so no sodium total is given.
  assert.equal(bowl.nutrition.values.sodium, undefined);
  assert.equal(draft.summary.completeNutritionRecords, draft.summary.nutritionRecords - draft.summary.recordsMissingCoreMacros);
});

test("a composed option can be taken at a specific portion", () => {
  const draft = normalize({
    items: [composedBowl([component("Chicken", "default_selection", { ref: { kind: "option", id: "item:bowl:protein:chicken", portionId: "chicken:extra" } })])],
  });
  assert.equal(draft.items[0].nutrition.values.calories, 250);
});

test("a combined product keeps a published calorie figure that confirms the component sum", () => {
  const chips = standardItem({ id: "item:chips", name: "Chips", nutrition: seen({ calories: 540, protein: 7, carbs: 73, totalFat: 25 }) });
  const guac = standardItem({ id: "item:guac", name: "Guacamole", nutrition: seen({ calories: 230, protein: 2, carbs: 8, totalFat: 22 }) });
  const combo = (calories) =>
    standardItem({
      id: "item:combo",
      name: "Chips & Guacamole",
      nutrition: seen({ calories }),
      composition: [
        component("Chips", "component", { ref: { kind: "item", id: "item:chips" } }),
        component("Guacamole", "component", { ref: { kind: "item", id: "item:guac" } }),
      ],
    });

  const confirmed = normalize({ items: [combo(775), chips, guac], ingredients: [] });
  const item = confirmed.items[0];
  assert.deepEqual(item.nutrition.values, { calories: 775, protein: 9, carbs: 81, totalFat: 47 });
  assert.deepEqual(item.nutrition.derivation.publishedNutrients, ["calories"]);
  assert.deepEqual(item.nutrition.observations[0].values, { calories: 775 });
  assert.deepEqual(codes(confirmed).filter((code) => code.startsWith("composition")), []);
  assert.equal(confirmed.summary.completeNutritionRecords, 3);

  const contradicted = normalize({ items: [combo(900), chips, guac], ingredients: [] });
  assert.equal(contradicted.items[0].nutrition.values.calories, 770);
  assert.deepEqual(contradicted.items[0].nutrition.derivation.publishedNutrients, []);
  assert.ok(codes(contradicted, "warning").includes("composition_mismatch"));

  const loose = normalize({ items: [combo(900), chips, guac], ingredients: [], compositionCalorieTolerance: 150 });
  assert.equal(loose.items[0].nutrition.values.calories, 900);
});

test("a complete published panel is never replaced by a composition", () => {
  const draft = normalize({
    items: [
      standardItem({ composition: [component("Half of it", "component", { nutrition: seen({ calories: 100, protein: 5, carbs: 5, totalFat: 5 }) })] }),
    ],
    ingredients: [],
  });
  assert.deepEqual(draft.items[0].nutrition.values, FULL);
  assert.equal(draft.items[0].nutrition.derivation, undefined);
  const mismatch = draft.issues.find((issue) => issue.code === "composition_mismatch");
  assert.match(mismatch.message, /published panel was kept/);
});

test("composition never fills gaps: incomplete or missing components leave the total unknown", () => {
  const draft = normalize({
    items: [
      composedBowl([
        component("Tortilla", "implicit", { nutrition: seen(TORTILLA) }),
        component("Salsa", "default_selection", { ref: { kind: "option", id: "item:bowl:toppings:salsa" } }),
      ]),
      standardItem({ nutrition: [], composition: [component("Ghost", "component", { ref: { kind: "item", id: "item:missing" } })] }),
    ],
  });
  const [bowl, sandwich] = draft.items;
  // Salsa publishes calories only, so only calories can be totalled.
  assert.deepEqual(bowl.nutrition.values, { calories: 345 });
  assert.deepEqual(bowl.nutrition.missingCore, ["protein", "carbs", "totalFat"]);
  assert.ok(codes(draft, "warning").includes("composition_incomplete"));

  assert.deepEqual(sandwich.nutrition.values, {});
  assert.equal(sandwich.nutrition.derivation, undefined);
  assert.ok(codes(draft, "blocker").includes("composition_reference_missing"));
  assert.ok(draft.issues.find((issue) => issue.code === "core_nutrition_missing" && issue.entityIds.includes("item:sandwich")));
});

test("compositions can build on other compositions, in any order, and cycles are blocked", () => {
  const leaf = standardItem({ id: "item:leaf", name: "Leaf", nutrition: seen({ calories: 10, protein: 1, carbs: 1, totalFat: 0 }) });
  const pair = standardItem({ id: "item:pair", name: "Pair", nutrition: [], composition: [component("Leaf", "component", { quantity: 2, ref: { kind: "item", id: "item:leaf" } })] });
  const box = standardItem({ id: "item:box", name: "Box", nutrition: [], composition: [component("Pair", "component", { quantity: 3, ref: { kind: "item", id: "item:pair" } })] });
  const draft = normalize({ items: [box, pair, leaf], ingredients: [] });
  assert.equal(draft.items[0].nutrition.values.calories, 60);
  assert.equal(draft.items[1].nutrition.values.calories, 20);

  const a = standardItem({ id: "item:a", name: "A", nutrition: [], composition: [component("B", "component", { ref: { kind: "item", id: "item:b" } })] });
  const b = standardItem({ id: "item:b", name: "B", nutrition: [], composition: [component("A", "component", { ref: { kind: "item", id: "item:a" } })] });
  assert.ok(codes(normalize({ items: [a, b], ingredients: [] }), "blocker").includes("composition_cycle"));
});

test("composition from an ingredient follows merged ingredient ids and survives item merging", () => {
  const withComposition = composedBowl([component("Chicken", "implicit", { ref: { kind: "ingredient", id: "ingredient:chicken-2" } })]);
  const draft = normalize({
    items: [bowlItem(), withComposition],
    ingredients: [
      ...INGREDIENTS,
      { id: "ingredient:chicken-2", name: "chicken", sourceCategory: "Protein", nutrition: [], sources: [{ sourceId: "pdf" }] },
    ],
  });
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].nutrition.values.calories, 180);
  assert.equal(draft.items[0].nutrition.derivation.components[0].refId, "ingredient:chicken");
});

// ── Composition on variants, options and portions ────────────────────────

test("a variant, an option and a portion can each be scaled from another record", () => {
  const cup = standardItem({
    id: "item:cup",
    name: "Fountain 22",
    nutrition: [],
    variants: [{ id: "cup:cola", label: "Cola", isDefault: true, nutrition: seen({ calories: 220, protein: 0, carbs: 66, totalFat: 0 }) }],
  });
  const scaled = (quantity, evidence) => [
    { label: "Cola (22 fl oz)", quantity, role: "scaled_source", ref: { kind: "item", id: "item:cup", variantId: "cup:cola" }, evidence, source: { sourceId: "menu" } },
  ];
  const draft = normalize({
    items: [
      standardItem({
        id: "item:kids",
        name: "Kids Meal",
        nutrition: seen(FULL),
        variants: [{ id: "kids:large", label: "Large cup", isDefault: true, nutrition: [], composition: scaled(2) }],
        groups: [
          {
            id: "kids:drink",
            label: "Drink",
            role: "required_choice",
            minSelections: 1,
            maxSelections: 1,
            options: [
              { id: "kids:soda", label: "Soda", isDefault: false, isAvailable: true, nutrition: [], composition: scaled(0.5) },
              {
                id: "kids:cup",
                label: "Cup",
                isDefault: false,
                isAvailable: true,
                nutrition: [],
                portionPolicy: "alternative",
                portions: [{ id: "kids:cup:cola", label: "Cola", isDefault: true, nutrition: [], composition: scaled(16 / 22, "16 fl oz against 22 fl oz") }],
              },
            ],
          },
        ],
      }),
      cup,
    ],
    ingredients: [],
  });
  const [kids] = draft.items;
  assert.equal(kids.variants[0].nutrition.values.calories, 440);
  assert.equal(kids.groups[0].options[0].nutrition.values.carbs, 33);
  const portion = kids.groups[0].options[1].portions[0];
  assert.equal(portion.nutrition.values.calories, 160);
  assert.deepEqual(portion.nutrition.derivation.components, [
    { label: "Cola (22 fl oz)", quantity: 16 / 22, role: "scaled_source", refId: "item:cup", evidence: "16 fl oz against 22 fl oz" },
  ]);
  assert.equal(resolveSelectionNutrition(kids.groups[0].options[1]).values.calories, 160);
  // Calculated records count as complete; nothing is missing.
  assert.equal(draft.summary.recordsMissingCoreMacros, 0);
  assert.deepEqual(codes(draft, "blocker"), []);
});

test("a scaled record keeps a published calorie figure that confirms it, and reports one that does not", () => {
  const base = standardItem({ id: "item:salsa", name: "Salsa", nutrition: seen({ calories: 15, protein: 0, carbs: 3, totalFat: 0 }) });
  const large = (calories) =>
    standardItem({
      id: "item:large",
      name: "Large Salsa",
      nutrition: seen({ calories }),
      composition: [{ label: "Salsa", quantity: 3, role: "scaled_source", ref: { kind: "item", id: "item:salsa" } }],
    });
  const confirmed = normalize({ items: [large(50), base], ingredients: [] }).items[0].nutrition;
  assert.deepEqual(confirmed.values, { calories: 50, protein: 0, carbs: 9, totalFat: 0 });
  assert.deepEqual(confirmed.derivation.publishedNutrients, ["calories"]);

  const off = normalize({ items: [large(90), base], ingredients: [] });
  assert.equal(off.items[0].nutrition.values.calories, 45);
  assert.ok(codes(off, "warning").includes("composition_mismatch"));
});

test("an item can be composed from an option that is itself calculated, whatever the order", () => {
  const base = standardItem({ id: "item:base", name: "Base", nutrition: seen({ calories: 100, protein: 10, carbs: 10, totalFat: 2 }) });
  const draft = normalize({
    items: [
      bowlItem({
        composition: [{ label: "Double", quantity: 1, role: "default_selection", ref: { kind: "option", id: "o:double" } }],
        groups: [
          {
            id: "g",
            label: "Protein",
            role: "ingredient_group",
            minSelections: 1,
            maxSelections: 1,
            options: [
              { id: "o:double", label: "Double", isDefault: false, isAvailable: true, nutrition: [], composition: [{ label: "Base", quantity: 2, role: "scaled_source", ref: { kind: "item", id: "item:base" } }] },
            ],
          },
        ],
      }),
      base,
    ],
    ingredients: [],
  });
  assert.equal(draft.items[0].nutrition.values.calories, 200);
  assert.equal(draft.items[0].groups[0].options[0].nutrition.derivation.components[0].role, "scaled_source");
});

test("a published panel on a variant, option or portion is never replaced by a calculation", () => {
  const draft = normalize({
    items: [
      standardItem({
        nutrition: [],
        variants: [
          { id: "v", label: "Regular", isDefault: true, nutrition: seen(FULL), composition: [{ label: "Half", quantity: 1, role: "component", nutrition: seen({ calories: 1, protein: 1, carbs: 1, totalFat: 1 }) }] },
        ],
      }),
    ],
    ingredients: [],
  });
  assert.deepEqual(draft.items[0].variants[0].nutrition.values, FULL);
  assert.equal(draft.items[0].variants[0].nutrition.derivation, undefined);
});
