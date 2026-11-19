import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { extractFromDiscovery } from "../scripts/extraction/extract.ts";
import { extractPdfTables, readPdf } from "../scripts/extraction/extractors/document.ts";
import { extractJsonMenu } from "../scripts/extraction/extractors/json-menu.ts";
import { replayFetcher } from "../scripts/discovery/fetchers.ts";
import { modPizzaTarget } from "../scripts/discovery/targets.ts";
import { translateModExtraction } from "../scripts/pipeline/adapters/mod-pizza.ts";
import { translateChipotleExtraction } from "../scripts/pipeline/adapters/chipotle.ts";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { collectExtractionLinks, extractionMatchReport } from "../scripts/pipeline/extraction-input.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const NOW = "2026-11-19T00:00:00.000Z";
const normalize = (output) => normalizeRestaurant(output, { now: NOW });

test("MOD extraction-backed draft preserves size options, dated macros, and unresolved evidence", async () => {
  const discovery = JSON.parse(await readFile("tests/fixtures/extraction/mod-discovery-replay.json", "utf8"));
  const report = await extractFromDiscovery(discovery, await replayFetcher(modPizzaTarget.replay), { now: NOW });
  const stale = {
    id: "historic#mozzarella",
    name: "mozzarella",
    category: "Cheese",
    kind: "nutrition_row",
    servingText: "¼ c",
    nutrition: { values: { protein: 6, totalFat: 5 }, raw: { protein: "6", totalFat: "5" }, unclean: [], missingCore: ["calories", "carbs"] },
    provenance: { sourceId: "historic", url: "https://modpizza.com/mod-fresh-nutrition/", method: "official_html", retrievedAt: NOW, locator: "row 1" },
    flags: ["needs_verification"],
  };
  const unmatched = { ...stale, id: "historic#salad", name: "Small", category: "Salad",
    provenance: { ...stale.provenance, locator: "row 2" } };
  const extraction = { restaurant: report.restaurant, mode: report.mode, runAt: report.runAt,
    records: [...report.sources.flatMap((source) => source.records), stale, unmatched], sources: report.sources };
  const output = translateModExtraction(extraction);
  const links = collectExtractionLinks(output);
  const draft = normalize(output);
  const builder = draft.items.find((item) => item.name === "The MOD");
  assert.ok(builder.variants.some((variant) => variant.groups.some((group) => group.options.some((option) =>
    option.portions?.some((portion) => portion.label === "Regular" && portion.source.extractionId)))));
  const mozzarella = draft.ingredients.find((ingredient) => ingredient.name === "Mozzarella" && ingredient.sourceCategory === "Cheeses");
  assert.equal(mozzarella.nutrition.values.protein, undefined);
  const evidence = mozzarella.nutrition.observations.find((observation) => observation.source.extractionId === stale.id);
  assert.equal(evidence.values.protein, 6);
  assert.equal(evidence.values.carbs, undefined);
  assert.deepEqual(evidence.source.flags, ["needs_verification"]);
  const match = extractionMatchReport(extraction, links, draft, new Map());
  assert.equal(match.records.find((entry) => entry.id === stale.id).status, "matched");
  assert.equal(match.records.find((entry) => entry.id === unmatched.id).status, "unmatched");
  assert.deepEqual([validateDraft(draft).valid, validateDraft(draft).readyForApproval], [true, false]);
});

test("Chipotle joins calculator records by ID and withholds stale PDF nutrition and ratio-based macro estimates", async () => {
  const json = JSON.parse(await readFile("data/restaurants/chipotle/raw/menu-metadata-nutrition.json", "utf8"));
  const nutritionUrl = "https://services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US";
  const panels = extractJsonMenu(json, { sourceId: "panels", url: nutritionUrl, method: "browser_rendered", retrievedAt: NOW })
    .map((row) => ({ ...row, flags: [...row.flags, "passive_capture"] }));
  const pages = await readPdf(await readFile("data/restaurants/chipotle/raw/nutrition-paper-menu.pdf"));
  const pdf = extractPdfTables(pages, { sourceId: "pdf", url: "https://www.chipotle.com/nutrition.pdf", method: "official_document", retrievedAt: NOW })
    .map((row) => ({ ...row, flags: [...row.flags, "needs_verification"] }));
  const clone = { ...panels[0], id: "duplicate", provenance: { ...panels[0].provenance, sha256: "fixture" } };
  panels[0].provenance.sha256 = "fixture";
  const disposition = new Map();
  const extraction = { restaurant: { id: "chipotle", name: "Chipotle" }, runAt: NOW, mode: "replay", records: [...panels, clone, ...pdf] };
  const output = await translateChipotleExtraction(extraction, disposition);
  const draft = normalize(output);
  assert.equal(disposition.get(clone.id), "duplicate_capture");
  const bowl = draft.items.find((item) => item.name === "Bowl");
  const chicken = bowl.groups.flatMap((group) => group.options).find((option) => option.label === "Chicken");
  const normal = chicken.portions.find((portion) => portion.isDefault);
  assert.ok(normal.nutrition.observations.some((observation) =>
    observation.source.extractionId && observation.source.flags.includes("passive_capture")));
  assert.ok(chicken.portions.every((portion) => portion.multiplier === undefined && portion.nutrition.derivation?.method !== "scaled"));
  const match = extractionMatchReport(extraction, collectExtractionLinks(output), draft, disposition);
  assert.ok(match.records.some((record) => record.kind === "nutrition_row" && record.status === "matched"));
  const fountain = draft.items.flatMap((item) => item.variants).find((option) =>
    option.nutrition.observations.some((observation) => observation.source.flags?.includes("needs_verification")));
  assert.ok(fountain);
  assert.deepEqual(fountain.nutrition.values, {});
  assert.deepEqual([validateDraft(draft).valid, validateDraft(draft).readyForApproval], [true, false]);
});
