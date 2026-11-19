import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-11-19T00:00:00Z";
const source = (id, changes = {}) => ({
  id, kind: "official_html", authority: "official", url: `https://example.test/${id}`, retrievedAt: NOW, ...changes,
});
const observation = (sourceId, values, changes = {}) => ({ source: { sourceId }, values, ...changes });
const macros = { calories: 100, protein: 10, carbs: 15, totalFat: 0 };
const item = (id, nutrition, changes = {}) => ({
  id, name: id, sourceCategory: "Food", model: "standard", servingType: "single",
  isAvailable: true, sources: [{ sourceId: "current" }], nutrition, variants: [], groups: [], ...changes,
});
const draftFor = (items, sources = [source("current"), source("other")]) => normalizeRestaurant({
  restaurant: { id: "fixture", name: "Fixture" }, sources, items, ingredients: [],
}, { now: NOW });

test("draft quality distinguishes complete, missing, conflicting, stale, and implausible evidence", () => {
  const draft = draftFor([
    item("valid", [observation("current", macros)]),
    item("missing", [observation("current", { calories: 100 })]),
    item("conflict", [observation("current", macros), observation("other", { calories: 120 })]),
    item("dated", [observation("dated", macros)]),
    item("third-party", [observation("unofficial", macros)]),
    item("placeholder", [observation("current", { ...macros, protein: 0, carbs: 0 })]),
    item("serving", [
      observation("current", macros, { basis: { kind: "per_serving_unit", amount: 2, unit: "oz" } }),
      observation("other", macros, { basis: { kind: "per_serving_unit", amount: 3, unit: "oz" } }),
    ]),
  ], [source("current"), source("other"), source("dated", { sourceUpdatedAt: "2025-01-01" }), source("unofficial", { authority: "third_party" })]);
  const before = structuredClone(draft);
  const validation = validateDraft(draft, { auditQuality: true, now: NOW });
  const entries = new Map(validation.quality.records.map((entry) => [entry.id, entry]));
  assert.deepEqual(validation.quality.counts, { valid: 1, incomplete: 1, conflicting: 1, unsupported: 4 });
  assert.ok(entries.get("placeholder").reasons.includes("placeholder_zero_macros"));
  assert.ok(entries.get("serving").reasons.includes("incompatible_serving_bases"));
  assert.ok(entries.get("dated").verificationSourceIds.includes("dated"));
  assert.ok(entries.get("third-party").reasons.includes("value_without_verified_source"));
  assert.deepEqual(entries.get("missing").missingCore, ["protein", "carbs", "totalFat"]);
  assert.equal(validation.readyForApproval, false);
  assert.deepEqual(draft, before);
});

test("draft quality validates scoped choices, portion evidence, and published recipe totals", () => {
  const part = item("part", [observation("current", macros)]);
  const recipe = item("recipe", [observation("current", { ...macros, calories: 112, sodium: 25 })], {
    composition: [{ label: "part", role: "component", quantity: 1, ref: { kind: "item", id: "part" } }],
  });
  const withinRounding = item("within-rounding", [observation("current", { ...macros, calories: 104 })], {
    composition: [{ label: "part", role: "component", quantity: 1, ref: { kind: "item", id: "part" } }],
  });
  const choice = {
    id: "choice", label: "Choice", isDefault: true, isAvailable: false,
    nutrition: [], portions: [{ id: "light", label: "Light", isDefault: false, nutrition: [] }],
  };
  const group = { id: "group", label: "Group", role: "required_choice", minSelections: 1, maxSelections: 1, options: [choice] };
  const draft = draftFor([part, recipe, withinRounding, item("custom", [observation("current", macros)], { groups: [group] })]);
  const validation = validateDraft(draft, { auditQuality: true, now: NOW });
  const records = validation.quality.records;
  assert.deepEqual(records.find((record) => record.id === "recipe#component-total").discrepancies,
    [{ nutrient: "calories", published: 112, composed: 100, sourceId: "current" }]);
  assert.ok(!records.some((record) => record.id === "within-rounding#component-total"));
  assert.ok(records.find((record) => record.id === "group").reasons.includes("required_group_unsatisfiable"));
  assert.ok(records.find((record) => record.id === "choice#relationship").reasons.includes("portion_default_invalid"));
  assert.ok(records.find((record) => record.id === "light").reasons.includes("no_standalone_nutrition_expected"));
  assert.ok(!validation.readyForApproval);
});
