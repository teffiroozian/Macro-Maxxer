# Quarter Pounder item-page customization analysis

Canonical captured example: [`raw/quarter-pounder-item-page.json`](raw/quarter-pounder-item-page.json)

The saved file is byte-for-byte identical to the supplied capture (SHA-256 `b6137281218f05b2846fc175ce717b9b1f46ce69b96155bc7804f599000e5987`). It is a DoorDash item-page response for a McDonald's storefront, as shown by the `cdn4dd.com` image URL, DoorDash-shaped item-page fields, and DoorDash item/menu/store identifiers. It is useful ordering evidence, but it is not a response from `us-prod.api.mcd.com`.

## Identity and base product

- Ordering item ID: `25120693134`
- Ordering menu ID: `958481`
- Store ID embedded in recommended-item cursors: `662234`
- Base price: `919` cents (`$9.19`)
- Published base calories: `520`
- Item type: `HAS_NESTED_OPTIONS`
- Matching DNA nutrition record: `item_id=200466`, `external_id=7`, 520 calories

The ordering item ID has no direct numeric relationship to DNA `item_id=200466` or product code `7`. The current join is therefore normalized name + calories; a menu/catalog capture containing McDonald's product code `7` is still needed for a durable ID join.

## Modifier groups

| Ordering group | Proposed role | Rules |
| --- | --- | --- |
| `9605358914` — Remove from Quarter Pounder | Ingredient removals | Optional multi-select; min 0, max 8; 8 options |
| `9605358915` — Extra for Quarter Pounder | Extras and add-ons | Optional multi-select; min 0, structured max 12; 11 options |
| Recommended Beverages | Cross-sell add-ons | Separate menu items, not ingredient customization |
| Recommended Desserts | Cross-sell add-ons | Separate menu items, not ingredient customization |
| Recommended Sides And Apps | Cross-sell add-ons | Separate menu items, not ingredient customization |

The visible subtitle for the Extra group says “Select up to 11” while `maxNumOptions` is 12. Recommended groups have similar subtitle/structured-limit discrepancies. The adapter should preserve the structured limit but flag the mismatch until cart validation proves which is enforced.

## Option mapping

Every ordering option has a stable option ID, label, price in minor currency units, currency, a calorie display string, and `defaultQuantity=0`. The removal and extra groups are action lists, not a default-recipe list.

For runtime semantics:

- `No X` maps to `CartCustomization.action="remove"` for ingredient X.
- `Extra X` maps to `action="extra"` for an already-included ingredient.
- `Add X` maps to `action="add"` for a non-default ingredient.
- Recommended items map more naturally to `addonGroups`/`CartSelectionOption`, not ingredient categories.

Ordering option IDs must be retained as source identities. Removal and extra IDs are distinct even when they refer to the same logical ingredient; for example American Cheese uses remove ID `43914730822` and extra ID `43914730830`.

## Remove/add/extra behavior

The response explicitly supports removing mustard, ketchup, slivered onions, pickle, American cheese, beef, salt, and bun.

It supports extra mustard, ketchup, onions, pickle, cheese, beef, and salt. It separately supports adding bacon, lettuce, tomato, and mayonnaise.

There is no `light` action and no substitution/swap group in this capture. The `itemPreferences.substitutionPreferences` block describes what DoorDash should do if the entire ordered item is unavailable; it is not an ingredient substitution feature.

No option-level quantity controls are exposed: `minOptionChoiceQuantity` and `maxOptionChoiceQuantity` are null, and every option starts at zero. The safest interpretation is boolean selection of each action, not arbitrary ingredient counts.

## Prices

Removals are free. Extra mustard, ketchup, onions, pickle, and salt are free. Paid options are:

- Extra cheese: $1.99
- Extra beef patty: $2.39
- Add bacon: $3.59
- Add lettuce: $0.59
- Add tomato: $0.79
- Add mayonnaise: $0.39

Prices are store/channel scoped and should not become restaurant-global ingredient prices.

## Calories

The option response publishes calorie values for most removal/extra/add actions: mustard 5, ketchup 20, onions 5, pickle 0, cheese 50, beef 220, bun 180, bacon 110, lettuce 0, tomato 0, and mayonnaise 100. Salt is blank.

These values are not proven configured-item deltas. In particular, DNA reports 100 calories of cheese in the default Quarter Pounder recipe, while “No American Cheese” displays 50 calories. DNA also reports ketchup 15, mustard 0, and onions 0 versus 20/5/5 in this ordering response. Until a configured-cart response shows the resulting calories, treat these as action-associated calorie units, not authoritative subtraction results.

Only calories are supplied. Protein, carbs, fat, sodium, and the rest of `Nutrition` are absent, so the response cannot directly create valid Macro Maxxer ingredient nutrition records.

## Mapping to the existing builder schema

Direct or near-direct mappings:

| Ordering field | Macro Maxxer target |
| --- | --- |
| Group `id` and `name` | `IngredientItemCategory.id` and `name` |
| Group `minNumOptions` | `IngredientCategoryRule.minQuantity` |
| Group `maxNumOptions` | `IngredientCategoryRule.maxQuantity` |
| Group `isOptional` / min 0 | `allowNone` |
| Option `id` and `name` | source identity and ingredient/action label |
| `defaultQuantity` | initial action selection; all zero here |
| Removal/extra/add prefixes | `CartCustomization.action` |
| Recommended item IDs | `AddonGroup.itemIds` / `CartSelectionOption.itemId` candidates |

Mappings that require normalization:

- Current `MenuItem.ingredients` represents included logical ingredients, whereas this response represents inverse actions such as “No Ketchup.” The adapter must combine the ordering actions with DNA default components to construct the default selected ingredient state.
- Remove and extra option IDs need a shared logical/canonical ingredient identity.
- Recommended-item groups should be excluded from the ingredient builder and modeled as optional cross-sells.
- Ordering prices have no destination in the current menu, ingredient, addon-group, cart-customization, or selection-option types.
- Calorie-only action data cannot satisfy the required `Nutrition` core macros.

## Builder fields still missing

- Full modifier nutrition: protein, carbs, total fat, and other nutrients.
- Proven configured-item calorie totals/deltas, especially multi-unit defaults such as cheese.
- A direct McDonald's product-code join between ordering item `25120693134` and DNA `external_id=7`.
- Explicit shared identity tying `No X`, `Extra X`, and the DNA component together.
- Per-option quantity bounds or confirmation that options are strictly boolean.
- Conflict rules, such as whether “No Cheese” and “Extra Cheese” can be selected together.
- Whether group limits count distinct options or aggregate quantities.
- A price field in the Macro Maxxer schema and a policy for store/channel-specific prices.
- Location availability/outage status for each modifier.
- Actual cart serialization fields required to submit each option.
- Ingredient-level substitutions/swaps.

## Additional captures required before implementation

1. Big Mac item page — validates repeated ingredients/layers and Big Mac Sauce removal/extra behavior.
2. McCrispy item page — validates chicken-sandwich toppings and whether butter/fillet/bun are removable.
3. Egg McMuffin item page during breakfast — validates daypart availability and breakfast bread/protein/egg/cheese behavior.
4. Chicken McNuggets item page for at least two counts — validates sauce choice groups, default “No Sauce,” count-dependent sauce limits, and size IDs.
5. Caramel Macchiato in small and large — validates size-dependent milk, syrup, espresso, drizzle, and quantity-style drink modifiers.
6. Quarter Pounder cart/totals responses for default, no cheese, extra cheese, no beef, extra beef, and one combined configuration — establishes enforced rules, prices, serialization, and whether configured calories change.
7. The same Quarter Pounder from a second store — separates stable product/modifier identities from location-specific DoorDash IDs, availability, and prices.
8. A direct McDonald's-app `/menus` capture for the same store/product, if obtainable — verifies the McDonald's product-code join and prevents the adapter from depending solely on DoorDash identifiers.

Implementation should wait for at least captures 1–6. Captures 7–8 are needed before claiming stable multi-location identity and authoritative McDonald's provenance.
