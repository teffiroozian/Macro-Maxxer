# Starbucks calculator: backend coverage and missing macros

Tested 2026-09-09, directly against official US endpoints without credentials. No pricing/menu discovery, importer changes, feature-flag manipulation or guessed response-mode parameters.

## Conclusion

**We cannot currently obtain complete customized macros for the broader menu from this source.** Two separate limitations are established:

1. The client explicitly gates its calculator UI to four hot product/form pairs and an experiment flag.
2. The backend failed all four tested non-allowlisted configurations, while an allowlisted positive control succeeded in the same session. Even the successful response omits total carbohydrates.

The failures are generic HTTP 500 errors, not an explicit “unsupported product” response. Thus a hard server-side allowlist is **not proven**. Unsupported recipe data, modifier mappings or another backend defect could explain them. We have demonstrated a backend failure for these valid sampled configurations, not universal failure for every possible configuration of those drinks.

## Direct backend tests

Fresh product-detail JSON supplied each default Grande size SKU and offered modifier SKU. Removal requests reference the actual default recipe SKU. All requests used POST, `Content-Type: application/json`, `Accept: application/json`, no cookies, no token and no store parameter.

| Product/form | Base SKU | Change | Modifier / replaced SKU | Result |
|---|---|---|---|---|
| 418/hot — Pumpkin Spice Latte | 183887 | Remove whipped cream | 109893 / 109891, quantity 1 | HTTP 500 |
| 2123113/iced — Pumpkin Cream Cold Brew | 11109918 | Remove pumpkin cream cold foam | 11123688 / 11123689, quantity 1 | HTTP 500 |
| 483/iced — Coffee Frappuccino | 11002660 | Add 2 vanilla pumps | 109917 / null, quantity 2 | HTTP 500 |
| 2121342/iced — Strawberry Açaí Refresher | 11051828 | Add 2 vanilla pumps | 109917 / null, quantity 2 | HTTP 500 |
| 407/hot — Caffè Latte, positive control | 42 | Oatmilk replacement + 2 vanilla pumps | Previously successful exact payload | **HTTP 200** |

Each endpoint is `https://www.starbucks.com/apiproxy/v1/ordering/{product}/{form}/nutrition/calculate`. Complete request payloads are saved, not merely this table. The same error body was returned by all four negative tests:

```json
{"error":{"statusCode":500,"error":"Internal Server Error","message":"An internal server error occurred","code":"006-002-002"}}
```

The successful contemporaneous control makes a general outage or blanket missing-authentication requirement unlikely. Its success does not exclude product-dependent service defects or access behavior.

## Complete successful response, not just UI-selected fields

The complete JSON response from the repeated latte control is:

```json
{"nutritionValues":{"calories":{"displayName":"Calories","unitOfMeasure":"kcal","value":"230"},"fat":{"displayName":"Fat","unitOfMeasure":"g","value":"9"},"sugars":{"displayName":"Sugars","unitOfMeasure":"g","value":"15"},"protein":{"displayName":"Protein","unitOfMeasure":"g","value":"3"}}}
```

There are no additional top-level objects or hidden nested facts in this response. Values are strings. Total carbohydrates, fiber, sodium, saturated fat and caffeine are absent. Missing carbohydrates are a limitation of the returned body, **not just the UI discarding a carbohydrate field**. Sugar cannot stand in for carbs; inferring carbs from rounded calories/fat/protein would not produce authoritative values.

## Client JavaScript search and parsing

Searched every occurrence of the requested calculator terms in five acquired first-party application scripts relevant to this page: `ordering-pdp`, `ordering-crust`, `coreApp`, `shared`, and dependency chunk `8902`. This is exhaustive within those saved files, not every unvisited lazy chunk or Starbucks deployment. Third-party/vendor analytics libraries were not searched.

`interactive/calculator-coverage/client-reference-search.json` records every match, original file and character offset for `nutrition/calculate`, all four allowlist members, dynamic-nutrition references, `nutritionValues`, modifier-nutrition variants, and carbohydrate terms.

Findings:

- **One `nutrition/calculate` reference** in `ordering-pdp.js`: constructs POST path `/apiproxy/v1/ordering/${productNumber}/${lowercaseForm}/nutrition/calculate` and body `{sku: baseProductSku, modifiers: modifiersList}`. No query parameters, alternate mode, include/expand selector, additional-nutrient request flag or related calculator endpoint appears in this call path.
- **UI allowlist:** `Ht=["406/hot","407/hot","408/hot","413/hot"]`, corresponding to Caffè Americano, Caffè Latte, Caffè Mocha and Caramel Macchiato. Eligibility combines this membership test with `isDynamicNutritionEnabled`.
- **Flag:** shared module 62794 names experiment `dynamic_nutrition_calculator` and enabled variation `on`; module 54630 requires a loaded, enabled decision and that variation. No flag was modified or forced. This governs UI exposure, not an authentication token required by the successful direct POST.
- **Response parsing:** selector `St` reads `ordering.productNutrition.data.nutritionValues`. The successful response is dispatched into nutrition state. Display code reads `calories`, `fat`, `sugars` and `protein`; it converts them to display values and compares old/new summary values. No local nutrient formula or per-modifier nutrient table was found in the searched calculator path.
- The `totalCarbs` match in the PDP code reads **standard** `selectedSize.nutrition.additionalFacts` to obtain its nested sugars for the baseline summary. It is not a carbohydrate field from the calculation response.
- Modifier payload construction uses `sku`, `quantity`, `replacedSku`; it does not submit nutrient amounts. Replacement matching uses default recipe information and option/category identities.
- The other `413/hot` match in `8902.js` belongs to a separate product list adjacent to quick-mod content, not a second nutrition-calculator allowlist. Protein badge copy in that chunk is not a general modifier nutrition table.
- No `modifierNutrition`/`nutritionModifier` data structure was found. No alternate calculator response mode or second calculation endpoint was identified in the searched code. Unsupported guessed parameters were not sprayed at the service.

## Saved evidence

Under `data/raw/starbucks/interactive/calculator-coverage/`:

- Four `*-product.json` originals and provenance sidecars.
- Four `*-calculation-request.json`, complete `*-calculation.json` error bodies and provenance sidecars.
- `407-hot-positive-control-request.json`, complete successful `407-hot-positive-control.json`, and provenance sidecar.
- `8902.js` and its URL/hash provenance; prior exact scripts remain in `interactive/customization-2123113/`.
- `client-reference-search.json`: all search hits within the defined JS scope.

All source bodies retain their original bytes; metadata records statuses, retrieval times and SHA-256. No sensitive browser data was collected.

## Implication for Macro Maxxer

UI support is definitely restricted; backend support is operationally insufficient for the four tested non-allowlisted examples. We must not advertise broader customized nutrition as supported based solely on discovering the endpoint. For supported examples, the returned four-field summary still cannot populate complete customized macros because total carbohydrates are missing.

What remains unknown is **why** the backend returns code 006-002-002 for these recipes and whether another official, documented/observed source provides a full customized nutrient panel. Neither the captured errors nor the available client code reveals the internal cause. No evidence found here justifies claiming that removing the UI allowlist would solve either problem.
