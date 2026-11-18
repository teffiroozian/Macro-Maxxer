import assert from "node:assert/strict";
import { test } from "node:test";

import {
  analyzeBundle,
  analyzeHtml,
  analyzeJson,
  analyzeText,
  parseRobots,
  parseSitemap,
  pdfText,
  robotsAllows,
  toIsoDate,
} from "../scripts/discovery/analyze.ts";
import { discoverSources, urlKey } from "../scripts/discovery/discover.ts";
import { liveFetcher, replayFetcher } from "../scripts/discovery/fetchers.ts";
import { withBrowser } from "../scripts/discovery/browser.ts";
import { isBotChallenge } from "../scripts/discovery/network.ts";
import { createServer } from "node:http";
import { renderDiscoveryReport } from "../scripts/discovery/report.ts";
import { modPizzaTarget } from "../scripts/discovery/targets.ts";

const NOW = "2026-11-18T00:00:00Z";

// ── Helpers ──────────────────────────────────────────────────────────────

// In-memory fetcher: url → { status, type, body, headers }. Records calls.
function fakeFetcher(routes) {
  const calls = [];
  return {
    calls,
    mode: "live",
    async fetch(url) {
      calls.push(url);
      const route = routes[url] ?? routes[url.replace(/\/$/, "")] ?? routes[`${url}/`];
      if (route?.blocked) return { url, finalUrl: url, status: 0, headers: {}, body: Buffer.alloc(0), retrievedAt: "2026-11-17T00:00:00Z", failure: "network_blocked", failureDetail: `proxy_denied: ${route.blocked}` };
      if (!route) return { url, finalUrl: url, status: 404, headers: { "content-type": "text/html" }, body: Buffer.from("not found"), retrievedAt: "2026-11-17T00:00:00Z" };
      return {
        url,
        finalUrl: url,
        status: route.status ?? 200,
        headers: { "content-type": route.type ?? "text/html", ...(route.headers ?? {}) },
        body: Buffer.isBuffer(route.body) ? route.body : Buffer.from(route.body ?? ""),
        retrievedAt: "2026-11-17T00:00:00Z",
      };
    },
  };
}

// Smallest valid one-page PDF with the given lines of text.
function pdfWith(lines) {
  const escape = (text) => text.replace(/[\\()]/g, (char) => `\\${char}`);
  const content = lines.map((line, index) => `BT /F1 9 Tf 20 ${760 - index * 14} Td (${escape(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const NUTRITION_TABLE = [
  "Item Calories Total Fat (g) Sat Fat (g) Trans Fat (g) Cholesterol (mg) Sodium (mg) Carbohydrates (g) Fiber (g) Sugars (g) Protein (g)",
  "Grilled Chicken Bowl 540 18 5 0 120 1100 52 8 4 42",
  "Side Salad 90 5 1 0 0 140 8 3 4 2",
  "Lemonade 220 0 0 0 0 10 58 0 55 0",
];

// ── Analyzers ────────────────────────────────────────────────────────────

test("a nutrition table header counts every nutrient it names as published values", () => {
  const analysis = analyzeText(NUTRITION_TABLE.join("\n"));
  for (const nutrient of ["calories", "protein", "carbs", "totalFat", "satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"]) {
    assert.equal(analysis.nutrients[nutrient].presence, "values", nutrient);
  }
});

test("ingredient lists and marketing copy only mention nutrients", () => {
  const text =
    "Caesar Dressing: Soybean Oil, Water, Egg Yolk, Contains 2% or less of Whey Protein Concentrate, Sodium Benzoate, Sugar. " +
    "Allergen information: contains milk, egg, soy, wheat and fish. Our high-protein, low-fat bowls.";
  const analysis = analyzeText(text);
  assert.equal(analysis.nutrients.protein.presence, "mentioned");
  assert.equal(analysis.nutrients.totalFat.presence, "absent", "low-fat is not a fat label");
  assert.equal(analysis.nutrients.sodium.presence, "mentioned");
  assert.equal(analysis.menu.ingredientDeclarations, true);
  assert.equal(analysis.menu.allergens, true);
});

test("inline label/value pairs count as values; percentages do not", () => {
  const analysis = analyzeText("Calories 480. Protein: 31g. Total Fat 22 g. Carbs (g) 40. Protein 25% of daily value");
  assert.equal(analysis.nutrients.calories.presence, "values");
  assert.equal(analysis.nutrients.protein.presence, "values");
  assert.equal(analysis.nutrients.totalFat.presence, "values");
  assert.equal(analysis.nutrients.carbs.presence, "values");
  assert.equal(analyzeText("Protein 25% of daily value").nutrients.protein.presence, "mentioned");
});

test("JSON: numeric nutrient keys are values, null keys are only mentioned, and menu structure is counted", () => {
  const analysis = analyzeJson({
    categories: [
      {
        name: "Bowls",
        products: [
          {
            name: "Build Your Own",
            calories: 200,
            protein: null,
            option_groups: [{ description: "Protein", min_selections: 1, max_selections: 2, options: [{ name: "Regular", calories: 180 }, { name: "Extra", calories: 360 }] }],
            nutrients: [{ name: "Total Fat", value: "9" }],
          },
          { name: "Lemonade", calories: "220" },
        ],
      },
    ],
  });
  assert.equal(analysis.nutrients.calories.presence, "values");
  assert.equal(analysis.nutrients.protein.presence, "mentioned");
  assert.equal(analysis.nutrients.totalFat.presence, "values");
  assert.equal(analysis.nutrients.carbs.presence, "absent");
  assert.equal(analysis.menu.items, 2);
  assert.equal(analysis.menu.categories, 1);
  assert.equal(analysis.menu.optionGroups, 1);
  assert.equal(analysis.menu.selectionLimits, true);
  assert.equal(analysis.menu.portions, true);
});

test("HTML: embedded page data is analyzed and freshness is read from meta and page text", () => {
  const html = `<html><head><title>Menu</title><meta property="article:modified_time" content="2026-08-25T23:19:03+00:00">
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { menu: { products: [{ name: "Pizza", calories: 600 }] } } })}</script></head>
    <body><h3>Updated August, 2026</h3><a href="/nutrition.pdf">Nutrition PDF</a><a href="https://other.example/x">x</a></body></html>`;
  const { analysis, links } = analyzeHtml(html, "https://example.com/menu/");
  assert.equal(analysis.embedded.length, 1);
  assert.deepEqual(analysis.embedded[0].nutrientsWithValues, ["calories"]);
  assert.equal(analysis.menu.items, 1);
  assert.ok(analysis.freshness.some((evidence) => evidence.from.startsWith("meta")));
  assert.ok(analysis.freshness.some((evidence) => toIsoDate(evidence.value) === "2026-08-01"));
  assert.ok(links.some((link) => link.url === "https://example.com/nutrition.pdf"));
});

test("robots.txt rules and sitemaps are parsed", () => {
  const robots = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/nutrition\nSitemap: https://example.com/sitemap.xml\n\nUser-agent: other\nDisallow: /");
  assert.deepEqual(robots.sitemaps, ["https://example.com/sitemap.xml"]);
  assert.equal(robotsAllows(robots, "https://example.com/menu"), true);
  assert.equal(robotsAllows(robots, "https://example.com/private/x"), false);
  assert.equal(robotsAllows(robots, "https://example.com/private/nutrition"), true);
  assert.deepEqual(parseSitemap("<urlset><url><loc>https://example.com/a</loc></url></urlset>").urls, ["https://example.com/a"]);
  assert.deepEqual(parseSitemap("<sitemapindex><sitemap><loc>https://example.com/s1.xml</loc></sitemap></sitemapindex>").sitemaps, ["https://example.com/s1.xml"]);
});

test("bundles: API hosts and read-only menu paths are found; basket and auth paths are not", () => {
  const bundle = analyzeBundle('fetch("https://api.example-ordering.com/v1/x");const a="/v1/stores/{id}/menu",b="/v1/stores/{id}/baskets",c="/v2/auth/token";g("https://www.googletagmanager.com/gtag/js")');
  assert.deepEqual(bundle.apiHosts, ["https://api.example-ordering.com"]);
  assert.deepEqual(bundle.apiPaths, ["/v1/stores/{id}/menu"]);
});

test("PDF documents are read for nutrition table headers", async () => {
  const text = await pdfText(pdfWith(NUTRITION_TABLE));
  const analysis = analyzeText(text);
  assert.equal(analysis.nutrients.protein.presence, "values");
  assert.equal(analysis.nutrients.carbs.presence, "values");
});

// ── End to end on synthetic restaurants ──────────────────────────────────

test("discovery finds an official nutrition PDF on a CDN, rejects third-party sources, and reports macros ready", async () => {
  const fetcher = fakeFetcher({
    "https://grill.example/robots.txt": { type: "text/plain", body: "User-agent: *\nDisallow: /admin\nSitemap: https://grill.example/sitemap.xml" },
    "https://grill.example/sitemap.xml": { type: "application/xml", body: "<urlset><url><loc>https://grill.example/nutrition-guide</loc></url><url><loc>https://grill.example/careers</loc></url></urlset>" },
    "https://grill.example/": { body: '<a href="/menu">Menu</a><a href="/careers">Careers</a>' },
    "https://grill.example/menu": { body: '<h1>Menu</h1><a href="/nutrition-guide">Nutrition</a>' },
    "https://grill.example/nutrition-guide": {
      body: '<p>Updated October 2026</p><a href="https://cdn.assets-host.example/files/grill-nutrition.pdf">Download nutrition (PDF)</a><a href="https://fastfoodnutrition.example/grill-nutrition">Grill nutrition facts</a>',
    },
    "https://cdn.assets-host.example/files/grill-nutrition.pdf": { type: "application/pdf", body: pdfWith(NUTRITION_TABLE) },
  });
  const report = await discoverSources({ id: "grill", name: "Example Grill", officialDomains: ["grill.example"], seeds: ["https://grill.example/"], storeIds: ["1", "2"] }, fetcher, { now: NOW });

  assert.equal(report.macrosReady, true);
  assert.deepEqual(report.missingCore, []);
  const pdf = report.candidates.find((candidate) => candidate.url.endsWith("grill-nutrition.pdf"));
  assert.equal(pdf.authority, "official", "an official page's document link is official even on a CDN");
  assert.equal(pdf.channel, "official_document");
  const thirdParty = report.candidates.find((candidate) => candidate.url.includes("fastfoodnutrition"));
  assert.equal(thirdParty.outcome, "rejected_third_party");
  assert.ok(!fetcher.calls.some((url) => url.includes("fastfoodnutrition")), "third-party sources are never fetched");
  assert.ok(!fetcher.calls.some((url) => url.includes("careers")), "irrelevant pages are not crawled");
  const proposed = report.proposedSources.find((source) => source.url.endsWith(".pdf"));
  assert.equal(proposed.kind, "official_document");
  assert.ok(proposed.provides.includes("protein"));
  assert.equal(report.candidates.find((candidate) => candidate.url === "https://grill.example/nutrition-guide").sourceUpdatedAt, "2026-10-01");
});

test("a calories-only restaurant is reported with missing macros and its uninspectable leads, never filled in", async () => {
  const menu = { props: { pageProps: { menu: { categories: [{ name: "Pies", products: [{ name: "Cheese", calories: 700, option_groups: [{ description: "Size", min_selections: 1, max_selections: 1, options: [{ name: "Small", calories: 400 }] }] }] }] } } } };
  const fetcher = fakeFetcher({
    "https://pie.example/robots.txt": { type: "text/plain", body: "User-agent: *\nAllow: /" },
    "https://pie.example/nutrition": { body: "<h2>Nutrition</h2><p>Cheese Pie CALORIES (kcal) 700</p><p>Additional nutrition information is available upon request.</p>" },
    "https://order.pie.example/store/12": {
      body: `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(menu)}</script><script src="/_next/static/chunks/pages/_app-1.js"></script>`,
    },
    "https://order.pie.example/_next/static/chunks/pages/_app-1.js": { type: "application/javascript", body: 'const base="https://api.koala.io";' },
    "https://api.koala.io/v1/ordering/store-locations/12/menu?wanted-at=asap": { status: 401, type: "application/json", body: '{"error":"unauthorized"}' },
  });
  const report = await discoverSources(
    { id: "pie", name: "Pie Place", officialDomains: ["pie.example"], orderingDomains: ["order.pie.example"], seeds: ["https://order.pie.example/store/12"] },
    fetcher,
    { now: NOW },
  );

  assert.equal(report.macrosReady, false);
  assert.deepEqual(report.missingCore, ["protein", "carbs", "totalFat"]);
  assert.equal(report.coverage.find((entry) => entry.need === "calories").status, "found");
  assert.equal(report.coverage.find((entry) => entry.need === "customization").status, "found");
  assert.deepEqual(report.coverage.find((entry) => entry.need === "protein").sources, []);
  assert.deepEqual(report.storeIds, ["12"], "store ids are read from ordering URLs");
  assert.ok(report.platforms.some((hit) => hit.id === "koala"));
  const proteinGap = report.gaps.find((gap) => gap.need === "protein");
  assert.match(proteinGap.message, /never estimated/);
  assert.match(proteinGap.message, /available upon request/);
  assert.ok(proteinGap.leads.some((lead) => lead.outcome === "auth_required" && lead.url.includes("api.koala.io")));
  assert.ok(report.warnings.some((warning) => /at least two sampled locations/.test(warning)));
  assert.ok(!fetcher.calls.some((url) => /basket|login|token/.test(url)), "no basket or auth calls");
  assert.match(renderDiscoveryReport(report), /Core macros: not ready/);
});

test("a second run reports which sources changed", async () => {
  const routes = { "https://pie.example/nutrition": { body: "Calories 100" } };
  const target = { id: "pie", name: "Pie", officialDomains: ["pie.example"], storeIds: ["1", "2"] };
  const first = await discoverSources(target, fakeFetcher(routes), { now: NOW });
  routes["https://pie.example/nutrition"] = { body: "Calories 120" };
  const second = await discoverSources(target, fakeFetcher(routes), { now: NOW, previous: first });
  assert.deepEqual(second.changes.changed, [urlKey("https://pie.example/nutrition")]);
});

// ── MOD Pizza pilot (replays the Oct 2026 research evidence) ─────────────

test("MOD Pizza replay: catalog and calories found; protein/carbs/fat unverified because a replay cannot check every lead", async () => {
  const report = await discoverSources(modPizzaTarget, await replayFetcher(modPizzaTarget.replay), { now: NOW });

  assert.equal(report.mode, "replay");
  assert.equal(report.macrosReady, false);
  assert.deepEqual(report.missingCore, [], "a replay never proves a nutrient missing");
  for (const nutrient of ["protein", "carbs", "totalFat"]) assert.equal(report.coverage.find((entry) => entry.need === nutrient).status, "unverified");
  assert.ok(report.gaps.find((gap) => gap.need === "protein").leads.some((lead) => lead.outcome === "not_captured" && lead.url.includes("wp/v2/media")));
  assert.deepEqual(report.levels.map((entry) => entry.level), [1, 2, 3]);
  const found = (need) => report.coverage.find((entry) => entry.need === need);
  assert.deepEqual(found("calories").sources.sort(), ["https://modpizza.com/nutrition", "https://orders.modpizza.com/store/4080", "https://orders.modpizza.com/store/4168"]);
  assert.equal(found("catalog").status, "found");
  assert.equal(found("customization").status, "found");
  assert.equal(found("ingredients").status, "needs_verification", "the Oct capture of the allergen page is dated more than 90 days before NOW");

  const ordering = report.candidates.find((candidate) => candidate.url === "https://orders.modpizza.com/store/4080");
  assert.equal(ordering.channel, "embedded_json");
  assert.equal(ordering.authority, "ordering_system");
  assert.equal(ordering.analysis.menu.items, 45, "the sampled Hamburg store returns 45 products");
  assert.equal(report.candidates.find((candidate) => candidate.url === "https://orders.modpizza.com/store/4168").analysis.menu.items, 41);
  assert.equal(report.candidates.find((candidate) => candidate.url === "https://modpizza.com/nutrition").sourceUpdatedAt, "2026-08-25");

  assert.deepEqual(report.platforms.map((hit) => hit.id).sort(), ["koala", "nextjs", "wordpress"]);
  const api = report.candidates.find((candidate) => candidate.url.startsWith("https://api.koala.io/v1/ordering/store-locations/4080/menu"));
  assert.equal(api.outcome, "auth_required");
  assert.ok(report.candidates.some((candidate) => candidate.url === "https://modpizza.com/wp-json/wp/v2/pages/762" && candidate.outcome === "inspected"), "WordPress JSON found from the Link header");
  assert.ok(!report.candidates.some((candidate) => candidate.url.startsWith("https://orders.modpizza.com/wp-json")), "WordPress probes go to the WordPress origin only");
  assert.ok(report.gaps.find((gap) => gap.need === "protein").leads.some((lead) => lead.outcome === "auth_required"));
  assert.ok(report.warnings.some((warning) => warning.startsWith("Replay mode")));
});

test("official data older than 90 days triggers verification: kept as evidence, neither approved nor discarded", async () => {
  const fetcher = fakeFetcher({
    "https://pie.example/nutrition": { body: '<meta property="article:modified_time" content="2026-08-25T00:00:00+00:00"><p>Cheese Pie CALORIES (kcal) 700</p><a href="/old-nutrition">Old</a>' },
    "https://pie.example/old-nutrition": { body: `<meta property="article:modified_time" content="2023-07-31T00:00:00+00:00">${NUTRITION_TABLE.join("\n")}` },
  });
  const report = await discoverSources({ id: "pie", name: "Pie", officialDomains: ["pie.example"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.equal(report.macrosReady, false, "never approved automatically");
  assert.deepEqual(report.missingCore, [], "never discarded as missing");
  assert.deepEqual(report.verifyCore, ["protein", "carbs", "totalFat"]);
  const protein = report.coverage.find((entry) => entry.need === "protein");
  assert.equal(protein.status, "needs_verification");
  assert.deepEqual(protein.verificationSources, ["https://pie.example/old-nutrition"]);
  // Calories: the newer page is current, so it is found; the old page is a comparison candidate.
  assert.equal(report.coverage.find((entry) => entry.need === "calories").status, "found");
  const old = report.proposedSources.find((source) => source.url.endsWith("old-nutrition"));
  assert.equal(old.verificationRequired, true);
  assert.deepEqual(old.compareWith, ["https://pie.example/nutrition"]);
  assert.ok(old.provides.includes("protein"), "its nutrients stay listed as evidence");
  assert.match(report.gaps.find((gap) => gap.need === "protein").message, /kept for comparison; verify/);
  assert.match(renderDiscoveryReport(report), /needs verification/);
});

test("a nutrition page that renders in the browser becomes a lead naming its API host", async () => {
  const fetcher = fakeFetcher({
    "https://taco.example/nutrition-calculator": { body: '<div id="app"></div><script src="https://cdn.taco.example/js/app.js"></script>' },
    "https://cdn.taco.example/js/app.js": { type: "application/javascript", body: 'const api="https://services.taco.example/menu/v1/restaurants";' },
  });
  const report = await discoverSources({ id: "taco", name: "Taco", officialDomains: ["taco.example"], seeds: ["https://taco.example/nutrition-calculator"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  const lead = report.gaps.find((gap) => gap.need === "protein").leads.find((entry) => entry.outcome === "client_rendered");
  assert.ok(lead, "client-rendered nutrition page is a lead");
  assert.match(lead.reason, /services\.taco\.example/);
  assert.ok(!fetcher.calls.some((url) => url.includes("services.taco.example")), "the API itself is not probed");
  assert.match(lead.reason, /--browser/);
});

// ── Network, levels, escalation, browser ─────────────────────────────────

test("anti-bot challenge pages are recognized, ordinary errors are not", () => {
  assert.equal(isBotChallenge(403, {}, "<title>Just a moment...</title>"), true);
  assert.equal(isBotChallenge(200, { "cf-mitigated": "challenge" }, ""), true);
  assert.equal(isBotChallenge(404, {}, "Just a moment"), false);
  assert.equal(isBotChallenge(403, {}, "Forbidden"), false);
});

test("live fetcher: a request the network refuses is network_blocked with the diagnosis, not a site failure", async () => {
  const fetcher = liveFetcher({ delayMs: 0, timeoutMs: 2000, diagnose: async (host) => ({ host, status: "proxy_denied", viaProxy: true, detail: "egress proxy answered 403", fix: "Add it to the allowlist." }) });
  const result = await fetcher.fetch("http://127.0.0.1:9/nutrition");
  assert.equal(result.status, 0);
  assert.equal(result.failure, "network_blocked");
  assert.match(result.failureDetail, /proxy_denied: egress proxy answered 403\. Add it to the allowlist/);
});

test("missing data next to network-blocked leads is unverified, not missing", async () => {
  const fetcher = fakeFetcher({
    "https://pie.example/menu": { body: '<p>Cheese Pie CALORIES (kcal) 700</p><a href="/nutrition-guide.pdf">Nutrition PDF</a>' },
    "https://pie.example/nutrition-guide.pdf": { blocked: "egress proxy answered 403" },
  });
  const report = await discoverSources({ id: "pie", name: "Pie", officialDomains: ["pie.example"], seeds: ["https://pie.example/menu"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.equal(report.coverage.find((entry) => entry.need === "protein").status, "unverified");
  assert.deepEqual(report.missingCore, []);
  const lead = report.gaps.find((gap) => gap.need === "protein").leads.find((entry) => entry.outcome === "network_blocked");
  assert.match(lead.reason, /network refused/);
  assert.ok(report.warnings.some((warning) => /refused by the network/.test(warning)));
});

test("three levels: deeper investigation finds sitemap and FAQ pages, then a request is drafted and never sent", async () => {
  const fetcher = fakeFetcher({
    "https://pie.example/robots.txt": { type: "text/plain", body: "Sitemap: https://pie.example/sitemap.xml" },
    "https://pie.example/sitemap.xml": { type: "application/xml", body: "<urlset><url><loc>https://pie.example/menu/ingredients</loc></url><url><loc>https://pie.example/contact-us</loc></url></urlset>" },
    "https://pie.example/nutrition": { body: "<p>Cheese Pie CALORIES (kcal) 700</p><p>Additional nutrition information is available upon request.</p>" },
    "https://pie.example/faq": { body: '<p>Questions? Email <a href="mailto:Guest@Pie.example">us</a>.</p>' },
    "https://pie.example/menu/ingredients": { body: "<p>Ingredients: flour, water</p>" },
    "https://pie.example/contact-us": { body: "<form></form>" },
  });
  const report = await discoverSources({ id: "pie", name: "Pie Place", officialDomains: ["pie.example"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.deepEqual(report.levels.map((entry) => entry.level), [1, 2, 3]);
  assert.ok(!fetcher.calls.includes("https://pie.example/faq") || report.candidates.find((c) => c.url === "https://pie.example/faq").level === 2, "FAQ is a Level 2 path");
  assert.equal(report.candidates.find((c) => c.url === "https://pie.example/menu/ingredients").level, 2, "weak sitemap URLs wait for Level 2");
  assert.deepEqual(report.missingCore, ["protein", "carbs", "totalFat"]);
  const request = report.informationRequest;
  assert.equal(request.status, "draft_not_sent");
  assert.deepEqual(request.missing, ["protein", "carbs", "totalFat"]);
  assert.deepEqual(request.contacts, ["https://pie.example/contact-us", "mailto:guest@pie.example"]);
  assert.match(request.markdown, /DRAFT, NOT SENT/);
  assert.match(request.markdown, /available upon request/);
  assert.ok(!fetcher.calls.some((url) => url.startsWith("mailto:")), "nothing is sent");
});

test("a restaurant with every core macro from a current source stops at Level 1", async () => {
  const fetcher = fakeFetcher({ "https://grill.example/nutrition": { body: `<p>Updated October 2026</p>${NUTRITION_TABLE.join("\n")}` } });
  const report = await discoverSources({ id: "grill", name: "Grill", officialDomains: ["grill.example"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.equal(report.macrosReady, true);
  assert.deepEqual(report.levels.map((entry) => entry.level), [1]);
  assert.equal(report.informationRequest, undefined);
  assert.ok(!fetcher.calls.includes("https://grill.example/faq"));
});

test("Level 2 renders a client-rendered nutrition page and reads the JSON it loads from an official host", async () => {
  const base = fakeFetcher({ "https://taco.example/nutrition-calculator": { body: '<div id="app"></div>' } });
  const json = { items: [{ name: "Chicken Bowl", calories: 540, protein: 42, carbohydrates: 52, totalFat: 18 }] };
  const fetcher = {
    ...base,
    async render(url) {
      return {
        page: { url, finalUrl: url, status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<div>Chicken Bowl</div>"), retrievedAt: NOW },
        responses: [
          { url: "https://services.taco.example/menu", finalUrl: "https://services.taco.example/menu", status: 200, headers: { "content-type": "application/json" }, body: Buffer.from(JSON.stringify(json)), retrievedAt: NOW },
          { url: "https://tracker.example/collect", finalUrl: "https://tracker.example/collect", status: 200, headers: { "content-type": "application/json" }, body: Buffer.from('{"protein":1}'), retrievedAt: NOW },
        ],
      };
    },
  };
  const report = await discoverSources({ id: "taco", name: "Taco", officialDomains: ["taco.example"], seeds: ["https://taco.example/nutrition-calculator"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.equal(report.macrosReady, true);
  const api = report.candidates.find((c) => c.url === "https://services.taco.example/menu");
  assert.equal(api.level, 2);
  assert.match(api.discoveredBy, /^browser:/);
  assert.ok(!report.candidates.some((c) => c.url.includes("tracker.example")), "third-party JSON is ignored");
  assert.ok(report.candidates.some((c) => c.channel === "browser_rendered"));
});

test("Level 2 follows a site-relative nutrition PDF path from JSON the rendered page loaded (CMS pattern, as on chipotle.com)", async () => {
  const base = fakeFetcher({
    "https://taco.example/nutrition-calculator": { body: '<div id="app"></div>' },
    "https://taco.example/content/dam/menu/nutrition/Nutrition-Facts-3-2025.pdf": { type: "application/pdf", body: pdfWith(NUTRITION_TABLE), headers: { "last-modified": "Wed, 05 Mar 2025 17:52:11 GMT" } },
  });
  const cms = { data: { nutritionFactsList: { items: [{ nutritionFactsSheetReference: { _path: "/content/dam/menu/nutrition/Nutrition-Facts-3-2025.pdf" } }] } } };
  const fetcher = {
    ...base,
    async render(url) {
      return {
        page: { url, finalUrl: url, status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<div>Calculator</div>"), retrievedAt: NOW },
        responses: [{ url: "https://taco.example/graphql/execute.json/nutrition-facts", finalUrl: "https://taco.example/graphql/execute.json/nutrition-facts", status: 200, headers: { "content-type": "application/json" }, body: Buffer.from(JSON.stringify(cms)), retrievedAt: NOW }],
      };
    },
  };
  const report = await discoverSources({ id: "taco", name: "Taco", officialDomains: ["taco.example"], seeds: ["https://taco.example/nutrition-calculator"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  const pdf = report.candidates.find((c) => c.url.endsWith("Nutrition-Facts-3-2025.pdf"));
  assert.equal(pdf?.outcome, "inspected");
  assert.equal(report.coverage.find((e) => e.need === "protein").status, "needs_verification", "a March 2025 PDF is valid evidence that needs verification");
});

test("browser fetcher: renders a JavaScript page and captures the JSON it requests (headless Chromium)", async (t) => {
  const server = createServer((request, response) => {
    if (request.url === "/api/menu") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ items: [{ name: "Bowl", calories: 500, protein: 30 }] }));
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<div id="app">loading</div><script>fetch("/api/menu").then(r=>r.json()).then(d=>{document.getElementById("app").textContent=d.items[0].name+" Calories "+d.items[0].calories})</script>');
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const passthrough = { mode: "live", async fetch(url) { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { url, finalUrl: url, status: r.status, headers: {}, body: Buffer.from(await r.arrayBuffer()), retrievedAt: NOW }; } };
  const savedProxy = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"].map((name) => [name, process.env[name]]);
  for (const [name] of savedProxy) delete process.env[name];
  const browser = withBrowser(passthrough, { timeoutMs: 20_000 });
  try {
    const { page, responses } = await browser.render(`${origin}/nutrition`);
    if (page.failure === "network_blocked" && /Playwright is not installed/.test(page.failureDetail)) {
      t.skip("Playwright not available here");
      return;
    }
    assert.equal(page.status, 200, page.failureDetail);
    assert.match(page.body.toString(), /Bowl Calories 500/);
    assert.equal(responses.length, 1);
    assert.equal(JSON.parse(responses[0].body.toString()).items[0].protein, 30);
  } finally {
    await browser.close();
    for (const [name, value] of savedProxy) if (value !== undefined) process.env[name] = value;
    server.close();
  }
});

test("live fetcher: a third-party domain that no longer resolves is a dead link, not a network block", async () => {
  const fetcher = liveFetcher({ delayMs: 0, timeoutMs: 2000, diagnose: async (host) => ({ host, status: "dns_failure", viaProxy: false, detail: "ENOTFOUND" }) });
  const result = await fetcher.fetch("http://127.0.0.1:9/fs1-en.pdf");
  assert.equal(result.failure, "network_error");
  assert.match(result.failureDetail, /dead link/);
});

test("an off-site PDF on another organization's domain stays third-party; one on a CDN is official", async () => {
  const fetcher = fakeFetcher({
    "https://pie.example/our-ingredients": { body: '<a href="https://www.welfare-charity.example/media/report.pdf">Animal welfare report</a><a href="https://d1abc.cloudfront.net/pie/nutrition.pdf">Nutrition PDF</a>' },
    "https://d1abc.cloudfront.net/pie/nutrition.pdf": { type: "application/pdf", body: pdfWith(NUTRITION_TABLE) },
  });
  const report = await discoverSources({ id: "pie", name: "Pie", officialDomains: ["pie.example"], seeds: ["https://pie.example/our-ingredients"], storeIds: ["1", "2"] }, fetcher, { now: NOW });
  assert.ok(!fetcher.calls.some((url) => url.includes("welfare-charity")), "another organization's document is not fetched");
  assert.equal(report.candidates.find((c) => c.url.includes("cloudfront")).authority, "official");
});

test("browser fetcher: keeps a page whose network never goes idle", async (t) => {
  const server = createServer((request, response) => {
    if (request.url === "/poll") {
      setTimeout(() => { response.writeHead(200, { "content-type": "application/json" }); response.end("{}"); }, 400);
      return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<div id="app">Bowl Calories 500</div><script>setInterval(()=>fetch("/poll"),200)</script>');
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const passthrough = { mode: "live", async fetch(url) { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { url, finalUrl: url, status: r.status, headers: {}, body: Buffer.from(await r.arrayBuffer()), retrievedAt: NOW }; } };
  const saved = ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"].map((name) => [name, process.env[name]]);
  for (const [name] of saved) delete process.env[name];
  const browser = withBrowser(passthrough, { timeoutMs: 10_000, settleMs: 1_000 });
  try {
    const { page } = await browser.render(`${origin}/nutrition`);
    if (page.failure === "network_blocked" && /Playwright is not installed/.test(page.failureDetail)) {
      t.skip("Playwright not available here");
      return;
    }
    assert.equal(page.status, 200, page.failureDetail);
    assert.match(page.body.toString(), /Bowl Calories 500/);
  } finally {
    await browser.close();
    for (const [name, value] of saved) if (value !== undefined) process.env[name] = value;
    server.close();
  }
});
