# Snack Wrap family ordering customization capture

Captured 2026-09-24 from DoorDash McDonald's store `662234`, Lunch Menu `958481`. The restaurant-scoped menu evidence is [`raw/doordash-menu-identities.json`](raw/doordash-menu-identities.json); the exact item-page payloads are [`raw/ranch-snack-wrap-item-page.json`](raw/ranch-snack-wrap-item-page.json) and [`raw/spicy-snack-wrap-item-page.json`](raw/spicy-snack-wrap-item-page.json). This is research evidence only. No customization model or runtime registration was added.

The standalone Individual Items identities were used. Meal entries and duplicate merchandising entries under Protein Picks were not used.

## Shared ordering behavior

- Both items report `HAS_NESTED_OPTIONS`.
- Each has one optional `multi_select` Remove group and one optional `multi_select` Extra group.
- Both groups have minimum 0. The Remove maximum is 3; the Extra maximum is 5. These match both the subtitle and actual option count.
- Group aggregate quantity bounds and per-option quantity bounds are null. Every option has `defaultQuantity: 0` and null per-option quantity bounds, so every action is Boolean and selectable at most once.
- Item `quantityLimit` is `0` for both wraps.
- No light actions or substitution groups are exposed.
- The tortilla and McCrispy chicken strip are fixed base ingredients. Neither can be removed, added, made extra/light, or substituted in the captured ordering UI.
- Recommended beverage, dessert, and side groups are cross-sells and are excluded below.

## Ranch Snack Wrap

- DNA item: `204401` (`Snack Wrap Mccrispy Ranch`).
- Ordering item: `27679120461` (`Ranch Snack Wrap®`).
- Menu: `958481`; ordering display: 390 calories.
- Remove group `9999652020`, subtitle `Select up to 3`, min/max `0/3`:
  - No McCrispy Ranch Sauce `45501690899` — ordering label 60 calories.
  - No Shredded Lettuce `45501690900` — ordering label 0 calories.
  - No Shredded Cheese `45501690901` — ordering label 60 calories.
- Extra group `9999652021`, subtitle `Select up to 5`, min/max `0/5`:
  - Extra McCrispy Ranch Sauce `45501690902` — 60 calories, +$0.79.
  - Extra Shredded Lettuce `45501690903` — 0 calories, +$0.59.
  - Extra Shredded Cheese `45501690904` — 60 calories, no charge.
  - Add 2 Half Strips Bacon `45501690905` — 70 calories, +$3.49.
  - Add x2 Slc Tomato `45501690906` — ordering label 0 calories, +$0.69.

## Spicy Snack Wrap

- DNA item: `204402` (`Snack Wrap Mccrispy Spicy`).
- Ordering item: `27679120462` (`Spicy Snack Wrap®`).
- Menu: `958481`; ordering display: 380 calories.
- Remove group `9999652022`, subtitle `Select up to 3`, min/max `0/3`:
  - No Spicy Pepper Sauce `45501690907` — ordering label 110 calories.
  - No Shredded Lettuce `45501690908` — ordering label 0 calories.
  - No Shredded Cheese `45501690909` — ordering label 60 calories.
- Extra group `9999652023`, subtitle `Select up to 5`, min/max `0/5`:
  - Extra Spicy Pepper Sauce `45501690910` — 110 calories, +$0.79.
  - Extra Shredded Lettuce `45501690911` — 0 calories, +$0.59.
  - Extra Shredded Cheese `45501690912` — 60 calories, no charge.
  - Add 2 Half Strips Bacon `45501690913` — 70 calories, +$3.49.
  - Add x2 Slc Tomato `45501690914` — ordering label 0 calories, +$0.69.

## Nutrition mapping

| Ingredient/action | DNA component | Existing context | Assessment |
| --- | ---: | --- | --- |
| McCrispy chicken strip | `302687` | none | Fixed, not customizable. DNA default is 130 calories. |
| Flour tortilla | `300422` | none | Fixed, not customizable. DNA default is 140 calories. |
| McCrispy Ranch Sauce | `302502` | none | Unresolved. DNA item `204401` contains an 80-calorie portion, while live ordering says 60 calories. |
| Spicy Pepper Sauce | `302376` | `mccrispy-spicy-sauce` | Unresolved for this wrap. The existing context is 110 calories and matches ordering, but DNA item `204402` contains a smaller 70-calorie portion of the same component. Parent-specific quantity cannot be assumed. |
| Shredded lettuce | `300098` | `big-mac-shredded-lettuce`, `qpc-add-lettuce`, and other parent-specific contexts | Component identity is exact, but portion equivalence is unproven. DNA wrap portion is 0 calories at quantity `0.142`; do not choose another parent's context by name alone. |
| Shredded cheddar/jack cheese | `302615` | none | Unresolved. DNA wraps contain a 50-calorie portion; live ordering says 60 calories. This is not American cheese and must not reuse `american-cheese-single`. |
| Two half strips bacon | `300163` | `bacon-two-half-strips` | Fully safe: exact portion name and 70-calorie context agree. |
| Two tomato slices | `301407` | 2 × `tomato-single-slice` | Safe validated mapping used by the existing burger-family analysis. DoorDash's 0-calorie label is coarse; the established DNA mapping should be used. |

The parent totals also differ by 10 calories: current DNA records are 400 calories for Ranch and 390 for Spicy, while the live ordering pages show 390 and 380. This reinforces that ordering calorie labels must not be used to synthesize missing full nutrient deltas.

## Readiness

### Fully safe modifiers

- Add 2 Half Strips Bacon on both wraps.
- Add x2 Slc Tomato on both wraps, using the already validated two-slice mapping rather than DoorDash's rounded 0-calorie label.

### Unresolved modifiers

- Ranch Sauce remove/extra.
- Spicy Pepper Sauce remove/extra for the wrap-specific portion.
- Shredded Lettuce remove/extra.
- Shredded Cheddar/Jack Cheese remove/extra.

Tortilla and chicken strip nutrition identities are known, but they are not ordering modifiers and must not be exposed as controls.

### Shared implementation pattern

Both wraps can use one implementation pattern. Their group cardinality, Boolean quantity behavior, lettuce/cheese/add-on structure, and option ordering are identical. The only semantic difference is the item-specific sauce component and option IDs. All group and option IDs must remain item-specific.

### Conservative partial implementation

Yes. Both wraps can be implemented with unresolved options hidden, exposing only Bacon and Tomato add-ons. Those actions are optional, independent Boolean additions and do not alter the unresolved default components. The base item nutrition should continue to come from each reviewed menu item.

Do not expose sauce, lettuce, or shredded-cheese controls until parent-specific full-nutrient contexts reconcile the current DNA portions with the live ordering labels. Do not expose tortilla or chicken-strip controls because the ordering source provides no such modifiers.
