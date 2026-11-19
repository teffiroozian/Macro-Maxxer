# MOD Pizza: extraction (live)

Run 2026-11-19T01:51:39.571Z from discovery run 2026-11-19T00:35:14.128Z (live). Freshness window 90 days.
Extraction only reads and structures sources. Nothing is joined, reconciled, estimated or published, and the live restaurant data is untouched.

## Coverage

| Need | Status | Records | Sources | Discovery said |
|---|---|---:|---|---|
| calories | extracted | 21615 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168`, `mod:modpizza-com-nutrition`, `mod:modpizza-com-mod-fresh-nutrition`, `mod:modpizza-com-menu` | found |
| protein | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| carbs | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| totalFat | **needs verification** (stale source only) | 44 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| satFat | **needs verification** (stale source only) | 38 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| transFat | **needs verification** (stale source only) | 13 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| cholesterol | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| sodium | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| fiber | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| sugars | **needs verification** (stale source only) | 66 | `mod:modpizza-com-mod-fresh-nutrition` | needs_verification |
| catalog | extracted | 112 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168`, `mod:modpizza-com-menu` | found |
| customization | extracted | 9373 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168` | found |
| portions | extracted | 23673 | `mod:orders-modpizza-com-store-4080`, `mod:orders-modpizza-com-store-4168`, `mod:modpizza-com-nutrition`, `mod:modpizza-com-mod-fresh-nutrition`, `mod:modpizza-com-menu` | found |
| allergens | extracted | 81 | `mod:modpizza-com-nutrition`, `mod:modpizza-com-allergen` | found |
| ingredients | **needs verification** (stale source only) | 91 | `mod:modpizza-com-allergen` | needs_verification |

## Sources

| Source | Method | Status | Freshness | Extractors | Items | Groups | Options | Portions | Rows | Declarations |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| https://orders.modpizza.com/ | official_html | empty | current (1 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |
| https://orders.modpizza.com/store/4080 | embedded_json | extracted | current (1 d) | embedded:next_data | 44 | 4674 | 4345 | 11756 | 0 | 0 |
| https://orders.modpizza.com/store/4168 | embedded_json | extracted | current (1 d) | embedded:next_data | 46 | 4699 | 4345 | 11749 | 0 | 0 |
| https://orders.modpizza.com/#rendered | browser_rendered | empty | current (1 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |
| https://api.koala.io/configurations/schema/v1/config/label/web-config | api_json | network_blocked | current (30 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |
| https://modpizza.com/ | official_html | empty | current (3 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |
| https://modpizza.com/nutrition | official_html | extracted | current (86 d) | html-repeated-rows | 0 | 0 | 0 | 0 | 109 | 0 |
| https://modpizza.com/mod-fresh-nutrition/ | official_html | extracted | **needs verification** (1207 d old) | html-repeated-rows | 0 | 0 | 0 | 0 | 98 | 0 |
| https://modpizza.com/allergen | official_html | extracted | **needs verification** (121 d old) | html-declarations | 0 | 0 | 0 | 0 | 0 | 91 |
| https://modpizza.com/menu | official_html | extracted | current (87 d) | html-menu-cards | 22 | 0 | 0 | 15 | 67 | 0 |
| https://modpizza.com/faq | official_html | empty | current (38 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |
| https://modpizza.com/#rendered | browser_rendered | empty | current (3 d) | none | 0 | 0 | 0 | 0 | 0 | 0 |

### Nutrients per source (records with a clean published value)

- `mod:orders-modpizza-com`: none
- `mod:orders-modpizza-com-store-4080`: calories 10685
- `mod:orders-modpizza-com-store-4168`: calories 10660. Content changed since discovery (sha256 differs).
- `mod:orders-modpizza-com`: none. Content changed since discovery (sha256 differs).
- `mod:api-koala-io-configurations-schema-v1-config-label-web-config`: none
- `mod:modpizza-com`: none. Content changed since discovery (sha256 differs).
- `mod:modpizza-com-nutrition`: calories 98; 11 records keep an unclean printed value as raw text. Content changed since discovery (sha256 differs).
- `mod:modpizza-com-mod-fresh-nutrition`: calories 87, totalFat 44, satFat 38, cholesterol 66, sodium 66, carbs 66, fiber 66, sugars 66, protein 66, transFat 13; 65 records keep an unclean printed value as raw text. Content changed since discovery (sha256 differs).
- `mod:modpizza-com-allergen`: none. Content changed since discovery (sha256 differs).
- `mod:modpizza-com-menu`: calories 85; 1 records keep an unclean printed value as raw text. Content changed since discovery (sha256 differs).
- `mod:modpizza-com-faq`: none. Content changed since discovery (sha256 differs).
- `mod:modpizza-com`: none. Content changed since discovery (sha256 differs).

## Limitations

- protein, carbs, totalFat come only from sources older than 90 days. Every such record is flagged needs_verification and must not be approved automatically.
- https://orders.modpizza.com/: empty (Fetched, but no extractor recognised menu or nutrition records in it.).
- https://orders.modpizza.com/#rendered: empty (Fetched, but no extractor recognised menu or nutrition records in it.).
- https://api.koala.io/configurations/schema/v1/config/label/web-config: network_blocked (blocked_by_robots: disallowed by robots.txt).
- https://modpizza.com/: empty (Fetched, but no extractor recognised menu or nutrition records in it.).
- https://modpizza.com/faq: empty (Fetched, but no extractor recognised menu or nutrition records in it.).
- https://modpizza.com/#rendered: empty (Fetched, but no extractor recognised menu or nutrition records in it.).

