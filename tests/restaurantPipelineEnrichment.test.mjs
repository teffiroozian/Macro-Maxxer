import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { enrichDraft } from "../scripts/pipeline/enrich.ts";
import { extractionRef } from "../scripts/pipeline/extraction-input.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-11-19T12:00:00Z";
const date = "2026-11-12T12:00:00Z";
const source = (id, changes = {}) => ({ id, url: `https://modpizza.com/${id}`, sha256: id, authority: "official",
  kind: "official_html", retrievedAt: date, sourceUpdatedAt: date, ...changes });
const record = (source, id, kind, fields = {}) => ({
  id, kind, name: id, flags: [],
  provenance: { sourceId: source.id, sha256: source.sha256, url: source.url, retrievedAt: source.retrievedAt, locator: id, method: "official_html" },
  ...fields,
});

test("enrichment verifies linked current metadata and holds dated, unlinked, and nutrition evidence for review", () => {
  const current = source("current");
  const dated = source("dated", { sourceUpdatedAt: "2025-01-01T00:00:00Z" });
  const unsafe = source("lookalike", { url: "https://modpizza.com.example.net/ingredients" });
  const group = record(current, "captured-group", "option_group", { customization: { minSelections: 0, maxSelections: 1, requiresUserSelection: false, supportsQuantitySelection: true } });
  const serving = record(current, "measured-serving", "portion", { servingText: "4 oz" });
  const unitless = record(current, "unitless", "portion", { servingText: "4" });
  const ingredient = record(dated, "dated-ingredient", "ingredient_declaration", { name: "Cheese", ingredientsText: "Milk, cultures, salt" });
  const namesake = record(current, "name-only", "ingredient_declaration", { name: "Sauce", ingredientsText: "Tomatoes, salt" });
  const fake = record(unsafe, "fake", "ingredient_declaration", { name: "Meat", ingredientsText: "Unverified text" });
  const panel = record(current, "new-panel", "nutrition_row", { nutrition: { values: { protein: 12 }, raw: { protein: "12" } } });
  const restaurant = { id: "mod", name: "MOD Pizza" };
  const draft = normalizeRestaurant({ restaurant, sources: [current, dated, unsafe], ingredients: ["Cheese", "Sauce", "Meat", "Greens"].map((name) => ({
    id: name, name, sourceCategory: "Toppings", sources: [{ sourceId: current.id }], nutrition: [],
  })), items: [{
    id: "pizza", name: "Pizza", model: "standard", servingType: "entree", sourceCategory: "Pizza",
    isAvailable: true, sources: [{ sourceId: current.id }], nutrition: [], variants: [],
    groups: [{ id: "size", label: "Size", role: "required_choice", minSelections: 0, maxSelections: 1,
      options: [{ id: "choice", label: "Choice", isDefault: true, isAvailable: true, nutrition: [],
        portions: [{ id: "serving", label: "Serving", isDefault: true, nutrition: [
          { values: { calories: 100 }, source: extractionRef(serving), basis: { kind: "selected_portion", amount: 4, unit: "oz" } },
          { values: {}, source: extractionRef(unitless), comparisonOnly: true },
        ] }],
      }],
    }],
  }] }, { now: NOW });
  const pairs = [[group, "size"], [serving, "serving"], [unitless, "serving"], [ingredient, "Cheese"], [namesake], [fake, "Meat"], [panel, "pizza"]];
  const input = { restaurant, runAt: date, mode: "replay", records: pairs.map(([entry]) => entry) };
  const matches = { restaurant: restaurant.id, extractionRunAt: date, records: pairs.map(([entry, target]) =>
    ({ id: entry.id, status: target ? "matched" : "unmatched", targets: target ? [target] : [] })) };
  const validation = validateDraft(draft, { auditQuality: true, now: NOW });
  const before = structuredClone(draft);
  const enrichment = enrichDraft(draft, input, matches, validation.quality);
  const entry = (target, field) => enrichment.entries.find((row) => row.targetId === target && row.field === field);
  assert.deepEqual(entry("serving", "serving").value, { amount: 4, unit: "oz" });
  assert.equal(entry("size", "requiresUserSelection").value, false);
  assert.equal(entry("Cheese", "ingredientDeclaration").reason, "source_needs_verification");
  assert.equal(entry("Sauce", "ingredientDeclaration").reason, "name_only_match");
  assert.equal(entry("Meat", "ingredientDeclaration").reason, "source_authority_unverified");
  assert.equal(entry("Greens", "ingredientDeclaration").status, "unavailable");
  assert.equal(entry("pizza", "protein").status, "manual_review");
  assert.equal(draft.items[0].nutrition.values.protein, undefined);
  assert.equal(validation.readyForApproval, false);
  assert.deepEqual(draft, before);
  assert.ok(enrichment.evidence.every((row) => row.provenance.locator && row.provenance.sha256));
  assert.throws(() => enrichDraft(draft, input, { ...matches, extractionRunAt: NOW }, validation.quality), /correspond/);
});
