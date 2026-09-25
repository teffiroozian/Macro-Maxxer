# McDonald's US ordering/customization source investigation

Captured 2026-09-16. This is research-only evidence. It does not feed the generated McDonald's dataset or runtime integration.

The Quarter Pounder partner-ordering item page is the current canonical customization-shape example. See [`quarter-pounder-analysis.md`](quarter-pounder-analysis.md) and [`raw/quarter-pounder-item-page.json`](raw/quarter-pounder-item-page.json). Its DoorDash provenance and remaining validation requirements are documented there.

## Location context

- Restaurant: McDonald's, 2801 Mission Street, San Francisco, CA 94110
- National store number: `3228`
- McDonald's location identifier in the independently published McBroken store snapshot: `US-3228`
- The snapshot marks the restaurant as supporting mobile ordering.

McDonald's states that menu availability varies by location, so a restaurant context is required for ordering data.

## Confirmed official sources

### Static US mobile-ordering category configuration

`GET https://www.mcdonalds.com/GMA/gma/us-prod/5.0/json/menu.json`

The live response is anonymous and contains dayparts plus category IDs, display order, localized category names, and category images. It does not contain products, prices, modifier groups, or nutrition. On the capture date it included separate breakfast/lunch/dinner/late-night category sets, which confirms that category and product visibility are daypart-dependent. The complete response is in `raw/mobile-menu-category-config.json`.

### Authenticated US restaurant API

`GET https://us-prod.api.mcd.com/exp/v1/restaurant/{nationalStoreNumber}?filter=full&storeUniqueIdType=NatlStrNumber`

The endpoint is live and identifies itself as the `Restaurant` service. Without the app bearer token it rejects the request before returning restaurant catalog/availability data. The raw response for store `3228` is in `raw/store-3228-detail-unauthenticated.json`.

### Authenticated US GMaL menu API

`GET https://us-prod.api.mcd.com/exp/v1/menu/gmal/restaurants/{nationalStoreNumber}/menus`

The endpoint is live and identifies itself as the `Menu` service. The gateway internally resolves the request to `/prod01/menu/gmal/restaurants/3228/menus`. Without the app bearer token it rejects the request before returning a menu. The raw response is in `raw/store-3228-menu-unauthenticated.json`.

### Token endpoint

`POST https://us-prod.api.mcd.com/v1/security/auth/token`

The endpoint requires the mobile application's Basic client credential. An anonymous request returns the captured `TokenGenerator` authorization error in `raw/token-endpoint-unauthenticated.json`. No credential was copied into this repository.

### Current Android ordering/cart routes

Static inspection of the publisher-signed US Android app (package `com.mcdonalds.app`) confirms the same `us-prod.api.mcd.com` host and token endpoint. The current app also contains cart/order routes including `/api/v1/carts`, `/api/v1/carts/totals`, `/api/v1/carts/validations`, and versioned order routes. These establish that final availability and price validation happen server-side, but endpoint strings alone do not establish their request/response schemas.

## Representative item ID mapping

The existing nutrition endpoint has two materially different identifier families:

| Product | `item-details` ID | Ordering/menu product code candidate (`external_id`) | Size codes already present |
| --- | ---: | ---: | --- |
| Big Mac | `200463` | `5` | — |
| McCrispy | `203747` | `383` | — |
| Egg McMuffin | `200298` | `46` | — |
| Chicken McNuggets, 4 pc | `200692` | `483` | `60` (6 pc), `5280` (10 pc), `61` (20 pc), `1332` (40 pc) |
| Caramel Macchiato, small | `203087` | `2827` | `2804` (medium), `2753` (large) |

The `200xxx` IDs belong to the public DNA nutrition catalog. Historical official app clients submit `external_id` values as `ProductCode`, and the current menu model uses product IDs/codes rather than DNA `item_id` values. Therefore `external_id` is the strongest join candidate, but it remains unverified against a successful current US `/menus` response.

Component IDs such as `300038` (beef patty) and `301554` (Big Mac Sauce) are DNA nutrition-component IDs. Some components also have a much smaller `product_external_id` (for example patty `2`, pickles `5`, onions `6`), but many do not. They cannot yet be assumed to equal current ordering modifier IDs.

## What each source can currently prove

| Capability | Static `menu.json` | Restaurant detail | GMaL `/menus` | Cart validation | DNA `itemDetails` |
| --- | --- | --- | --- | --- | --- |
| Dayparts/category ordering | Yes | Unknown until authenticated | Expected | No | No |
| Location availability/outages | No | Endpoint confirmed; payload blocked | Expected | Final validation | No |
| Product/order codes | No | Unknown until authenticated | Expected | Submitted codes | `external_id` join candidate |
| Modifier groups/options/defaults | No | Unknown | Expected but not captured | Selected configuration only | Only three legacy mutex groups |
| Removal/extras/min/max/substitutions | No | Unknown | Unknown until successful response | Likely validates constraints | No general support |
| Location pricing | No | Unknown | Expected | Totals endpoint is authoritative | No |
| Modifier nutrition | No | No evidence | No evidence | No evidence | Calories/kJ only for recipe components |

“Expected” means implied by the endpoint's role and the ordering client, not verified US payload fields.

## Conclusion

A reliable adapter is not yet justified. The official infrastructure clearly has restaurant-scoped menu and cart-validation services, and `external_id` is a plausible bridge from nutrition records to ordering products. However, successful US menu payloads for the five representative products could not be captured anonymously: the API requires the official mobile client's bearer-token flow, whose token endpoint itself requires an app client credential.

The next evidence-gathering step should be an authorized network export from the user's own current McDonald's app session (HAR/Charles/Proxyman), with secrets and customer data redacted. Capture `/menus`, the five product-detail/customization interactions if separate calls occur, and cart validation/totals before and after one modifier change. That is required to verify modifier cardinality, removability, option codes, prices, outages, and whether nutrition deltas are ever returned.

Do not implement a Chick-fil-A-style adapter from the current evidence alone.
