# Starbucks US interactive source discovery

Collected 2026-09-09. Scope: official US public menu and store-selected web pickup flow, with menu, sizes, standard nutrition and customization prioritized. No importer, final restaurant JSON, pricing investigation, detailed availability testing or regional nutrition substitution was performed.

## Findings and recommended sources

**Yes: the US menu source, US standard-recipe nutrition, and customization data were found.** The menu response covers the complete catalog returned by the public US menu endpoint. Product detail was sampled for four product/form combinations, not downloaded for the whole catalog.

| Rank | Official endpoint | Best use | Confidence / scope / requirements |
|---|---|---|---|
| 1 | [GET /apiproxy/v1/ordering/menu](https://www.starbucks.com/apiproxy/v1/ordering/menu) | National menu hierarchy, category IDs/URIs, product IDs/names/images, forms, size codes and default-size SKU | High: observed loading the public US menu; replay returns JSON without store, cookies or authentication. 9 top-level groups, 104 category nodes, 332 category placements, 282 distinct product/form pairs, 265 product IDs. No pagination field observed. Completeness means this endpoint's catalog, not every licensed-store or historical product. |
| 1 | [GET /apiproxy/v1/ordering/418/hot](https://www.starbucks.com/apiproxy/v1/ordering/418/hot) | Product detail, all offered sizes, **nutrition**, ingredients, allergen text, modifier groups/options and size-specific recipe defaults | High for sampled products. Endpoint family is `/apiproxy/v1/ordering/{productNumber}/{form}`. The no-store hot-latte request works without credentials. Each response retains its `products` array and related data intact. |
| 2 | [GET store 101 menu](https://www.starbucks.com/apiproxy/v1/ordering/menu?storeNumber=101&ownershipTypeCode=CO&timeZone=GMT-07%3A00%20America%2FLos_Angeles) | Store-context catalog and embedded availability labels | High for the one selected store. Same hierarchy shape; 323 placements, 274 product/form pairs, 257 IDs. `availability` has Available and TemporarilyUnavailable. Query was observed, not invented. All parameters were retained; necessity of each parameter was not separately tested. |
| 2 | [GET /418/iced?storeNumber=101](https://www.starbucks.com/apiproxy/v1/ordering/418/iced?storeNumber=101), [GET /371/single?storeNumber=101](https://www.starbucks.com/apiproxy/v1/ordering/371/single?storeNumber=101), [GET /1033/single?storeNumber=101](https://www.starbucks.com/apiproxy/v1/ordering/1033/single?storeNumber=101) | Store-selected product details using the same nutrition/modifier schema | High for the sampled iced drink, wrap and croissant. Replay succeeds without browser cookies or sign-in; store context is explicit. No separate nutrition or modifier endpoint is needed for these captured products. |

Use the national menu as the future discovery index and product detail as the primary standard nutrition/recipe source. Use the store-context menu only when interpreting that store's assortment. Do not treat national `Available` as proof of local stock. Currentness is supported by live browser observations and successful responses on the retrieval date; no upstream recipe publication date was established.

## Capture method and limits

A real Codex in-app browser loaded the client-side experience. Its supported `pageAssets.list()` inventory exposed observed API resource URLs. Only the Starbucks ordering URLs were retained in the capture plan. Those URLs were then replayed with Python's standard-library HTTP client, using GET and `Accept: application/json`, without transferring cookies, tokens, authorization headers or browser storage. Successful JSON response bodies were saved byte-for-byte, with SHA-256, byte counts, retrieval timestamps, query parameters and provenance sidecars.

These files are **original API response bodies from direct replays of browser-observed URLs**, not a HAR export or the exact bodies of the original browser requests. Browser request methods, headers and timing were not exposed by this inventory; GET is the verified replay method. Native Chrome inspection was unavailable because computer-use permissions were absent. No browser session secrets were read or copied to work around that limit.

The inventory is a URL-discovery aid, not an exhaustive request log. During SPA navigation it sometimes retained earlier URLs; reloading the iced product exposed its fresh store-scoped request. Consequently, absence of a new URL during an interaction is not proof that no request occurred. Nutrition conclusions below also rely on saved response fields and visible UI behavior, rather than solely on request absence.

No analytics, telemetry, location-search response, static assets, images, generic JS bundles, cookies or credentials are preserved. Image URLs already present in core JSON remain untouched. Store 101 is a public business location selected by searching **Seattle, WA**, not the user's device location. No account sign-in, cart addition or checkout was needed.

## Public menu and online ordering inspected separately

1. Loaded public `/menu` without a selected store. Observed the national menu API and browsed Hot Coffee & Espresso.
2. Opened Pumpkin Spice Latte (`418/hot`) and its full nutrition page. Observed the no-store product-detail URL; the saved body contains the values displayed by the browser.
3. Changed Grande to Tall: calories changed 390 → 300, pumpkin sauce 4 → 3 pumps, shots 2 → 1. These correspond to separate size entries already present in the product JSON.
4. Used Choose a café, searched Seattle, and clicked Order here for **Columbia Center - 4th & Cherry**, 701 Fifth Ave, Seattle. The UI confirmed the selected pickup café. Later observed requests identify it as `storeNumber=101`.
5. Opened customization in the selected-store hot latte. Changed milk to Oatmilk, added Vanilla Syrup (UI initialized it to four pumps), chose No Whipped Cream, and increased shots from two to three. The UI marked the selections Customized.
6. Reopened full nutrition after these changes. It still displayed the standard Grande 390 calories, 14 g fat, 52 g carbohydrates, 14 g protein, 230 mg sodium and 150 mg caffeine, along with the standard-recipe disclaimer and original ingredient statement.
7. Browsed Cold Coffee & Espresso and opened `418/iced`. UI showed Tall/Grande/Venti, Grande 370 calories, and Venti **24 fl oz** versus hot Venti **20 fl oz**. Reloading exposed the store-scoped iced-product and menu URLs.
8. Opened Spinach, Feta & Egg White Wrap (`371/single`), its nutrition panel and customization. UI showed 290 calories, 20 g protein, 840 mg sodium, allergen text, and a Sriracha condiment option.
9. Browsed Bakery, opened Butter Croissant (`1033/single`), changed Warmed to Not Warmed, and opened nutrition. UI showed 250 calories, 5 g protein, 300 mg sodium and Egg, Milk, Wheat allergen text.

The footer's **Order on the Web** link targets `/menu`. Public browsing and this selected-store pickup experience demonstrably use the same `/apiproxy/v1/ordering` family, with store parameters added in the latter. This conclusion is based on observing both contexts, not assuming they were identical. Authenticated checkout and other channels are outside this narrowed pass.

## US nutrition evidence

Nutrition is stored directly at `products[].sizes[].nutrition`. No regional data is involved. Relevant fields include `servingSize`, `calories.displayValue`, `caloriesFromFat`, and `additionalFacts[]`, with stable-looking fact IDs, values, units, display strings and daily percentages. Saturated fat/trans fat and fiber/sugars also occur as nested subfacts. Avoid double-counting their repeated representations in a future importer.

| Captured product/form | Sizes captured | UI/API check |
|---|---|---|
| Pumpkin Spice Latte 418/Hot | Short, Tall, Grande, Venti | Grande: 390 kcal, 14 g fat, 52 g carbs, 14 g protein, 230 mg sodium; Tall: 300 kcal |
| Iced Pumpkin Spice Latte 418/Iced | Tall, Grande, Venti | Grande: 370 kcal; API Tall 270 and Venti 480 kcal |
| Spinach, Feta & Egg White Wrap 371/Single | `1 Piece` | 159 g, 290 kcal, 8 g fat, 34 g carbs, 20 g protein, 840 mg sodium |
| Butter Croissant 1033/Single | `1 Piece` | 62 g, 250 kcal, 14 g fat, 26 g carbs, 5 g protein, 300 mg sodium |

Ingredients are nested at `sizes[].ingredients[]` with `name` and `children`. Allergen presentation is at `sizes[].allergens.{shouldDisplay,text}`. The wrap and croissant contain explicit allergen strings. The hot latte has `shouldDisplay: true` but empty `text`; the browser falls back to its ingredient/package disclaimer. Empty allergen text is **not** an allergen-free declaration.

**Standard nutrition per size is confirmed. Customized nutrition is not.** The hot-latte nutrition panel remained standard after the four modifier changes. The modifier definitions captured here do not contain per-modifier nutrient contributions or a validated recalculation model. No calculation endpoint was identified. Do not subtract milk/cream or add syrup/espresso nutrients by guesswork. This finding does not establish that every Starbucks channel lacks customized nutrition.

## ID and relationship mapping

The observed relationships are:

```text
menus[] → children[] (recursive category tree)
  category.id + category.uri
    → category.products[] (category placement)
      productNumber + formCode + uri
        → product-detail products[]
          → sizes[]: sizeCode + sku + default
            → nutrition / ingredients / allergens
            → recipe.default[]
              productOption.productNumber + formCode + sizeCode
                ↔ productOptions[] → children[] → products[]
                  productNumber → form.formCode → form.sizes[].sku/sizeCode
            → defaultOptionValues[] (initial values for optional additions)
```

- Category IDs are slug strings, e.g. `latte`, with `/coffee-espresso/hot-coffee-espresso/latte`. They are distinct from numeric modifier `categoryNumber` values. Retain full category paths because uniqueness of bare category IDs across all contexts was not established.
- A product can appear in several categories: 418/Hot is in both Pumpkin Picks and Latte. The 332 menu placements are not 332 unique products.
- Use product number **and form** together. `418` appears as Hot and Iced. Do not infer that every similarly named hot/iced pair shares an ID.
- Menu `defaultSize.sku` joins to detail `sizes[].sku`. For 418/Hot, Grande SKU is `183887`; Iced Grande is `183890`. Hot sizes use SKUs `183885`–`183888`. Preserve SKUs as source strings.
- Detail `sizes[].default` identifies the default size. A food's URL form `single` is not its size code: sampled foods use `1 Piece`. The wrap SKU is `11104540`; croissant SKU is `11083122`.
- Serving volume must come from the correct product/form/size nutrition entry. `Venti` alone does not identify one volume.

## Customization/modifiers

`products[].productOptions` is a recursive group tree with numeric `categoryNumber`, `name`, `displayOrder`, `attributes.unitOfMeasure`, `products`, and optional `children`. Modifier entries use `productNumber`, then `form` with `formCode`, name, availability and modifier `sizes` containing SKU and sizeCode.

Hot latte groups include Milk (239), Flavors (249), Toppings (252), Cold Foams (2212), Tea (251), Sweeteners (689), Cup Options (242), and Espresso & Shot Options (246). Milk Options subgroup 484 includes 2% Milk, Oatmilk and other alternatives. Sample forms include `one`, `qty` and `modifier`; modifier size codes include `add`, `no`, `regular`, `light`, `extra`, and occasionally `sub`. These are source encodings, not drink cup sizes.

Per-size `recipe.default[]` identifies included options, selected sizeCode, quantity and candidate option SKUs. Grande hot PSL includes pumpkin sauce product 101 at quantity 4 and shots product 82 at quantity 2; Tall has 3 and 1. Oatmilk is product 2122556 with add SKU `11112911`. Vanilla Syrup is product 111 with add SKU `109917`; Grande `defaultOptionValues` supplies value 4, matching the UI when adding it.

Do not interpret every option in `defaultOptionValues` as included in the standard recipe. Do not interpret quantity 0 as absent for `one`/`modifier` options: the included 2% milk and whipped cream carry 0 quantities. Some option SKU arrays contain more than one `default: true`; retain `recipe.default[].sizeCode` and the enclosing context rather than selecting the first flag blindly.

Food customization shares the structure but differs in content. The wrap has Condiments group 1919, Sriracha product 2121502, form `qty`, add SKU `11187081`. The croissant has Butter & Spreads and Warming groups, and a Warmed/Not Warmed UI selector.

The captured API describes available choices and defaults but does not expose an explicit, general min/max or dependency rule graph. The only `maximum` field observed in the hot-latte key inspection was part of caffeine nutrition, not a customization limit. UI control types provide clues about selection behavior; they do not prove all validation rules. Comprehensive restrictions remain unknown and were not guessed or probed as edge cases.

## Store context, authentication and availability

All six saved replays returned HTTP 200 JSON without cookies, credentials, authorization headers, referrer or browser-session transfer. `Accept: application/json` was the only explicitly set request header; its necessity was not separately tested. Basic menu/product data is therefore reusable outside the browser in this environment at capture time. This is not a guarantee about future access behavior or checkout authentication.

The selected-store menu used `storeNumber=101`, `ownershipTypeCode=CO`, and `timeZone=GMT-07:00 America/Los_Angeles`. Product detail used only `storeNumber=101`. The store menu contained six TemporarilyUnavailable **placements**, alongside 317 Available placements. No inventory polling, other-store comparisons or pricing requests were performed. Availability labels also occur inside modifier forms; their full store-specific semantics were not investigated.

## Saved responses and provenance

All paths below are relative to `data/raw/starbucks/interactive/`. Each raw response has a neighboring `*-source.json` with URL, query parameters, GET replay method, store context, retrieval timestamp, MIME type, byte count, SHA-256 and discovery evidence.

| Raw response | Purpose |
|---|---|
| `menu/national-menu.json` | Entire returned national hierarchy and product summary catalog |
| `menu/store-101-menu.json` | Entire returned store-context hierarchy, including embedded availability |
| `products/418-hot.json` | No-store hot latte: sizes, standard nutrition, recipe and modifiers |
| `products/418-iced-store-101.json` | Selected-store iced form with its own sizes, nutrition and modifiers |
| `products/371-single-store-101.json` | Wrap nutrition, ingredients, allergens and food condiment options |
| `products/1033-single-store-101.json` | Croissant nutrition, ingredients, allergens, warming/spread options |

Supporting files: `capture-plan.json` lists the observed URLs and destination files; `source.json` inventories the six raw responses and their sidecars. The repeatable capture-only script is `scripts/collect/starbucks-interactive-sources.py`. Run it from the repo with Python 3.9+:

```sh
python3 scripts/collect/starbucks-interactive-sources.py
```

It skips existing snapshots, follows only the explicit capture plan, restricts URLs/query keys to the observed official API family, and refuses JSON containing several common sensitive-field names. It does not collect browser state or automatically crawl the catalog. Delete/relocate a snapshot deliberately before recapturing; do not silently overwrite historical evidence. It preserves each combined response rather than splitting nutrition/modifiers into artificial files.

## What remains before importer work

The primary source design is now established for a **standard-recipe US importer**. No further broad endpoint hunting is needed for that scope. Before claiming complete imported coverage, collect and validate product detail for the remaining national product/form pairs, check all size nutrition/ingredient/allergen fields for missing or exceptional values, and handle repeated category placements and form-specific SKUs correctly. This pass deliberately sampled four detail responses out of 282 national pairs.

For a customization-aware importer, a validated customized-nutrition source/model and fuller selection-rule semantics remain unresolved. The captured options/default recipes alone do not justify customized macro calculations. Decide explicitly whether the first importer supports standard recipes only or requires that extra investigation. Pricing, modifier surcharges, detailed availability behavior, monitoring and edge cases remain deferred as requested.

## Permanent drink coverage expansion

See [permanent-drinks-report.md](permanent-drinks-report.md) for 12 permanent product/form samples, 43 sizes, per-size recipes and modifier catalogs, and one customized-nutrition calculation per sample. Raw responses and provenance are in `interactive/permanent-drinks/`. Three hot espresso samples calculated successfully; nine others returned HTTP 500. Successful responses still omit total carbohydrates.

## Modifier nutrition mechanism audit

See [modifier-nutrition-report.md](modifier-nutrition-report.md) for the bounded five-script search, request/response tracing, partial Quick Mod constants, and evidence that no general per-modifier nutrient table or full-macro calculator mechanism was found.
