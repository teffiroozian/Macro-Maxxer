# Phase 2 · Implement API/JSON, official-file, and browser extraction

Master task: **Phase 2 → "Implement API/JSON, official-file, and browser extraction"** in [`docs/restaurant-import-roadmap.md`](../restaurant-import-roadmap.md). The master list is unchanged. The steps below are mini-phases under that one task. The master task is not checked off; that needs Tef's approval.

## What it does

`npm run extract -- <target>` reads the Step 1 discovery report (`staging/<id>/discovery.json`), fetches every source discovery proposed (including stale ones it marked for verification), and turns each one into structured records with full provenance. It is restaurant-independent: extractors recognise content shapes, not restaurants.

```bash
npm run discover -- mod            # Step 1 first
npm run extract -- mod             # replay the saved evidence (default when a target has it)
npm run extract -- mod --live --browser --record          # live, from a network that reaches the restaurant
npm run extract -- mod --live --source https://modpizza.com/mod-fresh-nutrition/   # add an official page by hand
```

Output, all under `data/restaurants/staging/<id>/`:

- `extraction.json`: per-source status, freshness, extractor used, record counts, nutrient counts, coverage per data need, skipped sources, limitations.
- `extraction.md`: the review report.
- `extraction-records.json`: every record (git-ignored; tens of MB for MOD; regenerate with the command).

Nothing in the live restaurant index or menus is touched. Extraction does not join sources, resolve conflicts or fill gaps; that is normalization and validation (the next Phase 2 tasks).

## Extractors

| Content | Extractor | Records |
|---|---|---|
| PDF | `pdf-table`: text positions → lines; a line with ≥3 nutrient headers starts a table; values go to the nearest header column; a row with numbers and no name continues the previous name (flagged); a name-only row is a section heading | `nutrition_row` |
| CSV | `csv-table`: header row with ≥3 nutrient columns | `nutrition_row` |
| JSON (API, `__NEXT_DATA__`, JSON-LD, JSON a page loaded in the browser) | `json-menu`: categories → items → option groups (min/max exactly as published, `null` when absent) → options → portions (Light/Regular/Extra). Item dictionaries keyed by id. Payload-defined nutrient keys (`{key:"prot", name:"Protein"}`) | `menu_item`, `option_group`, `option`, `portion` |
| WordPress JSON | HTML inside `content.rendered`, via the HTML extractors | as HTML |
| HTML | `html-table`; `html-repeated-rows` (responsive grids where each cell carries its own label); `html-declarations` (ingredient statements and allergen marks) | `nutrition_row`, `ingredient_declaration` |
| Browser | the rendered page as HTML, plus every JSON GET response the page itself made to official hosts (passive; no clicks, logins or keys). These records are flagged `passive_capture` (Tef approved keeping them, Nov 18); the endpoints are never called directly | as above, each with the response URL as provenance |

Every record carries `provenance` (source id, URL, method, retrieval time, sha256 of the response, a locator inside it, and the source's own record id when it has one) and `flags`.

## How the standards apply

| Rule | In extraction |
|---|---|
| Never fabricate or estimate | A value is kept as a number only when the source printed a clean number. `< 1`, `10w`, `—` keep their raw text in `raw` and `unclean`. Ranges (`320-640`) are kept as ranges, not averaged. An empty cell is "not printed", never zero. `missingCore` lists the core macros a record lacks. |
| Older than 90 days = needs verification | A source whose own "last updated" date is past the window, or that discovery marked for verification, is extracted, and every record from it is flagged `needs_verification`. Coverage reports such data as **needs verification**, never as extracted. |
| No auth bypass | 401/403 is `auth_required` and stops there. Login-gated (Koala) and key-gated (Chipotle services) endpoints are listed under "Not read". |
| No third-party macros | Third-party sources are listed as skipped. |
| No requests without approval | Replay is the default. `--live` uses discovery's polite fetcher (robots.txt, per-host delay, size cap). |

## Mini-phases

| # | Mini-phase | Status |
|---|---|---|
| 2.2a | Extraction contracts (`scripts/extraction/contracts.ts`) | Done |
| 2.2b | Value parsing that keeps raw text, unclean values and ranges (`nutrients.ts`) | Done |
| 2.2c | Official files: PDF tables and CSV (`extractors/document.ts`) | Done |
| 2.2d | API/JSON and embedded JSON menus (`extractors/json-menu.ts`) | Done |
| 2.2e | Official HTML: tables, repeated labelled rows, ingredient and allergen declarations (`extractors/html.ts`) | Done |
| 2.2f | Browser extraction through discovery's passive Playwright renderer | Done (tested with a stub; live run pending) |
| 2.2g | Orchestrator from the discovery report, freshness flags, coverage, `npm run extract`, report | Done |
| 2.2h | Tests (`tests/restaurantExtraction.test.mjs`): Chipotle PDF parity with the bespoke parser (194/194 rows), MOD ordering/nutrition/allergen parity with the MOD adapter, stale-source flags, auth/unsupported/blocked handling, browser JSON provenance | Done |
| 2.2i | MOD pilot, replay | Done |
| 2.2j | MOD and Chipotle, **live** run on Tef's Mac (including the 2023 `mod-fresh-nutrition` page) | Done (see below) |
| 2.2k | Follow-ups: spreadsheets (shared with 2.1i); Chipotle's LZ4-compressed online menu; adapters reading extraction records (with normalization) | Open |

## MOD Pizza pilot (replay of the Oct 2026 evidence)

See [`data/restaurants/staging/mod/extraction.md`](../../data/restaurants/staging/mod/extraction.md).

- Ordering data, stores 4080 and 4168: 45 and 41 items with all option groups, options and Light/Regular/Extra portions; calories only. Item names and calories match the MOD adapter exactly.
- Nutrition page: 109 rows (98 with clean calories, 11 keep printed text such as `80 / 120` for two drink sizes), with allergen marks. Matches the MOD adapter's parser row for row.
- Allergen page: 91 ingredient statements with allergen marks. Its own date is July 2026, past 90 days, so all 91 are **needs verification**.
- Protein, carbs and fat: **unavailable** from every source read. The 2023 `mod-fresh-nutrition` page is not in the replay evidence; the live run reads it, and its records will be flagged needs verification.
- Menu page: no structured records (marketing page).

## Chipotle (reusability)

No code is Chipotle-specific. On Chipotle's saved sources the generic PDF extractor reproduces the bespoke `scripts/collect/chipotle-nutrition.ts` output on all 194 rows (names, portions, every clean value, every raw `<1`), and the generic JSON extractor reads the menu-metadata nutrition payload's own key legend (`tcal`, `prot`, `carb`, `tfat`, …). The live run (2.2j) reads the official PDF and the nutrition calculator in the browser.

## Live run, Nov 18, 2026 (Tef's Mac, commit 1aa9b16)

Run in a separate worktree with `--live --browser --record`. Outputs are on Tef's Mac in `Macro-Maxxer-extraction-qa-output/`, not committed.

- **MOD:** 41,952 records. Ordering stores 4080 and 4168: 44 and 46 items, all groups, options and portions, calories only. `/nutrition`: 109 rows, current. `/mod-fresh-nutrition/` (dated 2023-07-31, 1,207 days old): 94 rows; protein, carbs, fat and the optional nutrients on 63 of them (fat on 41). Every one is flagged **needs_verification**. `/allergen`: 91 declarations, needs verification. Koala's web config is blocked by robots.txt and was not fetched.
- **Chipotle:** official PDF, 194 rows with full macros, needs verification (624 days old). Four `services.chipotle.com` endpoints answered 401 to a direct request and were not worked around. The calculator pages' own JSON was captured passively in the browser. Each of the 7 calculator pages loaded the same menu JSON, so its records were repeated 7 times; fixed after the run (each response body is now read once). Those JSON records are named by item key (`CMG-…`) for normalization to join.
- Tests on the Mac: 531/531 once the replay test was made independent of `staging/mod/discovery.json`, which a live discover run overwrites (it now reads `tests/fixtures/extraction/mod-discovery-replay.json`).
