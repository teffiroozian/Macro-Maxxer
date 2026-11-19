# Restaurant import pipeline: handoff (Nov 18, 2026)

Read this first. It is the state of the work on branch `feature/restaurant-import-pipeline` and the rules the owner (Tef) has set.

## Rules (from Tef, non-negotiable)

- Work on `feature/restaurant-import-pipeline`. No PR, merge, deploy or publish until Tef says so.
- `docs/restaurant-import-roadmap.md` is the fixed 27-task master checklist. Do not add, rename, reorder or check off tasks without Tef's explicit approval. Track extra steps as mini-phases under an existing task in `docs/phase-2/*.md`.
- Never fabricate or estimate macros. A value the source does not print stays absent (never 0).
- Official data older than 90 days is "needs verification": keep it as evidence, never approve or discard it automatically.
- Never bypass authentication (Koala's login-gated API, Chipotle's subscription-key API). A 401/403 stops there. JSON an official page loads by itself in the browser may be kept, flagged `passive_capture` (Tef, Nov 18); never call those endpoints directly.
- No requests to restaurants without approval. Never send the drafted MOD information request (`staging/mod/information-request.md`).
- Never present saved captures as proof of a live run. Live sites are blocked from the default cloud environment; run live on Tef's Mac or the "restaurant discovery" cloud environment.
- Do not touch production restaurant data (`data/restaurants/index.json`, `data/restaurants/<r>/generated/`, `lib/`). Drafts go to `data/restaurants/staging/<id>/`.
- Keep the four live restaurants (McDonald's, Starbucks, Chick-fil-A, Chipotle) working: `npm test` and `npm run pipeline:parity:{mcdonalds,starbucks,chickfila,chipotle}` must stay green.
- Repo `CLAUDE.md`: do not stop/restart the dev server on port 3000.

## Phase 2 status

| Master task | State | Notes |
|---|---|---|
| Build automated source discovery | Built, live QA passed; **awaiting Tef's sign-off** | `docs/phase-2/source-discovery.md`, `npm run discover` |
| Implement API/JSON, official-file, and browser extraction | Built, live run done; **awaiting Tef's sign-off** | `docs/phase-2/extraction.md`, `npm run extract` |
| Build restaurant data normalization | **Next** | see below |
| Validation, enrichment, review/publishing | Not started | |

## Pipeline map

1. `npm run discover -- <id> [--live --browser --record]` → `staging/<id>/discovery.{json,md}` (`scripts/discovery/`).
2. `npm run extract -- <id> [--live --browser --record] [--source <url>]` → `staging/<id>/extraction.{json,md}` and `extraction-records.json` (git-ignored, large) (`scripts/extraction/`). Records: `menu_item`, `option_group`, `option`, `portion`, `nutrition_row`, `ingredient_declaration`, each with `provenance` (source id, URL, method, retrievedAt, sha256, locator) and `flags` (`needs_verification`, `unclean_value`, `range_value`, `name_carried_forward`, `name_from_key`, `passive_capture`, `unavailable`).
3. `npm run pipeline -- <adapter>` → normalize/validate/project into `staging/<id>/draft.json`, `review.md` (`scripts/pipeline/`; contracts in `scripts/pipeline/contracts.ts`). Adapters today still load raw captures directly (MOD: `docs/research/mod-pizza/evidence`; Chipotle: `data/restaurants/chipotle/raw`), not extraction records.

## Suggested next step (normalization)

Make adapters (starting with MOD) consume `extraction-records.json` instead of raw captures, translating records into `AdapterOutput` (`scripts/pipeline/contracts.ts`):
- ordering `menu_item`/`option_group`/`option`/`portion` → items, groups, portions (reuse logic in `scripts/pipeline/adapters/mod-pizza.ts`);
- `nutrition_row`s → `referenceNutrition`; keep the 2023 `mod-fresh-nutrition` rows as a separate source whose values stay `needs_verification` (do not let them make MOD publishable automatically);
- Chipotle `name_from_key` (CMG-…) records join to names via the calculator menu by item id;
- normalization reconciles sources; extraction never does.

## Live results (Nov 18, Tef's Mac)

Full outputs: `~/Developer/Macro-Maxxer-extraction-qa-output/{mod,chipotle}/` (not committed).
- MOD: ordering stores 4080/4168 (44/46 items, calories only); `/nutrition` 109 rows (current); `/mod-fresh-nutrition/` (2023-07-31) 94 rows, protein/carbs/fat on 63, all needs_verification; `/allergen` 91 ingredient declarations (needs_verification, July 2026).
- Chipotle: official PDF 194 rows, full macros, needs_verification (624 days); `services.chipotle.com` endpoints 401 directly; calculator JSON captured passively.

## Gotchas

- A live `npm run discover` overwrites the tracked `staging/<id>/discovery.json`. Don't commit that by accident; tests use `tests/fixtures/extraction/mod-discovery-replay.json`.
- `npm ci` before running anything; tests: `npm test` (531 passing at ceb3c2e).
- Open follow-ups: spreadsheet parsing (2.1i / 2.2k), Chipotle LZ4-compressed online menu, MOD macro source still unresolved for publishing.
