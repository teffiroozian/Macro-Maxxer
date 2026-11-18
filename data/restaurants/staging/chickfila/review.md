# Chick-fil-A — import review (draft)

Generated 2026-11-18T19:47:02.922Z. Status: **draft**. Not published; the live restaurant index is untouched.

- Structurally valid: **yes**
- Ready for approval: **no**
- Menu models: standard
- Items: 439 (439 standard, 0 build-your-own)
- Ingredients: 59
- Nutrition records: 2530, of which 2530 have all four core macros
- Records missing core macros: 0
- Unresolved nutrition conflicts: 0
- Projected into the runtime schema: 435 items, 59 ingredients (4 excluded)
- Ids: 987 in the registry, 0 new, 0 conflicts

## Sources

- `chickfila:ordering-menu` — https://order.api.my.chick-fil-a.com/menu/v1/3.2/04094?type=pickup (ordering_system; retrieved 2026-08-24)
- `chickfila:nutrition-table` — https://www.chick-fil-a.com/nutrition-allergens (official; retrieved 2026-08-21)
- `chickfila:ordering-nutrition` — https://order.api.my.chick-fil-a.com/orders/locations/2.0/04094/menu/client/nutrition?language=en-US (ordering_system; retrieved 2026-08-24)

## Blockers (1)

- `nested_ordering_graph_not_executable` — The supported menu can run in staging. Full ordering approval is withheld for source-only entrée states without a verified visible mapping and modifier contexts without evidence for the nutrition effect.
