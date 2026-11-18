# McDonald's — import review (draft)

Generated 2026-11-18T19:41:45.519Z. Status: **draft**. Not published; the live restaurant index is untouched.

- Structurally valid: **yes**
- Ready for approval: **no**
- Menu models: standard
- Items: 174 (174 standard, 0 build-your-own)
- Ingredients: 454
- Nutrition records: 710, of which 593 have all four core macros
- Records missing core macros: 117
- Unresolved nutrition conflicts: 0
- Projected into the runtime schema: 174 items, 337 ingredients (117 excluded)
- Ids: 976 in the registry, 0 new, 0 conflicts

## Sources

- `mcdonalds:us:menu` — https://www.mcdonalds.com/us/en-us/full-menu.html (official; retrieved 2026-09-16T17:23:01.711Z)
- `mcdonalds:us:dna` — https://www.mcdonalds.com/dnaapp/itemDetails?country=US&language=en&showLiveData=true&item={itemId} (official; retrieved 2026-09-16T17:23:01.711Z)
- `mcdonalds:us:customization-evidence` — https://www.mcdonalds.com/dnaapp/itemList (official; retrieved 2026-09-24T02:13:06.312Z)

## Blockers (3)

- `modifier_macros_unverified` — Calories-only and portion-estimated modifier records remain draft evidence. Published base meals and verified modifier records can still be used in staging.
- `core_nutrition_missing` — 116 record(s) have no published or agreed value for: protein, carbs, totalFat. The values were left empty.
- `core_nutrition_missing` — 1 record(s) have no published or agreed value for: calories, protein, carbs, totalFat. The values were left empty.
