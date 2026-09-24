# McDonald's chicken sandwich customization capture

Captured 2026-09-23 from DoorDash store `662234`, menu `958481`, using the live `itemPage` ordering response. Nutrition mappings use the existing McDonald's US DNA/item-detail captures. Recommended beverages, desserts, and sides returned beside the item were excluded because they are cross-sells, not sandwich modifier groups.

## Shared ordering behavior

All five items are `HAS_NESTED_OPTIONS`. Each has one optional `Remove` multi-select group and one optional `Extra` multi-select group. Every group has `minNumOptions: 0`; its structured maximum exactly matches the visible “Select up to N” subtitle. All aggregate and per-option quantity limits are `null`, every option has `defaultQuantity: 0`, and the response exposes each choice as a Boolean selection. Therefore each captured Remove/Extra/Add option can be selected at most once in this UI. No Light actions are captured for any item.

“Extra filet/patty” means one additional unit (default 1 → 2). Cheese and bacon are add-only on this family. The captured ordering calorie strings are recorded below but are not treated as exact macro mappings when they disagree with the more precise DNA component context.

## Standard/pickle McCrispy pattern

### McCrispy

- Ordering identity: `25120693150`, menu `958481`; catalog item `203747`; captured base `470 cal`.
- Remove group `9605358994`, max 4: `43914731436` No Butter; `43914731437` No Crinkle Cut Pickle; `43914731438` No McCrispy Filet; `43914731439` No Potato Roll.
- Extra group `9605358995`, max 9: `43914731440` Extra Butter; `43914731441` Extra Crinkle Cut Pickle; `43914731442` Extra Filet; `43914731443` Add American Cheese; `43914731444` Add 3 Half Strips Bacon; `43914731445` Add Mustard; `43914731446` Add Ketchup; `43914731447` Add Mayonnaise; `45552213178` Add McCrispy Ranch Sauce.

### Spicy McCrispy

- Ordering identity: `25120693154`, menu `958481`; catalog item `203901`; captured base `530 cal`.
- Remove group `9605359014`, max 4: `43914731566` No Spicy Pepper Sauce; `43914731567` No Crinkle Cut Pickle; `43914731568` No Filet; `43914731569` No Potato Roll.
- Extra group `9605359015`, max 8: `43914731570` Extra Spicy Pepper Sauce; `43914731571` Extra Crinkle Pickle; `43914731572` Extra Filet; `43914731573` Add American Cheese; `43914731574` Add 3 Half Strips Bacon; `43914731575` Add Mustard; `43914731576` Add Ketchup; `45552213182` Add McCrispy Ranch Sauce.

These share filet, potato roll, crinkle pickle, cheese, bacon, mustard, ketchup, and ranch behavior. Their recipe-specific default sauce differs: butter for McCrispy and spicy pepper sauce for Spicy McCrispy. McCrispy alone offers add mayonnaise.

## Deluxe McCrispy pattern

### Deluxe McCrispy

- Ordering identity: `25120693152`, menu `958481`; catalog item `203745`; captured base `530 cal`.
- Remove group `9605359004`, max 5: `43914731499` No Mayonnaise; `43914731500` No Shredded Lettuce; `43914731501` No x3 Slc Tomato; `43914731502` No Filet; `43914731503` No Potato Roll.
- Extra group `9605359005`, max 10: `43914731504` Extra Mayonnaise; `43914731505` Extra Lettuce; `43914731506` Extra x3 Tomato; `43914731507` Extra Filet; `43914731508` Add American Cheese; `43914731509` Add 3 Half Strips Bacon; `43914731510` Add Crinkle Cut Pickle; `43914731511` Add Mustard; `43914731512` Add Ketchup; `45552213180` Add McCrispy Ranch Sauce.

### Spicy Deluxe McCrispy

- Ordering identity: `25120693156`, menu `958481`; catalog item `203873`; captured base `530 cal`.
- Remove group `9605359024`, max 5: `43914731627` No Spicy Pepper Sauce; `43914731628` No Shredded Lettuce; `43914731629` No x3 Slc Tomato; `43914731630` No Filet; `43914731631` No Potato Roll.
- Extra group `9605359025`, max 11: `43914731632` Extra Spicy Pepper Sauce; `43914731633` Extra Lettuce; `43914731634` Extra x3 Tomato; `43914731635` Extra Filet; `43914731636` Add 3 Half Strips Bacon; `43914731637` Add American Cheese; `43914731638` Add Mayonnaise; `43914731639` Add Mustard; `43914731640` Add Ketchup; `43914731641` Add Crinkle Cut Pickle; `45552213184` Add McCrispy Ranch Sauce.

Both Deluxe recipes default to filet + potato roll + three tomato slices + shredded lettuce. Regular Deluxe defaults to mayonnaise; Spicy Deluxe defaults to spicy pepper sauce and offers mayonnaise only as an add-on. Neither defaults to pickles, but both permit adding one captured crinkle-pickle portion.

## McChicken pattern

- Ordering identity: `6600487530`, menu `958481`; catalog item `200438`; captured base `390 cal`.
- Remove group `7250447673`, max 4: `31802108805` No Lettuce; `31802108806` No Mayo; `40538345648` No McChicken Patty; `31802108807` No Regular Bun.
- Extra group `7250476487`, max 9: `31802112907` Extra Lettuce; `31802112908` Extra Mayo; `40538308605` Extra McChicken Patty; `31802112909` Add 2 Half Strips Bacon; `31802112910` Add American Cheese; `31802112911` Add Pickle; `31802112912` Add x2 Tomato; `31802112913` Add Mustard; `31802112914` Add Ketchup.

McChicken needs its own recipe descriptor: it uses component `300708` McChicken patty and `301578` regular bun rather than the McCrispy filet and potato roll. It also specifies two half-strips of bacon rather than three and uses a generic “Pickle” rather than “Crinkle Cut Pickle.”

## Nutrition mapping status

Exact DNA deltas are calories / protein g / carbs g / fat g.

| Ingredient/portion | Ordering use | DNA context | Delta | Status |
|---|---|---|---:|---|
| McCrispy filet | all four McCrispy recipes, remove/extra | `203747(302309)` | 250 / 20 / 14 / 12 | Exact component and default portion. Ordering labels say 290 cal, so use DNA rather than the ordering label. |
| Potato roll | all four, remove | `203747(302402)` | 170 / 7 / 32 / 2.5 | Exact. |
| Crinkle pickle | McCrispy/Spicy default; Deluxe add | `203747(302415)` | 0 / 0 / 0 / 0 | Exact for default recipes; the Deluxe add uses the same named McCrispy component and captured portion, so safely shared. |
| Salted butter | McCrispy, remove/extra | `203747(300310)` | 45 / 0 / 0 / 5 | Exact DNA; ordering rounds/displays 35 cal. |
| Spicy pepper sauce | both Spicy recipes, remove/extra | `203901(302376)` | 110 / 0 / 1 / 11 | Exact. |
| Three tomato slices | both Deluxe recipes, remove/extra | `203745(301407)` | 0 / 0 / 1 / 0 | Exact. |
| Shredded lettuce | Deluxe recipes | `203745(300098)` | 0 / 0 / 0 / 0 | Exact for Deluxe portion. |
| Mayonnaise | Deluxe remove/extra; Spicy Deluxe/McCrispy add | `203745(300430)` | 100 / 0 / 0 / 11 | Exact for Deluxe; safely shared for add-only McCrispy variants because the same named component and ordering calories are used. |
| American cheese, one slice | all five add | `200463(301518)` | 50 / 3 / 1 / 4 | Exact shared McDonald's component/one-slice context. |
| Bacon, three half-strips | four McCrispy recipes add | `203410(300163)` | 110 / 6 / 1 / 9 | Exact captured three-half-strip context. |
| Mustard | all five add | `200466(300044)` | 0 / 0 / 0 / 0 | Exact shared component; zero macros. |
| McCrispy Ranch Sauce | four McCrispy recipes add | standalone item `204161` | 60 / 0 / 1 / 6 | Exact named sauce and exact ordering calories. |
| McChicken patty | McChicken remove/extra | `200438(300708)` | 150 / 9 / 10 / 8 | Exact. |
| Regular bun | McChicken remove | `200438(301578)` | 140 / 5 / 27 / 1.5 | Exact. |
| McChicken lettuce | McChicken remove/extra | `200438(300098)` | 0 / 0 / 0 / 0 | Exact. |
| McChicken mayonnaise | McChicken remove/extra | `200438(300430)` | 100 / 0 / 0 / 11 | Exact. |
| Bacon, two half-strips | McChicken add | `200424(300163)` | 70 / 4 / 1 / 6 | Exact existing two-half-strip context. |
| Two tomato slices | McChicken add | 2 × `200497(301407)` | 0 / 0 / 0 / 0 | Validated unit mapping/inferred two-slice quantity; macros remain exact at captured precision. |
| Ketchup | all five add | ordering says 20 cal; known DNA contexts are 10 cal small and 15 cal QPC | unresolved | No chicken-parent portion is present in DNA. Do not choose a context yet. |
| Generic pickle | McChicken add | known burger and McCrispy pickle contexts | 0 / 0 / 0 / 0 | Macro delta is exact zero, but the component identity/portion is unresolved; do not invent an ordering-to-DNA mapping. |

The five default recipes were also captured as DNA validation requests. Their component sums reconcile to their local catalog totals at McDonald's displayed precision. The DoorDash McCrispy filet (`290 cal`) and butter (`35 cal`) labels differ from current DNA (`250` and `45`); this is upstream source disagreement, not a missing mapping.

## Readiness

- **Fully captured and safe as a complete option set:** none. Every item includes Add Ketchup, whose exact protein/carbs/fat delta cannot be selected from the available DNA contexts without guessing. McChicken additionally lacks an exact ingredient-context identity for Add Pickle, despite its zero displayed macros.
- **Partially captured:** all five. Every option except ketchup is nutrition-ready on the four McCrispy variants. McChicken is ready except ketchup and the exact pickle identity/portion.
- **Can share one implementation pattern:** all five can reuse the existing burger action/state machinery (Boolean Remove/Extra/Add selections, ordering group IDs, option IDs, nutrition deltas, cart restoration). The four McCrispy variants should share a family definition with per-item default ingredients and option IDs.
- **Needs special handling:** McChicken needs a separate patty/bun recipe and two-half-strip bacon. Deluxe variants use three tomato slices and add-only pickles. Spicy variants replace butter/mayo with spicy pepper sauce as described above.
- **One-batch verdict:** the family can be implemented in one batch only if unresolved options are deliberately omitted. A full-fidelity batch exposing every captured option is not safe until the chicken-sandwich ketchup portion is resolved; McChicken's generic pickle identity should also be resolved before exposing that option.

No customization UI or runtime configuration was changed by this capture.
