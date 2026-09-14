# Successful US customized-nutrition calculation

2026-09-09. Scope: identify four code-allowlisted hot drinks and obtain one calculation response. No importer or unrelated investigation.

The loaded product-page code allowlists `406/hot` (Caffè Americano), `407/hot` (Caffè Latte), `408/hot` (Caffè Mocha), and `413/hot` (Caramel Macchiato). Names were verified against the saved official national menu. This is a client UI allowlist, not proof of the server's complete support matrix.

## Successful request

`POST https://www.starbucks.com/apiproxy/v1/ordering/407/hot/nutrition/calculate`

Headers explicitly supplied: `Content-Type: application/json`, `Accept: application/json`. No authentication, cookies, tokens, store or browser-session transfer. HTTP **200**, JSON response.

```json
{"sku":"42","modifiers":[{"sku":"11112911","quantity":1,"replacedSku":"109841"},{"sku":"109917","quantity":2,"replacedSku":null}]}
```

All SKUs were checked against a fresh official `GET /apiproxy/v1/ordering/407/hot` response:

- `42`: Grande hot Caffè Latte, 16 fl oz.
- `11112911`: Oatmilk; replaces included 2% milk SKU `109841`.
- `109917`: Vanilla Syrup; two pumps added, no replaced SKU.

The payload follows the request-builder structure discovered in the actual product-page code. Existing default recipe ingredients are represented by the base SKU; this payload includes the two changes, not the entire recipe.

## Raw response

```json
{"nutritionValues":{"calories":{"displayName":"Calories","unitOfMeasure":"kcal","value":"230"},"fat":{"displayName":"Fat","unitOfMeasure":"g","value":"9"},"sugars":{"displayName":"Sugars","unitOfMeasure":"g","value":"15"},"protein":{"displayName":"Protein","unitOfMeasure":"g","value":"3"}}}
```

| Field | Standard Grande from product detail | Customized calculation |
|---|---:|---:|
| Calories | 190 kcal | 230 kcal |
| Fat | 7 g | 9 g |
| Sugars | 18 g | 15 g |
| Protein | 13 g | 3 g |

The calculation returns changed nutrition values rather than repeating the standard panel. Response `value` fields are **strings**. The response contains only calories, fat, sugars and protein. **Total carbohydrates are absent**, as are sodium, fiber, saturated fat, caffeine, ingredients and allergens. Sugar must not be substituted for total carbohydrates.

One additional control request with `{"sku":"42","modifiers":[]}` returned HTTP 400. Its request is saved; the error body was not retained because the HTTP client raised before reading it. Therefore the baseline comparison above is explicitly against official product-detail nutrition, not a successful empty-modifier calculation. No further endpoint probing was performed.

## Files and meaning for Macro Maxxer

Raw inputs, output and provenance are under `interactive/nutrition-calculation/`:

- `407-hot.json` and `407-hot-source.json`: original product response with valid size, recipe and modifier identifiers.
- `407-hot-request.json`: exact successful POST body.
- `407-hot-calculation-response.json`: unchanged successful response bytes.
- `407-hot-calculation-source.json`: URL, method, headers, retrieval time, status, MIME type and SHA-256.
- `407-hot-baseline-request.json` and `407-hot-baseline-source.json`: unsuccessful empty-modifier control, clearly distinguished from the success.

This is a verified official source for selected customized nutrition fields for this tested drink/configuration. It does not yet support a complete customized Macro Maxxer macro panel because total carbs are missing. Keep standard nutrition and calculated values separate; do not combine customized fat/protein with standard carbs and label the combination fully calculated. Broader product support and calculation accuracy across other configurations remain untested. No importer changes were made.
