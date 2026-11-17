import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { assessLiveNutrition, chipotleAdapter, translateChipotle } from "../scripts/pipeline/adapters/chipotle.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { resolveSelectionNutrition } from "../scripts/pipeline/nutrition.ts";
import { seedRegistryFromRuntimeMenu } from "../scripts/pipeline/ids.ts";
import { compareChipotleParity, renderParityReport } from "../scripts/pipeline/parity/chipotle.ts";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-09-15T00:00:00Z";

// ── Adapter behavior on a small hand-built capture ───────────────────────

const panel = (tcal, prot, carb, tfat, portion = 4, extra = {}) => ({
  nutrition: { tcal, prot, carb, tfat, satu: 1, tran: 0, sodi: 300, fibe: 1, suga: 0 },
  portion: { unit: "oz", value: portion },
  ...extra,
});
const placeholder = (tcal, portion = 0) => ({
  nutrition: { tcal, prot: 0, carb: 0, tfat: 0, satu: 0, tran: 0, sodi: 0, fibe: 0, suga: 0 },
  portion: { unit: "oz", value: portion },
});
const content = (itemId, itemName, itemType, contentGroupName = "", pricingReferenceItemId = null) => ({
  itemId,
  itemName,
  itemType,
  contentGroupName,
  pricingReferenceItemId,
  defaultContent: false,
  isItemAvailable: true,
  customizations: itemType === "Rice" ? [{ id: 1, name: "Light" }] : [],
});
const entree = (itemId, filling, contents) => ({
  itemType: "Burrito",
  itemId,
  itemName: `${filling} Burrito`,
  primaryFillingName: filling,
  isItemAvailable: true,
  contentGroups: [{ contentGroupName: "RiceContentGroup", minQuantity: 1, maxQuantity: 1 }],
  contents,
});
const shared = [
  content("R1", "White Rice", "Rice", "RiceContentGroup"),
  content("R0", "No Rice", "Rice", "RiceContentGroup"),
  content("T1", "Cheese", "Toppings"),
];
const pdfRow = (name, calories, cholesterol, portionAmount = 4, unit = "oz", carbs = 1) => ({
  name,
  section: "adult",
  portion: { raw: `${portionAmount} ${unit}`, amount: portionAmount, unit },
  calories: { value: calories },
  totalFat: { value: 6 },
  saturatedFat: { value: 1 },
  transFat: { value: 0 },
  cholesterol: { value: cholesterol },
  sodium: { value: 300 },
  carbohydrates: { value: carbs },
  dietaryFiber: { value: 1 },
  sugar: { value: 0 },
  protein: { value: 21 },
});

const FIXTURE = {
  calculatorMenu: {
    url: "https://example.test/menu",
    retrievedAt: "2026-08-31T00:00:00Z",
    restaurantId: 1,
    entrees: [
      // Each entree lists the other protein's Half record and every Extra record.
      entree("E-STEAK", "Steak", [...shared, content("H-CHICKEN", "Half Chicken", "HalfPortion", "", "E-CHICKEN"), content("X-STEAK", "Extra Steak", "ExtraPortion", "", "E-STEAK")]),
      entree("E-CHICKEN", "Chicken", [...shared, content("H-STEAK", "Half Steak", "HalfPortion", "", "E-STEAK"), content("X-STEAK", "Extra Steak", "ExtraPortion", "", "E-STEAK")]),
    ],
    sides: [
      { itemCategory: "Side", itemType: "Chips", itemId: "S3", itemName: "Chips", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Salsa", itemId: "S6", itemName: "Salsa Verde", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Salsa", itemId: "S7", itemName: "Large Salsa Verde", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Salsa", itemId: "S8", itemName: "Large Salsa Roja", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Queso", itemId: "S4", itemName: "Side of Queso", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Chips", itemId: "S5", itemName: "Chips & Queso", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Queso", itemId: "S1", itemName: "Large Side of Queso", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Queso", itemId: "S1-DUP", itemName: "Large Side of Queso", isItemAvailable: true },
      { itemCategory: "Side", itemType: "Chips", itemId: "S2", itemName: "Chips & Salsa", isItemAvailable: true },
    ],
    drinks: [
      { itemCategory: "Drink", itemType: "Soda", itemId: "D1", itemName: "22 fl oz Soda/Iced Tea", isItemAvailable: true },
      { itemCategory: "Drink", itemType: "Bottle", itemId: "D2", itemName: "22 fl oz Lemonade", isItemAvailable: true },
    ],
    nonFoodItems: [{ itemCategory: "Non Food Items", itemType: "Hardware", itemId: "N1", itemName: "Napkins", isItemAvailable: true }],
  },
  liveNutrition: {
    url: "https://example.test/nutrition",
    retrievedAt: "2026-08-31T00:00:00Z",
    items: {
      "E-STEAK": panel(150, 21, 1, 6),
      "E-CHICKEN": panel(180, 32, 0, 7),
      "H-STEAK": placeholder(75),
      "H-CHICKEN": placeholder(90),
      "X-STEAK": placeholder(300),
      R1: panel(210, 4, 40, 4),
      T1: panel(110, 6, 1, 8, 1),
      S1: panel(480, 20, 14, 37, 8),
      "S1-DUP": panel(480, 20, 14, 37, 8),
      S2: placeholder(570, 6),
      S3: panel(540, 7, 73, 25, 4),
      S6: panel(15, 0, 3, 0, 2),
      // 6 oz against the 2 oz Salsa Verde: 3 × 15 = 45, exactly the published figure.
      S7: placeholder(45, 6),
      // No record is named Salsa Roja, so nothing can be scaled.
      S8: placeholder(90, 6),
      S4: panel(240, 10, 8, 18, 4),
      // Published calories 785: only Chips (540) + Side of Queso (240) comes within 10; Large Side of Queso (480) does not.
      S5: placeholder(785),
      D1: { ...placeholder(250, 22), groupName: "FountainSoda", portion: { unit: "fl oz", value: 22 } },
      D2: panel(170, 0, 42, 0, 22),
    },
  },
  pdf: {
    url: "https://example.test/nutrition.pdf",
    retrievedAt: "2026-08-27",
    records: [
      pdfRow("Steak", 150, 80),
      pdfRow("Steak", 150, 80),
      pdfRow("Flour Tortilla (burrito)", 320, 0, 1, "ea", 50),
      pdfRow("Cola", 260, 0, 22, "fl oz", 70),
      pdfRow("Diet Cola", 0, 0, 22, "fl oz", null),
      pdfRow("Lemonade", 170, 0, 22, "fl oz", 42),
      pdfRow("Cola", 380, 0, 32, "fl oz", 100),
    ],
  },
  onlineMealCount: 4,
};

const fixtureDraft = () => normalizeRestaurant(translateChipotle(FIXTURE), { now: NOW });

test("Chipotle adapter: entrees of one container merge into a single builder", () => {
  const draft = fixtureDraft();
  const builders = draft.items.filter((item) => item.model === "build-your-own");
  assert.equal(builders.length, 1);
  const [burrito] = builders;
  assert.equal(burrito.name, "Burrito");
  assert.equal(burrito.category, "Burrito");
  assert.deepEqual(burrito.sources.map((ref) => ref.recordId), ["E-STEAK", "E-CHICKEN"]);

  const [protein, rice, toppings] = burrito.groups;
  assert.deepEqual(protein.options.map((option) => option.label), ["Steak", "Chicken"]);
  assert.deepEqual([protein.minSelections, protein.maxSelections], [1, 1]);
  assert.deepEqual([rice.label, rice.minSelections, rice.maxSelections], ["Rice", 1, 1]);
  assert.deepEqual(rice.options.map((option) => [option.label, option.isExclusive ?? false]), [["White Rice", false], ["No Rice", true]]);
  // Ungrouped contents carry no limits in the source.
  assert.deepEqual([toppings.label, toppings.minSelections, toppings.maxSelections], ["Toppings", null, null]);
});

test("Chipotle adapter: Half and Extra attach to the protein their pricing reference names", () => {
  const steak = fixtureDraft().items.find((item) => item.name === "Burrito").groups[0].options[0];
  assert.equal(steak.portionPolicy, "multiplier");
  const byLabel = Object.fromEntries(steak.portions.map((portion) => [portion.label, [portion.multiplier, portion.source.recordId]]));
  assert.deepEqual(byLabel, { Normal: [1, "E-STEAK"], Half: [0.5, "H-STEAK"], Extra: [2, "X-STEAK"] });
  // The chicken entree's own option gets Chicken's Half record, not Steak's.
  const chicken = fixtureDraft().items.find((item) => item.name === "Burrito").groups[0].options[1];
  assert.deepEqual(chicken.portions.map((portion) => portion.source.recordId), ["E-CHICKEN", "H-CHICKEN"]);

  const calories = (label) => resolveSelectionNutrition(steak, steak.portions.find((portion) => portion.label === label).id).values;
  assert.equal(calories("Normal").calories, 150);
  assert.deepEqual([calories("Half").calories, calories("Half").protein], [75, 10.5]);
  assert.deepEqual([calories("Extra").calories, calories("Extra").protein], [300, 42]);
});

test("Chipotle adapter: a sane live panel is supplemented by the PDF, not overridden", () => {
  const steak = fixtureDraft().items.find((item) => item.name === "Burrito").groups[0].options[0];
  const normal = steak.portions[0].nutrition;
  assert.deepEqual(normal.observations.map((observation) => observation.source.sourceId), ["chipotle:live-nutrition", "chipotle:nutrition-pdf"]);
  // Live omits cholesterol; the PDF supplies it. Where both publish a value
  // and disagree (satFat 1 vs 1 here agrees), live wins by declared precedence.
  assert.equal(normal.values.cholesterol, 80);
  assert.equal(normal.values.calories, 150);
  assert.equal(normal.completeness, "complete");
});

test("Chipotle adapter: placeholder live panels are rejected, never used as nutrition", () => {
  assert.match(assessLiveNutrition(placeholder(75)).rejection, /placeholder 0 portion/);
  assert.match(assessLiveNutrition(placeholder(570, 6)).rejection, /zeroed macros/);
  assert.match(assessLiveNutrition(panel(600, 2, 3, 4)).rejection, /implausible/);
  assert.equal(assessLiveNutrition(undefined).rejection, "no live nutrition record");
  // A genuine all-zero panel with a real portion is a published value.
  assert.deepEqual(assessLiveNutrition(placeholder(0, 2.5)).values.calories, 0);

  const draft = fixtureDraft();
  const chips = draft.items.find((item) => item.name === "Chips & Salsa");
  assert.deepEqual(chips.nutrition.values, {});
  assert.ok(draft.issues.some((issue) => issue.code === "live_panel_rejected"));
  assert.ok(draft.issues.some((issue) => issue.code === "core_nutrition_missing" && issue.entityIds.includes(chips.id)));
});

test("Chipotle adapter: standard items dedupe and fountain cups get PDF flavor variants", () => {
  const draft = fixtureDraft();
  const queso = draft.items.filter((item) => item.name === "Large Side of Queso");
  assert.equal(queso.length, 1);
  assert.deepEqual(queso[0].sources.map((ref) => ref.recordId), ["S1", "S1-DUP"]);
  assert.equal(queso[0].category, "Sides");
  assert.equal(queso[0].nutrition.values.calories, 480);

  const fountain = draft.items.find((item) => item.name === "22 fl oz Soda/Iced Tea");
  assert.equal(fountain.category, "Beverages");
  // The cup's own 250-calorie placeholder is not used; the bottled Lemonade
  // and the 32 fl oz row are not flavors of this cup.
  assert.deepEqual(fountain.nutrition.values, {});
  assert.deepEqual(fountain.variants.map((variant) => [variant.label, variant.nutrition.values.calories]), [["Cola", 260], ["Diet Cola", 0]]);
  // A blank PDF cell stays unknown.
  assert.equal(fountain.variants[1].nutrition.values.carbs, undefined);
  assert.deepEqual(fountain.variants[1].nutrition.missingCore, ["carbs"]);
});

test("Chipotle adapter: a builder's default build is declared and totalled by the engine", () => {
  const burrito = fixtureDraft().items.find((item) => item.name === "Burrito");
  // PDF tortilla (320) + default chicken (180); the PDF row's protein is 21, chicken's 32.
  assert.deepEqual([burrito.nutrition.values.calories, burrito.nutrition.values.protein], [500, 53]);
  assert.deepEqual(burrito.nutrition.derivation.components, [
    { label: "Tortilla", quantity: 1, role: "implicit" },
    { label: "Chicken", quantity: 1, role: "default_selection", refId: "chipotle:item:burrito:burrito:protein:chicken" },
  ]);
  // The implicit tortilla's numbers come from the PDF capture; the decisions source supplies structure only.
  assert.equal(burrito.composition[0].nutrition.observations[0].source.sourceId, "chipotle:nutrition-pdf");
  assert.equal(burrito.composition[0].source.sourceId, "chipotle:import-decisions");
});

test("Chipotle adapter: a combination with an unusable panel is composed only from a calorie-confirmed pairing", () => {
  const draft = fixtureDraft();
  const combo = draft.items.find((item) => item.name === "Chips & Queso");
  assert.deepEqual(combo.nutrition.derivation.components.map((entry) => entry.label), ["Chips", "Side of Queso"]);
  // Macros are the component sum; the published calorie figure is kept because it is within 10 of 780.
  assert.deepEqual([combo.nutrition.values.calories, combo.nutrition.values.protein, combo.nutrition.values.totalFat], [785, 17, 43]);
  assert.deepEqual(combo.nutrition.derivation.publishedNutrients, ["calories"]);
  assert.deepEqual(combo.nutrition.observations[0].values, { calories: 785 });

  // "Chips & Salsa" has no record named Salsa: nothing is composed and nothing is filled in.
  const unpaired = draft.items.find((item) => item.name === "Chips & Salsa");
  assert.equal(unpaired.composition, undefined);
  assert.deepEqual(unpaired.nutrition.values, {});
});

test("Chipotle adapter: a record that is another record at a larger serving is scaled by the published sizes", () => {
  const draft = fixtureDraft();
  const large = draft.items.find((item) => item.name === "Large Salsa Verde");
  assert.deepEqual(large.nutrition.derivation, {
    method: "composed",
    components: [
      {
        label: "Salsa Verde",
        quantity: 3,
        role: "scaled_source",
        refId: "chipotle:item:side:salsa-verde",
        evidence: "6 oz against the 2 oz serving published for Salsa Verde",
      },
    ],
    publishedNutrients: ["calories"],
  });
  assert.deepEqual([large.nutrition.values.calories, large.nutrition.values.carbs, large.nutrition.values.sodium], [45, 9, 900]);
  assert.equal(large.nutrition.completeness, "complete");
  // Its own calorie figure stays on the record as what the source published.
  assert.deepEqual(large.nutrition.observations.map((observation) => observation.values), [{ calories: 45 }]);

  const unknown = draft.items.find((item) => item.name === "Large Salsa Roja");
  assert.equal(unknown.composition, undefined);
  assert.deepEqual(unknown.nutrition.values, {});
});

test("Chipotle adapter: display order is carried only where the source states it", () => {
  const ordered = normalizeRestaurant(
    translateChipotle({ ...FIXTURE, displayOrder: { entrees: { "E-STEAK": 10, "E-CHICKEN": 7 }, sections: { RiceContentGroup: { R1: 2 } } } }),
    { now: NOW },
  );
  const [protein, rice, toppings] = ordered.items.find((item) => item.name === "Burrito").groups;
  assert.deepEqual(protein.options.map((option) => [option.label, option.order]), [["Steak", 10], ["Chicken", 7]]);
  assert.equal(rice.options[0].order, 2);
  assert.equal(toppings.options[0].order, undefined);
  assert.equal(fixtureDraft().items.find((item) => item.name === "Burrito").groups[0].options[0].order, undefined);
});

test("Chipotle adapter: what it does not import is on the record", () => {
  const codes = fixtureDraft().issues.map((issue) => issue.code);
  for (const code of ["portion_choices_without_amounts", "non_food_items_not_imported", "preconfigured_meals_not_imported"]) {
    assert.ok(codes.includes(code), code);
  }
});

// ── Parity against the existing generated menu ───────────────────────────

const real = (async () => {
  const draft = normalizeRestaurant(chipotleAdapter.translate(await chipotleAdapter.load()), { now: NOW });
  const generated = JSON.parse(await readFile("data/restaurants/chipotle/generated/restaurant.json", "utf8"));
  // The registry is seeded here from the live menu, exactly as the one-time
  // seed command does, so the test does not depend on a file on disk.
  const registry = seedRegistryFromRuntimeMenu("chipotle", generated);
  const projection = projectToRestaurantMenu(draft, { registry });
  return { draft, generated, registry, projection, report: compareChipotleParity(draft, generated, registry) };
})();

const findingsFor = (report, subject) => report.findings.filter((finding) => finding.subject === subject);

test("Chipotle draft from raw captures is structurally valid with no unresolved conflicts", async () => {
  const { draft } = await real;
  const validation = validateDraft(draft, { now: NOW });
  assert.equal(validation.valid, true, JSON.stringify(validation.context.errors.slice(0, 5)));
  assert.equal(draft.status, "draft");
  assert.deepEqual(draft.menuModels, ["standard", "build-your-own"]);
  assert.equal(draft.summary.nutritionConflicts, 0);
  assert.equal(draft.issues.filter((issue) => issue.code === "selection_rule_conflict").length, 0);
});

test("parity: every generated product and builder is found in the draft by source id", async () => {
  const { report, generated } = await real;
  const expected = generated.items.filter((item) => ["standalone_product", "build_container"].includes(item.source.menu.role));
  assert.equal(expected.length, 63);
  const unpaired = report.findings.filter((finding) => finding.field === "presence" && finding.draft === "absent" && finding.classification !== "engine_gap");
  assert.deepEqual(unpaired, []);
  // No category, serving-type or merged-source-id differences.
  assert.deepEqual(report.findings.filter((finding) => ["category", "servingType", "sourceItemIds"].includes(finding.field)), []);
});

test("parity: nutrition read directly from a published panel reproduces exactly", async () => {
  const { report, generated } = await real;
  const direct = new Set(["live_full_nutrition", "pdf_exact_name", "pdf_alias_name", "pdf_portion_disambiguated"]);
  const directItems = generated.items.filter((item) => item.source.menu.role === "standalone_product" && !item.variants && direct.has(item.source.nutrition.method));
  assert.equal(directItems.length, 40);
  for (const item of directItems) {
    const core = findingsFor(report, item.name).filter((finding) => finding.field === "nutrition" && /calories|protein|carbs|totalFat/.test(finding.reason));
    assert.deepEqual(core, [], item.name);
  }
  assert.equal(report.byClass.unexplained, 0);
});

test("parity: builder groups, limits and per-container servings match", async () => {
  const { report, draft } = await real;
  const groups = report.sections.find((section) => section.name === "Selection groups and rules");
  assert.equal(groups.compared, 36);
  assert.deepEqual(report.findings.filter((finding) => finding.field === "selectionLimits" || (finding.field === "group" && finding.draft === "absent")), []);

  // The same protein carries a different serving per container.
  const steakIn = (name) => draft.items.find((item) => item.name === name).groups[0].options.find((option) => option.label === "Steak");
  assert.equal(resolveSelectionNutrition(steakIn("Burrito")).values.calories, 150);
  assert.equal(resolveSelectionNutrition(steakIn("Taco")).values.calories, 50);
  assert.equal(resolveSelectionNutrition(steakIn("Kids Build Your Own")).values.calories, 70);

  // Scaled Half/Extra portions equal the importer's approved values.
  for (const portion of ["Normal", "Half", "Extra"]) {
    assert.deepEqual(findingsFor(report, `Burrito › Protein › Steak › ${portion}`), [], portion);
  }
});

test("parity: composed builders and combinations reproduce the generated totals", async () => {
  const { report, draft } = await real;
  const item = (name) => draft.items.find((entry) => entry.name === name);
  const core = (name) => {
    const { calories, protein, carbs, totalFat } = item(name).nutrition.values;
    return [calories, protein, carbs, totalFat];
  };
  assert.deepEqual(core("Burrito"), [500, 40, 50, 16]);
  assert.deepEqual(core("Bowl"), [180, 32, 0, 7]);
  assert.deepEqual(core("Salad"), [415, 34, 21, 23]);
  assert.deepEqual(core("Quesadilla"), [830, 58, 53, 40]);
  assert.deepEqual(core("Kids Quesadilla"), [280, 23, 14, 13.5]);
  assert.equal(item("Quesadilla").nutrition.derivation.components.find((entry) => entry.label === "Cheese").quantity, 3);

  // Builders whose generated total the draft reproduces on every nutrient.
  for (const name of ["Bowl", "Tacos (3)", "Kids Build Your Own"]) assert.deepEqual(findingsFor(report, name), [], name);
  // No builder is missing its default build any more.
  assert.deepEqual(report.findings.filter((finding) => finding.field === "defaultSelection"), []);
  // Where totals differ, no core macro the generated menu carries is off.
  const builderNutrition = report.findings.filter((finding) => finding.section === "Build-your-own containers" && finding.field === "nutrition");
  assert.deepEqual(builderNutrition.filter((finding) => finding.classification !== "generated_departs_from_source").map((finding) => finding.subject), []);

  for (const name of ["Chili Lime Chips & Queso Blanco", "Chili Lime Chips & Guacamole"]) {
    assert.deepEqual(findingsFor(report, name), [], name);
    assert.equal(item(name).nutrition.derivation.method, "composed");
  }
});

test("parity: published portion panels win and calculated portions are complete", async () => {
  const { report, draft } = await real;
  const pollo = draft.items.find((entry) => entry.name === "Burrito").groups[0].options.find((option) => option.label === "Pollo Asado");
  const portion = (label) => pollo.portions.find((entry) => entry.label === label).nutrition;
  // Extra publishes its own panel (200 cal); it is not 180 × 1.11.
  assert.deepEqual([portion("Extra").values.calories, portion("Extra").values.protein], [200, 23]);
  assert.equal(portion("Extra").derivation, undefined);
  assert.deepEqual(findingsFor(report, "Burrito › Protein › Pollo Asado › Extra"), []);
  // Half has no record at all in the source: it stays unknown.
  assert.deepEqual(portion("Half").values, {});

  const steak = draft.items.find((entry) => entry.name === "Burrito").groups[0].options.find((option) => option.label === "Steak");
  const half = steak.portions.find((entry) => entry.label === "Half").nutrition;
  assert.equal(half.completeness, "complete");
  assert.deepEqual([half.derivation.method, half.derivation.factor], ["scaled", 0.5]);
  assert.match(half.derivation.evidence, /CMG-5602\) publishes 75 calories against 150/);

  const calculated = draft.items.flatMap((entry) => entry.groups.flatMap((group) => group.options.flatMap((option) => option.portions ?? []))).filter((entry) => entry.nutrition.derivation?.method === "scaled");
  assert.ok(calculated.length > 20);
  assert.ok(calculated.every((entry) => entry.nutrition.completeness === "complete"));
});

test("parity: differences are reported and classified, not hidden", async () => {
  const { report } = await real;
  const one = (subject, field) => {
    const found = findingsFor(report, subject).filter((finding) => finding.field === field);
    assert.equal(found.length, 1, `${subject} ${field}`);
    return found[0];
  };

  // The single taco's tortillas use Chipotle's official one-tortilla panels,
  // as the generated menu now does, so neither they nor the taco differ.
  for (const subject of ["Taco", "Taco › Tortilla › Soft Flour Tortilla", "Taco › Tortilla › Crispy Corn Tortilla", "entree option taco"]) {
    assert.deepEqual(findingsFor(report, subject), [], subject);
  }
  // A total is withheld for a nutrient a component does not publish.
  assert.match(one("Kids Quesadilla", "nutrition").reason, /cholesterol: generated 95, draft has none/);
  // The importer's own pairing is 40 calories off the published figure, so the draft composes nothing.
  assert.equal(one("Large Chili Lime Chips & Guacamole", "nutrition").classification, "restaurant_decision");
  // The importer's two large chili-lime pairings stay uncomposed: no pairing confirms the published calories.
  assert.equal(one("Large Chili Lime Chips & Queso Blanco", "nutrition").classification, "restaurant_decision");
  assert.equal(one("Burrito › Protein › Pollo Asado › Half", "nutrition").classification, "restaurant_decision");
  assert.equal(one("Quesadilla › Protein › Steak › Extra", "portion").classification, "generated_departs_from_source");

  // The importer writes 0 carbs where the PDF cell is blank.
  const dietCoke = one("Fountain Drink (32 fl oz) › Diet Coke, Caffeine Free", "nutrition");
  assert.equal(dietCoke.classification, "generated_departs_from_source");
  assert.match(dietCoke.reason, /carbs: generated 0, draft has none/);

  // Each unrepresentable record is counted once as a missing item and once as a missing id.
  assert.equal(report.gapCounts.preset_compositions, 22);
  assert.equal(report.gapCounts.structural_records, 6);
  for (const closed of ["composed_nutrition", "default_selections", "mixed_portion_policy", "multiplier_portions_counted_missing", "stable_ids", "context_ingredients", "runtime_projection", "derived_nutrition", "ordering"]) {
    assert.equal(report.gapCounts[closed], undefined, closed);
  }
  assert.equal(report.findings.length, Object.values(report.byClass).reduce((total, count) => total + count, 0));
});

test("projection: live Chipotle ids are reused through the registry, never re-minted", async () => {
  const { projection, generated, registry } = await real;
  const { menu, ids } = projection;
  assert.deepEqual(checkRuntimeMenu(menu), []);
  assert.deepEqual(ids.conflicts, []);

  const liveItems = new Set(generated.items.map((item) => item.id));
  const liveIngredients = new Set(generated.ingredients.map((ingredient) => ingredient.id));
  assert.equal(menu.items.filter((item) => liveItems.has(item.id)).length, 61);
  assert.equal(menu.ingredients.filter((ingredient) => liveIngredients.has(ingredient.id)).length, 72);
  for (const id of ["chipotle-burrito", "chipotle-tacos-3", "chipotle-cmg-1007", "chipotle-fountain-22-fl-oz"]) assert.ok(menu.items.some((item) => item.id === id), id);

  // One live record shared by four builders, and a separate record per smaller serving.
  const steak = menu.ingredients.find((ingredient) => ingredient.id === "chipotle-protein-steak");
  assert.deepEqual(steak.variants.map((variant) => variant.id).sort(), ["chipotle-protein-steak-extra", "chipotle-protein-steak-half", "chipotle-protein-steak-normal"]);
  assert.equal(steak.defaultVariantId, "chipotle-protein-steak-normal");
  assert.equal(menu.ingredients.find((ingredient) => ingredient.id === "chipotle-protein-steak-taco").nutrition.calories, 50);
  assert.equal(menu.ingredients.find((ingredient) => ingredient.id === "chipotle-protein-steak-kids-quesadilla").nutrition.calories, 70);
  // The same source record means a different live id in each taco builder.
  for (const id of ["chipotle-tortilla-soft-flour-taco", "chipotle-tortilla-soft-flour-tacos-3"]) assert.ok(menu.ingredients.some((ingredient) => ingredient.id === id), id);

  // New ids never collide with a live id and are reported, not written.
  const existing = new Set(registry.entries.map((entry) => `${entry.kind}|${entry.id}`));
  assert.ok(ids.additions.length > 0);
  assert.ok(ids.additions.every((entry) => !existing.has(`${entry.kind}|${entry.id}`)));
  // Catering builders are not imported, so they mint no ids.
  assert.ok(!ids.additions.some((entry) => /byoprotein|byochips|contentgroup/.test(entry.id)));
  assert.equal(registry.entries.length, 272);
});

test("projection: builders carry the live runtime structure", async () => {
  const { projection, generated, report } = await real;
  const { menu } = projection;
  const live = (id) => generated.items.find((item) => item.id === id);
  const projected = (id) => menu.items.find((item) => item.id === id);

  for (const id of ["chipotle-burrito", "chipotle-bowl", "chipotle-salad", "chipotle-quesadilla", "chipotle-taco", "chipotle-tacos-3", "chipotle-kids-build-your-own", "chipotle-kids-quesadilla"]) {
    assert.deepEqual([...projected(id).ingredients].sort(), [...live(id).ingredients].sort(), id);
  }
  const rice = projected("chipotle-burrito").customization.ingredientCategories.find((category) => category.id === "burrito-rice");
  assert.deepEqual(rice, live("chipotle-burrito").customization.ingredientCategories.find((category) => category.id === "burrito-rice"));
  assert.deepEqual(menu.customizationRules.ingredientCategories["burrito-rice"], generated.customizationRules.ingredientCategories["burrito-rice"]);
  assert.equal(menu.builderConfig.categoryMaxSelections["quesadilla-dips"], 3);
  assert.deepEqual(menu.builderConfig.entreeOptions.salad, { id: "chipotle-salad", label: "Salad", image: "", includedIngredientIds: ["chipotle-cmg-5353"] });
  assert.deepEqual(Object.keys(generated.builderConfig.entreeOptions).filter((key) => !menu.builderConfig.entreeOptions[key]), []);

  // No structural difference is left.
  const structural = report.findings.filter((finding) => ["category id", "category members", "selection rule", "categoryMaxSelections", "entreeOption", "includedIngredientIds", "default ingredients", "references"].includes(finding.field));
  assert.deepEqual(structural, []);
  const idSection = report.sections.find((section) => section.name === "Stable ids");
  // 246 compared before catering builders stopped being imported.
  assert.deepEqual([idSection.compared, idSection.matched], [244, 219]);
});

test("projection: a record without complete nutrition is withheld, not zero-filled", async () => {
  const { projection } = await real;
  const { menu, excluded } = projection;
  assert.ok(!menu.items.some((item) => item.id === "chipotle-cmg-5366"));
  assert.ok(excluded.some((entry) => entry.name === "Large Chili Lime Chips & Guacamole"));
  // One incomplete flavor is dropped; the fountain cup keeps its other flavors.
  const fountain = menu.items.find((item) => item.id === "chipotle-fountain-32-fl-oz");
  assert.ok(fountain.variants.length > 20);
  assert.ok(!fountain.variants.some((variant) => variant.label === "Diet Coke, Caffeine Free"));
  for (const record of [...menu.items, ...menu.ingredients, ...menu.items.flatMap((item) => item.variants ?? [])]) {
    if (!record.nutrition) continue;
    for (const nutrient of ["calories", "protein", "carbs", "totalFat"]) assert.equal(typeof record.nutrition[nutrient], "number", `${record.id} ${nutrient}`);
  }
  assert.ok(projection.notes.some((note) => /Extra.*not offered on Quesadilla/.test(note)));
});

test("parity: records the importer scales are derived from published serving sizes, with provenance", async () => {
  const { report, draft } = await real;
  const item = (name) => draft.items.find((entry) => entry.name === name);

  // 6 oz against the 2 oz salsa; the published 45 calories confirm 3 × 15.
  const green = item("Large Tomatillo-Green Chili Salsa").nutrition;
  assert.deepEqual([green.derivation.components[0].quantity, green.derivation.components[0].role], [3, "scaled_source"]);
  assert.match(green.derivation.components[0].evidence, /6 oz against the 2 oz serving/);
  // Fresh Tomato publishes 3.5 oz live and 4 oz in the PDF; the 4 oz serving reproduces the published calories more closely.
  assert.equal(item("Large Fresh Tomato Salsa").nutrition.derivation.components[0].quantity, 1.5);
  // The 4 oz side is the 4 oz add-on record as it stands, not twice the 2 oz topping.
  assert.equal(item("Side of Cilantro Lime Sauce").nutrition.derivation.components[0].quantity, 1);
  for (const name of ["Large Tomatillo-Green Chili Salsa", "Large Fresh Tomato Salsa", "Large Roasted Chili-Corn Salsa", "Large Tomatillo-Red Chili Salsa", "Side of Cilantro Lime Sauce"]) {
    assert.deepEqual(findingsFor(report, name), [], name);
  }
  // With the large salsas known, the chips combinations that use them compose too.
  for (const name of ["Chili Lime Chips & Tomatillo-Green Chili Salsa", "Chili Lime Chips & Fresh Tomato Salsa"]) {
    assert.deepEqual(findingsFor(report, name), [], name);
    assert.equal(item(name).nutrition.completeness, "complete");
  }

  // Kids 16 fl oz cup: each flavor is the 22 fl oz PDF row × 16/22.
  const soda = item("Kids Build Your Own").groups.find((group) => group.label === "Kids Drink").options.find((option) => option.label === "16 fl oz Soda/Iced Tea");
  const cola = soda.portions.find((portion) => portion.label === "Coca-Cola Classic");
  assert.ok(Math.abs(cola.nutrition.values.calories - (260 * 16) / 22) < 1e-9);
  assert.deepEqual([cola.nutrition.derivation.components[0].role, cola.nutrition.derivation.components[0].quantity], ["scaled_source", 16 / 22]);
  assert.match(cola.nutrition.derivation.components[0].evidence, /16 fl oz cup against the 22 fl oz serving/);
  assert.deepEqual(findingsFor(report, "Kids Build Your Own › Kids Drink › 16 fl oz Soda/Iced Tea › Coca-Cola Classic"), []);
  // The cup's own 220-calorie placeholder is never used.
  assert.deepEqual(soda.nutrition.values, {});
});

test("parity: display order follows the source; only the hand-verified topping order differs", async () => {
  const { report, projection, generated } = await real;
  const order = report.findings.filter((finding) => finding.field === "display order");
  assert.equal(order.length, 11);
  assert.ok(order.every((finding) => finding.classification === "restaurant_decision"));
  const live = new Map(generated.ingredients.map((ingredient) => [ingredient.id, ingredient.defaultOrder]));
  for (const id of ["chipotle-protein-steak", "chipotle-protein-chicken", "chipotle-cmg-5051", "chipotle-cmg-5001"]) {
    assert.equal(projection.menu.ingredients.find((ingredient) => ingredient.id === id).defaultOrder, live.get(id), id);
  }
});

test("parity report renders every section and classification", async () => {
  const { report, draft } = await real;
  const markdown = renderParityReport(report, draft);
  for (const section of report.sections) assert.ok(markdown.includes(`| ${section.name} |`), section.name);
  for (const heading of ["Missing universal functionality", "Legitimate Chipotle-specific behavior", "Generated menu departs from the raw source"]) {
    assert.ok(markdown.includes(`## ${heading}`), heading);
  }
  assert.ok(!markdown.includes("## Unexplained"));
});
