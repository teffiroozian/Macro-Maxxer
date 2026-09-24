# Filet-O-Fish ordering customization capture

Captured 2026-09-24 from DoorDash store `662234`, menu `958481`, and reconciled against McDonald's US DNA/item-detail data.

## Ordering identity

- Primary current-menu item: `25120693162` — Filet-O-Fish®, `$9.59`, `380 cal`, menu `958481`.
- Catalog/DNA item: `200445`.
- The same store menu also exposes category aliases `44414397327` (Protein Picks) and `6600487529` (Individual Items). The captured modifier response is from the primary Fish-category identity `25120693162`.
- Item type: `HAS_NESTED_OPTIONS`.

Recommended beverages, desserts, and sides returned beside the item are cross-sells, not Filet-O-Fish ingredient modifiers, and are excluded from this audit.

## Captured modifier groups

### Remove from Filet-O-Fish® — group `9605359052`

Optional `multi_select`; minimum 0, structured maximum 4, subtitle “Select up to 4.” Aggregate and per-option quantity limits are all `null`; every option has `defaultQuantity: 0`.

| Option ID | Captured option | Price | Ordering calorie label |
|---|---|---:|---:|
| `43914731846` | No Tartar Sauce | $0.00 | 90 |
| `43914731847` | No American Cheese | $0.00 | 50 |
| `43914731848` | No Filet-O-Fish® Patty | $0.00 | 120 |
| `43914731849` | No Regular Bun | $0.00 | 140 |

### Extra for Filet-O-Fish® — group `9605359053`

Optional `multi_select`; minimum 0, structured maximum 9, subtitle “Select up to 9.” Aggregate and per-option quantity limits are all `null`; every option has `defaultQuantity: 0`.

| Option ID | Captured option | Price | Ordering calorie label |
|---|---|---:|---:|
| `43914731850` | Extra Tartar Sauce | $0.00 | 90 |
| `43914731851` | Extra American Cheese | +$1.99 | 50 |
| `43914731852` | Add 2 Half Strips Bacon | +$3.49 | 70 |
| `43914731853` | Add Pickle | $0.00 | 0 |
| `43914731854` | Add Shredded Lettuce | +$0.59 | 0 |
| `43914731855` | Add x2 Slc Tomato | +$0.69 | 0 |
| `43914731856` | Add Mustard | $0.00 | 5 |
| `43914731857` | Add Ketchup | $0.00 | 20 |
| `43914731858` | Add Mayonnaise | +$0.39 | 100 |

No Light group or Light option was captured. There is no separate Add group; new ingredients appear inside the Extra group. The response models each option as a one-time Boolean choice, not a repeatable quantity control.

## Nutrition mapping

Raw DNA deltas below are calories / protein g / carbs g / fat g.

| Captured modifier | Nutrition component/context | Raw delta | Mapping |
|---|---|---:|---|
| Remove/Extra Tartar Sauce | `200445(302503)` | 93.932 / 0.1932 / 0.552 / 10.1016 | **Exact.** Default Filet-O-Fish tartar portion. |
| Remove American Cheese | `200445(300716)` | 25.0568225 / 1.29897975 / 0.681432 / 1.866129925 | **Exact.** Dedicated half-slice American cheese component. Ignore the ordering UI's stale/coarse 50-calorie removal label. |
| Extra American Cheese | `200463(301518)` | 50.113645 / 2.5979595 / 1.362864 / 3.8188585 | **Exact portion match.** Ordering says 50 calories, identifying one full additional American-cheese slice. This is intentionally not the half-slice context; the resulting sandwich is one default half-slice plus one extra full slice. |
| Remove Filet-O-Fish Patty | `200445(300055)` | 123.09926 / 9.216499 / 9.471627 / 5.166342 | **Exact.** |
| Remove Regular Bun | `200445(301578)` | 141.73445 / 4.908728 / 26.916868 / 1.749495 | **Exact.** |
| Add 2 Half Strips Bacon | `200424(300163)` | 71.8990763346 / 3.9121939386 / 0.671915538 / 5.9608507014 | **Exact shared two-half-strip context.** |
| Add Shredded Lettuce | shared `300098`, standard sandwich portion | 1.988 / 0.1278 / 0.42174 / 0.01988 | **Inferred/shared.** Ordering rounds this to 0 calories; the exact ingredient is known, but Filet-O-Fish has no parent-specific default lettuce portion. |
| Add x2 Slc Tomato | 2 × `200497(301407)` | 3.0816 / 0.150656 / 0.665968 / 0.03424 | **Validated inference.** Two single-slice units; the three-slice Deluxe context independently validates the unit scaling. |
| Add Mustard | shared `200466(300044)` | 0.28335 / 0.0211 / 0.03685 / 0.00575 | **Inferred/shared.** Exact standard mustard component, but no Filet-O-Fish parent-specific portion; ordering displays 5 calories while DNA rounds the standard portion to 0. |
| Add Mayonnaise | shared `200438(300430)` / `200765(300430)` | 100.62572438 / 0.1497246033 / 0.350706278 / 10.952826836 | **Exact shared standard portion.** Both existing sandwich contexts agree and ordering displays 100 calories. |
| Add Pickle | generic pickle component candidates | unresolved | **Unresolved identity/portion.** Several burger and McCrispy pickle contexts exist; the ordering record says only “Pickle.” Its displayed macros are zero, but choosing an ordering-to-DNA component would be a guess. |
| Add Ketchup | known small and Quarter Pounder ketchup contexts | unresolved | **Unresolved portion.** Ordering displays 20 calories, while available DNA contexts display 10 or 15 calories. |

The four exact default components sum to the captured default DNA sandwich at raw precision: `383.8225325 cal`, `15.61740675 g` protein, `37.621927 g` carbs, and `18.883566925 g` fat.

## Implementation readiness

Filet-O-Fish is safe to implement with the shared customization system if two unresolved options remain hidden:

- Hide `43914731853` Add Pickle until its exact component/portion identity is captured.
- Hide `43914731857` Add Ketchup until its 20-calorie portion is captured.

All removal options are safe. Extra tartar, extra full-slice cheese, bacon, tomato, and mayonnaise are safe. Lettuce and mustard reuse established shared component contexts but should be labeled as shared/inferred mappings rather than Filet-specific captures. No Light behavior should be exposed.

No customization UI or runtime model was implemented by this audit.
