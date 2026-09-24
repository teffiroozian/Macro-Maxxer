# Big Mac ordering modifier capture

Captured 2026-09-23 from the same DoorDash ordering-partner GraphQL item-page flow used for the Quarter Pounder research. The storefront was store `662234` (1451 Coleman Ave, Santa Clara, CA), menu `958481`.

## Ordering identity

- Ordering item ID: `25120693132`
- DNA/catalog item ID: `200463`
- Item type: `HAS_NESTED_OPTIONS`
- Captured base price: $9.69
- Captured ordering calories: 590
- Raw response: `raw/big-mac-item-page.json`

## Ingredient modifier groups

### Remove from Big Mac® — group `9605358904`

Optional multi-select, minimum 0, maximum 8. The subtitle also says “Select up to 8.” Aggregate and per-option quantity limits are null, and each option has default quantity 0.

| Ordering option ID | Option | Captured calories | Price | Action |
|---|---|---:|---:|---|
| `43914730745` | No Mac Sauce | 140 | $0.00 | remove |
| `43914730746` | No Diced Onions | 0 | $0.00 | remove |
| `43914730747` | No Shredded Lettuce | 0 | $0.00 | remove |
| `43914730748` | No Pickle | 0 | $0.00 | remove |
| `43914730749` | No American Cheese | 50 | $0.00 | remove |
| `43914730750` | No 1/10 Lb Beef | 100 | $0.00 | remove one patty, subject to the ambiguity below |
| `43914730751` | No Salt | not supplied | $0.00 | remove |
| `43914730752` | No Big Mac® Bun | 200 | $0.00 | remove |

### Extra for Big Mac® — group `9605358905`

Optional multi-select, minimum 0. The structured maximum is 10, while the display subtitle says “Select up to 9”; only nine options are present. Aggregate and per-option quantity limits are null, and each option has default quantity 0.

| Ordering option ID | Option | Captured calories | Price | Action |
|---|---|---:|---:|---|
| `43914730753` | Extra Mac Sauce | 140 | $0.79 | extra |
| `43914730754` | Extra Diced Onions | 0 | $0.00 | extra |
| `43914730755` | Extra Shredded Lettuce | 0 | $0.59 | extra |
| `43914730756` | Extra Pickle | 0 | $0.00 | extra |
| `43914730757` | Extra American Cheese | 50 | $1.99 | extra |
| `43914730758` | Extra 1/10 Lb Beef | 100 | $1.19 | add one patty |
| `43914730759` | Extra Salt | not supplied | $0.00 | extra |
| `43914730760` | Add x2 Slc Tomato | 0 | $0.69 | add, fixed two-slice portion |
| `43914730761` | Add Mayonnaise | 100 | $0.39 | add |

No light actions were exposed. No separate add group was exposed; tomato and mayonnaise are add actions inside the Extra group. The response also contains recommended beverages, desserts, and fries, but those are cross-sell item lists rather than Big Mac ingredient modifiers.

## Repeated beef patties

The nutrition recipe contains component `300038` once with a quantity multiplier of `0.61224` and reports 190 calories for the combined default beef component. The product description says the sandwich has two patties. The ordering UI exposes one Boolean `No 1/10 Lb Beef` option at 100 calories and one Boolean `Extra 1/10 Lb Beef` option at 100 calories. It does not expose separate top/bottom patty options or a selectable quantity.

The most conservative interpretation is therefore: the default recipe has two patties, “No” removes one patty, and “Extra” adds one patty. This is strongly indicated by the 100-calorie ordering labels, but the payload does not explicitly identify which physical patty is removed and does not permit removing both patties.

## Nutrition mapping

| Ordering ingredient | Existing DNA component/context | Mapping status |
|---|---|---|
| Mac Sauce | `301554`, `big-mac-sauce` | Accurate full-macro context; validated by `big-mac-no-sauce`. |
| American Cheese | `301518`, `american-cheese-single` | Accurate full-macro single-slice context; validated by `big-mac-no-cheese`. |
| Pickle | `300042`, `qpc-pickle` | Same component ID and a full-macro context exist, but the existing capture is parented to Quarter Pounder; Big Mac portion equivalence has not been directly validated. |
| Shredded Lettuce | `300098`, `qpc-add-lettuce` | Same component ID and full macros exist, but the captured context is Quarter Pounder Deluxe; Big Mac portion equivalence has not been directly validated. |
| Mayonnaise | `300430`, `qpc-add-mayonnaise` | Full-macro context exists and its 100-calorie value matches ordering. Parent context is Quarter Pounder Deluxe, so a Big Mac-specific validation is still preferable. |
| Tomato | `301407`, `qpc-add-tomato` | Component and full macros exist, but ordering specifies two slices and the existing QP capture does not establish that exact Big Mac portion. Do not scale or assume. |
| 1/10 Lb Beef | default Big Mac component `300038` | Recipe and calories identify the beef, but no standalone full-macro one-patty context is captured. Default component is an aggregate two-patty portion. |
| Big Mac Bun | default Big Mac component `302510` | Recipe identity and calories exist, but no standalone full-macro context is captured. Ordering rounds it to 200 calories; DNA recipe reports 190. |
| Diced Onions | default Big Mac component `300041` | Recipe identity and calories exist, but no standalone full-macro context is captured. This is not the Quarter Pounder slivered-onion component. |
| Salt | no discrete nutrition component | Ordering IDs and actions are captured, but nutrition is unresolved. Salt is described as grill seasoning rather than a separate DNA component. |

The existing default/no-sauce/no-cheese validation captures establish the Big Mac total and accurately support sauce and cheese deltas. Calories-only recipe entries are not treated as accurate full-macro mappings.

## Implementation readiness

The captured ordering schema is structurally compatible with the Quarter Pounder customization system: optional remove/extra groups, Boolean choices, and real group/option IDs. Mac Sauce and American Cheese are fully ready from both ordering and nutrition perspectives.

The entire modifier set is not yet safe for nutrition-accurate implementation without further captures or validation for one patty, bun, diced onions, Big Mac lettuce/pickle portions, the exact two-slice tomato portion, and salt. The system should also preserve the captured group-level limit rather than invent per-option quantities, and explicitly resolve the Extra group’s subtitle/structured-maximum mismatch before enforcing a limit.
