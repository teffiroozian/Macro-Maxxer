import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { emptyRegistry, idKeys, IdResolver, seedRegistryFromRuntimeMenu } from "../scripts/pipeline/ids.ts";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../scripts/pipeline/project.ts";

const NOW = "2026-11-01T00:00:00Z";
const SOURCES = [{ id: "menu", kind: "ordering_structured_data", authority: "ordering_system", url: "https://example.test/menu", retrievedAt: "2026-10-20" }];
const FULL = { calories: 400, protein: 30, carbs: 35, totalFat: 14 };
const seen = (values) => [{ source: { sourceId: "menu" }, values }];
const panel = (calories) => seen({ calories, protein: calories / 10, carbs: 1, totalFat: 2 });

const standard = (recordId, name, overrides = {}) => ({
  id: `draft:${recordId}`,
  name,
  model: "standard",
  sourceCategory: "Sides",
  servingType: "side",
  isAvailable: true,
  nutrition: seen(FULL),
  variants: [],
  groups: [],
  sources: [{ sourceId: "menu", recordId }],
  ...overrides,
});

const option = (recordId, label, calories, rest = {}) => ({
  id: `${rest.owner ?? "bowl"}:${recordId}`,
  label,
  ingredientId: `ing:${label.toLowerCase()}`,
  isDefault: false,
  isAvailable: true,
  nutrition: calories === null ? [] : panel(calories),
  source: { sourceId: "menu", recordId },
  ...rest,
});

function builder(recordId, name, proteinOptions, overrides = {}) {
  const owner = name.toLowerCase();
  return {
    id: `draft:${owner}`,
    name,
    model: "build-your-own",
    sourceCategory: "Entrees",
    servingType: "entree",
    isAvailable: true,
    nutrition: [],
    composition: [{ label: "Chicken", quantity: 1, role: "default_selection", ref: { kind: "option", id: proteinOptions[0].id } }],
    variants: [],
    groups: [
      { id: `${owner}:protein`, label: "Protein", role: "ingredient_group", minSelections: 1, maxSelections: 1, options: proteinOptions },
      {
        id: `${owner}:rice`,
        label: "Rice",
        role: "ingredient_group",
        minSelections: 1,
        maxSelections: 1,
        options: [
          option("R1", "White Rice", 210, { owner, isDefault: true }),
          option("R0", "No Rice", null, { owner, isExclusive: true, ingredientId: undefined }),
        ],
      },
      { id: `${owner}:toppings`, label: "Toppings", role: "ingredient_group", minSelections: null, maxSelections: null, options: [option("T1", "Salsa", 25, { owner }), option("T2", "Mystery", null, { owner })] },
      { id: `${owner}:bake`, label: "Bake", role: "preparation", minSelections: 0, maxSelections: 1, options: [option("B1", "Well Done", null, { owner, ingredientId: undefined })] },
    ],
    sources: [{ sourceId: "menu", recordId }],
    ...overrides,
  };
}

const chicken = (owner, recordId, calories) =>
  option(recordId, "Chicken", null, {
    owner,
    portionPolicy: "multiplier",
    portions: [
      { id: `${owner}:${recordId}:normal`, label: "Normal", isDefault: true, multiplier: 1, nutrition: panel(calories) },
      { id: `${owner}:${recordId}:extra`, label: "Extra", isDefault: false, multiplier: 2, nutrition: [] },
    ],
  });

const draftOf = (items, ingredients = []) =>
  normalizeRestaurant({ restaurant: { id: "test", name: "Test Kitchen" }, sources: SOURCES, items, ingredients, categoryMap: { Sides: "Sides", Entrees: "Entrees" } }, { now: NOW });

const INGREDIENTS = ["Chicken", "White Rice", "Salsa", "Mystery"].map((name) => ({
  id: `ing:${name.toLowerCase()}`,
  name,
  sourceCategory: name === "Chicken" ? "Proteins" : "Toppings",
  nutrition: [],
  sources: [{ sourceId: "menu" }],
}));

// ── Registry ─────────────────────────────────────────────────────────────

test("registry: an id follows its source record through a rename", () => {
  const first = projectToRestaurantMenu(draftOf([standard("S1", "Chips")]));
  assert.equal(first.menu.items[0].id, "test-chips");
  assert.deepEqual(first.ids.additions.map((entry) => [entry.kind, entry.id]), [["item", "test-chips"]]);

  const renamed = projectToRestaurantMenu(draftOf([standard("S1", "Tortilla Chips")]), { registry: first.ids.registry });
  assert.equal(renamed.menu.items[0].id, "test-chips");
  assert.deepEqual(renamed.ids.additions, []);

  // A new source record id with the old name is still the same item.
  const reissued = projectToRestaurantMenu(draftOf([standard("S9", "Chips")]), { registry: first.ids.registry });
  assert.equal(reissued.menu.items[0].id, "test-chips");
});

test("registry: a new record never takes an existing id, and nothing is ever removed", () => {
  const first = projectToRestaurantMenu(draftOf([standard("S1", "Chips")]));
  const second = projectToRestaurantMenu(draftOf([standard("S2", "Chips", { sourceCategory: "Snacks" })]), { registry: first.ids.registry });
  assert.equal(second.menu.items[0].id, "test-chips-2");
  assert.deepEqual(second.ids.registry.entries.map((entry) => entry.id), ["test-chips", "test-chips-2"]);
  // The input registry object is not mutated.
  assert.equal(first.ids.registry.entries.length, 1);
});

test("registry: two records cannot be given the same id in one run", () => {
  const resolver = new IdResolver({ restaurantId: "t", version: 1, entries: [{ id: "a", kind: "item", keys: ["src:1", "name:x/y"] }] });
  assert.deepEqual(resolver.resolve("item", ["src:1"], "t-first"), { id: "a", isNew: false });
  assert.deepEqual(resolver.resolve("item", ["src:1"], "t-second"), { id: "t-second", isNew: true });
  assert.equal(resolver.conflicts.length, 1);
  // A shared name alone is ordinary (one ingredient at two servings) and is not reported.
  assert.deepEqual(resolver.resolve("item", ["name:x/y"], "t-third"), { id: "t-third", isNew: true });
  assert.equal(resolver.conflicts.length, 1);
  // The key stays with the record that already owns it.
  assert.deepEqual(resolver.additions[0].keys, []);
  // A category id may be shared by several owners.
  const shared = new IdResolver({ restaurantId: "t", version: 1, entries: [{ id: "toppings", kind: "category", keys: ["a/group:topping", "b/group:topping"] }] });
  assert.equal(shared.resolve("category", ["a/group:topping"], "x").id, "toppings");
  assert.equal(shared.resolve("category", ["b/group:topping"], "x").id, "toppings");
  assert.deepEqual(shared.conflicts, []);
});

test("registry: seeding records a live menu's ids by source key, with context where a key is shared", () => {
  const source = (...itemIds) => ({ menu: { itemIds } });
  const registry = seedRegistryFromRuntimeMenu("live", {
    items: [
      { id: "live-chips", name: "Chips", categories: ["Sides"], source: source("S1"), variants: [{ id: "live-chips-large", label: "Large" }] },
      { id: "live-taco", name: "Taco", categories: ["Tacos"], source: source("E1"), customization: { ingredientCategories: [{ name: "Tortilla", id: "taco-tortilla", ingredients: ["tortilla-taco"] }] } },
      { id: "live-trio", name: "Tacos (3)", categories: ["Tacos"], source: source("E2"), customization: { ingredientCategories: [{ name: "Tortillas", id: "trio-tortilla", ingredients: ["tortilla-trio"] }] } },
    ],
    ingredients: [
      { id: "tortilla-taco", name: "Soft Tortilla", categories: ["Tortillas"], source: source("T1") },
      { id: "tortilla-trio", name: "Soft Tortilla", categories: ["Tortillas"], source: source("T1") },
      { id: "steak", name: "Steak", categories: ["Proteins"], source: source("P1"), variants: [{ id: "steak-half", label: "Half", source: source("P1H") }] },
    ],
    builderConfig: { entreeOptions: { taco: { id: "live-taco" } } },
  });
  const keys = (kind, id) => registry.entries.find((entry) => entry.kind === kind && entry.id === id).keys;

  assert.deepEqual(keys("item", "live-chips"), ["src:S1", "name:sides/chips"]);
  assert.deepEqual(keys("variant", "live-chips-large"), [idKeys.variant("live-chips", "Large")]);
  // T1 names two ingredients, so it only identifies one inside its builder; the shared name identifies neither.
  assert.deepEqual(keys("ingredient", "tortilla-taco"), ["src:T1@live-taco"]);
  assert.deepEqual(keys("ingredient", "tortilla-trio"), ["src:T1@live-trio"]);
  assert.deepEqual(keys("ingredient", "steak"), ["src:P1", "src:P1H", "name:proteins/steak"]);
  assert.deepEqual(keys("ingredient-variant", "steak-half"), [idKeys.portion("steak", "Half")]);
  // "Tortilla" and "Tortillas" are the same group name.
  assert.deepEqual(keys("category", "taco-tortilla"), ["live-taco/group:tortilla"]);
  assert.deepEqual(keys("entree-option", "taco"), [idKeys.entreeOption("live-taco")]);
  assert.deepEqual(emptyRegistry("x").entries, []);
});

// ── Projection ───────────────────────────────────────────────────────────

test("projection: standard items, variants and provenance; incomplete records are withheld", () => {
  const draft = draftOf([
    standard("S1", "Chips"),
    standard("S2", "Soup", { nutrition: seen({ calories: 150 }) }),
    standard("S3", "Soda", {
      nutrition: [],
      variants: [
        { id: "v:cola", label: "Cola", isDefault: false, nutrition: seen({ calories: 260, protein: 0, carbs: 70, totalFat: 0 }) },
        { id: "v:diet", label: "Diet", isDefault: true, nutrition: seen({ calories: 0, protein: 0, totalFat: 0 }) },
      ],
    }),
    standard("S4", "Tea", { nutrition: [], variants: [{ id: "v:tea", label: "Unsweet", isDefault: true, nutrition: [] }] }),
  ]);
  const { menu, excluded } = projectToRestaurantMenu(draft);

  assert.deepEqual(menu.items.map((item) => item.id), ["test-chips", "test-soda"]);
  assert.deepEqual(menu.items[0].nutrition, FULL);
  assert.deepEqual(menu.items[0].source.generated, { provider: "Test Kitchen", menu: { itemIds: ["S1"], role: "standalone_product" }, nutrition: { method: "published" } });
  // The incomplete default flavor is dropped; the item keeps its complete one.
  assert.deepEqual(menu.items[1].variants.map((variant) => variant.id), ["test-soda-cola"]);
  assert.equal(menu.items[1].defaultVariantId, "test-soda-cola");
  assert.equal(menu.items[1].nutrition.calories, 260);
  assert.deepEqual(excluded.map((entry) => [entry.name, entry.reason]), [
    ["Soup", "missing protein, carbs, totalFat"],
    ["Soda › Diet", "missing carbs"],
    ["Tea › Unsweet", "missing calories, protein, carbs, totalFat"],
    ["Tea", "no variant has complete nutrition"],
  ]);
  assert.equal(menu.hasBuildYourOwn, false);
  assert.equal(menu.builderConfig, undefined);
  assert.deepEqual(checkRuntimeMenu(menu), []);
});

test("projection: a builder becomes an item with categories, rules, defaults and ingredients", () => {
  const draft = draftOf([builder("E1", "Bowl", [chicken("bowl", "P1", 180)])], INGREDIENTS);
  const { menu, excluded } = projectToRestaurantMenu(draft);
  const [bowl] = menu.items;

  assert.equal(bowl.id, "test-bowl");
  assert.equal(bowl.nutrition.calories, 180);
  assert.equal(bowl.source.generated.nutrition.method, "composed");
  assert.deepEqual(bowl.ingredients, ["test-proteins-chicken"]);
  assert.deepEqual(bowl.customization.ingredientCategories, [
    { name: "Protein", id: "bowl-protein", ingredients: ["test-proteins-chicken"], allowNone: false },
    // "No Rice" is not an ingredient; it makes the group optional.
    { name: "Rice", id: "bowl-rice", ingredients: ["test-toppings-white-rice"], allowNone: true },
    // No minimum in the source: optional, and no invented maximum.
    { name: "Toppings", id: "bowl-toppings", ingredients: ["test-toppings-salsa"], allowNone: true },
  ]);
  assert.deepEqual(menu.customizationRules.ingredientCategories, {
    "bowl-protein": { minQuantity: 1, maxQuantity: 1, allowNone: false },
    "bowl-rice": { minQuantity: 1, maxQuantity: 1, allowNone: true },
    "bowl-toppings": { allowNone: true },
    // The runtime also looks rules up by category name.
    Protein: { minQuantity: 1, maxQuantity: 1, allowNone: false },
    Rice: { minQuantity: 1, maxQuantity: 1, allowNone: true },
    Toppings: { allowNone: true },
  });
  assert.deepEqual(menu.builderConfig.categoryMaxSelections, { "bowl-protein": 1, "bowl-rice": 1, Protein: 1, Rice: 1 });
  // Only what the source marks default is pre-selected.
  assert.deepEqual(menu.builderConfig.entreeOptions, { bowl: { id: "test-bowl", label: "Bowl", image: "", includedIngredientIds: ["test-toppings-white-rice"] } });

  const protein = menu.ingredients.find((ingredient) => ingredient.id === "test-proteins-chicken");
  assert.deepEqual(protein.variants.map((variant) => [variant.id, variant.nutrition.calories, variant.source.generated.nutrition.method]), [
    ["test-proteins-chicken-normal", 180, "published"],
    ["test-proteins-chicken-extra", 360, "scaled"],
  ]);
  assert.equal(protein.defaultVariantId, "test-proteins-chicken-normal");
  assert.deepEqual(excluded.map((entry) => entry.name), ["Bowl › Mystery"]);
  assert.equal(menu.hasBuildYourOwn, true);
  assert.deepEqual(checkRuntimeMenu(menu), []);
});

test("projection: the same ingredient at another serving is its own record, linked to the first", () => {
  const draft = draftOf([builder("E1", "Bowl", [chicken("bowl", "P1", 180)]), builder("E2", "Taco", [chicken("taco", "P2", 60)]), builder("E3", "Salad", [chicken("salad", "P3", 180)])], INGREDIENTS);
  const { menu, ids } = projectToRestaurantMenu(draft);
  const chickens = menu.ingredients.filter((ingredient) => ingredient.name === "Chicken");

  assert.deepEqual(chickens.map((ingredient) => [ingredient.id, ingredient.variants[0].nutrition.calories, ingredient.canonicalIngredientId]), [
    ["test-proteins-chicken", 180, undefined],
    ["test-proteins-chicken-2", 60, "test-proteins-chicken"],
  ]);
  // Bowl and Salad offer the same serving and share the record.
  assert.deepEqual(menu.items.map((item) => item.ingredients), [["test-proteins-chicken"], ["test-proteins-chicken-2"], ["test-proteins-chicken"]]);
  assert.deepEqual(ids.conflicts, []);
  assert.deepEqual(checkRuntimeMenu(menu), []);

  // Re-running against the resulting registry mints nothing and changes no id.
  const again = projectToRestaurantMenu(draft, { registry: ids.registry });
  assert.deepEqual(again.ids.additions, []);
  assert.deepEqual(again.menu, menu);
});

test("projection: a builder with no total is withheld, and portion availability gaps are noted", () => {
  const noDefault = builder("E1", "Bowl", [chicken("bowl", "P1", 180)], { composition: undefined });
  const withheld = projectToRestaurantMenu(draftOf([noDefault], INGREDIENTS));
  assert.deepEqual(withheld.menu.items, []);
  assert.ok(withheld.excluded.some((entry) => entry.name === "Bowl" && entry.reason === "builder has no default build to total"));
  assert.equal(withheld.menu.hasBuildYourOwn, false);

  const plain = option("P3", "Chicken", 180, { owner: "wrap" });
  const noted = projectToRestaurantMenu(draftOf([builder("E1", "Bowl", [chicken("bowl", "P1", 180)]), builder("E2", "Wrap", [{ ...plain, nutrition: panel(180) }])], INGREDIENTS));
  assert.equal(noted.menu.ingredients.filter((ingredient) => ingredient.name === "Chicken").length, 1);
  assert.ok(noted.notes.some((note) => /"Extra" portion is not offered on Wrap/.test(note)));
});

test("checkRuntimeMenu reports broken references", () => {
  const { menu } = projectToRestaurantMenu(draftOf([builder("E1", "Bowl", [chicken("bowl", "P1", 180)])], INGREDIENTS));
  const broken = structuredClone(menu);
  broken.items[0].ingredients = ["missing-ingredient"];
  broken.items[0].customization.ingredientCategories[0].ingredients.push("ghost");
  broken.ingredients[0].defaultVariantId = "nope";
  broken.builderConfig.categoryMaxSelections["orphan-rule"] = 2;
  broken.builderConfig.entreeOptions.bowl.id = "gone";
  broken.items.push({ ...broken.items[0] });
  const errors = checkRuntimeMenu(broken).join("\n");
  for (const fragment of ["used more than once", "missing-ingredient", "ghost", "nope", "orphan-rule", "gone"]) assert.match(errors, new RegExp(fragment));
});

test("projection: display order comes from the source, and is neutral when the source states none", () => {
  const ordered = builder("E1", "Bowl", [{ ...chicken("bowl", "P1", 180), order: 7 }]);
  ordered.groups[1].options[0].order = 3;
  const { menu } = projectToRestaurantMenu(draftOf([{ ...standard("S1", "Chips"), order: 4 }, standard("S2", "Dip"), ordered], INGREDIENTS));
  const order = (id) => [...menu.items, ...menu.ingredients].find((record) => record.id === id).defaultOrder;
  assert.deepEqual(["test-chips", "test-dip", "test-proteins-chicken", "test-toppings-white-rice", "test-toppings-salsa"].map(order), [4, 0, 7, 3, 0]);
  // Records without a stated order stay in source order in the list itself.
  assert.deepEqual(menu.items.map((item) => item.name), ["Chips", "Dip", "Bowl"]);
});

test("projection: a name-keyed limit is only emitted when every builder agrees on it", () => {
  const taco = builder("E2", "Taco", [chicken("taco", "P2", 60)]);
  taco.groups[2].maxSelections = 5;
  const bowl = builder("E1", "Bowl", [chicken("bowl", "P1", 180)]);
  bowl.groups[2].maxSelections = 2;
  const { menu, notes } = projectToRestaurantMenu(draftOf([bowl, taco], INGREDIENTS));
  const limits = menu.builderConfig.categoryMaxSelections;
  assert.deepEqual([limits["bowl-toppings"], limits["taco-toppings"], limits.Toppings, limits.Rice], [2, 5, undefined, 1]);
  assert.equal(menu.customizationRules.ingredientCategories.Toppings, undefined);
  assert.ok(notes.some((note) => /"Toppings" has different maximums/.test(note)));
  assert.deepEqual(checkRuntimeMenu(menu), []);
});

test("runtime relationships remap item, ingredient and scoped variant IDs and check their targets", () => {
  const base = standard("entree", "Entree", {
    variants: [{ id: "draft:entree/small", sourceVariantId: "small-sku", label: "Small", isDefault: true, nutrition: panel(200) }],
  });
  const side = standard("side", "Side", {
    variants: [{ id: "draft:side/small", sourceVariantId: "small-sku", label: "Small", isDefault: true, nutrition: panel(30) }],
  });
  const carrier = standard("meal", "Meal", { sourceOnly: true, nutrition: [] });
  const ingredient = { id: "draft:topping", name: "Topping", sourceCategory: "Toppings", nutrition: [], sources: [{ sourceId: "menu" }], contextualNutritionOnly: true };
  const context = { nutrition: FULL, source: {
    sourceType: "ordering_system", sourceId: "portion", sourceUrl: "https://example.test/menu",
    retailModifiedItemId: "topping", tag: "SMALL_TOPPING", servingWeight: { amount: 12, unit: "g" },
  } };
  const draft = draftOf([base, side, carrier], [ingredient]);
  draft.runtimeRelationships = {
    ingredients: { [ingredient.id]: { maxQuantity: 2, defaultOrder: 1, contextualNutritionUnits: [context] } },
    addonGroups: { toppings: { label: "Toppings", itemIds: [side.id], maxPerItem: 2 } },
    items: {
      [base.id]: {
        addonRefs: ["toppings"], ingredients: [ingredient.id],
        variantContexts: { "small-sku": { [ingredient.id]: context } },
      },
      [side.id]: { addonEligible: true },
      [carrier.id]: { comboConfig: {
        entreeItemId: base.id, mealItemIdByEntreeVariantId: { "small-sku": carrier.id },
        sideGroup: { required: true, minSelections: 1, maxSelections: 1,
          options: [{ itemId: side.id, fixedVariantId: "small-sku" }] },
      } },
    },
  };
  const { menu, relationshipErrors } = projectToRestaurantMenu(draft);
  const [entree, projectedSide, meal] = menu.items;
  const [topping] = menu.ingredients;
  assert.deepEqual(relationshipErrors, []);
  assert.deepEqual(checkRuntimeMenu(menu), []);
  assert.equal(meal.nutrition, undefined);
  assert.equal(topping.nutrition, undefined);
  assert.deepEqual(entree.ingredients, [topping.id]);
  assert.deepEqual(entree.variants[0].ingredientNutritionContexts[topping.id], context);
  assert.deepEqual(menu.addonGroups.toppings.itemIds, [projectedSide.id]);
  assert.deepEqual(meal.comboConfig.mealItemIdByEntreeVariantId, { [entree.variants[0].id]: meal.id });
  assert.equal(meal.comboConfig.sideGroup.options[0].fixedVariantId, projectedSide.variants[0].id);

  meal.comboConfig.sideGroup.options[0].fixedVariantId = entree.variants[0].id;
  menu.addonGroups.toppings.itemIds.push("missing-addon");
  assert.match(checkRuntimeMenu(menu).join("\n"), /variant .* does not exist[\s\S]*|missing-addon/);
  assert.equal(checkRuntimeMenu(menu).length, 2);
  draft.runtimeRelationships.items[base.id].variantContexts["absent-sku"] = { [ingredient.id]: context };
  assert.match(projectToRestaurantMenu(draft).relationshipErrors[0], /absent-sku/);
});
