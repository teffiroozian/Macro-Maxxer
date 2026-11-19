# MOD Pizza: extraction (replay)

Run 2026-11-19T00:31:31.397Z from discovery run 2026-11-18T22:12:16.592Z (replay). Freshness window 90 days.
Extraction only reads and structures sources. Nothing is joined, reconciled, estimated or published, and the live restaurant data is untouched.

## Coverage

| Need | Status | Records | Sources | Discovery said |
|---|---|---:|---|---|
| calories | extracted | 19505 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168`, `mod:modpizza-com-nutrition` | found |
| protein | unavailable | 0 | none | unverified |
| carbs | unavailable | 0 | none | unverified |
| totalFat | unavailable | 0 | none | unverified |
| satFat | unavailable | 0 | none | unverified |
| transFat | unavailable | 0 | none | unverified |
| cholesterol | unavailable | 0 | none | unverified |
| sodium | unavailable | 0 | none | unverified |
| fiber | unavailable | 0 | none | unverified |
| sugars | unavailable | 0 | none | unverified |
| catalog | extracted | 86 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168` | found |
| customization | extracted | 8516 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168` | found |
| portions | extracted | 18994 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168` | found |
| allergens | extracted | 81 | `mod:modpizza-com-nutrition`, `mod:modpizza-com-allergen` | found |
| ingredients | **needs verification** (stale source only) | 72 | `mod:modpizza-com-allergen` | needs_verification |

## Sources

| Source | Method | Status | Freshness | Extractors | Items | Groups | Options | Portions | Rows |
|---|---|---|---|---|---:|---:|---:|---:|---:|
| https://orders.modpizza.com/store/4080 | embedded_json | extracted | current (29 d) | embedded:next_data | 45 | 5315 | 6390 | 11911 | 0 |
| https://orders.modpizza.com/store/4168 | embedded_json | extracted | current (29 d) | embedded:next_data | 41 | 3201 | 3877 | 7083 | 0 |
| https://modpizza.com/nutrition | official_html | extracted | current (86 d) | html-repeated-rows | 0 | 0 | 0 | 0 | 109 |
| https://modpizza.com/allergen | official_html | extracted | **needs verification** (121 d old) | html-declarations | 0 | 0 | 0 | 0 | 0 |
| https://modpizza.com/menu | official_html | empty | current (87 d) | none | 0 | 0 | 0 | 0 | 0 |

### Nutrients per source (records with a clean published value)

- `mod:orders-modpizza-com-store-4080`: calories 12150
- `mod:orders-modpizza-com-store-4168`: calories 7257
- `mod:modpizza-com-nutrition`: calories 98; 11 records keep an unclean printed value as raw text
- `mod:modpizza-com-allergen`: none
- `mod:modpizza-com-menu`: none

## Not read

- https://api.koala.io/v1/ordering/store-locations/4080/menu?wanted-at=asap: Requires login or a key. Not worked around.

## Limitations

- No extracted source publishes protein, carbs, totalFat. These stay empty; they are never estimated.
- Replay run: sources are the saved evidence, not a live fetch. A live run is needed before these records count as current.
- https://modpizza.com/menu: empty (Fetched, but no extractor recognised menu or nutrition records in it.).
- Ingredient declarations are not extracted yet (no recognised structured ingredient lists in the sources read).

