# MOD Pizza — Macro Maxxer data discovery

Research date: **October 20, 2026 (America/Los_Angeles)**. Discovery only; no application code, importer, or production restaurant data changed.

## Recommendation

Use **A: ordering-page embedded JSON for the catalog and customization tree**, supplemented by **B: official menu, nutrition, and allergen HTML for reference calories, serving units, and ingredient declarations**. This combination is technically extractable today, but **does not provide a complete four-macro dataset**. Protein, carbohydrate, and fat amounts were not found in the inspected official sources. Do not infer those amounts from calories or substitute zero for missing values.

**C did not yield an official downloadable nutrition document.** No nutrition PDF, spreadsheet, or CSV was linked from the inspected official pages or surfaced by targeted official-domain searches. This is a search result, not proof that MOD has no internal or unindexed document. MOD says additional nutrition information is available on request. A full Macro Maxxer launch should wait for a current official macro/portion specification, particularly for configurable pizzas and salads. No outreach was sent during this task.

## Channel comparison

| Required data | A — API / embedded structured data | B — website extraction | C — official documents |
|---|---|---|---|
| Items and categories | Strong: complete menu trees for two sampled stores; not a national census | National marketing menu, plus rendered local ordering menu | No downloadable source verified |
| Calories | Product and modifier fields; many base products are null; nested amounts are useful | 109 nutrition rows; national menu calories and serving units | Not verified |
| Protein / carbs / fat | No corresponding fields found in sampled embedded payloads | Not present as numeric nutrition columns on inspected pages | Not found |
| Ingredients | Recipe descriptions, selectable toppings, defaults; not a full chemical ingredient declaration | Allergen page has ingredient declarations for components | Not found |
| Add / remove / extra | Nested options, defaults, Light/Regular/Extra; product-specific groups | Ordering UI confirms selection/deselection and amount controls | Not found |
| Portions / adjustments | Size-specific calorie amounts; no verified weights or universal multiplier | tbsp, quarter-cup, crust dimensions, beverage volumes; no complete recipe quantities | Not found |
| Variants | Five pizza crust choices; salad sizes; meal component choices | National crust and salad sizes | Not found |
| Restrictions | min/max selections, required choices, availability, visibility, nested dependencies | Visible required groups, one-topping limits, pickup-only drink labels | Not found |
| Reliability | High for the sampled store's configured choices; medium for nutrition semantics | High provenance; incomplete macros and conflicts across official surfaces | Unknown availability and content |
| Extraction feasibility | High via public HTML JSON; direct API returned 401 | High via HTTP HTML parsing; browser useful for behavioral checks | No current extraction target |

## Exact source inventory

| ID | URL | Verified purpose / outcome |
|---|---|---|
| S1 | [Official menu](https://modpizza.com/menu/) | National categories, recipes, component calories, serving units; HTTP HTML saved |
| S2 | [Official nutrition](https://modpizza.com/nutrition/) | Calories and allergen flags; 109 component/item rows; updated August 2026 |
| S3 | [Official allergen information](https://modpizza.com/allergen/) | Component ingredient declarations and allergen flags; updated July 2026 |
| S4 | [Ordering home](https://orders.modpizza.com/) | Location search and Pickup/Delivery choice; browser search for public ZIP 40509 found Hamburg |
| S5 | [Hamburg ordering HTML](https://orders.modpizza.com/store/4080) | HTTP 200; full embedded `__NEXT_DATA__`; initial direct browser load failed |
| S6 | [Hamburg ordering flow](https://orders.modpizza.com/store/4080/Hamburg) | Working menu after location search; browser verified categories and customization |
| S7 | [The MOD customization](https://orders.modpizza.com/store/4080/Hamburg/121706/Pizza/112938647/The%20MOD%20) | Browser verified regular crust, tomato sauce, and Extra adjustment |
| S8 | [Mobile ordering HTML](https://orders.modpizza.com/store/4168) | HTTP retrieval and embedded menu parse succeeded; different local catalog |
| S9 | [Nutrition WordPress JSON](https://modpizza.com/wp-json/wp/v2/pages/762) | HTTP JSON succeeded; page metadata and introductory HTML, **not the full nutrition rows**; `acf` is empty |
| S10 | [Koala menu API request](https://api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap) | Verified direct GET returns **HTTP 401**, `error: unauthorized` |
| S11 | [Public ordering app bundle](https://orders.modpizza.com/_next/static/chunks/pages/_app-121bdd5ca0fb094b.js) | Reveals read-only menu/location request construction and JSON/zlib handling |
| S12 | [Public store bundle](https://orders.modpizza.com/_next/static/chunks/pages/store/%5B...id%5D-77bf279beea09b08.js) | Retrieved for inspection; build-specific, not a durable data endpoint |
| S13 | [Official FAQ](https://modpizza.com/faq/) | Directs nutrition/allergen inquiries to S2/S3 |
| S14 | [MOD support nutrition article](https://modpizzahelp.freshdesk.com/support/solutions/articles/44002159857-where-can-i-find-your-nutritional-information-) | Directs to S2; article modified March 11, 2021; not evidence of current nutrition freshness |

## A — API and structured data findings

### Successful reusable route: server-rendered JSON

GET S5 or S8 anonymously, parse `script#__NEXT_DATA__[type="application/json"]`, then navigate:

```text
props.pageProps.initialProps.serverState.queries
  → entry whose queryKey[0] == "menu"
  → state.data[0]
  → category.products[]
  → product.option_groups[].options[].option_groups[] ... recursively
```

The menu query key includes `{id: 4080, wantedAt: "asap"}`. The response contains store-specific product/group/option IDs alongside `global_id` / `global_option_id`; preserve both and the entire parent path. A global option name alone is insufficient to identify a size-specific serving or an option's role as base sauce versus finish.

Observed fields include names, descriptions, categories, ordering ordinals, `calories`, `max_calories`, `calories_separator`, cost, currency, quantity limits/increments, disabled flags, `disabled_until`, group selection limits, `requires_user_selection`, `supports_quantity_selection`, `is_adv_nested_modifier`, `is_default`, `is_inverted`, `is_available`, images, labels, allergens, and metadata. Empty allergen arrays must not be treated as proof of allergen absence; S3 is the better declaration source.

No protein/carbohydrate/fat nutrient fields were found by recursively inspecting the sampled embedded state. Textual mentions of an ingredient such as soybean oil are not nutrient amounts.

### Direct API: discovered, but not anonymously reusable as tested

The public app bundle constructs:

```text
GET https://api.koala.io/v1/ordering/store-locations/{id}/menu?wanted-at={encodedTime}
Accept: application/json  OR  application/zlib
If-Modified-Since: optional
```

The JSON path reads `data.categories`; the compressed path decompresses zlib before parsing. The same bundle contains GET location-list and location-detail routes under `https://api.koala.io/v1/ordering/store-locations`, and a content GraphQL URL `https://api.koala.io/content/graphql`. These are **bundle-discovered routes**, not successfully validated anonymous feeds. Only the menu API was directly probed: GET S10 with `Accept: application/json` and `x-request-origin: https://orders.modpizza.com` returned 401. The app includes client/token handling; exact successful authorization requirements were not established. No credential extraction, auth workaround, basket creation, or checkout call was attempted. Prefer S5/S8 over relying on this API.

**Network-inspection limitation:** the available browser automation surface exposes DOM, console logs, and page assets, but no network-event/HAR/response-body API. Consequently, a live XHR/fetch request trace was unavailable. API conclusions come from retrieved public JavaScript and a direct HTTP probe; embedded-menu findings come from actual HTTP responses, not an inferred API schema. The browser was used automatically for navigation and customization verification.

### Store scope and full observed catalog

| Category | Hamburg 4080 | Mobile 4168 |
|---|---:|---:|
| Pizza | 14 | 12 |
| Salads | 5 | 2 |
| Sides | 1 | 1 |
| Desserts | 2 | 7 |
| Kids Meal | 1 | 1 |
| Beverages | 17 | 13 |
| Extras | 5 | 5 |
| Total product records | **45** | **41** |

These counts describe returned product records, not a guarantee that every item is orderable. Inspect disabled/availability flags. The appendix lists every product returned for both stores. Catering is linked separately at [catering.modpizza.com](https://catering.modpizza.com/); its catalog was not inspected, so catering completeness is unverified. Draft beer/wine and local or limited-location items also prevent a national completeness claim from these two stores.

### Customization, variants, and rules

The MOD has one required size selection from: Small 6-inch thin (200 cal), Regular 11-inch thin (467), Extra Thick 11-inch (933), Cauliflower 11-inch (520), Gluten-Friendly 11-inch (650). Each size opens its own modifier subtree. In the regular-size branch:

- Sauces: min 1, max 8; includes an explicit No Sauce option.
- Cheeses: min 1, max 8; includes an explicit No Cheese option.
- Meats, vegetables/herbs, and finishing sauces have null min/max in this response. Preserve null; do not convert it into a fabricated numeric cap.
- Cooking instructions: optional, max 1; Light Bake or Extra Crispy.
- Nested amount groups can require exactly one Light/Regular/Extra choice, with Regular marked default, even when `requires_user_selection` is false. Defaults can satisfy a required group without an explicit user click.

One Topping has exactly one sauce, one cheese, and one topping group choice; seasoning/herbs and finish groups are separate. Maddy's Favorite instead supplies default tomato sauce, mozzarella, and asiago under a remove/modify group. Therefore the general unlimited-toppings marketing claim must not override each product's explicit rule tree.

Salads have Small (side), Regular (entrée), and Large (Feeds 2) options in the sampled current ordering tree. Kids Meal requires one pizza choice and one beverage choice (milk, chocolate milk, or apple juice). Its rendered description disallows modifications/substitutions; nested choices must still be preserved rather than generalized from the adult pizza builder. Fountain drink products explicitly say pickup only. Hidden, unavailable, inverted, and nested option semantics need to remain distinct during future modeling.

### Portion and calorie behavior verified in the UI

Browser path: S4 → ZIP 40509 → Hamburg Order Pickup → The MOD → Regular thin crust → Tomato Sauce → Extra.

| State | Displayed total |
|---|---:|
| Regular thin crust only | 467 cal |
| Add regular tomato sauce | 472 cal |
| Switch tomato sauce to Extra | 474 cal |

The corresponding JSON tomato-sauce amount values are 2 / 5 / 7 cal for regular crust and 1 / 2 / 4 for small crust. Regular-size mozzarella is 40 / 80 / 120 and asiago 65 / 130 / 195. **Do not use a universal “extra = double” rule or scale small by crust area.** The amount calories are alternative leaf amounts; do not sum Light + Regular + Extra or double-count a parent display amount.

The ordering footer explicitly qualifies topping calories: they are additions to standard preparation for a one-topping item, and may be lower for multi-topping items. Actual weighed portions, recipe amounts, and a multi-topping allocation algorithm were not found. Simple additive arithmetic reproduces the observed sauce example, but was not validated for all recipes, combinations, or full macros.

## B — HTML and rendered-page findings

S1 provides Pizza, Salads, Kids Meal, Sides, Desserts, and Beverages sections, recipes for signature pizzas and salads, component lists, crust dimensions, and reference calories. It is useful for names and descriptions, but omits ordering-only entries such as sampled limited-time pizzas and extras. It also contains duplicated responsive presentations; deduplicate by item identity/section, not by blindly counting headings.

S2 provides **109 rows** across Pizza, Crust, Sauce, Cheese, Meat, Veggies & Good Stuff, Salad, Salad Dressing, More Stuff, Beverage, and Desserts. The appendix preserves every row's name and calorie value. This is item-level **and component-level calories**, not item-level and component-level full macros.

Published units are sauce/dressing per tablespoon; cheese, meat, and vegetables/good stuff per quarter-cup; crust by size/type; beverages at 16 / 24 fl oz. Salad calories include dressing, but the nutrition rows do not consistently identify a salad size. There are no verified gram weights, slice counts, full topping quantities per recipe, or adjustment weights for Light/Extra.

S3 has component composition declarations (including subingredients) and allergen indicators. This supports ingredient transparency but cannot determine individual ingredient macros or preparation quantities. Do not confuse a purchased component such as pesto with each raw subingredient in its declaration.

### Extraction method

- S2: parse `div.row.menu-item__nutrition`; use the first child column for item name and the second for calories. Read the surrounding category heading/portion paragraph. This layout uses divs, **not HTML tables**. Allergen flags are CSS marker elements such as `div.contains`; plain text alone loses positive/negative status.
- S3: parse `div.row.menu-item__allergen`, `.menu-item__name`, and `.ingredients`, together with their corresponding allergen columns and category headings.
- S1: parse section headings, recipe text, size labels, and item calorie displays; account for duplicated responsive markup and empty values.
- S9: useful for `modified_gmt` and intro content, but its `content.rendered` lacks the actual 109 nutrition rows and its `acf` is empty. The WordPress endpoint is not a substitute for S2's HTML.
- Browser rendered extraction is feasible and was verified for the local menu/customizer, but embedded JSON is substantially simpler for exhaustive nested rules.

### Conflicts that require resolution before importing nutrition

| Data | Official national page | Hamburg ordering source | Implication |
|---|---|---|---|
| CinnaMOD | 1182 cal | 1190 cal | Preserve source/version; do not silently overwrite |
| Mozzarella | 90 cal per quarter-cup | Regular branch amount 80 cal | Portions or specifications differ; grams unavailable |
| Asiago | 110 cal per quarter-cup | Regular branch amount 130 cal | Same name does not establish the same serving |
| Buffalo sauce | 0 cal on nutrition page | 120 cal displayed for regular pizza base sauce; finishing version differs | Strong role/serving or data-quality discrepancy; no correction guessed |
| Salad size labels | MINI / MOD / MEGA | Small / Regular / Large (Feeds 2) | No automatic size mapping without verification |
| Salad calories | Some national menu sizes blank; Mediterranean shows three sizes | Base salad calorie fields null in sampled JSON | Null/blank is not zero; complete variant totals unavailable |
| Italian Chop recipe | National menu description omits chickpeas | Hamburg description includes chickpeas | Recipe/version conflict affects removal and nutrition calculations |

The national menu says nine signature pizzas but lists ten named signature recipes. Use observed items, not the promotional count, as catalog evidence. S2's generic salad rows also mix values shown under different size labels on S1; do not assign them all to one size.

## C — downloadable official documents

Inspected S1–S3 links and source HTML for `.pdf`, spreadsheets, CSVs, and nutrition downloads; no such nutrition download was present. Targeted searches included `site:modpizza.com filetype:pdf nutrition protein`, official upload-path nutrition PDFs, and official-domain protein/total-fat/download terms. Results led back to the HTML nutrition/allergen resources. S13/S14 also direct readers to S2 rather than a document.

Search results included third-party nutrition/PDF aggregators, historical reposts, and the lookalike domain `modpizzas.com`. None was accepted as an official MOD source. Their numeric macro data cannot establish current recipe/portion validity. No official downloadable file was located, so there was no official PDF to render, date, or verify for item/ingredient macros. This channel remains **unavailable**, not “confirmed to contain no macros.”

## Freshness and reliability

| Source | Date evidence | Interpretation |
|---|---|---|
| Nutrition HTML | Visible August 2026; schema and WordPress `modified_gmt` = `2026-08-25T23:19:03` | Strong page-edit date; does not prove every row was independently revalidated |
| Allergen HTML | Visible July 2026; schema modified `2026-07-21T20:10:35+00:00` | Ingredient declarations may lag ordering changes |
| Menu HTML | Schema modified `2026-08-24T15:27:59+00:00` | No visible per-item revision dates |
| Ordering snapshot | Retrieved October 20 local time; organization sync `2026-10-21T00:00:31+00:00` (October 20, 5:00 pm PDT) | Organization sync is not proof of individual item nutrition freshness |
| Ordering HTTP cache | `Cache-Control: public, max-age=86400` | A successful fetch can still be cached for a day |
| Direct menu API | 401 during this investigation | No API dataset/update date verified |
| Documents | No official file found | No document freshness can be assessed |

Browser direct entry into S5 initially produced an empty page and console errors, including a client exception reading `label`. Searching from ordering home and following Hamburg's link recovered a functioning menu/customizer. The web retrieval tool separately rejected the ordering HTML as too large; direct HTTP retrieval succeeded. These are tooling/rendering limitations, not evidence that the menu data is absent.

## Import feasibility and unresolved requirements

**Feasible now:** collect local catalog metadata and nested customization trees from A; cross-reference B's recipe descriptions, component declarations, serving-unit labels, and calories. Preserve source URL, store, retrieval time, size, modifier path, defaults, availability, and original values. Use explicit crosswalks; do not join solely on lowercased ingredient names.

**Needed for a complete macro import:** current official protein/carbs/fat for each serving and size; weights/volumes for recipe defaults and Light/Extra; rules for topping quantities as topping count changes; complete salad-size totals; resolution of the calorie/recipe discrepancies above; confirmation of region and limited-time coverage. All-location, delivery-specific, catering, and every possible builder combination were not exhaustively verified.

**Recommended source priority:** A for local menu and rules → B for composition, units, and cross-checks → a current official macro/portion specification if one becomes available. Keep conflicting nutrient records separate until reconciled. Mark the present discovery **catalog/customization ready; complete macro nutrition not ready**.

## Evidence and reproduction

The adjacent `evidence/` directory contains public response snapshots, headers, the unauthorized API result, inspected public JavaScript, a compact top-level menu summary, and extracted calorie rows. Large raw ordering HTML is gzip-compressed without changing its contents. `evidence-manifest.json` records source URLs and SHA-256 hashes. `catalog-and-calorie-appendix.md` lists both sampled catalogs and all 109 official calorie rows. These are research artifacts, not import-ready restaurant data.

To reproduce the main structured-data extraction, decompress the appropriate ordering snapshot, parse `__NEXT_DATA__` as JSON, choose the menu query by key rather than array position, and recursively traverse the group/option tree. To reproduce behavioral validation, follow the browser path in the portion section; no login, cart addition, or purchase is needed.
