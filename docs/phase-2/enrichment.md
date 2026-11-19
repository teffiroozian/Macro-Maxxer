# Phase 2 · Optional data enrichment

Add `--enrich` to the existing extraction-backed pipeline. The enrichment pass reviews the same extraction, normalized targets, and validation findings. It writes `enrichment.json` and `enrichment.md` beside the draft under `data/restaurants/staging/<id>/normalization/`. Verified metadata is keyed by draft target and field. The source record, URL, locator, capture hash, date, and flags are recorded in the JSON.

```sh
npm run pipeline -- mod-pizza --from-extraction --enrich
npm run pipeline -- chipotle --from-extraction /path/to/chipotle/extraction-records.json --enrich
```

- **Verified** means current, linked, attributable evidence supports a metadata field for the captured scope. A measured serving needs an explicit amount and unit.
- **Manual review** covers dated evidence, unresolved nutrition, withheld calculator panels, mismatched measurements, and name-only leads. These entries carry candidates and their provenance.
- **Unavailable** means the evidence reviewed had no usable candidate for that field.

The pass leaves draft nutrition, ordering rules, production data, and approval status unchanged. It uses saved evidence and makes no network requests. If additional public official evidence is collected, supply it through the existing extraction workflow in a new extraction run. Use the corresponding records and summary together.

## Pilot results

| Field checks | MOD verified | MOD review | MOD unavailable | Chipotle verified | Chipotle review | Chipotle unavailable |
|---|---:|---:|---:|---:|---:|---:|
| Nutrition | 0 | 393 | 39,371 | 0 | 744 | 16 |
| Ingredient declarations | 0 | 113 | 41 | 0 | 0 | 54 |
| Measured portions | 0 | 45 | 12,445 | 270 | 205 | 4 |
| Customization | 1,058 | 0 | 844 | 0 | 0 | 8 |

Counts are target-and-field checks, so one ingredient can yield several gaps and one verified fact can appear in multiple scoped choices.

- **MOD Pizza:** The ordering capture verifies whether user selection and quantity selection are supported. The public nutrition page still directs readers to request additional nutrition. The July 2023 macro rows and dated ingredient declarations remain review evidence. There is no verified translation from a national reference serving to each ordering topping amount. The existing information-request draft remains unsent. [MOD nutrition](https://modpizza.com/nutrition/) · [MOD allergen information](https://modpizza.com/allergen/)
- **Chipotle:** The U.S. calculator capture supplies explicit amounts and units for 270 scoped servings. This includes normal portions and leaves unsupported Half/Extra nutrition open. The official U.S. allergen page is an allergen matrix, and the ingredient URL reviewed did not expose complete item-level declarations in the accessible response. The 2025 U.S. PDF remains dated evidence. The newer official UK guide was excluded because its portions and recipes are from a different market. [U.S. calculator](https://www.chipotle.com/nutrition-calculator) · [U.S. allergen information](https://www.chipotle.com/allergens) · [U.S. ingredients](https://www.chipotle.com/ingredients) · [UK nutrition guide](https://www.chipotle.com/content/dam/chipotle/menu/nutrition/2026/eu/UK_Allergen_Guide_Nov2026%202-94.pdf)
