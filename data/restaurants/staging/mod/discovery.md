# MOD Pizza — source discovery

Run 2026-11-18T22:12:16.592Z in **replay** mode. 27 of 60 requests used. Stores sampled: 4080, 4168.

## Verdict

- **Core macros: not ready.** Missing from every usable source: ****. These stay missing; they are never estimated (standards §1).
- Catalog: found (2 sources)
- Customization: found (2 sources)
- Portions: found (4 sources)
- Allergens: found (2 sources)
- Ingredients: **missing**

## Nutrient coverage

"Found" means at least one source publishes values for some records. It is not per-item coverage; the import's review report checks that.

| Nutrient | Core | Status | Sources with values |
|---|---|---|---|
| calories | yes | found | orders.modpizza.com/store/4080<br>orders.modpizza.com/store/4168<br>modpizza.com/nutrition |
| protein | yes | **unverified** | — |
| carbs | yes | **unverified** | — |
| totalFat | yes | **unverified** | — |
| satFat |  | **unverified** | — |
| transFat |  | **unverified** | — |
| cholesterol |  | **unverified** | — |
| sodium |  | **unverified** | — |
| fiber |  | **unverified** | — |
| sugars |  | **unverified** | — |

## Discovery levels

- Level 1 (automatic): Automatic discovery of official sources. 20 request(s).
- Level 2 (deeper investigation): Core nutrients not covered by current sources after Level 1: protein, carbs, totalFat. 7 request(s).
- Level 3 (escalation): Network-blocked sources must be checked first (protein, carbs, totalFat unverified); request drafted in case they hold nothing. 0 request(s).
- Nutrition information request sent by the project owner. See `information-request.md` for tracking.

## Gaps in core macros

- **protein, carbs, totalFat**: No inspected source publishes protein, carbs, totalFat, but the network blocked or did not capture sources that might. Cannot be called missing until those are checked. Official statement: "Additional nutrition information available upon request"

Leads that could still hold these values but could not be inspected:

- not_captured: [modpizza.com/](https://modpizza.com/) — not in the saved responses; run discovery live to inspect it
- not_captured: [orders.modpizza.com/](https://orders.modpizza.com/) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/nutrition-information](https://modpizza.com/nutrition-information) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/nutrition-facts](https://modpizza.com/nutrition-facts) — not in the saved responses; run discovery live to inspect it
- auth_required: [api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap](https://api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap) — needs authorization; no workaround attempted
- not_captured: [api.koala.io/v1/ordering/store-locations/4168/menu?wanted-at=asap](https://api.koala.io/v1/ordering/store-locations/4168/menu?wanted-at=asap) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/wp-json/wp/v2/media?search=nutrition&per_page=50&_fields=id,link,s…](https://modpizza.com/wp-json/wp/v2/media?search=nutrition&per_page=50&_fields=id,link,source_url,mime_type,modified_gmt,title) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/wp-json/wp/v2/pages?search=nutrition&per_page=20&_fields=id,link,m…](https://modpizza.com/wp-json/wp/v2/pages?search=nutrition&per_page=20&_fields=id,link,modified_gmt,title) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/nutrition-guide](https://modpizza.com/nutrition-guide) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/nutritional-information](https://modpizza.com/nutritional-information) — not in the saved responses; run discovery live to inspect it
- not_captured: [modpizza.com/nutrition-calculator](https://modpizza.com/nutrition-calculator) — not in the saved responses; run discovery live to inspect it

## Platforms detected

- **Koala ordering** — `api.koala.io` in orders.modpizza.com/store/4080
- **WordPress site** — `https://modpizza.com/wp-content/` in orders.modpizza.com/store/4080
- **Next.js page data** — `__NEXT_DATA__` in orders.modpizza.com/store/4080

## Proposed adapter sources

Declarations an adapter can start from (`SourceDescriptor`). Ordering-system sources rank above official ones only under the standards §2.2 checks.

| id | kind | authority | provides | retrieved | source updated | stale |
|---|---|---|---|---|---|---|
| `mod:orders-modpizza-com-store-4080` | ordering_structured_data | ordering_system | calories, catalog, customization, portions | 2026-10-21 | 2026-10-21 | no |
| `mod:orders-modpizza-com-store-4168` | ordering_structured_data | ordering_system | calories, catalog, customization, portions | 2026-10-20 | 2026-10-21 | no |
| `mod:modpizza-com-nutrition` | official_html | official | calories, portions, allergens | 2026-10-21 | 2026-08-25 | no |
| `mod:modpizza-com-allergen` | official_html | official | portions, allergens, ingredients | 2026-10-20 | 2026-07-21 | no (content older than 90 days: verify) |
| `mod:modpizza-com-menu` | official_html | official | portions, allergens | 2026-10-20 | 2026-08-24 | no |

## Candidates (27)

| URL | Channel | Authority | Outcome | Publishes | Updated |
|---|---|---|---|---|---|
| [orders.modpizza.com/store/4080](https://orders.modpizza.com/store/4080) | embedded_json | ordering_system | inspected (200) | calories; 45 items; 5315 option groups | 2026-10-21 |
| [orders.modpizza.com/store/4168](https://orders.modpizza.com/store/4168) | embedded_json | ordering_system | inspected (200) | calories; 41 items; 3201 option groups | 2026-10-21 |
| [modpizza.com/nutrition](https://modpizza.com/nutrition) | official_html | official | inspected (200) | calories; allergens | 2026-08-25 |
| [modpizza.com/wp-json/wp/v2/pages/762](https://modpizza.com/wp-json/wp/v2/pages/762) | api_json | official | inspected (200) | — | 2026-08-25 |
| [modpizza.com/allergen](https://modpizza.com/allergen) | official_html | official | inspected (200) | allergens; ingredients | 2026-07-21 |
| [orders.modpizza.com/_next/static/chunks/pages/_app-121bdd5ca0fb094b.js](https://orders.modpizza.com/_next/static/chunks/pages/_app-121bdd5ca0fb094b.js) | js_bundle | ordering_system | inspected (200) | — | — |
| [modpizza.com/menu](https://modpizza.com/menu) | official_html | official | inspected (200) | allergens | 2026-08-24 |
| [api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap](https://api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap) | api_json | ordering_system | auth_required (401) | — | — |
| [modpizza.com/](https://modpizza.com/) | unknown | official | not_captured | — | — |
| [orders.modpizza.com/](https://orders.modpizza.com/) | unknown | ordering_system | not_captured | — | — |
| [modpizza.com/robots.txt](https://modpizza.com/robots.txt) | site_index | official | not_captured | — | — |
| [orders.modpizza.com/robots.txt](https://orders.modpizza.com/robots.txt) | site_index | ordering_system | not_captured | — | — |
| [api.koala.io/v1/ordering/store-locations/4168/menu?wanted-at=asap](https://api.koala.io/v1/ordering/store-locations/4168/menu?wanted-at=asap) | api_json | ordering_system | not_captured | — | — |
| [modpizza.com/nutrition-calculator](https://modpizza.com/nutrition-calculator) | unknown | official | not_captured | — | — |
| [modpizza.com/nutrition-facts](https://modpizza.com/nutrition-facts) | unknown | official | not_captured | — | — |
| [modpizza.com/nutrition-guide](https://modpizza.com/nutrition-guide) | unknown | official | not_captured | — | — |
| [modpizza.com/nutrition-information](https://modpizza.com/nutrition-information) | unknown | official | not_captured | — | — |
| [modpizza.com/nutritional-information](https://modpizza.com/nutritional-information) | unknown | official | not_captured | — | — |
| [modpizza.com/wp-json/wp/v2/media?search=nutrition&per_page=50&_fields=id,link,s…](https://modpizza.com/wp-json/wp/v2/media?search=nutrition&per_page=50&_fields=id,link,source_url,mime_type,modified_gmt,title) | api_json | official | not_captured | — | — |
| [modpizza.com/wp-json/wp/v2/pages?search=nutrition&per_page=20&_fields=id,link,m…](https://modpizza.com/wp-json/wp/v2/pages?search=nutrition&per_page=20&_fields=id,link,modified_gmt,title) | api_json | official | not_captured | — | — |
| [modpizza.com/allergens](https://modpizza.com/allergens) | unknown | official | not_captured | — | — |
| [orders.modpizza.com/_next/static/chunks/main-1482276fe7f89948.js](https://orders.modpizza.com/_next/static/chunks/main-1482276fe7f89948.js) | js_bundle | ordering_system | not_captured | — | — |
| [modpizza.com/contact](https://modpizza.com/contact) | unknown | official | not_captured | — | — |
| [modpizza.com/contact-us](https://modpizza.com/contact-us) | unknown | official | not_captured | — | — |
| [modpizza.com/faq](https://modpizza.com/faq) | unknown | official | not_captured | — | — |
| [modpizza.com/faqs](https://modpizza.com/faqs) | unknown | official | not_captured | — | — |
| [modpizza.com/our-ingredients/](https://modpizza.com/our-ingredients/) | unknown | official | not_captured | — | — |

## Statements found on official pages

- "Additional nutrition information available upon request"
- "The calories stated are for each topping when added to a one-topping item and are in addition to the standard preparation"
- "Calories for each topping may be less for multiple-topping items"
- "Additional nutrition information is available upon request"

## Changes since the previous run

0 added, 0 removed, 0 changed, 8 unchanged.

## Warnings

- Replay mode: answers come from saved responses captured 2026-10-20. URLs that were never saved are "not_captured", not missing. Run live before relying on this report.
- 1 source(s) were last updated more than 90 days ago. They stay valid evidence and need verification; compare them with newer sources item by item and portion by portion before use.
