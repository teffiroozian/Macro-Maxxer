# Phase 2 · Build automated source discovery

Master task: **Phase 2 → "Build automated source discovery"** in [`docs/restaurant-import-roadmap.md`](../restaurant-import-roadmap.md). The master list is unchanged. The steps below are mini-phases under that one task. The master task is not checked off; that needs Tef's approval.

## What it does

`npm run discover -- <target>` finds a restaurant's public sources and reports, for each one, what it actually publishes. It is restaurant-independent. A new restaurant needs only its domains:

```bash
# A known target (scripts/discovery/targets.ts). MOD replays saved evidence by default.
npm run discover -- mod
npm run discover -- mod --live --record      # fetch live, save every response as replayable evidence

# Any restaurant, no code
npm run discover -- --id pie --name "Pie Place" --domain pie.example \
  --ordering-domain order.pie.example --store 12 --store 31
```

Output: `data/restaurants/staging/<id>/discovery.json` and `discovery.md`. Nothing in the live restaurant index or menus is touched.

Steps, in order:

1. **Site index.** Reads `robots.txt` (honored in live mode), sitemaps, and a few well-known paths (`/nutrition`, `/allergens`, `/menu`, …).
2. **Relevance-ordered crawl** of official and ordering-system pages: nutrition first, then allergen, menu, ordering. There is a request budget (default 60) and a depth limit (2). Careers, cart, and login pages are skipped.
3. **Content analysis** of every response:
   - Nutrients. A nutrient counts as *values* only when numbers sit next to its label, under a nutrition-table header, or under a nutrient key in JSON. Ingredient lists ("Whey Protein Concentrate") and marketing copy ("low-fat") count only as *mentioned*.
   - Catalog size, option groups, selection limits, portions, allergens, ingredient declarations.
   - Embedded page data (`__NEXT_DATA__`, JSON-LD, `application/json` scripts).
   - "Last updated" evidence from headers, meta tags, JSON-LD, WordPress `modified_gmt`, and page text.
   - PDFs (pdfjs) and CSVs. Spreadsheets are flagged for review by hand.
   - Statements a reviewer must see, such as "additional nutrition available upon request" or serving-basis caveats.
4. **Official documents.** A PDF or CSV that an official page links to stays official even when a CDN serves it.
5. **Platform fingerprints** (`scripts/discovery/platforms.ts`) from pages and JS bundles: Koala, Olo, WordPress, Next.js, Nutritionix, Toast, Square, ChowNow. Discovery then makes one anonymous GET to each known read-only endpoint, for up to three sampled stores. Store ids are read from ordering URLs. A 401/403 is recorded as `auth_required`. There is no workaround, no credentials, and no basket calls.
6. **Coverage and gaps.** For each data need (each nutrient, catalog, customization, portions, allergens, ingredients) the report gives the usable sources or says **missing**. Each gap lists the leads that could still hold the data but could not be inspected (auth required, not captured, unparsed, over budget).
7. **Proposed `SourceDescriptor`s** for the adapter, with kind, authority, retrieved date, source-updated date, sha256, and stale flag.
8. **Change diff** against the previous run (by URL and sha256). This is the hook for the weekly freshness check in standards §9.

## How the standards apply

| Standard | In discovery |
|---|---|
| §1 Missing macros are never made up | Coverage is "found" only from numeric values in usable sources. Gaps say "never estimated". |
| §2.1 Provenance | Every candidate has its URL, authority, retrieval time, sha256, and how it was found. `--record` keeps the raw responses. |
| §2.2 No third-party core macros | Third-party nutrition links are listed as `rejected_third_party` and never fetched. |
| §2.3 Freshness ≤ 90 days | A target may set a shorter window, never a longer one. Stale sources are flagged. |
| §7 At least two sampled locations | Warns when fewer than two store ids are known. |

## Mini-phases

| # | Mini-phase | Status |
|---|---|---|
| 2.1a | Discovery contracts (`scripts/discovery/contracts.ts`) | Done |
| 2.1b | Fetchers: polite live fetcher (robots, per-host delay, size cap, recording) and evidence replay | Done |
| 2.1c | Analyzers: HTML, embedded JSON, JSON, text/CSV, PDF, JS bundles, robots, sitemaps | Done |
| 2.1d | Relevance crawl, official-document handling, platform fingerprints and endpoint probes | Done |
| 2.1e | Coverage, gaps with leads, proposed sources, change diff, Markdown report | Done |
| 2.1f | Tests: synthetic restaurants plus a MOD replay (`tests/restaurantSourceDiscovery.test.mjs`) | Done |
| 2.1g | MOD pilot, replay of the Oct 20, 2026 research evidence | Done |
| 2.1h | MOD pilot, **live** run with `--record` from a network that can reach modpizza.com | Open |
| 2.1i | Follow-ups: spreadsheet parsing; more platform endpoint templates as new restaurants need them | Open |

## MOD Pizza pilot result (replay)

See [`data/restaurants/staging/mod/discovery.md`](../../data/restaurants/staging/mod/discovery.md). Discovery reproduced the October manual research automatically, from the domains and two store ids alone:

- **Calories, catalog, customization, portions, allergens, ingredients: found.** Sources: the ordering pages' embedded data (45 and 41 products) and the official nutrition, allergen, and menu pages.
- **Protein, carbs, total fat: missing** from every usable source, and from the optional nutrients too. They stay missing.
- Detected Koala ordering. Its menu API returned 401 for store 4080, so that is listed as a lead, not a source.
- Also detected WordPress and Next.js. The WordPress JSON for the nutrition page was found through the HTTP `Link` header.
- Statements found: "Additional nutrition information is available upon request", and the one-topping calorie caveat.

Replay can only answer for URLs that were saved in October. The home pages, robots/sitemaps, the WordPress media search (which finds uploaded PDFs that no page links to), and store 4168's API are `not_captured`. They are not missing. The live run (2.1h) closes that.
