# Breakfast sandwich family ordering customization capture

Captured 2026-09-24 from DoorDash McDonald's store `662393`, Breakfast Menu `18196178`. The raw restaurant-scoped menu identity response and all 14 item-page responses are in [`raw/`](raw/). This is research evidence only; no customization model or runtime registration was added.

## Common ordering behavior

- Every item reports `HAS_NESTED_OPTIONS` and has exactly two ingredient groups: optional `multi_select` Remove and Extra groups.
- Every ingredient option has `defaultQuantity: 0`; every group and option has null aggregate/per-option quantity bounds. Each action is therefore Boolean and selectable at most once.
- Group `minNumOptions` is 0. `maxNumOptions` equals the number in the customer-facing subtitle and the number of actual ingredient options.
- Item `quantityLimit` is `0` on all 14 item headers.
- No light action is exposed. No bread swap group is exposed. Egg alternatives are add-only options on selected items; they do not replace the default egg automatically.
- Recommended beverage, side, and dessert groups are cross-sells and are excluded from the ingredient structures below.

## Bagels

The four bagels share Bagel, Butter, American Cheese, Folded Egg, and Breakfast Sauce states. Bacon and sausage add a removable/extra meat. Bacon, sausage, and steak also offer add-only Round Egg. All four offer add-only Spicy Pepper Sauce. The steak item additionally exposes Steak, Slivered Onions, and Salt.

### Bacon, Egg & Cheese Bagel

- DNA item `200424`; ordering item `11811799990`; 590 calories.
- Remove group `8076608900`, min/max `0/6`:
  - No Butter `35957955095`; No American Cheese `35957955096`; No 2 Half Strips Bacon `35957955097`; No Folded Egg `35957955098`; No Breakfast Sauce `35957955099`; No Bagel `35957955100`.
- Extra group `8076608901`, min/max `0/7`:
  - Extra Butter `35957955101`; Extra American Cheese `35957955102`; Extra 2 Half Strips Bacon `35957955103`; Extra Folded Egg `35957955104`; Extra Breakfast Sauce `35957955105`; Add Spicy Pepper Sauce `45422012251`; Add Round Egg `35957955106`.

### Egg & Cheese Bagel

- DNA item `200876`; ordering item `11811808181`; 520 calories.
- Remove group `8076619559`, min/max `0/5`:
  - No Butter `35958000913`; No American Cheese `35958000914`; No Folded Egg `35958000915`; No Breakfast Sauce `35958000916`; No Bagel `35958000917`.
- Extra group `8076619560`, min/max `0/5`:
  - Extra Butter `35958000918`; Extra American Cheese `35958000919`; Extra Folded Egg `35958000920`; Extra Breakfast Sauce `35958000921`; Add Spicy Pepper Sauce `45422012254`.
- Special difference: no meat and no Round Egg add-on.

### Sausage, Egg & Cheese Bagel

- DNA item `201030`; ordering item `11811804143`; 710 calories.
- Remove group `8076620000`, min/max `0/6`:
  - No Butter `35958026070`; No American Cheese `35958026071`; No Sausage `35958026072`; No Folded Egg `35958026073`; No Breakfast Sauce `35958026074`; No Bagel `35958026075`.
- Extra group `8076620001`, min/max `0/7`:
  - Extra Butter `35958026076`; Extra American Cheese `35958026077`; Extra Sausage `35958026078`; Extra Folded Egg `35958026079`; Extra Breakfast Sauce `35958026080`; Add Spicy Pepper Sauce `45422012252`; Add Round Egg `35958026081`.

### Steak, Egg & Cheese Bagel

- DNA item `200145`; ordering item `11811786026`; 680 calories.
- Remove group `8076590658`, min/max `0/8`:
  - No Butter `35958009423`; No American Cheese `35958009424`; No Steak `35958009425`; No Salt `35958009426`; No Slivered Onions `35958009427`; No Folded Egg `35958009428`; No Breakfast Sauce `35958009429`; No Bagel `35958009430`.
- Extra group `8076590659`, min/max `0/8`:
  - Extra Butter `35958009431`; Extra American Cheese `35958009432`; Extra Steak `35958009433`; Extra Slivered Onions `35958009434`; Extra Folded Egg `35958009435`; Extra Breakfast Sauce `35958048036`; Add Spicy Pepper Sauce `45422012253`; Add Round Egg `35958048037`.
- Special handling: salt has no nutrition mapping. Ordering labels Steak as 160 calories and Slivered Onions as 5 calories, while DNA item `200145` contains component `300168` at 140 calories and component `301601` at 25 calories. These deltas must not be inferred from the ordering labels or substituted with similarly named lunch components.

## Biscuits

All four share the biscuit/meat/egg/cheese component vocabulary but expose different add-on sets. There is no explicit butter action even though the official DNA recipes contain salted/clarified butter.

### Bacon, Egg & Cheese Biscuit

- DNA item `200300`; ordering item `6570932120`; 460 calories.
- Remove group `5820746153`, min/max `0/4`: No American Cheese `30435527109`; No Folded Egg `30435542481`; No 2 Half Strips Bacon `30435550293`; No Biscuit `30435555681`.
- Extra group `5820746154`, min/max `0/6`: Extra American Cheese `23568409477`; Extra Folded Egg `23568409478`; Extra 2 Half Strips Bacon `29645347456`; Add Spicy Pepper Sauce `45142912039`; Add Round Egg `23568409480`; Add Canadian Bacon `23568409481`.

### Egg & Cheese Biscuit

- DNA item `201256`; ordering item `6570932124`; 390 calories.
- Remove group `5820746161`, min/max `0/3`: No American Cheese `23568409500`; No Folded Egg `23568409501`; No Biscuit `23568409502`.
- Extra group `5820746162`, min/max `0/2`: Extra American Cheese `23568409503`; Extra Folded Egg `23568409504`.
- Special difference: no meat, alternative egg, sauce, or meat add-ons.

### Sausage Biscuit with Egg

- DNA item `200302`; ordering item `6570932121`; 530 calories.
- Remove group `5820746155`, min/max `0/3`: No Folded Egg `23568409482`; No Sausage `23568409483`; No Biscuit `23568409484`.
- Extra group `5820746156`, min/max `0/7`: Extra Folded Egg `23568409485`; Extra Sausage `23568409486`; Add Spicy Pepper Sauce `45142912040`; Add American Cheese `23568409487`; Add 2 Half Strips Bacon `29645343484`; Add Round Egg `23568409489`; Add Canadian Bacon `23568409490`.

### Sausage Biscuit

- DNA item `200301`; ordering item `6570932122`; 460 calories.
- Remove group `5820746157`, min/max `0/2`: No Sausage `23568409491`; No Biscuit `23568409492`.
- Extra group `5820746158`, min/max `0/4`: Extra Sausage `23568409493`; Add Spicy Pepper Sauce `45142912041`; Add American Cheese `23568409494`; Add 2 Half Strips Bacon `29645343483`.

## McGriddles

The ordering action `No McGriddles` is labeled 120 calories, while DNA component `300666` represents the two-cake default portion at 240 calories. This indicates a one-cake action or a source inconsistency; it is not safe to model as removal of the full DNA component without another authoritative capture.

### Bacon, Egg & Cheese McGriddles

- DNA item `200304`; ordering item `6570932130`; 430 calories.
- Remove group `7243057754`, min/max `0/4`: No American Cheese `31761978431`; No 2 Half Strips Bacon `31761978432`; No Folded Egg `31761978433`; No McGriddles `31761978434`.
- Extra group `7243050650`, min/max `0/6`: Extra American Cheese `31761977206`; Extra 2 Half Strips Bacon `31761977207`; Extra Folded Egg `31761977208`; Add Spicy Pepper Sauce `45360452070`; Add Canadian Bacon `31761977209`; Add Round Egg `31761977210`.

### Sausage, Egg & Cheese McGriddles

- DNA item `200307`; ordering item `6570932132`; 550 calories.
- Remove group `7243059537`, min/max `0/4`: No American Cheese `31761992269`; No Sausage `31761992270`; No Folded Egg `31761992271`; No McGriddles `31761992272`.
- Extra group `7243058359`, min/max `0/7`: Extra American Cheese `31761995443`; Extra Sausage `31761995444`; Extra Folded Egg `31761995445`; Add Spicy Pepper Sauce `45360452072`; Add Round Egg `31761995446`; Add 2 Half Strips Bacon `31761995447`; Add Canadian Bacon `31761995448`.

### Sausage McGriddles

- DNA item `200306`; ordering item `6570932131`; 430 calories.
- Remove group `7243057175`, min/max `0/2`: No Sausage `31761988139`; No McGriddles `31761988140`.
- Extra group `7243053603`, min/max `0/7`: Extra Sausage `31761972402`; Add Spicy Pepper Sauce `45360452071`; Add American Cheese `31761972403`; Add 2 Half Strips Bacon `31761972404`; Add Canadian Bacon `31761972405`; Add Round Egg `31761972406`; Add Folded Egg `31761972407`.

## McMuffins

All three share English Muffin, Butter, Cheese, Sausage/Canadian Bacon, and egg component semantics. Ordering labels `No English McMuffin` as 160 calories, while DNA component `301533` is 140 calories; the remaining 20 calories match the default salted-butter portion in these DNA recipes. Because Butter is also separately removable and ordering labels it as 35 calories, bread and butter actions cannot be safely derived from label arithmetic.

### Egg McMuffin

- DNA item `200298`; ordering item `6570932126`; 310 calories.
- Remove group `7243051829`, min/max `0/5`: No Butter `31761989524`; No American Cheese `31761989525`; No Round Egg `31761989526`; No Canadian Bacon `31761989527`; No English McMuffin `31761989528`.
- Extra group `7243057174`, min/max `0/6`: Extra Butter `31761988134`; Extra American Cheese `31761988135`; Extra Round Egg `31761988136`; Extra Canadian Bacon `31761988137`; Add Spicy Pepper Sauce `45422012256`; Add 2 Half Strips Bacon `31761988138`.

### Sausage McMuffin with Egg

- DNA item `200161`; ordering item `6570932127`; 480 calories.
- Remove group `7243050649`, min/max `0/5`: No Butter `31761977201`; No American Cheese `31761977202`; No Sausage `31761977203`; No Round Egg `31761977204`; No English McMuffin `31761977205`.
- Extra group `7243051652`, min/max `0/6`: Extra Butter `31761989719`; Extra American Cheese `31761989720`; Extra Sausage `31761989721`; Extra Round Egg `31761989722`; Add 2 Half Strips Bacon `31761989723`; Add Canadian Bacon `31761989724`.

### Sausage McMuffin

- DNA item `200449`; ordering item `6570932128`; 400 calories.
- Remove group `7243049860`, min/max `0/4`: No Butter `31761989130`; No Sausage `31761989131`; No American Cheese `31761989132`; No English McMuffin `31761989133`.
- Extra group `7243064313`, min/max `0/5`: Extra Butter `31761993491`; Extra Sausage `31761993492`; Extra American Cheese `31761993493`; Add 2 Half Strips Bacon `31761993494`; Add Canadian Bacon `31761993495`.

## Nutrition component mapping

| Ordering ingredient | DNA component | Existing full-nutrient context | Status |
| --- | ---: | --- | --- |
| American cheese, one slice | `301518` | `american-cheese-single` | Exact; bagels default to two slices but each remove/extra action is one 50-calorie slice |
| Two half strips bacon | `300163` | `bacon-two-half-strips` | Exact |
| Spicy Pepper Sauce | `302376` | `mccrispy-spicy-sauce` | Exact 110-calorie shared component identity; parent-specific equivalence should still be validated before enabling |
| Bagel | `302369` | none | Exact component identity; full-nutrient context not captured |
| Folded egg | `301462` | none | Exact component identity; full-nutrient context not captured |
| Round egg | `300067` | none | Exact component identity; full-nutrient context not captured |
| Sausage patty | `300694` | none | Exact component identity; full-nutrient context not captured |
| Canadian bacon | `301639` | none | Exact component identity; full-nutrient context not captured |
| Breakfast sauce | `301425` | none | Exact component identity; full-nutrient context not captured |
| Biscuit | `300131` | none | Identity exact, but ordering removal label is 270 versus DNA component 260; likely bundled butter cannot be assumed |
| Griddle cakes | `300666` | none | DNA default is two cakes/240 calories; ordering `No McGriddles` is 120 calories, so action quantity is unresolved |
| English muffin | `301533` | none | Identity exact, but ordering 160 versus DNA 140 suggests bundled butter; interaction with separate Butter action unresolved |
| Salted butter | `300310` | `mccrispy-butter` exists but is a different 45-calorie portion | Breakfast portions vary by parent (10, 20, or 35 DNA calories); do not reuse the McCrispy context |
| Steak | `300168` | none | Ordering 160 versus DNA 140; unresolved |
| Steak-bagel onions | `301601` | none | Ordering calls these Slivered Onions/5 calories; DNA calls the component Grilled Onions/25 calories; do not reuse lunch `qpc-onions` (`301502`) |
| Salt/grill seasoning | none | none | Unresolved |

Clarified butter `300654` occurs in several DNA recipes at 0 calories but is not separately exposed by ordering. It remains part of the base recipe and must not be attached to the explicit Butter action without evidence.

## Readiness and implementation grouping

### Ordering capture

All 14 items are fully captured for ordering identity, group IDs, option IDs, limits, prices, action semantics, and Boolean quantity behavior.

### Safe to implement now

None are fully safe for a macro-aware customization implementation yet. The ordering graph is complete, but each item exposes at least one action whose full-nutrient delta has no captured context or has a source conflict. A deliberately restricted implementation containing only independently validated cheese and bacon actions would be possible, but that would not represent the captured customization surface and is not implemented here.

### Partially captured for nutrition

- All 14 are partial on nutrition mapping.
- Bagels need full contexts for Bagel, Folded Egg, Breakfast Sauce, parent-specific Butter, and relevant meat/egg additions. Steak also needs the steak/onion conflicts resolved.
- Biscuits need Biscuit/butter action semantics plus Folded Egg, Sausage, Round Egg, and Canadian Bacon contexts.
- McGriddles need the one-cake versus two-cake action resolved, plus egg/meat contexts.
- McMuffins need English Muffin versus bundled-butter semantics resolved, plus Round Egg, Sausage, and Canadian Bacon contexts.
- Salt remains unmapped.

### Shared implementation patterns

1. **Bagel base:** Bacon, Egg & Cheese; Egg & Cheese; Sausage, Egg & Cheese. Same two-group Boolean state model and common bread/butter/cheese/folded-egg/sauce states, with item-specific meat and add-ons.
2. **Steak bagel special:** Same bagel base, plus steak, onions, and salt; requires conflict-specific handling.
3. **Biscuit base:** all four biscuits can use the same Boolean remove/add engine, but each has a materially different option allowlist. Egg & Cheese Biscuit is the minimal subtype.
4. **McGriddles base:** all three share the same engine; the bread action requires a repeated-unit or special delta once resolved.
5. **McMuffin base:** all three share the same engine; bread/butter interaction needs special handling.

### Batch decision

The family can be implemented as one generated batch only after the unresolved nutrition contexts and bread/butter quantity semantics are captured. The ordering model itself can be generated in one batch with four structural templates and per-item option IDs. It should not be enabled as one batch today because no item has a complete, conflict-free full-nutrient mapping.
