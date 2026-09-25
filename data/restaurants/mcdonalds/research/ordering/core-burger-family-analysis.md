# Core burger family ordering customization capture

Captured 2026-09-23 from DoorDash store `662234`, menu `958481`, using the same read-only item-page flow as the Quarter Pounder and Big Mac captures. All eight item pages report `HAS_NESTED_OPTIONS`. Recommended beverage, dessert, and side lists are cross-sells and are excluded below.

All ingredient groups are optional multi-select groups with minimum 0, `defaultQuantity: 0`, and null aggregate/per-option quantity bounds. Therefore every exposed ingredient option is a Boolean action selectable at most once. No light action is exposed on any item.

For every Extra group, the structured maximum is one larger than both the customer-facing subtitle and the number of actual options. As with Big Mac, the effective maximum is the subtitle/actual-option count; the structured value is an unattainable generic cap.

## Shared nutrition components and contexts

| Ingredient/portion | DNA component | Nutrition context | Status |
|---|---:|---|---|
| Regular bun | `301578` | `regular-bun` | Exact |
| One 1/10 lb patty | `300038` | `big-mac-beef-single` | Exact; two-patty contexts equal 2× this unit |
| One American cheese slice | `301518` | `american-cheese-single` | Exact; two-slice context equals 2× this unit |
| Small-burger ketchup | `300037` | `small-ketchup` | Exact DNA portion; ordering calorie labels are coarser/outdated |
| Mustard | `300044` | `qpc-mustard` | Exact shared quantity |
| Single/double pickle portions | `300042` | `small-pickle-single`, `small-pickle-double` | Exact; double equals 2× single |
| Single/double diced-onion portions | `300041` | `diced-onions-single`, `diced-onions-double` | Exact; double equals 2× single |
| One 1/4 lb patty | `301574` | `qpc-beef` | Exact |
| Quarter Pounder bun | `301516` | `qpc-bun` | Exact |
| Slivered onions | `301502` | `qpc-onions` | Exact |
| Two half-strips bacon | `300163` | `bacon-two-half-strips` | Exact; three-half-strip context is exactly 1.5× this unit |
| Three half-strips bacon | `300163` | `qpc-add-bacon` | Exact |
| Standard shredded lettuce | `300098` | `qpc-add-lettuce` | Exact |
| Daily Double default lettuce | `300098` | `daily-double-lettuce-default` | Exact half portion; standard lettuce equals 2× this portion |
| One/three tomato slices | `301407` | `tomato-single-slice`, `qpc-add-tomato` | Exact; three-slice context equals 3× single |
| Two tomato slices | `301407` | 2× `tomato-single-slice` | Validated inference; no direct two-slice DNA parent context |
| Mayonnaise | `300430` | `qpc-add-mayonnaise` | Exact shared portion |
| Salt/grill seasoning | none | none | Unresolved everywhere; embedded in beef rather than separately exposed by DNA |

## Regular-bun, single-patty structure

### Cheeseburger

- Catalog item: `200480`; ordering item: `25120693146`; menu: `958481`
- Remove group `9605358974`: subtitle/max `8`/`8`
  - No Mustard `43914731286`; No Ketchup `43914731287`; No Diced Onions `43914731288`; No Pickle `43914731289`; No American Cheese `43914731290`; No 1/10 Lb Beef `43914731291`; No Regular Bun `43914731292`; No Salt `43914731293`
- Extra group `9605358975`: subtitle/structured max `10`/`11`, ten actual options
  - Extra Mustard `43914731294`; Extra Ketchup `43914731295`; Extra Diced Onions `43914731296`; Extra Pickle `43914731297`; Extra American Cheese `43914731298`; Extra Salt `43914731299`; Add 2 Half Strips Bacon `43914731300`; Add Shredded Lettuce `43914731301`; Add x2 Slc Tomato `43914731302`; Add Mayonnaise `43914731303`
- Repetition: one patty and one cheese slice by default. Removal removes the sole unit; Extra Cheese adds one slice. No extra-beef option exists.
- Nutrition: all non-salt options map to exact or validated portion contexts above.

### Hamburger

- Catalog item: `200477`; ordering item: `6600487523`; menu: `958481`
- Remove group `5831795354`: subtitle/max `7`/`7`
  - No Mustard `23640084799`; No Ketchup `23640084800`; No Diced Onions `23640084801`; No Pickle `23640084802`; No 1/10 Lb Beef `23640084803`; No Regular Bun `23640084804`; No Salt `23640084805`
- Extra group `5831795355`: subtitle/structured max `9`/`10`, nine actual options
  - Extra Mustard `23640084806`; Extra Ketchup `23640084807`; Extra Diced Onions `23640084808`; Extra Pickle `23640084809`; Extra Salt `23640084810`; Add 2 Half Strips Bacon `29982629332`; Add Shredded Lettuce `23640084812`; Add x2 Slc Tomato `23640084813`; Add Mayonnaise `23640084814`
- Repetition: one patty by default; removal removes it. No extra-beef option exists.
- Nutrition: all non-salt options map to exact or validated portion contexts above.

These items share the same implementation pattern. Cheeseburger adds the one-slice cheese state; otherwise their default component portions and optional add-ons are identical.

## Regular-bun, double-patty structure

### McDouble

- Catalog item: `200491`; ordering item: `6600487528`; menu: `958481`
- Remove group `7250460590`: subtitle/max `8`/`8`
  - No Mustard `31802104016`; No Ketchup `31802104017`; No Diced Onions `31802104018`; No Pickle `31802104019`; No American Cheese `31802104020`; No 1/10 Lb Beef `31802104021`; No Salt `31802104022`; No Regular Bun `31802104023`
- Extra group `7250464459`: subtitle/structured max `11`/`12`, eleven actual options
  - Extra Mustard `31802120716`; Extra Ketchup `31802120717`; Extra Diced Onions `31802120718`; Extra Pickle `31802120719`; Extra American Cheese `31802120720`; Extra 1/10 Lb Beef `31802120721`; Extra Salt `31802120722`; Add 2 Half Strips Bacon `31802120723`; Add Shredded Lettuce `31802120724`; Add x2 Slc Tomato `31802120725`; Add Mayonnaise `31802120726`
- Repetition: two patties and one cheese slice. Beef removal/extra is one 1/10 lb patty, producing one or three patties. Cheese removal removes the sole slice; extra adds one.
- Nutrition: all non-salt options map to exact or validated portion contexts.

### Double Cheeseburger

- Catalog item: `200486`; ordering item: `6600487519`; menu: `958481`
- Remove group `5831795346`: subtitle/max `8`/`8`
  - No Mustard `23640084721`; No Ketchup `23640084722`; No Diced Onions `23640084723`; No Pickle `23640084724`; No American Cheese `23640084725`; No 1/10 Lb Beef `23640084726`; No Salt `23640084727`; No Regular Bun `23640084728`
- Extra group `5831795347`: subtitle/structured max `11`/`12`, eleven actual options
  - Extra Mustard `30184026811`; Extra Ketchup `30184043160`; Extra Diced Onions `30184018596`; Extra Pickle `30184038744`; Extra American Cheese `30184040060`; Extra 1/10 Lb Beef `30184050442`; Extra Salt `30184040063`; Add 2 Half Strips Bacon `30184050853`; Add Shredded Lettuce `30184040069`; Add x2 Slc Tomato `30184050656`; Add Mayonnaise `30184042937`
- Repetition: two patties and two cheese slices. The 100-calorie beef and 50-calorie cheese option labels represent one-unit removal/extra, so reachable states are one/two/three patties and one/two/three cheese slices. The DNA aggregate contexts exactly equal 2× their single-unit contexts.
- Nutrition: all non-salt options map to exact or validated portion contexts.

McDouble and Double Cheeseburger can share one repeated-unit implementation. Their only default-state difference is one versus two cheese slices.

## Quarter Pounder structure

### Quarter Pounder with Cheese Deluxe

- Catalog item: `200765`; ordering item: `25120693140`; menu: `958481`
- Remove group `9605358944`: subtitle/max `11`/`11`
  - No Mustard `43914731051`; No Ketchup `43914731052`; No Mayonnaise `43914731053`; No Shredded Lettuce `43914731054`; No Slivered Onions `43914731055`; No Pickle `43914731056`; No x3 Slc Tomato `43914731057`; No American Cheese `43914731058`; No 1/4 Lb Beef `43914731059`; No Salt `43914731060`; No Sesame Seed Bun `43914731061`
- Extra group `9605358945`: subtitle/structured max `10`/`11`, ten actual options
  - Extra Mustard `43914731062`; Extra Ketchup `43914731063`; Extra Mayonnaise `43914731064`; Extra Shredded Lettuce `43914731065`; Extra Slivered Onions `43914731066`; Extra Pickle `43914731067`; Extra x3 Slc Tomato `43914731068`; Extra American Cheese `43914731069`; Extra 1/4 Lb Beef `43914731070`; Add 3 Half Strips Bacon `43914731071`
- Repetition: one quarter-pound patty, two cheese slices, and a fixed three-slice tomato portion. Cheese removal/extra is one slice; beef removal removes the sole patty and extra adds one.
- Nutrition: all non-salt options have exact captured contexts.

### Double Quarter Pounder with Cheese

- Catalog item: `200476`; ordering item: `25120693136`; menu: `958481`
- Remove group `9605358924`: subtitle/max `8`/`8`
  - No Mustard `43914730895`; No Ketchup `43914730896`; No Slivered Onions `43914730897`; No Pickle `43914730898`; No American Cheese `43914730899`; No 1/4 Lb Beef `43914730900`; No Salt `43914730901`; No Sesame Seed Bun `43914730902`
- Extra group `9605358925`: subtitle/structured max `11`/`12`, eleven actual options
  - Extra Mustard `43914730903`; Extra Ketchup `43914730904`; Extra Slivered Onions `43914730905`; Extra Pickle `43914730906`; Extra American Cheese `43914730907`; Extra 1/4 Lb Beef `43914730908`; Extra Salt `43914730909`; Add 3 Half Strips Bacon `43914730910`; Add Shredded Lettuce `43914730911`; Add x3 Slc Tomato `43914730912`; Add Mayonnaise `43914730913`
- Repetition: two quarter-pound patties and two cheese slices. Beef and cheese actions change one unit, producing one/two/three units.
- Nutrition: all non-salt options have exact captured contexts.

### Bacon Quarter Pounder with Cheese

- Catalog item: `203410`; ordering item: `25120693138`; menu: `958481`
- Remove group `9605358934`: subtitle/max `9`/`9`
  - No Mustard `43914730972`; No Ketchup `43914730973`; No Slivered Onions `43914730974`; No Pickle `43914730975`; No American Cheese `43914730976`; No 3 Half Strips Bacon `43914730977`; No 1/4 Lb Beef `43914730978`; No Salt `43914730979`; No Sesame Seed Bun `43914730980`
- Extra group `9605358935`: subtitle/structured max `11`/`12`, eleven actual options
  - Extra Mustard `43914730981`; Extra Ketchup `43914730982`; Extra Slivered Onions `43914730983`; Extra Pickle `43914730984`; Extra American Cheese `43914730985`; Extra 3 Half Strips Bacon `43914730986`; Extra 1/4 Lb Beef `43914730987`; Extra Salt `43914730988`; Add Shredded Lettuce `43914730989`; Add x3 Slc Tomato `43914730990`; Add Mayonnaise `43914730991`
- Repetition: one quarter-pound patty, two cheese slices, and one three-half-strip bacon portion. Cheese changes by one slice; beef changes by one patty; bacon removal/extra changes the full three-half-strip portion.
- Nutrition: all non-salt options have exact captured contexts.

These three items can reuse the Quarter Pounder/Big Mac quantity model with item-specific default counts and option IDs.

## Daily Double special structure

- Catalog item: `200497`; ordering item: `6600487527`; menu: `958481`
- Remove group `7250468670`: subtitle/max `9`/`9`
  - No Mayonnaise `31802106324`; No American Cheese `31802106325`; No Slivered Onions `31802106326`; No Shredded Lettuce `31802106327`; No x2 Slc Tomato `31802106328`; No Diced Onions `35628083812`; No 1/10 Lb Beef `31802106329`; No Salt `31802106330`; No Regular Bun `31802106331`
- Extra group `7250475529`: subtitle/structured max `8`/`9`, eight actual options
  - Extra Mayonnaise `31802111952`; Extra American Cheese `31802111953`; Extra Slivered Onions `31802111954`; Extra Shredded Lettuce `31802111955`; Extra x2 Slc Tomato `31802111956`; Add Pickle `31802111957`; Add Mustard `31802111958`; Add Ketchup `31802111959`
- Repetition: two patties and one cheese slice; beef can only be reduced by one, not increased. The default lettuce portion is half the standard add-on portion and now has its own exact context.
- Special discrepancies:
  - Ordering and the product description call the tomato component `x2`, but the DNA recipe for `200497` contains exactly one validated tomato-slice unit. Applying a two-slice removal would no longer reconcile to the official default total.
  - `No Diced Onions` is exposed even though the DNA recipe contains slivered onions (`301502`) and no diced-onion component (`300041`). It cannot be treated as removal of the slivered onions because a separate `No Slivered Onions` option exists.
  - Add Pickle, Mustard, and Ketchup have clear component identities, but no Daily Double-parent DNA context. Small/double-burger portions are plausible cross-parent matches, not exact captures for this item.
- Result: mayonnaise, cheese, slivered onions, lettuce, one-patty removal, and bun removal are safe. Tomato removal, diced-onion removal, and the three add-only condiments remain partial/ambiguous. Salt remains unresolved.

## Readiness summary

Safe to implement with salt omitted:

- Cheeseburger
- Hamburger
- McDouble
- Double Cheeseburger
- Quarter Pounder with Cheese Deluxe
- Double Quarter Pounder with Cheese
- Bacon Quarter Pounder with Cheese

Partially captured:

- Daily Double, because of the one-slice DNA versus `x2` ordering tomato conflict, the orphan `No Diced Onions` option, and non-parent-specific add-only condiment portions.

Implementation families:

1. Regular single-patty: Hamburger and Cheeseburger.
2. Regular double-patty: McDouble and Double Cheeseburger.
3. Quarter Pounder: Quarter Pounder Deluxe, Double Quarter Pounder, and Bacon Quarter Pounder, reusing the current Quarter Pounder/Big Mac repeated-unit mechanics.
4. Daily Double: special handling and a conservative supported-option subset until its contradictory records are resolved.

The entire eight-item family should not be enabled as one undifferentiated batch. Seven items can be generated in one batch from shared patterns with per-item IDs/default counts. Daily Double should be handled separately or limited to its verified subset. Salt options should remain hidden across all eight items.
