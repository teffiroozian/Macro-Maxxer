# Modifier nutrition and calculator mechanism audit

2026-09-09. Scope: acquired official Starbucks client code and previously captured calculation behavior. No new menu/product discovery, modifier detail retries, or speculative endpoint probes. No new network calls were needed because the search produced no additional nutrition endpoint to test.

## Finding

**No general per-modifier nutrition dataset or mechanism for complete customized macros was found in the acquired client/API data.** The accessible calculator accepts recipe identifiers and returns a limited aggregate summary. Its underlying nutrient database, calculation implementation, and any downstream service addresses are not exposed in these artifacts. This is a bounded finding, not a claim that Starbucks has no internal service or that every possible public asset has been searched.

## Code evidence and data flow

Searched all five acquired first-party scripts (879,057 bytes): `ordering-pdp.js`, `coreApp.js`, `shared.js`, `ordering-crust.js`, and `8902.js`. The [search evidence](interactive/modifier-nutrition-audit/client-search.json) records file SHA-256, character offsets and contexts for nutrition/nutrient/calorie/carbohydrate terms, modifier/ingredient nutrition, and nutrition service/lookup/table terms. Existing script provenance sidecars retain original official URLs.

1. **Input builder:** the PDP constructs `modifiers` from selected option SKUs, quantities and replacement matching against the base recipe. It submits `POST /apiproxy/v1/ordering/${productNumber}/${form}/nutrition/calculate` with `{sku: baseProductSku, modifiers:[{sku,quantity,replacedSku}]}`. No nutrient amounts, ingredient weights, nutrition database IDs, calculation mode, or expansion parameters are submitted. There is one literal reference to this endpoint across the five scripts.
2. **Response path:** the POST result is dispatched unchanged into product-nutrition state. Selector `St` reads `ordering.productNutrition.data.nutritionValues`; display code selects calories, fat, sugars and protein. The [calculator excerpt](interactive/modifier-nutrition-audit/calculator-client-excerpt.txt) preserves the builder, request, selector and display flow with original offsets.
3. **No client calculation:** the traced path constructs identifiers, fetches the aggregate result and formats it. It contains no ingredient summation formula or per-modifier nutrient lookup. Base nutrition passed as `trackingAttributes.baseNutrition` is used for success/error tracking; it is **not part of the calculation POST body**. `base_nutrients` and `calculated_nutrients` references in coreApp serialize already-known values for an event; they are not a second calculation service. No tracking requests were investigated.
4. **Standard nutrition is separate:** `Ft` reads `totalCarbs` from standard nutrition only to extract nested sugars for the baseline summary. The full nutrition component reads the selected standard recipe's nutrition object. It does not obtain total carbohydrates from calculated output.
5. **Closest lookup-like data:** `8902.js` contains hardcoded `nutritionBadge` text for specific Quick Mod presets, including calorie/sugar reductions and protein increases by drink/size. For example, a Grande Latte “Make it Lighter” badge says `-90 calories, -9g sugar`; its protein preset says `+15g protein`. These are preset-level partial deltas, not general ingredient values, a full macro table, or a reusable calculation formula. Their existence should not be confused with absence of all nutrition-related constants.
6. **Modifier data inspection:** recursive field-name checks of `productOptions` and per-size `defaultOptionValues` in all 12 saved permanent-drink responses found zero nutrient/calorie/carbohydrate/protein/sugar/fat/fiber/sodium keys. The [field audit](interactive/modifier-nutrition-audit/modifier-field-search.json) records every inspected file. Modifier names mentioning protein or sugar are labels, not nutrient quantities. This search is supporting evidence, not proof against an arbitrarily encoded hidden table.

No second nutrition calculation endpoint, modifier nutrient endpoint, downstream nutrition-service hostname, or alternate full-response selector was identified in the searched code. The public proxy's server implementation is not included in these browser bundles. Browser requests can reveal browser-to-proxy calls, but cannot reveal an unexposed server-to-server call made behind that proxy. Thus the name and implementation of any internal service remain unknown; inventing routes would not establish them.

## API evidence

The unchanged [permanent-drink captures](interactive/permanent-drinks/source.json) provide 12 direct calculation tests with valid offered modifier SKUs. Hot Latte, Mocha and Caramel Macchiato succeeded. The other nine returned generic HTTP 500 errors; Hot Chai has code `006-002-017`, and the other eight have `006-002-002`. The earlier [coverage tests](calculator-coverage-report.md) also include a simultaneous successful Latte control alongside failures. These responses do not disclose an internal URL, missing field, nutrient-service name, or actionable validation instruction.

A complete successful [Latte response](interactive/permanent-drinks/407-hot-calculation.json) is:

```json
{"nutritionValues":{"calories":{"displayName":"Calories","unitOfMeasure":"kcal","value":"230"},"fat":{"displayName":"Fat","unitOfMeasure":"g","value":"7"},"sugars":{"displayName":"Sugars","unitOfMeasure":"g","value":"26"},"protein":{"displayName":"Protein","unitOfMeasure":"g","value":"12"}}}
```

The corresponding [request](interactive/permanent-drinks/407-hot-calculation-request.json) adds two Vanilla Syrup pumps to base SKU `42`. This is an aggregate customized result, not modifier nutrition. Total carbohydrates are absent from the complete body, not merely dropped by the UI. Difference calculations against a rounded standard recipe would not create authoritative, generally applicable per-modifier data.

## What prevents broader complete calculation

- **Known UI limit:** feature experiment plus the four hot-drink allowlist restricts exposure.
- **Observed backend limitation:** direct calls already bypassed that UI gate and still failed for the nine permanent-drink configurations. A hard backend allowlist is not proven; missing recipe mappings or service defects could explain the generic failures.
- **Incomplete successful contract:** even successful bodies omit total carbohydrates and ingredient/modifier contributions.
- **Missing mechanism:** an authoritative nutrient-to-SKU/quantity mapping and recipe calculation rules, or a functioning broad-menu endpoint returning complete nutrients. Neither was found in accessible captured data.

Macro Maxxer cannot derive authoritative full customized macros from these sources today. Preserve the successful aggregate fields separately from standard nutrition; do not substitute sugars for carbohydrates or mix customized fat/protein with standard carbs and label the result fully calculated. No importer changes were made.
