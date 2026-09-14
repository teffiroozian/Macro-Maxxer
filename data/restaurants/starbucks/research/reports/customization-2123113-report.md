# Pumpkin Cream Cold Brew: focused customization investigation

2026-09-09. User Chrome tab 785992054, official US product 2123113/iced, no store selected. Investigation shortened at the user's request; no pricing, cart or other-product testing.

## Result

Exact **client UI** rules were partly identified in the actual loaded code. A dynamic nutrition implementation was discovered, but **this cold brew is excluded from its product allowlist**. Its displayed nutrition remains standard-recipe nutrition.

## Rules established

- Quantity stepper maximum comes from `config.maximumModifierAmount`. The live page's inline script contains `"maximumModifierAmount":12`. Product-page code uses selector `C.fl` (module 42723) and stops rendering the increase control when current quantity reaches that value. This is a per-stepper UI cap, not evidence of a 12-total-modifiers limit or server enforcement. No size-dependent cap is used in this component.
- Minimum is 0 for optional additions and recipe options with a `no` modifier size; otherwise an included quantity option bottoms out at 1. Code `Ce` determines removability from `inRecipe` and the existence of `sizeCode === "no"`; stepper `Te` uses `isRemovable ? currentQuantity > 0 : currentQuantity > 1` to show minus.
- Increment/decrement step is 1. Adding an inactive quantity option initializes it from its default quantity, falling back to 1.
- `one` options render one selector for their category; selections carry `exclusiveCategoryNum`. `modifier` choices select one size/amount for that modifier product. Topping/foam amounts are categorical choices such as no/light/regular/extra, not numeric pump quantities. Full reducer-level exclusivity across foam categories was not established.
- Product JSON supplies different size defaults: vanilla syrup product 111 has Tall 1, Grande 2, Venti 3, Trenta 4 pumps. Standard calories are respectively 140, 250, 310, 360. These are direct source values, not calculated custom nutrition.
- No comprehensive dependency graph or server validation response was captured. Milk/shot/foam cross-dependencies, total limits and whether custom selections persist or reset when size changes remain untested in this short pass.

## Nutrition evidence

One combined UI check increased vanilla syrup from 2 to 3 pumps and selected No Pumpkin Cream Cold Foam and No Pumpkin Spice Topping. The header remained 250 calories. Opening full nutrition showed the standard Grande panel: 250 calories, 12 g fat, 31 g carbohydrates, 3 g protein, 55 mg sodium and 185 mg caffeine, plus the standard-recipe disclaimer. No per-modifier nutrition values were found in the product JSON.

The saved `ordering-pdp.js` contains:

- Product allowlist `Ht=["406/hot","407/hot","408/hot","413/hot"]`.
- Eligibility expression combining `isDynamicNutritionEnabled` with `Ht.includes(product/form key)`.
- An explicit Update UI, rather than necessarily automatic calculation on every selection.
- Code for `POST /apiproxy/v1/ordering/{productNumber}/{form}/nutrition/calculate` with body `{sku: baseProductSku, modifiers: [{sku, quantity, replacedSku}, ...]}`.
- Response/state access through `ordering.productNutrition.data.nutritionValues`; rendering accesses calories, fat, sugars and protein. No actual calculation response was captured, so response completeness (including carbohydrates) is unverified.

The saved shared module 54630 further requires an enabled experiment decision and variation `DYNAMIC_NUTRITION_ON`. The current product 2123113/iced is not allowlisted regardless of that flag. No flag was changed, no calculation call was fabricated and no other product was tested.

The calculator's request-builder code distinguishes addition/replacement: selected modifier SKU and quantity are included, and `replacedSku` can reference the default recipe SKU. `one` and `qty` matching uses category keypaths; modifier matching uses option product number. For quantity options, replacement depends on a matching `no` selection in that category. This establishes payload-building behavior for the gated calculator, **not** all ordering validation rules.

## Sources and capture limits

Saved under `interactive/customization-2123113/`:

- `product.json`: credential-free replay of browser-observed `GET https://www.starbucks.com/apiproxy/v1/ordering/2123113/iced`.
- `ordering-pdp.js`: exact observed product-page chunk, including stepper and calculator logic.
- `coreApp.js`: observed bundle containing module 42723 and its config selectors.
- `shared.js`: observed bundle containing module 54630 and the nutrition feature gate.
- `ordering-crust.js`: observed ordering chunk inspected alongside the product page.
- Corresponding `*-source.json` provenance files with source URLs, retrieval times and hashes.
- `evidence.json`: focused code excerpts and live configuration observation, with original-script offsets.

The Chrome connection provides resource URL inventory, not full network request/response logging or arbitrary client-state inspection. The observed relevant URL remained the product-detail URL; that alone cannot prove absence of every request. The allowlist/code and unchanged rendered nutrition provide stronger evidence for this item. Script/API downloads are unauthenticated replays, not exports of original Chrome response bodies. No cookies, tokens or credentials were collected.

## Still missing

Server-enforced validation rules; complete dependency/exclusivity semantics; size-change handling of existing customizations; and an actual successful calculation response from an eligible, feature-enabled product. The calculation endpoint is now a concrete code-backed lead, but customized nutrition for this cold brew was not found.
