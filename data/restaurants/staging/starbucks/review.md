# Starbucks — import review (draft)

Generated 2026-11-18T19:41:45.559Z. Status: **draft**. Not published; the live restaurant index is untouched.

- Structurally valid: **yes**
- Ready for approval: **no**
- Menu models: standard
- Items: 281 (281 standard, 0 build-your-own)
- Ingredients: 0
- Nutrition records: 705, of which 684 have all four core macros
- Records missing core macros: 21
- Unresolved nutrition conflicts: 0
- Projected into the runtime schema: 260 items, 0 ingredients (42 excluded)
- Ids: 944 in the registry, 21 new, 0 conflicts

## Sources

- `starbucks:us:catalog` — https://www.starbucks.com/bff/ordering/menu (official; retrieved 2026-09-10T05:54:56.075295+00:00)
- `starbucks:us:detail` — https://www.starbucks.com/apiproxy/v1/ordering/{productNumber}/{form} (official; retrieved 2026-09-11T00:35:16.265902+00:00)

## Blockers (2)

- `customization_nutrition_unverified` — Milk, syrup and modifier choices and recipe quantities are retained as evidence. The US capture does not establish nutrition for changed builds or the volumes needed for valid substitution deltas.
- `core_nutrition_missing` — 21 record(s) have no published or agreed value for: calories, protein, carbs, totalFat. The values were left empty.

## Infos (1)

- `non_food_merchandise_not_imported` — Shopping-bag merchandise is outside the food menu.
