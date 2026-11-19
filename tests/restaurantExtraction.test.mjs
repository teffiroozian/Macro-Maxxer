import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";

import { extractCsv, extractPdfTables, readPdf } from "../scripts/extraction/extractors/document.ts";
import { extractHtmlNutrition } from "../scripts/extraction/extractors/html.ts";
import { embeddedPayloads, extractJsonMenu } from "../scripts/extraction/extractors/json-menu.ts";
import { extractFromDiscovery } from "../scripts/extraction/extract.ts";
import { nutritionFromCells } from "../scripts/extraction/nutrients.ts";
import { renderExtractionReport } from "../scripts/extraction/report.ts";
import { replayFetcher } from "../scripts/discovery/fetchers.ts";
import { modPizzaTarget } from "../scripts/discovery/targets.ts";
import { parseNutritionHtml, parseOrderingHtml } from "../scripts/pipeline/adapters/mod-pizza.ts";

const PROV = { sourceId: "test:source", url: "https://example.test/x", method: "official_html", retrievedAt: "2026-11-18T00:00:00Z" };
const NOW = "2026-11-19T00:00:00Z";

// ── Values ───────────────────────────────────────────────────────────────

test("printed values are kept only when clean; anything else keeps its raw text", () => {
  const nutrition = nutritionFromCells({ calories: "320", protein: "< 1", carbs: "10w", totalFat: "", sodium: "1,200 mg", sugars: "320-640" });
  assert.deepEqual(nutrition.values, { calories: 320, sodium: 1200 });
  assert.equal(nutrition.raw.protein, "< 1");
  assert.equal(nutrition.raw.totalFat, undefined, "an empty cell is not printed, never zero");
  assert.deepEqual(nutrition.unclean.map((entry) => [entry.nutrient, entry.raw, entry.parsed]), [["protein", "< 1", undefined], ["carbs", "10w", 10]]);
  assert.deepEqual(nutrition.ranges, { sugars: [320, 640] });
  assert.deepEqual(nutrition.missingCore, ["protein", "carbs", "totalFat"]);
});

// ── Official documents ───────────────────────────────────────────────────

test("generic PDF table extraction reproduces Chipotle's bespoke PDF parser, row for row", async () => {
  const pages = await readPdf(await readFile("data/restaurants/chipotle/raw/nutrition-paper-menu.pdf"));
  const records = extractPdfTables(pages, { ...PROV, method: "official_document" });
  const reference = JSON.parse(await readFile("data/restaurants/chipotle/raw/nutrition.json", "utf8")).records;
  assert.equal(records.length, reference.length);
  const fields = { calories: "calories", protein: "protein", carbs: "carbohydrates", totalFat: "totalFat", satFat: "saturatedFat", transFat: "transFat", cholesterol: "cholesterol", sodium: "sodium", fiber: "dietaryFiber", sugars: "sugar" };
  records.forEach((record, index) => {
    const row = reference[index];
    assert.equal(record.name, row.name);
    assert.equal(record.servingText, row.portion.raw);
    for (const [nutrient, field] of Object.entries(fields)) {
      const expected = row[field]?.clean ? (row[field].value ?? undefined) : undefined;
      assert.equal(record.nutrition.values[nutrient], expected, `${row.name} ${nutrient}`);
      assert.equal(record.nutrition.raw[nutrient], row[field]?.raw, `${row.name} ${nutrient} raw`);
    }
    assert.equal(record.flags.includes("name_carried_forward"), Boolean(row.continuedFromPreviousRow), row.name);
  });
  assert.ok(records.some((record) => record.category === "kids Menu"), "section headings become categories");
});

test("CSV nutrition tables", () => {
  const csv = 'Item,Category,Serving Size,Calories,Total Fat (g),Carbohydrates (g),Protein (g)\n"Cheese Pizza, slice",Pizza,1 slice,290,11,35,12\nSoda,Drinks,16 oz,200,,54,—\n';
  const records = extractCsv(csv, { ...PROV, method: "official_document" });
  assert.equal(records.length, 2);
  assert.deepEqual(records[0].nutrition.values, { calories: 290, totalFat: 11, carbs: 35, protein: 12 });
  assert.equal(records[0].name, "Cheese Pizza, slice");
  assert.equal(records[1].nutrition.values.totalFat, undefined);
  assert.equal(records[1].nutrition.raw.protein, "—");
  assert.ok(records[1].flags.includes("unclean_value"));
});

// ── JSON ─────────────────────────────────────────────────────────────────

test("menu JSON: MOD ordering data gives the same 45 products as the MOD adapter, with groups and portions", async () => {
  const html = gunzipSync(await readFile("docs/research/mod-pizza/evidence/ordering.html.gz")).toString("utf8");
  const products = parseOrderingHtml(html).flatMap((category) => category.products);
  const [payload] = embeddedPayloads(html);
  const records = extractJsonMenu(payload.json, { ...PROV, method: "embedded_json" });
  const items = records.filter((record) => record.kind === "menu_item");
  assert.deepEqual(items.map((record) => record.name), products.map((product) => product.name.replace(/\s+/g, " ").trim()));
  for (const [index, product] of products.entries()) assert.equal(items[index].nutrition?.values.calories, product.calories ?? undefined, product.name);
  const groups = records.filter((record) => record.kind === "option_group");
  assert.ok(groups.length > 100);
  assert.ok(groups.every((group) => group.customization && "minSelections" in group.customization && "maxSelections" in group.customization));
  const portions = records.filter((record) => record.kind === "portion");
  assert.ok(portions.length > 0 && portions.every((portion) => /^(light|regular|extra|easy|no|side|double|half)/i.test(portion.name)));
  assert.ok(records.every((record) => record.provenance.locator && record.provenance.sourceId === "test:source"));
  assert.ok(records.every((record) => record.nutrition === undefined || record.nutrition.values.protein === undefined), "MOD ordering data has no protein");
});

test("menu JSON: payload-defined nutrient keys and item dictionaries (Chipotle menu metadata)", async () => {
  const json = JSON.parse(await readFile("data/restaurants/chipotle/raw/menu-metadata-nutrition.json", "utf8"));
  const records = extractJsonMenu(json, { ...PROV, method: "api_json" });
  const chicken = records.find((record) => record.name === "CMG-1");
  assert.ok(chicken.flags.includes("name_from_key"));
  assert.deepEqual(chicken.nutrition.values, { calories: 180, protein: 32, carbs: 0, totalFat: 7, satFat: 3, transFat: 0, sodium: 310, fiber: 0, sugars: 0 });
  assert.equal(chicken.servingText, "4 oz");
  assert.ok(records.filter((record) => record.nutrition?.values.protein !== undefined).length >= 300);
});

// ── HTML ─────────────────────────────────────────────────────────────────

test("HTML: MOD's responsive nutrition grid matches the MOD adapter's parser, with allergen marks", async () => {
  const html = await readFile("docs/research/mod-pizza/evidence/nutrition.html", "utf8");
  const reference = parseNutritionHtml(html);
  const { records, extractors } = extractHtmlNutrition(html, PROV);
  assert.deepEqual(extractors, ["html-repeated-rows"]);
  assert.equal(records.length, reference.length);
  reference.forEach((row, index) => {
    assert.ok(records[index].name.startsWith(row.name), row.name);
    assert.equal(records[index].category, row.category);
    assert.equal(records[index].nutrition.raw.calories, row.caloriesText);
  });
  assert.deepEqual(records[0].allergens, ["milk", "wheat_gluten"]);
});

test("HTML: MOD's allergen page gives ingredient statements and allergen marks", async () => {
  const html = await readFile("docs/research/mod-pizza/evidence/allergen.html", "utf8");
  const { records } = extractHtmlNutrition(html, PROV);
  const declarations = records.filter((record) => record.kind === "ingredient_declaration");
  assert.equal(declarations.length, 91);
  const crust = declarations[0];
  assert.equal(crust.name, "small (thin 6-inch)");
  assert.equal(crust.category, "Crust");
  assert.deepEqual(crust.allergens, ["wheat_gluten"]);
  assert.match(crust.ingredientsText, /^Unbleached Enriched Wheat Flour/);
});

test("HTML tables, and an unquoted stray attribute does not break parsing", () => {
  const html = `<h2>Pizza</h2><div class="x tabindex=" 0"><table><tr><th>Item</th><th>Calories</th><th>Protein (g)</th><th>Total Carbohydrates (g)</th><th>Total Fat (g)</th></tr>
    <tr><td>Cheese</td><td>290</td><td>12</td><td>35</td><td>11</td></tr><tr><td>Veggie</td><td>250</td><td>&lt;1</td><td>30</td><td></td></tr></table></div>`;
  const { records } = extractHtmlNutrition(html, PROV);
  assert.equal(records.length, 2);
  assert.deepEqual(records[0].nutrition.values, { calories: 290, protein: 12, carbs: 35, totalFat: 11 });
  assert.equal(records[0].category, "Pizza");
  assert.equal(records[1].nutrition.values.totalFat, undefined);
  assert.equal(records[1].nutrition.raw.protein, "<1");
});

// ── Orchestration ────────────────────────────────────────────────────────

function fakeFetcher(routes) {
  return {
    mode: "live",
    async fetch(url) {
      const route = routes[url];
      if (!route) return { url, finalUrl: url, status: 404, headers: {}, body: Buffer.alloc(0), retrievedAt: NOW };
      return { url, finalUrl: url, status: route.status ?? 200, headers: { "content-type": route.type ?? "text/html" }, body: Buffer.from(route.body), retrievedAt: NOW };
    },
  };
}

function discovery(overrides = {}) {
  return {
    version: 1,
    restaurant: { id: "pie", name: "Pie Place" },
    mode: "live",
    runAt: NOW,
    budget: { maxRequests: 60, maxDepth: 2, maxBundlesPerHost: 8, maxSitemapUrls: 2000, requestsUsed: 5 },
    freshnessDays: 90,
    storeIds: [],
    platforms: [],
    candidates: [],
    coverage: [],
    gaps: [],
    macrosReady: false,
    verifyCore: [],
    levels: [],
    missingCore: [],
    proposedSources: [],
    warnings: [],
    ...overrides,
  };
}

test("a stale official source is extracted but every record is flagged needs_verification, never approved", async () => {
  const table = `<table><tr><th>Item</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fat</th></tr><tr><td>Cheese</td><td>290</td><td>12</td><td>35</td><td>11</td></tr></table>`;
  const report = await extractFromDiscovery(
    discovery({
      proposedSources: [
        { id: "pie:current", kind: "official_html", authority: "official", url: "https://pie.test/nutrition", retrievedAt: NOW, sourceUpdatedAt: "2026-10-01", provides: ["calories"], stale: false },
        { id: "pie:fresh-2023", kind: "official_html", authority: "official", url: "https://pie.test/fresh-nutrition", retrievedAt: NOW, sourceUpdatedAt: "2023-07-31", provides: ["calories", "protein", "carbs", "totalFat"], stale: true, verificationRequired: true },
      ],
      candidates: [{ url: "https://api.pie.test/menu", channel: "api_json", authority: "ordering_system", outcome: "auth_required", depth: 1, discoveredBy: "platform:x", relevance: 5, notes: [] }],
      coverage: [{ need: "protein", status: "needs_verification", sources: [], verificationSources: ["https://pie.test/fresh-nutrition"] }],
    }),
    fakeFetcher({
      "https://pie.test/nutrition": { body: `<table><tr><th>Item</th><th>Calories</th><th>Sodium</th><th>Sugars</th></tr><tr><td>Cheese</td><td>290</td><td>500</td><td>3</td></tr></table>` },
      "https://pie.test/fresh-nutrition": { body: table },
    }),
    { runAt: NOW },
  );
  const stale = report.sources.find((source) => source.source.id === "pie:fresh-2023");
  assert.equal(stale.freshness, "needs_verification");
  assert.ok(stale.verificationRequired);
  assert.ok(stale.records.length > 0 && stale.records.every((record) => record.flags.includes("needs_verification")));
  assert.equal(report.coverage.find((entry) => entry.need === "protein").status, "needs_verification");
  assert.equal(report.coverage.find((entry) => entry.need === "calories").status, "extracted");
  assert.ok(report.limitations.some((line) => /protein, carbs, totalFat come only from sources older than 90 days/.test(line)));
  assert.deepEqual(report.skipped, [{ url: "https://api.pie.test/menu", reason: "Requires login or a key. Not worked around." }]);
  assert.match(renderExtractionReport(report), /needs verification/);
});

test("blocked, login-gated and unparsed sources produce no records and say why", async () => {
  const report = await extractFromDiscovery(
    discovery({
      proposedSources: [
        { id: "pie:a", kind: "public_api", authority: "official", url: "https://pie.test/api", retrievedAt: NOW, provides: [], stale: false },
        { id: "pie:b", kind: "official_document", authority: "official", url: "https://pie.test/n.xlsx", retrievedAt: NOW, provides: [], stale: false },
      ],
      candidates: [{ url: "https://pie.test/calculator", channel: "official_html", authority: "official", outcome: "client_rendered", depth: 1, discoveredBy: "seed", relevance: 6, notes: [] }],
    }),
    fakeFetcher({ "https://pie.test/api": { status: 401, body: "" }, "https://pie.test/n.xlsx": { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: "PK" } }),
    { runAt: NOW },
  );
  assert.deepEqual(report.sources.map((source) => [source.source.id, source.status, source.records.length]), [["pie:a", "auth_required", 0], ["pie:b", "unsupported", 0]]);
  assert.ok(report.skipped.some((entry) => entry.url === "https://pie.test/calculator" && /--browser/.test(entry.reason)));
  assert.equal(report.coverage.find((entry) => entry.need === "protein").status, "unavailable");
});

test("browser rendering: JSON the page loaded is extracted with its own provenance", async () => {
  const fetcher = {
    ...fakeFetcher({}),
    async render(url) {
      return {
        page: { url, finalUrl: url, status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<div id=app></div>"), retrievedAt: NOW },
        responses: [
          { url: "https://pie.test/api/nutrition", finalUrl: "https://pie.test/api/nutrition", status: 200, headers: { "content-type": "application/json" }, retrievedAt: NOW, body: Buffer.from(JSON.stringify({ items: [{ id: "p1", name: "Cheese", nutrition: { calories: 290, protein: 12 } }, { id: "p2", name: "Veggie", nutrition: { calories: 250 } }] })) },
        ],
      };
    },
  };
  const report = await extractFromDiscovery(
    discovery({ candidates: [{ url: "https://pie.test/calculator", channel: "official_html", authority: "official", outcome: "client_rendered", depth: 1, discoveredBy: "seed", relevance: 6, notes: [] }] }),
    fetcher,
    { runAt: NOW },
  );
  const [source] = report.sources;
  assert.equal(source.method, "browser_rendered");
  assert.equal(source.records.length, 2);
  assert.equal(source.records[0].provenance.url, "https://pie.test/api/nutrition");
  assert.equal(source.records[0].provenance.sourceRecordId, "p1");
  assert.equal(source.records[1].nutrition.values.protein, undefined);
  assert.deepEqual(source.records[1].nutrition.missingCore, ["protein", "carbs", "totalFat"]);
});

test("MOD pilot (replay): extraction from the Step 1 discovery report", async () => {
  const report = await extractFromDiscovery(JSON.parse(await readFile("tests/fixtures/extraction/mod-discovery-replay.json", "utf8")), await replayFetcher(modPizzaTarget.replay), { runAt: NOW });
  const byUrl = Object.fromEntries(report.sources.map((source) => [source.source.url, source]));
  assert.equal(byUrl["https://orders.modpizza.com/store/4080"].counts.menu_item, 45);
  assert.equal(byUrl["https://orders.modpizza.com/store/4168"].counts.menu_item, 41);
  assert.equal(byUrl["https://modpizza.com/nutrition"].counts.nutrition_row, 109);
  assert.equal(byUrl["https://modpizza.com/allergen"].counts.ingredient_declaration, 91);
  assert.equal(byUrl["https://modpizza.com/allergen"].freshness, "needs_verification");
  for (const nutrient of ["protein", "carbs", "totalFat"]) assert.equal(report.coverage.find((entry) => entry.need === nutrient).status, "unavailable");
  assert.ok(report.sources.every((source) => source.records.every((record) => record.provenance.url && record.provenance.retrievedAt && record.provenance.sha256)));
  assert.ok(report.limitations.some((line) => /Replay run/.test(line)));
});
